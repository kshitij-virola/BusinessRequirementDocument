import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User, PLAN_LIMITS } from '../models/User'
import { Plan } from '../models/Plan'
import { creditService } from '../services/creditService'

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

  console.log(`Current Bob credits info: plan=${bob.subscription.plan}, remaining=${bob.credits.remaining}, used=${bob.credits.used}`)

  // Backup original Bob credits and Pro plan details
  const origBobCredits = bob.credits.remaining
  const proPlan = await Plan.findOne({ slug: 'pro' })
  if (!proPlan) {
    console.error('Pro plan not found in database!')
    await mongoose.disconnect()
    return
  }
  const origProGenerations = proPlan.features.generationsPerMonth
  console.log(`Original Pro plan generationsPerMonth: ${origProGenerations}`)

  // Step 1: Temporarily update Pro plan generations count to 600 in the database
  proPlan.features.generationsPerMonth = 600
  await proPlan.save()
  console.log('Temporarily set Pro plan generationsPerMonth to 600 in database.')

  // Step 2: Reset Bob\'s credits using the admin reset credits route logic
  const planDoc = await Plan.findOne({ slug: bob.subscription.plan })
  const credits = planDoc ? planDoc.features.generationsPerMonth : PLAN_LIMITS[bob.subscription.plan as 'free' | 'pro' | 'agency'].credits
  console.log(`Dynamic credits to reset based on Plan model: ${credits}`)
  
  await creditService.reset(String(bob._id), credits)

  // Step 3: Fetch Bob again and verify credits are updated to 600
  const bobUpdated = await User.findById(bob._id)
  if (bobUpdated && bobUpdated.credits.remaining === 600) {
    console.log(`[PASS] Bob\'s credits successfully reset to 600 (loaded dynamically from database Plan)!`)
  } else {
    console.error(`[FAIL] Bob\'s credits were reset to ${bobUpdated?.credits.remaining || 'unknown'}, expected 600.`)
  }

  // Restore everything
  proPlan.features.generationsPerMonth = origProGenerations
  await proPlan.save()
  console.log('Restored Pro plan generationsPerMonth to original value.')

  bob.credits.remaining = origBobCredits
  await bob.save()
  console.log('Restored Bob\'s credits to original value.')

  await mongoose.disconnect()
  console.log('Done!')
}

run().catch(err => {
  console.error('Error during credit reset tests:', err)
  process.exit(1)
})
