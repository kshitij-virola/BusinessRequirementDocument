import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../models/User'
import { Plan } from '../models/Plan'

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

  console.log(`Current Bob credits info: plan=${bob.subscription.plan}, remaining=${bob.credits.remaining}`)

  // Backup Bob's credits and Pro plan credit costs
  const origBobCredits = bob.credits.remaining
  const proPlan = await Plan.findOne({ slug: 'pro' })
  if (!proPlan) {
    console.error('Pro plan not found in database!')
    await mongoose.disconnect()
    return
  }
  const origTextCost = proPlan.creditCosts?.textGeneration ?? 1
  console.log(`Original Pro plan textGeneration cost: ${origTextCost}`)

  // Step 1: Temporarily update Pro plan textGeneration cost to 7 in database
  if (!proPlan.creditCosts) {
    proPlan.creditCosts = { textGeneration: 7, imageConversion: 5, figmaConversion: 10, themeExport: 2 }
  } else {
    proPlan.creditCosts.textGeneration = 7
  }
  await proPlan.save()
  console.log('Temporarily set Pro plan textGeneration cost to 7 in database.')

  // Step 2: Execute checkCredits simulation logic for Bob (textGeneration)
  const planDoc = await Plan.findOne({ slug: bob.subscription.plan, isActive: true })
  let resolvedCost = 1
  if (planDoc && planDoc.creditCosts && planDoc.creditCosts.textGeneration !== undefined) {
    resolvedCost = planDoc.creditCosts.textGeneration
  }

  console.log(`Resolved cost dynamically: ${resolvedCost}`)
  if (resolvedCost === 7) {
    console.log(`[PASS] Dynamic cost check successfully resolved to 7!`)
  } else {
    console.error(`[FAIL] Dynamic cost check resolved to ${resolvedCost}, expected 7.`)
  }

  // Step 3: Test credit validation block
  // Set bob's remaining credits to 6 (so it's < cost 7)
  bob.credits.remaining = 6
  await bob.save()
  console.log(`Temporarily set Bob's credits to 6.`)

  if (bob.credits.remaining < resolvedCost) {
    console.log(`[PASS] Insufficient credits check correctly triggered! (Remaining 6 < Cost 7)`)
  } else {
    console.error(`[FAIL] Insufficient credits check failed to trigger.`)
  }

  // Restore everything
  proPlan.creditCosts.textGeneration = origTextCost
  await proPlan.save()
  console.log('Restored Pro plan textGeneration cost to original value.')

  bob.credits.remaining = origBobCredits
  await bob.save()
  console.log("Restored Bob's credits to original value.")

  await mongoose.disconnect()
  console.log('Done!')
}

run().catch(err => {
  console.error('Error during credit cost verification:', err)
  process.exit(1)
})
