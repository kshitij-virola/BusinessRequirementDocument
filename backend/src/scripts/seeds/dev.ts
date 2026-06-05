/**
 * Development seed script — populates DB with realistic dummy data for testing.
 * WARNING: Clears existing data. Do NOT run in production.
 *
 * Usage: npx ts-node src/scripts/seeds/dev.ts
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../../models/User'
import { Workspace } from '../../models/Workspace'
import { Generation } from '../../models/Generation'
import { AuditLog } from '../../models/AuditLog'
import { Token } from '../../models/Token'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

if (env.nodeEnv === 'production') {
  console.error('❌ Seed script cannot run in production!')
  process.exit(1)
}

async function seed(): Promise<void> {
  await mongoose.connect(env.mongoUri)
  logger.info('Connected — seeding dev data...')

  // Clear existing data (dev only)
  await Promise.all([
    User.deleteMany({ email: { $ne: 'admin@trooai.com' } }),
    Workspace.deleteMany({}),
    Generation.deleteMany({}),
    AuditLog.deleteMany({}),
    Token.deleteMany({}),
  ])
  logger.info('Cleared existing dev data')

  // ── Users ────────────────────────────────────────────────────────────────────
  // insertMany bypasses Mongoose pre-save hooks, so hash passwords manually.
  const hashedPassword = await bcrypt.hash('Test1234!', 12)

  const [freeUser, proUser, agencyUser] = await User.insertMany([
    {
      name:            'Alice Johnson',
      email:           'alice@example.com',
      password:        hashedPassword,
      role:            'user',
      isEmailVerified: true,
      subscription:    { plan: 'free',   status: 'active' },
      credits:         { remaining: 13,   used: 12, resetAt: new Date(Date.now() + 18 * 24 * 3600000) },
      storage:         { usedBytes: 2.4 * 1024 * 1024, limitBytes: 500 * 1024 * 1024 },
    },
    {
      name:            'Bob Smith',
      email:           'bob@example.com',
      password:        hashedPassword,
      role:            'user',
      isEmailVerified: true,
      subscription:    { plan: 'pro',    status: 'active' },
      credits:         { remaining: 420,  used: 80,  resetAt: new Date(Date.now() + 22 * 24 * 3600000) },
      storage:         { usedBytes: 1.8 * 1024 * 1024 * 1024, limitBytes: 10 * 1024 * 1024 * 1024 },
    },
    {
      name:            'Carol White',
      email:           'carol@example.com',
      password:        hashedPassword,
      role:            'user',
      isEmailVerified: true,
      isSuspended:     false,
      subscription:    { plan: 'agency', status: 'active' },
      credits:         { remaining: 4200, used: 800, resetAt: new Date(Date.now() + 10 * 24 * 3600000) },
      storage:         { usedBytes: 12 * 1024 * 1024 * 1024, limitBytes: 100 * 1024 * 1024 * 1024 },
    },
  ])

  logger.info(`Created 3 test users: alice / bob / carol (password: Test1234!)`)

  // ── Workspaces ────────────────────────────────────────────────────────────────

  const [ws1, ws2, ws3, ws4] = await Workspace.insertMany([
    { userId: freeUser._id,   name: 'Portfolio Site',         framework: 'html',    status: 'active',   currentVersion: 2, totalGenerations: 2 },
    { userId: proUser._id,    name: 'SaaS Dashboard Theme',   framework: 'react',   status: 'active',   currentVersion: 3, totalGenerations: 3 },
    { userId: proUser._id,    name: 'Landing Page Template',  framework: 'html',    status: 'active',   currentVersion: 1, totalGenerations: 1 },
    { userId: agencyUser._id, name: 'E-commerce Storefront',  framework: 'vue',     status: 'active',   currentVersion: 4, totalGenerations: 4 },
  ])

  logger.info('Created 4 workspaces')

  // ── Generations ───────────────────────────────────────────────────────────────

  const sampleCode = `import { useState } from 'react'

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <aside className="w-64 border-r border-gray-800 p-6">
        <h1 className="text-xl font-bold text-violet-400">TROO AI</h1>
        <nav className="mt-8 space-y-2">
          {['Dashboard', 'Projects', 'Settings'].map((item) => (
            <a key={item} href="#" className="block px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white">
              {item}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold">Welcome back!</h2>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[{ label: 'Projects', value: '12' }, { label: 'Credits', value: '420' }, { label: 'Downloads', value: '8' }].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400 text-sm">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}`

  const now = Date.now()

  await Generation.insertMany([
    // Alice — free user — portfolio
    {
      userId: freeUser._id, workspaceId: ws1._id, version: 1,
      prompt: 'Create a clean portfolio site with dark background', framework: 'html', inputMode: 'text',
      status: 'completed', outputCode: '<html>...</html>', creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.012, tokensUsed: 2400, processingTimeMs: 8200,
      createdAt: new Date(now - 2 * 24 * 3600000),
    },
    {
      userId: freeUser._id, workspaceId: ws1._id, version: 2,
      prompt: 'Add a projects section with card grid', framework: 'html', inputMode: 'text',
      status: 'completed', outputCode: '<html>...</html>', creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.010, tokensUsed: 2100, processingTimeMs: 7100,
      createdAt: new Date(now - 1 * 24 * 3600000),
    },
    // Bob — pro user — SaaS dashboard
    {
      userId: proUser._id, workspaceId: ws2._id, version: 1,
      prompt: 'Create a modern SaaS dashboard with sidebar navigation and analytics charts',
      framework: 'react', inputMode: 'text',
      status: 'completed', outputCode: sampleCode,
      outputFiles: [
        { path: 'src/App.tsx',                content: sampleCode },
        { path: 'src/components/Sidebar.tsx', content: '// Sidebar component' },
        { path: 'tailwind.config.js',         content: 'module.exports = { content: ["./src/**/*.tsx"] }' },
      ],
      creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.018, tokensUsed: 3600, processingTimeMs: 12400,
      createdAt: new Date(now - 3 * 24 * 3600000),
    },
    {
      userId: proUser._id, workspaceId: ws2._id, version: 2,
      prompt: 'Add a notifications dropdown to the header',
      framework: 'react', inputMode: 'text',
      status: 'completed', outputCode: sampleCode,
      creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.015, tokensUsed: 3000, processingTimeMs: 9800,
      createdAt: new Date(now - 2 * 24 * 3600000),
    },
    {
      userId: proUser._id, workspaceId: ws2._id, version: 3,
      prompt: 'Make the sidebar collapsible on mobile',
      framework: 'react', inputMode: 'text',
      status: 'failed', errorMessage: 'AI generation timeout',
      creditsUsed: 0, aiProvider: 'openai', aiModel: 'gpt-4o',
      createdAt: new Date(now - 1 * 24 * 3600000),
    },
    // Bob — landing page
    {
      userId: proUser._id, workspaceId: ws3._id, version: 1,
      prompt: 'Build a SaaS landing page with hero, features, and pricing sections',
      framework: 'html', inputMode: 'text',
      status: 'completed', outputCode: '<html>...</html>',
      creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.016, tokensUsed: 3200, processingTimeMs: 11000,
      createdAt: new Date(now - 5 * 24 * 3600000),
    },
    // Carol — agency — e-commerce
    {
      userId: agencyUser._id, workspaceId: ws4._id, version: 1,
      prompt: 'Create an e-commerce product listing page with filters and cart',
      framework: 'vue', inputMode: 'text',
      status: 'completed', outputCode: '<template>...</template>',
      creditsUsed: 1, aiProvider: 'openai', aiModel: 'gpt-4o',
      aiCostUsd: 0.020, tokensUsed: 4000, processingTimeMs: 14200,
      createdAt: new Date(now - 6 * 24 * 3600000),
    },
  ])

  logger.info('Created 7 generations (completed / failed)')

  // ── Audit logs ────────────────────────────────────────────────────────────────

  await AuditLog.insertMany([
    { userId: freeUser._id,   actor: 'alice@example.com', actorRole: 'user',  action: 'user.register',      createdAt: new Date(now - 7 * 24 * 3600000) },
    { userId: freeUser._id,   actor: 'alice@example.com', actorRole: 'user',  action: 'workspace.create',   entityId: String(ws1._id), entityType: 'Workspace', createdAt: new Date(now - 6 * 24 * 3600000) },
    { userId: proUser._id,    actor: 'bob@example.com',   actorRole: 'user',  action: 'user.register',      createdAt: new Date(now - 5 * 24 * 3600000) },
    { userId: proUser._id,    actor: 'bob@example.com',   actorRole: 'user',  action: 'subscription.create', metadata: { plan: 'pro' }, createdAt: new Date(now - 4 * 24 * 3600000) },
    { userId: proUser._id,    actor: 'bob@example.com',   actorRole: 'user',  action: 'generation.start',   entityId: String(ws2._id), createdAt: new Date(now - 3 * 24 * 3600000) },
    { userId: proUser._id,    actor: 'bob@example.com',   actorRole: 'user',  action: 'credits.deduct',     metadata: { amount: 1, reason: 'generation' }, createdAt: new Date(now - 2 * 24 * 3600000) },
    { userId: agencyUser._id, actor: 'carol@example.com', actorRole: 'user',  action: 'user.register',      createdAt: new Date(now - 10 * 24 * 3600000) },
    { actor: 'stripe',        actorRole: 'system',        action: 'payment.success', metadata: { amount: 2900, currency: 'usd' }, createdAt: new Date(now - 3 * 24 * 3600000) },
  ])

  logger.info('Created audit log entries')

  logger.info(`
✓ Dev seed complete!

Test accounts (password: Test1234!):
  alice@example.com — Free plan  (13 credits remaining)
  bob@example.com   — Pro plan   (420 credits remaining)
  carol@example.com — Agency plan (4200 credits remaining)
  admin@trooai.com  — Super Admin (run migrations first)
`)
}

seed()
  .then(() => mongoose.disconnect())
  .catch((err) => { logger.error('Seed failed:', err); process.exit(1) })
