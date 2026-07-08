import request from 'supertest'
import { app } from '../src/app'
import { User } from '../src/models/User'

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('registers a new user with default free plan', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User', email: 'test@example.com', password: 'Test1234!',
      })
      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)

      const user = await User.findOne({ email: 'test@example.com' })
      expect(user).not.toBeNull()
      expect(user!.subscription.plan).toBe('free')
      expect(user!.subscription.status).toBe('active')
    })

    it('rejects duplicate email', async () => {
      await User.create({ name: 'Existing', email: 'dup@example.com', password: 'Test1234!' })
      const res = await request(app).post('/api/auth/register').send({
        name: 'Another', email: 'dup@example.com', password: 'Test1234!',
      })
      expect(res.status).toBe(409)
    })

    it('rejects weak password', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'User', email: 'u@example.com', password: 'weak',
      })
      expect(res.status).toBe(422)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({ name: 'Login User', email: 'login@example.com', password: 'Test1234!', isEmailVerified: true })
    })

    it('logs in with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com', password: 'Test1234!',
      })
      expect(res.status).toBe(200)
      expect(res.body.data).toHaveProperty('accessToken')
    })

    it('rejects invalid password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'login@example.com', password: 'wrongpass',
      })
      expect(res.status).toBe(401)
    })
  })
})
