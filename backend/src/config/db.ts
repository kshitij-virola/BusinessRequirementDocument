import mongoose from 'mongoose'
import { env } from './env'
import { logger } from '../utils/logger'

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.mongoUri)
    logger.info('MongoDB connected')

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect')
    })
  } catch (err) {
    logger.error('Failed to connect to MongoDB:', err)
    process.exit(1)
  }
}
