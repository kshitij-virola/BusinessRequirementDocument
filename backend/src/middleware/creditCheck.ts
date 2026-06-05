import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { User } from '../models/User'
import { error } from '../utils/apiResponse'

type ActionType = 'textGeneration' | 'imageConversion' | 'figmaConversion' | 'themeExport'

const CREDIT_COSTS: Record<ActionType, number> = {
  textGeneration:  1,
  imageConversion: 5,
  figmaConversion: 10,
  themeExport:     2,
}

export const checkCredits = (action: ActionType) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { error(res, 'Unauthorized', 401); return }

    const cost = CREDIT_COSTS[action]
    const user = await User.findById(req.user.userId)

    if (!user) { error(res, 'User not found', 404); return }
    if (user.isSuspended) { error(res, 'Account suspended', 403); return }

    if (user.credits.remaining < cost) {
      error(res, 'Insufficient credits. Please upgrade your plan.', 402, {
        required: cost,
        remaining: user.credits.remaining,
      })
      return
    }

    req.body._creditCost = cost
    next()
  }
}
