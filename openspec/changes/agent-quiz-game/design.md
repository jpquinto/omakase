## Context

The agent chat system currently supports two modes: **chat** (personality-driven conversation via Claude API) and **work** (Claude Code interactive REPL). Messages flow from the frontend through SSE streams with token-by-token delivery. Each agent has a personality and system prompt, but interactions are purely free-form text.

The chat panel (`agent-chat-panel.tsx`) renders three message types: `message`, `status`, and `error`. The `useAgentChat` hook manages SSE subscriptions and optimistic updates. The backend `agent-responder.ts` streams Claude responses via the `stream-bus`.

We want to add a structured quiz game mode that lives alongside these existing modes, reusing the same message infrastructure but adding structured payloads and custom frontend rendering.

## Goals / Non-Goals

**Goals:**
- Add a game menu to the chat modal for launching interactive experiences (starting with quiz)
- Implement a 5-question multiple-choice quiz game orchestrated entirely through the existing message/streaming pipeline
- Render quiz-specific UI components (question cards, answer selection, score display) inline in the chat
- Give each agent a distinct difficulty level that affects question complexity and hint availability
- Keep the experience conversational — the agent reacts to answers in-character between questions

**Non-Goals:**
- No persistent leaderboards or cross-session score tracking (future enhancement)
- No multiplayer or competitive mode between agents
- No LangGraph dependency — the quiz state machine is simple enough to manage with a plain state object
- No changes to the work mode or Claude Code sessions
- No new DynamoDB tables — quiz state travels in message payloads

## Decisions

### 1. Quiz state management: Message-embedded state vs. separate game session table

**Decision:** Embed quiz state in message payloads using a `quiz` message type.

Each quiz-related message carries a structured `metadata` field with the game state (current question index, scores, questions array, selected answers). The agent-responder tracks game state by reading back the conversation history and extracting the latest quiz metadata.

**Why not a separate table?** The quiz is ephemeral and conversational. It lives within a chat thread and doesn't need independent querying. Embedding in messages means zero new infrastructure and the game naturally appears in chat history.

**Why not LangGraph?** The user suggested evaluating it, but the quiz flow is a simple linear state machine (topic → generate → ask → answer → score → repeat → results). A plain TypeScript state object with an enum for phases is sufficient and avoids a new dependency. LangGraph would be overkill for 5 sequential questions with no branching or tool calls.

### 2. Structured message payloads: New message type vs. content parsing

**Decision:** Add a new `AgentMessageType` value: `"quiz"`. Quiz messages carry a `metadata` JSON field with structured data.

```typescript
type QuizPhase = "topic_prompt" | "question" | "answer_result" | "complete";

interface QuizMetadata {
  phase: QuizPhase;
  gameId: string;
  topic?: string;
  question?: {
    index: number;        // 0-4
    total: number;        // 5
    text: string;
    options: string[];    // 4 options, A-D
    difficulty: string;   // "easy" | "medium" | "hard"
  };
  selectedAnswer?: number;  // 0-3
  correctAnswer?: number;   // 0-3
  isCorrect?: boolean;
  explanation?: string;
  score?: { correct: number; total: number };
  results?: {
    score: number;
    total: number;
    rating: string;       // e.g., "Quiz Master!", "Nice try!"
    breakdown: { questionIndex: number; correct: boolean }[];
  };
}
```

The `content` field still carries the agent's conversational text (reactions, encouragement, banter). The frontend checks `type === "quiz"` and renders the appropriate quiz component alongside the text.

**Why not parse from content?** Structured data is reliable, testable, and doesn't require fragile markdown/regex parsing. The content field stays purely conversational.

### 3. Frontend rendering: Separate quiz view vs. inline components

**Decision:** Render quiz components inline within the chat message stream.

When a message has `type: "quiz"`, the chat panel renders a `QuizCard` component below the agent's conversational text. This keeps the experience feeling like a conversation with embedded interactive elements, rather than switching to a completely different UI.

Components:
- `QuizTopicPrompt` — displayed when game starts, shows topic input with suggestions
- `QuizQuestionCard` — question text, 4 answer buttons (A-D), question counter (e.g., "3/5")
- `QuizAnswerResult` — shows correct/incorrect with explanation, agent's reaction
- `QuizResults` — final score card with breakdown, rating, and "Play again?" option

All components use the Liquid Glass design system and are tinted with the active agent's color palette.

### 4. Difficulty system: Per-agent configuration

**Decision:** Difficulty is determined by agent name, configured in the quiz system prompt.

| Agent | Difficulty | Behavior |
|-------|-----------|----------|
| Nori  | Easy      | Straightforward questions, one obviously wrong option, encouraging hints after wrong answers |
| Koji  | Medium    | Plausible distractors, occasionally tricky wording, analytical feedback |
| Toro  | Medium    | Scenario/edge-case focused questions, testing practical understanding |
| Miso  | Hard      | Abstract/conceptual questions requiring synthesis, no hints, expects depth |

The difficulty affects the system prompt sent to Claude when generating questions. The agent's existing personality system prompt is combined with quiz-specific instructions that include difficulty parameters.

### 5. Game flow orchestration

**Decision:** The agent-responder handles quiz orchestration through a dedicated `handleQuizMessage` function.

Flow:
1. User clicks "Quiz" from game menu → frontend sends a message with `type: "quiz"` and `metadata: { phase: "topic_prompt" }`
2. Agent responds conversationally asking about preferred topic (or user already specified)
3. User sends topic → agent generates 5 questions in one Claude call, stores them in metadata
4. Agent sends first question as `type: "quiz"` with `metadata: { phase: "question", question: {...} }`
5. User clicks an answer → frontend sends message with the selected answer index
6. Agent validates, sends `answer_result` with explanation + next `question` (or `complete` if last)
7. After question 5, agent sends `complete` with full results and a conversational wrap-up

Questions are generated upfront (all 5 in one call) to avoid latency between questions. They're stored in the game state and revealed one at a time.

### 6. Game menu UI

**Decision:** Add a game menu button (🎮 icon) next to the mode toggle in the chat panel header.

Clicking it opens a small dropdown/popover with available games. Currently only "Quiz Game" with a brief description. This is extensible for future game modes. The menu is only available in chat mode (not work mode).

## Risks / Trade-offs

- **[Token cost]** Generating 5 quality questions per quiz adds ~1000 output tokens per game. → Acceptable for an interactive feature; questions are generated in a single call to minimize round-trips.
- **[Question quality variance]** Claude may generate inconsistent difficulty levels. → Mitigated by explicit difficulty instructions in the system prompt with examples of what each level means.
- **[State loss on page refresh]** Quiz state lives in messages, so refreshing mid-quiz preserves history but the frontend needs to reconstruct game state from the last quiz message. → The frontend scans recent messages for the latest `quiz` type to restore state.
- **[Message type expansion]** Adding `"quiz"` to `AgentMessageType` is a schema change affecting the type layer. → Low risk since the type union is additive and existing code handles unknown types gracefully.
