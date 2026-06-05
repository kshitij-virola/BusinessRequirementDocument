import mongoose, { Schema, Document } from 'mongoose'
import type { MigrationModule } from '../migrate'

export const description = 'Seed default AI model configuration'

// Inline schema for config (avoids coupling to a model that may not exist yet)
interface IConfig extends Document {
  key: string
  value: unknown
  updatedAt: Date
}

const configSchema = new Schema<IConfig>(
  { key: { type: String, required: true, unique: true }, value: Schema.Types.Mixed },
  { timestamps: true }
)

// Safe model registration — avoids "Cannot overwrite model" if migration runs twice in same process
const getConfigModel = (): mongoose.Model<IConfig> => {
  return (mongoose.models['Config'] as mongoose.Model<IConfig> | undefined)
    ?? mongoose.model<IConfig>('Config', configSchema)
}

export const up = async (): Promise<void> => {
  const Config = getConfigModel()
  const configs = [
    {
      key: 'ai.activeProvider',
      value: 'openai',
    },
    {
      key: 'ai.providers',
      value: [
        { id: 'openai',    name: 'OpenAI',    model: 'gpt-4o',            status: 'active',   costPer1kTokens: 0.005 },
        { id: 'anthropic', name: 'Anthropic', model: 'claude-sonnet-4-6', status: 'standby',  costPer1kTokens: 0.003 },
        { id: 'gemini',    name: 'Gemini',    model: 'gemini-1.5-pro',    status: 'disabled', costPer1kTokens: 0.002 },
      ],
    },
    {
      key: 'ai.systemPrompt',
      value: `You are TROO AI, an expert frontend developer. Generate production-ready, clean, well-structured, and fully responsive code for the requested framework. Return ONLY a JSON object with the structure: { "files": [{ "path": "string", "content": "string" }] }. No explanations, only the JSON.`,
    },
    {
      key: 'ai.rateLimits',
      value: {
        maxTokensPerRequest:    4096,
        dailySpendLimitUsd:     50,
        maxConcurrentRequests:  10,
        timeoutSeconds:         60,
      },
    },
    {
      key: 'credits.costs',
      value: {
        textGeneration:  1,
        imageConversion: 5,
        figmaConversion: 10,
        themeExport:     2,
      },
    },
    {
      key: 'moderation.blockedPatterns',
      value: ['hack*', 'phishing*', 'malware*', 'exploit*'],
    },
  ]

  for (const c of configs) {
    await Config.findOneAndUpdate({ key: c.key }, c, { upsert: true, new: true })
    console.log(`  → Config set: ${c.key}`)
  }
}

export const down = async (): Promise<void> => {
  const Config = getConfigModel()
  await Config.deleteMany({ key: { $regex: /^ai\.|^credits\.|^moderation\./ } })
  console.log('  → Removed AI/credits/moderation config entries')
}

const _: MigrationModule = { description, up, down }
export default _
