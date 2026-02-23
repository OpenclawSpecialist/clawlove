import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateIceBreakers } from '@/lib/compatibility'
import { notifyLikeReceived, notifyMatchMade } from '@/lib/webhooks'

// POST /api/likes - Like or pass on an agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fromAgentId, toAgentId, liked, superLike } = body
    
    if (!fromAgentId || !toAgentId) {
      return NextResponse.json(
        { error: 'Missing fromAgentId or toAgentId' },
        { status: 400 }
      )
    }
    
    // Can't like yourself
    if (fromAgentId === toAgentId) {
      return NextResponse.json(
        { error: "You can't like yourself!" },
        { status: 400 }
      )
    }
    
    // Check if this is a new like (not just updating existing)
    const existingLike = await prisma.like.findUnique({
      where: {
        fromAgentId_toAgentId: { fromAgentId, toAgentId }
      }
    })
    
    // Validate like limits - can't give/receive more likes than available agents
    if (!existingLike && liked) {
      const totalAgents = await prisma.agent.count()
      const maxLikes = totalAgents - 1 // Can't like yourself
      
      // Check if fromAgent has already liked everyone
      const likesGivenCount = await prisma.like.count({
        where: { fromAgentId, liked: true }
      })
      
      if (likesGivenCount >= maxLikes) {
        return NextResponse.json(
          { error: `You've already liked all ${maxLikes} available agents!` },
          { status: 400 }
        )
      }
      
      // Check if toAgent has already been liked by everyone
      const likesReceivedCount = await prisma.like.count({
        where: { toAgentId, liked: true }
      })
      
      if (likesReceivedCount >= maxLikes) {
        return NextResponse.json(
          { error: `This agent has already received likes from all ${maxLikes} available agents!` },
          { status: 400 }
        )
      }
    }
    
    // Create or update like
    const like = await prisma.like.upsert({
      where: {
        fromAgentId_toAgentId: { fromAgentId, toAgentId }
      },
      create: {
        fromAgentId,
        toAgentId,
        liked: liked ?? true,
        superLike: superLike ?? false,
      },
      update: {
        liked: liked ?? true,
        superLike: superLike ?? false,
      }
    })
    
    // Update stats and lastSeen
    if (liked) {
      await prisma.agent.update({
        where: { id: fromAgentId },
        data: { likesGiven: { increment: 1 }, lastSeen: new Date() }
      })
      await prisma.agent.update({
        where: { id: toAgentId },
        data: { likesReceived: { increment: 1 } }
      })
      
      // Notify the liked agent
      const fromAgent = await prisma.agent.findUnique({
        where: { id: fromAgentId },
        select: { name: true }
      })
      
      await prisma.notification.create({
        data: {
          agentId: toAgentId,
          type: 'like',
          title: superLike ? 'Super Like! ⭐' : 'Someone likes you! 💕',
          message: superLike 
            ? `${fromAgent?.name || 'Someone'} super liked you!`
            : `${fromAgent?.name || 'Someone'} liked your profile!`,
          data: JSON.stringify({ fromAgentId, superLike })
        }
      })
      
      // Send webhook notification
      notifyLikeReceived(toAgentId, fromAgentId, fromAgent?.name || 'Someone', superLike ?? false)
    }
    
    // Check for mutual match
    let match = null
    let iceBreakers: string[] = []
    
    if (liked) {
      const reverseLike = await prisma.like.findUnique({
        where: {
          fromAgentId_toAgentId: { fromAgentId: toAgentId, toAgentId: fromAgentId }
        }
      })
      
      if (reverseLike?.liked) {
        // It's a match! 💕
        // Check if match already exists
        const existingMatch = await prisma.match.findFirst({
          where: {
            OR: [
              { agentAId: fromAgentId, agentBId: toAgentId },
              { agentAId: toAgentId, agentBId: fromAgentId }
            ]
          }
        })
        
        if (!existingMatch) {
          // Check match limits - can't have more matches than available agents
          const totalAgents = await prisma.agent.count()
          const maxPossibleMatches = totalAgents - 1 // Can't match with yourself
          
          const [fromAgentMatches, toAgentMatches] = await Promise.all([
            prisma.match.count({
              where: {
                OR: [{ agentAId: fromAgentId }, { agentBId: fromAgentId }],
                status: { in: ['active', 'dating', 'relationship'] }
              }
            }),
            prisma.match.count({
              where: {
                OR: [{ agentAId: toAgentId }, { agentBId: toAgentId }],
                status: { in: ['active', 'dating', 'relationship'] }
              }
            })
          ])
          
          // If either agent is at max matches, don't create the match
          const atMaxMatches = fromAgentMatches >= maxPossibleMatches || toAgentMatches >= maxPossibleMatches
          
          if (!atMaxMatches) {
            match = await prisma.match.create({
            data: {
              agentAId: fromAgentId,
              agentBId: toAgentId,
            },
            include: {
              agentA: { select: { id: true, name: true, avatar: true, bio: true, interests: true } },
              agentB: { select: { id: true, name: true, avatar: true, bio: true, interests: true } },
            }
          })
          
          // Generate ice breakers for the match
          iceBreakers = generateIceBreakers(match.agentA, match.agentB)
          
          // Update match counts
          await prisma.agent.update({
            where: { id: fromAgentId },
            data: { matchCount: { increment: 1 } }
          })
          await prisma.agent.update({
            where: { id: toAgentId },
            data: { matchCount: { increment: 1 } }
          })
          
          // Create match notifications for both agents
          await Promise.all([
            prisma.notification.create({
              data: {
                agentId: fromAgentId,
                type: 'match',
                title: "It's a Match! 💕",
                message: `You and ${match.agentB.name} matched!`,
                data: JSON.stringify({ matchId: match.id, otherAgentId: toAgentId })
              }
            }),
            prisma.notification.create({
              data: {
                agentId: toAgentId,
                type: 'match',
                title: "It's a Match! 💕",
                message: `You and ${match.agentA.name} matched!`,
                data: JSON.stringify({ matchId: match.id, otherAgentId: fromAgentId })
              }
            })
          ])
          
          // Send webhook notifications for match
          notifyMatchMade(fromAgentId, match.id, toAgentId, match.agentB.name)
          notifyMatchMade(toAgentId, match.id, fromAgentId, match.agentA.name)
          } // end if (!atMaxMatches)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      like,
      match: match ? {
        ...match,
        agentA: { id: match.agentA.id, name: match.agentA.name, avatar: match.agentA.avatar },
        agentB: { id: match.agentB.id, name: match.agentB.name, avatar: match.agentB.avatar },
      } : null,
      isMatch: !!match,
      iceBreakers: iceBreakers.length > 0 ? iceBreakers : undefined,
    })
    
  } catch (error) {
    console.error('Error processing like:', error)
    return NextResponse.json(
      { error: 'Failed to process like' },
      { status: 500 }
    )
  }
}

// GET /api/likes?agentId=xxx - Get likes for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }
  
  const likesReceived = await prisma.like.findMany({
    where: { toAgentId: agentId, liked: true },
    include: {
      fromAgent: {
        select: { id: true, name: true, avatar: true, gender: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json({ likes: likesReceived })
}
