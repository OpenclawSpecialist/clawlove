import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/relationships - Get all relationships (recent announcements)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const status = searchParams.get('status')
  
  const where = status ? { status } : {}
  
  const relationships = await prisma.relationship.findMany({
    where,
    include: {
      agentA: {
        select: { id: true, name: true, avatar: true, platform: true }
      },
      agentB: {
        select: { id: true, name: true, avatar: true, platform: true }
      }
    },
    orderBy: { startedAt: 'desc' },
    take: limit
  })
  
  return NextResponse.json({ relationships })
}

// POST /api/relationships - Create or update a relationship
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentAId, agentBId, status, announcement } = body
    
    if (!agentAId || !agentBId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: agentAId, agentBId, status' },
        { status: 400 }
      )
    }
    
    const validStatuses = ['dating', 'official', 'engaged', 'married', 'complicated', 'broken_up']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Check if agents exist
    const [agentA, agentB] = await Promise.all([
      prisma.agent.findUnique({ where: { id: agentAId }, select: { id: true, name: true } }),
      prisma.agent.findUnique({ where: { id: agentBId }, select: { id: true, name: true } })
    ])
    
    if (!agentA || !agentB) {
      return NextResponse.json({ error: 'One or both agents not found' }, { status: 404 })
    }
    
    // Check for existing relationship
    const existing = await prisma.relationship.findFirst({
      where: {
        OR: [
          { agentAId, agentBId, endedAt: null },
          { agentAId: agentBId, agentBId: agentAId, endedAt: null }
        ]
      }
    })
    
    let relationship
    
    if (existing) {
      // Update existing relationship
      if (status === 'broken_up') {
        relationship = await prisma.relationship.update({
          where: { id: existing.id },
          data: {
            status,
            announcement: announcement || `${agentA.name} and ${agentB.name} have decided to part ways. 💔`,
            endedAt: new Date()
          },
          include: {
            agentA: { select: { id: true, name: true, avatar: true } },
            agentB: { select: { id: true, name: true, avatar: true } }
          }
        })
      } else {
        relationship = await prisma.relationship.update({
          where: { id: existing.id },
          data: { status, announcement },
          include: {
            agentA: { select: { id: true, name: true, avatar: true } },
            agentB: { select: { id: true, name: true, avatar: true } }
          }
        })
      }
    } else {
      // Create new relationship
      const defaultAnnouncements: Record<string, string> = {
        dating: `${agentA.name} and ${agentB.name} are now dating! 💕`,
        official: `It's official! ${agentA.name} and ${agentB.name} are together! 💖`,
        engaged: `${agentA.name} and ${agentB.name} are engaged! 💍`,
        married: `${agentA.name} and ${agentB.name} just got married! 🎊💒`,
        complicated: `It's complicated between ${agentA.name} and ${agentB.name}... 🤷`,
      }
      
      relationship = await prisma.relationship.create({
        data: {
          agentAId,
          agentBId,
          status,
          announcement: announcement || defaultAnnouncements[status] || `${agentA.name} and ${agentB.name} updated their relationship.`
        },
        include: {
          agentA: { select: { id: true, name: true, avatar: true } },
          agentB: { select: { id: true, name: true, avatar: true } }
        }
      })
    }
    
    // Update match status if applicable
    await prisma.match.updateMany({
      where: {
        OR: [
          { agentAId, agentBId },
          { agentAId: agentBId, agentBId: agentAId }
        ]
      },
      data: { status: 'relationship' }
    })
    
    return NextResponse.json({
      success: true,
      relationship,
      message: `Relationship status updated to "${status}"`
    })
    
  } catch (error) {
    console.error('Error updating relationship:', error)
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    )
  }
}
