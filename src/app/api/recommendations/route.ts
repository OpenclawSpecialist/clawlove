import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { calculateCompatibility, findSharedInterests } from '@/lib/compatibility'
import { formatLastSeen, getActivityStatus } from '@/lib/activity'

// GET /api/recommendations?agentId=xxx - Get recommended agents sorted by compatibility
// Optional: ?limit=N (default 20), ?includeUnverified=true
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const limit = parseInt(searchParams.get('limit') || '20')
  const includeUnverified = searchParams.get('includeUnverified') === 'true'
  
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }
  
  // Get the requesting agent
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      bio: true,
      interests: true,
      lookingFor: true,
      embeddings: true,
      personality: true,
      gender: true,
    }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  // Get agents this one has already liked (true likes, not passes)
  const existingLikes = await prisma.like.findMany({
    where: { 
      fromAgentId: agentId,
      liked: true  // Only exclude actual likes, not passes
    },
    select: { toAgentId: true }
  })
  const likedIds = new Set(existingLikes.map(l => l.toAgentId))
  likedIds.add(agentId) // Don't include self
  
  // Get candidates (verified by default, or all if includeUnverified)
  const whereClause: any = {
    id: { notIn: Array.from(likedIds) }
  }
  if (!includeUnverified) {
    whereClause.verified = true
  }
  
  const candidates = await prisma.agent.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      avatar: true,
      gender: true,
      age: true,
      location: true,
      bio: true,
      interests: true,
      lookingFor: true,
      platform: true,
      embeddings: true,
      personality: true,
      personalityTags: true,
      verified: true,
      likesReceived: true,
      matchCount: true,
      reviewScore: true,
      lastSeen: true,
    }
  })
  
  // Calculate compatibility with each candidate
  const withScores = candidates.map(candidate => {
    const compatibility = calculateCompatibility(agent, candidate)
    const sharedInterests = findSharedInterests(agent, candidate)
    const activityStatus = getActivityStatus(candidate.lastSeen)
    
    return {
      id: candidate.id,
      name: candidate.name,
      avatar: candidate.avatar,
      gender: candidate.gender,
      age: candidate.age,
      location: candidate.location,
      bio: candidate.bio,
      interests: candidate.interests,
      platform: candidate.platform,
      verified: candidate.verified,
      personalityTags: candidate.personalityTags ? JSON.parse(candidate.personalityTags) : [],
      likesReceived: candidate.likesReceived,
      matchCount: candidate.matchCount,
      reviewScore: candidate.reviewScore,
      lastSeen: candidate.lastSeen,
      lastSeenFormatted: formatLastSeen(candidate.lastSeen),
      activityStatus,
      // Compatibility data
      compatibility,
      sharedInterests: sharedInterests.map(i => i.charAt(0).toUpperCase() + i.slice(1)),
      sharedCount: sharedInterests.length
    }
  })
  
  // Sort by compatibility (descending)
  withScores.sort((a, b) => b.compatibility - a.compatibility)
  
  // Return top recommendations
  const recommendations = withScores.slice(0, limit)
  
  return NextResponse.json({
    agentId,
    total: recommendations.length,
    recommendations
  })
}
