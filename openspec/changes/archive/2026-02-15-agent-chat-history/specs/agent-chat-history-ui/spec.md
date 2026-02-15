## ADDED Requirements

### Requirement: Chat history sidebar
The system SHALL display a collapsible sidebar to the left of the chat panel showing all conversation threads for the currently selected agent within the current project.

#### Scenario: Sidebar displays thread list
- **WHEN** the chat panel is open for an agent
- **THEN** a sidebar on the left shows all active threads for that agent in the current project, each displaying the thread title, time of last message, and message count

#### Scenario: Sidebar sorted by recency
- **WHEN** threads are listed in the sidebar
- **THEN** they are ordered by `lastMessageAt` descending (most recent first)

#### Scenario: Collapse sidebar
- **WHEN** the user clicks the sidebar collapse button
- **THEN** the sidebar collapses and the chat panel expands to full width

#### Scenario: Expand sidebar
- **WHEN** the user clicks the sidebar expand button while collapsed
- **THEN** the sidebar expands to show the thread list

### Requirement: Thread switching
The system SHALL allow users to switch between threads by clicking a thread in the sidebar, loading the selected thread's messages into the chat panel.

#### Scenario: Select a different thread
- **WHEN** the user clicks a thread in the sidebar
- **THEN** the chat panel loads all messages for the selected thread, ordered by timestamp ascending, and the selected thread is visually highlighted in the sidebar

#### Scenario: Switch thread preserves input
- **WHEN** the user has typed text in the input field and switches threads
- **THEN** the unsent text is discarded and the input field is cleared for the new thread

### Requirement: New thread creation from UI
The system SHALL allow users to create a new conversation thread from the sidebar.

#### Scenario: Create new thread button
- **WHEN** the user clicks the "New conversation" button in the sidebar
- **THEN** a new thread is created via the API with a default title, the thread appears at the top of the sidebar list, and the chat panel switches to the new (empty) thread

### Requirement: Thread context menu
The system SHALL provide a context menu on each thread in the sidebar for renaming and archiving.

#### Scenario: Rename thread
- **WHEN** the user selects "Rename" from the thread context menu
- **THEN** the thread title becomes editable inline, and pressing Enter or clicking away saves the new title via the API

#### Scenario: Archive thread
- **WHEN** the user selects "Archive" from the thread context menu
- **THEN** the thread is archived via the API and removed from the active thread list (unless "Show archived" is enabled)

### Requirement: Empty state
The system SHALL show an empty state when no threads exist for the selected agent in the current project.

#### Scenario: No threads exist
- **WHEN** the chat panel opens for an agent with no threads
- **THEN** the sidebar shows an empty state message ("No conversations yet") and the chat panel shows a prompt to start a new conversation with the agent

### Requirement: Thread indicator in chat header
The system SHALL display the current thread title in the chat panel header, allowing the user to identify which conversation they are viewing.

#### Scenario: Thread title shown in header
- **WHEN** a thread is selected and messages are displayed
- **THEN** the chat panel header shows the thread title below the agent name

#### Scenario: Click thread title to rename
- **WHEN** the user clicks the thread title in the header
- **THEN** the title becomes editable inline
