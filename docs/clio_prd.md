# Clio - Product Requirement Document (PRD)

## 1. Project Overview
**Product Name:** Clio
**Description:** Clio is a modern academic integrity platform designed to verify authorship, protect student work, and enable confident writing. It uses a "Proof of Write" mechanism by tracking typing behavior (WPM, paste events, editing history) to generate an integrity score, ensuring content is authentically written by the student.

## 2. Technology Stack
### Frontend & Core Backend (Next.js)
- **Framework:** Next.js 15 (React 19, App Router)
- **Styling:** TailwindCSS v4, Shadcn/UI, Lucide React
- **Editor:** Tiptap (Headless wrapper)
- **Visuals:** WebGL Shaders, Glassmorphism design, Dark Mode default
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`)
- **Export:** `docx` (Word), `jspdf` (PDF)

### AI/ML Layer (FastAPI)
- **Framework:** FastAPI (Python)
- **Responsibility:** Manages the embedding generation pipeline, handling model inference and offloading heavy vector computations from the core Next.js backend.

### Database & Security
- **Database Backend:** Supabase (PostgreSQL) using `pgvector` with HNSW indexing for scalable and efficient similarity search.
- **Security:** DOMPurify, bcryptjs, Service Role Key for RLS safety, JWT session cookies

## 3. System Architecture
The system consists of a dual-backend architecture communicating securely with a Supabase PostgreSQL database.
- **Students** enroll in classes, write drafts, and submit essays in a monitored environment that tracks inputs.
- **Teachers** create classes and assignments, and view a dashboard of submissions with detailed integrity reports, similarity comparisons, and analytics.
- **Core API (Next.js)** processes submissions, calculates scores, handles secure authentication (JWT), and securely bypasses RLS using the Service Role Key.
- **AI/ML Layer (FastAPI)** is triggered for generating embeddings and computing text similarity, decoupling expensive AI inference from standard web requests.

## 4. Key Features & Requirements

### 4.1 Authentication & Security
- **Role-based Access Control (RBAC):**
  - **Student:** Can access the Editor, Classes, Profile, and view their own past submissions and grades.
  - **Teacher:** Can access the Dashboard, Analytics, Assignments, and Classes management.
- **Login/Registration Flow:** Users register and log in with email/username and password. Passwords are securely hashed with bcrypt. HttpOnly cookies store signed session tokens.
- **API Security:** All API routes strictly verify JWT session tokens, enforce ownership checks, and sanitize HTML inputs.

### 4.2 Student Experience
- **Class Enrollment:** Students can view and enroll in classes created by teachers.
- **Rich Text Editor:** Tiptap-based editor supporting formatting, auto-saving drafts to the cloud, and exporting as `.docx` or `.pdf`.
- **Live Integrity Monitoring:**
  - **WPM Tracker:** Real-time Words Per Minute calculation.
  - **Paste Detection:** Flags large sudden text insertions.
  - **Integrity Score:** Live score based on typing behavior constraints.
- **Past Submissions:** Students can view their previously submitted work, grades, and teacher feedback.

### 4.3 Teacher Experience
- **Classes Management:** Create and manage classes/sections.
- **Assignments Management:** Create assignments with specific due dates, max word counts, and descriptions.
- **Dashboard & Grading:** 
  - Submissions are grouped by assignment.
  - View full essay content and writing session replays.
  - **Similarity Checking:** Compare submissions against each other within the platform to detect plagiarism.
  - **Analytics:** View class-wide statistics, integrity score distributions, and performance trends over time.
  - **Grading:** Assign a grade (0-100) and detailed feedback.
  - **Export:** Export grades as CSV.

## 5. Non-Functional Requirements
- **Performance:** Editor must handle long sessions without lag. Payload limits increased to 20MB for large submissions.
- **Security:** Strict input sanitization (DOMPurify) to prevent XSS. Robust PostgreSQL RLS policies ensuring API routes securely proxy database interactions. 
- **UX/UI:** Premium "Dark Mode" aesthetic (default) with fluid animations (Liquid buttons, WebGL backgrounds). Built with strict accessibility (`aria-labels`, focus rings).
