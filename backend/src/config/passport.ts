import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { Strategy as MicrosoftStrategy } from 'passport-microsoft'
import { User } from '../models/User'
import { AuditLog } from '../models/AuditLog'
import { env } from './env'

passport.use(new GoogleStrategy(
  {
    clientID:     env.google.clientId,
    clientSecret: env.google.clientSecret,
    callbackURL:  `${env.backendUrl}/api/auth/google/callback`,
  },
  async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
    try {
      let user = await User.findOne({ oauthProvider: 'google', oauthId: profile.id })

      if (!user) {
        const email = profile.emails?.[0]?.value
        if (email) {
          user = await User.findOne({ email }) ?? null
          if (user) {
            user.oauthProvider = 'google'
            user.oauthId = profile.id
            if (!user.avatar && profile.photos?.[0]?.value) user.avatar = profile.photos[0].value
            await user.save()
          }
        }
        if (!user) {
          user = await User.create({
            name:            profile.displayName || email?.split('@')[0] || 'User',
            email:           email ?? `google-${profile.id}@oauth.placeholder`,
            oauthProvider:   'google',
            oauthId:         profile.id,
            isEmailVerified: true,
            avatar:          profile.photos?.[0]?.value,
          })
          await AuditLog.create({ userId: user._id, actor: user.email, actorRole: 'user', action: 'user.register', entityId: String(user._id), entityType: 'User', metadata: { provider: 'google' } })
        }
      }

      return done(null, user as any)
    } catch (err) {
      return done(err as Error)
    }
  }
))

passport.use(new GitHubStrategy(
  {
    clientID:     env.github.clientId,
    clientSecret: env.github.clientSecret,
    callbackURL:  `${env.backendUrl}/api/auth/github/callback`,
  },
  async (_accessToken: string, _refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
    try {
      let user = await User.findOne({ oauthProvider: 'github', oauthId: String(profile.id) })

      if (!user) {
        const email = profile.emails?.[0]?.value
        if (email) {
          user = await User.findOne({ email }) ?? null
          if (user) {
            user.oauthProvider = 'github'
            user.oauthId = String(profile.id)
            if (!user.avatar && profile.photos?.[0]?.value) user.avatar = profile.photos[0].value
            await user.save()
          }
        }
        if (!user) {
          user = await User.create({
            name:            profile.displayName || profile.username || 'User',
            email:           email ?? `github-${profile.id}@oauth.placeholder`,
            oauthProvider:   'github',
            oauthId:         String(profile.id),
            isEmailVerified: !!email,
            avatar:          profile.photos?.[0]?.value,
          })
          await AuditLog.create({ userId: user._id, actor: user.email, actorRole: 'user', action: 'user.register', entityId: String(user._id), entityType: 'User', metadata: { provider: 'github' } })
        }
      }

      return done(null, user as any)
    } catch (err) {
      return done(err as Error)
    }
  }
))

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
        let user = await User.findOne({ oauthProvider: 'microsoft', oauthId: profile.id })

        if (!user) {
          const email = profile.emails?.[0]?.value
          if (email) {
            user = await User.findOne({ email }) ?? null
            if (user) {
              user.oauthProvider = 'microsoft'
              user.oauthId = profile.id
              if (!user.avatar && profile.photos?.[0]?.value) user.avatar = profile.photos[0].value
              await user.save()
            }
          }
          if (!user) {
            user = await User.create({
              name:            profile.displayName || email?.split('@')[0] || 'User',
              email:           email ?? `microsoft-${profile.id}@oauth.placeholder`,
              oauthProvider:   'microsoft',
              oauthId:         profile.id,
              isEmailVerified: !!email,
              avatar:          profile.photos?.[0]?.value,
            })
            await AuditLog.create({ userId: user._id, actor: user.email, actorRole: 'user', action: 'user.register', entityId: String(user._id), entityType: 'User', metadata: { provider: 'microsoft' } })
          }
        }

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
