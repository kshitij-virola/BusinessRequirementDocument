import { Config } from '../../models/Config'
import type { MigrationModule } from '../migrate'

export const description = 'Seed default platform settings'

const DEFAULTS = [
  { key: 'platform.name',           value: 'TROO AI'               },
  { key: 'platform.supportEmail',   value: 'support@trooai.com'    },
  { key: 'platform.yearlyDiscount', value: 20                      },
]

export const up = async (): Promise<void> => {
  for (const entry of DEFAULTS) {
    await Config.findOneAndUpdate({ key: entry.key }, entry, { upsert: true, new: true })
    console.log(`  → Config set: ${entry.key} = ${entry.value}`)
  }
}

export const down = async (): Promise<void> => {
  const keys = DEFAULTS.map((d) => d.key)
  await Config.deleteMany({ key: { $in: keys } })
  console.log('  → Removed platform settings config entries')
}

const _: MigrationModule = { description, up, down }
export default _
