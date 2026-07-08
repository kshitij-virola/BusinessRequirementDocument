/**
 * Backfills `trialEndsAt` on existing User documents that don't have it set,
 * defaulting to 30 days after each user's account creation date.
 */

import { User } from '../../models/User'
import type { MigrationModule } from '../migrate'

export const description = 'Set default trialEndsAt (createdAt + 30 days) on existing users'

const TRIAL_DAYS = 30
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000

export const up = async (): Promise<void> => {
  const users = await User.find({ trialEndsAt: { $exists: false } }).select('_id createdAt')

  if (!users.length) {
    console.log('  → No users need a default trialEndsAt — skipping')
    return
  }

  const ops = users.map((user) => ({
    updateOne: {
      filter: { _id: user._id },
      update: { $set: { trialEndsAt: new Date(user.createdAt.getTime() + TRIAL_MS) } },
    },
  }))

  const result = await User.bulkWrite(ops)
  console.log(`  → Set trialEndsAt on ${result.modifiedCount} user(s)`)
}

export const down = async (): Promise<void> => {
  const result = await User.updateMany({}, { $unset: { trialEndsAt: '' } })
  console.log(`  → Removed trialEndsAt from ${result.modifiedCount} user(s)`)
}

const _: MigrationModule = { description, up, down }
export default _
