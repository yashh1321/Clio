import crypto from "crypto"

/**
 * Returns the AUTH_SECRET used for signing/verifying session tokens.
 *
 * - In production: throws if AUTH_SECRET env var is missing (never falls back).
 * - In development: uses a dev-only default so the app works out of the box.
 */
export function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET

    if (secret) return secret

    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "[Clio] AUTH_SECRET environment variable is required in production. " +
            "Set it in your deployment config to a strong random string."
        )
    }

    // Dev-only fallback — never used in production
    return "clio-dev-secret-DO-NOT-USE-IN-PROD"
}

/**
 * Sign a payload into a `data.signature` token string.
 */
export function signToken(payload: object): string {
    const secret = getAuthSecret()
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url")
    return `${data}.${sig}`
}

/**
 * Verify and decode a `data.signature` token string.
 * Uses timing-safe comparison to prevent timing attacks.
 * Returns the decoded payload or null if invalid.
 */
export function verifyToken(token: string): { username: string; role: string } | null {
    const secret = getAuthSecret()
    const parts = token.split(".")
    if (parts.length !== 2) return null

    const [data, sig] = parts

    // Compute expected signature
    const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url")

    // Timing-safe comparison: convert to Buffers and compare
    let sigBuf: Buffer
    try {
        sigBuf = Buffer.from(sig, "base64url")
    } catch {
        return null // invalid base64url input
    }

    const expectedBuf = Buffer.from(expected, "base64url")

    // Length check — timingSafeEqual requires equal-length buffers
    if (sigBuf.length !== expectedBuf.length) return null

    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

    try {
        return JSON.parse(Buffer.from(data, "base64url").toString())
    } catch {
        return null
    }
}
