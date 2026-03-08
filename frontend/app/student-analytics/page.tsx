"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2, TrendingUp, TrendingDown, Minus, BarChart3,
    Flame, Target, Zap, Award, ArrowLeft, FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WebGLShader } from "@/components/ui/web-gl-shader"
import { ThemeToggle } from "@/components/ui/theme-toggle"

// ── Types ──
interface AnalyticsData {
    summary: {
        totalSubmissions: number
        totalGraded: number
        avgWpm: number
        avgIntegrity: number
        avgGrade: number | null
        currentStreak: number
        longestStreak: number
    }
    improvements: {
        wpmImprovement: number | null
        integrityImprovement: number | null
    }
    performanceTimeline: {
        date: string | null
        assignment: string
        wpm: number
        integrity_score: number
        grade_score: number | null
    }[]
    wpmTrend: { index: number; wpm: number; avg: number }[]
    gradeDistribution: { range: string; count: number }[]
}

// ── Simple Bar Chart Component ──
function BarChartSimple({ data, label, color }: { data: { label: string; value: number }[]; label: string; color: string }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
        <div>
            <p className="text-xs text-muted-foreground mb-3">{label}</p>
            <div className="flex items-end gap-1 h-24">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                            className={`w-full rounded-t ${color} transition-all duration-500`}
                            style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground truncate w-full text-center">{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Trend Indicator ──
function TrendBadge({ value, unit }: { value: number | null; unit: string }) {
    if (value === null) return <span className="text-xs text-muted-foreground">Not enough data</span>
    const isPositive = value > 0
    const isNeutral = value === 0
    const Icon = isPositive ? TrendingUp : isNeutral ? Minus : TrendingDown
    const color = isPositive ? "text-green-400" : isNeutral ? "text-muted-foreground" : "text-red-400"

    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
            <Icon className="h-3 w-3" />
            {isPositive ? "+" : ""}{value} {unit}
        </span>
    )
}

export default function StudentAnalyticsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            try {
                const authRes = await fetch("/api/auth/session", { credentials: "include" })
                if (!authRes.ok) { router.push("/login"); return }
                const authData = await authRes.json()
                if (authData.role !== "student") { router.push("/dashboard"); return }

                const res = await fetch("/api/student-analytics", { credentials: "include" })
                if (res.ok) {
                    setData(await res.json())
                } else {
                    setError("Failed to load analytics data")
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred")
            }
            finally { setLoading(false) }
        }
        load()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
                <div className="text-red-400 font-bold text-lg">Failed to load analytics</div>
                <div className="text-muted-foreground text-sm">{error || "No data available."}</div>
                <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
            </div>
        )
    }

    const { summary, improvements, performanceTimeline, wpmTrend, gradeDistribution } = data

    return (
        <div className="relative min-h-screen w-full bg-background text-foreground overflow-auto font-sans">
            <div className="fixed inset-0 opacity-20 pointer-events-none z-0"><WebGLShader /></div>

            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-6 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/student-dashboard")} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    <span className="text-sm font-bold">My Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/editor")} className="text-muted-foreground hover:text-foreground h-8 px-3">Write</Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push("/submissions")} className="text-muted-foreground hover:text-foreground h-8 px-3">Submissions</Button>
                    <ThemeToggle />
                </div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <FileText className="h-4 w-4 text-blue-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.totalSubmissions}</p>
                        <p className="text-[10px] text-muted-foreground">Submissions</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Award className="h-4 w-4 text-yellow-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.avgGrade ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Grade</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Zap className="h-4 w-4 text-orange-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.avgWpm}</p>
                        <p className="text-[10px] text-muted-foreground">Avg WPM</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Target className="h-4 w-4 text-green-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.avgIntegrity}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Integrity</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Award className="h-4 w-4 text-purple-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.totalGraded}</p>
                        <p className="text-[10px] text-muted-foreground">Graded</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Flame className="h-4 w-4 text-orange-500 mb-2" />
                        <p className="text-2xl font-bold">{summary.currentStreak}</p>
                        <p className="text-[10px] text-muted-foreground">Current Streak</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-4">
                        <Flame className="h-4 w-4 text-red-400 mb-2" />
                        <p className="text-2xl font-bold">{summary.longestStreak}</p>
                        <p className="text-[10px] text-muted-foreground">Best Streak</p>
                    </div>
                </div>

                {/* Improvement Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">WPM Improvement</h3>
                        <TrendBadge value={improvements.wpmImprovement} unit="WPM vs first submissions" />
                        {wpmTrend.length > 0 && (
                            <div className="mt-4">
                                <BarChartSimple
                                    data={wpmTrend.map(t => ({ label: `#${t.index + 1}`, value: t.avg }))}
                                    label="WPM Moving Average (last 5)"
                                    color="bg-blue-500"
                                />
                            </div>
                        )}
                    </div>
                    <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Integrity Improvement</h3>
                        <TrendBadge value={improvements.integrityImprovement} unit="pts vs first submissions" />
                        {gradeDistribution.filter(d => d.count > 0).length > 0 && (
                            <div className="mt-4">
                                <BarChartSimple
                                    data={gradeDistribution.map(d => ({ label: d.range, value: d.count }))}
                                    label="Grade Distribution"
                                    color="bg-green-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Timeline */}
                <div className="rounded-xl border border-border bg-accent/10 backdrop-blur-md p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Performance Timeline</h3>
                    {performanceTimeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No submissions yet. Start writing to track your performance!</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Date</th>
                                        <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Assignment</th>
                                        <th className="text-right py-2 px-3 text-muted-foreground font-semibold">WPM</th>
                                        <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Integrity</th>
                                        <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceTimeline.slice().reverse().slice(0, 20).map((entry, i) => (
                                        <tr key={i} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                                            <td className="py-2 px-3 text-muted-foreground">{entry.date ?? "—"}</td>
                                            <td className="py-2 px-3 font-medium truncate max-w-[200px]">{entry.assignment}</td>
                                            <td className="py-2 px-3 text-right">{entry.wpm}</td>
                                            <td className="py-2 px-3 text-right">
                                                <span className={entry.integrity_score >= 80 ? "text-green-400" : entry.integrity_score >= 50 ? "text-yellow-400" : "text-red-400"}>
                                                    {entry.integrity_score}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                {entry.grade_score !== null ? (
                                                    <span className={entry.grade_score >= 80 ? "text-green-400 font-bold" : entry.grade_score >= 50 ? "text-yellow-400 font-bold" : "text-red-400 font-bold"}>
                                                        {entry.grade_score}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
