"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    Plus,
    Trash2,
    ArrowLeft,
    X,
    Save,
    Users,
    UserPlus,
    BookOpen,
    XCircle,
    CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebGLShader } from "@/components/ui/web-gl-shader"

interface ClassItem {
    id: string
    name: string
    section: string
    description: string
    created_at: string
    enrollment_count: number
}

interface Student {
    enrollment_id: string
    id: string
    username: string
    full_name: string
    email: string
    class: string
    course: string
}

export default function ClassesPage() {
    const router = useRouter()
    const [classes, setClasses] = useState<ClassItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Create state
    const [showCreate, setShowCreate] = useState(false)
    const [formName, setFormName] = useState("")
    const [formSection, setFormSection] = useState("")
    const [formDesc, setFormDesc] = useState("")
    const [saving, setSaving] = useState(false)
    const [formSuccess, setFormSuccess] = useState(false)

    // Enroll state
    const [enrollClassId, setEnrollClassId] = useState<string | null>(null)
    const [enrollUsernames, setEnrollUsernames] = useState("")
    const [enrolling, setEnrolling] = useState(false)
    const [enrollResult, setEnrollResult] = useState<string | null>(null)
    const [enrollError, setEnrollError] = useState(false)

    // Student list state
    const [viewingClassId, setViewingClassId] = useState<string | null>(null)
    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        async function check() {
            try {
                const res = await fetch("/api/auth/session", { credentials: "include" })
                if (!res.ok) { router.replace("/login"); return }
                const d = await res.json()
                if (!d.authenticated || d.role !== "teacher") {
                    router.replace("/login")
                } else {
                    setIsAuthenticated(true)
                }
            } catch { router.replace("/login") }
        }
        check()
    }, [router])

    const fetchClasses = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/classes", { credentials: "include" })
            if (!res.ok) throw new Error(`Error ${res.status}`)
            setClasses(await res.json())
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isAuthenticated) fetchClasses()
    }, [isAuthenticated, fetchClasses])

    const handleCreate = async () => {
        if (!formName.trim()) return
        setSaving(true)
        try {
            const res = await fetch("/api/classes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: formName.trim(), section: formSection.trim(), description: formDesc.trim() }),
                credentials: "include",
            })
            if (!res.ok) throw new Error("Failed to create")
            setFormSuccess(true)
            setTimeout(() => { setShowCreate(false); setFormSuccess(false); fetchClasses() }, 800)
        } catch { setError("Failed to create class") }
        finally { setSaving(false) }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this class?")) return;
        try {
            const res = await fetch(`/api/classes?id=${id}`, { method: "DELETE", credentials: "include" })
            if (res.ok) {
                setClasses(prev => prev.filter(c => c.id !== id))
            } else {
                setError("Failed to delete class")
            }
        } catch { setError("Error deleting class") }
    }

    const handleEnroll = async () => {
        if (!enrollClassId || !enrollUsernames.trim()) return
        setEnrolling(true)
        setEnrollResult(null)
        setEnrollError(false)
        try {
            const usernames = enrollUsernames.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean)
            const res = await fetch("/api/classes/enroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ class_id: enrollClassId, student_usernames: usernames }),
                credentials: "include",
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed")
            if (Array.isArray(data.enrolled) && data.enrolled.length > 0) {
                setEnrollResult(`Enrolled: ${data.enrolled.join(", ")}`)
            } else {
                setEnrollResult("No users were enrolled")
            }
            setEnrollUsernames("")
            fetchClasses()
        } catch (e) {
            setEnrollError(true)
            setEnrollResult(e instanceof Error ? e.message : "Failed")
        } finally {
            setEnrolling(false)
        }
    }

    const loadStudents = async (classId: string) => {
        setViewingClassId(classId)
        setLoadingStudents(true)
        try {
            const res = await fetch(`/api/classes/enroll?class_id=${classId}`, { credentials: "include" })
            if (res.ok) setStudents(await res.json())
        } catch { /* ignore */ }
        finally { setLoadingStudents(false) }
    }

    const removeStudent = async (enrollmentId: string) => {
        try {
            const res = await fetch(`/api/classes/enroll?enrollment_id=${enrollmentId}`, { method: "DELETE", credentials: "include" })
            if (res.ok) {
                setStudents(prev => prev.filter(s => s.enrollment_id !== enrollmentId))
            } else {
                console.error("Failed to remove student")
            }
        } catch (err) { console.error("Error removing student:", err) }
    }

    return (
        <div className="relative min-h-[125vh] w-full bg-background text-foreground font-sans">
            <div className="fixed inset-0 z-0 opacity-40"><WebGLShader /></div>

            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" /><span className="text-sm font-medium">Dashboard</span>
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                            <Users className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">Classes &amp; Sections</span>
                            <span className="text-xs text-white/40">Manage classes and student enrollment</span>
                        </div>
                    </div>
                </div>
                <Button onClick={() => { setShowCreate(true); setFormName(""); setFormSection(""); setFormDesc("") }} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 rounded-full shadow-lg shadow-emerald-500/20">
                    <Plus className="h-4 w-4 mr-1.5" />New Class
                </Button>
            </header>

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center h-40 gap-3 justify-center">
                        <XCircle className="h-10 w-10 text-red-400/60" /><p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 gap-4">
                        <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"><Users className="h-10 w-10 text-white/20" /></div>
                        <p className="text-sm text-white/50">No classes yet</p>
                        <Button onClick={() => setShowCreate(true)} className="bg-white/10 border border-white/20 text-white rounded-full"><Plus className="h-4 w-4 mr-1.5" />Create Class</Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {classes.map(c => (
                            <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-5 group hover:border-white/20 transition-all">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-semibold text-white">{c.name} {c.section && <span className="text-white/40 text-sm">— {c.section}</span>}</h3>
                                        {c.description && <p className="text-xs text-white/40 mt-1">{c.description}</p>}
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] text-white/30"><Users className="h-3 w-3 inline mr-1" />{c.enrollment_count} student{c.enrollment_count !== 1 ? "s" : ""}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEnrollClassId(c.id); setEnrollResult(null) }} className="rounded-lg p-2 hover:bg-white/10 text-white/40 hover:text-emerald-400" title="Enroll Students"><UserPlus className="h-4 w-4" /></button>
                                        <button onClick={() => loadStudents(c.id)} className="rounded-lg p-2 hover:bg-white/10 text-white/40 hover:text-blue-400" title="View Students"><BookOpen className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(c.id)} className="rounded-lg p-2 hover:bg-red-500/10 text-white/40 hover:text-red-400" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-black/95 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">New Class</h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-white/10"><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Class Name *</label>
                                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Philosophy 301" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Section</label>
                                <input type="text" value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="e.g. Section A" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Description</label>
                                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional description" rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none" />
                            </div>
                            {formSuccess && <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle className="h-4 w-4" />Created!</div>}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-white/60">Cancel</Button>
                            <button onClick={handleCreate} disabled={saving || !formName.trim()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? "Creating…" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enroll Modal */}
            {enrollClassId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-black/95 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">Enroll Students</h2>
                            <button onClick={() => setEnrollClassId(null)} className="p-2 rounded-full hover:bg-white/10"><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <p className="text-xs text-white/40">Enter student usernames separated by commas, spaces, or new lines.</p>
                            <textarea value={enrollUsernames} onChange={(e) => setEnrollUsernames(e.target.value)} placeholder="student1, student2, student3" rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 resize-none font-mono" />
                            {enrollResult && <p className={`text-xs ${enrollError ? "text-red-400" : "text-emerald-400"}`}>{enrollResult}</p>}
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
                            <Button variant="ghost" onClick={() => setEnrollClassId(null)} className="text-white/60">Close</Button>
                            <button onClick={handleEnroll} disabled={enrolling || !enrollUsernames.trim()} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg">
                                {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                {enrolling ? "Enrolling…" : "Enroll"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student List Modal */}
            {viewingClassId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-black/95 border border-white/10 rounded-2xl overflow-hidden max-h-[80vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">Enrolled Students</h2>
                            <button onClick={() => setViewingClassId(null)} className="p-2 rounded-full hover:bg-white/10"><X className="h-4 w-4 text-white/40" /></button>
                        </div>
                        <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                            {loadingStudents ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
                            ) : students.length === 0 ? (
                                <p className="text-sm text-white/40 text-center py-8">No students enrolled</p>
                            ) : (
                                <div className="space-y-2">
                                    {students.map(s => (
                                        <div key={s.enrollment_id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white">{s.full_name || s.username}</p>
                                                <p className="text-[10px] text-white/30">@{s.username} · {s.email} · {s.course}</p>
                                            </div>
                                            <button onClick={() => removeStudent(s.enrollment_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
