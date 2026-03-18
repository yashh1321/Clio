import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyToken } from "@/lib/auth"
import DOMPurify from 'isomorphic-dompurify'

// Removed invalid App Router config

export const runtime = 'nodejs'

// ── Rate Limiting (In-Memory) ──
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(identifier);

    if (!userLimit) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (now > userLimit.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX) {
        return false;
    }

    userLimit.count += 1;
    return true;
}

// ── GET /api/submissions — returns all submissions with student usernames ──
export async function GET(req: NextRequest) {
    // Verify session (teacher only)
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session || session.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Look up the teacher's profile ID to filter submissions
    const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", session.username)
        .single()

    if (!teacherProfile) {
        return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const { data, error } = await supabase
        .from("submissions")
        .select(`
      id,
      assignment_title,
      content,
      wpm,
      paste_count,
      integrity_score,
      submitted_at,
      replay_snapshots,
      teacher_id,
      student:profiles!submissions_student_id_fkey ( id, username ),
      grade:grades ( id, score, feedback, graded_at )
    `)
        .or(`teacher_id.eq.${teacherProfile.id},teacher_id.is.null`)
        .order("submitted_at", { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten for the dashboard
    const formatted = (data ?? []).map((s) => {
        const student = Array.isArray(s.student) ? s.student[0] : s.student
        const grade = Array.isArray(s.grade) ? s.grade[0] : s.grade
        return {
            id: s.id,
            student_id: student?.username ?? "unknown",
            assignment_title: s.assignment_title,
            content: s.content,
            wpm: s.wpm,
            paste_count: s.paste_count,
            integrity_score: s.integrity_score,
            timestamp: s.submitted_at,
            replay_snapshots: s.replay_snapshots ?? [],
            grade: grade ?? null,
        }
    })

    return NextResponse.json(formatted)
}

// ── POST /api/submissions — student submits an essay ──
export async function POST(req: NextRequest) {
    // Verify session (student only)
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    if (session.role !== "student") {
        return NextResponse.json({ error: "Forbidden: only students can submit essays" }, { status: 403 })
    }

    // Apply Rate Limiting
    const identifier = session.username;
    if (!checkRateLimit(identifier)) {
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    try {
        // Use Next.js built-in JSON parser (reliable, handles body correctly)
        const body = await req.json()

        const { assignment_title, assignment_id, content, wpm, paste_count, replay_snapshots, teacher_id } = body as {
            assignment_title?: string
            assignment_id?: string
            content?: string
            wpm?: number
            paste_count?: number
            replay_snapshots?: Array<{ timestamp: number; html: string; textLength: number }>
            teacher_id?: string
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Essay content is required" }, { status: 400 })
        }

        if (content.length > 20_000_000) {
            return NextResponse.json({ error: "Essay content is too long (max 20,000,000 characters)" }, { status: 400 })
        }

        const safeTitle = DOMPurify.sanitize((assignment_title || "Untitled").slice(0, 500), { USE_PROFILES: { html: true } })
        // Deep-Sanitize nested historical snapshsot HTML arrays
        let safeSnapshots = (replay_snapshots ?? []).slice(0, 50000) // Increase limits to allow extremely long historical sessions
        safeSnapshots = safeSnapshots.map(snap => ({
            ...snap,
            html: DOMPurify.sanitize((snap.html || "").trim(), { USE_PROFILES: { html: true } })
        }))

        // Gracefully handle strings/invalid types to prevent postgres integer casting crashes (DoS)
        let parsedWpm = parseInt(String(wpm), 10)
        let parsedPaste = parseInt(String(paste_count), 10)
        if (isNaN(parsedWpm)) parsedWpm = 0
        if (isNaN(parsedPaste)) parsedPaste = 0

        const safeWpm = Math.max(0, Math.min(parsedWpm, 300))
        const safePaste = Math.max(0, parsedPaste)

        // Calculate integrity score (same logic as the Python backend)
        let score = 100
        score -= safePaste * 15
        if (safeWpm > 100) score -= 20
        score = Math.max(0, Math.min(score, 100))

        // Lookup the student's profile ID from the username
        const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", session.username)
            .single()

        if (profileErr || !profile) {
            return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
        }

        // Sanitize the HTML on the server before passing to Database (prevents XSS permanently)
        // Disabling SVG tags using html default profile prevents dangerous custom SVG attacks entirely.
        const sanitizedContent = DOMPurify.sanitize(content.trim(), { USE_PROFILES: { html: true } })

        // Insert the submission
        const insertData: Record<string, unknown> = {
            student_id: profile.id,
            assignment_title: safeTitle,
            content: sanitizedContent,
            wpm: safeWpm,
            paste_count: safePaste,
            integrity_score: score,
            replay_snapshots: safeSnapshots,
        }

        // Validate and attach assignment if specified
        if (assignment_id) {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (typeof assignment_id === "string" && uuidRegex.test(assignment_id)) {
                insertData.assignment_id = assignment_id
            }
        }

        // Validate and attach teacher if specified
        if (teacher_id) {
            // Check UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (typeof teacher_id !== "string" || !uuidRegex.test(teacher_id)) {
                return NextResponse.json({ error: "Invalid teacher_id format" }, { status: 400 })
            }

            // Verify the teacher exists and has the 'teacher' role
            const { data: teacherCheck, error: teacherErr } = await supabase
                .from("profiles")
                .select("id")
                .eq("id", teacher_id)
                .eq("role", "teacher")
                .single()

            if (teacherErr || !teacherCheck) {
                return NextResponse.json({ error: "Teacher not found" }, { status: 404 })
            }

            insertData.teacher_id = teacher_id
        }

        const { data: sub, error: subErr } = await supabase
            .from("submissions")
            .insert(insertData)
            .select("id, integrity_score, submitted_at")
            .single()

        if (subErr) {
            return NextResponse.json({ error: subErr.message }, { status: 500 })
        }

        return NextResponse.json({
            message: "Submitted successfully",
            submission_id: sub.id,
            score,
            submitted_at: sub.submitted_at,
        })
    } catch (err: unknown) {
        console.error("[POST /api/submissions] Error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
