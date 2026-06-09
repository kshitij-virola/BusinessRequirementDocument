import { jwtVerify } from 'jose'
import type { SessionPayload } from '@/types'

const secretKey = process.env.SESSION_SECRET ?? 'troo-ai-dev-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(secretKey)

export const decryptForProxy = async (session: string | undefined = ''): Promise<SessionPayload | null> => {
  if (!session) return null
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
