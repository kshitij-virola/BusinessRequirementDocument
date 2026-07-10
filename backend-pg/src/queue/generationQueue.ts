import { Queue, Worker, Job } from 'bullmq'
import { prisma } from '../config/db'
import { aiService } from '../services/aiService'
import { storageService } from '../services/storageService'
import { creditService } from '../services/creditService'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const redisConnection = { url: env.redisUrl, maxRetriesPerRequest: null as null }

export let generationQueue: Queue

export const initGenerationQueue = (io?: import('socket.io').Server): void => {
  generationQueue = new Queue('generation', { connection: redisConnection })

  const worker = new Worker<{ generationId: string; userId: string }>(
    'generation',
    async (job: Job<{ generationId: string; userId: string }>) => {
      const { generationId, userId } = job.data
      const startTime = Date.now()

      const gen = await prisma.trooGeneration.findUnique({ where: { id: generationId } })
      if (!gen) throw new Error(`Generation ${generationId} not found`)

      await prisma.trooGeneration.update({ where: { id: generationId }, data: { status: 'processing' } })
      io?.to(userId).emit('generation:status', { id: generationId, status: 'processing' })

      logger.debug(`Processing generation ${generationId}`)

      let promptText = gen.prompt
      if (gen.inputMode === 'figma' && gen.figmaUrl) promptText = await aiService.fetchFigmaDesign(gen.figmaUrl)

      let imagesBase64: string[] = []

      if (gen.inputMode === 'image' && gen.imageKey) {
        try {
          const buf = await storageService.getObjectBuffer(gen.imageKey)
          imagesBase64 = [buf.toString('base64')]
        } catch (err: any) {
          logger.error(`Failed to load image from storage: ${err.message}`)
        }
      } else if (gen.imageKeys && gen.imageKeys.length > 0) {
        const results = await Promise.allSettled(
          gen.imageKeys.map((key) => storageService.getObjectBuffer(key))
        )
        imagesBase64 = results
          .filter((r): r is PromiseFulfilledResult<Buffer> => r.status === 'fulfilled')
          .map((r) => r.value.toString('base64'))
        const failed = results.filter((r) => r.status === 'rejected').length
        if (failed > 0) logger.error(`Failed to load ${failed}/${gen.imageKeys.length} attached images`)
      }

      const result = await aiService.generate({
        prompt: promptText,
        framework: gen.framework,
        inputMode: gen.inputMode,
        imagesBase64: imagesBase64.length > 0 ? imagesBase64 : undefined,
      })

      const zipBuffer = await storageService.packToZip(result.files)
      const key = `themes/${userId}/${generationId}/theme.zip`
      const zipUrl = await storageService.uploadBuffer(key, zipBuffer, 'application/zip')

      const processingTimeMs = Date.now() - startTime

      await prisma.trooGeneration.update({
        where: { id: generationId },
        data: {
          status: 'completed',
          outputCode: result.code,
          outputFiles: result.files,
          zipKey: key,
          zipUrl,
          tokensUsed: result.tokensUsed,
          creditsUsed: gen.creditsUsed,
          aiProvider: result.provider,
          aiModel: result.model,
          aiCostUsd: result.costUsd,
          processingTimeMs,
        },
      })

      await creditService.deduct(userId, gen.creditsUsed, `generation:${generationId}`)

      const user = await prisma.trooUser.findUnique({ where: { id: userId } })
      await prisma.trooAuditLog.create({
        data: {
          userId,
          actor: user?.email ?? userId,
          actorRole: user?.role ?? 'user',
          action: 'generation.complete',
          entityId: generationId,
          entityType: 'Generation',
          metadata: { tokensUsed: result.tokensUsed, costUsd: result.costUsd, processingTimeMs },
        },
      })

      io?.to(userId).emit('generation:status', { id: generationId, status: 'completed', zipUrl })
      logger.info(`Generation ${generationId} completed in ${processingTimeMs}ms`)
    },
    { connection: redisConnection, concurrency: 5 }
  )

  worker.on('failed', async (job: Job<{ generationId: string; userId: string }> | undefined, err: Error) => {
    if (!job) return
    const { generationId, userId } = job.data
    logger.error(`Generation ${generationId} failed:`, err)

    await prisma.trooGeneration.update({ where: { id: generationId }, data: { status: 'failed', errorMessage: err.message } })
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (user) await creditService.refund(userId, 1, `failed generation:${generationId}`)
    await prisma.trooAuditLog.create({ data: { userId, actor: user?.email ?? userId, actorRole: user?.role ?? 'user', action: 'generation.fail', entityId: generationId, entityType: 'Generation', metadata: { error: err.message } } })

    io?.to(userId).emit('generation:status', { id: generationId, status: 'failed', error: err.message })
  })

  logger.info('Generation queue initialized')
}
