import { Server as IOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verifyAccessToken } from '../utils/jwt'
import { env } from '../config/env'
import { logger } from '../utils/logger'

export const initSocket = (httpServer: HTTPServer): IOServer => {
  const io = new IOServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) { next(new Error('Authentication required')); return }
    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    socket.join(userId)
    logger.debug(`Socket connected: ${socket.id} (user: ${userId})`)

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}
