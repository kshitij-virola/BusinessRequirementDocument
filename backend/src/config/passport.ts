import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import { User } from '../models/User'
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
        }
      }

      return done(null, user as any)
    } catch (err) {
      return done(err as Error)
    }
  }
))

export default passport
