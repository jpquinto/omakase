import type { AgentRunRole } from "@omakase/db";

// ---------------------------------------------------------------------------
// Shared agent chat constants — used by both the modal panel and full-screen page
// ---------------------------------------------------------------------------

export interface AgentInfo {
  name: string;
  mascot: string;
  role: AgentRunRole;
}

export const ROLE_TO_AGENT: Record<string, string> = {
  architect: "miso",
  coder: "nori",
  reviewer: "koji",
  tester: "toro",
};

/** Agent role -> Omakase palette mapping */
export const ROLE_PALETTE: Record<AgentRunRole, {
  badge: string;
  glow: string;
  dot: string;
  border: string;
  headerGradient: string;
}> = {
  architect: {
    badge: "bg-oma-gold/20 text-oma-gold",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.25)]",
    dot: "bg-oma-gold",
    border: "border-oma-gold/30",
    headerGradient: "from-oma-gold/10 via-transparent to-transparent",
  },
  coder: {
    badge: "bg-oma-indigo/20 text-oma-indigo",
    glow: "shadow-[0_0_20px_rgba(129,140,248,0.25)]",
    dot: "bg-oma-indigo",
    border: "border-oma-indigo/30",
    headerGradient: "from-oma-indigo/10 via-transparent to-transparent",
  },
  reviewer: {
    badge: "bg-oma-secondary/20 text-oma-secondary",
    glow: "shadow-[0_0_20px_rgba(248,113,113,0.25)]",
    dot: "bg-oma-secondary",
    border: "border-oma-secondary/30",
    headerGradient: "from-oma-secondary/10 via-transparent to-transparent",
  },
  tester: {
    badge: "bg-oma-jade/20 text-oma-jade",
    glow: "shadow-[0_0_20px_rgba(110,231,183,0.25)]",
    dot: "bg-oma-jade",
    border: "border-oma-jade/30",
    headerGradient: "from-oma-jade/10 via-transparent to-transparent",
  },
};

/** Per-role greeting shown on the welcome screen */
export const WELCOME_GREETINGS: Record<AgentRunRole, string> = {
  architect: "What should we design?",
  coder: "What should we build?",
  reviewer: "What should I review?",
  tester: "What should we test?",
};

/** Per-role suggestion chips on the welcome screen */
export const WELCOME_SUGGESTIONS: Record<AgentRunRole, string[]> = {
  architect: [
    "Design the system architecture",
    "Plan the database schema",
    "Review our tech stack",
  ],
  coder: [
    "Implement the next feature",
    "Help me debug an issue",
    "Refactor this module",
  ],
  reviewer: [
    "Review my latest changes",
    "Check for security issues",
    "Suggest improvements",
  ],
  tester: [
    "Run the test suite",
    "Write end-to-end tests",
    "Analyze test coverage",
  ],
};

/** RGB values for ambient glow behind the welcome screen */
export const WELCOME_GLOW: Record<AgentRunRole, string> = {
  architect: "251, 191, 36",
  coder: "129, 140, 248",
  reviewer: "248, 113, 113",
  tester: "110, 231, 183",
};

// ---------------------------------------------------------------------------
// Voice chat profiles — per-agent TTS voice configuration
// ---------------------------------------------------------------------------

export interface VoiceProfile {
  gender: "male" | "female";
  pitch: number;
  rate: number;
  preferredVoice?: string;
}

/** Per-agent voice profiles for TTS. Miso & Toro = male, Nori & Koji = female */
export const VOICE_PROFILES: Record<AgentRunRole, VoiceProfile> = {
  architect: { gender: "male", pitch: 1.0, rate: 0.9 },
  coder: { gender: "female", pitch: 1.0, rate: 1.0 },
  reviewer: { gender: "female", pitch: 1.1, rate: 1.0 },
  tester: { gender: "male", pitch: 0.9, rate: 1.0 },
};

/** Check if the browser supports SpeechRecognition (STT) */
export function isVoiceChatSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
