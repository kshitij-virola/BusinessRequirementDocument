import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

// This datasource is the shared ai-theme-generator (Django) database, owned and
// migrated by that app. Routes in this service must stay read-only — no create/
// update/delete calls, and never run `prisma migrate`/`db push` against it.
export const prisma = new PrismaClient()

export const connectDB = async (): Promise<void> => {
  const maxRetries = 5
  const retryInterval = 5000 // 5 seconds
  let retries = 0

  while (retries < maxRetries) {
    try {
      if (retries > 0) logger.info(`Retrying PostgreSQL connection (attempt ${retries + 1}/${maxRetries})...`)
      else logger.info('Connecting to PostgreSQL...')

      await prisma.$connect()
      logger.info('PostgreSQL connected')
      return
    } catch (err) {
      retries++
      logger.error(`Failed to connect to PostgreSQL on attempt ${retries}/${maxRetries}:`, err)

      if (retries < maxRetries) {
        logger.info(`Waiting ${retryInterval / 1000}s before retrying...`)
        await new Promise((resolve) => setTimeout(resolve, retryInterval))
      } else {
        logger.error('All PostgreSQL connection attempts failed. Exiting.')
        process.exit(1)
      }
    }
  }
}
