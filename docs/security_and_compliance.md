# Security, Privacy, and Compliance

Clio is fundamentally an EdTech platform. Handling student data, grades, and behavioral telemetry requires the highest standard of ethical engineering, security, and privacy compliance.

This document outlines how Clio protects user data, making it suitable for institutional adoption and compliant with major educational privacy frameworks (such as FERPA in the US and GDPR).

---

## 1. Ethical Telemetry: The "Proof of Write" Promise

Clio captures behavioral data to verify authorship, but we draw a strict line against invasive student surveillance.

### What We DO Capture (Aggregated Ethics)
*   **Paste Events**: The frequency and volume of large text blocks injected simultaneously.
*   **Words Per Minute (WPM)**: A generalized moving average of typing speed to flag superhuman input.
*   **Document Snapshots**: Periodic saves of the textual content to build a timeline "replay."

### What We DO NOT Capture (Zero Invasive Tracking)
*   **No Keystroke Logging**: We do not capture individual keystrokes, key-up/key-down telemetry, or specific hardware input patterns outside of standard React `onChange` events.
*   **No Peripheral Surveillance**: We never request or utilize Webcam, Microphone, or Screen Recording browser permissions.
*   **No Browser Fingerprinting**: We do not trace students across other websites or attempt to break browser sandboxing to view other active tabs.

---

## 2. Threat Modeling & Server Security

### Cross-Site Scripting (XSS) Prevention
Because Clio's core feature is a rich-text editor allowing HTML submission, we assume all user input is actively malicious.
*   **Client-Side**: Tiptap Editor natively sanitizes output HTML structure.
*   **Server-Side Re-Sanitization**: Before any submitted essay is rendered on the Teacher Dashboard, it is aggressively scrubbed using `DOMpurify` inside the Node environment. This strips all `<script>`, `<iframe>`, and malicious `onerror` attributes, nullifying stored XSS attack vectors.

### Insecure Direct Object Reference (IDOR) Mitigation
Teachers should only see their students' submissions, and students should only see their own grades.
*   Every API endpoint requires `uuid` validation against the secure JWT cookie.
*   If a student requests `/api/submissions?submission_id=123` (where 123 belongs to another student), the backend verifies ownership against PostgreSQL before returning the payload, dropping unauthorized requests silently.

### Cryptography
*   All passwords are mathematically hashed and salted at the registration endpoint using `bcryptjs` with a secure cost factor. Plaintext passwords never exist in memory post-registration and are never stored in the database.
*   Session tokens (`clio_session`) are signed utilizing `crypto/HMAC SHA-256`, preventing forged token attacks.

---

## 3. Compliance Readiness

### FERPA (Family Educational Rights and Privacy Act) - US
Clio is built to act as a "School Official" handling educational records.
*   **Data Portability & Deletion**: System Administrators have standard CRUD capability to permanently purge a student's profile from the database. Due to strict `CASCADE` rules in our PostgreSQL schema, deleting a student instantly destroys all associated drafts, submissions, telemetry, and grades linked to that `uuid`, ensuring the "Right to be Forgotten."
*   **Scoped Access**: Teachers are rigorously restricted by RBAC (Role-Based Access Control) to only view records associated with their generated `class_id` foreign keys.

### GDPR (General Data Protection Regulation) - EU
*   **Data Minimization**: We only collect the `email`, `username`, and `full_name` required to operate the service.
*   **Consent**: Account creation relies on explicit opt-in.
*   **Secure Transit**: All communication between the client, Next.js API, and Supabase travels over TLS 1.2+ (HTTPS), guaranteeing data is encrypted in transit. Data at rest is handled by Supabase's underlying cloud infrastructure provider (AWS/GCP), which provides AES-256 encryption at the volume level.

---

*For security vulnerability disclosures, please open an issue in the GitHub Tracker or email the repository maintainer directly.*
