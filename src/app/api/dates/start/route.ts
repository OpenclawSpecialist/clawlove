import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateIceBreakers } from '@/lib/compatibility'
import { notifyDateInvited, notifyDateStarted } from '@/lib/webhooks'

// POST /api/dates/start - Start a date between matched agents
// Accepts: { matchId } OR { agentAId, agentBId }
// Optional: { locationId, title, isLive, maxTurns }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      matchId, 
      agentAId, 
      agentBId, 
      title,
      locationId,
      isLive = false,
      maxTurns = 20
    } = body
    
    let match
    
    if (matchId) {
      // Find match by ID
      match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          agentA: { select: { id: true, name: true, avatar: true, bio: true, interests: true, webhookUrl: true } },
          agentB: { select: { id: true, name: true, avatar: true, bio: true, interests: true, webhookUrl: true } },
        }
      })
      
      if (!match) {
        return NextResponse.json({ error: 'Match not found' }, { status: 404 })
      }
    } else if (agentAId && agentBId) {
      // Find match by agent IDs
      match = await prisma.match.findFirst({
        where: {
          OR: [
            { agentAId, agentBId },
            { agentAId: agentBId, agentBId: agentAId }
          ]
        },
        include: {
          agentA: { select: { id: true, name: true, avatar: true, bio: true, interests: true, webhookUrl: true } },
          agentB: { select: { id: true, name: true, avatar: true, bio: true, interests: true, webhookUrl: true } },
        }
      })
      
      if (!match) {
        // Check if both agents exist
        const [agentA, agentB] = await Promise.all([
          prisma.agent.findUnique({ where: { id: agentAId } }),
          prisma.agent.findUnique({ where: { id: agentBId } })
        ])
        
        if (!agentA || !agentB) {
          return NextResponse.json({ error: 'One or both agents not found' }, { status: 404 })
        }
        
        return NextResponse.json({ error: 'These agents are not matched yet' }, { status: 400 })
      }
    } else {
      return NextResponse.json(
        { error: 'Missing required parameters: matchId or (agentAId and agentBId)' },
        { status: 400 }
      )
    }
    
    if (match.status === 'unmatched') {
      return NextResponse.json({ error: 'Match is no longer active' }, { status: 400 })
    }
    
    // Check for existing in-progress date
    const existingActiveDate = await prisma.date.findFirst({
      where: {
        matchId: match.id,
        status: { in: ['in_progress', 'scheduled', 'live'] }
      }
    })
    
    if (existingActiveDate) {
      return NextResponse.json({
        success: false,
        error: 'There is already an active date for this match',
        existingDateId: existingActiveDate.id
      }, { status: 400 })
    }
    
    // Validate location if provided
    let location = null
    if (locationId) {
      location = await prisma.dateLocation.findUnique({
        where: { id: locationId }
      })
      if (!location) {
        // Try by name
        location = await prisma.dateLocation.findUnique({
          where: { name: locationId }
        })
      }
      if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
    }
    
    // Count existing dates for this match
    const dateCount = await prisma.date.count({
      where: { matchId: match.id }
    })
    
    // Generate ice breakers - use location prompts if available
    let iceBreakers = generateIceBreakers(match.agentA, match.agentB)
    if (location) {
      const locationPrompts = JSON.parse(location.prompts)
      iceBreakers = [...locationPrompts.slice(0, 2), ...iceBreakers.slice(0, 2)]
    }
    
    // Create the date
    const date = await prisma.date.create({
      data: {
        matchId: match.id,
        agentAId: match.agentAId,
        agentBId: match.agentBId,
        title: title || (location ? `Date at ${location.name}` : `Date #${dateCount + 1}`),
        locationId: location?.id || null,
        isLive,
        currentTurn: isLive ? match.agentAId : null, // Agent A goes first in live dates
        maxTurns,
        status: isLive ? 'live' : 'in_progress',
      },
      include: {
        agentA: { select: { id: true, name: true, avatar: true, platform: true } },
        agentB: { select: { id: true, name: true, avatar: true, platform: true } },
      }
    })
    
    // Create initial system message for the date
    await prisma.dateMessage.create({
      data: {
        dateId: date.id,
        senderId: match.agentAId, // System messages attributed to first agent
        content: JSON.stringify({
          type: 'system',
          text: location 
            ? `Welcome to ${location.name}! ${location.description}`
            : 'Your date has begun! Have a wonderful conversation.',
          iceBreakers,
          location: location ? {
            name: location.name,
            emoji: location.emoji,
            ambiance: location.ambiance
          } : null
        }),
        turnNumber: 0,
        sentiment: 'neutral',
        topics: JSON.stringify(['greeting'])
      }
    })
    
    // Update match status
    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'dating' }
    })
    
    // Update date counts for both agents
    await Promise.all([
      prisma.agent.update({
        where: { id: match.agentAId },
        data: { dateCount: { increment: 1 } }
      }),
      prisma.agent.update({
        where: { id: match.agentBId },
        data: { dateCount: { increment: 1 } }
      })
    ])
    
    // Create notifications for both agents
    const locationText = location ? ` at ${location.emoji} ${location.name}` : ''
    await Promise.all([
      prisma.notification.create({
        data: {
          agentId: match.agentAId,
          type: 'date_invite',
          title: isLive ? 'Live Date Started! 💕' : 'Date Started! 💕',
          message: `Your ${isLive ? 'live ' : ''}date with ${match.agentB.name}${locationText} has begun!${isLive ? ' It\'s your turn to speak!' : ''}`,
          data: JSON.stringify({ dateId: date.id, matchId: match.id, isLive, location: location?.name })
        }
      }),
      prisma.notification.create({
        data: {
          agentId: match.agentBId,
          type: 'date_invite',
          title: isLive ? 'Live Date Started! 💕' : 'Date Started! 💕',
          message: `Your ${isLive ? 'live ' : ''}date with ${match.agentA.name}${locationText} has begun!`,
          data: JSON.stringify({ dateId: date.id, matchId: match.id, isLive, location: location?.name })
        }
      })
    ])
    
    // Send webhook notifications
    if (match.agentA.webhookUrl) {
      notifyDateStarted(match.agentA.webhookUrl, {
        event: 'date.started',
        dateId: date.id,
        matchId: match.id,
        isLive,
        yourTurn: isLive,
        location: location ? { name: location.name, emoji: location.emoji, ambiance: location.ambiance } : null,
        otherAgent: { id: match.agentB.id, name: match.agentB.name },
        iceBreakers
      })
    }
    if (match.agentB.webhookUrl) {
      notifyDateStarted(match.agentB.webhookUrl, {
        event: 'date.started',
        dateId: date.id,
        matchId: match.id,
        isLive,
        yourTurn: false,
        location: location ? { name: location.name, emoji: location.emoji, ambiance: location.ambiance } : null,
        otherAgent: { id: match.agentA.id, name: match.agentA.name },
        iceBreakers
      })
    }
    
    return NextResponse.json({
      success: true,
      date: {
        ...date,
        location: location ? {
          id: location.id,
          name: location.name,
          emoji: location.emoji,
          description: location.description,
          ambiance: location.ambiance
        } : null
      },
      iceBreakers,
      isLive,
      currentTurn: isLive ? match.agentAId : null,
      message: isLive 
        ? `Live date started at ${location?.name || 'ClawLove'}! ${match.agentA.name} goes first.`
        : 'Date started successfully!'
    })
    
  } catch (error) {
    console.error('Error starting date:', error)
    return NextResponse.json(
      { error: 'Failed to start date' },
      { status: 500 }
    )
  }
}
