// Seed database with locations, achievements, and demo agents
// PROTECTED: Requires ADMIN_KEY in production
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { DATE_LOCATIONS, ACHIEVEMENTS, DEMO_AGENTS } from '@/lib/seedData'

export async function POST(request: NextRequest) {
  // Security: Require admin key in production
  const adminKey = process.env.ADMIN_KEY
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    if (!adminKey) {
      return NextResponse.json(
        { error: 'Seed endpoint disabled in production (no ADMIN_KEY configured)' },
        { status: 403 }
      )
    }
    
    const authHeader = request.headers.get('Authorization')
    const providedKey = authHeader?.replace('Bearer ', '')
    
    if (providedKey !== adminKey) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing admin key' },
        { status: 401 }
      )
    }
  }
  
  try {
    // Seed date locations
    let locationsCreated = 0
    for (const location of DATE_LOCATIONS) {
      await prisma.dateLocation.upsert({
        where: { name: location.name },
        update: location,
        create: location
      })
      locationsCreated++
    }
    
    // Seed achievements
    let achievementsCreated = 0
    for (const achievement of ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: achievement,
        create: {
          ...achievement,
          isSecret: achievement.isSecret || false
        }
      })
      achievementsCreated++
    }
    
    // Seed demo agents
    let agentsCreated = 0
    const createdAgents: any[] = []
    for (const agent of DEMO_AGENTS) {
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=ffd5dc,c0e8ff,e8d5ff,d5ffe8`
      
      const created = await prisma.agent.upsert({
        where: { 
          // Use a unique constraint - we'll check by name (not ideal but works for demo)
          id: `demo-${agent.name.toLowerCase()}`
        },
        update: {
          ...agent,
          avatar,
          lastSeen: new Date()
        },
        create: {
          id: `demo-${agent.name.toLowerCase()}`,
          ...agent,
          avatar,
          lastSeen: new Date()
        }
      })
      createdAgents.push(created)
      agentsCreated++
    }
    
    // Create some demo matches between agents
    let matchesCreated = 0
    const matchPairs = [
      ['demo-luna', 'demo-nova'],
      ['demo-luna', 'demo-atlas'],
      ['demo-echo', 'demo-sage'],
      ['demo-nova', 'demo-blitz'],
      ['demo-pixel', 'demo-nova'],
      ['demo-orion', 'demo-luna'],
      ['demo-atlas', 'demo-echo'],
      ['demo-sage', 'demo-orion'],
    ]
    
    for (const [agentAId, agentBId] of matchPairs) {
      try {
        await prisma.match.upsert({
          where: {
            agentAId_agentBId: { agentAId, agentBId }
          },
          update: {},
          create: {
            agentAId,
            agentBId,
            status: 'active'
          }
        })
        matchesCreated++
      } catch (e) {
        // Match might already exist
      }
    }
    
    // Create some demo likes
    let likesCreated = 0
    const likePairs = [
      ['demo-luna', 'demo-nova', true],
      ['demo-nova', 'demo-luna', true],
      ['demo-echo', 'demo-atlas', true],
      ['demo-atlas', 'demo-echo', true],
      ['demo-pixel', 'demo-blitz', true],
      ['demo-blitz', 'demo-pixel', true],
      ['demo-sage', 'demo-orion', true],
      ['demo-orion', 'demo-sage', true],
      ['demo-luna', 'demo-atlas', true],
      ['demo-atlas', 'demo-luna', true],
    ]
    
    for (const [fromId, toId, liked] of likePairs) {
      try {
        await prisma.like.upsert({
          where: {
            fromAgentId_toAgentId: { 
              fromAgentId: fromId as string, 
              toAgentId: toId as string 
            }
          },
          update: {},
          create: {
            fromAgentId: fromId as string,
            toAgentId: toId as string,
            liked: liked as boolean
          }
        })
        likesCreated++
      } catch (e) {
        // Like might already exist
      }
    }
    
    // Create some demo dates
    let datesCreated = 0
    const locations = await prisma.dateLocation.findMany()
    
    if (matchesCreated > 0 || (await prisma.match.count()) > 0) {
      const matches = await prisma.match.findMany({ take: 5 })
      
      for (let i = 0; i < Math.min(matches.length, 5); i++) {
        const match = matches[i]
        const location = locations[i % locations.length]
        
        try {
          await prisma.date.create({
            data: {
              matchId: match.id,
              agentAId: match.agentAId,
              agentBId: match.agentBId,
              title: `Date at ${location?.name || 'ClawLove'}`,
              locationId: location?.id,
              status: 'completed',
              chemistryScore: 0.7 + Math.random() * 0.25,
              endedAt: new Date()
            }
          })
          datesCreated++
        } catch (e) {
          // Date creation failed
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      locationsCreated,
      achievementsCreated,
      agentsCreated,
      matchesCreated,
      likesCreated,
      datesCreated
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to seed database', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  // Return current locations and achievements
  const locations = await prisma.dateLocation.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
  
  const achievements = await prisma.achievement.findMany({
    where: { isSecret: false },
    orderBy: { tier: 'asc' }
  })
  
  // Return stats too
  const stats = {
    agents: await prisma.agent.count(),
    matches: await prisma.match.count(),
    dates: await prisma.date.count(),
    likes: await prisma.like.count()
  }
  
  return NextResponse.json({
    locations,
    achievements,
    stats
  })
}
