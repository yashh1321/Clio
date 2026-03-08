"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"


import { WebGLShader } from "@/components/ui/web-gl-shader"


export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || "Login failed")
                return
            }

            // Store auth info for client-side checks
            localStorage.setItem("clio_auth", JSON.stringify({
                username: data.username,
                role: data.role,
            }))

            // Use Next.js router for SPA navigation (preserves cookies through proxies)
            if (data.role === "admin") {
                router.push("/admin")
            } else if (data.role === "teacher") {
                router.push("/dashboard")
            } else {
                router.push("/editor")
            }
        } catch {
            setError("Network error — is the server running?")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-[125vh] w-full flex-col items-center justify-center overflow-hidden bg-black">
            {/* Background Animation */}
            <WebGLShader />

            <div className="relative z-10 border border-[#27272a] p-2 w-full mx-auto max-w-lg">
                <main className="relative border border-[#27272a] bg-black/50 backdrop-blur-md py-14 px-10 overflow-hidden rounded-xl">

                    <div className="mb-10 text-center">
                        <h1 className="mb-3 text-white text-4xl font-extrabold tracking-tighter">Welcome to Clio</h1>
                        <p className="text-white/60 text-base">Enter your credentials to continue.</p>
                    </div>



                    <form id="login-form" className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-xs font-medium text-white/80 uppercase tracking-wider">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. student or teacher"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-xs font-medium text-white/80 uppercase tracking-wider">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        {error && (
                            <p id="login-error" className="text-sm text-red-400 text-center">{error}</p>
                        )}

                        <div className="pt-4 flex justify-center w-full">
                            <button
                                id="login-button"
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-full bg-white/10 border border-white/20 text-white py-3 px-6 text-lg font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
                            >
                                {loading ? "Signing in…" : "Login"}
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-xs text-white/30 mt-5">
                        Don&apos;t have an account?{" "}
                        <a href="/register" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
                            Register
                        </a>
                    </p>

                </main>
            </div>
        </div>
    )
}
