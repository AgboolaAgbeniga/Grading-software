# Intern Task Grading Platform

A high-performance grading engine designed for the HNG internship to automatically validate and score intern submissions.

## 🚀 Overview

The **Intern Task Grading Platform** automates the process of verifying intern tasks by performing deep analysis of live deployments and GitHub repositories. It calculates weighted scores based on the presence of critical `data-testid` attributes.

## ✨ Key Features

- **Multi-Task Scoring**: Supports Task 1A (Todo App) and Task 1B (Profile Card) with a 10-point scale for each.
- **Mass Grading**: Upload a CSV of interns and grade them all at once.
- **Filtering & Stats**: View results filtered by "Passed", "Review", or "Fail" with live statistics.
- **Detailed Feedback**: CSV exports include specific comments on missing requirements for each intern.
- **Export Capabilities**: Download individual reports as PDF/JPEG, and bulk results as CSV.

## 📝 Grading & Scoring Logic

Each task is graded out of **10 points** based on the coverage of required technical identifiers (`data-testid`).

### Task 1A: Todo Application (12 IDs)
The engine checks for the following interactive and structural elements:
- `test-todo-edit-form`: The container for the edit form.
- `test-todo-edit-title-input`: Title field in the edit form.
- `test-todo-edit-description-input`: Description field.
- `test-todo-edit-priority-select`: Priority dropdown.
- `test-todo-edit-due-date-input`: Date picker.
- `test-todo-save-button`: Save action button.
- `test-todo-cancel-button`: Cancel action button.
- `test-todo-status-control`: Complete/Internal status toggle.
- `test-todo-priority-indicator`: Visual indicator for task priority.
- `test-todo-expand-toggle`: Button to expand/collapse task details.
- `test-todo-collapsible-section`: The actual collapsible content.
- `test-todo-overdue-indicator`: UI element shown when a task is past its due date.

### Task 1B: Profile Card (8 IDs)
The engine validates the personal identity components:
- `test-profile-card`: The main card container.
- `test-user-name`: The intern's display name.
- `test-user-bio`: The professional biography.
- `test-user-time`: Current UTC time display.
- `test-user-avatar`: Profile image element.
- `test-user-social-links`: Container for social media handles.
- `test-user-hobbies`: List of interests.
- `test-user-dislikes`: List of dislikes.

### Calculation
- **Score**: `(Unique IDs found / Total required IDs) * 10`
- **Average Score**: `(Task 1A Score + Task 1B Score) / 2`
- **Pass Threshold**: Interns require an **Average Score of 7.0 or higher** to pass.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation
1. `npm install`
2. `npm start`
3. Visit `http://localhost:3000`

## 📊 Mass Grading Format
For bulk uploads, use a CSV with the following headers:
`Timestamp`, `Slack ID (Abdul.tsx)`, `Slack Email`, `Stage 1a Live URL`, `Stage 1a Github Repo`, `Stage 1b Live URL`, `Stage 1b Github Repo`

---
*Built with ❤️ for the HNG Internship Grading Team.*
