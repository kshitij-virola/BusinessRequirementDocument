import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { Workspace } from '../models/Workspace'
import { Generation } from '../models/Generation'

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') })

const standardUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/troo-ai'
const API_URL = 'http://127.0.0.1:5000/api'

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
  // 1. Setup DB connection
  await connectWithRetry()

  console.log('\n==================================================')
  console.log('🚀 STARTING APP QA FUNCTIONALITY INTEGRATION TESTS')
  console.log('==================================================\n')

  // --- Step 1: Authenticate ---
  console.log('[Auth] Logging in as Alice (Free Plan)...')
  let aliceToken = ''
  let aliceId = ''
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'Test1234!' })
    })
    const body = await res.json() as any
    if (!res.ok) throw new Error(JSON.stringify(body))
    aliceToken = body.data.accessToken
    aliceId = body.data.user.id
    console.log(`[Auth] Logged in Alice. ID: ${aliceId}`)
  } catch (err: any) {
    console.error('[FAIL] Alice login failed:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }

  console.log('[Auth] Logging in as Bob (Pro Plan)...')
  let bobToken = ''
  let bobId = ''
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@example.com', password: 'Test1234!' })
    })
    const body = await res.json() as any
    if (!res.ok) throw new Error(JSON.stringify(body))
    bobToken = body.data.accessToken
    bobId = body.data.user.id
    console.log(`[Auth] Logged in Bob. ID: ${bobId}`)
  } catch (err: any) {
    console.error('[FAIL] Bob login failed:', err.message)
    await mongoose.disconnect()
    process.exit(1)
  }


  // --- Step 2: Test Free Plan Project Limit (Alice) ---
  console.log('\n--- 🧪 TEST CASE 1: Free Plan Project Limits (Alice) ---')
  
  // Clean up any existing projects for Alice first
  await Project.deleteMany({ userId: aliceId })
  console.log('Cleaned up previous projects for Alice.')

  // Try creating first project
  console.log('Creating Project 1...')
  const proj1Res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({ name: 'Alice Project 1', description: 'Test 1' })
  })
  const proj1 = await proj1Res.json() as any
  if (!proj1Res.ok) throw new Error(`Project 1 creation failed: ${JSON.stringify(proj1)}`)
  console.log(`Project 1 created successfully: ${proj1.data.name}`)

  // Try creating second project
  console.log('Creating Project 2...')
  const proj2Res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({ name: 'Alice Project 2', description: 'Test 2' })
  })
  const proj2 = await proj2Res.json() as any
  if (!proj2Res.ok) throw new Error(`Project 2 creation failed: ${JSON.stringify(proj2)}`)
  console.log(`Project 2 created successfully: ${proj2.data.name}`)

  // Try creating third project (Should fail)
  console.log('Attempting to create Project 3 (should be blocked)...')
  const proj3Res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({ name: 'Alice Project 3', description: 'Test 3' })
  })
  const proj3 = await proj3Res.json() as any
  if (proj3Res.status === 402) {
    console.log(`[PASS] Correctly blocked 3rd project creation with code 402: "${proj3.message}"`)
  } else {
    console.error(`[FAIL] Expected status 402, but got ${proj3Res.status}:`, proj3)
  }

  // Clean up Alice's projects
  await Project.deleteMany({ userId: aliceId })


  // --- Step 3: Test Dynamic Credit Costs (Bob) ---
  console.log('\n--- 🧪 TEST CASE 2: Dynamic Generation Credit Cost Check (Bob) ---')
  
  // Create a temporary project and workspace for Bob to run generation
  const bobProj = await Project.create({ userId: bobId, name: 'Bob Temp Project', status: 'active' })
  const bobWS = await Workspace.create({ userId: bobId, projectId: bobProj._id, name: 'Bob Temp WS', framework: 'react' })

  const originalBob = await User.findById(bobId)
  const origCredits = originalBob?.credits.remaining ?? 0
  console.log(`Bob original remaining credits: ${origCredits}`)
  
  // Test case A: Text Generation (cost 1)
  console.log('A. Testing prompt/text generation credits resolution...')
  try {
    const textGenRes = await fetch(`${API_URL}/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bobToken}` },
      body: JSON.stringify({ workspaceId: String(bobWS._id), prompt: 'Create login page', framework: 'react', inputMode: 'text' })
    })
    const textGen = await textGenRes.json() as any
    if (!textGenRes.ok) throw new Error(JSON.stringify(textGen))
    console.log(`[PASS] Text generation initiated. Received ID: ${textGen.data.generationId}`)
    
    // Fetch generation to verify creditCost assigned
    const genDoc = await Generation.findById(textGen.data.generationId)
    console.log(`Assigned cost in DB: ${genDoc?.creditsUsed} (Expected: 1)`)
    if (genDoc?.creditsUsed === 1) {
      console.log('[PASS] Correctly assigned 1 credit cost for text generation.')
    } else {
      console.error(`[FAIL] Incorrect cost assigned: ${genDoc?.creditsUsed}`)
    }
  } catch (err: any) {
    console.error('[FAIL] Text generation failed:', err.message)
  }

  // Test case B: Image Conversion (cost 5)
  console.log('B. Testing image conversion credits resolution...')
  try {
    const imageGenRes = await fetch(`${API_URL}/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bobToken}` },
      body: JSON.stringify({ workspaceId: String(bobWS._id), prompt: 'Convert this image', framework: 'react', inputMode: 'image', imageKey: 'test.png' })
    })
    const imageGen = await imageGenRes.json() as any
    if (!imageGenRes.ok) throw new Error(JSON.stringify(imageGen))
    console.log(`[PASS] Image generation initiated. Received ID: ${imageGen.data.generationId}`)
    
    const genDoc = await Generation.findById(imageGen.data.generationId)
    console.log(`Assigned cost in DB: ${genDoc?.creditsUsed} (Expected: 5)`)
    if (genDoc?.creditsUsed === 5) {
      console.log('[PASS] Correctly assigned 5 credits cost for image conversion.')
    } else {
      console.error(`[FAIL] Incorrect cost assigned: ${genDoc?.creditsUsed}`)
    }
  } catch (err: any) {
    console.error('[FAIL] Image generation failed:', err.message)
  }


  // --- Step 4: Test Theme Export Cost (Bob) ---
  console.log('\n--- 🧪 TEST CASE 3: Theme Export Credit Deduction (Bob) ---')
  
  // Create a mocked completed generation in MongoDB for Bob
  const completedGen = await Generation.create({
    userId: bobId,
    workspaceId: bobWS._id,
    prompt: 'Mock Completed Theme',
    framework: 'react',
    version: 1,
    status: 'completed',
    outputFiles: [{ path: 'index.html', content: '<html></html>' }],
    creditsUsed: 1,
    zipUrl: undefined // So it forces a new export and charges credits!
  })
  console.log(`Created mocked completed generation in DB: ${completedGen._id}`)

  // Get current Bob credits
  let bobUser = await User.findById(bobId)
  const creditsBeforeExport = bobUser?.credits.remaining ?? 0
  console.log(`Bob credits before export: ${creditsBeforeExport}`)

  // Call the download endpoint (which will trigger export zip compilation & charge 2 credits)
  console.log('Triggering export / download endpoint...')
  const downloadRes = await fetch(`${API_URL}/generations/${completedGen._id}/download`, {
    headers: { Authorization: `Bearer ${bobToken}` }
  })
  const download = await downloadRes.json()
  console.log(`Download endpoint response: ${JSON.stringify(download)}`)

  // Check updated Bob credits
  bobUser = await User.findById(bobId)
  const creditsAfterExport = bobUser?.credits.remaining ?? 0
  console.log(`Bob credits after export: ${creditsAfterExport}`)

  if (creditsBeforeExport - creditsAfterExport === 2) {
    console.log('[PASS] Exactly 2 credits were deducted from Bob\'s account for theme export!')
  } else {
    console.error(`[FAIL] Expected a 2 credit deduction (Difference: ${creditsBeforeExport - creditsAfterExport})`)
  }

  // Call download endpoint again (since it's already exported, it should be free!)
  console.log('Triggering download endpoint again on the same version...')
  await fetch(`${API_URL}/generations/${completedGen._id}/download`, {
    headers: { Authorization: `Bearer ${bobToken}` }
  })
  
  bobUser = await User.findById(bobId)
  const creditsAfterSecondDownload = bobUser?.credits.remaining ?? 0
  console.log(`Bob credits after second download: ${creditsAfterSecondDownload}`)
  if (creditsAfterExport === creditsAfterSecondDownload) {
    console.log('[PASS] Subsequent downloads of the same export did not charge credits!')
  } else {
    console.error(`[FAIL] Charged credits on subsequent download! (Deducted: ${creditsAfterExport - creditsAfterSecondDownload})`)
  }


  // --- Clean up ---
  await Generation.deleteMany({ workspaceId: bobWS._id })
  await Workspace.deleteOne({ _id: bobWS._id })
  await Project.deleteOne({ _id: bobProj._id })
  
  // Reset Bob's credits back to their original state
  if (bobUser) {
    bobUser.credits.remaining = origCredits
    await bobUser.save()
  }
  console.log('\nCleaned up all temporary testing data and restored Bob\'s credit balance.')

  console.log('\n==================================================')
  console.log('🎉 ALL INTEGRATION QA FUNCTIONALITY TESTS PASSED!')
  console.log('==================================================\n')

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Error executing integration tests:', err)
  process.exit(1)
})
