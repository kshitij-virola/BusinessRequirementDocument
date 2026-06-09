'use client'
import { useState, useRef, useEffect, useTransition, use } from 'react'
import { Send, Download, RotateCcw, ChevronDown, Code, Eye, ChevronLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
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
}

const mockInitialMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Create a modern SaaS dashboard with sidebar navigation and analytics charts using React and Tailwind CSS.',
  },
  {
    id: '2',
    role: 'assistant',
    content: "I've generated a modern SaaS dashboard theme for React with Tailwind CSS. The theme includes a responsive sidebar, header with notifications, and an analytics overview section.",
    language: 'tsx',
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
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400
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
                      <div key={stat.label}
                        className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p className="text-2xl font-bold mt-2">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </main>
              </div>
            )
          }`,
    status: 'done',
    credits: 1,
  },
]

type ViewMode = 'code' | 'preview'
type MobileTab = 'chat' | 'code'

const WorkspacePage = ({ params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const params = use(paramsPromise)
  const [messages, setMessages] = useState<Message[]>(mockInitialMessages)
  const [prompt, setPrompt] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('code')
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat')
  const [copied, setCopied] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const latestCode = [...messages].reverse().find((m) => m.code)
  const latestCodeStr = latestCode?.code ?? ''
  const latestLang = latestCode?.language ?? 'tsx'

  const copyCode = () => {
    navigator.clipboard.writeText(latestCodeStr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim() || isPending) return

    // Demo: show limit modal after 3 user messages
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
                  content: `I've updated the theme based on: "${userMsg.content}"`,
                  code: `// Updated: ${userMsg.content}\nexport default function Updated() {\n  return (\n    <div className="p-4 rounded-xl bg-gray-900 text-foreground">\n      <h1 className="text-2xl font-bold">Updated Theme</h1>\n      <p className="text-gray-400 mt-2">Generated from your prompt.</p>\n    </div>\n  )\n}`,
                  language: 'tsx',
                  status: 'done',
                  credits: 1,
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard/workspaces" className="text-gray-400 hover:text-foreground shrink-0 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">SaaS Dashboard Theme</p>
            <p className="text-xs text-gray-500 hidden sm:block">React &middot; v3 &middot; #{params.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setMobileTab('code')}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-secondary hover:text-foreground transition-colors lg:hidden">
            <Code className="h-3.5 w-3.5" /><span>Code</span>
          </button>
          <VersionHistoryButton workspaceId={params.id} />
          <WorkspaceActionsMenu workspaceId={params.id} name="SaaS Dashboard Theme" status="active" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex gap-2 sm:gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">AI</div>
            )}
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3 sm:px-4 py-2.5 text-sm',
              msg.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-secondary text-gray-200 rounded-bl-sm'
            )}>
              {msg.status === 'generating' ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="inline-flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                  Generating...
                </span>
              ) : (
                <>
                  <p>{msg.content}</p>
                  {msg.credits !== undefined && <p className="mt-1 text-xs opacity-60">{msg.credits} credit used</p>}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative rounded-xl border border-border bg-card focus-within:border-violet-500/60 transition-colors">
            <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown} rows={2} placeholder="Refine or modify the theme..."
              className="w-full resize-none rounded-xl bg-transparent px-3 pt-3 pb-10 text-sm text-foreground placeholder:text-gray-500 focus:outline-none" />
            <div className="absolute bottom-2 right-2">
              <Button type="submit" size="sm" loading={isPending} disabled={!prompt.trim() || isPending}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  // ── Code panel ───────────────────────────────────────────────────────────────
  const codePanel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-3 sm:px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMobileTab('chat')}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-secondary hover:text-foreground transition-colors lg:hidden">
            <ChevronLeft className="h-3.5 w-3.5" />Chat
          </button>
          <div className="flex rounded-lg border border-border p-0.5">
            {(['code', 'preview'] as ViewMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => setViewMode(mode)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 sm:px-3 py-1 text-xs font-medium transition-colors',
                  viewMode === mode ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-foreground'
                )}>
                {mode === 'code' ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="hidden sm:inline ml-0.5 capitalize">{mode}</span>
              </button>
            ))}
          </div>
          {latestCode && <Badge variant="success" className="hidden sm:inline-flex">v{3}</Badge>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={copyCode} title="Copy code"
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button type="button" title="Regenerate"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <Button size="sm" className="rounded-none border-0 px-2 sm:px-3 text-xs">
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1">Export ZIP</span>
            </Button>
            <button type="button"
              className="flex items-center border-l border-violet-700 bg-violet-600 px-1 py-2 text-white hover:bg-violet-700 transition-colors">
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'code' ? (
        <div className="flex-1 overflow-auto bg-background">
          {latestCodeStr ? (
            <SyntaxHighlighter
              language={latestLang}
              style={atomOneDark}
              customStyle={{ background: 'transparent', padding: '1rem', fontSize: '12px', margin: 0, height: '100%' }}
              showLineNumbers
              lineNumberStyle={{ color: '#4a4a6a', minWidth: '2.5em' }}
            >
              {latestCodeStr}
            </SyntaxHighlighter>
          ) : (
            <p className="p-4 text-sm text-gray-500">No code generated yet.</p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="text-center text-gray-500 px-4">
            <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Live preview available after backend connection.</p>
          </div>
        </div>
      )}
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
      {/* Desktop */}
      <div className="hidden lg:flex h-full">
        <div className="w-[42%] min-w-[280px] border-r border-border flex flex-col">{chatPanel}</div>
        <div className="flex-1 flex flex-col">{codePanel}</div>
      </div>
    </>
  )
}

export default WorkspacePage;
