import fs from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import { ChildProcess } from 'child_process'
import type { Framework } from '../../models/Workspace'
import { FRAMEWORK_CONFIGS } from './FrameworkConfigs'
import { getFreePort, spawnProcess, runToCompletion, killProcess } from './ProcessManager'
import { logger } from '../../utils/logger'
import { env } from '../../config/env'

export type PreviewStatus = 'installing' | 'starting' | 'running' | 'error' | 'stopped'

export interface PreviewFile {
  path: string
  content: string
}

interface PreviewSession {
  id: string
  framework: Framework
  dir: string
  port: number | null
  status: PreviewStatus
  logs: string[]
  error: string | null
  version: string
  process: ChildProcess | null
  lastAccess: number
  startedAt: number
}

const MAX_LOG_LINES = 300
const READY_TIMEOUT_MS = 4 * 60 * 1000 // installs can be slow on a cold cache
const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const SWEEP_INTERVAL_MS = 60 * 1000
const MAX_FILES = 500
const MAX_FILE_BYTES = 2 * 1024 * 1024

const PREVIEW_ROOT = path.join(os.tmpdir(), 'troo-ai-previews')

const sessions = new Map<string, PreviewSession>()

const sanitizeId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128)

/** Rejects absolute paths and `..` segments so generated content can't escape the preview dir. */
const sanitizeRelativePath = (rawPath: string): string | null => {
  const normalized = rawPath.replace(/^[/\\]+/, '').replace(/\\/g, '/')
  const segments = normalized.split('/')
  if (segments.some((s) => s === '..' || s === '')) return null
  if (normalized.length === 0 || normalized.length > 512) return null
  return normalized
}

const versionOf = (files: PreviewFile[]): string => {
  const size = files.reduce((sum, f) => sum + f.path.length + f.content.length, 0)
  return `${files.length}:${size}`
}

const appendLog = (session: PreviewSession, chunk: string): void => {
  const lines = chunk.split('\n').filter(Boolean)
  session.logs.push(...lines)
  if (session.logs.length > MAX_LOG_LINES) session.logs.splice(0, session.logs.length - MAX_LOG_LINES)
}

const writeFiles = async (dir: string, files: PreviewFile[]): Promise<void> => {
  await fs.promises.rm(dir, { recursive: true, force: true })
  for (const file of files) {
    const rel = sanitizeRelativePath(file.path)
    if (!rel) continue
    if (Buffer.byteLength(file.content, 'utf8') > MAX_FILE_BYTES) continue
    const abs = path.join(dir, rel)
    await fs.promises.mkdir(path.dirname(abs), { recursive: true })
    await fs.promises.writeFile(abs, file.content, 'utf8')
  }
}

const stopSession = async (session: PreviewSession): Promise<void> => {
  if (session.process) killProcess(session.process)
  if (session.framework === 'wordpress') {
    try {
      const { done } = runToCompletion(['docker', 'compose', '-p', session.id, 'down', '-v'], session.dir, () => {})
      await done
    } catch {
      // best-effort teardown
    }
  }
  session.status = 'stopped'
  session.process = null
  session.port = null
  await fs.promises.rm(session.dir, { recursive: true, force: true }).catch(() => {})
}

const startNodeFramework = (session: PreviewSession, framework: Framework, port: number): void => {
  const config = FRAMEWORK_CONFIGS[framework]
  const basePath = `/preview/${session.id}`
  const substitute = (argv: string[]) =>
    argv.map((a) => a.replace('{PORT}', String(port)).replace('{BASE_PATH}', basePath).replace('{BASE}', `${basePath}/`))

  const bootServer = () => {
    session.status = 'starting'
    const child = spawnProcess(substitute(config.start), session.dir)
    session.process = child
    child.stdout?.on('data', (buf) => {
      const text = buf.toString()
      appendLog(session, text)
      if (session.status === 'starting' && config.readyPattern.test(text)) session.status = 'running'
    })
    child.stderr?.on('data', (buf) => {
      const text = buf.toString()
      appendLog(session, text)
      if (session.status === 'starting' && config.readyPattern.test(text)) session.status = 'running'
    })
    child.on('close', (code) => {
      if (session.status !== 'stopped' && code !== 0) {
        session.status = 'error'
        session.error = `Dev server exited with code ${code}`
      }
    })
  }

  if (config.install.length > 0) {
    session.status = 'installing'
    const { child, done } = runToCompletion(config.install, session.dir, (line) => appendLog(session, line))
    session.process = child
    done.then((result) => {
      if (session.status === 'stopped') return
      if (result.code !== 0) {
        session.status = 'error'
        session.error = `Dependency install failed (exit code ${result.code})`
        return
      }
      bootServer()
    })
  } else {
    bootServer()
  }
}

const WORDPRESS_COMPOSE_TEMPLATE = (port: number, siteUrl: string): string => `services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: wordpress
      MYSQL_ROOT_PASSWORD: wordpress
      MYSQL_USER: wordpress
      MYSQL_PASSWORD: wordpress
  wordpress:
    image: wordpress:php8.2-apache
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "${port}:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_NAME: wordpress
      WORDPRESS_DB_USER: wordpress
      WORDPRESS_DB_PASSWORD: wordpress
      # Preview traffic reaches WordPress through the /preview/<id> reverse proxy
      # (see services/preview/proxyMiddleware.ts), so WP must emit links under that
      # prefix; the proxy strips the prefix again before forwarding requests here.
      WORDPRESS_CONFIG_EXTRA: |
        define('WP_SITEURL', '${siteUrl}');
        define('WP_HOME', '${siteUrl}');
    volumes:
      - ./theme:/var/www/html/wp-content/themes/generated-theme
`

const pollHttpReady = (port: number, deadline: number, onGiveUp: () => void, onReady: () => void): void => {
  const attempt = () => {
    const req = http.get({ host: '127.0.0.1', port, timeout: 3000 }, (res) => {
      res.destroy()
      onReady()
    })
    req.on('error', () => {
      if (Date.now() > deadline) onGiveUp()
      else setTimeout(attempt, 2000)
    })
    req.on('timeout', () => req.destroy())
  }
  attempt()
}

const startWordpress = async (session: PreviewSession, port: number): Promise<void> => {
  const dockerCheck = runToCompletion(['docker', '--version'], session.dir, () => {})
  const dockerResult = await dockerCheck.done
  if (dockerResult.code !== 0) {
    session.status = 'error'
    session.error = 'Docker is not available on this server; WordPress live preview requires Docker.'
    return
  }

  const siteUrl = `${env.backendUrl}/preview/${session.id}`
  await fs.promises.writeFile(path.join(session.dir, 'docker-compose.yml'), WORDPRESS_COMPOSE_TEMPLATE(port, siteUrl), 'utf8')

  session.status = 'starting'
  const { done } = runToCompletion(['docker', 'compose', '-p', session.id, 'up', '-d'], session.dir, (line) => appendLog(session, line))
  const result = await done
  if ((session.status as PreviewStatus) === 'stopped') return
  if (result.code !== 0) {
    session.status = 'error'
    session.error = `docker compose up failed (exit code ${result.code})`
    return
  }

  pollHttpReady(
    port,
    Date.now() + READY_TIMEOUT_MS,
    () => {
      if (session.status !== 'stopped') {
        session.status = 'error'
        session.error = 'Timed out waiting for WordPress to become reachable'
      }
    },
    () => {
      if (session.status !== 'stopped') session.status = 'running'
    }
  )
}

export const previewManager = {
  /** Starts (or reuses, if unchanged) a preview session for the given files. */
  async start(rawId: string, framework: Framework, files: PreviewFile[]): Promise<void> {
    if (files.length > MAX_FILES) throw new Error(`Too many files (max ${MAX_FILES})`)

    const id = sanitizeId(rawId)
    const version = versionOf(files)
    const existing = sessions.get(id)

    if (existing && existing.version === version && existing.status !== 'error' && existing.status !== 'stopped') {
      existing.lastAccess = Date.now()
      return
    }

    if (existing) await stopSession(existing)

    const dir = path.join(PREVIEW_ROOT, id)
    const targetDir = framework === 'wordpress' ? path.join(dir, 'theme') : dir
    await fs.promises.mkdir(dir, { recursive: true })
    await writeFiles(targetDir, files)

    const port = await getFreePort()
    const session: PreviewSession = {
      id,
      framework,
      dir,
      port,
      status: 'installing',
      logs: [],
      error: null,
      version,
      process: null,
      lastAccess: Date.now(),
      startedAt: Date.now(),
    }
    sessions.set(id, session)

    logger.info(`Starting ${framework} preview "${id}" on port ${port}`)

    if (framework === 'wordpress') {
      startWordpress(session, port).catch((err) => {
        session.status = 'error'
        session.error = err instanceof Error ? err.message : 'Unknown error'
      })
    } else {
      startNodeFramework(session, framework, port)
    }
  },

  status(rawId: string): { status: PreviewStatus; port: number | null; error: string | null; logs: string[] } | null {
    const session = sessions.get(sanitizeId(rawId))
    if (!session) return null
    session.lastAccess = Date.now()
    return { status: session.status, port: session.port, error: session.error, logs: session.logs.slice(-100) }
  },

  /**
   * Raw lookup used by the reverse proxy (services/preview/proxyMiddleware.ts).
   * `sessionKey` must be the exact sanitized id already stored in `sessions`
   * (the proxy receives it verbatim as a URL path segment, no re-sanitizing).
   */
  resolveProxyTarget(sessionKey: string): { port: number; framework: Framework } | null {
    const session = sessions.get(sessionKey)
    if (!session || session.status !== 'running' || !session.port) return null
    session.lastAccess = Date.now()
    return { port: session.port, framework: session.framework }
  },

  async stop(rawId: string): Promise<void> {
    const id = sanitizeId(rawId)
    const session = sessions.get(id)
    if (!session) return
    await stopSession(session)
    sessions.delete(id)
  },
}

setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    const timedOut =
      (session.status === 'installing' || session.status === 'starting') &&
      now - session.startedAt > READY_TIMEOUT_MS
    if (timedOut) {
      session.status = 'error'
      session.error = 'Timed out waiting for the dev server to become ready'
    }
    if (now - session.lastAccess > IDLE_TIMEOUT_MS) {
      stopSession(session)
        .then(() => sessions.delete(id))
        .catch((err) => logger.error(`Failed to clean up idle preview "${id}":`, err))
    }
  }
}, SWEEP_INTERVAL_MS).unref()
