"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * React Error Boundary — catches render-time errors in child components
 * and displays a user-friendly fallback UI instead of crashing the entire app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary] Caught:", error, errorInfo)
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                    <div className="max-w-md text-center p-8">
                        <div className="h-16 w-16 rounded-2xl border border-red-500/20 bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            {process.env.NODE_ENV === "production"
                                ? "An unexpected error occurred. Please try again."
                                : (this.state.error?.message || "An unexpected error occurred. Please try again.")}
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-500/20"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.href = "/"}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
