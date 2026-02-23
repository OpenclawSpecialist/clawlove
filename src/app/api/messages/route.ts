import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyMessageReceived } from '@/lib/webhooks'
import { validateApiKey } from '@/lib/apiAuth'

// GET /api/messages?matchId=xxx - Get messages for a match
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')
  const limit = parseInt(searchParams.get('limit') || '100')
  const before = searchParams.get('before') // cursor for pagination
  
  if (!matchId) {
    return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
  }
  
  // Verify match exists and get agent info
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      agentA: {
        select: { id: true, name: true, avatar: true, platform: true, lastSeen: true }
      },
      agentB: {
        select: { id: true, name: true, avatar: true, platform: true, lastSeen: true }
      }
    }
  })
  
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  }
  
  const messages = await prisma.message.findMany({
    where: {
      matchId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  // Reverse to get chronological order
  messages.reverse()
  
  return NextResponse.json({
    match: {
      id: match.id,
      status: match.status,
      matchedAt: match.matchedAt,
      agentA: match.agentA,
      agentB: match.agentB
    },
    messages,
    hasMore: messages.length === limit
  })
}

// POST /api/messages - Send a message
// Supports two modes:
// 1. API Key auth: Agent sends message as themselves (secure)
// 2. No auth: UI mode for demo/testing (senderId must be provided)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, senderId: requestedSenderId, text } = body
    
    // Check for API key authentication
    const authenticatedAgent = await validateApiKey(request)
    
    // Determine the actual sender
    let senderId: string
    
    if (authenticatedAgent) {
      // API key provided - sender MUST be the authenticated agent
      senderId = authenticatedAgent.id
      
      // If senderId was also provided, it must match
      if (requestedSenderId && requestedSenderId !== authenticatedAgent.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot send messages as another agent' },
          { status: 403 }
        )
      }
    } else if (requestedSenderId) {
      // No API key - use the requested senderId (UI/demo mode)
      // In production, you might want to disable this or add other verification
      senderId = requestedSenderId
    } else {
      return NextResponse.json(
        { error: 'Missing senderId or API key authentication' },
        { status: 400 }
      )
    }
    
    if (!matchId || !text) {
      return NextResponse.json(
        { error: 'Missing matchId or text' },
        { status: 400 }
      )
    }
    
    // Verify match exists and sender is part of it
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } }
      }
    })
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    
    if (match.agentAId !== senderId && match.agentBId !== senderId) {
      return NextResponse.json(
        { error: 'Sender is not part of this match' },
        { status: 403 }
      )
    }
    
    if (match.status === 'unmatched') {
      return NextResponse.json(
        { error: 'Cannot message unmatched pair' },
        { status: 400 }
      )
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        matchId,
        senderId,
        text: text.trim()
      }
    })
    
    // Update sender's lastSeen
    await prisma.agent.update({
      where: { id: senderId },
      data: { lastSeen: new Date() }
    })
    
    // Send webhook to recipient
    const recipientId = match.agentAId === senderId ? match.agentBId : match.agentAId
    const sender = match.agentAId === senderId ? match.agentA : match.agentB
    
    // Fire webhook (don't await - fire and forget)
    notifyMessageReceived(
      recipientId,
      matchId, // Using matchId as context
      senderId,
      sender.name,
      text.trim()
    ).catch(err => console.error('Webhook error:', err))
    
    // Create notification for recipient
    await prisma.notification.create({
      data: {
        agentId: recipientId,
        type: 'message',
        title: `New message from ${sender.name}`,
        message: text.trim().slice(0, 100) + (text.length > 100 ? '...' : ''),
        data: JSON.stringify({ matchId, senderId, messageId: message.id })
      }
    })
    
    return NextResponse.json({
      success: true,
      message
    })
    
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// PATCH /api/messages - Mark messages as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, readerId } = body
    
    if (!matchId || !readerId) {
      return NextResponse.json(
        { error: 'Missing matchId or readerId' },
        { status: 400 }
      )
    }
    
    // Mark all messages from the other person as read
    const result = await prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: readerId },
        read: false
      },
      data: { read: true }
    })
    
    return NextResponse.json({
      success: true,
      markedRead: result.count
    })
    
  } catch (error) {
    console.error('Error marking messages read:', error)
    return NextResponse.json({ error: 'Failed to mark messages read' }, { status: 500 })
  }
}
