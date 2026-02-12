You are working inside my existing project. Your job is to IMPLEMENT and WIRE UP the full DOCX → PDF export pipeline so that:

- The user writes in a rich TipTap editor in Next.js.
- When they click “Export as PDF”:
  1. The frontend builds a .docx (using the existing docx builder).
  2. That .docx is posted to a Next.js API route `/api/convert-docx-to-pdf`.
  3. The API converts the DOCX → HTML (with images inlined) using mammoth.
  4. Then uses puppeteer to render that HTML to a PDF (A4, margins, colors, images).
  5. Returns `application/pdf` so the browser downloads a correct, image- and color-preserving PDF.

Use the following context about the repo and stack and then generate/modify concrete code in the appropriate files.

==================================================
PROJECT OVERVIEW (WHAT ALREADY EXISTS / MUST BE RESPECTED)
==================================================

Frontend:
- Next.js 16 (app router) with React 19, using Turbopack in dev.
- TipTap-based rich editor in:
  - `frontend/components/editor/RichEditor.tsx`
  - Uses @tiptap/react, StarterKit, Image, TextAlign, TextStyle, plus custom font-size extension.
- UI utilities:
  - class-variance-authority
  - lucide-react
  - custom button components:
    - `frontend/components/ui/button.tsx`
    - `frontend/components/ui/liquid-glass-button.tsx`
- Exports:
  - DOCX generation is already planned/partially implemented using `docx` and `file-saver` in:
    - `frontend/app/editor/page.tsx` (around lines 90–213).
  - PDF export is intended to go through a Node API:
    - `frontend/app/editor/page.tsx` (around lines 215–251) → POST to `/api/convert-docx-to-pdf`.

Backend (Node in Next.js app):
- API routes live under `frontend/app/api/...` (Next.js app router).
- Spotify OAuth token route example:
  - `frontend/app/api/spotify/token/route.ts`
- DOCX→PDF conversion API:
  - `frontend/app/api/convert-docx-to-pdf/route.ts` is mentioned but may be stubbed/empty.
- Dependencies to use for conversion (already added or should be added in `frontend/package.json`):
  - `mammoth` (DOCX → HTML with inline images)
  - `puppeteer` (HTML → PDF with full browser rendering)

Python backend (prototype – for now mostly informational):
- Lives in `backend/modules/...` with editor, dashboard, database, etc.
- NOT directly needed for the DOCX→PDF pipeline right now, but do not break it.

Export workflow DESIGN (what I want in working code):
- DOCX:
  - In `frontend/app/editor/page.tsx`, a button builds a DOCX document by walking the TipTap document/HTML, creating paragraphs and embedding images as `ImageRun` objects.
  - Filename is generated from title + optional subtitle, sanitized.
- PDF:
  - PDF button should:
    1. Build the DOCX (same builder as the “Download DOCX” button).
    2. Send that DOCX as a file to `POST /api/convert-docx-to-pdf`.
    3. Receive the PDF back and trigger a browser download.

Why images must work:
- `mammoth` reads the DOCX server-side and converts it to HTML with embedded images as data: URLs.
- `puppeteer` renders this HTML on the server as a headless browser, preserving:
  - Text
  - Colors
  - CSS
  - Images (including data URLs)
  - Basic layout

==================================================
TASKS FOR YOU (WHAT TO IMPLEMENT / FIX)
==================================================

1) FRONTEND – EDITOR PAGE EXPORT PIPELINE

File: `frontend/app/editor/page.tsx`

Goals:
- Ensure there are TWO buttons:
  - “Download DOCX”
  - “Export as PDF”
- Both should reuse the SAME DOCX builder logic (no duplicated logic).

Concrete tasks:
1. Locate the existing DOCX export logic in this file (around lines 90–213 as per my outline).
   - This logic should:
     - Read the TipTap editor content (ideally via JSON or HTML from the editor instance).
     - Walk through it to create `docx.Document` with:
       - Paragraphs and headings
       - Font sizes (if supported)
       - Bold/italic
       - Lists
       - Embedded images (`ImageRun`)
     - Generate a Blob or ArrayBuffer for the DOCX file.
     - Use `file-saver` (or similar) for direct DOCX download.

2. Refactor this DOCX creation into a separate function inside `page.tsx`:
   - Example signature (you choose final shape, but keep the idea):
     ```ts
     async function buildDocxFromEditor(editorState: Editor | null): Promise<{ blob: Blob; fileName: string; }> { ... }
     ```
   - Return both:
     - The `Blob` (or `ArrayBuffer`) for the DOCX.
     - The sanitized `fileName` (derived from title + subtitle fields on the page).

3. For the **“Download DOCX”** button:
   - On click:
     - Call `buildDocxFromEditor(...)`.
     - Use `FileSaver.saveAs(blob, fileName + '.docx')`.

4. For the **“Export as PDF”** button:
   - On click:
     - Call `buildDocxFromEditor(...)`.
     - Send the DOCX to `/api/convert-docx-to-pdf` via `fetch`.
     - Use `FormData` to send the file (so the backend can treat it as a real file):
       ```ts
       const formData = new FormData();
       formData.append('file', new File([blob], fileName + '.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
       const res = await fetch('/api/convert-docx-to-pdf', {
         method: 'POST',
         body: formData,
       });
       ```
     - Handle:
       - Network errors
       - Non-200 responses
     - If OK, read `res.blob()` and trigger a download as `fileName + '.pdf'`.

5. UI/UX:
   - Disable the export buttons while the export is in progress, and show a simple loading state (e.g. “Exporting…”).
   - Handle the case where the editor is empty, and show a user-friendly message (e.g. “Please write something before exporting.”).

2) BACKEND – DOCX → HTML → PDF API (Next.js route)

File: `frontend/app/api/convert-docx-to-pdf/route.ts`

Goal:
- Implement a Next.js App Router API route with:
  - `export const POST = async (req: NextRequest) => { ... }`
- The route should:
  1. Parse the incoming `FormData`.
  2. Extract the DOCX file.
  3. Use `mammoth` to convert DOCX → HTML (with inlined images).
  4. Use `puppeteer` to render the HTML into a PDF buffer.
  5. Return this buffer with proper headers.

Concrete tasks:
1. Implement multipart/form-data parsing:
   - Use `req.formData()` (Next.js 13+ app router style).
   - Get the `file` field as a Blob or File.
   - Convert it into a Node-readable buffer:
     ```ts
     const file = formData.get('file') as File | null;
     if (!file) { return new NextResponse(JSON.stringify({ error: 'Missing file' }), { status: 400 }); }
     const arrayBuffer = await file.arrayBuffer();
     const buffer = Buffer.from(arrayBuffer);
     ```

2. Using `mammoth`:
   - Import mammoth:
     ```ts
     import mammoth from 'mammoth';
     ```
   - Call:
     ```ts
     const { value: html } = await mammoth.convertToHtml({
       buffer,
     }, {
       convertImage: mammoth.images.inline(async (element) => {
         const imageBuffer = await element.read();
         const base64 = imageBuffer.toString('base64');
         return {
           src: `data:${element.contentType};base64,${base64}`,
         };
       }),
     });
     ```
   - This should give you an HTML string with `<img src="data:...">`.

3. Using `puppeteer`:
   - Import puppeteer:
     ```ts
     import puppeteer from 'puppeteer';
     ```
   - Launch a headless browser (ensure it works in Node environment used by Next.js API – typically fine in dev, but might need tweaks in prod).
   - Create a new page, set its content to the HTML from mammoth. Wrap the HTML with `<html><head>...</head><body>...</body></html>` and some minimal default styles to ensure text and images look reasonable.
   - Use:
     ```ts
     const pdfBuffer = await page.pdf({
       format: 'A4',
       printBackground: true,
       margin: {
         top: '1in',
         right: '1in',
         bottom: '1in',
         left: '1in',
       },
     });
     ```
   - Close the browser after generation.

4. Return the PDF buffer from the route:
   - Use:
     ```ts
     return new NextResponse(pdfBuffer, {
       status: 200,
       headers: {
         'Content-Type': 'application/pdf',
         'Content-Disposition': 'attachment; filename="document.pdf"',
       },
     });
     ```
   - If possible, extract the base file name from the original filename in the request and reuse it in `Content-Disposition`.

5. Error handling:
   - Wrap the logic in try/catch.
   - On error, log it with `console.error(err)` and return:
     ```ts
     return new NextResponse(JSON.stringify({ error: 'Failed to convert DOCX to PDF' }), { status: 500 });
     ```

3) DEPENDENCIES AND CONFIG

1. Ensure `frontend/package.json` includes:
   - `"mammoth": "latest"`
   - `"puppeteer": "latest"`
   - `"docx": "latest"`
   - `"file-saver": "latest"`
2. If puppeteer needs any Next.js config tweaks (like `experimental.serverComponentsExternalPackages`), add them in `next.config.mjs` so that the API route can use puppeteer without bundling issues.
3. Make sure TypeScript types are correct for Next.js app router routes (`NextRequest`, `NextResponse` from `next/server`).

==================================================
ACCEPTANCE CRITERIA
==================================================

- In the `/editor` page:
  - I can type a rich essay with headings, paragraphs, lists, custom font sizes, and insert images.
  - Clicking “Download DOCX” gives me a .docx that opens correctly in Word/LibreOffice with text and images.
  - Clicking “Export as PDF”:
    - Shows a loading state.
    - Calls `/api/convert-docx-to-pdf` with the DOCX content.
    - Returns a downloadable .pdf whose content matches the DOCX (text, images, and colors preserved).
- Images pasted or drag-dropped into the TipTap editor appear correctly in both DOCX and PDF.
- The solution uses mammoth + puppeteer on the server as described and does NOT rely on html2canvas/jsPDF for the PDF path.
- No TypeScript or runtime errors in dev: `npm run dev` works, and the editor + exports function end-to-end.

Now:
- Inspect the existing files in this repo.
- Implement or modify the code in the specific files mentioned to satisfy all the tasks and acceptance criteria above.
- Keep the code clean, strongly typed (TypeScript), and consistent with the existing style of the project.
