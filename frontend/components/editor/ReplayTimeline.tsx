"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, FastForward, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ReplaySnapshot = {
    timestamp: number  // Date.now() when the content was captured
    html: string       // Full editor HTML at this point
    textLength: number // Character count for progress visualization
}

interface ReplayTimelineProps {
    snapshots: ReplaySnapshot[]
    onClose: () => void
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10]

export default function ReplayTimeline({ snapshots, onClose }: ReplayTimelineProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [speedMultiplier, setSpeedMultiplier] = useState(1)
    const [sanitizedHtml, setSanitizedHtml] = useState("")
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const currentSnapshot = snapshots[currentIndex] || null
    const totalSnapshots = snapshots.length
    const progress = totalSnapshots > 1 ? (currentIndex / (totalSnapshots - 1)) * 100 : 0

    // Calculate elapsed time
    const startTime = snapshots[0]?.timestamp || 0
    const currentTime = currentSnapshot?.timestamp || 0
    const endTime = snapshots[totalSnapshots - 1]?.timestamp || 0
    const elapsed = Math.round((currentTime - startTime) / 1000)
    const total = Math.round((endTime - startTime) / 1000)

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    // SSR-safe DOMPurify: sanitize on the client only
    useEffect(() => {
        if (!currentSnapshot) {
            setSanitizedHtml("")
            return
        }
        import("dompurify").then((mod) => {
            const DOMPurify = mod.default
            setSanitizedHtml(DOMPurify.sanitize(currentSnapshot.html))
        })
    }, [currentSnapshot])

    const stopPlayback = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        setIsPlaying(false)
    }, [])

    const startPlayback = useCallback(() => {
        if (currentIndex >= totalSnapshots - 1) {
            setCurrentIndex(0) // restart from beginning
        }
        setIsPlaying(true)
    }, [currentIndex, totalSnapshots])

    useEffect(() => {
        if (!isPlaying || totalSnapshots < 2) return

        // Calculate the average interval between snapshots
        const avgInterval = (endTime - startTime) / (totalSnapshots - 1)
        // Apply speed multiplier, with a minimum of 30ms
        const playbackInterval = Math.max(30, avgInterval / speedMultiplier)
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => {
                if (prev >= totalSnapshots - 1) {
                    stopPlayback()
                    return prev
                }
                return prev + 1
            })
        }, playbackInterval)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isPlaying, speedMultiplier, totalSnapshots, endTime, startTime, stopPlayback])

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const pct = Math.max(0, Math.min(1, x / rect.width))
        const idx = Math.round(pct * (totalSnapshots - 1))
        setCurrentIndex(idx)
    }

    const handleReset = () => {
        stopPlayback()
        setCurrentIndex(0)
    }

    const stepBackward = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1))
    }

    const stepForward = () => {
        setCurrentIndex(prev => Math.min(totalSnapshots - 1, prev + 1))
    }

    if (totalSnapshots === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                <p className="text-sm">No writing session recorded for this submission.</p>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white">
                    Close
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header Bar — dark toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-gradient-to-r from-[#1a1a2e] to-[#16213e]">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500" />
                        <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-white/70 ml-2">
                        Writing Session Replay
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-white/50 font-mono tabular-nums">
                        {formatTime(elapsed)} / {formatTime(total)}
                    </span>
                    <button
                        onClick={onClose}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        ✕ Close
                    </button>
                </div>
            </div>

            {/* Document View — white paper on dark background */}
            <div className="flex-1 overflow-y-auto bg-[#2a2a3a] min-h-0 py-8 px-4">
                <div
                    ref={containerRef}
                    className="mx-auto max-w-[816px] min-h-[600px] bg-white rounded-sm shadow-2xl shadow-black/40 px-16 py-14"
                    style={{
                        /* A4 paper feel */
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                    }}
                >
                    {sanitizedHtml ? (
                        <div
                            className="prose prose-lg max-w-none"
                            style={{
                                color: '#1a1a1a',
                                lineHeight: '1.8',
                                fontSize: '16px',
                            }}
                            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full min-h-[200px]">
                            <p className="text-gray-400 text-sm italic">Waiting for content…</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Bar — modern media player */}
            <div className="px-5 py-4 border-t border-white/10 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] space-y-3">
                {/* Progress Bar (scrubable) */}
                <div
                    className="h-1.5 w-full rounded-full bg-white/10 cursor-pointer relative group hover:h-2.5 transition-all"
                    onClick={handleScrub}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-75 relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Playhead knob */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-lg shadow-purple-500/30 opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-purple-400/50" />
                    </div>
                </div>

                {/* Buttons Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="text-white/50 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full"
                            title="Reset to beginning"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={stepBackward}
                            className="text-white/50 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full"
                            title="Previous snapshot"
                        >
                            <SkipBack className="h-4 w-4" />
                        </Button>
                        <button
                            onClick={() => isPlaying ? stopPlayback() : startPlayback()}
                            className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-white hover:from-purple-400 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/25"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                        </button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={stepForward}
                            className="text-white/50 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full"
                            title="Next snapshot"
                        >
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Speed selector */}
                    <div className="flex items-center gap-1 bg-white/5 rounded-full px-1 py-0.5">
                        <FastForward className="h-3 w-3 text-white/30 mx-1" />
                        {SPEED_OPTIONS.map(speed => (
                            <button
                                key={speed}
                                onClick={() => setSpeedMultiplier(speed)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${speedMultiplier === speed
                                    ? 'bg-purple-500/30 text-purple-300 shadow-sm'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="font-mono tabular-nums">{currentSnapshot?.textLength || 0} chars</span>
                        <span className="font-mono tabular-nums">Frame {currentIndex + 1}/{totalSnapshots}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
