import mongoose, { Document, Schema } from 'mongoose'
import type { Framework } from './Workspace'

export type InputMode = 'text' | 'figma' | 'image'
export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface IGeneration extends Document {
  userId: mongoose.Types.ObjectId
  workspaceId: mongoose.Types.ObjectId
  threadId?: string
  projectId?: string
  version: number
  prompt: string
  framework: Framework
  inputMode: InputMode
  figmaUrl?: string
  imageKey?: string
  imageKeys?: string[]
  status: GenerationStatus
  outputCode?: string
  outputFiles?: { path: string; content: string }[]
  zipKey?: string
  zipUrl?: string
  tokensUsed: number
  creditsUsed: number
  aiProvider: string
  aiModel: string
  aiCostUsd: number
  filesCount?: number
  errorMessage?: string
  processingTimeMs?: number
  createdAt: Date
  updatedAt: Date
}

const generationSchema = new Schema<IGeneration>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User',      required: true, index: true },
    workspaceId:    { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    threadId:       { type: String, index: true },
    projectId:      { type: String, index: true },
    version:        { type: Number, required: true },
    prompt:         { type: String, required: true },
    framework:      { type: String, enum: ['react', 'vue', 'angular', 'html', 'wordpress'], required: true },
    inputMode:      { type: String, enum: ['text', 'figma', 'image'], default: 'text' },
    figmaUrl:       { type: String },
    imageKey:       { type: String },
    imageKeys:      { type: [String], default: undefined },
    status:         { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
    outputCode:     { type: String },
    outputFiles:    [{ path: String, content: String }],
    zipKey:         { type: String },
    zipUrl:         { type: String },
    tokensUsed:     { type: Number, default: 0 },
    creditsUsed:    { type: Number, default: 0 },
    aiProvider:     { type: String, default: 'openai' },
    aiModel:        { type: String, default: 'gpt-4o' },
    aiCostUsd:      { type: Number, default: 0 },
    filesCount:     { type: Number },
    errorMessage:   { type: String },
    processingTimeMs: { type: Number },
  },
  { timestamps: true }
)

generationSchema.index({ userId: 1, createdAt: -1 })
generationSchema.index({ workspaceId: 1, version: 1 })

export const Generation = mongoose.model<IGeneration>('Generation', generationSchema)
