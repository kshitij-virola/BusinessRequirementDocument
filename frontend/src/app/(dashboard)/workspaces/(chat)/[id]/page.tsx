'use client'
import { useState, useRef, useEffect, useTransition, use } from 'react'
import {
  Send, Download, ChevronLeft, ChevronRight, Copy, Check,
  ThumbsUp, ThumbsDown, MoreHorizontal, Search, Code, Eye,
  Folder, FolderOpen, Info, X,
} from 'lucide-react'
import Link from 'next/link'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { LimitModal } from '@/components/ui/LimitModal'
import { WorkspaceActionsMenu } from '@/components/workspace/WorkspaceActionsMenu'
import { VersionHistoryButton } from '@/components/workspace/VersionHistory'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  code?: string
  language?: string
  status?: 'generating' | 'done' | 'error'
  credits?: number
  timestamp?: string
  suggestions?: string[]
}

interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
  ext?: string
}

const mockFileTree: FileNode[] = [
  {
    name: 'public', type: 'folder',
    children: [
      { name: 'favicon.ico', type: 'file', ext: 'ico' },
      { name: 'placeholder.svg', type: 'file', ext: 'svg' },
      { name: 'robots.txt', type: 'file', ext: 'txt' },
    ],
  },
  {
    name: 'src', type: 'folder',
    children: [
      { name: 'components', type: 'folder', children: [] },
      { name: 'data', type: 'folder', children: [] },
      { name: 'hooks', type: 'folder', children: [] },
      { name: 'lib', type: 'folder', children: [] },
      { name: 'pages', type: 'folder', children: [] },
      { name: 'test', type: 'folder', children: [] },
      { name: 'App.css', type: 'file', ext: 'css' },
      { name: 'App.tsx', type: 'file', ext: 'tsx' },
      { name: 'index.css', type: 'file', ext: 'css' },
      { name: 'main.tsx', type: 'file', ext: 'tsx' },
      { name: 'vite-env.d.ts', type: 'file', ext: 'ts' },
    ],
  },
  { name: '.gitignore', type: 'file', ext: 'ignore' },
  { name: 'bun.lock', type: 'file', ext: 'lock' },
  { name: 'components.json', type: 'file', ext: 'json' },
  { name: 'eslint.config.js', type: 'file', ext: 'js' },
  { name: 'index.html', type: 'file', ext: 'html' },
  { name: 'package.json', type: 'file', ext: 'json' },
  { name: 'playwright-fixture.ts', type: 'file', ext: 'ts' },
  { name: 'playwright.config.ts', type: 'file', ext: 'ts' },
  { name: 'postcss.config.js', type: 'file', ext: 'js' },
  { name: 'README.md', type: 'file', ext: 'md' },
  { name: 'tailwind.config.ts', type: 'file', ext: 'ts' },
  { name: 'tsconfig.app.json', type: 'file', ext: 'json' },
  { name: 'tsconfig.json', type: 'file', ext: 'json' },
  { name: 'tsconfig.node.json', type: 'file', ext: 'json' },
  { name: 'vite.config.ts', type: 'file', ext: 'ts' },
]

const mockTabs = [
  { id: 'index', label: 'src/pages/Index.tsx' },
  { id: 'readme', label: 'README.md' },
  { id: 'tsconfig-app', label: 'tsconfig.app.json' },
  { id: 'tsconfig', label: 'tsconfig.json' },
  { id: 'tsconfig-node', label: 'tsconfig.node.json' },
  { id: 'vite', label: 'vite.con...' },
]

const mockInitialMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Create a modern SaaS dashboard with sidebar navigation and analytics charts using React and Tailwind CSS.',
  },
  {
    id: '2',
    role: 'assistant',
    content: `Lovable doesn't have a direct "download as ZIP" feature, but you have two options:\n\n1. **GitHub**: Connect your GitHub account in **Settings > GitHub**, push your code there, then download as ZIP from GitHub.\n2. **Code Editor**: You can copy files manually from the Code Editor view.\n\nThe recommended approach is connecting to GitHub; it also gives you version control and backup.`,
    code: `import { useState } from 'react'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="flex h-screen bg-gray-950 text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-violet-400">TROO AI</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {['Overview', 'Analytics', 'Projects', 'Settings'].map((item) => (
            <button
              key={item}
              onClick={() => setActiveTab(item.toLowerCase())}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted
                         hover:bg-gray-800 hover:text-foreground transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Users', value: '12,480' },
            { label: 'Revenue', value: '$48,290' },
            { label: 'Conversions', value: '4.2%' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-muted text-sm">{stat.label}</p>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}`,
    language: 'tsx',
    status: 'done',
    credits: 1,
    timestamp: 'Mar 10 at 12:37 PM',
    suggestions: ['Code Editor'],
  },
  {
    id: '3',
    role: 'assistant',
    content: `You're already in the Code Editor! You can browse files in the left sidebar and edit them directly.\n\nTo **download your code**, connect to GitHub via **Settings > GitHub**, then download as ZIP from your GitHub repo.`,
    status: 'done',
    credits: 1,
    timestamp: 'Mar 10 at 12:40 PM',
    suggestions: ['now setup in github'],
  },
]

function getFileIconStyle(ext?: string): { bg: string; label: string } {
  const map: Record<string, { bg: string; label: string }> = {
    tsx: { bg: 'bg-sky-500', label: 'T' },
    ts: { bg: 'bg-blue-500', label: 'T' },
    js: { bg: 'bg-yellow-500', label: 'J' },
    css: { bg: 'bg-blue-400', label: 'C' },
    json: { bg: 'bg-yellow-600', label: '{' },
    html: { bg: 'bg-orange-500', label: 'H' },
    md: { bg: 'bg-muted', label: 'M' },
    svg: { bg: 'bg-purple-500', label: 'S' },
    ico: { bg: 'bg-indigo-400', label: 'I' },
    lock: { bg: 'bg-gray-600', label: 'L' },
    ignore: { bg: 'bg-gray-600', label: 'G' },
    txt: { bg: 'bg-muted', label: 'T' },
  }
  return map[ext ?? ''] ?? { bg: 'bg-gray-600', label: 'F' }
}

function FileTreeNode({
  node, depth = 0, selectedFile, onSelect,
}: {
  node: FileNode; depth?: number; selectedFile: string; onSelect: (name: string) => void
}) {
  const [open, setOpen] = useState(node.name === 'src' || node.name === 'public')
  const isSelected = selectedFile === node.name

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="flex items-center gap-1.5 w-full py-[3px] pr-2 text-[13px] text-foreground/80 hover:bg-secondary rounded-sm transition-colors"
        >
          <ChevronRight className={cn('h-3 w-3 text-muted shrink-0 transition-transform duration-100', open && 'rotate-90')} />
          {open
            ? <FolderOpen className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            : <Folder className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
          <span>{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <FileTreeNode key={child.name} node={child} depth={depth + 1} selectedFile={selectedFile} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  const { bg, label } = getFileIconStyle(node.ext)

  return (
    <button
      onClick={() => onSelect(node.name)}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
      className={cn(
        'flex items-center gap-1.5 w-full py-[3px] pr-2 text-[13px] rounded-sm transition-colors',
        isSelected ? 'bg-primary/15 text-primary' : 'text-foreground/80 hover:bg-secondary',
      )}
    >
      <span className={cn('inline-flex items-center justify-center w-3.5 h-3.5 rounded-[2px] text-[7px] font-bold text-white shrink-0', bg)}>
        {label}
      </span>
      <span className="truncate">{node.name}</span>
    </button>
  )
}

function renderContent(content: string) {
  return content.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.+?)\*\*/g)
    return (
      <p key={i} className={cn('leading-relaxed', i > 0 && line === '' ? 'mt-2' : i > 0 ? 'mt-1' : '')}>
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-semibold text-foreground">{part}</strong>
            : part
        )}
      </p>
    )
  })
}

type MobileTab = 'chat' | 'code'
type ViewMode = 'code' | 'preview'

const WorkspacePage = ({ params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const params = use(paramsPromise)
  const [messages, setMessages] = useState<Message[]>(mockInitialMessages)
  const [prompt, setPrompt] = useState('')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [limitOpen, setLimitOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState('App.tsx')
  const [activeTab, setActiveTab] = useState('index')
  const [viewMode, setViewMode] = useState<ViewMode>('code')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const latestCode = [...messages].reverse().find((m) => m.code)
  const latestCodeStr = latestCode?.code ?? ''
  const latestLang = latestCode?.language ?? 'tsx'

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim() || isPending) return

    const userMessages = messages.filter((m) => m.role === 'user').length
    if (userMessages >= 3) { setLimitOpen(true); return }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: prompt }
    setPrompt('')
    setMessages((prev) => [...prev, userMsg])
    const thinkingId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: thinkingId, role: 'assistant', content: '', status: 'generating' }])

    startTransition(() => {
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === thinkingId
              ? {
                  ...m,
                  content: `I've updated the component based on: "${userMsg.content}"`,
                  code: `// Updated: ${userMsg.content}\nexport default function Updated() {\n  return (\n    <div className="p-4 rounded-xl bg-gray-900 text-foreground">\n      <h1 className="text-2xl font-bold">Updated Theme</h1>\n      <p className="text-muted mt-2">Generated from your prompt.</p>\n    </div>\n  )\n}`,
                  language: 'tsx',
                  status: 'done',
                  credits: 1,
                  timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                }
              : m
          )
        )
        setMobileTab('code')
      }, 1500)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  // ── Chat panel ───────────────────────────────────────────────────────────────
  const chatPanel = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/workspaces" className="text-muted hover:text-foreground shrink-0 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="text-sm font-semibold text-foreground truncate">SaaS Dashboard Theme</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('code')}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
          >
            <Code className="h-3.5 w-3.5" /><span>Code</span>
          </button>
          <VersionHistoryButton workspaceId={params.id} />
          <WorkspaceActionsMenu workspaceId={params.id} name="SaaS Dashboard Theme" status="active" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-card border border-border px-4 py-2.5 text-sm text-foreground leading-relaxed">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {msg.status === 'generating' ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <span className="inline-flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                    Generating...
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted/70 font-medium">Finished thinking</p>

                    <div className="text-sm text-foreground/80">
                      {renderContent(msg.content)}
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-0.5">
                        <button className="p-1.5 rounded-md text-muted/70 hover:text-muted hover:bg-secondary transition-colors" title="Good response">
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button className="p-1.5 rounded-md text-muted/70 hover:text-muted hover:bg-secondary transition-colors" title="Bad response">
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-md text-muted/70 hover:text-muted hover:bg-secondary transition-colors"
                          title="Copy"
                          onClick={() => handleCopy(msg.content, msg.id)}
                        >
                          {copiedId === msg.id
                            ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button className="p-1.5 rounded-md text-muted/70 hover:text-muted hover:bg-secondary transition-colors" title="More">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {msg.timestamp && (
                        <span className="text-xs text-muted/70">{msg.timestamp}</span>
                      )}
                    </div>

                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {msg.suggestions.map((s) => (
                          <button
                            key={s}
                            className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-foreground/80 hover:bg-secondary hover:border-border transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted/70">
            <Info className="h-3 w-3 shrink-0" />
            <span>Reuse work from other projects</span>
          </div>
          <button className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted hover:bg-secondary transition-colors">
            Add reference <X className="h-2.5 w-2.5 ml-0.5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-border bg-card focus-within:border-primary/40 transition-colors">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Ask Lovable..."
              className="w-full resize-none rounded-xl bg-transparent px-3 pt-3 pb-10 text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
            />
            <div className="absolute bottom-2 left-3">
              <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted/70">Code</span>
            </div>
            <div className="absolute bottom-2 right-2">
              <button
                type="submit"
                disabled={!prompt.trim() || isPending}
                className="flex items-center justify-center h-7 w-7 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  // ── File tree panel ──────────────────────────────────────────────────────────
  const fileTreePanel = (
    <div className="flex flex-col h-full bg-background">
      <div className="px-3 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 rounded-md bg-secondary border border-border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted/70 shrink-0" />
          <input
            type="text"
            placeholder="Search code"
            className="flex-1 bg-transparent text-[13px] text-foreground/80 placeholder:text-muted/70 focus:outline-none min-w-0"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-1">
        {mockFileTree.map((node) => (
          <FileTreeNode
            key={node.name}
            node={node}
            selectedFile={selectedFile}
            onSelect={setSelectedFile}
          />
        ))}
      </div>
    </div>
  )

  // ── Code panel ───────────────────────────────────────────────────────────────
  const codePanel = (
    <div className="flex flex-col h-full bg-background">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border shrink-0 overflow-x-auto">
        <div className="flex items-center flex-1 min-w-0">
          {/* Mobile back button */}
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className="flex items-center gap-1 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-secondary transition-colors shrink-0 lg:hidden border-r border-border"
          >
            <ChevronLeft className="h-3.5 w-3.5" />Chat
          </button>
          {mockTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs shrink-0 border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary text-foreground bg-secondary'
                  : 'border-transparent text-muted hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto pl-2 pr-3 border-l border-border">
          <div className="flex rounded-lg border border-border p-0.5">
            {(['code', 'preview'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                  viewMode === mode ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
                )}
              >
                {mode === 'code' ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {mode}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors whitespace-nowrap">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'code' ? (
          latestCodeStr ? (
            <SyntaxHighlighter
              language={latestLang}
              style={atomOneDark}
              customStyle={{ background: 'transparent', padding: '1rem', fontSize: '12px', margin: 0 }}
              showLineNumbers
              lineNumberStyle={{ color: 'var(--muted)', minWidth: '2.5em' }}
            >
              {latestCodeStr}
            </SyntaxHighlighter>
          ) : (
            <p className="p-4 text-sm text-muted/70">No code generated yet.</p>
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted/70 px-4">
              <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Live preview available after backend connection.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <LimitModal
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        limitType="generations"
        current={25}
        max={25}
        plan="Free"
      />
      {/* Mobile */}
      <div className="flex h-full flex-col lg:hidden">
        {mobileTab === 'chat' ? chatPanel : codePanel}
      </div>
      {/* Desktop: chat | file tree | code */}
      <div className="hidden lg:flex h-full">
        <div className="w-[380px] min-w-[260px] border-r border-border flex flex-col shrink-0">
          {chatPanel}
        </div>
        {viewMode === 'code' && (
          <div className="w-[260px] min-w-[180px] border-r border-border flex flex-col shrink-0">
            {fileTreePanel}
          </div>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          {codePanel}
        </div>
      </div>
    </>
  )
}

export default WorkspacePage
