import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"
import DOMPurify from "isomorphic-dompurify"

// ── POST /api/auth/register — Create a new student or teacher account ──
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { username, password, full_name, email, role, course, student_class } = body as {
            username?: string
            password?: string
            full_name?: string
            email?: string
            role?: string
            course?: string
            student_class?: string
        }

        // ── Validation ──
        if (!username || !password || !email || !role) {
            return NextResponse.json(
                { error: "Username, password, email, and role are required" },
                { status: 400 }
            )
        }

        const cleanUsername = username.toLowerCase().trim()
        if (cleanUsername.length < 3 || cleanUsername.length > 50) {
            return NextResponse.json({ error: "Username must be 3–50 characters" }, { status: 400 })
        }
        if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
            return NextResponse.json({ error: "Username can only contain letters, numbers, dots, hyphens, and underscores" }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
        }
        if (password.length > 72) {
            return NextResponse.json({ error: "Password must be at most 72 characters" }, { status: 400 })
        }

        const cleanEmail = email.toLowerCase().trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
        }

        if (role !== "student" && role !== "teacher") {
            return NextResponse.json({ error: "Role must be 'student' or 'teacher'" }, { status: 400 })
        }

        // ── Check for duplicate username ──
        const { data: existing, error: existingErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", cleanUsername)
            .maybeSingle()

        if (existingErr) {
            return NextResponse.json({ error: existingErr.message }, { status: 500 })
        }
        if (existing) {
            return NextResponse.json({ error: "Username already taken" }, { status: 409 })
        }

        // ── Check for duplicate email ──
        const { data: existingEmail, error: emailErr } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", cleanEmail)
            .maybeSingle()

        if (emailErr) {
            return NextResponse.json({ error: emailErr.message }, { status: 500 })
        }
        if (existingEmail) {
            return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
        }

        // ── Sanitize inputs ──
        const safeName = DOMPurify.sanitize((full_name || "").trim().slice(0, 200), { ALLOWED_TAGS: [] })
        const safeCourse = DOMPurify.sanitize((course || "").trim().slice(0, 200), { ALLOWED_TAGS: [] })
        const safeClass = DOMPurify.sanitize((student_class || "").trim().slice(0, 100), { ALLOWED_TAGS: [] })

        // ── Hash password ──
        const hashedPassword = await bcrypt.hash(password, 10)

        // ── Insert profile ──
        const insertData: Record<string, unknown> = {
            username: cleanUsername,
            password: hashedPassword,
            email: cleanEmail,
            role,
            full_name: safeName,
        }

        if (role === "student") {
            if (safeCourse) insertData.course = safeCourse
            if (safeClass) insertData.class = safeClass
        }

        const { error: insertErr } = await supabase
            .from("profiles")
            .insert(insertData)

        if (insertErr) {
            console.error("[Register] Insert error:", insertErr.message)
            return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
        }

        return NextResponse.json({ message: "Account created successfully" }, { status: 201 })
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
}
