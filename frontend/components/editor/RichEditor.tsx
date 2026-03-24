import { useEditor, EditorContent, Extension, NodeViewWrapper, ReactNodeViewRenderer, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useRef, useState, useEffect, MouseEvent as ReactMouseEvent } from 'react'

// Custom Extension for Font Size
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}px`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

const SAMPLE_IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P8/5+hHgAHggJ/P9w5lwAAAABJRU5ErkJggg=='
const TextAlignWithClass = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: element => element.style.textAlign || element.getAttribute('data-align') || null,
            renderHTML: attributes => {
              if (!attributes.textAlign) {
                return {}
              }
              const align = attributes.textAlign
              return {
                style: `text-align: ${align}`,
                class: `text-align-${align}`,
                'data-align': align
              }
            }
          },
        },
      },
    ]
  }
})

/**
 * Toolbar menu for the Rich Editor providing formatting options.
 */
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const pickImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      editor?.chain().focus().setImage({ src: dataUrl }).run()
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const insertSampleImage = useCallback(() => {
    editor?.chain().focus().setImage({ src: SAMPLE_IMAGE_DATA_URL }).run()
  }, [editor])

  const [fsOpen, setFsOpen] = useState(false)

  if (!editor) {
    return null
  }

  const sizes = [12, 14, 16, 18, 20, 24, 30]
  const currentSize = editor.getAttributes('textStyle').fontSize || ''
  const showSampleImage = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const selectParagraphBlock = () => {
    const { selection } = editor.state
    if (!selection.empty) return false
    const { $from } = selection
    const depth = $from.depth
    if (depth < 1 || $from.parent.type.name !== 'paragraph') return false
    const container = $from.node(depth - 1)
    if (!container) return false
    let startIndex = $from.index(depth)
    let endIndex = $from.index(depth)
    while (startIndex > 0 && container.child(startIndex - 1).type.name === 'paragraph') startIndex--
    while (endIndex < container.childCount - 1 && container.child(endIndex + 1).type.name === 'paragraph') endIndex++
    const containerStart = $from.start(depth - 1)
    let fromPos = containerStart
    for (let i = 0; i < startIndex; i++) fromPos += container.child(i).nodeSize
    let toPos = containerStart
    for (let i = 0; i <= endIndex; i++) toPos += container.child(i).nodeSize
    if (fromPos >= toPos) return false
    editor.commands.setTextSelection({ from: fromPos + 1, to: toPos - 1 })
    return true
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 bg-white/5 backdrop-blur-md rounded-t-lg sticky top-0 z-20 items-center relative">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <div className="relative mr-2">
        <button
          className="bg-white/5 backdrop-blur-md text-white/80 text-xs rounded px-2 py-1 border border-white/10 outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30"
          onClick={() => setFsOpen(o => !o)}
        >
          {currentSize ? `${currentSize}px` : 'Size'}
        </button>
        {fsOpen && (
          <div className="absolute z-30 mt-2 w-24 rounded-md border border-white/10 bg-black/20 backdrop-blur-md shadow-lg">
            <ul className="max-h-48 overflow-y-auto glass-scroll">
              {sizes.map(s => (
                <li
                  key={s}
                  className="px-3 py-2 text-xs text-white/80 hover:bg-white/10 cursor-pointer"
                  onClick={() => { editor.chain().focus().setFontSize(String(s)).run(); setFsOpen(false) }}
                >
                  {s}px
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-italic"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-white/10 mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-h1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-h2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-white/10 mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (editor.state.selection.empty) selectParagraphBlock()
          editor.chain().focus().toggleBulletList().run()
        }}
        className={editor.isActive('bulletList') ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-bullet-list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (editor.state.selection.empty) selectParagraphBlock()
          editor.chain().focus().toggleOrderedList().run()
        }}
        className={editor.isActive('orderedList') ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-ordered-list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-white/10 mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-align-left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-align-center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-align-right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={editor.isActive({ textAlign: 'justify' }) ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}
        data-testid="toolbar-align-justify"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-white/10 mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={pickImage}
        className="text-white/60 hover:text-white"
        data-testid="toolbar-insert-image"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
      {showSampleImage ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={insertSampleImage}
          className="text-white/60 hover:text-white"
          data-testid="toolbar-sample-image"
        >
          Sample
        </Button>
      ) : null}
    </div>
  )
}


/**
 * Component for rendering an image that can be resized by the user.
 * Supports dragging for resizing along x, y, or both axes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResizableImageComponent = (props: any) => {
  const { node, updateAttributes, selected, deleteNode } = props
  const boxRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<{ x: number; y: number; width: number; height: number; mode: 'x' | 'y' | 'both' | null; aspect: number }>({ x: 0, y: 0, width: 0, height: 0, mode: null, aspect: 1 })
  const rafRef = useRef<number | null>(null)
  const pendingSize = useRef<{ width: number; height: number } | null>(null)
  const applyFrame = () => {
    rafRef.current = null
    const p = pendingSize.current
    const el = boxRef.current
    if (p && el) {
      el.style.width = p.width + 'px'
      el.style.height = p.height + 'px'
    }
  }
  const onDown = (e: MouseEvent, mode: 'x' | 'y' | 'both') => {
    e.preventDefault()
    if (e.button !== 0 && e.button !== 2) return
    const el = boxRef.current
    if (!el) return
    startRef.current = { x: e.clientX, y: e.clientY, width: el.offsetWidth, height: el.offsetHeight, mode, aspect: el.offsetWidth / Math.max(1, el.offsetHeight) }
    el.style.willChange = 'width, height'
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startRef.current.x
      const dy = ev.clientY - startRef.current.y
      let w = startRef.current.width
      let h = startRef.current.height
      if (startRef.current.mode === 'x' || startRef.current.mode === 'both') w = Math.max(32, startRef.current.width + dx)
      if (startRef.current.mode === 'y' || startRef.current.mode === 'both') h = Math.max(32, startRef.current.height + dy)
      if (ev.shiftKey && startRef.current.mode === 'both') {
        h = Math.max(32, Math.round(w / startRef.current.aspect))
      }
      pendingSize.current = { width: Math.round(w), height: Math.round(h) }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(applyFrame)
      document.body.style.cursor = startRef.current.mode === 'x' ? 'ew-resize' : startRef.current.mode === 'y' ? 'ns-resize' : 'nwse-resize'
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      const el2 = boxRef.current
      if (el2) {
        el2.style.willChange = ''
      }
      const p = pendingSize.current
      if (p) updateAttributes({ width: p.width, height: p.height })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const { src, alt, title, width, height } = node.attrs
  return (
    <NodeViewWrapper className={selected ? 'outline outline-1 outline-white/30' : ''} data-drag-handle draggable>
      <div
        ref={boxRef}
        style={{
          overflow: 'hidden',
          display: 'block',
          float: 'left',
          verticalAlign: 'top',
          width: width || 'auto',
          height: height || 'auto',
          position: 'relative',
          margin: '0 12px 8px 0',
          userSelect: 'none',
          cursor: 'default',
          shapeOutside: 'margin-box'
        }}
        contentEditable={false}
        onContextMenu={(e: ReactMouseEvent) => e.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} title={title} style={{ width: '100%', height: '100%', display: 'block' }} draggable={false} crossOrigin="anonymous" />
        <span
          style={{
            position: 'absolute',
            top: '-6px',
            left: '-6px',
            width: '16px',
            height: '16px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.15)',
            cursor: 'grab'
          }}
          data-drag-handle
        />
        <button
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '22px',
            height: '22px',
            borderRadius: '9999px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            lineHeight: '22px',
            textAlign: 'center',
            fontSize: '14px',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.3)'
          }}
          onMouseDown={(e: ReactMouseEvent) => e.stopPropagation()}
          onClick={(e: ReactMouseEvent) => { e.stopPropagation(); deleteNode?.() }}
        >
          ×
        </button>
        <span
          style={{ position: 'absolute', top: '0', right: '0', height: '100%', width: '10px', cursor: 'ew-resize' }}
          onMouseDown={(e: ReactMouseEvent) => onDown(e.nativeEvent, 'x')}
        />
        <span
          style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '10px', cursor: 'ns-resize' }}
          onMouseDown={(e: ReactMouseEvent) => onDown(e.nativeEvent, 'y')}
        />
        <span
          style={{ position: 'absolute', bottom: '0', right: '0', width: '14px', height: '14px', cursor: 'nwse-resize' }}
          onMouseDown={(e: ReactMouseEvent) => onDown(e.nativeEvent, 'both')}
        />
      </div>
    </NodeViewWrapper>
  )
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width') || null,
        renderHTML: attributes => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height') || null,
        renderHTML: attributes => {
          if (!attributes.height) return {}
          return { height: attributes.height }
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageComponent)
  },
})

/**
 * Main Rich Text Editor component built on Tiptap.
 * Features image-to-text, resizing, and markdown formatting.
 */
export default function RichEditor({
  content,
  onChange,
  onPaste,
  onHtmlChange,
  onJsonChange,
  onSnapshot,
  showToolbar = true
}: {
  content: string | object,
  onChange: (text: string) => void,
  onPaste: () => void,
  onHtmlChange?: (html: string) => void,
  onJsonChange?: (json: object) => void,
  onSnapshot?: (snapshot: { timestamp: number; html: string; textLength: number }) => void,
  showToolbar?: boolean
}) {
  const lastTextLengthRef = useRef(0)
  const lastUpdateAtRef = useRef<number | null>(null)
  const lastSnapshotAtRef = useRef<number>(0)
  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage,
      TextStyle,
      FontSize,
      TextAlignWithClass.configure({
        types: ['heading', 'paragraph', 'listItem'],
      }),
    ],
    content: content,
    immediatelyRender: false, // Fix for SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 text-lg leading-relaxed text-white/90 h-full',
        'data-editor-root': 'true',
      },
      handlePaste: (view, event, slice) => {
        const items = Array.from(event.clipboardData?.items || [])
        const item = items.find(x => x.type.startsWith('image/'))

        if (item) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              if (result) {
                const { schema } = view.state
                const node = schema.nodes.image.create({ src: result })
                const transaction = view.state.tr.replaceSelectionWith(node)
                view.dispatch(transaction)
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }

        const text = slice.content.textBetween(0, slice.content.size)
        if (text.length > 10) {
          onPaste()
        }
        return false // Default behavior
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              if (result) {
                const { schema } = view.state
                const node = schema.nodes.image.create({ src: result })
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                if (coordinates) {
                  const transaction = view.state.tr.insert(coordinates.pos, node)
                  view.dispatch(transaction)
                }
              }
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      const nextText = editor.getText()
      const now = Date.now()
      lastTextLengthRef.current = nextText.length
      lastUpdateAtRef.current = now
      onChange(nextText)
      onHtmlChange?.(editor.getHTML())
      onJsonChange?.(editor.getJSON())
      // Emit snapshot for Time Travel Replay (throttle to every 500ms)
      if (onSnapshot && (now - lastSnapshotAtRef.current > 500)) {
        lastSnapshotAtRef.current = now
        onSnapshot({ timestamp: now, html: editor.getHTML(), textLength: nextText.length })
      }
    },
  })

  useEffect(() => {
    if (!editor) return
    const win = typeof window !== 'undefined' ? (window as Window & {
      __simulatePaste?: (text?: string) => void
      __insertSampleImage?: () => void
      __setEditorContent?: (value: string | object) => void
    }) : null
    if (!win) return
    const simulatePaste = (text?: string) => {
      if (text) {
        editor.commands.insertContent(text)
      }
      onPaste()
    }
    const insertSampleImage = () => {
      editor.chain().focus().setImage({ src: SAMPLE_IMAGE_DATA_URL }).run()
    }
    const setEditorContent = (value: string | object) => {
      editor.commands.setContent(value)
    }
    win.__simulatePaste = simulatePaste
    win.__insertSampleImage = insertSampleImage
    win.__setEditorContent = setEditorContent
    return () => {
      if (win.__simulatePaste === simulatePaste) delete win.__simulatePaste
      if (win.__insertSampleImage === insertSampleImage) delete win.__insertSampleImage
      if (win.__setEditorContent === setEditorContent) delete win.__setEditorContent
    }
  }, [editor, onPaste])

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {showToolbar ? <MenuBar editor={editor} /> : null}
      <div id="editor-export-root" className="flex-1 overflow-y-scroll glass-scroll min-h-0">
        <EditorContent editor={editor} className="min-h-full" data-editor-root="true" />
      </div>
    </div>
  )
}
