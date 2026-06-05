import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { error } from '../utils/apiResponse'

type Role = 'user' | 'admin' | 'superadmin'

export const requireRole = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      error(res, 'Unauthorized', 401)
      return
    }
    if (!roles.includes(req.user.role as Role)) {
      error(res, 'Forbidden — insufficient permissions', 403)
      return
    }
    next()
  }
}

export const requireAdmin = requireRole('admin', 'superadmin')
export const requireSuperAdmin = requireRole('superadmin')
