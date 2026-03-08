import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyToken } from "@/lib/auth"

// ── GET /api/similarity — Basic text similarity check between submissions ──
// Compares all submissions for the same assignment title and flags pairs
// with high similarity using Jaccard similarity on word n-grams.
export async function GET(req: NextRequest) {
    const token = req.cookies.get("clio_session")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const session = verifyToken(token)
    if (!session || session.role !== "teacher") {
        return NextResponse.json({ error: "Forbidden: teachers only" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const assignmentTitle = searchParams.get("assignment")

    const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", session.username)
        .single()

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    // Build query
    let query = supabase
        .from("submissions")
        .select(`
            id,
            assignment_title,
            content,
            student:profiles!submissions_student_id_fkey ( username, full_name )
        `)
        .eq("teacher_id", profile.id)

    if (assignmentTitle) {
        query = query.eq("assignment_title", assignmentTitle)
    }

    const { data: submissions, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const subs = submissions ?? []
    if (subs.length < 2) {
        return NextResponse.json({ pairs: [], message: "Need at least 2 submissions to compare" })
    }

    // ── Preprocessing: extract clean text and generate n-gram sets ──
    const N = 4 // 4-gram shingles
    const processed = subs.map(s => {
        // Strip HTML and normalize
        const text = (s.content || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&[a-z]+;/gi, " ")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim()

        const words = text.split(" ").filter((w: string) => w.length > 0)

        // Generate word n-grams (shingles)
        const shingles = new Set<string>()
        for (let i = 0; i <= words.length - N; i++) {
            shingles.add(words.slice(i, i + N).join(" "))
        }

        const student = Array.isArray(s.student) ? s.student[0] : s.student

        return {
            id: s.id,
            assignment: s.assignment_title,
            studentName: student?.full_name || student?.username || "Unknown",
            studentUsername: student?.username || "unknown",
            wordCount: words.length,
            shingles,
        }
    })

    // ── Pairwise Jaccard similarity ──
    const pairs: Array<{
        submission1: { id: string; student: string; username: string }
        submission2: { id: string; student: string; username: string }
        similarity: number
        sharedShingles: number
        assignment: string
    }> = []

    let comparisonsMade = 0

    for (let i = 0; i < processed.length; i++) {
        for (let j = i + 1; j < processed.length; j++) {
            const a = processed[i]
            const b = processed[j]

            // Only compare submissions for the same assignment
            if (a.assignment !== b.assignment) continue

            // Skip very short submissions (< 20 words won't have meaningful shingles)
            if (a.wordCount < 20 || b.wordCount < 20) continue

            comparisonsMade++

            // Jaccard = |A ∩ B| / |A ∪ B|
            let intersection = 0
            for (const shingle of a.shingles) {
                if (b.shingles.has(shingle)) intersection++
            }
            const union = a.shingles.size + b.shingles.size - intersection
            const similarity = union > 0 ? Math.round((intersection / union) * 100) : 0

            // Only report pairs with >= 25% similarity
            if (similarity >= 25) {
                pairs.push({
                    submission1: { id: a.id, student: a.studentName, username: a.studentUsername },
                    submission2: { id: b.id, student: b.studentName, username: b.studentUsername },
                    similarity,
                    sharedShingles: intersection,
                    assignment: a.assignment,
                })
            }
        }
    }

    // Calculate totalEligiblePairs based on assignment groupings of valid submissions (wordCount >= 20)
    let totalEligiblePairs = 0
    const countByAssignment: Record<string, number> = {}
    for (const sub of processed) {
        if (sub.wordCount >= 20) {
            countByAssignment[sub.assignment] = (countByAssignment[sub.assignment] || 0) + 1
        }
    }
    for (const count of Object.values(countByAssignment)) {
        if (count > 1) {
            totalEligiblePairs += (count * (count - 1)) / 2
        }
    }

    // Sort by highest similarity first
    pairs.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({
        pairs: pairs.slice(0, 50), // Cap at 50 results
        totalPossiblePairs: totalEligiblePairs,
        comparisonsMade,
        totalComparisons: comparisonsMade, // Backward compat with frontend
        threshold: 25,
    })
}
