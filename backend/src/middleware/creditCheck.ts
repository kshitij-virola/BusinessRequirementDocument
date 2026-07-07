import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { User } from '../models/User'
import { Plan } from '../models/Plan'
import { error } from '../utils/apiResponse'

type ActionType = 'textGeneration' | 'imageConversion' | 'figmaConversion' | 'themeExport'

const CREDIT_COSTS: Record<ActionType, number> = {
  textGeneration:  1,
  imageConversion: 5,
  figmaConversion: 10,
  themeExport:     2,
}

export const checkCredits = (defaultAction?: ActionType) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) { error(res, 'Unauthorized', 401); return }

    const user = await User.findById(req.user.userId)
    if (!user) { error(res, 'User not found', 404); return }
    if (user.isSuspended) { error(res, 'Account suspended', 403); return }
    await user.checkSubscription()

    // Determine the action dynamically if no default action is specified
    let action: ActionType = defaultAction || 'textGeneration'
    if (!defaultAction) {
      const mode = req.body?.inputMode
      if (mode === 'image') {
        action = 'imageConversion'
      } else if (mode === 'figma') {
        action = 'figmaConversion'
      } else {
        action = 'textGeneration'
      }
    }

    // Fetch dynamic cost from Plan features in the database
    const plan = await Plan.findOne({ slug: user.subscription.plan, isActive: true })
    let cost = CREDIT_COSTS[action]
    if (plan && plan.creditCosts && plan.creditCosts[action] !== undefined) {
      cost = plan.creditCosts[action]
    }

    if (user.credits.remaining < cost) {
      error(res, 'Insufficient credits. Please upgrade your plan.', 402, {
        required: cost,
        remaining: user.credits.remaining,
      })
      return
    }

    req._creditCost = cost
    next()
  }
}
