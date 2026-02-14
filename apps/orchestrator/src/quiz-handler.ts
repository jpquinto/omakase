/**
 * quiz-handler.ts -- Orchestrates the interactive quiz game mode.
 *
 * Manages the quiz state machine:
 *   topic_prompt → question → answer_result → complete
 *
 * Each agent has a distinct difficulty level:
 *   - Nori (coder): Easy
 *   - Koji (reviewer): Medium
 *   - Toro (tester): Medium
 *   - Miso (architect): Hard
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  getAgentRun,
  getFeature,
  listMessagesByThread,
  listMessages,
  createMessage,
  getDefaultPersonality,
} from "@omakase/dynamodb";
import type { QuizMetadata, QuizQuestion } from "@omakase/db";
import { emit } from "./stream-bus.js";

const ROLE_TO_AGENT: Record<string, string> = {
  architect: "miso",
  coder: "nori",
  reviewer: "koji",
  tester: "toro",
};

const AGENT_DIFFICULTY: Record<string, "easy" | "medium" | "hard"> = {
  nori: "easy",
  koji: "medium",
  toro: "medium",
  miso: "hard",
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: `Difficulty: EASY
- Questions should be straightforward and test basic knowledge
- Include one obviously wrong "humorous" option to keep it fun
- After wrong answers, provide a helpful hint or mnemonic
- Keep question language simple and clear
- Be encouraging and supportive in your reactions`,

  medium: `Difficulty: MEDIUM
- Questions should require understanding, not just memorization
- All 4 options should be plausible — avoid obviously wrong answers
- Include questions that test nuance and subtle distinctions
- Provide analytical feedback explaining WHY the correct answer is right
- Be fair but challenging`,

  hard: `Difficulty: HARD
- Questions should be conceptual and require synthesis across topics
- Options should include common misconceptions as distractors
- Test deep understanding, not trivia
- Do NOT provide hints — expect the player to reason through it
- Questions can reference real-world scenarios requiring applied knowledge
- Be direct and matter-of-fact in reactions`,
};

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

interface QuizGameState {
  gameId: string;
  topic: string;
  questions: StoredQuestion[];
  currentIndex: number;
  answers: { questionIndex: number; correct: boolean }[];
}

interface StoredQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizRun {
  featureId: string;
  projectId: string;
  role: string;
}

/**
 * Handle an incoming quiz-type message. Determines the current phase
 * from conversation history and responds accordingly.
 *
 * Accepts a pre-resolved `run` object so synthetic chat-* runIds
 * (which don't exist in DynamoDB) work correctly.
 */
export async function handleQuizMessage(
  runId: string,
  userMessage: string,
  metadata: QuizMetadata,
  threadId?: string,
  run?: QuizRun,
): Promise<void> {
  if (!run) {
    const fetched = await getAgentRun({ runId });
    if (!fetched) {
      console.error(`[quiz-handler] Agent run ${runId} not found`);
      return;
    }
    run = fetched;
  }

  const agentName = ROLE_TO_AGENT[run.role] ?? run.role;
  const difficulty = AGENT_DIFFICULTY[agentName] ?? "medium";

  switch (metadata.phase) {
    case "topic_prompt":
      await handleTopicPrompt(runId, run, agentName, threadId);
      break;
    case "question":
      // User is submitting a topic — generate questions
      await handleTopicSelection(runId, run, agentName, difficulty, userMessage, metadata.gameId, threadId);
      break;
    case "answer_result":
      // User selected an answer — validate and continue
      await handleAnswerSubmission(runId, run, agentName, difficulty, metadata, threadId);
      break;
    default:
      console.warn(`[quiz-handler] Unknown quiz phase: ${metadata.phase}`);
  }
}

async function handleTopicPrompt(
  runId: string,
  run: { featureId: string; projectId: string; role: string },
  agentName: string,
  threadId?: string,
): Promise<void> {
  const personality = getDefaultPersonality(agentName);
  const feature = await getFeature({ featureId: run.featureId });

  const topicSuggestions: Record<string, string[]> = {
    miso: ["Software Architecture", "System Design Patterns", "Distributed Systems"],
    nori: ["JavaScript & TypeScript", "React & Frontend", "Git & Version Control"],
    koji: ["Code Review Best Practices", "Security Vulnerabilities", "Clean Code Principles"],
    toro: ["Testing Strategies", "Edge Cases & Bugs", "QA Methodology"],
  };

  const suggestions = topicSuggestions[agentName] ?? ["General Programming", "Web Development", "Computer Science"];

  emit(runId, { type: "thinking_start" });

  const systemPrompt = [
    personality?.persona ?? `You are an AI agent with the role of ${run.role}.`,
    `\nYou're starting a quiz game! Be excited and in-character.`,
    `Ask the player to choose a topic for a 5-question multiple choice quiz.`,
    `Suggest these topics: ${suggestions.join(", ")}`,
    `But let them know they can pick any topic they want.`,
    `Keep it brief and fun — 2-3 sentences max.`,
    feature ? `\nContext: You're working on "${feature.name}".` : "",
  ].join("\n");

  try {
    let fullText = "";
    const stream = getClient().messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: "Start a quiz game with me!" }],
    });

    stream.on("text", (text) => {
      fullText += text;
      emit(runId, { type: "token", token: text });
    });

    await stream.finalMessage();
    emit(runId, { type: "thinking_end" });

    await createMessage({
      runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: "agent",
      role: run.role as "architect" | "coder" | "reviewer" | "tester",
      content: fullText,
      type: "quiz",
      threadId,
      metadata: {
        phase: "topic_prompt",
        gameId: "",
        topic: undefined,
      },
    });
  } catch (error) {
    emit(runId, { type: "stream_error", error: error instanceof Error ? error.message : String(error) });
    emit(runId, { type: "thinking_end" });
  }
}

async function handleTopicSelection(
  runId: string,
  run: { featureId: string; projectId: string; role: string },
  agentName: string,
  difficulty: "easy" | "medium" | "hard",
  topic: string,
  gameId: string,
  threadId?: string,
): Promise<void> {
  const personality = getDefaultPersonality(agentName);

  emit(runId, { type: "thinking_start" });

  const systemPrompt = [
    personality?.persona ?? `You are an AI agent with the role of ${run.role}.`,
    `\nYou are generating a 5-question multiple choice quiz on the topic: "${topic}".`,
    DIFFICULTY_INSTRUCTIONS[difficulty],
    `\nRespond with ONLY a JSON object in this exact format, no markdown code fences:`,
    `{"questions":[{"text":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctAnswer":0,"explanation":"..."}]}`,
    `Each question must have exactly 4 options. correctAnswer is the 0-based index.`,
    `The explanation should be 1-2 sentences explaining why the correct answer is right.`,
  ].join("\n");

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: `Generate a ${difficulty} difficulty quiz about: ${topic}` }],
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    let questions: StoredQuestion[];
    try {
      const parsed = JSON.parse(responseText);
      questions = parsed.questions;
    } catch {
      // Try extracting JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions;
      } else {
        throw new Error("Failed to parse quiz questions from AI response");
      }
    }

    // Now generate the conversational intro for the first question
    const introPrompt = [
      personality?.persona ?? `You are an AI agent with the role of ${run.role}.`,
      `\nThe player chose the topic "${topic}" for a quiz game.`,
      `Write a brief, excited reaction (1-2 sentences) acknowledging the topic and introducing the first question.`,
      `Stay in character. Don't include the question itself — that will be shown separately.`,
    ].join("\n");

    let introText = "";
    const introStream = getClient().messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 128,
      system: introPrompt,
      messages: [{ role: "user", content: `I want to be quizzed on: ${topic}` }],
    });

    introStream.on("text", (text) => {
      introText += text;
      emit(runId, { type: "token", token: text });
    });

    await introStream.finalMessage();
    emit(runId, { type: "thinking_end" });

    // Store game state in the metadata: embed questions for later retrieval
    const firstQuestion: QuizQuestion = {
      index: 0,
      total: 5,
      text: questions[0].text,
      options: questions[0].options,
      difficulty,
    };

    // Save all questions as a JSON blob in the metadata for state tracking
    const quizState: QuizGameState = {
      gameId,
      topic,
      questions,
      currentIndex: 0,
      answers: [],
    };

    await createMessage({
      runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: "agent",
      role: run.role as "architect" | "coder" | "reviewer" | "tester",
      content: introText,
      type: "quiz",
      threadId,
      metadata: {
        phase: "question",
        gameId,
        topic,
        question: firstQuestion,
        score: { correct: 0, total: 0 },
        // Store the full game state as a stringified blob in the explanation field
        // This is a pragmatic choice: we reuse the metadata shape to carry state
        explanation: JSON.stringify(quizState),
      },
    });
  } catch (error) {
    emit(runId, { type: "stream_error", error: error instanceof Error ? error.message : String(error) });
    emit(runId, { type: "thinking_end" });
  }
}

async function handleAnswerSubmission(
  runId: string,
  run: { featureId: string; projectId: string; role: string },
  agentName: string,
  difficulty: "easy" | "medium" | "hard",
  metadata: QuizMetadata,
  threadId?: string,
): Promise<void> {
  // Reconstruct game state from conversation history
  const history = threadId
    ? await listMessagesByThread({ threadId, limit: 50 })
    : await listMessages({ runId });

  // Find the most recent question message with game state
  let gameState: QuizGameState | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.type === "quiz" && msg.metadata?.explanation) {
      try {
        const parsed = JSON.parse(msg.metadata.explanation);
        if (parsed.questions && parsed.gameId === metadata.gameId) {
          gameState = parsed as QuizGameState;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (!gameState) {
    console.error("[quiz-handler] Could not reconstruct quiz game state");
    emit(runId, { type: "stream_error", error: "Quiz game state lost. Please start a new game." });
    return;
  }

  const selectedAnswer = metadata.selectedAnswer ?? 0;
  const currentQ = gameState.questions[gameState.currentIndex];
  const isCorrect = selectedAnswer === currentQ.correctAnswer;

  // Update state
  gameState.answers.push({ questionIndex: gameState.currentIndex, correct: isCorrect });

  const personality = getDefaultPersonality(agentName);
  const score = gameState.answers.filter((a) => a.correct).length;
  const totalAnswered = gameState.answers.length;
  const isLastQuestion = totalAnswered >= 5;

  emit(runId, { type: "thinking_start" });

  // Generate conversational reaction
  const reactionPrompt = [
    personality?.persona ?? `You are an AI agent with the role of ${run.role}.`,
    `\nQuiz game context:`,
    `Topic: ${gameState.topic}`,
    `Question ${totalAnswered}/5: "${currentQ.text}"`,
    `Player answered: "${currentQ.options[selectedAnswer]}"`,
    `Correct answer: "${currentQ.options[currentQ.correctAnswer]}"`,
    `Result: ${isCorrect ? "CORRECT" : "INCORRECT"}`,
    `Explanation: ${currentQ.explanation}`,
    `Current score: ${score}/${totalAnswered}`,
    DIFFICULTY_INSTRUCTIONS[difficulty],
    `\nReact to their answer in-character (1-2 sentences). ${isCorrect ? "Celebrate!" : "Console them and explain."}`,
    isLastQuestion
      ? `\nThis was the final question! Add a brief wrap-up comment about their overall performance (${score}/5).`
      : `\nBriefly transition to the next question. Don't include the question text itself.`,
  ].join("\n");

  try {
    let reactionText = "";
    const stream = getClient().messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 256,
      system: reactionPrompt,
      messages: [{ role: "user", content: `I chose answer ${String.fromCharCode(65 + selectedAnswer)}` }],
    });

    stream.on("text", (text) => {
      reactionText += text;
      emit(runId, { type: "token", token: text });
    });

    await stream.finalMessage();
    emit(runId, { type: "thinking_end" });

    // Send answer result message
    await createMessage({
      runId,
      featureId: run.featureId,
      projectId: run.projectId,
      sender: "agent",
      role: run.role as "architect" | "coder" | "reviewer" | "tester",
      content: reactionText,
      type: "quiz",
      threadId,
      metadata: {
        phase: "answer_result",
        gameId: gameState.gameId,
        topic: gameState.topic,
        question: {
          index: gameState.currentIndex,
          total: 5,
          text: currentQ.text,
          options: currentQ.options,
          difficulty,
        },
        selectedAnswer,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
        explanation: currentQ.explanation,
        score: { correct: score, total: totalAnswered },
      },
    });

    if (isLastQuestion) {
      // Send completion message
      const rating = getRating(score);
      await createMessage({
        runId,
        featureId: run.featureId,
        projectId: run.projectId,
        sender: "agent",
        role: run.role as "architect" | "coder" | "reviewer" | "tester",
        content: "",
        type: "quiz",
        threadId,
        metadata: {
          phase: "complete",
          gameId: gameState.gameId,
          topic: gameState.topic,
          results: {
            score,
            total: 5,
            rating,
            breakdown: gameState.answers,
          },
        },
      });
    } else {
      // Send next question
      const nextIndex = gameState.currentIndex + 1;
      gameState.currentIndex = nextIndex;
      const nextQ = gameState.questions[nextIndex];

      await createMessage({
        runId,
        featureId: run.featureId,
        projectId: run.projectId,
        sender: "agent",
        role: run.role as "architect" | "coder" | "reviewer" | "tester",
        content: "",
        type: "quiz",
        threadId,
        metadata: {
          phase: "question",
          gameId: gameState.gameId,
          topic: gameState.topic,
          question: {
            index: nextIndex,
            total: 5,
            text: nextQ.text,
            options: nextQ.options,
            difficulty,
          },
          score: { correct: score, total: totalAnswered },
          explanation: JSON.stringify(gameState),
        },
      });
    }
  } catch (error) {
    emit(runId, { type: "stream_error", error: error instanceof Error ? error.message : String(error) });
    emit(runId, { type: "thinking_end" });
  }
}

function getRating(score: number): string {
  if (score === 5) return "Perfect!";
  if (score === 4) return "Almost there!";
  if (score === 3) return "Not bad!";
  return "Keep learning!";
}
