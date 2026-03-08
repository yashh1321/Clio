"use client"

import { useState } from "react"
import { WebGLShader } from "@/components/ui/web-gl-shader"

export default function LoginPage() {
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
                setLoading(false)
                return
            }

            // Server has set the HttpOnly cookie — redirect based on role
            if (data.role === "teacher") {
                window.location.href = "/dashboard"
            } else {
                window.location.href = "/editor"
            }
        } catch {
            setError("Network error — is the server running?")
            setLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
            <WebGLShader />
            <div className="relative z-10 border border-[#27272a] p-2 w-full mx-auto max-w-md">
                <main className="relative border border-[#27272a] bg-black/50 backdrop-blur-md py-10 px-8 overflow-hidden rounded-xl">

                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-white text-3xl font-extrabold tracking-tighter">Welcome to Clio</h1>
                        <p className="text-white/60 text-sm">Enter your credentials to continue.</p>
                    </div>

                    {/* Demo banner */}
                    <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-center">
                        <p className="text-xs text-yellow-400/90 font-medium">⚠️ Demo Mode — client-side auth for development only</p>
                        <p className="text-[10px] text-yellow-400/50 mt-1">
                            Student: <span className="font-mono">student / 123</span> &nbsp;·&nbsp;
                            Teacher: <span className="font-mono">teacher / 123</span>
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. student or teacher"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 text-center">{error}</p>
                        )}

                        <div className="pt-4 flex justify-center w-full">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-full bg-white/10 border border-white/20 text-white py-3 px-6 text-lg font-semibold hover:bg-white/20 transition-colors disabled:opacity-50"
                            >
                                {loading ? "Signing in…" : "Login"}
                            </button>
                        </div>
                    </form>

                </main>
            </div>
        </div>
    )
}
