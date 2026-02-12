"use client"

import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black">
            <WebGLShader />
            <div className="relative z-10 border border-[#27272a] p-2 w-full mx-auto max-w-md">
                <main className="relative border border-[#27272a] bg-black/50 backdrop-blur-md py-10 px-8 overflow-hidden rounded-xl">

                    <div className="mb-8 text-center">
                        <h1 className="mb-2 text-white text-3xl font-extrabold tracking-tighter">Student Login</h1>
                        <p className="text-white/60 text-sm">Enter your credentials to access the exam.</p>
                    </div>

                    <form className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider">Student ID</label>
                            <input
                                type="text"
                                defaultValue="student"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/80 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                defaultValue="123"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
                            />
                        </div>

                        <div className="pt-4 flex justify-center w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.setItem("clio_auth", "true");
                                    document.cookie = "clio_auth=true; path=/";
                                    window.location.href = "/editor";
                                }}
                                className="w-full rounded-full bg-white/10 border border-white/20 text-white py-3 px-6 text-lg font-semibold hover:bg-white/20 transition-colors"
                            >
                                Login
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-white/40">Don&apos;t have an ID? Contact your professor.</p>
                    </div>

                </main>
            </div>
        </div>
    )
}
