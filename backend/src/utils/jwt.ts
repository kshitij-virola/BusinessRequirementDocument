import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface TokenPayload {
  userId: string
  role: string
  email: string
}

export const signAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiry as jwt.SignOptions['expiresIn'] })
}

export const signRefreshToken = (payload: Pick<TokenPayload, 'userId'>): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiry as jwt.SignOptions['expiresIn'] })
}

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.jwt.accessSecret) as TokenPayload
}

export const verifyRefreshToken = (token: string): Pick<TokenPayload, 'userId'> => {
  return jwt.verify(token, env.jwt.refreshSecret) as Pick<TokenPayload, 'userId'>
}
