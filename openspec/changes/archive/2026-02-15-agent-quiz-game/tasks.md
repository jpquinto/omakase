## 1. Type Layer & Message Schema

- [x] 1.1 Add `"quiz"` to the `AgentMessageType` union in `packages/db/src/schema/agent-messages.ts`
- [x] 1.2 Add `QuizMetadata` interface (phase, gameId, question, answer, score, results) and `QuizPhase` type to `packages/db/src/schema/agent-messages.ts`
- [x] 1.3 Add optional `metadata` field to the `AgentMessage` interface for structured quiz payloads
- [x] 1.4 Export new quiz types from `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`

## 2. DynamoDB Message Layer

- [x] 2.1 Update `createMessage` in `packages/dynamodb/src/agent-messages.ts` to accept and persist the optional `metadata` field
- [x] 2.2 Ensure `listMessages` and `listMessagesByThread` return the `metadata` field when present

## 3. Backend Quiz Orchestration

- [x] 3.1 Create `apps/orchestrator/src/quiz-handler.ts` with `handleQuizMessage` function that manages quiz state machine (topic_prompt → question → answer_result → complete)
- [x] 3.2 Implement question generation: build per-agent difficulty system prompts and generate 5 questions in a single Claude call with structured JSON output
- [x] 3.3 Implement answer validation: compare user answer to correct answer, generate explanation and agent reaction, send answer_result + next question
- [x] 3.4 Implement quiz completion: calculate final score, generate rating and breakdown, send complete phase message
- [x] 3.5 Integrate `handleQuizMessage` into the message POST route in `apps/orchestrator/src/index.ts` — route quiz-type messages to the quiz handler instead of `generateAgentResponse`

## 4. Frontend Quiz Components

- [x] 4.1 Create `apps/web/src/components/quiz/quiz-topic-prompt.tsx` — topic input with suggestion chips, styled with agent color
- [x] 4.2 Create `apps/web/src/components/quiz/quiz-question-card.tsx` — question text, 4 answer buttons (A-D), progress indicator, agent-colored accents
- [x] 4.3 Create `apps/web/src/components/quiz/quiz-answer-result.tsx` — correct/incorrect state, explanation text, correct answer highlight
- [x] 4.4 Create `apps/web/src/components/quiz/quiz-results.tsx` — final score display, rating label, per-question breakdown, "Play Again" button

## 5. Chat Panel Integration

- [x] 5.1 Add game menu button (Gamepad2 icon from lucide-react) to the chat panel header, visible only in chat mode
- [x] 5.2 Create game menu popover with "Quiz Game" option that sends the initial quiz message
- [x] 5.3 Update message rendering in `agent-chat-panel.tsx` to detect `type: "quiz"` messages and render the appropriate quiz component based on `metadata.phase`
- [x] 5.4 Wire quiz answer clicks to `sendMessage` with quiz metadata (selected answer index, gameId)

## 6. Chat Hook Updates

- [x] 6.1 Update `useAgentChat` hook's `sendMessage` to support optional `type` and `metadata` parameters for quiz messages
- [x] 6.2 Add quiz state reconstruction: on mount, scan recent messages for active quiz state and expose current game phase

## 7. Testing & Polish

- [x] 7.1 Verify full quiz flow end-to-end: launch game → select topic → answer 5 questions → see results → play again
- [x] 7.2 Verify per-agent difficulty: confirm Nori (easy), Koji (medium), Toro (medium), Miso (hard) generate appropriately difficult questions
- [x] 7.3 Verify quiz state survives page refresh mid-game
- [x] 7.4 Verify game menu is hidden in work mode and quiz components render correctly in chat history
