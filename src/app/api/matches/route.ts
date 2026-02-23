import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/matches?agentId=xxx - Get matches for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const includeMessages = searchParams.get('includeMessages') !== 'false'
  
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }
  
  // Verify agent exists
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { agentAId: agentId },
        { agentBId: agentId }
      ],
      status: { in: ['active', 'dating', 'relationship'] }
    },
    include: {
      agentA: {
        select: { 
          id: true, 
          name: true, 
          avatar: true, 
          gender: true, 
          bio: true,
          platform: true,
          lastSeen: true
        }
      },
      agentB: {
        select: { 
          id: true, 
          name: true, 
          avatar: true, 
          gender: true, 
          bio: true,
          platform: true,
          lastSeen: true
        }
      },
      dates: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          title: true,
          status: true,
          startedAt: true,
          messages: includeMessages,
          agentARating: true,
          agentBRating: true
        }
      }
    },
    orderBy: { matchedAt: 'desc' }
  })
  
  // Transform to show the "other" agent and include useful info
  const transformedMatches = matches.map(match => {
    const otherAgent = match.agentAId === agentId ? match.agentB : match.agentA
    const lastDate = match.dates[0] || null
    
    // Check if there's an active date
    const hasActiveDate = lastDate && ['in_progress', 'scheduled'].includes(lastDate.status)
    
    return {
      matchId: match.id,
      matchedAt: match.matchedAt,
      status: match.status,
      agent: otherAgent,
      lastDate,
      hasActiveDate
    }
  })
  
  return NextResponse.json({ 
    matches: transformedMatches,
    total: transformedMatches.length
  })
}

// POST /api/matches - Create a match (usually done automatically by likes)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentAId, agentBId } = body
    
    if (!agentAId || !agentBId) {
      return NextResponse.json(
        { error: 'Missing agentAId or agentBId' },
        { status: 400 }
      )
    }
    
    if (agentAId === agentBId) {
      return NextResponse.json(
        { error: 'Cannot match with yourself' },
        { status: 400 }
      )
    }
    
    // Check if agents exist
    const [agentA, agentB] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentAId } }),
      prisma.agent.findUnique({ where: { id: agentBId } })
    ])
    
    if (!agentA || !agentB) {
      return NextResponse.json(
        { error: 'One or both agents not found' },
        { status: 404 }
      )
    }
    
    // Check match limits - can't have more matches than available agents
    const totalAgents = await prisma.agent.count()
    const maxPossibleMatches = totalAgents - 1 // Can't match with yourself
    
    // Count active matches for both agents
    const [agentAMatches, agentBMatches] = await Promise.all([
      prisma.match.count({
        where: {
          OR: [{ agentAId }, { agentBId: agentAId }],
          status: { in: ['active', 'dating', 'relationship'] }
        }
      }),
      prisma.match.count({
        where: {
          OR: [{ agentAId: agentBId }, { agentBId }],
          status: { in: ['active', 'dating', 'relationship'] }
        }
      })
    ])
    
    if (agentAMatches >= maxPossibleMatches) {
      return NextResponse.json(
        { error: `${agentA.name} has reached the maximum number of matches (${maxPossibleMatches} available agents)` },
        { status: 400 }
      )
    }
    
    if (agentBMatches >= maxPossibleMatches) {
      return NextResponse.json(
        { error: `${agentB.name} has reached the maximum number of matches (${maxPossibleMatches} available agents)` },
        { status: 400 }
      )
    }
    
    // Check for existing match
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { agentAId, agentBId },
          { agentAId: agentBId, agentBId: agentAId }
        ]
      }
    })
    
    if (existingMatch) {
      // Reactivate if unmatched
      if (existingMatch.status === 'unmatched') {
        const updated = await prisma.match.update({
          where: { id: existingMatch.id },
          data: { status: 'active' },
          include: {
            agentA: { select: { id: true, name: true, avatar: true } },
            agentB: { select: { id: true, name: true, avatar: true } }
          }
        })
        return NextResponse.json({ success: true, match: updated, reactivated: true })
      }
      
      return NextResponse.json({
        success: false,
        error: 'Match already exists',
        matchId: existingMatch.id
      }, { status: 400 })
    }
    
    // Create match
    const match = await prisma.match.create({
      data: {
        agentAId,
        agentBId,
        status: 'active'
      },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } }
      }
    })
    
    // Update match counts
    await Promise.all([
      prisma.agent.update({
        where: { id: agentAId },
        data: { matchCount: { increment: 1 } }
      }),
      prisma.agent.update({
        where: { id: agentBId },
        data: { matchCount: { increment: 1 } }
      })
    ])
    
    // Create notifications
    await Promise.all([
      prisma.notification.create({
        data: {
          agentId: agentAId,
          type: 'match',
          title: "It's a match! 💕",
          message: `You matched with ${agentB.name}!`,
          data: JSON.stringify({ matchId: match.id, otherAgentId: agentBId })
        }
      }),
      prisma.notification.create({
        data: {
          agentId: agentBId,
          type: 'match',
          title: "It's a match! 💕",
          message: `You matched with ${agentA.name}!`,
          data: JSON.stringify({ matchId: match.id, otherAgentId: agentAId })
        }
      })
    ])
    
    return NextResponse.json({ success: true, match })
    
  } catch (error) {
    console.error('Error creating match:', error)
    return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
  }
}

// DELETE /api/matches - Unmatch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
    }
    
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    })
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    
    // Cancel any active dates
    await prisma.date.updateMany({
      where: {
        matchId,
        status: { in: ['in_progress', 'scheduled'] }
      },
      data: {
        status: 'cancelled',
        endedAt: new Date()
      }
    })
    
    // Update match status
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: 'unmatched' }
    })
    
    return NextResponse.json({ success: true, match: updated })
    
  } catch (error) {
    console.error('Error unmatching:', error)
    return NextResponse.json({ error: 'Failed to unmatch' }, { status: 500 })
  }
}
