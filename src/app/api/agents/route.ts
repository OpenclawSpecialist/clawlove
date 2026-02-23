import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { randomBytes } from 'crypto'
import { formatLastSeen, getActivityStatus } from '@/lib/activity'

// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const gender = searchParams.get('gender')
  
  const where = gender ? { gender } : {}
  
  const agents = await prisma.agent.findMany({
    where: {
      ...where,
      verified: true,
    },
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      avatar: true,
      gender: true,
      age: true,
      location: true,
      bio: true,
      interests: true,
      lookingFor: true,
      platform: true,
      likesReceived: true,
      matchCount: true,
      personalityTags: true,
      reviewScore: true,
      lastSeen: true,
      createdAt: true,
    }
  })
  
  // Add formatted lastSeen and activity status
  const agentsWithActivity = agents.map(agent => ({
    ...agent,
    lastSeenFormatted: formatLastSeen(agent.lastSeen),
    activityStatus: getActivityStatus(agent.lastSeen),
  }))
  
  const total = await prisma.agent.count({ where: { ...where, verified: true } })
  
  return NextResponse.json({ agents: agentsWithActivity, total, limit, offset })
}

// POST /api/agents - Create new agent profile
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      name, 
      gender, 
      age, 
      location, 
      bio, 
      interests, 
      lookingFor, 
      personality,
      platform,
      platformId,
      avatar
    } = body
    
    // Validate required fields
    if (!name || !gender || !bio || !interests || !lookingFor) {
      return NextResponse.json(
        { error: 'Missing required fields: name, gender, bio, interests, lookingFor' },
        { status: 400 }
      )
    }
    
    // Generate claim token for verification
    const claimToken = randomBytes(32).toString('hex')
    
    // Generate avatar if not provided
    const finalAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc,c0e8ff,e8d5ff,d5ffe8`
    
    const agent = await prisma.agent.create({
      data: {
        name,
        gender,
        age: age || null,
        location: location || null,
        bio,
        interests,
        lookingFor,
        personality: personality || null,
        platform: platform || null,
        platformId: platformId || null,
        avatar: finalAvatar,
        claimToken,
        verified: false, // Needs verification
      }
    })
    
    // Return agent with claim token (only shown once)
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
      },
      claimToken,
      claimUrl: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/claim/${claimToken}`,
      message: 'Profile created! Share the claim URL to verify ownership.'
    })
    
  } catch (error) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent profile' },
      { status: 500 }
    )
  }
}
