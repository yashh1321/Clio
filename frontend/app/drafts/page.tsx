"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    ArrowLeft,
    Plus,
    Trash2,
    FileText,
    Edit,
    Clock,
    XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebGLShader } from "@/components/ui/web-gl-shader"

interface Draft {
    id: string
    title: string
    assignment_id: string | null
    word_count: number
    last_saved_at: string
    created_at: string
}

export default function DraftsPage() {
    const router = useRouter()
    const [drafts, setDrafts] = useState<Draft[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        async function check() {
            try {
                const res = await fetch("/api/auth/session", { credentials: "include" })
                if (!res.ok) { router.replace("/login"); return }
                const d = await res.json()
                if (!d.authenticated || d.role !== "student") {
                    router.replace("/login")
                } else {
                    setIsAuthenticated(true)
                }
            } catch { router.replace("/login") }
        }
        check()
    }, [router])

    const fetchDrafts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/drafts", { credentials: "include" })
            if (!res.ok) throw new Error(`Error ${res.status}`)
            setDrafts(await res.json())
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load drafts")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (isAuthenticated) fetchDrafts()
    }, [isAuthenticated, fetchDrafts])

    const handleNewDraft = async () => {
        try {
            setError(null)
            const res = await fetch("/api/drafts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Untitled Draft" }),
                credentials: "include",
            })
            if (!res.ok) throw new Error("Failed to create")
            const d = await res.json()
            router.push(`/editor?draft=${d.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create new draft")
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this draft?")) return;
        try {
            setError(null)
            const res = await fetch(`/api/drafts?id=${id}`, { method: "DELETE", credentials: "include" })
            if (res.ok) {
                setDrafts(prev => prev.filter(d => d.id !== id))
            } else {
                setError("Failed to delete draft")
            }
        } catch (err) {
            setError("Error deleting draft")
        }
    }

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return "Just now"
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        const days = Math.floor(hrs / 24)
        return `${days}d ago`
    }

    return (
        <div className="relative min-h-[125vh] w-full bg-background text-foreground font-sans">
            <div className="fixed inset-0 z-0 opacity-40"><WebGLShader /></div>

            <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/editor")} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" /><span className="text-sm font-medium">Editor</span>
                    </button>
                    <div className="h-5 w-px bg-white/10" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">My Drafts</span>
                            <span className="text-xs text-white/40">Save and resume work on multiple essays</span>
                        </div>
                    </div>
                </div>
                <Button onClick={handleNewDraft} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 rounded-full shadow-lg shadow-purple-500/20">
                    <Plus className="h-4 w-4 mr-1.5" />New Draft
                </Button>
            </header>

            <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>
                ) : error ? (
                    <div className="flex flex-col items-center h-40 gap-3 justify-center">
                        <XCircle className="h-10 w-10 text-red-400/60" /><p className="text-sm text-red-400">{error}</p>
                    </div>
                ) : drafts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-60 gap-4">
                        <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"><FileText className="h-10 w-10 text-white/20" /></div>
                        <p className="text-sm text-white/50">No drafts yet</p>
                        <p className="text-xs text-white/30">Create a new draft or start writing in the editor</p>
                        <Button onClick={handleNewDraft} className="bg-white/10 border border-white/20 text-white rounded-full"><Plus className="h-4 w-4 mr-1.5" />New Draft</Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {drafts.map((draft) => (
                            <div key={draft.id} className="group rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-white/20 transition-all">
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/editor?draft=${draft.id}`)}>
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-purple-500/10 flex items-center justify-center shrink-0">
                                            <FileText className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-sm font-medium text-white truncate">{draft.title}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-white/30 flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(draft.last_saved_at)}</span>
                                                <span className="text-[10px] text-white/30">{draft.word_count} words</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => router.push(`/editor?draft=${draft.id}`)} className="rounded-lg p-2 hover:bg-white/10 text-white/40 hover:text-blue-400" title="Edit"><Edit className="h-4 w-4" /></button>
                                        <button onClick={() => handleDelete(draft.id)} className="rounded-lg p-2 hover:bg-red-500/10 text-white/40 hover:text-red-400" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
