import { NextResponse } from "next/server"

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
export async function POST() {
    const res = NextResponse.json({ ok: true })
    res.cookies.set("clio_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0, // expire immediately
    })
    return res
}
