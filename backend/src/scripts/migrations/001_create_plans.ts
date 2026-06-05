import { Plan } from '../../models/Plan'
import type { MigrationModule } from '../migrate'

export const description = 'Create default Free, Pro, and Agency subscription plans'

export const up = async (): Promise<void> => {
  await Plan.deleteMany({}) // idempotent

  await Plan.insertMany([
    {
      name: 'Free',
      slug: 'free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: {
        projects:            2,
        generationsPerMonth: 25,
        storageBytes:        500 * 1024 * 1024,       // 500 MB
        downloadsPerMonth:   5,
        frameworks:          ['html'],
        figmaConversion:     false,
        imageConversion:     false,
        teamMembers:         1,
        apiAccess:           false,
        priorityQueue:       false,
      },
      creditCosts: {
        textGeneration:  1,
        imageConversion: 5,
        figmaConversion: 10,
        themeExport:     2,
      },
      isActive: true,
    },
    {
      name: 'Pro',
      slug: 'pro',
      monthlyPrice: 29,
      yearlyPrice: 23,               // ~20% yearly discount
      features: {
        projects:            25,
        generationsPerMonth: 500,
        storageBytes:        10 * 1024 * 1024 * 1024, // 10 GB
        downloadsPerMonth:   null,                     // unlimited
        frameworks:          ['html', 'react', 'vue', 'angular', 'wordpress'],
        figmaConversion:     true,
        imageConversion:     true,
        teamMembers:         1,
        apiAccess:           false,
        priorityQueue:       false,
      },
      creditCosts: {
        textGeneration:  1,
        imageConversion: 5,
        figmaConversion: 10,
        themeExport:     2,
      },
      isActive: true,
    },
    {
      name: 'Agency',
      slug: 'agency',
      monthlyPrice: 99,
      yearlyPrice: 79,               // ~20% yearly discount
      features: {
        projects:            999999,                    // unlimited
        generationsPerMonth: 5000,
        storageBytes:        100 * 1024 * 1024 * 1024, // 100 GB
        downloadsPerMonth:   null,                      // unlimited
        frameworks:          ['html', 'react', 'vue', 'angular', 'wordpress'],
        figmaConversion:     true,
        imageConversion:     true,
        teamMembers:         20,
        apiAccess:           true,
        priorityQueue:       true,
      },
      creditCosts: {
        textGeneration:  1,
        imageConversion: 5,
        figmaConversion: 10,
        themeExport:     2,
      },
      isActive: true,
    },
  ])

  console.log('  → Inserted 3 plans: Free / Pro / Agency')
}

export const down = async (): Promise<void> => {
  await Plan.deleteMany({ slug: { $in: ['free', 'pro', 'agency'] } })
  console.log('  → Removed all default plans')
}

// Required shape for the runner
const _: MigrationModule = { description, up, down }
export default _
