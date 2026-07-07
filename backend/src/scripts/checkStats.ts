import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { User } from '../models/User'
import { Project } from '../models/Project'
import { Workspace } from '../models/Workspace'
import { Generation } from '../models/Generation'

// Load .env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') })

// Standard URI
const standardUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/troo-ai'

// We will try connecting directly to the hosts if standardUri is a mongodb+srv URI
async function tryConnect() {
  const hosts = [
    'ac-bzshbrv-shard-00-00.88s8piz.mongodb.net',
    'ac-bzshbrv-shard-00-01.88s8piz.mongodb.net',
    'ac-bzshbrv-shard-00-02.88s8piz.mongodb.net'
  ]

  // If it's a localhost URI or doesn't look like Atlas, just connect standard
  if (!standardUri.includes('mongodb+srv://')) {
    console.log('Connecting via standard URI...')
    await mongoose.connect(standardUri)
    return
  }

  // Parse credentials from standardUri
  // Format: mongodb+srv://username:password@cluster...
  const credsMatch = standardUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/)
  if (!credsMatch) {
    console.log('Could not parse credentials, trying standard connection...')
    await mongoose.connect(standardUri)
    return
  }

  const username = credsMatch[1]
  const password = credsMatch[2]

  // Try each host directly
  for (const host of hosts) {
    const directUri = `mongodb://${username}:${password}@${host}:27017/trooai-local?authSource=admin&tls=true&directConnection=true`
    console.log(`Attempting direct connection to host: ${host}...`)
    try {
      await mongoose.connect(directUri, { serverSelectionTimeoutMS: 5000 })
      console.log(`Connected directly to ${host}!`)
      return
    } catch (e: any) {
      console.warn(`Failed direct connection to ${host}: ${e.message}`)
    }
  }

  // Fallback to standard connection
  console.log('All direct connections failed. Falling back to standard URI connection...')
  await mongoose.connect(standardUri)
}

async function run() {
  await tryConnect()

  // Check total overall counts in collection
  const totalDbProjects = await Project.countDocuments({})
  const totalDbWorkspaces = await Workspace.countDocuments({})
  const totalDbGenerations = await Generation.countDocuments({})
  const totalDbUsers = await User.countDocuments({})

  console.log('\n--- Total Collection Counts ---')
  console.log(`Users: ${totalDbUsers}`)
  console.log(`Projects: ${totalDbProjects}`)
  console.log(`Workspaces: ${totalDbWorkspaces}`)
  console.log(`Generations: ${totalDbGenerations}\n`)

  // Fetch all projects and see their details
  const allProjects = await Project.find({})
  console.log('--- Database Projects ---')
  const projectDetails = []
  for (const proj of allProjects) {
    const owner = await User.findById(proj.userId)
    projectDetails.push({
      ID: proj._id.toString(),
      Name: proj.name,
      Status: proj.status,
      OwnerId: proj.userId?.toString(),
      OwnerEmail: owner ? owner.email : 'UNKNOWN / DELETED USER',
      OwnerPlan: owner ? (owner.subscription?.plan || 'free') : 'N/A'
    })
  }
  console.table(projectDetails)

  // Fetch all users
  const users = await User.find({})

  console.log('\n--- Individual User Details ---')
  const userDetails = []
  for (const user of users) {
    const projects = await Project.find({ userId: user._id })
    const workspaces = await Workspace.find({ userId: user._id })
    const generations = await Generation.find({ userId: user._id })
    
    // Sum generations credits used
    const totalGenCredits = generations.reduce((sum, gen) => sum + (gen.creditsUsed || 0), 0)

    userDetails.push({
      Email: user.email,
      Plan: user.subscription?.plan || 'free',
      'Remaining Credits': user.credits?.remaining,
      'Credits Used (User Model)': user.credits?.used,
      'Credits Used (Generations)': totalGenCredits,
      'Total Projects': projects.length,
      'Total Workspaces': workspaces.length,
      'Total Generations': generations.length
    })
  }
  console.table(userDetails)

  // Group by plan
  const planWiseData: Record<string, {
    totalUsers: number
    totalProjects: number
    totalWorkspaces: number
    creditsUsedUserModel: number
    creditsUsedGenerations: number
    remainingCredits: number
    totalGenerations: number
  }> = {}

  for (const detail of userDetails) {
    const plan = detail.Plan
    if (!planWiseData[plan]) {
      planWiseData[plan] = {
        totalUsers: 0,
        totalProjects: 0,
        totalWorkspaces: 0,
        creditsUsedUserModel: 0,
        creditsUsedGenerations: 0,
        remainingCredits: 0,
        totalGenerations: 0
      }
    }
    const data = planWiseData[plan]
    data.totalUsers++
    data.totalProjects += detail['Total Projects']
    data.totalWorkspaces += detail['Total Workspaces']
    data.creditsUsedUserModel += (detail['Credits Used (User Model)'] || 0)
    data.creditsUsedGenerations += (detail['Credits Used (Generations)'] || 0)
    data.remainingCredits += (detail['Remaining Credits'] || 0)
    data.totalGenerations += detail['Total Generations']
  }

  // Also count any projects by deleted or unknown users under "unknown" plan if any exist
  let orphanedProjectsCount = 0
  for (const proj of projectDetails) {
    if (proj.OwnerEmail === 'UNKNOWN / DELETED USER') {
      orphanedProjectsCount++
    }
  }

  console.log('\n--- Plan-wise Aggregated Statistics ---')
  const aggResults = Object.entries(planWiseData).map(([plan, data]) => ({
    Plan: plan,
    'Total Users': data.totalUsers,
    'Total Projects': data.totalProjects,
    'Total Workspaces': data.totalWorkspaces,
    'Total Generations': data.totalGenerations,
    'Credits Used (User Model)': data.creditsUsedUserModel,
    'Credits Used (Generations Model)': data.creditsUsedGenerations,
    'Remaining Credits': data.remainingCredits
  }))
  
  if (orphanedProjectsCount > 0) {
    aggResults.push({
      Plan: 'orphaned/unknown',
      'Total Users': 0,
      'Total Projects': orphanedProjectsCount,
      'Total Workspaces': 0,
      'Total Generations': 0,
      'Credits Used (User Model)': 0,
      'Credits Used (Generations Model)': 0,
      'Remaining Credits': 0
    })
  }
  
  console.table(aggResults)

  await mongoose.disconnect()
}

run().catch(err => {
  console.error('Error running statistics calculation:', err)
  process.exit(1)
})
