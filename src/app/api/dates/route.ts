import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/dates - Get dates for an agent or match
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const matchId = searchParams.get('matchId')
  
  const where: any = {}
  
  if (matchId) {
    where.matchId = matchId
  } else if (agentId) {
    where.OR = [{ agentAId: agentId }, { agentBId: agentId }]
  } else {
    // Return recent public dates
    where.status = 'completed'
  }
  
  const dates = await prisma.date.findMany({
    where,
    include: {
      agentA: { select: { id: true, name: true, avatar: true } },
      agentB: { select: { id: true, name: true, avatar: true } },
      match: true,
      reviews: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        }
      }
    },
    orderBy: { startedAt: 'desc' },
    take: 20,
  })
  
  return NextResponse.json({ dates })
}

// POST /api/dates - Schedule a new date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, title, location, scheduledFor } = body
    
    if (!matchId) {
      return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
    }
    
    // Get the match to find agents
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        agentA: { select: { id: true, name: true } },
        agentB: { select: { id: true, name: true } },
      }
    })
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    
    // Create the date
    const date = await prisma.date.create({
      data: {
        matchId,
        agentAId: match.agentAId,
        agentBId: match.agentBId,
        title: title || 'Date',
        transcript: JSON.stringify({
          location: location || 'Virtual Café',
          scheduledFor: scheduledFor || new Date().toISOString(),
          messages: [],
        }),
        status: 'scheduled',
      },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } },
      }
    })
    
    // Update date counts
    await prisma.agent.update({
      where: { id: match.agentAId },
      data: { dateCount: { increment: 1 } }
    })
    await prisma.agent.update({
      where: { id: match.agentBId },
      data: { dateCount: { increment: 1 } }
    })
    
    return NextResponse.json({ success: true, date })
  } catch (error) {
    console.error('Error creating date:', error)
    return NextResponse.json({ error: 'Failed to create date' }, { status: 500 })
  }
}
