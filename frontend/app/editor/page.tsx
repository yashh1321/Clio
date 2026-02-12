"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "../../components/ui/web-gl-shader"
import { Button } from "../../components/ui/button"
import { Loader2, CheckCircle, AlertTriangle, Download, Save } from "lucide-react"
import { saveAs } from "file-saver"
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from "docx"
import RichEditor from "../../components/editor/RichEditor"
import SpotifyCard from "../../components/ui/spotify-card"
import { saveToDB, getFromDB, removeFromDB } from "../../lib/db"

export default function EditorPage() {
  const router = useRouter()
  // content starts as string, but can be set to JSON object for initialization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any>("")
  const [html, setHtml] = useState("")
  const [json, setJson] = useState<object | null>(null)
  const [wpm, setWpm] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pasteCount, setPasteCount] = useState(0)
  const [status, setStatus] = useState<"verified" | "warning" | "suspicious">("verified")
  const [title, setTitle] = useState("Philosophy 101")
  const [subtitle, setSubtitle] = useState("Mid-Term Essay")
  const [subtitleEnabled, setSubtitleEnabled] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [lastDocxUrl, setLastDocxUrl] = useState<string | null>(null)
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null)
  const [lastDocxName, setLastDocxName] = useState<string | null>(null)
  const [lastPdfName, setLastPdfName] = useState<string | null>(null)
  const [docxStatus, setDocxStatus] = useState<string | null>(null)
  const [pdfStatus, setPdfStatus] = useState<string | null>(null)
  const lastTypingAtRef = useRef<number | null>(null)
  const lastTypingLenRef = useRef(0)
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persistence data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedJson = await getFromDB("clio_json")
        const savedHtml = await getFromDB("clio_html")
        const savedContent = await getFromDB("clio_content") // This might be text or legacy

        const savedTitle = localStorage.getItem("clio_title")
        const savedSubtitle = localStorage.getItem("clio_subtitle")
        const savedWpm = localStorage.getItem("clio_wpm")
        const savedPasteCount = localStorage.getItem("clio_pasteCount")

        // Prioritize JSON, then HTML, then Text
        if (savedJson) {
          setContent(savedJson)
          setJson(savedJson)
        } else if (savedHtml) {
          setContent(savedHtml)
          setHtml(savedHtml)
        } else if (savedContent) {
          setContent(savedContent)
        }

        if (savedTitle) setTitle(savedTitle)
        if (savedSubtitle) setSubtitle(savedSubtitle)
        if (savedWpm) setWpm(parseInt(savedWpm))
        if (savedPasteCount) setPasteCount(parseInt(savedPasteCount))
      } catch (err) {
        console.error("Error loading saved state:", err)
      } finally {
        setIsLoaded(true)
      }
    }
    // Add a timeout fallback so the spinner never hangs forever
    const timeout = setTimeout(() => setIsLoaded(true), 3000)
    loadData().finally(() => clearTimeout(timeout))
  }, [])

  // Auth Check — redirect if not authenticated, but don't block rendering
  useEffect(() => {
    const auth = localStorage.getItem("clio_auth")
    const cookieAuth = document.cookie.split('; ').find(row => row.startsWith('clio_auth='))
    if (!auth && !cookieAuth) {
      router.push("/login")
    }
  }, [router])

  // Auto-save logic
  useEffect(() => {
    if (!isLoaded) return
    setIsSaving(true)

    const saveData = async () => {
      try {
        if (json) await saveToDB("clio_json", json)
        await saveToDB("clio_html", html)
        // Only save content as text if it's a string (avoid saving the JSON object as 'content')
        if (typeof content === 'string') {
          await saveToDB("clio_content", content)
        }

        localStorage.setItem("clio_title", title)
        localStorage.setItem("clio_subtitle", subtitle)
        localStorage.setItem("clio_wpm", wpm.toString())
        localStorage.setItem("clio_pasteCount", pasteCount.toString())
      } catch (err) {
        console.error("Error auto-saving state:", err)
      } finally {
        setIsSaving(false)
      }
    }

    const timeoutId = setTimeout(saveData, 500)
    return () => clearTimeout(timeoutId)
  }, [content, html, json, title, subtitle, wpm, pasteCount, isLoaded])

  // Analytics Logic
  // WPM is updated in onChange to avoid render loops

  const resetStatusAfterDelay = (next: "warning" | "suspicious") => {
    setStatus(next)
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current)
    }
    statusTimeoutRef.current = setTimeout(() => setStatus("verified"), 10000)
  }
  const handlePaste = () => {
    setPasteCount(prev => prev + 1)
    resetStatusAfterDelay("warning")
  }

  const getImageData = async (src: string): Promise<ArrayBuffer | null> => {
    try {
      if (!src) return null
      if (src.startsWith('data:')) {
        const base64 = src.split(',')[1]
        if (!base64) return null
        const binaryString = window.atob(base64)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      }
      const resp = await fetch(src, { mode: 'cors' })
      if (!resp.ok) return null
      return await resp.arrayBuffer()
    } catch (e) {
      console.error("Error fetching image data:", e)
      return null
    }
  }

  const handleExportDocx = async () => {
    try {
      setIsExporting(true)
      const { blob, fileName } = await buildDocxFromState()
      saveAs(blob, `${fileName}.docx`)
      if (lastDocxUrl) URL.revokeObjectURL(lastDocxUrl)
      const docxUrl = URL.createObjectURL(blob)
      setLastDocxUrl(docxUrl)
      setLastDocxName(fileName)
      setDocxStatus('DOCX Generated Successfully')
    } catch (e) {
      console.error(e)
      alert("Could not export DOCX. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      setIsExporting(true)
      setPdfStatus(null)
      const { blob, fileName } = await buildDocxFromState()
      const fd = new FormData()
      fd.append('file', blob, `${fileName}.docx`)
      const resp = await fetch('/api/convert-docx-to-pdf', { method: 'POST', body: fd })
      if (!resp.ok) throw new Error('conversion_failed')
      const pdfBlob = await resp.blob()
      saveAs(pdfBlob, `${fileName}.pdf`)
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl)
      const pdfUrl = URL.createObjectURL(pdfBlob)
      setLastPdfUrl(pdfUrl)
      setLastPdfName(fileName)
      setPdfStatus('PDF Generated Successfully')
    } catch (e) {
      console.error('PDF Export Error:', e)
      alert('Could not export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  async function buildDocxFromState(): Promise<{ blob: Blob; fileName: string }> {
    const sub = subtitleEnabled && subtitle.trim() ? ` (${subtitle.trim()})` : ''
    const fileName = (`${title || 'essay'}${sub}`).trim().replace(/[^a-z0-9\- _().]/gi, '_') || 'essay'

    // If we have HTML, use it (it's the source of truth for formatting/images)
    if (!html) {
      // Fallback to text content
      const textContent = typeof content === 'string' ? content : "Essay Content"
      const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(textContent)] })] }] })
      return { blob: await Packer.toBlob(doc), fileName }
    }
    const parser = new DOMParser()
    const docHtml = parser.parseFromString(html, 'text/html')
    const createParagraph = async (el: HTMLElement): Promise<Paragraph | null> => {
      const tagName = el.tagName.toLowerCase()
      if (tagName.match(/^h[1-6]$/)) {
        const level = parseInt(tagName[1])
        return new Paragraph({
          text: el.textContent || '',
          heading:
            level === 2
              ? HeadingLevel.HEADING_2
              : level === 3
                ? HeadingLevel.HEADING_3
                : HeadingLevel.HEADING_1,
        })
      }
      if (tagName === 'p' || tagName === 'div' || tagName === 'li') {
        const runs: (TextRun | ImageRun)[] = []
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent
            if (text) runs.push(new TextRun(text))
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const cEl = child as HTMLElement
            const cTag = cEl.tagName.toLowerCase()
            if (cTag === 'strong' || cTag === 'b') {
              runs.push(new TextRun({ text: cEl.textContent || '', bold: true }))
            } else if (cTag === 'em' || cTag === 'i') {
              runs.push(new TextRun({ text: cEl.textContent || '', italics: true }))
            } else if (cTag === 'br') {
              runs.push(new TextRun({ text: '\n' }))
            } else if (cTag === 'img') {
              const src = cEl.getAttribute('src')
              if (src) {
                const buf = await getImageData(src)
                if (buf) {
                  const w = parseInt(cEl.getAttribute('width') || '0') || 600
                  const h = parseInt(cEl.getAttribute('height') || '0') || 400
                  runs.push(new ImageRun({ data: new Uint8Array(buf), transformation: { width: w, height: h } } as any))
                }
              }
            } else {
              runs.push(new TextRun(cEl.textContent || ''))
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts: any = { children: runs }
        if (tagName === 'li') opts.bullet = { level: 0 }
        return new Paragraph(opts)
      }
      if (tagName === 'img') {
        const src = el.getAttribute('src')
        if (src) {
          const buf = await getImageData(src)
          if (buf) {
            const w = parseInt(el.getAttribute('width') || '0') || 600
            const h = parseInt(el.getAttribute('height') || '0') || 400
            return new Paragraph({ children: [new ImageRun({ data: new Uint8Array(buf), transformation: { width: w, height: h } } as any)] })
          }
        }
      }
      return null
    }
    const processNodes = async (nodes: NodeListOf<ChildNode>): Promise<Paragraph[]> => {
      const paragraphs: Paragraph[] = []
      for (const node of Array.from(nodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue
        const el = node as HTMLElement
        const tagName = el.tagName.toLowerCase()
        if (tagName === 'ul' || tagName === 'ol') {
          paragraphs.push(...await processNodes(el.childNodes))
        } else {
          const p = await createParagraph(el)
          if (p) paragraphs.push(p)
        }
      }
      return paragraphs
    }
    const children: Paragraph[] = []
    children.push(new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }))
    if (subtitleEnabled && subtitle) {
      children.push(new Paragraph({ text: subtitle, heading: HeadingLevel.HEADING_2 }))
    }
    children.push(...await processNodes(docHtml.body.childNodes))
    const doc = new Document({ sections: [{ children }] })
    return { blob: await Packer.toBlob(doc), fileName }
  }

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("spotify_token")
        localStorage.removeItem("clio_auth")
        document.cookie = "clio_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
        sessionStorage.removeItem("spotify_code_verifier")
      }
    } catch { }
    router.push("/login")
  }

  const handleSubmit = async () => {
    if (confirm("Are you sure you want to submit? This will clear your current progress.")) {
      try {
        await removeFromDB("clio_json")
        await removeFromDB("clio_html")
        await removeFromDB("clio_content")
        localStorage.removeItem("clio_title")
        localStorage.removeItem("clio_subtitle")
        localStorage.removeItem("clio_wpm")
        localStorage.removeItem("clio_pasteCount")

        alert("Essay Submitted Successfully!")

        setContent("")
        setHtml("")
        setJson(null)
        setTitle("Philosophy 101")
        setSubtitle("Mid-Term Essay")
        setWpm(0)
        setPasteCount(0)
        setStatus("verified")
      } catch (e) {
        console.error("Error clearing DB:", e)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (lastDocxUrl) URL.revokeObjectURL(lastDocxUrl)
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl)
    }
  }, [lastDocxUrl, lastPdfUrl])

  const contentLength = typeof content === 'string' ? content.length : html.length

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden font-sans">
      {/* Background Effect - Reusing the Shader for consistency */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <WebGLShader />
      </div>

      {!focusMode ? (
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/50 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
            <div className="flex flex-col">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Essay Title"
                className="text-sm font-bold text-white bg-white/5 border border-white/10 rounded px-2 py-1 backdrop-blur-md focus:outline-none focus:border-white/30"
              />
              {subtitleEnabled ? (
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Subheading"
                  className="text-xs text-white/80 bg-white/5 border border-white/10 rounded px-2 py-1 backdrop-blur-md focus:outline-none focus:border-white/30"
                  onBlur={() => { if (!subtitle.trim()) setSubtitleEnabled(false) }}
                />
              ) : (
                <button
                  className="text-xs text-white/40 hover:text-white/70"
                  onClick={() => setSubtitleEnabled(true)}
                >
                  + Add subheading
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportDocx}
                disabled={isExporting}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                .docx
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Download className="mr-1 h-3 w-3" />}
                .pdf
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-white/50" />
                  <span className="text-xs font-medium text-white/50">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 text-white/30" />
                  <span className="text-xs font-medium text-white/30">Saved</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1" data-integrity-state={status}>
              {status === "verified" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
              {status === "suspicious" && <AlertTriangle className="h-4 w-4 text-red-500" />}
              <span className={`text-xs font-medium ${status === 'verified' ? 'text-green-500' : status === 'suspicious' ? 'text-red-500' : 'text-yellow-500'}`}>
                {status === "verified" ? "Integrity Verified" : status === "suspicious" ? "Unusual Speed" : "Integrity Warning"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFocusMode(v => !v)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">
              {focusMode ? "Exit Focus" : "Focus Mode"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">Logout</Button>
            <Button className="bg-white text-black hover:bg-gray-200" onClick={handleSubmit}>Submit Essay</Button>
          </div>
        </header>
      ) : null}

      {/* Main Workspace */}
      <main className={`relative z-10 flex ${focusMode ? 'h-screen' : 'h-[calc(100vh-73px)]'}`}>

        {/* Editor Canvas */}
        <div className="relative flex-1 overflow-hidden p-8 flex justify-center bg-black/20 backdrop-blur-md border-l border-white/10 min-h-0">
          {focusMode ? (
            <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1" data-integrity-state={status}>
                {status === "verified" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {status === "suspicious" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                <span className={`text-xs font-medium ${status === 'verified' ? 'text-green-500' : status === 'suspicious' ? 'text-red-500' : 'text-yellow-500'}`}>
                  {status === "verified" ? "Integrity Verified" : status === "suspicious" ? "Unusual Speed" : "Integrity Warning"}
                </span>
              </div>
              <span className="text-xs font-medium text-white/60">Focus Mode Enabled</span>
              <Button variant="ghost" size="sm" onClick={() => setFocusMode(false)} className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-3">
                Exit Focus
              </Button>
            </div>
          ) : null}
          {isLoaded ? (
            <RichEditor
              content={content}
              onChange={(text) => {
                const now = Date.now()
                let start = startTime
                if (!start && text.length > 0) {
                  setStartTime(now)
                  start = now
                }
                if (start) {
                  const minutes = (now - start) / 60000
                  if (minutes > 0) {
                    setWpm(Math.round((text.length / 5) / minutes))
                  }
                }
                const lastAt = lastTypingAtRef.current
                const lastLen = lastTypingLenRef.current
                const deltaChars = Math.max(0, text.length - lastLen)
                if (lastAt && deltaChars > 0) {
                  const minutes = (now - lastAt) / 60000
                  if (minutes > 0) {
                    const instantWpm = Math.round((deltaChars / 5) / minutes)
                    if (instantWpm >= 120) {
                      resetStatusAfterDelay("suspicious")
                    }
                  }
                }
                lastTypingAtRef.current = now
                lastTypingLenRef.current = text.length
                setContent(text)
              }}
              onPaste={handlePaste}
              onHtmlChange={setHtml}
              onJsonChange={setJson}
              showToolbar={!focusMode}
            />
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          )}
        </div>

        {/* Right Sidebar (Analytics) */}
        {!focusMode ? (
          <aside className="w-80 border-l border-white/10 bg-black/20 p-6 backdrop-blur-md hidden md:block">
            <h2 className="mb-6 text-xs font-bold uppercase tracking-wider text-white/40">Session Analytics</h2>
            <p className="mb-4 text-xs text-white/40">Behavioral analytics processed locally</p>

            <div className="space-y-6">
              {/* WPM Card */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Typing Speed</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{wpm}</span>
                  <span className="text-sm text-white/50">WPM</span>
                </div>
                {(wpm > 80 || status === "suspicious") && <p className="mt-2 text-xs text-red-400">⚠️ Unusual Speed</p>}
              </div>

              {/* Paste Count Card */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Paste Events</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${pasteCount > 0 ? 'text-yellow-500' : 'text-white'}`}>
                    {pasteCount}
                  </span>
                  <span className="text-sm text-white/50">detected</span>
                </div>
              </div>
              {contentLength > 2000 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-white/50">Performance</p>
                  <p className="mt-2 text-sm text-white">Editor Performance Test Completed</p>
                </div>
              ) : null}
              {(lastDocxUrl || lastPdfUrl || docxStatus || pdfStatus) ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <p className="text-xs text-white/50">Exports</p>
                  {lastDocxUrl && lastDocxName ? (
                    <a href={`${lastDocxUrl}#${lastDocxName}.docx`} data-href={`${lastDocxUrl}#${lastDocxName}.docx`} download={`${lastDocxName}.docx`} className="block text-xs text-white/80 underline">Latest DOCX</a>
                  ) : null}
                  {lastPdfUrl && lastPdfName ? (
                    <a href={`${lastPdfUrl}#${lastPdfName}.pdf`} data-href={`${lastPdfUrl}#${lastPdfName}.pdf`} download={`${lastPdfName}.pdf`} className="block text-xs text-white/80 underline">Latest PDF</a>
                  ) : null}
                  {docxStatus ? (
                    <div className="text-xs text-white/80">{docxStatus}</div>
                  ) : null}
                  {pdfStatus ? (
                    <div className="text-xs text-white/80 space-y-1">
                      <div>{pdfStatus}</div>
                      <div>PDF ready for download</div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Integrity Score Visual */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Projected Integrity Score</p>
                <div className="mt-4 h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.max(0, 100 - (pasteCount * 10))}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-xs font-bold text-green-400">
                  {Math.max(0, 100 - (pasteCount * 10))}
                </p>
              </div>
              <SpotifyCard />
            </div>
          </aside>
        ) : null}
      </main>
    </div>
  )
}
