import { Response } from 'express'

export const success = (res: Response, data: unknown, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data })
}

export const created = (res: Response, data: unknown, message = 'Created') => {
  return success(res, data, message, 201)
}

export const error = (res: Response, message: string, statusCode = 400, details?: unknown) => {
  return res.status(statusCode).json({ success: false, message, ...(details ? { details } : {}) })
}
