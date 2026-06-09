'use client'
import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Sparkles, ArrowLeft, ImageIcon, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { workspacesApi } from '@/lib/api/workspaces'
import { generationsApi } from '@/lib/api/generations'
import { invalidateWorkspaces, invalidateDashboard } from '@/lib/api/hooks'

export const dynamic = 'force-dynamic'

const promptSuggestions = [
  'Create a modern SaaS dashboard with sidebar navigation and analytics charts',
  'Build a landing page with hero section, features grid, and pricing cards',
  'Design an e-commerce product listing page with filters and cart',
  'Generate a blog homepage with featured posts and newsletter signup',
]

const NewWorkspacePage = () => {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [attachedImages, setAttachedImages] = useState<File[]>([])
  const [attachedPreviews, setAttachedPreviews] = useState<string[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () =>
        setAttachedPreviews((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
    setAttachedImages((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removeAttachedImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index))
    setAttachedPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim()) return
    setApiError(null)

    startTransition(async () => {
      try {
        const workspace = await workspacesApi.create({
          name:      prompt.slice(0, 60),
          framework: 'react',
        })

        await generationsApi.generate({
          workspaceId: workspace._id,
          prompt,
          framework:   'react',
          inputMode:   'text',
          images:      attachedImages.length > 0 ? attachedImages : undefined,
        })

        await invalidateWorkspaces()
        await invalidateDashboard()
        router.push(`/dashboard/workspaces/${workspace._id}`)
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setApiError(msg ?? 'Something went wrong. Please try again.')
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/workspaces">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Chat</h1>
          <p className="text-sm text-gray-400">Describe the theme you want to generate</p>
        </div>
      </div>

      {/* Error */}
      {apiError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{apiError}</p>}

      <div>
        <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />Suggestions
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {promptSuggestions.map((s) => (
            <button key={s} type="button" onClick={() => { setPrompt(s); textareaRef.current?.focus() }}
              className="text-left rounded-lg border border-border bg-card px-3 py-2 text-sm text-gray-400 hover:border-violet-500/50 hover:text-gray-200 hover:bg-secondary transition-colors line-clamp-2">
              {s}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative rounded-xl border border-border bg-card focus-within:border-violet-500/60 transition-colors">
          {attachedPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {attachedPreviews.map((src, i) => (
                <div key={i} className="relative group">
                  <img src={src} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />
                  <button type="button" onClick={() => removeAttachedImage(i)}
                    className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown} rows={4}
            placeholder="Describe the theme you want to create..."
            className="w-full resize-none rounded-xl bg-transparent px-4 pt-4 pb-14 text-sm text-foreground placeholder:text-gray-500 focus:outline-none" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors"
                title="Attach images">
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 hidden sm:block">Ctrl+Enter</span>
              <Button type="submit" size="sm" loading={isPending} disabled={!prompt.trim()}>
                <Send className="h-3.5 w-3.5" />Generate
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default NewWorkspacePage;
