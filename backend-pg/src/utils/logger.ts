import winston from 'winston'
import { env } from '../config/env'

export const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, stack }) =>
            `${timestamp} [${level}]: ${stack ?? message}`
          )
        )
  ),
  transports: [
    new winston.transports.Console(),
    ...(env.nodeEnv === 'production'
      ? [new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
         new winston.transports.File({ filename: 'logs/combined.log' })]
      : []),
  ],
})
