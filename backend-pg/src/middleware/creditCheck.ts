import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { prisma } from '../config/db'
import { checkSubscription } from '../services/userService'
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

    let user = await prisma.trooUser.findUnique({ where: { id: req.user.userId } })
    if (!user) { error(res, 'User not found', 404); return }
    if (user.isSuspended) { error(res, 'Account suspended', 403); return }
    await checkSubscription(user.id)
    user = (await prisma.trooUser.findUnique({ where: { id: user.id } }))!

    let action: ActionType = defaultAction || 'textGeneration'
    if (!defaultAction) {
      const mode = req.body?.inputMode
      if (mode === 'image') action = 'imageConversion'
      else if (mode === 'figma') action = 'figmaConversion'
      else action = 'textGeneration'
    }

    const plan = await prisma.trooPlan.findFirst({ where: { slug: user.subscriptionPlan, isActive: true } })
    const planCostKey = {
      textGeneration: 'creditCostTextGeneration',
      imageConversion: 'creditCostImageConversion',
      figmaConversion: 'creditCostFigmaConversion',
      themeExport: 'creditCostThemeExport',
    } as const
    let cost = CREDIT_COSTS[action]
    if (plan) cost = plan[planCostKey[action]]

    if (user.creditsRemaining < cost) {
      error(res, 'Insufficient credits. Please upgrade your plan.', 402, {
        required: cost,
        remaining: user.creditsRemaining,
      })
      return
    }

    req._creditCost = cost
    next()
  }
}
