import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import passport from 'passport'
import '../config/passport'
import { prisma } from '../config/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { emailService } from '../services/emailService'
import { validate } from '../middleware/validate'
import { authenticate, AuthRequest } from '../middleware/auth'
import { success, error, created } from '../utils/apiResponse'
import { env } from '../config/env'

const router = Router()

const registerSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  password: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_MAX_AGE_MS,
  })
}

const issueSession = async (userId: string) => {
  const user = await prisma.trooUser.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const accessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email })
  const refreshToken = signRefreshToken({ userId: user.id })

  await prisma.trooToken.create({
    data: { userId: user.id, token: refreshToken, type: 'refresh', expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS) },
  })

  return { accessToken, refreshToken, user }
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>

  const existing = await prisma.trooUser.findUnique({ where: { email } })
  if (existing) { error(res, 'Email already registered', 409); return }

  const hashedPassword = await bcrypt.hash(password, 12)
  const verifyToken = crypto.randomBytes(32).toString('hex')
  const user = await prisma.trooUser.create({
    data: { name, email, password: hashedPassword, emailVerificationToken: verifyToken },
  })

  await emailService.sendVerification(email, verifyToken)
  await emailService.sendWelcome(email, name)
  await prisma.trooAuditLog.create({ data: { userId: user.id, actor: email, actorRole: 'user', action: 'user.register', entityId: user.id, entityType: 'User' } })

  created(res, { message: 'Registration successful. Please verify your email.' })
})

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof loginSchema>

  const user = await prisma.trooUser.findUnique({ where: { email } })
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    error(res, 'Invalid email or password', 401); return
  }
  if (user.isSuspended) { error(res, 'Account suspended', 403); return }

  const { accessToken, refreshToken } = await issueSession(user.id)
  setRefreshCookie(res, refreshToken)

  await prisma.trooAuditLog.create({ data: { userId: user.id, actor: email, actorRole: user.role, action: 'user.login', entityId: user.id, entityType: 'User' } })

  success(res, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan },
  })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken
  if (!refreshToken) { error(res, 'No refresh token', 401); return }

  try {
    const payload = verifyRefreshToken(refreshToken)
    const stored = await prisma.trooToken.findFirst({ where: { token: refreshToken, type: 'refresh', userId: payload.userId } })
    if (!stored) { error(res, 'Invalid refresh token', 401); return }

    const user = await prisma.trooUser.findUnique({ where: { id: payload.userId } })
    if (!user) { error(res, 'User not found', 401); return }

    const newAccess = signAccessToken({ userId: user.id, role: user.role, email: user.email })
    const newRefresh = signRefreshToken({ userId: user.id })

    await prisma.trooToken.delete({ where: { id: stored.id } })
    await prisma.trooToken.create({ data: { userId: user.id, token: newRefresh, type: 'refresh', expiresAt: new Date(Date.now() + REFRESH_MAX_AGE_MS) } })

    setRefreshCookie(res, newRefresh)
    success(res, { accessToken: newAccess })
  } catch {
    error(res, 'Invalid or expired refresh token', 401)
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken
  if (refreshToken) await prisma.trooToken.deleteMany({ where: { token: refreshToken } })
  res.clearCookie('refreshToken')
  if (req.user) await prisma.trooAuditLog.create({ data: { userId: req.user.userId, actor: req.user.email, actorRole: req.user.role, action: 'user.logout', entityId: req.user.userId, entityType: 'User' } })
  success(res, null, 'Logged out successfully')
})

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token: string }
  const user = await prisma.trooUser.findFirst({ where: { emailVerificationToken: token } })
  if (!user) { error(res, 'Invalid or expired token', 400); return }
  await prisma.trooUser.update({ where: { id: user.id }, data: { isEmailVerified: true, emailVerificationToken: null } })
  success(res, null, 'Email verified successfully')
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string }
  const user = await prisma.trooUser.findUnique({ where: { email } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.trooUser.update({ where: { id: user.id }, data: { passwordResetToken: token, passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) } })
    await emailService.sendPasswordReset(email, token)
    await prisma.trooAuditLog.create({ data: { userId: user.id, actor: email, actorRole: user.role, action: 'user.password_reset', entityId: user.id, entityType: 'User' } })
  }
  success(res, null, 'If this email exists, a reset link has been sent.')
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token: string; password: string }
  const user = await prisma.trooUser.findFirst({
    where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
  })
  if (!user) { error(res, 'Invalid or expired reset token', 400); return }

  const hashedPassword = await bcrypt.hash(password, 12)
  await prisma.trooUser.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordResetToken: null, passwordResetExpires: null },
  })
  await prisma.trooToken.deleteMany({ where: { userId: user.id, type: 'refresh' } })
  success(res, null, 'Password reset successfully. Please login.')
})

// POST /api/auth/deactivate
router.post('/deactivate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  if (!user) { error(res, 'User not found', 404); return }

  await prisma.trooUser.update({ where: { id: user.id }, data: { isSuspended: true } })
  await prisma.trooToken.deleteMany({ where: { userId: user.id, type: 'refresh' } })
  await prisma.trooAuditLog.create({ data: { userId: user.id, actor: req.user!.email, actorRole: req.user!.role, action: 'user.deactivate', entityId: user.id, entityType: 'User' } })

  res.clearCookie('refreshToken')
  success(res, null, 'Account deactivated successfully')
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  if (!user) { error(res, 'User not found', 404); return }
  const { password: _password, ...safeUser } = user
  success(res, safeUser)
})

// POST /api/auth/google/exchange  (Google Identity Services code exchange)
router.post('/google/exchange', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string }
  if (!code) { error(res, 'Authorization code required', 400); return }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri:  'postmessage',
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) { error(res, 'Failed to exchange code with Google', 401); return }

  const { access_token } = await tokenRes.json() as { access_token: string }

  const profileRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`)
  if (!profileRes.ok) { error(res, 'Failed to fetch Google profile', 401); return }

  const gUser = await profileRes.json() as { id: string; email: string; name: string; picture?: string }

  let user = await prisma.trooUser.findFirst({ where: { oauthProvider: 'google', oauthId: gUser.id } })
  let isNewUser = false
  if (!user) {
    user = await prisma.trooUser.findUnique({ where: { email: gUser.email } })
    if (user) {
      user = await prisma.trooUser.update({
        where: { id: user.id },
        data: { oauthProvider: 'google', oauthId: gUser.id, avatar: user.avatar ?? gUser.picture },
      })
    } else {
      user = await prisma.trooUser.create({
        data: {
          name: gUser.name || gUser.email.split('@')[0],
          email: gUser.email,
          oauthProvider: 'google',
          oauthId: gUser.id,
          isEmailVerified: true,
          avatar: gUser.picture,
        },
      })
      isNewUser = true
    }
  }

  if (user.isSuspended) { error(res, 'Account suspended', 403); return }

  if (isNewUser) {
    await prisma.trooAuditLog.create({ data: { userId: user.id, actor: user.email, actorRole: 'user', action: 'user.register', entityId: user.id, entityType: 'User', metadata: { provider: 'google' } } })
  }
  await prisma.trooAuditLog.create({ data: { userId: user.id, actor: user.email, actorRole: user.role, action: 'user.login', entityId: user.id, entityType: 'User', metadata: { provider: 'google' } } })

  const { accessToken, refreshToken } = await issueSession(user.id)
  setRefreshCookie(res, refreshToken)

  success(res, {
    accessToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, subscriptionPlan: user.subscriptionPlan },
  })
})

// ── OAuth helpers ──────────────────────────────────────────────────────────────

const issueOAuthSession = async (userId: string, res: Response, provider: string): Promise<void> => {
  const { accessToken, refreshToken, user } = await issueSession(userId)
  setRefreshCookie(res, refreshToken)

  await prisma.trooAuditLog.create({ data: { userId: user.id, actor: user.email, actorRole: user.role, action: 'user.login', entityId: user.id, entityType: 'User', metadata: { provider } } })

  const params = new URLSearchParams({ token: accessToken, userId: user.id, role: user.role })
  res.redirect(`${env.clientUrl}/api/auth/callback?${params}`)
}

const oauthFailUrl = `${env.clientUrl}/login?error=oauth_failed`

// ── Google OAuth ───────────────────────────────────────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: oauthFailUrl }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await issueOAuthSession((req.user as any).id, res, 'google')
    } catch {
      res.redirect(oauthFailUrl)
    }
  }
)

// ── GitHub OAuth ───────────────────────────────────────────────────────────────

router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }))

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: oauthFailUrl }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await issueOAuthSession((req.user as any).id, res, 'github')
    } catch {
      res.redirect(oauthFailUrl)
    }
  }
)

// ── Microsoft OAuth ────────────────────────────────────────────────────────────

const requireMicrosoftConfigured = (req: Request, res: Response, next: NextFunction): void => {
  if (!env.microsoft.clientId || !env.microsoft.clientSecret) {
    res.redirect(oauthFailUrl)
    return
  }
  next()
}

router.get('/microsoft', requireMicrosoftConfigured, passport.authenticate('microsoft', { session: false }))

router.get('/microsoft/callback',
  requireMicrosoftConfigured,
  passport.authenticate('microsoft', { session: false, failureRedirect: oauthFailUrl }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await issueOAuthSession((req.user as any).id, res, 'microsoft')
    } catch {
      res.redirect(oauthFailUrl)
    }
  }
)

export default router
