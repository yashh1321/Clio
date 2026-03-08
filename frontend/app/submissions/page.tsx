"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    FileText,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Clock,
    Keyboard,
    Clipboard,
    BarChart3,
    Star,
    ChevronRight,
    ChevronDown,
    ArrowLeft,
    GraduationCap,
    MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebGLShader } from "@/components/ui/web-gl-shader"

// ── Types ──
interface Grade {
    id: string
    score: number
    feedback: string
    graded_at: string
}

interface Submission {
    id: string
    assignment_title: string
    content: string
    wpm: number
    paste_count: number
    integrity_score: number
    timestamp: string
    teacher_name: string | null
    grade: Grade | null
}

// ── Helpers ──
function scoreColor(score: number) {
    if (score >= 80) return "text-green-400"
    if (score >= 50) return "text-yellow-400"
    return "text-red-400"
}

function scoreBadge(score: number) {
    if (score >= 80) return { icon: CheckCircle, label: "High Integrity", cls: "text-green-400 bg-green-500/10 border-green-500/20" }
    if (score >= 50) return { icon: AlertTriangle, label: "Needs Review", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" }
    return { icon: XCircle, label: "Suspicious", cls: "text-red-400 bg-red-500/10 border-red-500/20" }
}

function formatDate(ts: string) {
    if (!ts) return "—"
    const d = new Date(ts)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " · " +
        d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function wordCount(text: string | null | undefined) {
    if (!text) return 0
    return text.trim().split(/\s+/).filter(Boolean).length
}

// ── Student Submissions Page ──
export default function SubmissionsPage() {
    const router = useRouter()
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [sanitizedContents, setSanitizedContents] = useState<Record<string, string>>({})

    // ── Auth check ──
    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch("/api/auth/session", { credentials: "include" })
                if (!res.ok) { router.replace("/login"); return }
                const data = await res.json()
                if (!data.authenticated || data.role !== "student") {
                    router.replace("/login")
                }
            } catch {
                router.replace("/login")
            }
        }
        checkAuth()
    }, [router])

    // ── Fetch submissions ──
    useEffect(() => {
        async function load() {
            try {
                setLoading(true)
                const res = await fetch("/api/submissions/mine", { credentials: "include" })
                if (!res.ok) throw new Error(`Server responded ${res.status}`)
                const data: Submission[] = await res.json()
                setSubmissions(data)
            } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to load submissions")
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // ── Sanitize content when expanding ──
    useEffect(() => {
        if (!expanded) return
        const sub = submissions.find(s => s.id === expanded)
        if (!sub || sanitizedContents[sub.id]) return

        import("dompurify").then((mod) => {
            const DOMPurify = mod.default
            setSanitizedContents(prev => ({
                ...prev,
                [sub.id]: DOMPurify.sanitize(sub.content || "<span class='text-white/30 italic'>No content</span>")
            }))
        })
    }, [expanded, submissions, sanitizedContents])

    // ── Stats ──
    const totalSubmissions = submissions.length
    const gradedCount = submissions.filter(s => s.grade).length
    const avgGrade = gradedCount > 0
        ? Math.round(submissions.filter(s => s.grade).reduce((a, s) => a + (s.grade?.score || 0), 0) / gradedCount)
        : null
    const avgIntegrity = totalSubmissions > 0
        ? Math.round(submissions.reduce((a, s) => a + s.integrity_score, 0) / totalSubmissions)
        : 0

    return (
        <div className="relative min-h-[125vh] w-full bg-background text-foreground font-sans">
            {/* Background */}
            <div className="fixed inset-0 z-0 opacity-40">
                <WebGLShader />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/editor")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Editor</span>
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-tight">My Submissions</span>
                            <span className="text-xs text-white/40">View your submitted essays &amp; grades</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/profile")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">Profile</Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/editor")} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">Write New</Button>
                </div>
            </header>

            {/* Main */}
            <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center">
                        <FileText className="mx-auto h-5 w-5 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{totalSubmissions}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Total Submissions</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center">
                        <Star className="mx-auto h-5 w-5 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{gradedCount}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Graded</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center">
                        <GraduationCap className="mx-auto h-5 w-5 text-purple-400 mb-2" />
                        <p className={`text-2xl font-bold ${avgGrade !== null ? scoreColor(avgGrade) : 'text-white/30'}`}>
                            {avgGrade !== null ? avgGrade : "—"}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg Grade</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-center">
                        <CheckCircle className="mx-auto h-5 w-5 text-green-400 mb-2" />
                        <p className={`text-2xl font-bold ${scoreColor(avgIntegrity)}`}>{avgIntegrity}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg Integrity</p>
                    </div>
                </div>

                {/* Submissions List */}
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <XCircle className="h-10 w-10 text-red-400/60" />
                        <p className="text-sm text-red-400/80">{error}</p>
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 gap-4">
                        <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                            <FileText className="h-10 w-10 text-white/20" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-white/50 font-medium">No submissions yet</p>
                            <p className="text-xs text-white/30 mt-1">Head to the editor to write and submit your first essay</p>
                        </div>
                        <Button onClick={() => router.push("/editor")} className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full mt-2">
                            Go to Editor
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map((sub) => {
                            const badge = scoreBadge(sub.integrity_score)
                            const Icon = badge.icon
                            const isExpanded = expanded === sub.id

                            return (
                                <div key={sub.id} className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all duration-300">
                                    {/* Submission Header */}
                                    <button
                                        onClick={() => setExpanded(isExpanded ? null : sub.id)}
                                        className="w-full text-left px-6 py-4 hover:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {sub.assignment_title || "Untitled"}
                                                    </p>
                                                    {/* Grade badge or pending */}
                                                    {sub.grade ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-400">
                                                            <Star className="h-3 w-3" />
                                                            {sub.grade.score}/100
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/40">
                                                            <Clock className="h-3 w-3" />
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-[10px] text-white/30">{formatDate(sub.timestamp)}</p>
                                                    {sub.teacher_name && (
                                                        <p className="text-[10px] text-white/30">
                                                            Submitted to <span className="text-white/50">{sub.teacher_name}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                                                    <Icon className="h-3 w-3" />{sub.integrity_score}
                                                </span>
                                                {isExpanded
                                                    ? <ChevronDown className="h-4 w-4 text-white/30" />
                                                    : <ChevronRight className="h-4 w-4 text-white/30" />
                                                }
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Detail */}
                                    {isExpanded && (
                                        <div className="border-t border-white/5 px-6 py-5 space-y-5 animate-in slide-in-from-top-2 duration-300">
                                            {/* Metrics Row */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                    <p className="text-[10px] text-white/40 flex items-center gap-1"><Keyboard className="h-3 w-3" />WPM</p>
                                                    <p className="text-lg font-bold text-white mt-1">{sub.wpm}</p>
                                                </div>
                                                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                    <p className="text-[10px] text-white/40 flex items-center gap-1"><Clipboard className="h-3 w-3" />Pastes</p>
                                                    <p className={`text-lg font-bold mt-1 ${sub.paste_count > 0 ? 'text-yellow-500' : 'text-white'}`}>{sub.paste_count}</p>
                                                </div>
                                                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                    <p className="text-[10px] text-white/40 flex items-center gap-1"><BarChart3 className="h-3 w-3" />Words</p>
                                                    <p className="text-lg font-bold text-white mt-1">{wordCount(sub.content)}</p>
                                                </div>
                                                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                                    <p className="text-[10px] text-white/40 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Integrity</p>
                                                    <p className={`text-lg font-bold mt-1 ${scoreColor(sub.integrity_score)}`}>{sub.integrity_score}/100</p>
                                                </div>
                                            </div>

                                            {/* Teacher Grade & Feedback */}
                                            {sub.grade && (
                                                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-5">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Star className="h-5 w-5 text-purple-400" />
                                                        <div>
                                                            <p className="text-sm font-bold text-purple-400">Grade: {sub.grade.score}/100</p>
                                                            <p className="text-[10px] text-purple-400/50">Graded {formatDate(sub.grade.graded_at)}</p>
                                                        </div>
                                                    </div>
                                                    {sub.grade.feedback && (
                                                        <div className="border-t border-purple-500/10 pt-3 mt-2">
                                                            <p className="text-[10px] text-purple-400/50 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                                <MessageSquare className="h-3 w-3" /> Teacher Feedback
                                                            </p>
                                                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{sub.grade.feedback}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Essay Content */}
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <FileText className="h-3 w-3" /> Essay Content
                                                </p>
                                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 max-h-80 overflow-y-auto">
                                                    {sanitizedContents[sub.id] ? (
                                                        <div
                                                            className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap break-words prose prose-invert max-w-none"
                                                            dangerouslySetInnerHTML={{ __html: sanitizedContents[sub.id] }}
                                                        />
                                                    ) : (
                                                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap break-words">
                                                            {sub.content || "No content available"}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
