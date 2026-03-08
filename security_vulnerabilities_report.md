# 🛡️ Clio Security Vulnerability Assessment

## Overview
An automated testing pass using TestSprite MCP was initiated to find security vulnerabilities. The automated tool successfully generated tests, but primarily focused on basic API functionality. A supplementary manual architectural review was performed to identify complex systemic vulnerabilities.

**The following critical vulnerabilities were found in the Next.js + Supabase application architecture:**

---

### 🚨 1. Critical Database Exposure (RLS Bypass)
**Severity:** Critical 🟥
**Location:** Supabase Database Policies & `lib/supabase.ts`

**Description:**
The application uses the `NEXT_PUBLIC_SUPABASE_ANON_KEY` to connect to Supabase from the Next.js API routes (`/api/submissions`, `/api/grades`). Because this key is prefixed with `NEXT_PUBLIC_`, it is exposed to the browser.
To make the Next.js API queries work, the Supabase Row Level Security (RLS) policies were set to allow `INSERT`, `UPDATE`, and `SELECT` operations for the `anon` public role (e.g., `USING (true)`).
**Impact:** Anyone can extract the `NEXT_PUBLIC` Anon key from the frontend bundle and query the Supabase REST API directly. They can completely bypass the Next.js API (and its custom JWT authentication logic) to read all submissions, overwrite grades, and corrupt profiles.

**Recommendation:** 
- Use the Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`) securely inside the Next.js Server API routes (do not expose it to the browser).
- Change the RLS policies to `false` for the public `anon` role, or implement real Supabase Authentication so RLS can map to `auth.uid()`.

---

### 🚨 2. Insecure Direct Object Reference (IDOR) in Grading
**Severity:** High 🟧
**Location:** `POST /api/grades` (`frontend/app/api/grades/route.ts`)

**Description:**
When a teacher submits a grade, they send a `submission_id` and a `score`. The API verifies that the user is a teacher, but it **does not verify if the submission belongs to that teacher**.
**Impact:** A malicious or curious teacher can intercept the request, change the `submission_id` to any other assignment ID, and arbitrarily alter the grades given by other teachers.

**Recommendation:**
Before upserting the grade, query the `submissions` table to assert that `submissions.teacher_id` matches the authenticated teacher's ID (or is unassigned/null).

---

### 🚨 3. Unauthorized Data Exposure
**Severity:** Medium 🟨
**Location:** `GET /api/grades` (`frontend/app/api/grades/route.ts`)

**Description:**
The endpoint requires any valid session (student or teacher) and takes a `submission_id` query parameter. It returns the score and feedback for that ID without verifying ownership.
**Impact:** A student could enumerate `submission_id` UUIDs (or obtain them) to view the grades and feedback of arbitrary other students.

**Recommendation:**
Add ownership checks: if the user is a student, ensure `student_id == session.id`. If a teacher, ensure `teacher_id == session.id`.

---

### 🚨 4. Hardcoded API Keys and Credentials
**Severity:** Medium 🟨
**Location:** `frontend/app/api/auth/login/route.ts` & `backend/main.py`

**Description:**
- Next.js Auth API has hardcoded credentials (`student/123`, `teacher/123`, `physics_teacher/123`). While marked as a demo, this is a serious risk if deployed to production without removal.
- The legacy Python backend uses a default hardcoded API key `clio-dev-key-DO-NOT-USE-IN-PROD`.

**Recommendation:**
Connect the Next.js authentication to a real Supabase Auth or database credential lookup table with hashed passwords (e.g., `bcrypt`).

---

### Notes on TestSprite Output
The TestSprite execution on the backend ran standard boundary and unit tests (valid payload, missing fields). Automated LLM-based test generation tools are better suited for regression and functional E2E testing rather than discovering deep architectural security flaws (like the RLS split-brain issue). Manual pentesting and architecture review remain essential.
