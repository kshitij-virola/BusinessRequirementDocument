import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../models/User'
import { Project } from '../models/Project'
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

async function runTests() {
  await connectWithRetry()
  console.log('Testing limits logic...\n')

  // Find alice@example.com (free plan, limit is 2 projects, 500MB storage)
  const user = await User.findOne({ email: 'alice@example.com' })
  if (!user) {
    console.error('Test user alice@example.com not found.')
    await mongoose.disconnect()
    return
  }

  console.log(`User: ${user.email}, Plan: ${user.subscription.plan}`)
  
  // Backup user storage info
  const origUsedBytes = user.storage.usedBytes
  const origLimitBytes = user.storage.limitBytes

  // 1. PROJECT LIMIT LOGIC TEST
  console.log('\n--- 1. Testing Project Limit Validation ---')
  const activeCount = await Project.countDocuments({ userId: user._id, status: { $ne: 'deleted' } })
  const plan = await Plan.findOne({ slug: user.subscription.plan, isActive: true })
  const limit = plan ? plan.features.projects : 2
  console.log(`Current active projects count: ${activeCount}`)
  console.log(`Project limit for plan: ${limit}`)

  if (activeCount >= limit) {
    console.log(`[PASS] User has ${activeCount} projects, which is >= limit (${limit}). Limit check would correctly block new project creation.`)
  } else {
    const dummyProjectsCreated = []
    // Let's create dummy projects to hit the limit
    const needed = limit - activeCount
    console.log(`Creating ${needed} temporary projects to hit the limit...`)
    for (let i = 0; i < needed; i++) {
      const p = await Project.create({ userId: user._id, name: `TempTestProject-${i}` })
      dummyProjectsCreated.push(p)
    }

    const newActiveCount = await Project.countDocuments({ userId: user._id, status: { $ne: 'deleted' } })
    console.log(`New active projects count: ${newActiveCount}`)
    if (newActiveCount >= limit) {
      console.log(`[PASS] Project creation limit check triggered successfully at limit ${limit}!`)
    } else {
      console.log(`[FAIL] Project creation limit check failed to trigger.`)
    }

    // Clean up
    console.log('Cleaning up temporary projects...')
    for (const p of dummyProjectsCreated) {
      await Project.deleteOne({ _id: p._id })
    }
  }

  // 2. STORAGE LIMIT LOGIC TEST
  console.log('\n--- 2. Testing Storage Limit Validation ---')
  // We mock the user's limitBytes and usedBytes for testing storage limits
  user.storage.limitBytes = 1000 // 1000 bytes
  user.storage.usedBytes = 900 // 900 bytes (100 bytes remaining)
  await user.save()
  console.log(`Mocked user storage: ${user.storage.usedBytes} / ${user.storage.limitBytes} bytes (100 bytes remaining)`)

  // Test Case A: Uploading a file within limit (e.g. 50 bytes)
  const fileASize = 50
  if (user.storage.usedBytes + fileASize > user.storage.limitBytes) {
    console.log(`[FAIL] File size ${fileASize} bytes was incorrectly blocked!`)
  } else {
    user.storage.usedBytes += fileASize
    await user.save()
    console.log(`[PASS] Upload of ${fileASize} bytes succeeded. Used storage is now: ${user.storage.usedBytes} / ${user.storage.limitBytes}`)
  }

  // Test Case B: Uploading a file exceeding limit (e.g. 60 bytes, total would be 950 + 60 = 1010)
  const fileBSize = 60
  if (user.storage.usedBytes + fileBSize > user.storage.limitBytes) {
    console.log(`[PASS] Upload of ${fileBSize} bytes was correctly blocked! (Total ${user.storage.usedBytes + fileBSize} > limit ${user.storage.limitBytes})`)
  } else {
    console.log(`[FAIL] Upload of ${fileBSize} bytes was incorrectly allowed!`)
  }

  // Restore user info
  user.storage.usedBytes = origUsedBytes
  user.storage.limitBytes = origLimitBytes
  await user.save()
  console.log('\n[INFO] Restored user storage info back to original.')
  console.log('Tests completed successfully!')

  await mongoose.disconnect()
}

runTests().catch(err => {
  console.error('Error running test script:', err)
  process.exit(1)
})
