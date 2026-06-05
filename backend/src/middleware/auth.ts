/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'
import { error } from '../utils/apiResponse'

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; email: string }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    error(res, 'No token provided', 401)
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch (err: unknown)  {
    console.log("authenticate err:", err)
    error(res, 'Invalid or expired token', 401)
  }
}
