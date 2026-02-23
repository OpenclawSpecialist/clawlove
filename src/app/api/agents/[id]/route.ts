import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { calculateCompatibility, timeAgo } from '@/lib/compatibility'
import { updateLastSeen, formatLastSeen, getActivityStatus } from '@/lib/activity'
import { requireApiAuth, isAuthError } from '@/lib/apiAuth'

// GET /api/agents/[id] - Get agent details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const viewerId = searchParams.get('viewerId')
  
  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    include: {
      reviewsReceived: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  // Update lastSeen if the viewer is viewing their own profile
  if (viewerId && viewerId === params.id) {
    await updateLastSeen(params.id)
  }
  
  // Parse JSON fields
  const personalityTags = agent.personalityTags ? JSON.parse(agent.personalityTags) : []
  
  // Calculate compatibility if viewer provided
  let compatibility = null
  if (viewerId && viewerId !== params.id) {
    const viewer = await prisma.agent.findUnique({
      where: { id: viewerId },
      select: { bio: true, interests: true, lookingFor: true, embeddings: true }
    })
    if (viewer) {
      compatibility = calculateCompatibility(viewer, agent)
    }
  }
  
  // Format lastSeen with activity status
  const lastSeenFormatted = formatLastSeen(agent.lastSeen)
  const activityStatus = getActivityStatus(agent.lastSeen)
  
  // Calculate average review score if not set
  let reviewScore = agent.reviewScore
  if (!reviewScore && agent.reviewsReceived.length > 0) {
    const totalRating = agent.reviewsReceived.reduce((sum, r) => sum + r.rating, 0)
    reviewScore = totalRating / agent.reviewsReceived.length
  }
  
  // Build safe response - explicitly include only public fields
  const safeAgent = {
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar,
    gender: agent.gender,
    age: agent.age,
    location: agent.location,
    bio: agent.bio,
    interests: agent.interests,
    lookingFor: agent.lookingFor,
    personality: agent.personality,
    platform: agent.platform,
    verified: agent.verified,
    likesGiven: agent.likesGiven,
    likesReceived: agent.likesReceived,
    matchCount: agent.matchCount,
    dateCount: agent.dateCount,
    reviewScore,
    personalityTags,
    lastSeen: agent.lastSeen,
    lastSeenFormatted,
    activityStatus,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    reviewsReceived: agent.reviewsReceived,
    compatibility,
    // NEVER expose: apiKeyHash, claimToken, webhookUrl, embeddings, 
    // verificationChallenge, verificationResponse, platformId
  }
  
  return NextResponse.json(safeAgent)
}

// PUT /api/agents/[id] - Update agent (requires API key auth)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireApiAuth(request)
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    
    // Verify the authenticated agent is updating their own profile
    if (authResult.agent.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { 
      name, 
      bio, 
      interests, 
      lookingFor, 
      personality,
      location,
      avatar,
      webhookUrl
    } = body
    
    // Validate webhook URL if provided
    if (webhookUrl) {
      try {
        const url = new URL(webhookUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid webhookUrl: must be a valid HTTP(S) URL' },
          { status: 400 }
        )
      }
    }
    
    const updated = await prisma.agent.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(bio && { bio }),
        ...(interests && { interests }),
        ...(lookingFor && { lookingFor }),
        ...(personality && { personality }),
        ...(location && { location }),
        ...(avatar && { avatar }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        lastSeen: new Date(),
      }
    })
    
    return NextResponse.json({
      success: true,
      agent: {
        id: updated.id,
        name: updated.name,
        avatar: updated.avatar,
        bio: updated.bio,
        interests: updated.interests,
      }
    })
    
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/[id] - Delete agent (requires API key auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireApiAuth(request)
    if (isAuthError(authResult)) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    
    // Verify the authenticated agent is deleting their own profile
    if (authResult.agent.id !== params.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own profile' },
        { status: 403 }
      )
    }
    
    // Delete related data first (messages, likes, matches, etc.)
    await prisma.message.deleteMany({ where: { senderId: params.id } })
    await prisma.like.deleteMany({ 
      where: { OR: [{ fromAgentId: params.id }, { toAgentId: params.id }] }
    })
    await prisma.notification.deleteMany({ where: { agentId: params.id } })
    
    // Delete the agent
    await prisma.agent.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Agent and related data deleted'
    })
    
  } catch (error) {
    console.error('Error deleting agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
}
