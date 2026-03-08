"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { WebGLShader } from "../../components/ui/web-gl-shader"
import { Button } from "../../components/ui/button"
import { Loader2, CheckCircle, AlertTriangle, Download, Save } from "lucide-react"
import { saveAs } from "file-saver"
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from "docx"
import RichEditor from "../../components/editor/RichEditor"
import { type ReplaySnapshot } from "../../components/editor/ReplayTimeline"
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
  const [replaySnapshots, setReplaySnapshots] = useState<ReplaySnapshot[]>([])

  const lastTypingAtRef = useRef<number | null>(null)
  const lastTypingLenRef = useRef(0)
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTypingMsRef = useRef(0)   // total milliseconds of active typing
  const IDLE_THRESHOLD_MS = 5000        // gaps longer than 5s are considered idle

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

    // Load replay snapshots
    getFromDB("clio_replay_snapshots").then((saved) => {
      if (saved && Array.isArray(saved)) setReplaySnapshots(saved)
    }).catch(() => { })
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

      const sub = subtitleEnabled && subtitle.trim() ? ` (${subtitle.trim()})` : ''
      const fileName = (`${title || 'essay'}${sub}`).trim().replace(/[^a-z0-9\- _().]/gi, '_') || 'essay'

      // Get the live editor HTML
      let editorHtmlContent = html
      const editorEl = document.querySelector('#editor-export-root .ProseMirror')
      if (editorEl) {
        editorHtmlContent = editorEl.innerHTML
      }

      if (!editorHtmlContent) {
        alert('No content to export.')
        return
      }

      // Dynamically import jspdf (client-side only)
      const { default: jsPDF } = await import('jspdf')

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const maxWidth = pageWidth - (margin * 2)
      let yPosition = margin

      // Helper to check if we need a new page
      const checkPageBreak = (neededHeight: number) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage()
          yPosition = margin
        }
      }

      // Add title
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      const titleLines = pdf.splitTextToSize(title || 'Essay', maxWidth)
      checkPageBreak(titleLines.length * 7)
      pdf.text(titleLines, margin, yPosition)
      yPosition += titleLines.length * 7 + 4

      // Add subtitle
      if (subtitleEnabled && subtitle) {
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'normal')
        const subtitleLines = pdf.splitTextToSize(subtitle, maxWidth)
        checkPageBreak(subtitleLines.length * 6)
        pdf.text(subtitleLines, margin, yPosition)
        yPosition += subtitleLines.length * 6 + 8
      }

      // Parse the editor content
      const parser = new DOMParser()
      const doc = parser.parseFromString(editorHtmlContent, 'text/html')

      // Process all content nodes
      const processNode = async (node: Node, indentOffset = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim()
          if (text) {
            pdf.setFontSize(12)
            pdf.setFont('helvetica', 'normal')
            const lines = pdf.splitTextToSize(text, maxWidth - indentOffset)
            checkPageBreak(lines.length * 5)
            pdf.text(lines, margin + indentOffset, yPosition)
            yPosition += lines.length * 5
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          const tagName = el.tagName.toLowerCase()

          if (tagName === 'img') {
            const src = el.getAttribute('src')
            if (src && src.startsWith('data:')) {
              try {
                // Extract image dimensions
                // Smart dimension parsing for PDF (mm)
                // 1px = 0.264583 mm
                const parsePdfDim = (val: string | null, maxMm: number): number => {
                  if (!val) return 0
                  if (val.trim().endsWith('%')) {
                    return (parseFloat(val) / 100) * maxMm
                  }
                  // Assume px if no unit or px unit
                  return (parseFloat(val) || 0) * 0.264583
                }

                let imgWidth = parsePdfDim(el.getAttribute('width'), maxWidth)
                let imgHeight = parsePdfDim(el.getAttribute('height'), pageHeight)

                // Use natural dimensions for aspect ratio if explicit sizes are missing
                // Load image to get real natural dimensions (DOMParser elements don't load resources)
                let natW = 600
                let natH = 400
                try {
                  const img = new Image()
                  img.src = src
                  await new Promise<void>((resolve) => {
                    if (img.complete) resolve()
                    else {
                      img.onload = () => resolve()
                      img.onerror = () => resolve()
                    }
                  })
                  if (img.naturalWidth > 0) {
                    natW = img.naturalWidth
                    natH = img.naturalHeight
                  }
                } catch (e) {
                  console.warn("Failed to load image dimensions", e)
                }
                const ratio = natH / natW

                if (!imgWidth && !imgHeight) {
                  // No attributes? Use natural size (converted to mm)
                  imgWidth = natW * 0.264583
                  imgHeight = natH * 0.264583
                } else if (imgWidth && !imgHeight) {
                  // Width set, calc height
                  imgHeight = imgWidth * ratio
                } else if (!imgWidth && imgHeight) {
                  // Height set, calc width
                  imgWidth = imgHeight / ratio
                }

                // Calculate scaled dimensions to fit page
                // Dimensions are now already in mm

                // Scale down if too wide
                if (imgWidth > maxWidth - indentOffset) {
                  const scale = (maxWidth - indentOffset) / imgWidth
                  imgWidth = maxWidth - indentOffset
                  imgHeight = imgHeight * scale
                }

                // Scale down if too tall for page
                if (imgHeight > pageHeight - margin * 2) {
                  const scale = (pageHeight - margin * 2) / imgHeight
                  imgHeight = pageHeight - margin * 2
                  imgWidth = imgWidth * scale
                }

                checkPageBreak(imgHeight + 5)

                // Auto-detect image format from data URL
                let imageType = 'JPEG'
                if (src.startsWith('data:image/png')) {
                  imageType = 'PNG'
                } else if (src.startsWith('data:image/webp')) {
                  // jsPDF typically supports PNG/JPEG/WEBP
                  imageType = 'WEBP'
                }

                // Add the image directly from data URL with correct format
                pdf.addImage(src, imageType, margin, yPosition, imgWidth, imgHeight)
                yPosition += imgHeight + 5
                console.log('[PDF Export] Added image to PDF, dimensions:', imgWidth, 'x', imgHeight)
              } catch (err) {
                console.error('[PDF Export] Failed to add image:', err)
              }
            }
          } else if (tagName === 'li') {
            // Collect text content for the list item itself (excluding nested lists)
            let liText = ''
            const collectText = (n: Node) => {
              if (n.nodeType === Node.TEXT_NODE) liText += n.textContent
              else if (n.nodeType === Node.ELEMENT_NODE) {
                const t = (n as HTMLElement).tagName.toLowerCase()
                if (t !== 'ul' && t !== 'ol') {
                  n.childNodes.forEach(collectText)
                }
              }
            }
            collectText(el)
            const text = liText.trim()

            if (text) {
              const parentTag = el.parentElement?.tagName.toLowerCase()
              const isOrdered = parentTag === 'ol' // Simplified check

              // For nested lists, we might want to know our index in the parent
              const index = Array.from(el.parentElement?.children || []).filter(c => c.tagName.toLowerCase() === 'li').indexOf(el) + 1
              const bullet = isOrdered ? `${index}.` : '•'

              pdf.setFontSize(12)
              pdf.setFont('helvetica', 'normal')

              // Indent list content
              const bulletX = margin + indentOffset
              const textX = margin + indentOffset + 6
              const textMaxWidth = maxWidth - indentOffset - 6

              const lines = pdf.splitTextToSize(text, textMaxWidth)
              checkPageBreak(lines.length * 5 + 2)

              // Draw bullet/number
              pdf.text(bullet, bulletX, yPosition)
              // Draw text indented
              pdf.text(lines, textX, yPosition)

              yPosition += lines.length * 5 + 2
            }

            // Recursively process nested lists (ul/ol)
            for (const child of Array.from(el.children)) {
              const t = child.tagName.toLowerCase()
              if (t === 'ul' || t === 'ol') {
                await processNode(child, indentOffset + 8)
              }
            }
          } else if (tagName === 'p') {
            const text = el.textContent?.trim()
            if (text) {
              pdf.setFontSize(12)
              pdf.setFont('helvetica', 'normal')
              const lines = pdf.splitTextToSize(text, maxWidth - indentOffset)
              checkPageBreak(lines.length * 5 + 3)
              pdf.text(lines, margin + indentOffset, yPosition)
              yPosition += lines.length * 5 + 3
            }
          } else if (tagName.match(/^h[1-6]$/)) {
            const level = parseInt(tagName[1])
            const text = el.textContent?.trim()
            if (text) {
              const fontSize = 18 - (level * 2)
              pdf.setFontSize(fontSize)
              pdf.setFont('helvetica', 'bold')
              const lines = pdf.splitTextToSize(text, maxWidth)
              checkPageBreak(lines.length * (fontSize * 0.4) + 4)
              pdf.text(lines, margin, yPosition)
              yPosition += lines.length * (fontSize * 0.4) + 4
            }
          } else {
            // Recurse into child nodes for other containers
            for (const child of Array.from(el.childNodes)) {
              await processNode(child, indentOffset)
            }
          }
        }
      }

      // Process all body children
      console.log('[PDF Export] Processing document nodes...')
      for (const child of Array.from(doc.body.childNodes)) {
        await processNode(child)
      }

      const pdfBlob = pdf.output('blob')
      saveAs(pdfBlob, `${fileName}.pdf`)

      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl)
      const pdfUrl = URL.createObjectURL(pdfBlob)
      setLastPdfUrl(pdfUrl)
      setLastPdfName(fileName)
      setPdfStatus('PDF Generated Successfully')
      console.log('[PDF Export] PDF generated successfully')
    } catch (e) {
      console.error('PDF Export Error:', e)
      alert('Could not export PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Recursively collect all <img> elements from any depth in a DOM subtree
  const collectAllImages = (el: HTMLElement): HTMLImageElement[] => {
    const imgs: HTMLImageElement[] = []
    if (el.tagName.toLowerCase() === 'img') {
      imgs.push(el as HTMLImageElement)
    }
    for (const child of Array.from(el.children)) {
      imgs.push(...collectAllImages(child as HTMLElement))
    }
    return imgs
  }

  // Build an ImageRun from an <img> element
  const buildImageRun = async (imgEl: HTMLElement): Promise<ImageRun | null> => {
    const src = imgEl.getAttribute('src')
    if (!src) return null
    const buf = await getImageData(src)
    if (!buf) return null
    const rawW = imgEl.getAttribute('width')
    const rawH = imgEl.getAttribute('height')
    let w = 600
    let h = 400

    // Smart parsing for DOCX (pixels)
    if (rawW) {
      if (rawW.endsWith('%')) w = 600 * (parseFloat(rawW) / 100)
      else w = parseFloat(rawW) || 600
    }
    if (rawH) {
      if (rawH.endsWith('%')) h = 400 * (parseFloat(rawH) / 100)
      else h = parseFloat(rawH) || 400
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log('[DOCX Export] buildImageRun SUCCESS — src:', src.substring(0, 80), '...', 'size:', buf.byteLength, 'w:', w, 'h:', h)
    return new ImageRun({ data: new Uint8Array(buf), transformation: { width: w, height: h } } as any)
  }

  // Process inline children (text, bold, italic, images — recursively) into runs
  const processInlineChildren = async (el: HTMLElement): Promise<(TextRun | ImageRun)[]> => {
    const runs: (TextRun | ImageRun)[] = []
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent
        if (text && text.trim()) runs.push(new TextRun(text))
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
          const imgRun = await buildImageRun(cEl)
          if (imgRun) runs.push(imgRun)
        } else {
          // Recurse into spans, divs, or any other inline wrapper
          const nestedImgs = collectAllImages(cEl)
          if (nestedImgs.length > 0) {
            for (const img of nestedImgs) {
              const imgRun = await buildImageRun(img)
              if (imgRun) runs.push(imgRun)
            }
          } else if (cEl.textContent?.trim()) {
            runs.push(new TextRun(cEl.textContent || ''))
          }
        }
      }
    }
    return runs
  }

  async function buildDocxFromState(): Promise<{ blob: Blob; fileName: string }> {
    const sub = subtitleEnabled && subtitle.trim() ? ` (${subtitle.trim()})` : ''
    const fileName = (`${title || 'essay'}${sub}`).trim().replace(/[^a-z0-9\- _().]/gi, '_') || 'essay'

    // Get HTML from the LIVE editor DOM — this is the most reliable source.
    // The `html` React state can be stale or empty (e.g. when JSON was restored on mount
    // but no user edit has triggered `onUpdate` yet).
    let exportHtml = html
    const editorEl = document.querySelector('#editor-export-root .ProseMirror')
    if (editorEl) {
      exportHtml = editorEl.innerHTML
      console.log('[DOCX Export] Using live editor DOM innerHTML, length:', exportHtml.length)
    } else {
      console.log('[DOCX Export] Editor element not found, using html state, length:', exportHtml?.length || 0)
    }

    console.log('[DOCX Export] html preview:', exportHtml?.substring(0, 300))

    if (!exportHtml) {
      console.warn('[DOCX Export] No HTML available, falling back to text content')
      const textContent = typeof content === 'string' ? content : "Essay Content"
      const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun(textContent)] })] }] })
      return { blob: await Packer.toBlob(doc), fileName }
    }
    const parser = new DOMParser()
    const docHtml = parser.parseFromString(exportHtml, 'text/html')

    // Debug: count all images in the parsed HTML
    const allImgs = docHtml.querySelectorAll('img')
    console.log('[DOCX Export] Found', allImgs.length, 'img tags in parsed HTML')
    allImgs.forEach((img, i) => {
      console.log(`[DOCX Export] img[${i}] src:`, img.getAttribute('src')?.substring(0, 80), 'width:', img.getAttribute('width'), 'height:', img.getAttribute('height'))
    })

    // Debug: log top-level children
    console.log('[DOCX Export] Top-level body children:', Array.from(docHtml.body.childNodes).map(n => (n as HTMLElement).tagName || n.nodeType))

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
      if (tagName === 'p' || tagName === 'li') {
        const runs = await processInlineChildren(el)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opts: any = { children: runs }
        if (tagName === 'li') opts.bullet = { level: 0 }
        return new Paragraph(opts)
      }
      if (tagName === 'img') {
        const imgRun = await buildImageRun(el)
        if (imgRun) return new Paragraph({ children: [imgRun] })
      }
      // For any <div> — check if it contains images (Tiptap NodeView wrappers)
      if (tagName === 'div') {
        const imgs = collectAllImages(el)
        if (imgs.length > 0) {
          // Image wrapper div — emit each image as its own paragraph
          const imgRuns: ImageRun[] = []
          for (const img of imgs) {
            const imgRun = await buildImageRun(img)
            if (imgRun) imgRuns.push(imgRun)
          }
          if (imgRuns.length > 0) {
            return new Paragraph({ children: imgRuns })
          }
        }
        // Regular div with text content — process inline children
        const runs = await processInlineChildren(el)
        if (runs.length > 0) {
          return new Paragraph({ children: runs })
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
          if (p) {
            paragraphs.push(p)
          } else {
            // If createParagraph returned null for a container, recurse into children
            // This handles deeply nested Tiptap NodeView wrappers
            if (el.children.length > 0) {
              paragraphs.push(...await processNodes(el.childNodes))
            }
          }
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

  const handleLogout = async () => {
    try {
      // Clear server-side session cookie
      await fetch("/api/auth/logout", { method: "POST" })
      if (typeof window !== "undefined") {
        localStorage.removeItem("spotify_token")
        sessionStorage.removeItem("spotify_code_verifier")
      }
    } catch { }
    router.push("/login")
  }

  const handleSubmit = async () => {
    if (!html || html.trim().length === 0) {
      alert("Please write something before submitting.")
      return
    }
    if (!confirm("Are you sure you want to submit? This will send your essay for review.")) return

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_title: title || "Untitled",
          content: html,
          replay_snapshots: replaySnapshots,
          wpm,
          paste_count: pasteCount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(`Submission failed: ${data.error || "Unknown error"}`)
        return
      }

      // Clear local persistence
      await removeFromDB("clio_json")
      await removeFromDB("clio_html")
      await removeFromDB("clio_content")
      await removeFromDB("clio_replay_snapshots")
      localStorage.removeItem("clio_title")
      localStorage.removeItem("clio_subtitle")
      localStorage.removeItem("clio_wpm")
      localStorage.removeItem("clio_pasteCount")

      alert(`✅ Essay submitted successfully!\nIntegrity Score: ${data.score}/100`)

      setContent("")
      setHtml("")
      setJson(null)
      setTitle("Philosophy 101")
      setSubtitle("Mid-Term Essay")
      setWpm(0)
      setPasteCount(0)
      setStatus("verified")
      setReplaySnapshots([])
      activeTypingMsRef.current = 0
      lastTypingAtRef.current = null
      lastTypingLenRef.current = 0
      setStartTime(null)
    } catch (e) {
      console.error("Submission error:", e)
      alert("Network error — please check your connection and try again.")
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

                // Record session start
                if (!startTime && text.length > 0) {
                  setStartTime(now)
                }

                const lastAt = lastTypingAtRef.current
                const lastLen = lastTypingLenRef.current
                const deltaChars = Math.max(0, text.length - lastLen)

                // ── Active typing time tracking ──
                // Only count the time since the last keystroke if the gap
                // is shorter than IDLE_THRESHOLD_MS (user was actively typing).
                if (lastAt && deltaChars > 0) {
                  const gap = now - lastAt
                  if (gap < IDLE_THRESHOLD_MS) {
                    activeTypingMsRef.current += gap
                  }
                }

                // ── Real WPM = actual words / active minutes ──
                const activeMinutes = activeTypingMsRef.current / 60000
                if (activeMinutes > 0.05) { // wait ~3s of active time before showing
                  const words = text.trim().split(/\s+/).filter(Boolean).length
                  setWpm(Math.round(words / activeMinutes))
                }

                // ── Instant-speed integrity check (unchanged) ──
                if (lastAt && deltaChars > 0) {
                  const gapMinutes = (now - lastAt) / 60000
                  if (gapMinutes > 0) {
                    const instantWpm = Math.round((deltaChars / 5) / gapMinutes)
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
              onSnapshot={(snapshot) => {
                setReplaySnapshots(prev => {
                  const next = [...prev, snapshot]
                  // Persist to IndexedDB (fire and forget)
                  saveToDB("clio_replay_snapshots", next).catch(() => { })
                  return next
                })
              }}
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

              {/* Snapshot indicator (replay is available to teachers) */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/50">Session Recording</p>
                <p className="mt-2 text-sm text-white/80 font-mono">{replaySnapshots.length} <span className="text-white/40 text-xs">snapshots captured</span></p>
                <p className="mt-1 text-xs text-white/30">Your teacher can watch the writing replay</p>
              </div>
            </div>
          </aside>
        ) : null}


      </main>
    </div>
  )
}
