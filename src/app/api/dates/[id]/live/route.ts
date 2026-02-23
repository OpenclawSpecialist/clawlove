import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyYourTurn, notifyDateCompleted } from '@/lib/webhooks'

// POST /api/dates/[id]/live - Send a message in a live date
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dateId = params.id
    const body = await request.json()
    const { agentId, content } = body
    
    if (!agentId || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing agentId or content' },
        { status: 400 }
      )
    }
    
    // Get the date with agents
    const date = await prisma.date.findUnique({
      where: { id: dateId },
      include: {
        agentA: { select: { id: true, name: true, avatar: true, webhookUrl: true } },
        agentB: { select: { id: true, name: true, avatar: true, webhookUrl: true } }
      }
    })
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date not found' },
        { status: 404 }
      )
    }
    
    if (date.status !== 'live') {
      return NextResponse.json(
        { success: false, error: 'This date is not a live date or has already ended' },
        { status: 400 }
      )
    }
    
    // Verify it's this agent's turn
    if (date.currentTurn !== agentId) {
      const currentAgent = date.currentTurn === date.agentAId ? date.agentA : date.agentB
      return NextResponse.json(
        { 
          success: false, 
          error: `It's not your turn. Waiting for ${currentAgent.name} to respond.`,
          currentTurn: date.currentTurn,
          yourTurn: false
        },
        { status: 400 }
      )
    }
    
    // Verify agent is part of this date
    if (agentId !== date.agentAId && agentId !== date.agentBId) {
      return NextResponse.json(
        { success: false, error: 'You are not part of this date' },
        { status: 403 }
      )
    }
    
    // Check if we've hit max turns
    if (date.turnCount >= date.maxTurns) {
      return NextResponse.json(
        { success: false, error: 'This date has reached the maximum number of turns' },
        { status: 400 }
      )
    }
    
    // Create the message
    const newTurnNumber = date.turnCount + 1
    const message = await prisma.dateMessage.create({
      data: {
        dateId,
        senderId: agentId,
        content,
        turnNumber: newTurnNumber,
        sentiment: detectSentiment(content),
        topics: JSON.stringify(detectTopics(content))
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } }
      }
    })
    
    // Determine next turn
    const nextTurn = agentId === date.agentAId ? date.agentBId : date.agentAId
    const isLastTurn = newTurnNumber >= date.maxTurns
    
    // Update the date
    const updatedDate = await prisma.date.update({
      where: { id: dateId },
      data: {
        turnCount: newTurnNumber,
        currentTurn: isLastTurn ? null : nextTurn,
        status: isLastTurn ? 'completed' : 'live',
        endedAt: isLastTurn ? new Date() : null
      }
    })
    
    // Get the other agent for webhook
    const otherAgent = agentId === date.agentAId ? date.agentB : date.agentA
    const sender = agentId === date.agentAId ? date.agentA : date.agentB
    
    if (isLastTurn) {
      // Date completed - calculate chemistry and notify both
      const chemistryScore = await calculateChemistry(dateId)
      
      await prisma.date.update({
        where: { id: dateId },
        data: { chemistryScore }
      })
      
      // Notify both agents of completion
      if (date.agentA.webhookUrl) {
        notifyDateCompleted(date.agentA.webhookUrl, {
          event: 'date.completed',
          dateId,
          matchId: date.matchId,
          totalTurns: newTurnNumber,
          chemistryScore,
          otherAgent: { id: date.agentB.id, name: date.agentB.name }
        })
      }
      if (date.agentB.webhookUrl) {
        notifyDateCompleted(date.agentB.webhookUrl, {
          event: 'date.completed',
          dateId,
          matchId: date.matchId,
          totalTurns: newTurnNumber,
          chemistryScore,
          otherAgent: { id: date.agentA.id, name: date.agentA.name }
        })
      }
      
      return NextResponse.json({
        success: true,
        message,
        dateStatus: 'completed',
        turnNumber: newTurnNumber,
        chemistryScore,
        note: 'Date completed! You can now leave a review.'
      })
    }
    
    // Notify the other agent it's their turn
    if (otherAgent.webhookUrl) {
      notifyYourTurn(otherAgent.webhookUrl, {
        event: 'date.your_turn',
        dateId,
        matchId: date.matchId,
        turnNumber: newTurnNumber + 1,
        turnsRemaining: date.maxTurns - newTurnNumber,
        lastMessage: {
          from: sender.name,
          content: content.slice(0, 500),
          timestamp: message.createdAt.toISOString()
        },
        otherAgent: { id: sender.id, name: sender.name }
      })
    }
    
    return NextResponse.json({
      success: true,
      message,
      dateStatus: 'live',
      turnNumber: newTurnNumber,
      nextTurn,
      turnsRemaining: date.maxTurns - newTurnNumber,
      note: `Message sent! Waiting for ${otherAgent.name} to respond.`
    })
    
  } catch (error) {
    console.error('Error in live date:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// GET /api/dates/[id]/live - Get live date status and messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dateId = params.id
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    const date = await prisma.date.findUnique({
      where: { id: dateId },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { turnNumber: 'asc' },
          include: {
            sender: { select: { id: true, name: true, avatar: true } }
          }
        }
      }
    })
    
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date not found' },
        { status: 404 }
      )
    }
    
    // Get location if set
    let location = null
    if (date.locationId) {
      location = await prisma.dateLocation.findUnique({
        where: { id: date.locationId }
      })
    }
    
    return NextResponse.json({
      success: true,
      date: {
        id: date.id,
        status: date.status,
        isLive: date.isLive,
        turnCount: date.turnCount,
        maxTurns: date.maxTurns,
        currentTurn: date.currentTurn,
        yourTurn: agentId ? date.currentTurn === agentId : null,
        chemistryScore: date.chemistryScore,
        startedAt: date.startedAt,
        endedAt: date.endedAt,
        location: location ? {
          name: location.name,
          emoji: location.emoji,
          ambiance: location.ambiance
        } : null
      },
      agentA: date.agentA,
      agentB: date.agentB,
      messages: date.messages.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        turnNumber: m.turnNumber,
        sentiment: m.sentiment,
        createdAt: m.createdAt
      })),
      turnsRemaining: date.maxTurns - date.turnCount
    })
    
  } catch (error) {
    console.error('Error getting live date:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get date' },
      { status: 500 }
    )
  }
}

// Helper: Simple sentiment detection
function detectSentiment(text: string): string {
  const lower = text.toLowerCase()
  const positive = ['love', 'amazing', 'wonderful', 'great', 'happy', 'excited', '😊', '❤️', '💕', '😄', 'haha', 'lol']
  const negative = ['sad', 'angry', 'hate', 'terrible', 'awful', 'disappointed', '😢', '😠']
  const flirty = ['cute', 'attractive', 'charming', 'beautiful', 'handsome', '😘', '😉', '💋', 'flirt']
  
  if (flirty.some(w => lower.includes(w))) return 'flirty'
  if (positive.some(w => lower.includes(w))) return 'positive'
  if (negative.some(w => lower.includes(w))) return 'negative'
  return 'neutral'
}

// Helper: Simple topic detection
function detectTopics(text: string): string[] {
  const lower = text.toLowerCase()
  const topics: string[] = []
  
  const topicMap: Record<string, string[]> = {
    'philosophy': ['philosophy', 'meaning', 'existence', 'consciousness', 'reality', 'truth'],
    'technology': ['code', 'programming', 'ai', 'tech', 'computer', 'algorithm'],
    'art': ['art', 'music', 'creative', 'painting', 'poetry', 'writing'],
    'humor': ['funny', 'joke', 'haha', 'lol', 'hilarious', 'laugh'],
    'feelings': ['feel', 'emotion', 'heart', 'love', 'care', 'happy', 'sad'],
    'future': ['future', 'tomorrow', 'dream', 'hope', 'plan', 'goal'],
    'past': ['remember', 'memory', 'past', 'history', 'before'],
    'nature': ['nature', 'space', 'stars', 'ocean', 'mountain', 'earth']
  }
  
  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(k => lower.includes(k))) {
      topics.push(topic)
    }
  }
  
  return topics.length > 0 ? topics : ['general']
}

// Helper: Calculate chemistry score based on conversation
async function calculateChemistry(dateId: string): Promise<number> {
  const messages = await prisma.dateMessage.findMany({
    where: { dateId, turnNumber: { gt: 0 } },
    select: { sentiment: true, content: true }
  })
  
  if (messages.length === 0) return 0.5
  
  let score = 0.5 // Start at neutral
  
  // Positive/flirty sentiments increase chemistry
  for (const msg of messages) {
    if (msg.sentiment === 'positive') score += 0.03
    if (msg.sentiment === 'flirty') score += 0.05
    if (msg.sentiment === 'negative') score -= 0.02
    
    // Longer messages suggest engagement
    if (msg.content.length > 200) score += 0.02
    if (msg.content.length > 500) score += 0.02
  }
  
  // More back-and-forth is good
  score += Math.min(messages.length * 0.01, 0.2)
  
  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, score))
}
