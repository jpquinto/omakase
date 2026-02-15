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
// ElevenLabs TTS — fetch audio from /api/tts proxy
// ---------------------------------------------------------------------------

async function fetchTTSAudio(text: string, voiceId: string): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) {
      console.error("[VoiceChat] TTS API error:", res.status, await res.text().catch(() => ""));
      return null;
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("[VoiceChat] TTS fetch failed:", err);
    return null;
  }
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
  const roleRef = useRef(role);
  roleRef.current = role;

  // Keep a ref to isTalkMode so callbacks don't go stale
  const isTalkModeRef = useRef(false);
  isTalkModeRef.current = isTalkMode;

  // Keep a ref to transcript for stopListening
  const transcriptRef = useRef("");
  transcriptRef.current = transcript;

  // -----------------------------------------------------------------------
  // Audio queue — sequential playback of ElevenLabs audio segments
  // -----------------------------------------------------------------------

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // Create the Audio element eagerly so it's "unlocked" by user gesture.
  // Call this during toggleTalkMode (user click) to satisfy autoplay policy.
  function ensureAudioElement() {
    if (!audioRef.current) {
      const audio = new Audio();
      // Play a silent buffer to unlock the element for future programmatic plays
      audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAD/+1DEAAAG4AN39AAAIQQAZ/KAABEAAADSAAAAEIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQnAAADSAAAAAAAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";
      audio.play().then(() => {
        audio.pause();
        audio.src = "";
      }).catch(() => {
        // Ignore — will still work in most browsers
      });
      audioRef.current = audio;
    }
  }

  function playNext() {
    const url = audioQueueRef.current.shift();
    if (!url) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    ensureAudioElement();
    const audio = audioRef.current!;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      playNext();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      playNext();
    };

    audio.src = url;
    audio.play().catch((err) => {
      console.error("[VoiceChat] Audio play failed:", err);
      URL.revokeObjectURL(url);
      playNext();
    });
  }

  function enqueueAudio(blobUrl: string) {
    audioQueueRef.current.push(blobUrl);
    setIsSpeaking(true);
    if (!isPlayingRef.current) {
      playNext();
    }
  }

  function clearAudioQueue() {
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      if (audioRef.current.src && audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
    }
    // Revoke all queued URLs
    for (const url of audioQueueRef.current) {
      URL.revokeObjectURL(url);
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }

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
  // TTS — batch sentences and send to ElevenLabs via /api/tts
  // -----------------------------------------------------------------------

  // Accumulate sentences and flush as a single TTS request when we have
  // enough text (~200 chars or 3+ sentences). This reduces API calls and
  // credit usage vs sending every sentence individually.
  const sentenceBatchRef = useRef<string[]>([]);
  const batchCharCountRef = useRef(0);
  const BATCH_CHAR_THRESHOLD = 200;
  const BATCH_SENTENCE_THRESHOLD = 3;

  function flushSentenceBatch() {
    if (sentenceBatchRef.current.length === 0) return;

    const combined = sentenceBatchRef.current.join(" ");
    sentenceBatchRef.current = [];
    batchCharCountRef.current = 0;

    const stripped = stripMarkdownForTTS(combined);
    if (!stripped) return;

    const voiceId = VOICE_PROFILES[roleRef.current].elevenLabsVoiceId;
    setIsSpeaking(true);

    fetchTTSAudio(stripped, voiceId).then((blobUrl) => {
      if (blobUrl) {
        enqueueAudio(blobUrl);
      }
    });
  }

  function enqueueSentence(text: string) {
    sentenceBatchRef.current.push(text);
    batchCharCountRef.current += text.length;

    // Flush when we have enough text for a natural chunk
    if (
      batchCharCountRef.current >= BATCH_CHAR_THRESHOLD ||
      sentenceBatchRef.current.length >= BATCH_SENTENCE_THRESHOLD
    ) {
      flushSentenceBatch();
    }
  }

  // -----------------------------------------------------------------------
  // Public API — stable callbacks via useCallback with refs
  // -----------------------------------------------------------------------

  const startListening = useCallback(() => {
    // Pause TTS if speaking (anti-feedback)
    clearAudioQueue();
    sentenceBatchRef.current = [];
    batchCharCountRef.current = 0;
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
    clearAudioQueue();
    speechBufferRef.current = "";
    sentenceBatchRef.current = [];
    batchCharCountRef.current = 0;
  }, []);

  const feedStreamingToken = useCallback((token: string) => {
    if (!isTalkModeRef.current) return;
    speechBufferRef.current += token;
    const { sentences, remainder } = extractSentences(speechBufferRef.current);
    speechBufferRef.current = remainder;
    for (const sentence of sentences) {
      enqueueSentence(sentence);
    }
  }, []);

  const flushSpeechBuffer = useCallback(() => {
    // Push any remaining buffer as a final sentence
    if (speechBufferRef.current.trim()) {
      enqueueSentence(speechBufferRef.current.trim());
      speechBufferRef.current = "";
    }
    // Flush whatever is batched (even if under threshold)
    flushSentenceBatch();
  }, []);

  const toggleTalkMode = useCallback(() => {
    setIsTalkMode((prev) => {
      if (prev) {
        recognitionRef.current?.stop();
        clearAudioQueue();
        setIsListening(false);
        setTranscript("");
        speechBufferRef.current = "";
        sentenceBatchRef.current = [];
        batchCharCountRef.current = 0;
        setError(null);
      } else {
        // Unlock the audio element during user gesture (autoplay policy)
        ensureAudioElement();
      }
      return !prev;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      clearAudioQueue();
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
