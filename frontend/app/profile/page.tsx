"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    User,
    Mail,
    BookOpen,
    GraduationCap,
    ArrowLeft,
    Save,
    CheckCircle,
    XCircle,
} from "lucide-react"
import { WebGLShader } from "@/components/ui/web-gl-shader"

interface ProfileData {
    id: string
    username: string
    role: "student" | "teacher"
    full_name: string
    email: string
    class?: string
    course?: string
    created_at: string
}

export default function ProfilePage() {
    const router = useRouter()
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Form state
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [studentClass, setStudentClass] = useState("")
    const [course, setCourse] = useState("")

    // Load profile on mount
    useEffect(() => {
        async function loadProfile() {
            try {
                // Verify session first
                const sessionRes = await fetch("/api/auth/session", {
                    cache: "no-store",
                    credentials: "include",
                })
                if (!sessionRes.ok) {
                    router.replace("/login")
                    return
                }
                const sessionData = await sessionRes.json()
                if (!sessionData.authenticated) {
                    router.replace("/login")
                    return
                }

                // Load profile
                const profileRes = await fetch("/api/profile", {
                    credentials: "include",
                })
                if (!profileRes.ok) {
                    setError("Failed to load profile")
                    return
                }
                const data: ProfileData = await profileRes.json()
                setProfile(data)
                setFullName(data.full_name)
                setEmail(data.email)
                if (data.role === "student") {
                    setStudentClass(data.class || "")
                    setCourse(data.course || "")
                }
            } catch {
                setError("Network error")
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [router])

    const handleSave = async () => {
        if (!profile) return
        setSaving(true)
        setError(null)
        setSuccess(false)

        try {
            const body: Record<string, string> = {
                full_name: fullName,
                email,
            }
            if (profile.role === "student") {
                body.class = studentClass
                body.course = course
            }

            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                credentials: "include",
            })

            const data = await res.json()
            if (!res.ok) {
                setError(data.error || "Failed to save")
                return
            }

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch {
            setError("Network error")
        } finally {
            setSaving(false)
        }
    }

    const handleBack = () => {
        if (profile?.role === "teacher") {
            router.push("/dashboard")
        } else {
            router.push("/editor")
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[125vh] items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
        )
    }

    const isStudent = profile?.role === "student"

    return (
        <div className="relative min-h-[125vh] w-full bg-black text-white font-sans">
            {/* Background */}
            <div className="fixed inset-0 z-0 opacity-30">
                <WebGLShader />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {isStudent ? "Editor" : "Dashboard"}
                        </span>
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-tight">
                                My Profile
                            </span>
                            <span className="text-xs text-white/40">
                                {isStudent ? "Student Account" : "Teacher Account"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex justify-center py-12 px-4">
                <div className="w-full max-w-2xl space-y-8">
                    {/* Profile Card */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden">
                        {/* Card Header */}
                        <div className="relative px-8 pt-8 pb-6 border-b border-white/5">
                            <div className="flex items-center gap-5">
                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                    <span className="text-3xl font-bold text-white">
                                        {(fullName || profile?.username || "?").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">
                                        {fullName || profile?.username}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${isStudent
                                                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                                : "border-purple-500/30 bg-purple-500/10 text-purple-400"
                                            }`}>
                                            {isStudent ? (
                                                <BookOpen className="h-3 w-3" />
                                            ) : (
                                                <GraduationCap className="h-3 w-3" />
                                            )}
                                            {isStudent ? "Student" : "Teacher"}
                                        </span>
                                        <span className="text-xs text-white/30">
                                            @{profile?.username}
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/30 mt-1.5">
                                        Member since{" "}
                                        {profile?.created_at
                                            ? new Date(profile.created_at).toLocaleDateString("en-US", {
                                                month: "long",
                                                year: "numeric",
                                            })
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="px-8 py-8 space-y-6">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                    <User className="h-3.5 w-3.5" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    maxLength={200}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                    <Mail className="h-3.5 w-3.5" />
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    maxLength={254}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                />
                            </div>

                            {/* Student-only fields */}
                            {isStudent && (
                                <>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                            <GraduationCap className="h-3.5 w-3.5" />
                                            Class
                                        </label>
                                        <input
                                            type="text"
                                            value={studentClass}
                                            onChange={(e) => setStudentClass(e.target.value)}
                                            placeholder="e.g. 12-A, CSE-2024"
                                            maxLength={100}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            Course
                                        </label>
                                        <input
                                            type="text"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            placeholder="e.g. Computer Science, Philosophy"
                                            maxLength={200}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Status messages */}
                            {error && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                    <span className="text-sm text-red-400">{error}</span>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 animate-in fade-in duration-300">
                                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                                    <span className="text-sm text-green-400">
                                        Profile updated successfully!
                                    </span>
                                </div>
                            )}

                            {/* Save Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-sm font-semibold text-white hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30"
                                >
                                    {saving ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    {saving ? "Saving…" : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md px-8 py-6">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4">
                            Account Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-white/40 text-xs">Username</p>
                                <p className="text-white/80 font-mono mt-0.5">
                                    {profile?.username}
                                </p>
                            </div>
                            <div>
                                <p className="text-white/40 text-xs">Role</p>
                                <p className="text-white/80 capitalize mt-0.5">
                                    {profile?.role}
                                </p>
                            </div>
                            <div>
                                <p className="text-white/40 text-xs">User ID</p>
                                <p className="text-white/40 font-mono text-xs mt-0.5 truncate">
                                    {profile?.id}
                                </p>
                            </div>
                            <div>
                                <p className="text-white/40 text-xs">Joined</p>
                                <p className="text-white/80 mt-0.5">
                                    {profile?.created_at
                                        ? new Date(profile.created_at).toLocaleDateString(
                                            "en-US",
                                            {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            }
                                        )
                                        : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
