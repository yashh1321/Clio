import mammoth from 'mammoth'
import puppeteer from 'puppeteer'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Auth check — only logged-in users can convert files
  const token = req.cookies.get('clio_session')?.value
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }

  try {
    console.log('Starting PDF conversion...')
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) {
      console.error('No file uploaded')
      return new Response(JSON.stringify({ error: 'missing_file' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    console.log('File received:', file.name, file.size)
    const ab = await file.arrayBuffer()
    const buffer = Buffer.from(ab)

    console.log('Converting DOCX to HTML...')
    const result = await mammoth.convertToHtml({ buffer }, {
      convertImage: (mammoth as any).images.inline(
        async (element: { read: (enc?: 'base64') => Promise<string>; contentType: string }) => {
          const imageBuffer = await element.read('base64')
          const src = `data:${element.contentType};base64,${imageBuffer}`
          return { src }
        }
      ) as any,
    })
    console.log('HTML conversion complete. Length:', result.value.length)

    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; margin: 0; padding: 20mm; }
      img { max-width: 100%; height: auto; }
      p { line-height: 1.5; font-size: 12pt; }
      h1, h2, h3, h4, h5, h6 { margin: 0 0 8pt; }
    </style></head><body>${result.value}</body></html>`

    console.log('Launching Puppeteer...')
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    console.log('Puppeteer launched. Opening page...')
    try {
      const page = await browser.newPage()
      console.log('Page opened. Setting content...')
      // Use 'load' instead of 'networkidle0' for faster/safer static content rendering
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 })
      console.log('Content set. Generating PDF...')
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        timeout: 60000
      })
      console.log('PDF generated. Size:', pdfBuffer.byteLength)
      const arrayBuffer = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength) as ArrayBuffer
      const inName = (file as File).name || 'document.docx'
      // Sanitize filename to prevent header injection
      const base = inName.replace(/\.docx$/i, '').replace(/[^a-zA-Z0-9.\-_ ()]/g, '_') || 'document'
      return new NextResponse(arrayBuffer, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${base}.pdf"` } })
    } finally {
      console.log('Closing browser...')
      await browser.close()
    }
  } catch (error) {
    console.error('Detailed PDF Error:', error)
    return new NextResponse(JSON.stringify({ error: 'conversion_failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
