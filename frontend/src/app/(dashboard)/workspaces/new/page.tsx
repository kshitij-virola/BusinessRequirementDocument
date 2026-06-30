'use client'
import { useState, useRef, useTransition, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Send, Code2, Globe, LayoutTemplate, Sparkles, ArrowLeft, Link2, ImageIcon, MessageSquare, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { workspacesApi } from '@/lib/api/workspaces'
import { generationsApi } from '@/lib/api/generations'
import { invalidateWorkspaces, invalidateDashboard } from '@/lib/api/hooks'
import { frameworks } from '@/lib/constant'

export const dynamic = 'force-dynamic'

type InputMode = 'text' | 'figma' | 'image'

const promptSuggestions = [
  'Create a modern SaaS dashboard with sidebar navigation and analytics charts',
  'Build a landing page with hero section, features grid, and pricing cards',
  'Design an e-commerce product listing page with filters and cart',
  'Generate a blog homepage with featured posts and newsletter signup',
]

const inputModes: { id: InputMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'text',  label: 'Text Prompt', icon: MessageSquare, description: 'Describe the theme in plain text' },
  { id: 'figma', label: 'Figma URL',   icon: Link2,         description: 'Convert a Figma design to code' },
  { id: 'image', label: 'Image',       icon: ImageIcon,     description: 'Upload a screenshot or UI image' },
]

const NewWorkspacePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') ?? undefined
  const [prompt, setPrompt] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [selectedFramework, setSelectedFramework] = useState('react')
  const [apiError, setApiError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setUploadedImage(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  })

  const isReady = () => {
    if (inputMode === 'text')  return prompt.trim().length > 0
    if (inputMode === 'figma') return figmaUrl.startsWith('https://www.figma.com/')
    if (inputMode === 'image') return !!uploadedImage
    return false
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!isReady()) return
    setApiError(null)

    startTransition(async () => {
      try {
        // 1. Create workspace
        const workspace = await workspacesApi.create({
          name:      inputMode === 'figma' ? 'Figma Import' : inputMode === 'image' ? 'Image Import' : prompt.slice(0, 60),
          framework: selectedFramework,
          projectId,
        })

        // 2. Enqueue generation
        await generationsApi.generate({
          workspaceId: workspace._id,
          prompt:      inputMode === 'text'  ? prompt   : inputMode === 'figma' ? figmaUrl : `Convert this image to ${selectedFramework}`,
          framework:   selectedFramework,
          inputMode,
          figmaUrl:    inputMode === 'figma' ? figmaUrl : undefined,
        })

        await invalidateWorkspaces()
        await invalidateDashboard()
        router.push(`/workspaces/${workspace._id}`)
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
        <Link href="/workspaces">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Chat</h1>
          <p className="text-sm text-gray-400">Choose how to generate your theme</p>
        </div>
      </div>

      {/* Input mode tabs */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {inputModes.map(({ id, label, icon: Icon, description }) => (
          <button key={id} type="button" onClick={() => setInputMode(id)}
            className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 sm:p-4 text-center transition-all',
              inputMode === id ? 'border-primary bg-primary/10' : 'border-[#2a2a3e] bg-[#16162a] hover:border-gray-600 hover:bg-[#1e1e2e]'
            )}>
            <Icon className={cn('h-5 w-5', inputMode === id ? 'text-primary' : 'text-gray-400')} />
            <span className={cn('text-xs sm:text-sm font-medium', inputMode === id ? 'text-primary' : 'text-white')}>{label}</span>
            <span className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">{description}</span>
          </button>
        ))}
      </div>

      {/* Framework */}
      <div className="rounded-xl border border-[#2a2a3e] bg-[#16162a] p-4 sm:p-5 space-y-3">
        <p className="text-sm font-medium text-gray-300">Target Framework</p>
        <div className="flex flex-wrap gap-2">
          {frameworks?.map((fw) => (
            <button key={fw.id} type="button" onClick={() => setSelectedFramework(fw.id)}
              className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                selectedFramework === fw.id ? 'border-primary bg-primary/20 text-primary' : 'border-[#2a2a3e] text-gray-400 hover:border-gray-500 hover:text-white'
              )}>
              {fw.icon ? <span>{fw.icon}</span> : <img src={fw.img} alt={fw.label} height="20" width="20" />}{fw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {apiError && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{apiError}</p>}

      {/* Text mode */}
      {inputMode === 'text' && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />Suggestions
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {promptSuggestions.map((s) => (
                <button key={s} type="button" onClick={() => { setPrompt(s); textareaRef.current?.focus() }}
                  className="text-left rounded-lg border border-[#2a2a3e] bg-[#16162a] px-3 py-2 text-sm text-gray-400 hover:border-primary/50 hover:text-gray-200 hover:bg-[#1a1a2e] transition-colors line-clamp-2">
                  {s}
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-xl border border-[#2a2a3e] bg-[#16162a] focus-within:border-primary/60 transition-colors">
              <textarea ref={textareaRef} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown} rows={4}
                placeholder="Describe the theme you want to create..."
                className="w-full resize-none rounded-xl bg-transparent px-4 pt-4 pb-14 text-sm text-white placeholder:text-gray-500 focus:outline-none" />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className="text-xs text-gray-600 hidden sm:block">Ctrl+Enter</span>
                <Button type="submit" size="sm" loading={isPending} disabled={!prompt.trim()}>
                  <Send className="h-3.5 w-3.5" />Generate
                </Button>
              </div>
            </div>
          </form>
        </>
      )}

      {/* Figma mode */}
      {inputMode === 'figma' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#2a2a3e] bg-[#16162a] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-white">Paste Figma URL</p>
            </div>
            <Input value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}
              placeholder="https://www.figma.com/file/..."
              hint="Share the Figma file URL — must be publicly viewable"
              error={figmaUrl && !figmaUrl.startsWith('https://www.figma.com/') ? 'Please enter a valid Figma URL' : undefined} />
            <ul className="space-y-1 text-xs text-gray-500">
              <li>• Open your Figma file &rarr; Share &rarr; Copy link</li>
              <li>• Costs <span className="text-amber-400 font-medium">10 credits</span> per conversion</li>
            </ul>
          </div>
          <Button fullWidth loading={isPending} disabled={!figmaUrl.startsWith('https://www.figma.com/')} onClick={() => handleSubmit()}>
            <Code2 className="h-4 w-4" />Convert Figma to Code
          </Button>
        </div>
      )}

      {/* Image mode */}
      {inputMode === 'image' && (
        <div className="space-y-4">
          {!imagePreview ? (
            <div {...getRootProps()}
              className={cn('rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all',
                isDragActive ? 'border-primary bg-primary/10' : 'border-[#2a2a3e] hover:border-primary/50 hover:bg-[#1a1a2e]'
              )}>
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{isDragActive ? 'Drop your image here' : 'Drag & drop an image'}</p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse &middot; PNG, JPG, WEBP</p>
                </div>
                <p className="text-xs text-amber-400">Costs <span className="font-medium">5 credits</span> per conversion</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[#2a2a3e] bg-[#16162a] overflow-hidden">
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full max-h-64 object-contain bg-[#0d0d1a]" />
                <button type="button" onClick={() => { setUploadedImage(null); setImagePreview(null) }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white">{uploadedImage?.name}</p>
                <Globe className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          )}
          <Button fullWidth loading={isPending} disabled={!uploadedImage} onClick={() => handleSubmit()}>
            <LayoutTemplate className="h-4 w-4" />Convert Image to Code
          </Button>
        </div>
      )}
    </div>
  )
}

export default NewWorkspacePage;
