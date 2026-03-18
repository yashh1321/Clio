# Clio - Product Requirement Document (PRD)

## 1. Project Overview
**Product Name:** Clio
**Description:** Clio is a modern academic integrity platform designed to verify authorship, protect student work, and enable confident writing. It uses a "Proof of Write" mechanism by tracking typing behavior (WPM, paste events, editing history) to generate an integrity score, ensuring content is authentically written by the student.

## 2. Technology Stack
### Frontend
- **Framework:** Next.js 15 (React 19)
- **Styling:** TailwindCSS v4, Shadcn/UI, Lucide React
- **Editor:** Tiptap (Headless wrapper)
- **Visuals:** WebGL Shaders, Glassmorphism design
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`)
- **Export:** `docx` (Word), `jspdf` (PDF)
- **Persistence:** LocalStorage + DB Sync

### Backend
- **Core API:** FastAPI (Python)
- **Database:** SQLite (via SQLAlchemy)
- **Legacy/Admin Modules:** Streamlit (likely for rapid prototyping or admin dashboards)
- **Validation:** Pydantic models
- **Server:** Uvicorn

## 3. System Architecture
The system consists of a Next.js frontend for Students and Teachers, communicating with a FastAPI backend.
- **Students** write essays in a monitored environment that tracks inputs.
- **Teachers** view a dashboard of submissions with detailed integrity reports.
- **Backend** processes submissions, calculates scores, and stores data.

## 4. Key Features & Requirements

### 4.1 Authentication
- **Role-based Access:**
  - **Student:** Can access the Editor to write and submit essays.
  - **Teacher:** Can access the Dashboard to view and grade submissions.
- **Login Flow:** Simple username/password mock authentication (Demo Mode).
  - Student: `student / 123`
  - Teacher: `teacher / 123`

### 4.2 Student Editor (Core)
- **Rich Text Editing:** Supports headings, lists, bold/italic, and text formatting.
- **Live Integrity Monitoring:**
  - **WPM Tracker:** Real-time Words Per Minute calculation.
  - **Paste Detection:** Flags large sudden text insertions.
  - **Integrity Score:** Live score (0-100) based on typing behavior.
- **Replay & history:** (Planned/Partial) Ability to replay the writing session snapshot.
- **Export:** Download work as `.docx` or `.pdf`.
- **Submission:** Submit final work to the backend.

### 4.3 Teacher Dashboard
- **Submission List:** View all student submissions with high-level stats (Score, WPM).
- **Detailed View:**
  - Read full essay content (sanitized HTML).
  - View Integrity Report (Score, Paste Count, WPM, Time Spent).
  - **Grading:** Assign a grade (0-100) and feedback.
- **Search/Filter:** Filter submissions by student name or title.

### 4.4 Backend API (`/docs`)
- `POST /submit`: Receives essay content and metrics. Validates WPM and paste counts. Calculates final integrity score.
- `GET /submissions`: Returns list of all submissions.
- `POST /auth/login`: Handles credential verification.
- `POST /grades`: Saves teacher grades for a submission.

## 5. Non-Functional Requirements
- **Performance:** Editor must handle long sessions without lag.
- **Security:** Input sanitization (DOMPurify) to prevent XSS.
- **UX/UI:** Premium "Dark Mode" aesthetic with fluid animations (Liquid buttons, WebGL backgrounds).
