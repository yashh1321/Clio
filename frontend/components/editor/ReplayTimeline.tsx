"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Play, Pause, RotateCcw, FastForward } from "lucide-react"
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

const SPEED_OPTIONS = [1, 2, 5, 10]

export default function ReplayTimeline({ snapshots, onClose }: ReplayTimelineProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [speedMultiplier, setSpeedMultiplier] = useState(5)
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
            {/* Replay Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white/60">Time Travel Replay</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40 font-mono">
                        {formatTime(elapsed)} / {formatTime(total)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white h-7 px-2 text-xs">
                        ✕ Close
                    </Button>
                </div>
            </div>

            {/* Replay Content — rendered HTML */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto glass-scroll min-h-0 px-8 py-6"
            >
                {sanitizedHtml ? (
                    <div
                        className="prose prose-invert max-w-none text-lg leading-relaxed text-white/90"
                        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-white/30 text-sm italic">Typing snippet unavailable or truncated</p>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="px-4 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md rounded-b-lg space-y-2">
                {/* Progress Bar (scrubable) */}
                <div
                    className="h-2 w-full rounded-full bg-white/10 cursor-pointer relative group"
                    onClick={handleScrub}
                >
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-75"
                        style={{ width: `${progress}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${progress}% - 8px)` }}
                    />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReset}
                            className="text-white/60 hover:text-white h-8 w-8 p-0"
                            title="Reset"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => isPlaying ? stopPlayback() : startPlayback()}
                            className="text-white/60 hover:text-white h-8 w-8 p-0"
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Speed selector */}
                    <div className="flex items-center gap-1">
                        <FastForward className="h-3 w-3 text-white/40" />
                        {SPEED_OPTIONS.map(speed => (
                            <button
                                key={speed}
                                onClick={() => setSpeedMultiplier(speed)}
                                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${speedMultiplier === speed
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>{currentSnapshot?.textLength || 0} chars</span>
                        <span>Snapshot {currentIndex + 1}/{totalSnapshots}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
