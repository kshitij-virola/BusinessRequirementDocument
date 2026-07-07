import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../models/User'

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') })

const standardUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/troo-ai'

async function connectWithRetry() {
  const maxAttempts = 5
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Connecting to MongoDB (attempt ${attempt}/${maxAttempts})...`)
    try {
      await mongoose.connect(standardUri, { serverSelectionTimeoutMS: 20000 })
      console.log('Connected to MongoDB successfully!')
      return
    } catch (err: any) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`)
      if (attempt === maxAttempts) {
        throw err
      }
      console.log('Waiting 3 seconds before next attempt...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }
}

async function run() {
  await connectWithRetry()

  // Find Bob (who is on pro plan)
  const bob = await User.findOne({ email: 'bob@example.com' })
  if (!bob) {
    console.error('Bob not found!')
    await mongoose.disconnect()
    return
  }

  // Backup original Bob subscription details
  const origPlan = bob.subscription.plan
  const origStatus = bob.subscription.status
  const origPeriodEnd = bob.subscription.currentPeriodEnd
  const origLimitBytes = bob.storage.limitBytes

  console.log(`User: ${bob.email}, Original Plan: ${origPlan}, Status: ${origStatus}, Expiry: ${origPeriodEnd}\n`)

  // Test Case 1: Active and Unexpired -> Should NOT downgrade
  console.log('--- Case 1: Active and unexpired subscription ---')
  bob.subscription.plan = 'pro'
  bob.subscription.status = 'active'
  bob.subscription.currentPeriodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
  bob.storage.limitBytes = 10 * 1024 * 1024 * 1024 // 10 GB
  await bob.save()

  await bob.checkSubscription()
  let freshBob = await User.findById(bob._id)
  if (freshBob && freshBob.subscription.plan === 'pro') {
    console.log('[PASS] Bob remained on PRO plan (Active/Unexpired).')
  } else {
    console.error(`[FAIL] Bob was incorrectly downgraded to: ${freshBob?.subscription.plan}`)
  }

  // Test Case 2: Expired Subscription (period end in the past) -> Should downgrade to free
  console.log('\n--- Case 2: Expired subscription (period end in past) ---')
  bob.subscription.plan = 'pro'
  bob.subscription.status = 'active'
  bob.subscription.currentPeriodEnd = new Date(Date.now() - 60000) // 1 minute in the past
  await bob.save()

  await bob.checkSubscription()
  freshBob = await User.findById(bob._id)
  if (freshBob && freshBob.subscription.plan === 'free' && freshBob.subscription.status === 'canceled' && freshBob.storage.limitBytes === 500 * 1024 * 1024) {
    console.log('[PASS] Bob was successfully downgraded to FREE plan due to subscription expiration!')
  } else {
    console.error(`[FAIL] Downgrade checks failed. Plan: ${freshBob?.subscription.plan}, Status: ${freshBob?.subscription.status}, Limit: ${freshBob?.storage.limitBytes}`)
  }

  // Test Case 3: Inactive billing status (e.g. past_due) -> Should downgrade to free
  console.log('\n--- Case 3: Inactive status (past_due) ---')
  bob.subscription.plan = 'pro'
  bob.subscription.status = 'past_due'
  bob.subscription.currentPeriodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
  bob.storage.limitBytes = 10 * 1024 * 1024 * 1024 // 10 GB
  await bob.save()

  await bob.checkSubscription()
  freshBob = await User.findById(bob._id)
  if (freshBob && freshBob.subscription.plan === 'free' && freshBob.subscription.status === 'canceled' && freshBob.storage.limitBytes === 500 * 1024 * 1024) {
    console.log('[PASS] Bob was successfully downgraded to FREE plan due to past_due billing status!')
  } else {
    console.error(`[FAIL] Downgrade checks failed. Plan: ${freshBob?.subscription.plan}, Status: ${freshBob?.subscription.status}, Limit: ${freshBob?.storage.limitBytes}`)
  }

  // Restore Bob\'s original details
  bob.subscription.plan = origPlan
  bob.subscription.status = origStatus
  bob.subscription.currentPeriodEnd = origPeriodEnd
  bob.storage.limitBytes = origLimitBytes
  await bob.save()
  console.log('\n[INFO] Restored Bob\'s details to original.')

  await mongoose.disconnect()
  console.log('Done!')
}

run().catch(err => {
  console.error('Error running test script:', err)
  process.exit(1)
})
