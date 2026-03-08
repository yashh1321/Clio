import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyToken } from "@/lib/auth"

// ── GET /api/submissions — returns all submissions with student usernames ──
export async function GET(req: NextRequest) {
    // Verify session (teacher only)
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session || session.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
      student:profiles!submissions_student_id_fkey ( id, username ),
      grade:grades ( id, score, feedback, graded_at )
    `)
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

    try {
        const body = await req.json()
        const { assignment_title, content, wpm, paste_count, replay_snapshots } = body as {
            assignment_title?: string
            content?: string
            wpm?: number
            paste_count?: number
            replay_snapshots?: Array<{ timestamp: number; html: string; textLength: number }>
        }

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: "Essay content is required" }, { status: 400 })
        }

        const safeWpm = Math.max(0, Math.min(wpm ?? 0, 300))
        const safePaste = Math.max(0, paste_count ?? 0)

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

        // Insert the submission
        const { data: sub, error: subErr } = await supabase
            .from("submissions")
            .insert({
                student_id: profile.id,
                assignment_title: assignment_title || "Untitled",
                content: content.trim(),
                wpm: safeWpm,
                paste_count: safePaste,
                integrity_score: score,
                replay_snapshots: replay_snapshots ?? [],
            })
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
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
}
