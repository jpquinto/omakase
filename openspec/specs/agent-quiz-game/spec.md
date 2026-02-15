## ADDED Requirements

### Requirement: Quiz game initiation from game menu
The system SHALL provide a game menu in the chat panel header that allows users to launch a quiz game. The menu SHALL only be available in chat mode.

#### Scenario: User opens game menu
- **WHEN** the user clicks the game menu button in the chat panel header
- **THEN** a popover appears listing available games, including "Quiz Game" with a brief description

#### Scenario: User launches quiz game
- **WHEN** the user selects "Quiz Game" from the game menu
- **THEN** the system sends a quiz message with `phase: "topic_prompt"` and the agent responds conversationally asking the user to choose a topic

#### Scenario: Game menu hidden in work mode
- **WHEN** the chat panel is in work mode
- **THEN** the game menu button is not visible

### Requirement: Quiz topic selection
The system SHALL allow the user to specify a topic for the quiz. The agent SHALL confirm the topic and begin generating questions.

#### Scenario: User provides a topic
- **WHEN** the user sends a message with their chosen topic during the `topic_prompt` phase
- **THEN** the agent acknowledges the topic, generates 5 multiple-choice questions in a single Claude API call, and sends the first question

#### Scenario: Agent suggests topics
- **WHEN** the quiz game is initiated
- **THEN** the agent's topic prompt message SHALL include 3-4 topic suggestions relevant to the agent's expertise area

### Requirement: Quiz question generation with per-agent difficulty
The system SHALL generate 5 multiple-choice questions with 4 options each. Question difficulty SHALL vary by agent.

#### Scenario: Nori generates easy questions
- **WHEN** a quiz is played with Nori (coder)
- **THEN** questions are straightforward with one obviously wrong option, and the agent provides encouraging hints after incorrect answers

#### Scenario: Koji generates medium questions
- **WHEN** a quiz is played with Koji (reviewer)
- **THEN** questions include plausible distractors with occasionally tricky wording, and the agent provides analytical feedback on answers

#### Scenario: Toro generates medium questions
- **WHEN** a quiz is played with Toro (tester)
- **THEN** questions are scenario-based and test edge-case thinking, with practical feedback on answers

#### Scenario: Miso generates hard questions
- **WHEN** a quiz is played with Miso (architect)
- **THEN** questions are abstract and conceptual, requiring synthesis across topics, with no hints provided

### Requirement: Quiz question presentation
The system SHALL present each question as a structured quiz card inline in the chat, with the agent's conversational commentary alongside it.

#### Scenario: Question card display
- **WHEN** the agent sends a question-phase quiz message
- **THEN** the chat renders a `QuizQuestionCard` showing the question text, four labeled options (A-D), and a progress indicator (e.g., "Question 3 of 5")

#### Scenario: User selects an answer
- **WHEN** the user clicks one of the four answer options on a question card
- **THEN** the selected answer is sent to the backend and the answer buttons become disabled to prevent double-submission

### Requirement: Quiz answer validation and feedback
The system SHALL validate the user's answer, show the result with an explanation, and have the agent react conversationally in-character.

#### Scenario: Correct answer
- **WHEN** the user selects the correct answer
- **THEN** the system renders a `QuizAnswerResult` component showing a success state, the explanation, and the agent's encouraging reaction in their personality

#### Scenario: Incorrect answer
- **WHEN** the user selects an incorrect answer
- **THEN** the system renders a `QuizAnswerResult` component highlighting the correct answer, showing the explanation, and the agent reacts in-character (with hints for easy difficulty, analytical feedback for medium, no hints for hard)

#### Scenario: Automatic progression to next question
- **WHEN** an answer result is displayed and there are remaining questions
- **THEN** the agent sends the next question after their conversational reaction, within the same response

### Requirement: Quiz completion and results
The system SHALL show a results summary after all 5 questions are answered.

#### Scenario: Quiz complete
- **WHEN** the user answers the 5th and final question
- **THEN** the system renders a `QuizResults` component showing the final score (e.g., "4/5"), a rating label, and a per-question breakdown

#### Scenario: Results rating
- **WHEN** the quiz results are displayed
- **THEN** the rating SHALL be contextual: 5/5 = "Perfect!", 4/5 = "Almost there!", 3/5 = "Not bad!", 2/5 or below = "Keep learning!"

#### Scenario: Play again option
- **WHEN** the quiz results are displayed
- **THEN** a "Play Again" button is shown that restarts the quiz flow from topic selection

### Requirement: Quiz state reconstruction on refresh
The system SHALL reconstruct active quiz state from message history when the chat panel remounts.

#### Scenario: Page refresh during active quiz
- **WHEN** the user refreshes the page while a quiz is in progress
- **THEN** the frontend scans recent messages for the latest `quiz`-type message and restores the game state (current question, score so far)

#### Scenario: Completed quiz in history
- **WHEN** the user scrolls through chat history containing a completed quiz
- **THEN** all quiz components (questions, answers, results) render in their final states with no interactive elements
