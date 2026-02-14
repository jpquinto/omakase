"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentRunRole } from "@omakase/db";
import { VOICE_PROFILES, isVoiceChatSupported } from "@/lib/chat-constants";

// ---------------------------------------------------------------------------
// Markdown / code stripping for TTS — only speak prose content
// ---------------------------------------------------------------------------

function stripMarkdownForTTS(text: string): string {
  return (
    text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/[^\s)]+/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/^-{3,}$/gm, "")
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/<[^>]+>/g, "")
      // Remove emojis
      .replace(/\p{Emoji_Presentation}/gu, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

// ---------------------------------------------------------------------------
// Voice selection — find the best matching voice for an agent
// ---------------------------------------------------------------------------

function findVoiceForRole(role: AgentRunRole): SpeechSynthesisVoice | null {
  const profile = VOICE_PROFILES[role];
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  if (profile.preferredVoice) {
    const preferred = voices.find((v) => v.name === profile.preferredVoice);
    if (preferred) return preferred;
  }

  const enVoices = voices.filter((v) => v.lang.startsWith("en"));
  const pool = enVoices.length > 0 ? enVoices : voices;

  const maleKeywords = ["male", "guy", "man", "daniel", "james", "david", "thomas", "aaron", "gordon", "reed"];
  const femaleKeywords = ["female", "woman", "girl", "samantha", "karen", "victoria", "fiona", "moira", "tessa", "zoe"];
  const keywords = profile.gender === "male" ? maleKeywords : femaleKeywords;

  const genderMatch = pool.find((v) => {
    const lower = v.name.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
  if (genderMatch) return genderMatch;

  return pool[0] ?? voices[0] ?? null;
}

// ---------------------------------------------------------------------------
// Sentence boundary detection for streaming TTS
// ---------------------------------------------------------------------------

const SENTENCE_END = /[.!?]\s+/;

function extractSentences(buffer: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  let remaining = buffer;

  let match = SENTENCE_END.exec(remaining);
  while (match) {
    const sentence = remaining.slice(0, match.index + 1).trim();
    if (sentence) sentences.push(sentence);
    remaining = remaining.slice(match.index + match[0].length);
    match = SENTENCE_END.exec(remaining);
  }

  return { sentences, remainder: remaining };
}

// ---------------------------------------------------------------------------
// useVoiceChat hook
// ---------------------------------------------------------------------------

export interface UseVoiceChatOptions {
  role: AgentRunRole;
  onTranscript?: (text: string) => void;
}

export interface UseVoiceChatResult {
  isSupported: boolean;
  isTalkMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  toggleTalkMode: () => void;
  startListening: () => void;
  stopListening: () => string;
  stopSpeaking: () => void;
  feedStreamingToken: (token: string) => void;
  flushSpeechBuffer: () => void;
  error: string | null;
}

export function useVoiceChat({ role, onTranscript }: UseVoiceChatOptions): UseVoiceChatResult {
  // SSR-safe: detect support only after mount
  const [supported, setSupported] = useState(false);
  const [isTalkMode, setIsTalkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechBufferRef = useRef("");
  const utteranceCountRef = useRef(0);
  const roleRef = useRef(role);
  roleRef.current = role;

  // Keep a ref to isTalkMode so callbacks don't go stale
  const isTalkModeRef = useRef(false);
  isTalkModeRef.current = isTalkMode;

  // Keep a ref to transcript for stopListening
  const transcriptRef = useRef("");
  transcriptRef.current = transcript;

  useEffect(() => {
    setSupported(isVoiceChatSupported());
  }, []);

  // -----------------------------------------------------------------------
  // SpeechRecognition init (lazy, cached)
  // -----------------------------------------------------------------------

  function getRecognition(): SpeechRecognition | null {
    if (recognitionRef.current) return recognitionRef.current;
    if (typeof window === "undefined") return null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => {
          const base = prev.replace(/ \[.*\]$/, "");
          return (base + " " + final).trim();
        });
      } else if (interim) {
        setTranscript((prev) => {
          const base = prev.replace(/ \[.*\]$/, "");
          return base ? `${base} [${interim}]` : `[${interim}]`;
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  // -----------------------------------------------------------------------
  // TTS — speak a single sentence
  // -----------------------------------------------------------------------

  function speakSentence(text: string) {
    const stripped = stripMarkdownForTTS(text);
    if (!stripped) return;

    const utterance = new SpeechSynthesisUtterance(stripped);
    const matchedVoice = findVoiceForRole(roleRef.current);
    if (matchedVoice) utterance.voice = matchedVoice;
    const profile = VOICE_PROFILES[roleRef.current];
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;

    utteranceCountRef.current += 1;
    setIsSpeaking(true);

    const onDone = () => {
      utteranceCountRef.current -= 1;
      if (utteranceCountRef.current <= 0) {
        utteranceCountRef.current = 0;
        setIsSpeaking(false);
      }
    };
    utterance.onend = onDone;
    utterance.onerror = onDone;

    speechSynthesis.speak(utterance);
  }

  // -----------------------------------------------------------------------
  // Public API — stable callbacks via useCallback with refs
  // -----------------------------------------------------------------------

  const startListening = useCallback(() => {
    if (!isTalkModeRef.current) return;
    // Pause TTS if speaking (anti-feedback)
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceCountRef.current = 0;
    }
    setError(null);
    setTranscript("");
    const recognition = getRecognition();
    if (!recognition) return;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // Already started
    }
  }, []);

  const stopListening = useCallback((): string => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try { recognition.stop(); } catch { /* already stopped */ }
    }
    setIsListening(false);
    return transcriptRef.current.replace(/\s*\[.*?\]\s*/g, "").trim();
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    speechBufferRef.current = "";
    utteranceCountRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const feedStreamingToken = useCallback((token: string) => {
    if (!isTalkModeRef.current) return;
    speechBufferRef.current += token;
    const { sentences, remainder } = extractSentences(speechBufferRef.current);
    speechBufferRef.current = remainder;
    for (const sentence of sentences) {
      speakSentence(sentence);
    }
  }, []);

  const flushSpeechBuffer = useCallback(() => {
    if (speechBufferRef.current.trim()) {
      speakSentence(speechBufferRef.current.trim());
      speechBufferRef.current = "";
    }
  }, []);

  const toggleTalkMode = useCallback(() => {
    setIsTalkMode((prev) => {
      if (prev) {
        recognitionRef.current?.stop();
        speechSynthesis.cancel();
        setIsListening(false);
        setIsSpeaking(false);
        setTranscript("");
        speechBufferRef.current = "";
        utteranceCountRef.current = 0;
        setError(null);
      }
      return !prev;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      speechSynthesis.cancel();
    };
  }, []);

  return {
    isSupported: supported,
    isTalkMode,
    isListening,
    isSpeaking,
    transcript,
    toggleTalkMode,
    startListening,
    stopListening,
    stopSpeaking,
    feedStreamingToken,
    flushSpeechBuffer,
    error,
  };
}
