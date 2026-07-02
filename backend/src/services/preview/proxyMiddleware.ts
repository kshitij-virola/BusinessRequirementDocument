import { Router, Request, Response, NextFunction } from 'express'
import type http from 'http'
import type net from 'net'
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware'
import { previewManager } from './PreviewManager'
import { logger } from '../../utils/logger'

// Frameworks whose dev server is told its own base path (--base / --base-href), so it
// already emits and expects paths under /preview/<sessionKey>/ — forward untouched.
const BASE_AWARE_FRAMEWORKS = new Set(['react', 'vue', 'angular'])

interface PreviewRequest extends http.IncomingMessage {
  previewSessionKey?: string
}

// This middleware is mounted at the app root (not via `app.use('/preview', ...)`) so that
// `req.url` keeps its full `/preview/<key>/...` shape all the way to the target — base-aware
// dev servers (Vite/Angular) are told `--base=/preview/<key>/`, so they must actually receive
// requests at that exact path to serve/generate matching asset URLs.
//
// Resolved once in `dispatch` and cached on the request, because pathRewrite mutates `req.url`
// in place — by the time the proxyRes/interceptor hooks run for html/wordpress, the prefix has
// already been stripped and re-parsing `req.url` would no longer find the session key.
const sessionKeyOf = (req: PreviewRequest): string | null => {
  if (req.previewSessionKey) return req.previewSessionKey
  const segments = (req.url ?? '').replace(/^\/+/, '').split('/')
  if (segments[0] !== 'preview' || !segments[1]) return null
  const key = decodeURIComponent(segments[1].split('?')[0])
  req.previewSessionKey = key
  return key
}

const stripSessionPrefix = (path: string, req: http.IncomingMessage): string => {
  const key = sessionKeyOf(req)
  if (!key) return path
  const rest = path.replace(new RegExp(`^/preview/${key}`), '')
  return rest.length > 0 ? rest : '/'
}

/** Injects <base href="/preview/<key>/"> so relative asset links survive the subpath proxy. */
const injectBaseTag = (html: string, sessionKey: string): string =>
  /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1><base href="/preview/${sessionKey}/">`)
    : html

// Vite/Angular dev servers already know their own base path and stream HMR/WS traffic —
// forward requests and upgrades unmodified for the fastest path.
const basePreservingProxy = createProxyMiddleware({
  ws: true,
  changeOrigin: true,
  router: (req) => {
    const key = sessionKeyOf(req)
    const target = key ? previewManager.resolveProxyTarget(key) : null
    if (!target) throw new Error('Preview session not found or not running')
    return `http://127.0.0.1:${target.port}`
  },
  on: {
    error: (err, req, res) => {
      logger.warn(`Preview proxy error: ${err.message}`)
      if ('writeHead' in res) {
        res.writeHead(502, { 'Content-Type': 'text/plain' })
        res.end('Preview is not available.')
      }
    },
  },
})

// `serve` (html) and WordPress don't support a base path, so the session's own files/routes
// live at the root — strip the /preview/<key> prefix before forwarding.
const prefixStrippingProxy = createProxyMiddleware({
  changeOrigin: true,
  pathRewrite: (path, req) => stripSessionPrefix(path, req),
  selfHandleResponse: true,
  router: (req) => {
    const key = sessionKeyOf(req)
    const target = key ? previewManager.resolveProxyTarget(key) : null
    if (!target) throw new Error('Preview session not found or not running')
    return `http://127.0.0.1:${target.port}`
  },
  on: {
    proxyRes: responseInterceptor(async (buffer, proxyRes, req) => {
      const contentType = proxyRes.headers['content-type'] ?? ''
      const key = sessionKeyOf(req)
      const target = key ? previewManager.resolveProxyTarget(key) : null
      if (target?.framework !== 'html' || !contentType.includes('text/html') || !key) return buffer
      return injectBaseTag(buffer.toString('utf8'), key)
    }),
    error: (err, req, res) => {
      logger.warn(`Preview proxy error: ${err.message}`)
      if ('writeHead' in res) {
        res.writeHead(502, { 'Content-Type': 'text/plain' })
        res.end('Preview is not available.')
      }
    },
  },
})

const dispatch = (req: Request, res: Response, next: NextFunction): void => {
  const key = sessionKeyOf(req)
  if (!key) { next(); return }
  const target = previewManager.resolveProxyTarget(key)
  if (!target) {
    res.status(502).type('text/plain').send('Preview is not running. Start it and try again.')
    return
  }
  const proxy = BASE_AWARE_FRAMEWORKS.has(target.framework) ? basePreservingProxy : prefixStrippingProxy
  proxy(req, res, next)
}

/**
 * Mounted at the app root (not `app.use('/preview', ...)`) so `req.url` keeps its full
 * `/preview/<key>/...` shape — see the comment on `sessionKeyOf` for why. Requests whose
 * path isn't `/preview/<key>/...` fall through to the rest of the app via `next()`.
 * Also registers the WS upgrade handler on the shared http.Server for HMR/live-reload,
 * scoped to `/preview/*` so it never intercepts Socket.IO's own upgrade handling.
 */
export const createPreviewProxy = (server: http.Server): Router => {
  server.on('upgrade', (req, socket, head) => {
    if ((req.url ?? '').startsWith('/preview/')) basePreservingProxy.upgrade(req, socket as net.Socket, head)
  })

  const router = Router()
  router.use(dispatch)
  return router
}
