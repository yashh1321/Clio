"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "../../components/ui/web-gl-shader"
import { Button } from "../../components/ui/button"
import ReplayTimeline, { type ReplaySnapshot } from "../../components/editor/ReplayTimeline"
import {
    Loader2,
    CheckCircle,
    AlertTriangle,
    XCircle,
    LogOut,
    FileText,
    Clock,
    Keyboard,
    Clipboard,
    ChevronRight,
    X,
    Search,
    BarChart3,
    Users,
    ShieldCheck,
    Send,
    Star,
    History,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────
interface Grade {
    id: string
    score: number
    feedback: string
    graded_at: string
}

interface Submission {
    id: string
    student_id: string
    assignment_title: string
    content: string
    wpm: number
    paste_count: number
    integrity_score: number
    timestamp: string
    replay_snapshots: ReplaySnapshot[]
    grade: Grade | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
    if (score >= 80) return "text-green-400"
    if (score >= 50) return "text-yellow-400"
    return "text-red-400"
}

function scoreBadge(score: number) {
    if (score >= 80)
        return { icon: CheckCircle, label: "High Integrity", cls: "text-green-400 bg-green-500/10 border-green-500/20" }
    if (score >= 50)
        return { icon: AlertTriangle, label: "Needs Review", cls: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" }
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

// ── Dashboard Page ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const router = useRouter()
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selected, setSelected] = useState<Submission | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [sessionChecked, setSessionChecked] = useState(false)
    const [sanitizedContent, setSanitizedContent] = useState("")

    // ── Grading state ──
    const [gradeScore, setGradeScore] = useState("")
    const [gradeFeedback, setGradeFeedback] = useState("")
    const [grading, setGrading] = useState(false)
    const [gradeSuccess, setGradeSuccess] = useState(false)
    const [gradeError, setGradeError] = useState<string | null>(null)

    // ── Replay state ──
    const [showReplay, setShowReplay] = useState(false)

    // ── Server-side session check ──
    useEffect(() => {
        async function checkSession() {
            try {
                const res = await fetch("/api/auth/session")
                if (!res.ok) { router.replace("/login"); return }
                const data = await res.json()
                if (!data.authenticated || data.role !== "teacher") { router.replace("/login"); return }
                setSessionChecked(true)
            } catch { router.replace("/login") }
        }
        checkSession()
    }, [router])

    // ── Fetch submissions from Supabase-backed API ──
    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/submissions")
            if (!res.ok) throw new Error(`Server responded ${res.status}`)
            const data: Submission[] = await res.json()
            setSubmissions(data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load submissions")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (sessionChecked) fetchSubmissions()
    }, [sessionChecked, fetchSubmissions])

    // ── SSR-safe DOMPurify ──
    useEffect(() => {
        if (!selected) { setSanitizedContent(""); return }
        import("dompurify").then((mod) => {
            const DOMPurify = mod.default
            const raw = selected.content || "<span class='text-white/30 italic'>No content available</span>"
            setSanitizedContent(DOMPurify.sanitize(raw))
        })
    }, [selected])

    // ── Pre-fill grade form when selection changes ──
    useEffect(() => {
        if (selected?.grade) {
            setGradeScore(String(selected.grade.score))
            setGradeFeedback(selected.grade.feedback)
        } else {
            setGradeScore("")
            setGradeFeedback("")
        }
        setGradeSuccess(false)
        setShowReplay(false)
    }, [selected])

    // ── Logout ──
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        router.push("/login")
    }

    // ── Submit grade ──
    const handleGrade = async () => {
        if (!selected) return
        const numScore = parseInt(gradeScore, 10)
        if (isNaN(numScore) || numScore < 0 || numScore > 100) return

        setGrading(true)
        setGradeSuccess(false)
        setGradeError(null)
        try {
            const res = await fetch("/api/grades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submission_id: selected.id,
                    score: numScore,
                    feedback: gradeFeedback,
                }),
            })
            if (!res.ok) throw new Error("Failed to submit grade")
            const data = await res.json()

            setSelected((prev) => prev ? { ...prev, grade: data.grade } : prev)
            setSubmissions((prev) =>
                prev.map((s) => s.id === selected.id ? { ...s, grade: data.grade } : s)
            )
            setGradeSuccess(true)
            setGradeError(null)
            setTimeout(() => setGradeSuccess(false), 3000)
        } catch (e) {
            const msg = e instanceof Error ? e.message : "An unexpected error occurred"
            console.error("Grading error:", e)
            setGradeError(msg)
        } finally {
            setGrading(false)
        }
    }

    // ── Filtered list ──
    const filtered = submissions.filter((s) => {
        const q = searchQuery.toLowerCase()
        return s.student_id.toLowerCase().includes(q) || s.assignment_title.toLowerCase().includes(q)
    })

    // ── Aggregate stats ──
    const totalSubmissions = submissions.length
    const avgScore = totalSubmissions > 0
        ? Math.round(submissions.reduce((a, s) => a + s.integrity_score, 0) / totalSubmissions)
        : 0
    const flagged = submissions.filter((s) => s.integrity_score < 50).length

    if (!sessionChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
            </div>
        )
    }

    return (
        <div className="relative min-h-screen w-full bg-black text-white overflow-hidden font-sans">
            <div className="absolute inset-0 opacity-30 pointer-events-none"><WebGLShader /></div>

            {/* ─── Header ─── */}
            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-tight">Clio — Teacher Dashboard</span>
                        <span className="text-xs text-white/40">Review submissions & grade essays</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={fetchSubmissions} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">Refresh</Button>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">
                        <LogOut className="mr-1 h-3 w-3" />Logout
                    </Button>
                </div>
            </header>

            {/* ─── Main ─── */}
            <main className="relative z-10 flex h-[calc(100vh-73px)]">
                {/* ── Left: Submission List ── */}
                <div className="w-[420px] border-r border-white/10 bg-black/20 backdrop-blur-md flex flex-col min-h-0">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 p-4 border-b border-white/10">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                            <Users className="mx-auto h-4 w-4 text-blue-400 mb-1" />
                            <p className="text-lg font-bold text-white">{totalSubmissions}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Total</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                            <ShieldCheck className="mx-auto h-4 w-4 text-green-400 mb-1" />
                            <p className={`text-lg font-bold ${scoreColor(avgScore)}`}>{avgScore}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Avg Score</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                            <AlertTriangle className="mx-auto h-4 w-4 text-red-400 mb-1" />
                            <p className="text-lg font-bold text-red-400">{flagged}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Flagged</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-4 pt-3 pb-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                            <input type="text" placeholder="Search by student or assignment…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors" />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto glass-scroll px-3 pb-3">
                        {loading ? (
                            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-3">
                                <XCircle className="h-8 w-8 text-red-400/60" />
                                <p className="text-xs text-red-400/80 text-center max-w-[260px]">{error}</p>
                                <Button variant="ghost" size="sm" onClick={fetchSubmissions} className="text-white/60 hover:text-white hover:bg-white/10 h-7 px-3 text-xs">Retry</Button>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2">
                                <FileText className="h-8 w-8 text-white/20" />
                                <p className="text-xs text-white/30">{searchQuery ? "No matching submissions" : "No submissions yet"}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 pt-1">
                                {filtered.map((sub) => {
                                    const badge = scoreBadge(sub.integrity_score)
                                    const Icon = badge.icon
                                    const isActive = selected?.id === sub.id
                                    return (
                                        <button key={sub.id} onClick={() => setSelected(sub)}
                                            className={`w-full text-left rounded-xl border p-4 transition-all duration-200 group ${isActive ? "border-blue-500/40 bg-blue-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"}`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-white truncate">{sub.assignment_title || "Untitled"}</p>
                                                        {sub.grade && <Star className="h-3 w-3 text-yellow-400 shrink-0" />}
                                                    </div>
                                                    <p className="text-xs text-white/40 mt-0.5">
                                                        {sub.student_id} · {formatDate(sub.timestamp)}
                                                        {sub.replay_snapshots?.length > 0 && (
                                                            <span className="ml-1.5 text-purple-400/60">● {sub.replay_snapshots.length} snapshots</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>
                                                        <Icon className="h-3 w-3" />{sub.integrity_score}
                                                    </span>
                                                    <ChevronRight className={`h-4 w-4 transition-colors ${isActive ? "text-blue-400" : "text-white/20 group-hover:text-white/40"}`} />
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Detail Panel ── */}
                <div className="flex-1 overflow-hidden flex flex-col bg-black/20 backdrop-blur-md border-l border-white/10 min-h-0">
                    {selected ? (
                        <>
                            {/* Detail Header */}
                            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                                <div>
                                    <h2 className="text-lg font-bold text-white">{selected.assignment_title || "Untitled"}</h2>
                                    <p className="text-xs text-white/40 mt-0.5">
                                        Student: <span className="text-white/60 font-medium">{selected.student_id}</span> · Submitted {formatDate(selected.timestamp)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* ── Watch Replay Button ── */}
                                    {selected.replay_snapshots?.length > 0 && (
                                        <button
                                            onClick={() => setShowReplay(true)}
                                            className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
                                        >
                                            <History className="h-3.5 w-3.5" />
                                            Watch Replay
                                            <span className="text-purple-400/50 font-mono ml-0.5">{selected.replay_snapshots.length}</span>
                                        </button>
                                    )}
                                    <button onClick={() => setSelected(null)} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                                        <X className="h-4 w-4 text-white/40" />
                                    </button>
                                </div>
                            </div>

                            {/* Detail Body */}
                            <div className="flex-1 overflow-y-auto glass-scroll">
                                <div className="flex h-full">
                                    {/* Essay Content + Grading */}
                                    <div className="flex-1 p-6 overflow-y-auto glass-scroll min-h-0 space-y-6">
                                        {/* Essay */}
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5" />Essay Content
                                            </h3>
                                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                                                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap break-words"
                                                    dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                                            </div>
                                        </div>

                                        {/* ── Grading Panel ── */}
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-4 flex items-center gap-2">
                                                <Star className="h-3.5 w-3.5 text-yellow-400" />
                                                {selected.grade ? "Update Grade" : "Grade This Submission"}
                                            </h3>

                                            {selected.grade && (
                                                <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-400" />
                                                        <span className="text-sm text-green-400 font-semibold">
                                                            Currently graded: {selected.grade.score}/100
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-green-400/60 mt-1">
                                                        Graded {formatDate(selected.grade.graded_at)}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Score (0–100)</label>
                                                    <input type="number" min={0} max={100} value={gradeScore}
                                                        onChange={(e) => setGradeScore(e.target.value)}
                                                        placeholder="e.g. 85"
                                                        className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg font-bold placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors" />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Feedback</label>
                                                    <textarea value={gradeFeedback}
                                                        onChange={(e) => setGradeFeedback(e.target.value)}
                                                        placeholder="Write feedback for the student…"
                                                        rows={4}
                                                        className="mt-1.5 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors resize-none" />
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button onClick={handleGrade} disabled={grading || !gradeScore}
                                                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20">
                                                        {grading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                        {grading ? "Submitting…" : selected.grade ? "Update Grade" : "Submit Grade"}
                                                    </button>
                                                    {gradeSuccess && (
                                                        <span className="text-sm text-green-400 flex items-center gap-1 animate-pulse">
                                                            <CheckCircle className="h-4 w-4" /> Saved!
                                                        </span>
                                                    )}
                                                    {gradeError && (
                                                        <span className="text-sm text-red-400 flex items-center gap-1">
                                                            <XCircle className="h-4 w-4" /> {gradeError}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Analytics Sidebar */}
                                    <aside className="w-72 border-l border-white/10 bg-black/20 p-5 backdrop-blur-md hidden lg:block overflow-y-auto glass-scroll">
                                        <h3 className="mb-5 text-xs font-bold uppercase tracking-wider text-white/40">Integrity Report</h3>

                                        <div className="space-y-4">
                                            {/* Score */}
                                            {(() => {
                                                const badge = scoreBadge(selected.integrity_score)
                                                const Icon = badge.icon
                                                return (
                                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                        <p className="text-xs text-white/50">Integrity Score</p>
                                                        <div className="mt-2 flex items-baseline gap-2">
                                                            <span className={`text-4xl font-bold ${scoreColor(selected.integrity_score)}`}>{selected.integrity_score}</span>
                                                            <span className="text-sm text-white/40">/ 100</span>
                                                        </div>
                                                        <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${selected.integrity_score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" : selected.integrity_score >= 50 ? "bg-gradient-to-r from-yellow-500 to-amber-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`}
                                                                style={{ width: `${selected.integrity_score}%` }} />
                                                        </div>
                                                        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${badge.cls}`}>
                                                            <Icon className="h-3.5 w-3.5" />{badge.label}
                                                        </div>
                                                    </div>
                                                )
                                            })()}

                                            {/* WPM */}
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-xs text-white/50 flex items-center gap-1.5"><Keyboard className="h-3 w-3" />Typing Speed</p>
                                                <div className="mt-1 flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold text-white">{selected.wpm}</span>
                                                    <span className="text-sm text-white/50">WPM</span>
                                                </div>
                                                {selected.wpm > 100 && <p className="mt-2 text-xs text-red-400">⚠️ Suspiciously high speed</p>}
                                            </div>

                                            {/* Paste Count */}
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-xs text-white/50 flex items-center gap-1.5"><Clipboard className="h-3 w-3" />Paste Events</p>
                                                <div className="mt-1 flex items-baseline gap-1">
                                                    <span className={`text-3xl font-bold ${selected.paste_count > 0 ? "text-yellow-500" : "text-white"}`}>{selected.paste_count}</span>
                                                    <span className="text-sm text-white/50">detected</span>
                                                </div>
                                                {selected.paste_count > 2 && <p className="mt-2 text-xs text-yellow-400">⚠️ High paste rate detected</p>}
                                            </div>

                                            {/* Word Count */}
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-xs text-white/50 flex items-center gap-1.5"><BarChart3 className="h-3 w-3" />Word Count</p>
                                                <div className="mt-1 flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold text-white">{wordCount(selected.content)}</span>
                                                    <span className="text-sm text-white/50">words</span>
                                                </div>
                                            </div>

                                            {/* Timestamp */}
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-xs text-white/50 flex items-center gap-1.5"><Clock className="h-3 w-3" />Submitted</p>
                                                <p className="mt-1 text-sm text-white/80 font-medium">{formatDate(selected.timestamp)}</p>
                                            </div>

                                            {/* Analysis Summary */}
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                <p className="text-xs text-white/50 mb-3">🧠 Analysis</p>
                                                <div className="space-y-2 text-xs">
                                                    {selected.paste_count > 2 ? (
                                                        <p className="text-red-400">❌ Large blocks of text were inserted instantly.</p>
                                                    ) : (
                                                        <p className="text-green-400">✅ Paste rate within normal limits.</p>
                                                    )}
                                                    {selected.wpm > 100 ? (
                                                        <p className="text-red-400">❌ Superhuman typing speed detected.</p>
                                                    ) : (
                                                        <p className="text-green-400">✅ Natural typing speed.</p>
                                                    )}
                                                    {selected.integrity_score >= 80 ? (
                                                        <p className="text-green-400">✅ Overall integrity looks good.</p>
                                                    ) : selected.integrity_score >= 50 ? (
                                                        <p className="text-yellow-400">⚠️ Some anomalies — manual review recommended.</p>
                                                    ) : (
                                                        <p className="text-red-400">❌ Multiple integrity flags raised.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Teacher Grade (if exists) */}
                                            {selected.grade && (
                                                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                                                    <p className="text-xs text-purple-400/70 mb-2 flex items-center gap-1.5">
                                                        <Star className="h-3 w-3" />Teacher Grade
                                                    </p>
                                                    <p className="text-3xl font-bold text-purple-400">{selected.grade.score}<span className="text-sm text-purple-400/50"> / 100</span></p>
                                                    {selected.grade.feedback && (
                                                        <p className="mt-2 text-xs text-white/60 border-t border-white/5 pt-2">{selected.grade.feedback}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Replay Info Card */}
                                            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                                                <p className="text-xs text-purple-400/70 mb-2 flex items-center gap-1.5">
                                                    <History className="h-3 w-3" />Writing Session
                                                </p>
                                                {selected.replay_snapshots?.length > 0 ? (
                                                    <>
                                                        <p className="text-sm text-white/80 font-mono">{selected.replay_snapshots.length} snapshots</p>
                                                        <button
                                                            onClick={() => setShowReplay(true)}
                                                            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-400 hover:bg-purple-500/20 transition-all"
                                                        >
                                                            <History className="h-3 w-3" />Watch Replay
                                                        </button>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-white/30">No replay data available</p>
                                                )}
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4">
                            <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                                <FileText className="h-10 w-10 text-white/20" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-white/50 font-medium">Select a submission</p>
                                <p className="text-xs text-white/30 mt-1">Click on any submission from the left panel to review and grade it</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Time Travel Replay Modal ── */}
            {showReplay && selected?.replay_snapshots?.length > 0 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-4xl h-[80vh] bg-black/90 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        <ReplayTimeline
                            snapshots={selected.replay_snapshots}
                            onClose={() => setShowReplay(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
