import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as MicrosoftStrategy } from 'passport-microsoft'
import { prisma } from './db'
import { env } from './env'

type OauthProvider = 'google' | 'github' | 'microsoft'

const findOrCreateOauthUser = async (
  provider: OauthProvider,
  oauthId: string,
  email: string | undefined,
  displayName: string | undefined,
  avatar: string | undefined
) => {
  let user = await prisma.trooUser.findFirst({ where: { oauthProvider: provider, oauthId } })
  if (user) return { user, isNewUser: false }

  if (email) {
    user = await prisma.trooUser.findUnique({ where: { email } })
    if (user) {
      user = await prisma.trooUser.update({
        where: { id: user.id },
        data: { oauthProvider: provider, oauthId, avatar: user.avatar ?? avatar },
      })
      return { user, isNewUser: false }
    }
  }

  user = await prisma.trooUser.create({
    data: {
      name: displayName || email?.split('@')[0] || 'User',
      email: email ?? `${provider}-${oauthId}@oauth.placeholder`,
      oauthProvider: provider,
      oauthId,
      isEmailVerified: !!email,
      avatar,
    },
  })

  await prisma.trooAuditLog.create({
    data: {
      userId: user.id,
      actor: user.email,
      actorRole: 'user',
      action: 'user.register',
      entityId: user.id,
      entityType: 'User',
      metadata: { provider },
    },
  })

  return { user, isNewUser: true }
}

if (env.google.clientId && env.google.clientSecret) {
  passport.use(new GoogleStrategy(
    {
      clientID:     env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL:  `${env.backendUrl}/api/auth/google/callback`,
    },
    async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
      try {
        const { user } = await findOrCreateOauthUser(
          'google', profile.id, profile.emails?.[0]?.value, profile.displayName, profile.photos?.[0]?.value
        )
        return done(null, user as any)
      } catch (err) {
        return done(err as Error)
      }
    }
  ))
} else {
  console.warn('Google OAuth disabled: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set')
}

if (env.github.clientId && env.github.clientSecret) {
  passport.use(new GitHubStrategy(
    {
      clientID:     env.github.clientId,
      clientSecret: env.github.clientSecret,
      callbackURL:  `${env.backendUrl}/api/auth/github/callback`,
    },
    async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
      try {
        const { user } = await findOrCreateOauthUser(
          'github', String(profile.id), profile.emails?.[0]?.value, profile.displayName || profile.username, profile.photos?.[0]?.value
        )
        return done(null, user as any)
      } catch (err) {
        return done(err as Error)
      }
    }
  ))
} else {
  console.warn('GitHub OAuth disabled: GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET not set')
}

if (env.microsoft.clientId && env.microsoft.clientSecret) {
  passport.use(new MicrosoftStrategy(
    {
      clientID:     env.microsoft.clientId,
      clientSecret: env.microsoft.clientSecret,
      callbackURL:  `${env.backendUrl}/api/auth/microsoft/callback`,
      scope:        ['user.read'],
    },
    async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
      try {
        const { user } = await findOrCreateOauthUser(
          'microsoft', profile.id, profile.emails?.[0]?.value, profile.displayName, profile.photos?.[0]?.value
        )
        return done(null, user as any)
      } catch (err) {
        return done(err as Error)
      }
    }
  ))
} else {
  console.warn('Microsoft OAuth disabled: MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET not set')
}

export default passport
