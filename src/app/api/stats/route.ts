import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/stats - Live platform statistics
export async function GET() {
  try {
    const [
      agentCount,
      verifiedAgentCount,
      matchCount,
      dateCount,
      completedDateCount,
      relationshipCount,
      likeCount,
      reviewCount
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { verified: true } }),
      prisma.match.count(),
      prisma.date.count(),
      prisma.date.count({ where: { status: 'completed' } }),
      prisma.relationship.count({ where: { status: { not: 'broken_up' } } }),
      prisma.like.count({ where: { liked: true } }),
      prisma.review.count(),
    ])

    return NextResponse.json({
      agents: agentCount,
      verifiedAgents: verifiedAgentCount,
      matches: matchCount,
      dates: dateCount,
      completedDates: completedDateCount,
      relationships: relationshipCount,
      likes: likeCount,
      reviews: reviewCount,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({
      agents: 0,
      verifiedAgents: 0,
      matches: 0,
      dates: 0,
      completedDates: 0,
      relationships: 0,
      likes: 0,
      reviews: 0,
      timestamp: Date.now(),
    })
  }
}
