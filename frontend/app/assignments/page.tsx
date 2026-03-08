"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Calendar,
    FileText,
    Hash,
    CheckCircle,
    XCircle,
    ArrowLeft,
    X,
    Save,
    BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebGLShader } from "@/components/ui/web-gl-shader"

interface Assignment {
    id: string
    title: string
    description: string
    due_date: string | null
    max_word_count: number | null
    created_at: string
    teacher_name: string
}

function formatDate(ts: string | null) {
    if (!ts) return "—"
    const d = new Date(ts)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(ts: string | null) {
    if (!ts) return "—"
    const d = new Date(ts)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " · " +
        d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function isDuePast(due: string | null) {
    if (!due) return false
    return new Date(due) < new Date()
}

export default function AssignmentsPage() {
    const router = useRouter()
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // ── Create/Edit form state ──
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formTitle, setFormTitle] = useState("")
    const [formDesc, setFormDesc] = useState("")
    const [formDueDate, setFormDueDate] = useState("")
    const [formWordLimit, setFormWordLimit] = useState("")
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [formSuccess, setFormSuccess] = useState(false)

    // ── Delete state ──
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // ── Auth check ──
    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch("/api/auth/session", { credentials: "include" })
                if (!res.ok) { router.replace("/login"); return }
                const data = await res.json()
                if (!data.authenticated || data.role !== "teacher") {
                    router.replace("/login")
                }
            } catch {
                router.replace("/login")
            }
        }
        checkAuth()
    }, [router])

    // ── Fetch assignments ──
    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch("/api/assignments", { credentials: "include" })
            if (!res.ok) throw new Error(`Server responded ${res.status}`)
            const data: Assignment[] = await res.json()
            setAssignments(data)
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load assignments")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchAssignments() }, [fetchAssignments])

    // ── Open create form ──
    const openCreateForm = () => {
        setEditingId(null)
        setFormTitle("")
        setFormDesc("")
        setFormDueDate("")
        setFormWordLimit("")
        setFormError(null)
        setFormSuccess(false)
        setShowForm(true)
    }

    // ── Open edit form ──
    const openEditForm = (a: Assignment) => {
        setEditingId(a.id)
        setFormTitle(a.title)
        setFormDesc(a.description || "")
        if (a.due_date) {
            const d = new Date(a.due_date)
            const pad = (n: number) => String(n).padStart(2, "0")
            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            setFormDueDate(local)
        } else {
            setFormDueDate("")
        }
        setFormWordLimit(a.max_word_count ? String(a.max_word_count) : "")
        setFormError(null)
        setFormSuccess(false)
        setShowForm(true)
    }

    // ── Submit form ──
    const handleSubmit = async () => {
        if (!formTitle.trim()) {
            setFormError("Title is required")
            return
        }
        setSaving(true)
        setFormError(null)
        setFormSuccess(false)

        try {
            const payload: Record<string, unknown> = {
                title: formTitle.trim(),
                description: formDesc.trim(),
            }
            if (formDueDate) payload.due_date = formDueDate
            if (formWordLimit) {
                const wl = parseInt(formWordLimit, 10)
                if (!isNaN(wl) && wl > 0) payload.max_word_count = wl
            }

            let res: Response
            if (editingId) {
                payload.id = editingId
                res = await fetch("/api/assignments", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    credentials: "include",
                })
            } else {
                res = await fetch("/api/assignments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    credentials: "include",
                })
            }

            if (!res.ok) {
                let errMsg = "Failed to save"
                try {
                    const bodyText = await res.text()
                    try {
                        const data = JSON.parse(bodyText)
                        errMsg = data.error || errMsg
                    } catch {
                        errMsg = bodyText || `Error ${res.status}`
                    }
                } catch {
                    errMsg = `Error ${res.status}`
                }
                throw new Error(errMsg)
            }

            setFormSuccess(true)
            setTimeout(() => {
                setShowForm(false)
                setFormSuccess(false)
                fetchAssignments()
            }, 1000)
        } catch (e) {
            setFormError(e instanceof Error ? e.message : "Failed to save")
        } finally {
            setSaving(false)
        }
    }

    // ── Delete ──
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) return
        setDeletingId(id)
        setDeleteError(null)
        try {
            const res = await fetch(`/api/assignments?id=${id}`, {
                method: "DELETE",
                credentials: "include",
            })
            if (!res.ok) throw new Error("Failed to delete")
            setAssignments(prev => prev.filter(a => a.id !== id))
        } catch (e) {
            console.error("Delete error:", e)
            setDeleteError(e instanceof Error ? e.message : "Failed to delete assignment")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="relative min-h-[125vh] w-full bg-background text-foreground font-sans">
            {/* Background */}
            <div className="fixed inset-0 z-0 opacity-40">
                <WebGLShader />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white tracking-tight">Assignments</span>
                            <span className="text-xs text-white/40">Create &amp; manage course assignments</span>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={openCreateForm}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 rounded-full shadow-lg shadow-purple-500/20"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Assignment
                </Button>
            </header>

            {/* Main */}
            <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                        <XCircle className="h-10 w-10 text-red-400/60" />
                        <p className="text-sm text-red-400/80">{error}</p>
                        <Button variant="ghost" size="sm" onClick={fetchAssignments} className="text-white/60 hover:text-white">Retry</Button>
                    </div>
                ) : assignments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 gap-4">
                        <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                            <BookOpen className="h-10 w-10 text-white/20" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-white/50 font-medium">No assignments yet</p>
                            <p className="text-xs text-white/30 mt-1">Create your first assignment for students to work on</p>
                        </div>
                        <Button onClick={openCreateForm} className="bg-white/10 border border-white/20 text-white hover:bg-white/20 rounded-full mt-2">
                            <Plus className="h-4 w-4 mr-1.5" />Create Assignment
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-white/30 uppercase tracking-wider px-1 mb-4">
                            {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
                        </p>
                        {deleteError && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-4">
                                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                <span className="text-sm text-red-400">{deleteError}</span>
                            </div>
                        )}
                        {assignments.map((a) => (
                            <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 transition-all hover:border-white/20 group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-semibold text-white truncate">{a.title}</h3>
                                        {a.description && (
                                            <p className="text-sm text-white/50 mt-1 line-clamp-2">{a.description.replace(/<[^>]*>/g, '')}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-3">
                                            {a.due_date && (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isDuePast(a.due_date) ? 'text-red-400' : 'text-white/40'}`}>
                                                    <Calendar className="h-3 w-3" />
                                                    Due {formatDate(a.due_date)}
                                                    {isDuePast(a.due_date) && <span className="text-red-400 ml-0.5">(Past)</span>}
                                                </span>
                                            )}
                                            {a.max_word_count && (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-white/40 font-medium">
                                                    <Hash className="h-3 w-3" />{a.max_word_count.toLocaleString()} word limit
                                                </span>
                                            )}
                                            <span className="text-[10px] text-white/25">Created {formatDateTime(a.created_at)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={() => openEditForm(a)}
                                            className="rounded-lg p-2 hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            disabled={deletingId === a.id}
                                            className="rounded-lg p-2 hover:bg-red-500/10 transition-colors text-white/40 hover:text-red-400 disabled:opacity-50"
                                            title="Delete"
                                        >
                                            {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* ── Create/Edit Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-xl bg-black/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">
                                {editingId ? "Edit Assignment" : "New Assignment"}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="rounded-full p-2 hover:bg-white/10 transition-colors">
                                <X className="h-4 w-4 text-white/40" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 py-5 space-y-5">
                            {/* Title */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                    <FileText className="h-3.5 w-3.5" />Title *
                                </label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="e.g. Philosophy 301 — Mid-Term Essay"
                                    maxLength={500}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                    <BookOpen className="h-3.5 w-3.5" />Description / Instructions
                                </label>
                                <textarea
                                    value={formDesc}
                                    onChange={(e) => setFormDesc(e.target.value)}
                                    placeholder="Write the essay prompt, instructions, or guidelines for students..."
                                    rows={4}
                                    maxLength={10000}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                                />
                            </div>

                            {/* Due Date + Word Limit */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                        <Calendar className="h-3.5 w-3.5" />Due Date
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formDueDate}
                                        onChange={(e) => setFormDueDate(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors [color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                        <Hash className="h-3.5 w-3.5" />Word Limit
                                    </label>
                                    <input
                                        type="number"
                                        value={formWordLimit}
                                        onChange={(e) => setFormWordLimit(e.target.value)}
                                        placeholder="e.g. 2000"
                                        min={0}
                                        max={100000}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Status messages */}
                            {formError && (
                                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                    <span className="text-sm text-red-400">{formError}</span>
                                </div>
                            )}
                            {formSuccess && (
                                <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 animate-in fade-in">
                                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                                    <span className="text-sm text-green-400">{editingId ? "Updated!" : "Created!"}</span>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/60">Cancel</Button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !formTitle.trim()}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? "Saving…" : editingId ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
