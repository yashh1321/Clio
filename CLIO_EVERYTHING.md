# Clio: Comprehensive Project Documentation

Welcome to Clio, an advanced, role-based educational platform designed for precise assignment tracking, analytics-driven grading, and robust administrative oversight.

Below is a complete breakdown of every aspect of the project, including the tech stack, frontend features, backend architecture, and database topology.

---

## 1. Tech Stack Overview

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Library**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS, `shadcn/ui`, Radix UI primitives
- **Editor**: Tiptap Rich Text Editor (customized with word counts, shortcuts, and PDF/DOCX exporters)
- **Icons**: Lucide React
- **Animations**: Framer Motion, GSAP, Custom WebGL Shaders (Login)

### Backend (API layer)
- **Framework**: Next.js Serverless API Routes (Node.js)
- **Authentication**: Custom JWT encoding/decoding (`jose` / `jsonwebtoken`) bundled into secure HTTP-only cookies (`clio_session`).
- **Authorization**: Next.js Middleware (`middleware.ts`) enforcing strict pattern-matched, role-based access control.
- **Crypto**: `bcryptjs` for secure password hashing.

### Database
- **Platform**: Supabase (Remote PostgreSQL)
- **Client**: `@supabase/supabase-js` (via `lib/supabase.ts`)
- **Structure**: Strongly typed schemas mapped through Type definitions (`supabase.ts`).

---

## 2. Core User Roles & Authentication

Clio handles three distinct user roles:

1.  **Student (`student`)**: The end-users submitting essays.
2.  **Teacher (`teacher`)**: The instructors managing classes, creating assignments, and grading submissions.
3.  **System Admin (`admin`)**: The superuser managing the entire platform's accounts.

### Authentication Flow
1.  **Login (`/api/auth/login`)**: Takes a username/password, verifies the `bcrypt` hash against the `profiles` table.
2.  **JWT Issue**: A secure JWT is minted containing the `username` and `role`.
3.  **Cookie Delivery**: The JWT is attached as an `HttpOnly`, `SameSite=Lax` cookie (`clio_session`).
4.  **Middleware Gateway**: Every request hits `middleware.ts`. Depending on the route pattern (e.g., `/admin` or `/api/grades`), the middleware intercepts requests that lack a valid token or attempts made by an incorrect role, securely redirecting them.

---

## 3. Database Schema Topology

The Supabase PostgreSQL database uses `uuid` primary keys and references foreign keys with `ON DELETE CASCADE` to prevent orphaned rows when users are deleted.

### Tables Breakdown

- **`profiles`**: The central user table.
    - Fields: `id`, `username`, `email`, `password` (hashed), `full_name`, `role` (enum check: student/teacher/admin), `class`, `course`, `created_at`.
- **`classes`**: represents a physical or virtual classroom.
    - Fields: `id`, `name`, `code` (join code for students), `teacher_id` (FK to profiles).
- **`class_enrollments`**: Junction table for Students joining Classes.
    - Fields: `id`, `class_id`, `student_id`.
- **`assignments`**: Created by a teacher, assigned to a specific class.
    - Fields: `id`, `title`, `description`, `due_date`, `class_id`, `teacher_id`.
- **`submissions`**: The final essays submitted by students.
    - Fields: `id`, `assignment_id`, `student_id`, `teacher_id`, `content` (HTML/Text), `status` ('submitted' | 'graded'), `originality_score`, `submitted_at`.
- **`drafts`**: Auto-saved works-in-progress to prevent data loss.
    - Fields: `id`, `assignment_id`, `student_id`, `content`, `updated_at`.
- **`grades`**: Feedback and scoring attached to a specific submission.
    - Fields: `id`, `submission_id`, `teacher_id`, `score` (overall 0-100), `feedback` (text), `rubric_scores` (JSONB storing partial scores for Grammar, Content, etc.), `graded_at`.

---

## 4. Frontend Ecosystem & Features

The frontend is broken down primarily by user role.

### 🍎 The Teacher Experience
1.  **Teacher Dashboard (`/dashboard`)**:
    -   Displays incoming submissions.
    -   **Advanced Filtering**: Filter by Status (Graded/Ungraded/All) and Minimum/Maximum Score Range.
    -   **Grading Detail Panel**: Teachers can read a submission and instantly grade it. Supports both *Overall Grading* (single score) and *Rubric Grading* (Content, Grammar, Structure, Originality checkboxes adding up to 100).
    -   **Bulk Actions**: Select multiple checkboxes to perform "Bulk Grade" assignments at once with identical feedback.
2.  **Class Management (`/classes`)**: Create new class periods and generate join codes.
3.  **Similarity Report (`/similarity`)**: Compares submissions side-by-side to detect plagiarism or heavy overlapping text.

### 🎓 The Student Experience
1.  **Student Editor (`/editor`)**:
    -   Powered by Tiptap.
    -   **Rich Text Features**: Bold, Italic, lists, headings.
    -   **Keyboard Shortcuts**: `Ctrl+S` (Save Draft), `Ctrl+Enter` (Submit), `Ctrl+Shift+E/D` (Export PDF/DOCX), `Escape` (Focus Mode).
    -   **Word Count Goal**: Visual progress bar tracking towards a 2,000-word limit.
    -   **Session Analytics**: Live tracking of typing speed (WPM) and paste events (flags "Unusual Speed" if pasting chunks of text).
2.  **Student Dashboard (`/student-dashboard` & `/submissions`)**: Track past and pending assignments.
3.  **Student Analytics (`/student-analytics`)**: Data visualizations summarizing average scores, trends, and submission velocity.
4.  **Student Profile (`/profile`)**: Manage personal details (Full Name, Email, Class, Course).

### 🛡️ The System Administrator
1.  **Superadmin Dashboard (`/admin`)**:
    -   An exclusive control center.
    -   **CRUD Operations**: View all users in a secure data table. Manually Create new users (with specific roles), Edit existing profiles (e.g., promoting a student to a teacher), and Delete users entirely. (Cascading DB rules ensure a deleted user's drafts/submissions are safely scrubbed).

---

## 5. Backend API Routes Breakdown

The application uses standard REST patterns within Next.js API Routes:

-   `/api/auth/login`: Verifies credentials and issues the JWT cookie.
-   `/api/auth/register`: Creates new external accounts securely.
-   `/api/auth/session`: Quick endpoint used by the frontend to verify the client's current logged-in state.
-   `/api/auth/logout`: Destroys the `clio_session` cookie.
-   `/api/admin/users` (GET/POST/PUT/DELETE): The master route for Superadmins controlling user accounts.
-   `/api/submissions`: Standard CRUD for retrieving (GET) and posting (POST) student essays.
-   `/api/grades`: Endpoint for applying scores and generating notifications.
-   `/api/classes/enroll`: Validates a class code and adds a student to the roster.

## 6. Real-time Enhancements & Notifications
Clio utilizes native features to continuously poll auto-save (`/api/drafts`) events, reducing data loss natively in the browser without requiring external heavy WebSockets. The notification module provides non-obtrusive toast alerts across the Teacher/Student flows utilizing `sonner` and `radix-ui` toast primitives.
