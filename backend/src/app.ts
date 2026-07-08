import path from 'path'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import passport from 'passport'

import { env } from './config/env'
import { connectDB } from './config/db'
import { logger } from './utils/logger'
import { errorHandler, notFound } from './middleware/errorHandler'
import { initSocket } from './socket'
import { initGenerationQueue } from './queue/generationQueue'
import { createPreviewProxy } from './services/preview/proxyMiddleware'

// Routes
import authRoutes          from './routes/auth'
import workspaceRoutes     from './routes/workspaces'
import projectRoutes       from './routes/projects'
import generationRoutes    from './routes/generations'
import previewRoutes       from './routes/preview'
import dashboardRoutes     from './routes/dashboard'
import billingRoutes       from './routes/billing'
import adminUserRoutes     from './routes/admin/users'
import adminAdminRoutes    from './routes/admin/admins'
import adminPlanRoutes     from './routes/admin/plans'
import adminStatsRoutes    from './routes/admin/stats'
import adminLogRoutes      from './routes/admin/auditLogs'
import adminAIConfigRoutes from './routes/admin/aiConfig'
import adminSettingsRoutes from './routes/admin/platformSettings'

const app = express()
const server = http.createServer(app)

// ── Preview reverse proxy ──────────────────────────────────────────────────────
// Mounted at the root (not '/preview') so `req.url` keeps its full path for base-aware
// dev servers — see proxyMiddleware.ts. Also ahead of helmet/CORS/body-parsing: proxied
// dev-server traffic (arbitrary generated HTML/JS/CSS) shouldn't inherit API-oriented
// CSP/frame-guard headers (which would block iframe embedding) or have its body stream
// consumed by express.json(). Requests outside `/preview/<key>/...` fall through untouched.
app.use(createPreviewProxy(server))

// ── Security & parsing ─────────────────────────────────────────────────────────
app.use(helmet())

// Accept the configured client URL plus common dev ports
const allowedOrigins = [
  env.clientUrl,
  'http://localhost:3000',
  'http://localhost:3100',
  'http://localhost:3001',
]
app.use(cors({
  origin: (origin, cb) => {
    // Allow server-side fetch (no origin header) and allowed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(cookieParser())
app.use(passport.initialize())

// Raw body for Stripe webhooks (must come before express.json)
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── Rate limiting ──────────────────────────────────────────────────────────────
// In development, use very generous limits so normal browser usage never hits them.
// In production, these values come from env vars (default: 100 req/15 min).
const isDev = env.nodeEnv !== 'production'

const limiter = rateLimit({
  windowMs: isDev ? 60_000 : env.rateLimit.windowMs,   // 1 min window in dev
  max:      isDev ? 500    : env.rateLimit.max,          // 500 req/min in dev
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isDev ? false : false,                    // placeholder — set skip() for IP allowlists
  message: { success: false, message: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: isDev ? 60_000 : 15 * 60 * 1000,  // 1 min window in dev
  max:      isDev ? 50     : 20,               // 50 auth attempts/min in dev
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
})

app.use('/api', limiter)
app.use('/api/auth', authLimiter)

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }))

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes)
app.use('/api/workspaces',      workspaceRoutes)
app.use('/api/projects',        projectRoutes)
app.use('/api/generations',     generationRoutes)
app.use('/api/preview',         previewRoutes)
app.use('/api/dashboard',       dashboardRoutes)
app.use('/api/billing',         billingRoutes)
app.use('/api/admin/users',     adminUserRoutes)
app.use('/api/admin/admins',    adminAdminRoutes)
app.use('/api/admin/plans',     adminPlanRoutes)
app.use('/api/admin/stats',     adminStatsRoutes)
app.use('/api/admin/logs',      adminLogRoutes)
app.use('/api/admin/ai-config', adminAIConfigRoutes)
app.use('/api/admin/settings',  adminSettingsRoutes)

// ── 404 + error handler ───────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const bootstrap = async (): Promise<void> => {
  await connectDB()

  const io = initSocket(server)
  initGenerationQueue(io)

  server.listen(env.port, () => {
    logger.info(`TROO AI API running on port ${env.port} (${env.nodeEnv})`)
  })
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.error('Bootstrap failed:', err)
    process.exit(1)
  })
}

export { app, server }
