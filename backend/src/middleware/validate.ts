import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { error } from '../utils/apiResponse'

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      error(res, 'Validation failed', 422, result.error.flatten().fieldErrors)
      return
    }
    req.body = result.data
    next()
  }
}
