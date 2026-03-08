import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"

// ── Demo credentials ───────────────────────────────────────────────────────────
// In production, replace with a database lookup + bcrypt comparison.
const VALID_USERS: Record<string, { password: string; role: string }> = {
    student: { password: "123", role: "student" },
    teacher: { password: "123", role: "teacher" },
}

// ── POST /api/auth/login ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { username, password } = body as { username?: string; password?: string }

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
        }

        const user = VALID_USERS[username.toLowerCase()]
        if (!user || user.password !== password) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Build signed token using the shared auth module
        const token = signToken({ username: username.toLowerCase(), role: user.role })

        // Set HttpOnly cookie
        const isProd = process.env.NODE_ENV === "production"
        const res = NextResponse.json({ role: user.role, username: username.toLowerCase() })
        res.cookies.set("clio_session", token, {
            httpOnly: true,
            secure: isProd,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 8, // 8 hours
        })

        return res
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
}
