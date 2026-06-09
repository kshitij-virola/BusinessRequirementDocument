import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import passport from 'passport'
import '../config/passport'
import { User, IUser } from '../models/User'
import { Token } from '../models/Token'
import { AuditLog } from '../models/AuditLog'
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

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>

  const existing = await User.findOne({ email })
  if (existing) { error(res, 'Email already registered', 409); return }

  const verifyToken = crypto.randomBytes(32).toString('hex')
  const user = await User.create({
    name, email, password,
    emailVerificationToken: verifyToken,
  })

  await emailService.sendVerification(email, verifyToken)
  await emailService.sendWelcome(email, name)
  await AuditLog.create({ userId: user._id, actor: email, actorRole: 'user', action: 'user.register' })

  created(res, { message: 'Registration successful. Please verify your email.' })
})

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof loginSchema>

  const user = await User.findOne({ email }).select('+password')
  if (!user || !(await user.comparePassword(password))) {
    error(res, 'Invalid email or password', 401); return
  }
  if (user.isSuspended) { error(res, 'Account suspended', 403); return }

  const accessToken  = signAccessToken({ userId: String(user._id), role: user.role, email: user.email })
  const refreshToken = signRefreshToken({ userId: String(user._id) })

  await Token.create({
    userId: user._id,
    token: refreshToken,
    type: 'refresh',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  await AuditLog.create({ userId: user._id, actor: email, actorRole: user.role, action: 'user.login' })

  success(res, {
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: user.subscription },
  })
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken
  if (!refreshToken) { error(res, 'No refresh token', 401); return }

  try {
    const payload = verifyRefreshToken(refreshToken)
    const stored = await Token.findOne({ token: refreshToken, type: 'refresh', userId: payload.userId })
    if (!stored) { error(res, 'Invalid refresh token', 401); return }

    const user = await User.findById(payload.userId)
    if (!user) { error(res, 'User not found', 401); return }

    const newAccess  = signAccessToken({ userId: String(user._id), role: user.role, email: user.email })
    const newRefresh = signRefreshToken({ userId: String(user._id) })

    await stored.deleteOne()
    await Token.create({ userId: user._id, token: newRefresh, type: 'refresh', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

    res.cookie('refreshToken', newRefresh, { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 })
    success(res, { accessToken: newAccess })
  } catch {
    error(res, 'Invalid or expired refresh token', 401)
  }
})

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refreshToken
  if (refreshToken) await Token.deleteOne({ token: refreshToken })
  res.clearCookie('refreshToken')
  if (req.user) await AuditLog.create({ userId: req.user.userId, actor: req.user.email, actorRole: req.user.role, action: 'user.logout' })
  success(res, null, 'Logged out successfully')
})

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query as { token: string }
  const user = await User.findOne({ emailVerificationToken: token }).select('+emailVerificationToken')
  if (!user) { error(res, 'Invalid or expired token', 400); return }
  user.isEmailVerified = true
  user.emailVerificationToken = undefined
  await user.save()
  success(res, null, 'Email verified successfully')
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email: string }
  const user = await User.findOne({ email })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken = token
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()
    await emailService.sendPasswordReset(email, token)
    await AuditLog.create({ userId: user._id, actor: email, actorRole: user.role, action: 'user.password_reset' })
  }
  success(res, null, 'If this email exists, a reset link has been sent.')
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token: string; password: string }
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires')

  if (!user) { error(res, 'Invalid or expired reset token', 400); return }

  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  await user.save()
  await Token.deleteMany({ userId: user._id, type: 'refresh' })
  success(res, null, 'Password reset successfully. Please login.')
})

// POST /api/auth/deactivate
router.post('/deactivate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.userId)
  if (!user) { error(res, 'User not found', 404); return }

  user.isSuspended = true
  await user.save()
  await Token.deleteMany({ userId: user._id, type: 'refresh' })
  await AuditLog.create({ userId: user._id, actor: req.user!.email, actorRole: req.user!.role, action: 'user.deactivate' })

  res.clearCookie('refreshToken')
  success(res, null, 'Account deactivated successfully')
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.userId).select('-password')
  if (!user) { error(res, 'User not found', 404); return }
  success(res, user)
})

// POST /api/auth/google/exchange  (Google Identity Services code exchange)
router.post('/google/exchange', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string }
  if (!code) { error(res, 'Authorization code required', 400); return }

  // Exchange auth code for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri:  'postmessage',  // GIS popup mode sends code via postmessage
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) { error(res, 'Failed to exchange code with Google', 401); return }

  const { access_token } = await tokenRes.json() as { access_token: string }

  // Fetch user profile
  const profileRes = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${access_token}`)
  if (!profileRes.ok) { error(res, 'Failed to fetch Google profile', 401); return }

  const gUser = await profileRes.json() as { id: string; email: string; name: string; picture?: string }

  let user = await User.findOne({ oauthProvider: 'google', oauthId: gUser.id })
  if (!user) {
    user = await User.findOne({ email: gUser.email }) ?? null
    if (user) {
      user.oauthProvider = 'google'
      user.oauthId = gUser.id
      if (!user.avatar && gUser.picture) user.avatar = gUser.picture
      await user.save()
    } else {
      user = await User.create({
        name:            gUser.name || gUser.email.split('@')[0],
        email:           gUser.email,
        oauthProvider:   'google',
        oauthId:         gUser.id,
        isEmailVerified: true,
        avatar:          gUser.picture,
      })
    }
  }

  if (user.isSuspended) { error(res, 'Account suspended', 403); return }

  const accessToken  = signAccessToken({ userId: String(user._id), role: user.role, email: user.email })
  const refreshToken = signRefreshToken({ userId: String(user._id) })

  await Token.create({ userId: user._id, token: refreshToken, type: 'refresh', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  success(res, {
    accessToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, subscription: user.subscription },
  })
})

// ── OAuth helpers ──────────────────────────────────────────────────────────────

const issueOAuthSession = async (user: IUser, res: Response): Promise<void> => {
  const accessToken  = signAccessToken({ userId: String(user._id), role: user.role, email: user.email })
  const refreshToken = signRefreshToken({ userId: String(user._id) })

  await Token.create({
    userId:    user._id,
    token:     refreshToken,
    type:      'refresh',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   env.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  })

  const params = new URLSearchParams({
    token:  accessToken,
    userId: String(user._id),
    role:   user.role,
  })
  res.redirect(`${env.clientUrl}/api/auth/callback?${params}`)
}

const oauthFailUrl = `${env.clientUrl}/login?error=oauth_failed`

// ── Google OAuth ───────────────────────────────────────────────────────────────

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }))

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: oauthFailUrl }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await issueOAuthSession(req.user as unknown as IUser, res)
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
      await issueOAuthSession(req.user as unknown as IUser, res)
    } catch {
      res.redirect(oauthFailUrl)
    }
  }
)

export default router
