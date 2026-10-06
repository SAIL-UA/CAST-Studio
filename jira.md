# CAST Jira Sprint Board

The CAST sprint board lives in Jira. Use it for day-to-day work: what is in the current sprint, who owns it, and how larger features break down.

For access to the CAST Jira board, contact **Caleb Erickson** (`crerickson@crimson.ua.edu`).

## Issue hierarchy

Work is organized as **epic → story → subtasks**. Small one-off work can skip the story layer and live as a **task**.

| Type | What it represents | Example |
| --- | --- | --- |
| **Epic** | A collection of related features | Authentication system |
| **Story** | A single feature under that epic | Login, logout, session handling |
| **Subtask** | Concrete work needed to ship the story | Add logout button, add logout backend endpoint, cookies |
| **Task** | A small one-off change that does not warrant a story | A typo fix, a one-line config change |

### Epic

An epic groups a set of features that belong together. It is the parent of stories, not the place to track individual implementation steps.

Example: **Authentication system** is an epic because login, logout, and session handling are related features of one system.

### Story

A story is a feature users (or instructors/developers) can complete. Stories sit under an epic.

Under the authentication epic, stories would include:

- Login
- Logout
- Session handling

### Subtask

Subtasks are the work items under a story. They are the buttons, endpoints, and other pieces that make the feature real.

Under a **Logout** story, subtasks would include:

- Add logout button
- Add logout backend endpoint
- Cookies (clear/expire session cookies)

### Task (one-off)

Create a **task** when the change is small and does not need a story of its own. Do not invent an epic and story for work that is a single, isolated change.

## How to use the board

1. Put new feature work under the right **epic**. Create an epic only when you are grouping multiple related features.
2. Add a **story** for each feature.
3. Break the story into **subtasks** so implementation can be assigned and tracked separately.
4. Use a **task** for small one-off changes.
5. Keep sprint status on the Jira board. The [Fall 2026 plan](fall-plan.md) is the planning document; Jira is the live sprint board.
