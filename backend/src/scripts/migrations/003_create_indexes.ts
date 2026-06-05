import mongoose from 'mongoose'
import type { MigrationModule } from '../migrate'

export const description = 'Ensure all required database indexes exist'

interface IndexSpec {
  collection: string
  key: Record<string, number>
  name: string
  unique?: boolean
  expireAfterSeconds?: number
}

const INDEXES: IndexSpec[] = [
  // Users
  { collection: 'users', key: { email: 1 },                            name: 'idx_users_email',            unique: true },
  { collection: 'users', key: { 'subscription.stripeCustomerId': 1 },   name: 'idx_users_stripe_customer'  },
  { collection: 'users', key: { role: 1, isSuspended: 1 },              name: 'idx_users_role_suspended'   },
  { collection: 'users', key: { createdAt: -1 },                        name: 'idx_users_created_at'       },

  // Tokens
  { collection: 'tokens', key: { expiresAt: 1 },       name: 'idx_tokens_ttl',       expireAfterSeconds: 0 },
  { collection: 'tokens', key: { userId: 1, type: 1 }, name: 'idx_tokens_user_type'  },
  { collection: 'tokens', key: { token: 1 },           name: 'idx_tokens_value',     unique: true },

  // Workspaces
  { collection: 'workspaces', key: { userId: 1, status: 1 },    name: 'idx_workspaces_user_status'  },
  { collection: 'workspaces', key: { userId: 1, updatedAt: -1 }, name: 'idx_workspaces_user_updated' },

  // Generations
  { collection: 'generations', key: { userId: 1, createdAt: -1 },   name: 'idx_generations_user_created'      },
  { collection: 'generations', key: { workspaceId: 1, version: 1 }, name: 'idx_generations_workspace_version' },
  { collection: 'generations', key: { status: 1 },                  name: 'idx_generations_status'            },
  { collection: 'generations', key: { userId: 1, status: 1 },       name: 'idx_generations_user_status'       },

  // Audit logs
  { collection: 'auditlogs', key: { userId: 1, createdAt: -1 }, name: 'idx_auditlogs_user_created'   },
  { collection: 'auditlogs', key: { action: 1, createdAt: -1 }, name: 'idx_auditlogs_action_created' },
  { collection: 'auditlogs', key: { createdAt: -1 },            name: 'idx_auditlogs_created'        },
]

const ensureIndex = async (
  db: mongoose.mongo.Db,
  spec: IndexSpec,
): Promise<'created' | 'exists' | 'conflict'> => {
  try {
    const opts: Record<string, unknown> = { name: spec.name }
    if (spec.unique) opts.unique = true
    if (spec.expireAfterSeconds !== undefined) opts.expireAfterSeconds = spec.expireAfterSeconds

    await db.collection(spec.collection).createIndex(spec.key as mongoose.mongo.IndexSpecification, opts)
    return 'created'
  } catch (err: unknown) {
    const code = (err as { code?: number }).code
    // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict — already exists with same key
    if (code === 85 || code === 86) return 'conflict'
    // 11000 = duplicate key in unique index — index already exists with same name
    const msg = (err as Error).message ?? ''
    if (msg.includes('already exists') || msg.includes('IndexOptionsConflict')) return 'exists'
    throw err
  }
}

export const up = async (): Promise<void> => {
  const db = mongoose.connection.db
  if (!db) throw new Error('DB not connected')

  const byCollection: Record<string, { created: string[]; skipped: string[] }> = {}

  for (const spec of INDEXES) {
    if (!byCollection[spec.collection]) {
      byCollection[spec.collection] = { created: [], skipped: [] }
    }
    const result = await ensureIndex(db, spec)
    if (result === 'created') {
      byCollection[spec.collection].created.push(spec.name)
    } else {
      byCollection[spec.collection].skipped.push(`${spec.name} (${result})`)
    }
  }

  for (const [col, { created, skipped }] of Object.entries(byCollection)) {
    const parts: string[] = []
    if (created.length) parts.push(`created: ${created.join(', ')}`)
    if (skipped.length) parts.push(`skipped: ${skipped.join(', ')}`)
    console.log(`  → ${col}: ${parts.join(' | ')}`)
  }
}

export const down = async (): Promise<void> => {
  const db = mongoose.connection.db
  if (!db) throw new Error('DB not connected')

  for (const spec of INDEXES) {
    try {
      await db.collection(spec.collection).dropIndex(spec.name)
      console.log(`  → Dropped ${spec.name} on ${spec.collection}`)
    } catch {
      // Index may not exist — that is fine
    }
  }
}

const _: MigrationModule = { description, up, down }
export default _
