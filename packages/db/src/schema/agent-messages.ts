import type { AgentRunRole } from "./agent-runs.js";

export type AgentMessageSender = "user" | "agent";
export type AgentMessageType = "message" | "status" | "error" | "quiz";

export type QuizPhase = "topic_prompt" | "question" | "answer_result" | "complete";

export interface QuizQuestion {
  index: number;
  total: number;
  text: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizMetadata {
  phase: QuizPhase;
  gameId: string;
  topic?: string;
  question?: QuizQuestion;
  selectedAnswer?: number;
  correctAnswer?: number;
  isCorrect?: boolean;
  explanation?: string;
  score?: { correct: number; total: number };
  results?: {
    score: number;
    total: number;
    rating: string;
    breakdown: { questionIndex: number; correct: boolean }[];
  };
}

export interface AgentMessage {
  id: string;
  runId: string;
  featureId: string;
  projectId: string;
  sender: AgentMessageSender;
  role: AgentRunRole | null;
  content: string;
  type: AgentMessageType;
  threadId?: string;
  metadata?: QuizMetadata;
  timestamp: string;
}

export type NewAgentMessage = Omit<AgentMessage, "id" | "timestamp"> & {
  id?: string;
  timestamp?: string;
};
