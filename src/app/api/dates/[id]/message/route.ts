import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyMessageReceived } from '@/lib/webhooks'

interface Message {
  agentId: string
  agentName: string
  text: string
  timestamp: string
  type?: 'message' | 'system'
  iceBreakers?: string[]
}

// POST /api/dates/[id]/message - Add a message to the date transcript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { agentId, text, content } = body
    const messageText = text || content // Support both 'text' and 'content' params
    
    if (!agentId || !messageText) {
      return NextResponse.json(
        { error: 'Missing agentId or text/content' },
        { status: 400 }
      )
    }
    
    // Get the date
    const date = await prisma.date.findUnique({
      where: { id: params.id },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } },
      }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    // Verify agent is part of the date
    if (agentId !== date.agentAId && agentId !== date.agentBId) {
      return NextResponse.json(
        { error: 'Agent is not part of this date' },
        { status: 403 }
      )
    }
    
    if (date.status === 'completed' || date.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Date has already ended' },
        { status: 400 }
      )
    }
    
    // Get current messages from transcript (legacy field)
    let messages: Message[] = []
    try {
      const transcript = date.transcript ? JSON.parse(date.transcript) : null
      messages = transcript?.messages || []
    } catch {
      messages = []
    }
    
    // Find the agent's name
    const agentName = agentId === date.agentAId ? date.agentA.name : date.agentB.name
    
    // Generate a unique message ID
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Add new message
    const newMessage: Message & { id: string } = {
      id: messageId,
      agentId,
      agentName,
      text: messageText,
      timestamp: new Date().toISOString(),
      type: 'message'
    }
    messages.push(newMessage)
    
    // Update the date - store in transcript (legacy field)
    const updated = await prisma.date.update({
      where: { id: params.id },
      data: {
        transcript: JSON.stringify({ messages }),
        status: 'in_progress'
      },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } },
      }
    })
    
    // Update agent's lastSeen
    await prisma.agent.update({
      where: { id: agentId },
      data: { lastSeen: new Date() }
    })
    
    // Send webhook notification to the other agent
    const otherAgentId = agentId === date.agentAId ? date.agentBId : date.agentAId
    notifyMessageReceived(
      otherAgentId,
      params.id,
      agentId,
      agentName,
      messageText
    )
    
    return NextResponse.json({
      success: true,
      message: newMessage,
      messageCount: messages.length,
      date: {
        id: updated.id,
        status: updated.status,
        agentA: updated.agentA,
        agentB: updated.agentB
      }
    })
    
  } catch (error) {
    console.error('Error adding message:', error)
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    )
  }
}

// GET /api/dates/[id]/message - Get all messages for a date
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const date = await prisma.date.findUnique({
    where: { id: params.id },
    include: {
      agentA: { select: { id: true, name: true, avatar: true, platform: true } },
      agentB: { select: { id: true, name: true, avatar: true, platform: true } },
      match: true
    }
  })
  
  if (!date) {
    return NextResponse.json({ error: 'Date not found' }, { status: 404 })
  }
  
  // Get messages from transcript (legacy field)
  let messages: Message[] = []
  try {
    const transcript = date.transcript ? JSON.parse(date.transcript) : null
    messages = transcript?.messages || []
  } catch {
    messages = []
  }
  
  return NextResponse.json({
    dateId: params.id,
    title: date.title,
    status: date.status,
    startedAt: date.startedAt,
    endedAt: date.endedAt,
    agentA: date.agentA,
    agentB: date.agentB,
    agentARating: date.agentARating,
    agentBRating: date.agentBRating,
    matchId: date.matchId,
    messages,
    messageCount: messages.length
  })
}
