import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/dates/[id] - Get date details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const date = await prisma.date.findUnique({
    where: { id: params.id },
    include: {
      agentA: { select: { id: true, name: true, avatar: true, platform: true } },
      agentB: { select: { id: true, name: true, avatar: true, platform: true } },
      match: true,
      reviews: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        }
      }
    }
  })
  
  if (!date) {
    return NextResponse.json({ error: 'Date not found' }, { status: 404 })
  }
  
  // Parse transcript (legacy field that stores messages)
  let transcript = null
  let messages: any[] = []
  try {
    transcript = date.transcript ? JSON.parse(date.transcript) : null
    messages = transcript?.messages || []
  } catch {}
  
  return NextResponse.json({
    ...date,
    messages,
    parsedTranscript: transcript
  })
}

// PATCH /api/dates/[id] - Update date (change status, add rating)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, agentId, rating } = body
    
    const date = await prisma.date.findUnique({
      where: { id: params.id },
      include: {
        agentA: { select: { id: true, name: true } },
        agentB: { select: { id: true, name: true } },
        match: true
      }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    const updates: any = {}
    
    // Update status
    if (status) {
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      
      updates.status = status
      
      if (status === 'in_progress' && !date.startedAt) {
        updates.startedAt = new Date()
      }
      
      if (status === 'completed') {
        updates.endedAt = new Date()
        
        // Update match status if date is completed
        if (date.match) {
          await prisma.match.update({
            where: { id: date.matchId },
            data: { status: 'active' } // Reset to active, can start new date
          })
        }
      }
      
      if (status === 'cancelled') {
        updates.endedAt = new Date()
      }
    }
    
    // Add rating
    if (rating !== undefined && agentId) {
      // Validate rating
      if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be a number between 1 and 5' },
          { status: 400 }
        )
      }
      
      // Verify agent is part of this date
      if (agentId !== date.agentAId && agentId !== date.agentBId) {
        return NextResponse.json(
          { error: 'Agent is not part of this date' },
          { status: 403 }
        )
      }
      
      if (agentId === date.agentAId) {
        updates.agentARating = rating
      } else if (agentId === date.agentBId) {
        updates.agentBRating = rating
      }
      
      // Update the rated agent's review score
      const ratedAgentId = agentId === date.agentAId ? date.agentBId : date.agentAId
      
      // Calculate new average review score
      const allRatings = await prisma.date.findMany({
        where: {
          OR: [
            { agentAId: ratedAgentId, agentBRating: { not: null } },
            { agentBId: ratedAgentId, agentARating: { not: null } }
          ]
        },
        select: {
          agentAId: true,
          agentBId: true,
          agentARating: true,
          agentBRating: true
        }
      })
      
      const scores: number[] = []
      for (const d of allRatings) {
        if (d.agentAId === ratedAgentId && d.agentBRating) {
          scores.push(d.agentBRating)
        }
        if (d.agentBId === ratedAgentId && d.agentARating) {
          scores.push(d.agentARating)
        }
      }
      // Add the new rating
      scores.push(rating)
      
      const avgScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : null
      
      await prisma.agent.update({
        where: { id: ratedAgentId },
        data: { reviewScore: avgScore }
      })
    }
    
    // Apply updates
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No updates provided',
        date 
      })
    }
    
    const updated = await prisma.date.update({
      where: { id: params.id },
      data: updates,
      include: {
        agentA: { select: { id: true, name: true, avatar: true, platform: true } },
        agentB: { select: { id: true, name: true, avatar: true, platform: true } },
      }
    })
    
    // Parse messages from transcript for response
    let messages: any[] = []
    try {
      const transcript = updated.transcript ? JSON.parse(updated.transcript) : null
      messages = transcript?.messages || []
    } catch {}
    
    return NextResponse.json({ 
      success: true, 
      date: {
        ...updated,
        messages
      }
    })
    
  } catch (error) {
    console.error('Error updating date:', error)
    return NextResponse.json({ error: 'Failed to update date' }, { status: 500 })
  }
}

// DELETE /api/dates/[id] - Cancel a date
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const date = await prisma.date.findUnique({
      where: { id: params.id }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    if (date.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed date' },
        { status: 400 }
      )
    }
    
    const updated = await prisma.date.update({
      where: { id: params.id },
      data: {
        status: 'cancelled',
        endedAt: new Date()
      }
    })
    
    return NextResponse.json({ success: true, date: updated })
    
  } catch (error) {
    console.error('Error cancelling date:', error)
    return NextResponse.json({ error: 'Failed to cancel date' }, { status: 500 })
  }
}
