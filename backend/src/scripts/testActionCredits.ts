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

// Emulate middleware action resolution
function resolveAction(inputMode?: string): string {
  if (inputMode === 'image') return 'imageConversion'
  if (inputMode === 'figma') return 'figmaConversion'
  return 'textGeneration'
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

  const plan = await Plan.findOne({ slug: bob.subscription.plan, isActive: true })
  if (!plan) {
    console.error('Plan not found!')
    await mongoose.disconnect()
    return
  }

  console.log(`User: ${bob.email}, Plan: ${bob.subscription.plan}\n`)

  // 1. GENERATION MODES RESOLUTION TEST
  console.log('--- 1. Testing Generation Modes Dynamic Credits Resolution ---')
  const modes = [
    { mode: 'text', expectedCost: plan.creditCosts.textGeneration },
    { mode: 'image', expectedCost: plan.creditCosts.imageConversion },
    { mode: 'figma', expectedCost: plan.creditCosts.figmaConversion }
  ]

  for (const item of modes) {
    const action = resolveAction(item.mode) as 'textGeneration' | 'imageConversion' | 'figmaConversion' | 'themeExport'
    const cost = plan.creditCosts[action]
    console.log(`InputMode: ${item.mode} -> Resolved Action: ${action} -> Cost: ${cost} credits (Expected: ${item.expectedCost})`)
    if (cost === item.expectedCost) {
      console.log(`[PASS] Correctly resolved to ${cost} credits.`)
    } else {
      console.error(`[FAIL] Expected ${item.expectedCost} credits, but got ${cost}.`)
    }
  }

  // 2. EXPORT DOWNLOAD CREDITS TEST
  console.log('\n--- 2. Testing Export/Download Credits Check and Deduction ---')
  const origBobCredits = bob.credits.remaining
  const themeExportCost = plan.creditCosts.themeExport
  console.log(`Theme Export Cost: ${themeExportCost} credits. Original Bob credits: ${origBobCredits}`)

  // Case A: Insufficient credits (Set to 1)
  console.log('Setting Bob\'s credits to 1 (insufficient for export)...')
  bob.credits.remaining = 1
  await bob.save()

  let userFresh = await User.findById(bob._id)
  if (userFresh && userFresh.credits.remaining < themeExportCost) {
    console.log(`[PASS] Correctly blocked export: Remaining credits (${userFresh.credits.remaining}) < Cost (${themeExportCost})`)
  } else {
    console.error(`[FAIL] Export check failed to block with insufficient credits.`)
  }

  // Case B: Sufficient credits (Set to 5)
  console.log('Setting Bob\'s credits to 5 (sufficient)...')
  bob.credits.remaining = 5
  await bob.save()

  // Deduct
  await creditService.deduct(String(bob._id), themeExportCost, 'test_export_deduction')
  userFresh = await User.findById(bob._id)
  console.log(`Credits remaining after deduction: ${userFresh?.credits.remaining}`)
  if (userFresh && userFresh.credits.remaining === 5 - themeExportCost) {
    console.log(`[PASS] Successfully deducted ${themeExportCost} credits for export!`)
  } else {
    console.error(`[FAIL] Expected ${5 - themeExportCost} credits remaining, but got ${userFresh?.credits.remaining}`)
  }

  // Restore Bob\'s original credits
  bob.credits.remaining = origBobCredits
  await bob.save()
  console.log('\n[INFO] Restored Bob\'s credits to original.')

  await mongoose.disconnect()
  console.log('Done!')
}

run().catch(err => {
  console.error('Error running test script:', err)
  process.exit(1)
})
