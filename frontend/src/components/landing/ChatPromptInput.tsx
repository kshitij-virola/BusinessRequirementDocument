'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ChatPromptInput() {
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!prompt.trim() && images.length === 0) return
    router.push('/login')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setImages(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeImages = () => setImages([])

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative rounded-xl border border-border bg-card focus-within:border-violet-500/60 transition-colors">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder='Describe your theme (e.g. "Modern SaaS dashboard with dark mode")'
          className="w-full resize-none rounded-xl bg-transparent px-4 pt-4 pb-12 text-sm text-foreground placeholder:text-gray-500 focus:outline-none"
        />

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-secondary hover:text-gray-300 transition-colors"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upload image</span>
            </button>
            {images.length > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-violet-600/20 px-2 py-1 text-xs font-medium text-violet-300">
                {images.length} image{images.length > 1 ? 's' : ''}
                <button type="button" onClick={removeImages} className="ml-0.5 hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-600 hidden sm:block">Ctrl+Enter to send</p>
            <Button type="submit" size="sm" disabled={!prompt.trim() && images.length === 0}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
