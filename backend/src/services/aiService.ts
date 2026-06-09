import OpenAI from 'openai'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export interface GenerateOptions {
  prompt: string
  framework: string
  inputMode: 'text' | 'figma' | 'image'
  figmaUrl?: string
  imagesBase64?: string[]
  systemPrompt?: string
}

export interface GenerateResult {
  code: string
  files: { path: string; content: string }[]
  tokensUsed: number
  model: string
  provider: string
  costUsd: number
}

const SYSTEM_PROMPT = `You are TROO AI, an expert frontend developer. Generate production-ready,
clean, well-structured, and fully responsive code for the requested framework.
Return ONLY a JSON object with the structure:
{ "files": [{ "path": "string", "content": "string" }] }
No explanations, only the JSON.`

const generateWithOpenAI = async (options: GenerateOptions): Promise<GenerateResult> => {
  if (!env.ai.openaiKey) throw new Error('OpenAI not configured')

  const client = new OpenAI({ apiKey: env.ai.openaiKey })

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: options.systemPrompt ?? SYSTEM_PROMPT },
  ]

  const images = options.imagesBase64 ?? []

  if (images.length > 0) {
    const imageParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = images.map((b64) => ({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${b64}` },
    }))

    const textPart: OpenAI.Chat.Completions.ChatCompletionContentPart =
      options.inputMode === 'image'
        ? { type: 'text', text: `Convert this UI design to ${options.framework} code. ${options.prompt}` }
        : { type: 'text', text: `Generate a ${options.framework} theme: ${options.prompt}\n\nReference images are attached above for visual context.` }

    messages.push({ role: 'user', content: [...imageParts, textPart] })
  } else {
    messages.push({
      role: 'user',
      content: `Generate a ${options.framework} theme: ${options.prompt}`,
    })
  }

  const model = 'gpt-4o'
  const response = await client.chat.completions.create({ model, messages, response_format: { type: 'json_object' } })
  const content = response.choices[0].message.content ?? '{}'
  const parsed = JSON.parse(content) as { files: { path: string; content: string }[] }
  const tokensUsed = response.usage?.total_tokens ?? 0
  const costUsd = (tokensUsed / 1000) * 0.005

  return {
    code: parsed.files?.[0]?.content ?? '',
    files: parsed.files ?? [],
    tokensUsed,
    model,
    provider: 'openai',
    costUsd,
  }
}

const generateWithAnthropic = async (options: GenerateOptions): Promise<GenerateResult> => {
  if (!env.ai.anthropicKey) throw new Error('Anthropic not configured')
  // Anthropic SDK integration placeholder
  throw new Error('Anthropic provider not yet configured')
}

export const aiService = {
  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const provider = env.ai.activeProvider
    logger.debug(`AI generation via ${provider} — prompt: ${options.prompt.slice(0, 60)}...`)

    try {
      if (provider === 'anthropic') return await generateWithAnthropic(options)
      return await generateWithOpenAI(options)
    } catch (err) {
      logger.error('AI generation error:', err)
      throw err
    }
  },

  async fetchFigmaDesign(figmaUrl: string): Promise<string> {
    if (!env.figmaApiToken) throw new Error('Figma API token not configured')
    const fileKeyMatch = figmaUrl.match(/figma\.com\/file\/([A-Za-z0-9]+)/)
    if (!fileKeyMatch) throw new Error('Invalid Figma URL')
    const fileKey = fileKeyMatch[1]
    const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': env.figmaApiToken },
    })
    if (!res.ok) throw new Error('Failed to fetch Figma file')
    const data = await res.json() as { name: string }
    return `Figma design: ${data.name}. Convert to production-ready HTML/CSS.`
  },
}
