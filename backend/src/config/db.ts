import mongoose from 'mongoose'
import { env } from './env'
import { logger } from '../utils/logger'

export const connectDB = async (): Promise<void> => {
  const maxRetries = 5
  const retryInterval = 5000 // 5 seconds
  let retries = 0

  while (retries < maxRetries) {
    try {
      if (retries > 0) logger.info(`Retrying MongoDB connection (attempt ${retries + 1}/${maxRetries})...`)
      else logger.info('Connecting to MongoDB...')
      
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 20000 })
      logger.info('MongoDB connected')

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err)
      })

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting reconnect')
      })
      
      return
    } catch (err) {
      retries++
      logger.error(`Failed to connect to MongoDB on attempt ${retries}/${maxRetries}:`, err)
      
      if (retries < maxRetries) {
        logger.info(`Waiting ${retryInterval / 1000}s before retrying...`)
        await new Promise((resolve) => setTimeout(resolve, retryInterval))
      } else {
        logger.error('All MongoDB connection attempts failed. Exiting.')
        process.exit(1)
      }
    }
  }
}
