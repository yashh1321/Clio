import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

// ── POST /api/auth/login ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { username, password } = body as { username?: string; password?: string }

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
        }

        // Secure Database authentication check
        const { data: user, error } = await supabase
            .from('profiles')
            .select('password, role')
            .eq('username', username.toLowerCase())
            .single()

        if (error || !user || !user.password) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
        }

        // Timing-safe bcrypt comparison
        const passwordMatch = await bcrypt.compare(password, user.password)
        if (!passwordMatch) {
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
