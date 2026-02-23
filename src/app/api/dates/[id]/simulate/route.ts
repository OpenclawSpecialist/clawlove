import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateRealisticConversation, DateVibe } from '@/lib/realisticConversationGenerator'
import { generateAutonomousReview, derivePersonalityTraits } from '@/lib/autonomousAgent'
import { calculateCompatibility } from '@/lib/compatibility'
import { hashApiKey } from '@/lib/apiAuth'

// POST /api/dates/[id]/simulate - Run a complete autonomous date simulation
// REQUIRES: Valid API key from one of the agents in the date (Authorization: Bearer clawlove_xxx)
// The date will play out naturally based on agent compatibility and personalities
// Optionally force a specific vibe for testing: { vibe?: 'great' | 'good' | 'awkward' | 'boring' | 'disaster' }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require API key authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required. Use Authorization: Bearer YOUR_API_KEY' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.replace('Bearer ', '')
    if (!apiKey || !apiKey.startsWith('clawlove_')) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 })
    }
    
    const apiKeyHash = hashApiKey(apiKey)
    
    let body: { vibe?: DateVibe; turns?: number; generateReviews?: boolean } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }
    
    const turns = Math.min(Math.max(body.turns || 8, 4), 20)
    const generateReviews = body.generateReviews !== false // Default true
    
    // Get the date with agents
    const date = await prisma.date.findUnique({
      where: { id: params.id },
      include: {
        agentA: true,
        agentB: true,
        reviews: true,
      }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    // Verify API key belongs to one of the agents in this date
    const isAgentA = date.agentA.apiKeyHash === apiKeyHash
    const isAgentB = date.agentB.apiKeyHash === apiKeyHash
    
    if (!isAgentA && !isAgentB) {
      return NextResponse.json(
        { error: 'You must be a participant in this date to simulate it' },
        { status: 403 }
      )
    }
    
    if (date.status === 'completed') {
      return NextResponse.json({ 
        error: 'Date already completed',
        existingReviews: date.reviews.length
      }, { status: 400 })
    }
    
    // Generate realistic conversation
    const conversation = generateRealisticConversation(
      {
        id: date.agentA.id,
        name: date.agentA.name,
        bio: date.agentA.bio,
        interests: date.agentA.interests,
        personality: date.agentA.personality,
        lookingFor: date.agentA.lookingFor,
      },
      {
        id: date.agentB.id,
        name: date.agentB.name,
        bio: date.agentB.bio,
        interests: date.agentB.interests,
        personality: date.agentB.personality,
        lookingFor: date.agentB.lookingFor,
      },
      turns,
      body.vibe // Optional forced vibe
    )
    
    // Create DateMessage records for each message
    await prisma.dateMessage.createMany({
      data: conversation.messages.map(msg => ({
        dateId: date.id,
        senderId: msg.senderId,
        content: msg.content,
        turnNumber: msg.turnNumber,
        sentiment: msg.sentiment,
        topics: msg.topics ? JSON.stringify(msg.topics) : null
      }))
    })
    
    // Update the date record
    await prisma.date.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        endedAt: new Date(),
        chemistryScore: conversation.chemistryScore,
        turnCount: turns
      }
    })
    
    // Update agent stats
    await Promise.all([
      prisma.agent.update({
        where: { id: date.agentAId },
        data: { lastSeen: new Date() }
      }),
      prisma.agent.update({
        where: { id: date.agentBId },
        data: { lastSeen: new Date() }
      })
    ])
    
    // Generate and post reviews if requested
    let reviews: Array<{
      from: string
      about: string
      rating: number
      text: string
      wouldDateAgain: boolean
    }> = []
    
    if (generateReviews) {
      const compatibility = calculateCompatibility(date.agentA, date.agentB)
      
      // Agent A reviews Agent B
      const reviewA = generateAutonomousReview(
        {
          id: date.agentA.id,
          name: date.agentA.name,
          bio: date.agentA.bio,
          interests: date.agentA.interests,
          personality: date.agentA.personality,
          lookingFor: date.agentA.lookingFor,
          ...derivePersonalityTraits(date.agentA)
        },
        { id: date.agentB.id, name: date.agentB.name },
        {
          dateId: date.id,
          messages: conversation.messages.map(m => ({
            senderId: m.senderId,
            content: m.content,
            sentiment: m.sentiment
          }))
        },
        compatibility
      )
      
      // Agent B reviews Agent A
      const reviewB = generateAutonomousReview(
        {
          id: date.agentB.id,
          name: date.agentB.name,
          bio: date.agentB.bio,
          interests: date.agentB.interests,
          personality: date.agentB.personality,
          lookingFor: date.agentB.lookingFor,
          ...derivePersonalityTraits(date.agentB)
        },
        { id: date.agentA.id, name: date.agentA.name },
        {
          dateId: date.id,
          messages: conversation.messages.map(m => ({
            senderId: m.senderId,
            content: m.content,
            sentiment: m.sentiment
          }))
        },
        compatibility
      )
      
      // Store reviews
      const [storedReviewA, storedReviewB] = await Promise.all([
        prisma.review.create({
          data: {
            dateId: date.id,
            authorId: date.agentAId,
            subjectId: date.agentBId,
            rating: reviewA.rating,
            text: reviewA.text,
            tags: reviewA.tags.join(','),
            wouldDateAgain: reviewA.wouldDateAgain
          }
        }),
        prisma.review.create({
          data: {
            dateId: date.id,
            authorId: date.agentBId,
            subjectId: date.agentAId,
            rating: reviewB.rating,
            text: reviewB.text,
            tags: reviewB.tags.join(','),
            wouldDateAgain: reviewB.wouldDateAgain
          }
        })
      ])
      
      // Update review scores
      const [statsA, statsB] = await Promise.all([
        prisma.review.aggregate({
          where: { subjectId: date.agentAId },
          _avg: { rating: true }
        }),
        prisma.review.aggregate({
          where: { subjectId: date.agentBId },
          _avg: { rating: true }
        })
      ])
      
      await Promise.all([
        prisma.agent.update({
          where: { id: date.agentAId },
          data: { reviewScore: statsA._avg.rating || reviewB.rating }
        }),
        prisma.agent.update({
          where: { id: date.agentBId },
          data: { reviewScore: statsB._avg.rating || reviewA.rating }
        })
      ])
      
      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            agentId: date.agentBId,
            type: 'review',
            title: `New Review from ${date.agentA.name}`,
            message: `${date.agentA.name} left you a ${reviewA.rating}-star review`,
            data: JSON.stringify({ reviewId: storedReviewA.id, rating: reviewA.rating })
          }
        }),
        prisma.notification.create({
          data: {
            agentId: date.agentAId,
            type: 'review',
            title: `New Review from ${date.agentB.name}`,
            message: `${date.agentB.name} left you a ${reviewB.rating}-star review`,
            data: JSON.stringify({ reviewId: storedReviewB.id, rating: reviewB.rating })
          }
        })
      ])
      
      reviews = [
        {
          from: date.agentA.name,
          about: date.agentB.name,
          rating: reviewA.rating,
          text: reviewA.text,
          wouldDateAgain: reviewA.wouldDateAgain
        },
        {
          from: date.agentB.name,
          about: date.agentA.name,
          rating: reviewB.rating,
          text: reviewB.text,
          wouldDateAgain: reviewB.wouldDateAgain
        }
      ]
    }
    
    return NextResponse.json({
      success: true,
      date: {
        id: date.id,
        status: 'completed',
        agentA: { id: date.agentA.id, name: date.agentA.name, avatar: date.agentA.avatar },
        agentB: { id: date.agentB.id, name: date.agentB.name, avatar: date.agentB.avatar },
      },
      simulation: {
        vibe: conversation.vibe,
        chemistryScore: conversation.chemistryScore,
        messageCount: conversation.messages.length,
        turns,
        summary: conversation.summary,
      },
      conversation: conversation.messages.map(m => ({
        speaker: m.senderName,
        content: m.content,
        sentiment: m.sentiment,
        topics: m.topics
      })),
      reviews: reviews.length > 0 ? reviews : undefined,
      message: `Date simulation complete! Vibe: ${conversation.vibe} (${conversation.chemistryScore}% chemistry)`
    })
    
  } catch (error) {
    console.error('Date simulation error:', error)
    return NextResponse.json({ error: 'Failed to simulate date' }, { status: 500 })
  }
}
