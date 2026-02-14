## Why

Agent chat currently supports free-form conversation and work mode, but lacks structured interactive experiences. Adding a quiz game gives users a fun, educational way to engage with each agent's unique personality while reinforcing that each agent has distinct expertise and difficulty. This also establishes the pattern for future interactive game modes in the chat interface.

## What Changes

- Add a "Games" menu to the agent chat modal that lets users launch interactive experiences
- Introduce a quiz game mode where the agent generates 5 multiple-choice questions on a user-chosen topic
- Each agent has a distinct difficulty level tied to their personality:
  - **Nori** (coder) — Easy: straightforward questions, helpful hints
  - **Koji** (reviewer) — Medium: trickier questions with subtle wrong answers
  - **Toro** (tester) — Medium: scenario-based questions that test edge-case thinking
  - **Miso** (architect) — Hard: deep conceptual questions requiring synthesis
- Frontend renders custom quiz UI components (question cards, answer buttons, score tracker, results summary) inline within the chat stream
- Backend orchestrates quiz flow: topic selection → question generation → answer validation → scoring → results
- Agent responds conversationally between questions, reacting to correct/incorrect answers in character

## Capabilities

### New Capabilities
- `agent-quiz-game`: Quiz game mode — topic selection, question generation with per-agent difficulty, answer validation, scoring, and results. Covers both the backend game orchestration and frontend quiz UI components.

### Modified Capabilities
- `agent-chat`: Chat panel gains a game menu UI and the ability to render structured interactive components (quiz cards) inline alongside regular messages.
- `agent-message-streaming`: Messages gain a new `quiz` type with structured payloads for game state (questions, answers, scores) alongside the existing text streaming.

## Impact

- **Frontend**: `agent-chat-panel.tsx` — new game menu, quiz UI components, structured message rendering
- **Backend**: `agent-responder.ts` — quiz game orchestration logic, structured response generation
- **Types**: `packages/db` — new message types for quiz payloads
- **DynamoDB**: `agent-messages` — store quiz game state in message content
- **API**: New or extended endpoints for game session management
- **Dependencies**: Evaluate LangGraph for game state orchestration (optional)
