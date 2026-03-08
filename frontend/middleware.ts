import { NextRequest, NextResponse } from "next/server"

// ── Role-Based Route Protection Middleware ──
// Centralizes authentication + role checking so individual API routes
// don't need to repeat boilerplate session verification.

// Routes that require authentication (and their allowed roles)
const PROTECTED_ROUTES: { pattern: RegExp; roles: string[] }[] = [
    // Admin routes
    { pattern: /^\/api\/admin/, roles: ["admin"] },
    // Teacher-only routes
    { pattern: /^\/api\/grades/, roles: ["teacher"] },
    { pattern: /^\/api\/analytics/, roles: ["teacher"] },
    { pattern: /^\/api\/similarity/, roles: ["teacher"] },
    { pattern: /^\/api\/export/, roles: ["teacher"] },
    { pattern: /^\/api\/classes/, roles: ["teacher"] },
    // Student-only routes
    { pattern: /^\/api\/submissions\/mine/, roles: ["student"] },
    { pattern: /^\/api\/notifications/, roles: ["student"] },
    { pattern: /^\/api\/student-analytics/, roles: ["student"] },
    // Both roles
    { pattern: /^\/api\/submissions$/, roles: ["teacher", "student"] },
    { pattern: /^\/api\/assignments/, roles: ["teacher", "student"] },
    { pattern: /^\/api\/drafts/, roles: ["teacher", "student"] },
    { pattern: /^\/api\/teachers/, roles: ["teacher", "student"] },
    { pattern: /^\/api\/profile/, roles: ["teacher", "student"] },
]

// Pages that require specific roles
const PROTECTED_PAGES: { pattern: RegExp; roles: string[]; redirectTo: string }[] = [
    { pattern: /^\/admin/, roles: ["admin"], redirectTo: "/login" },
    { pattern: /^\/dashboard/, roles: ["teacher"], redirectTo: "/login" },
    { pattern: /^\/assignments/, roles: ["teacher"], redirectTo: "/login" },
    { pattern: /^\/analytics/, roles: ["teacher"], redirectTo: "/login" },
    { pattern: /^\/similarity/, roles: ["teacher"], redirectTo: "/login" },
    { pattern: /^\/classes/, roles: ["teacher"], redirectTo: "/login" },
    { pattern: /^\/editor/, roles: ["student"], redirectTo: "/login" },
    { pattern: /^\/submissions/, roles: ["student"], redirectTo: "/login" },
    { pattern: /^\/student-dashboard/, roles: ["student"], redirectTo: "/login" },
    { pattern: /^\/student-analytics/, roles: ["student"], redirectTo: "/login" },
    { pattern: /^\/drafts/, roles: ["student"], redirectTo: "/login" },
]

// Routes that should NOT be intercepted
const PUBLIC_ROUTES = [
    /^\/api\/auth\//,
    /^\/api\/convert-docx-to-pdf/,
    /^\/api\/spotify/,
    /^\/login/,
    /^\/register/,
    /^\/_next/,
    /^\/favicon/,
]

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Skip public routes
    if (PUBLIC_ROUTES.some(r => r.test(pathname))) {
        return NextResponse.next()
    }

    // Get session token
    const token = req.cookies.get("clio_session")?.value

    // Decode JWT payload (without verifying signature) to check roles
    let userRole: string | null = null
    if (token) {
        try {
            const payloadBase64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const payloadJson = decodeURIComponent(atob(payloadBase64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(payloadJson)
            userRole = payload.role
        } catch { /* silent */ }
    }

    // Check protected API routes
    const apiRoute = PROTECTED_ROUTES.find(r => r.pattern.test(pathname))
    if (apiRoute) {
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (userRole && !apiRoute.roles.includes(userRole)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
        // The actual signature check still happens in each route handler for security.
    }

    // Check protected pages — redirect unauthenticated or unauthorized users
    const pageRoute = PROTECTED_PAGES.find(r => r.pattern.test(pathname))
    if (pageRoute) {
        if (!token || (userRole && !pageRoute.roles.includes(userRole))) {
            return NextResponse.redirect(new URL(pageRoute.redirectTo, req.url))
        }
    }

    // Add caching headers for static-ish data
    const res = NextResponse.next()

    // Cache teacher list (doesn't change often) - only on safe methods
    if (/^\/api\/teachers/.test(pathname) && (req.method === "GET" || req.method === "HEAD")) {
        res.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600")
    }
    // Cache assignment list (changes infrequently)
    if (/^\/api\/assignments/.test(pathname) && req.method === "GET") {
        res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120")
    }

    return res
}

export const config = {
    matcher: [
        // Match all paths except static files
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
}
