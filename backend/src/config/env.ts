import dotenv from 'dotenv'
dotenv.config()

const required = (key: string): string => {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env variable: ${key}`)
  return val
}

const optional = (key: string, fallback = ''): string => {
  return process.env[key] ?? fallback
}

export const env = {
  nodeEnv:    optional('NODE_ENV', 'development'),
  port:       parseInt(optional('PORT', '5000'), 10),
  clientUrl:  optional('CLIENT_URL', 'http://localhost:3100'),
  backendUrl: optional('BACKEND_URL', 'http://localhost:5000'),

  mongoUri:  optional('MONGODB_URI', 'mongodb://localhost:27017/troo-ai'),

  jwt: {
    accessSecret:  optional('JWT_ACCESS_SECRET', 'dev-access-secret-change-in-prod'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-prod'),
    accessExpiry:  optional('JWT_ACCESS_EXPIRY',  '15m'),
    refreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),
  },

  sessionSecret: optional('SESSION_SECRET', 'dev-session-secret'),

  google: {
    clientId:     optional('GOOGLE_CLIENT_ID'),
    clientSecret: optional('GOOGLE_CLIENT_SECRET'),
  },

  github: {
    clientId:     optional('GITHUB_CLIENT_ID'),
    clientSecret: optional('GITHUB_CLIENT_SECRET'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'smtp.sendgrid.net'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', 'apikey'),
    pass: optional('SMTP_PASS'),
    from: optional('EMAIL_FROM', 'noreply@trooai.com'),
  },

  stripe: {
    secretKey:      optional('STRIPE_SECRET_KEY'),
    webhookSecret:  optional('STRIPE_WEBHOOK_SECRET'),
    proPriceId:     optional('STRIPE_PRO_PRICE_ID'),
    agencyPriceId:  optional('STRIPE_AGENCY_PRICE_ID'),
  },

  ai: {
    openaiKey:      optional('OPENAI_API_KEY'),
    anthropicKey:   optional('ANTHROPIC_API_KEY'),
    activeProvider: optional('ACTIVE_AI_PROVIDER', 'openai'),
  },

  figmaApiToken: optional('FIGMA_API_TOKEN'),

  aws: {
    region:    optional('AWS_REGION', 'us-east-1'),
    accessKey: optional('AWS_ACCESS_KEY_ID'),
    secretKey: optional('AWS_SECRET_ACCESS_KEY'),
    s3Bucket:  optional('S3_BUCKET_NAME', 'troo-ai-themes'),
  },

  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max:      parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
  },
}
