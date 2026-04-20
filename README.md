# Intern Task Grading Platform

A high-performance grading engine designed for the HNG internship to automatically validate and score intern submissions.

## 🚀 Overview

The **Intern Task Grading Platform** automates the tedious process of verifying intern tasks. It performs deep analysis of both live deployments and GitHub repositories to ensure that students have met all technical requirements, specifically focusing on critical DOM elements identified by unique `data-testid` attributes.

## ✨ Key Features

- **Multi-Task Support**: Evaluate multiple tasks simultaneously (currently supporting Task 1A and Task 1B).
- **Intern Name Extraction**: Automatically extracts the intern's name from their Task 1B profile page or GitHub metadata for personalized reporting.
- **HNG Branding**: Professional report design featuring HNG Internship & Frontend Track branding.
- **Live Site Inspection**: Verifies that the deployed application is reachable and contains all necessary interactive elements.
- **GitHub Repository Analysis**: 
  - Scans source code recursively to find required test IDs across HTML, JS, TS, and CSS files.
  - Validates repository accessibility and structure.
  - Extracts and previews repository README files.
- **Comprehensive Reporting**: Generates immediate PASS/REVIEW status based on automated checks.
- **Export Capabilities**: Download reports in **PDF** or **JPEG** formats for easy sharing and record-keeping.

## 🛠 Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Analysis**: Custom GitHub API integration & recursive tree scanning
- **Export**: jspdf, html2canvas

## 🚦 Getting Started

### Prerequisites

- Node.js (v18.0.0 or higher)
- A GitHub Personal Access Token (optional, for higher rate limits)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Grading software"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## 📖 How to Use

1. Enter the **Live URL** (e.g., Vercel, Netlify, or GitHub Pages link) for the intern's task.
2. Enter the **GitHub Repository URL** for the task.
3. Click **"Generate Report"**.
4. Review the results on the screen.
5. Use the **"Download PDF"** or **"Download Image"** buttons to save the report for the intern.

## 📝 Analysis Logic

The platform currently checks for specific `data-testid` attributes:

### Task 1A (Todo App)
- `test-todo-edit-form`
- `test-todo-save-button`
- `test-todo-overdue-indicator`
- ...and more.

### Task 1B (Profile Card)
- `test-profile-card`
- `test-user-name`
- `test-user-bio`
- ...and more.

---

## 🛠 Development

### Folder Structure
- `server.js`: Main Express server and GitHub API integration.
- `/public`: Frontend assets.
- `/public/app.js`: Core client-side logic and report generation.
- `/public/style.css`: Modern, responsive design system.

### Contributing
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*Built with ❤️ for the HNG Internship Grading Team.*
