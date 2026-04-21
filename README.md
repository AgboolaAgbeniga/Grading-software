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

### Task 1A: Todo Application (21 IDs)
The engine checks for the following 21 mandatory testids:
`test-todo-card`, `test-todo-title`, `test-todo-description`, `test-todo-due-date`, `test-todo-time-remaining`, `test-todo-status`, `test-todo-status-control`, `test-todo-priority-indicator`, `test-todo-tags`, `test-todo-edit-button`, `test-todo-delete-button`, `test-todo-edit-form`, `test-todo-edit-title-input`, `test-todo-edit-description-input`, `test-todo-edit-priority-select`, `test-todo-edit-due-date-input`, `test-todo-save-button`, `test-todo-cancel-button`, `test-todo-expand-toggle`, `test-todo-collapsible-section`, `test-todo-overdue-indicator`.

**Technical Audit:** Verifies `aria-expanded`/`aria-controls` for accessibility and `aria-live="polite"` for dynamic time updates.

### Task 1B: Profile Card (8 IDs + Technical Audit)
The engine validates the personal identity components and performs a technical audit:
- `test-profile-card`, `test-user-name`, `test-user-bio`, `test-user-time`, `test-user-avatar`, `test-user-social-links`, `test-user-hobbies`, `test-user-dislikes`.
- **Technical Audit:** Verifies semantic `<article>`, `<header>`, `<figure>`, and `<ul>/<li>` tags; requires meaningful `<img>` alt text; ensures `target="_blank"` on social links; and validates epoch milliseconds.

### Calculation
- **Weighted Scoring**: Live site verification is weighted at **70%**, and source code analysis at **30%**.
- **Average Score**: `(Task 1A Score + Task 1B Score) / 2`
- **Pass Threshold**: Interns require an **Average Score of 7.0 or higher** AND a minimum of **4.0 on each individual task** to pass.

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
