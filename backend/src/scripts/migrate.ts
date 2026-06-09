/**
 * Migration runner.
 * Usage:
 *   npx ts-node src/scripts/migrate.ts up     -- run all pending migrations
 *   npx ts-node src/scripts/migrate.ts down    -- rollback last migration
 *   npx ts-node src/scripts/migrate.ts status  -- list applied migrations
 *   npx ts-node src/scripts/migrate.ts reseed  -- re-run all migrations (restores deleted default data)
 */

import { webcrypto } from 'crypto'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (globalThis as any).crypto === 'undefined') {
  // MongoDB SCRAM auth requires globalThis.crypto; polyfill for contexts where it is missing
  ;(globalThis as any).crypto = webcrypto
}

import mongoose, { Schema, Document } from 'mongoose'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env'
import { logger } from '../utils/logger'

// ── Migration log model ────────────────────────────────────────────────────────

interface IMigration extends Document {
  name: string
  appliedAt: Date
}

const migrationSchema = new Schema<IMigration>({
  name:      { type: String, required: true, unique: true },
  appliedAt: { type: Date,   default: Date.now },
})

const Migration = mongoose.model<IMigration>('Migration', migrationSchema)

// ── Migration interface ───────────────────────────────────────────────────────

export interface MigrationModule {
  description: string
  up: () => Promise<void>
  down: () => Promise<void>
}

// ── Runner ───────────────────────────────────────────────────────────────────

const run = async (command: 'up' | 'down' | 'status' | 'reseed'): Promise<void> => {
  await mongoose.connect(env.mongoUri)
  logger.info(`Connected to MongoDB — running migration: ${command}`)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
    .sort()

  const applied = await Migration.find().sort({ appliedAt: 1 })
  const appliedNames = new Set(applied.map((m) => m.name))

  if (command === 'status') {
    console.log('\nMigration Status:')
    for (const file of files) {
      const status = appliedNames.has(file) ? '✓ applied' : '○ pending'
      console.log(`  ${status}  ${file}`)
    }
    console.log()
    return
  }

  if (command === 'up') {
    const pending = files.filter((f) => !appliedNames.has(f))
    if (!pending.length) { logger.info('All migrations already applied'); return }

    let applied = 0
    for (const file of pending) {
      const mod = await import(path.join(migrationsDir, file)) as MigrationModule
      logger.info(`Running: ${file} — ${mod.description}`)
      try {
        await mod.up()
        await Migration.create({ name: file })
        logger.info(`  ✓ applied  ${file}`)
        applied++
      } catch (err) {
        logger.error(`  ✗ FAILED   ${file}: ${(err as Error).message}`)
        logger.error('Migration stopped. Fix the error above, then run migrate:up again.')
        process.exit(1)
      }
    }
    logger.info(`Applied ${applied} migration(s). Run migrate:status to verify.`)
  }

  if (command === 'down') {
    if (!applied.length) { logger.info('No migrations to roll back'); return }
    const last = applied[applied.length - 1]
    const mod = await import(path.join(migrationsDir, last.name)) as MigrationModule
    logger.info(`Rolling back: ${last.name}`)
    await mod.down()
    await Migration.deleteOne({ name: last.name })
    logger.info(`  ✓ Rolled back ${last.name}`)
  }

  if (command === 'reseed') {
    if (!files.length) { logger.info('No migration files found'); return }
    let reseeded = 0
    for (const file of files) {
      const mod = await import(path.join(migrationsDir, file)) as MigrationModule
      logger.info(`Reseeding: ${file} — ${mod.description}`)
      try {
        await mod.up()
        logger.info(`  ✓ reseeded  ${file}`)
        reseeded++
      } catch (err) {
        logger.error(`  ✗ FAILED   ${file}: ${(err as Error).message}`)
        logger.error('Reseed stopped. Fix the error above, then run migrate:reseed again.')
        process.exit(1)
      }
    }
    logger.info(`Reseeded ${reseeded} migration(s).`)
  }
}

const command = (process.argv[2] ?? 'up') as 'up' | 'down' | 'status' | 'reseed'
run(command)
  .then(() => mongoose.disconnect())
  .catch((err) => { logger.error('Migration failed:', err); process.exit(1) })
