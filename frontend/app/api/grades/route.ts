import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyToken } from "@/lib/auth"

// ── POST /api/grades — teacher grades a submission ──
export async function POST(req: NextRequest) {
    // Verify session (teacher only)
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session || session.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden — teachers only" }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { submission_id, score, feedback } = body as {
            submission_id?: string
            score?: number
            feedback?: string
        }

        if (!submission_id) {
            return NextResponse.json({ error: "submission_id is required" }, { status: 400 })
        }
        if (score === undefined || score < 0 || score > 100) {
            return NextResponse.json({ error: "score must be 0–100" }, { status: 400 })
        }

        // Lookup teacher profile ID
        const { data: teacher, error: tErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", session.username)
            .single()

        if (tErr || !teacher) {
            return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
        }

        // Upsert grade (one grade per submission)
        const { data: grade, error: gErr } = await supabase
            .from("grades")
            .upsert(
                {
                    submission_id,
                    teacher_id: teacher.id,
                    score,
                    feedback: feedback || "",
                    graded_at: new Date().toISOString(),
                },
                { onConflict: "submission_id" }
            )
            .select("id, score, feedback, graded_at")
            .single()

        if (gErr) {
            return NextResponse.json({ error: gErr.message }, { status: 500 })
        }

        return NextResponse.json({ message: "Graded successfully", grade })
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
}

// ── GET /api/grades?submission_id=... — get grade for a submission ──
export async function GET(req: NextRequest) {
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

    const submissionId = req.nextUrl.searchParams.get("submission_id")
    if (!submissionId) {
        return NextResponse.json({ error: "submission_id query param required" }, { status: 400 })
    }

    const { data, error } = await supabase
        .from("grades")
        .select("id, score, feedback, graded_at, teacher:profiles!grades_teacher_id_fkey ( username )")
        .eq("submission_id", submissionId)
        .single()

    if (error) {
        // No grade yet is not an error
        return NextResponse.json({ grade: null })
    }

    const teacher = Array.isArray(data.teacher) ? data.teacher[0] : data.teacher
    return NextResponse.json({
        grade: {
            id: data.id,
            score: data.score,
            feedback: data.feedback,
            graded_at: data.graded_at,
            graded_by: teacher?.username ?? "unknown",
        },
    })
}
