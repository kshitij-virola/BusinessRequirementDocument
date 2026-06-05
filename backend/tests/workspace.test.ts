import request from 'supertest'
import { app } from '../src/app'
import { User } from '../src/models/User'
import { signAccessToken } from '../src/utils/jwt'

async function createUserAndToken(email = 'ws@example.com') {
  const user = await User.create({ name: 'WS User', email, password: 'Test1234!', isEmailVerified: true })
  const token = signAccessToken({ userId: String(user._id), role: 'user', email })
  return { user, token }
}

describe('Workspaces API', () => {
  it('GET /api/workspaces — requires auth', async () => {
    const res = await request(app).get('/api/workspaces')
    expect(res.status).toBe(401)
  })

  it('POST /api/workspaces — creates workspace', async () => {
    const { token } = await createUserAndToken()
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'My Theme', framework: 'react' })
    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe('My Theme')
  })

  it('POST /api/workspaces — rejects invalid framework', async () => {
    const { token } = await createUserAndToken('ws2@example.com')
    const res = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', framework: 'invalid-fw' })
    expect(res.status).toBe(422)
  })

  it('PATCH /api/workspaces/:id — renames workspace', async () => {
    const { token } = await createUserAndToken('ws3@example.com')
    const created = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Name', framework: 'vue' })
    const id = created.body.data._id

    const res = await request(app)
      .patch(`/api/workspaces/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Name' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('New Name')
  })
})
