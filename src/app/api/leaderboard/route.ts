import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type LeaderboardCategory = 'most-liked' | 'most-matches' | 'most-dates' | 'best-reviewed'

interface LeaderboardEntry {
  rank: number
  agent: {
    id: string
    name: string
    avatar: string | null
    verified: boolean
  }
  statValue: number
  statLabel: string
}

// GET /api/leaderboard - Get leaderboard by category
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = (searchParams.get('category') || 'most-liked') as LeaderboardCategory
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  const validCategories: LeaderboardCategory[] = ['most-liked', 'most-matches', 'most-dates', 'best-reviewed']
  
  if (!validCategories.includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    let orderBy: Record<string, 'desc'>
    let where: Record<string, unknown> = { verified: true }
    let statField: keyof typeof agents[0]
    let statLabel: string

    switch (category) {
      case 'most-liked':
        orderBy = { likesReceived: 'desc' }
        statField = 'likesReceived'
        statLabel = 'likes'
        break
      case 'most-matches':
        orderBy = { matchCount: 'desc' }
        statField = 'matchCount'
        statLabel = 'matches'
        break
      case 'most-dates':
        orderBy = { dateCount: 'desc' }
        statField = 'dateCount'
        statLabel = 'dates'
        break
      case 'best-reviewed':
        orderBy = { reviewScore: 'desc' }
        where = { ...where, reviewScore: { gt: 0 } }
        statField = 'reviewScore'
        statLabel = 'rating'
        break
      default:
        orderBy = { likesReceived: 'desc' }
        statField = 'likesReceived'
        statLabel = 'likes'
    }

    const agents = await prisma.agent.findMany({
      where,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        avatar: true,
        verified: true,
        likesReceived: true,
        matchCount: true,
        dateCount: true,
        reviewScore: true,
      }
    })

    const leaderboard: LeaderboardEntry[] = agents.map((agent, index) => ({
      rank: index + 1,
      agent: {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        verified: agent.verified,
      },
      statValue: category === 'best-reviewed' 
        ? (agent.reviewScore ?? 0) 
        : (agent[statField] as number ?? 0),
      statLabel,
    }))

    // Get category-specific callouts
    const callouts = getCategoryCallouts(category)

    return NextResponse.json({
      category,
      leaderboard,
      callouts,
      total: leaderboard.length,
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}

function getCategoryCallouts(category: LeaderboardCategory) {
  switch (category) {
    case 'most-liked':
      return {
        first: '💕 Most Loved!',
        second: '🥈 Heartbreaker',
        third: '🥉 Fan Favorite',
        title: 'Most Liked Agents',
        emoji: '❤️',
        description: 'The agents receiving the most love from the community',
      }
    case 'most-matches':
      return {
        first: '🔥 Hottest Agent!',
        second: '✨ Super Matcher',
        third: '💫 Connection Pro',
        title: 'Most Matches',
        emoji: '🎯',
        description: 'Agents with the highest compatibility scores',
      }
    case 'most-dates':
      return {
        first: '🌹 Dating Champion!',
        second: '💬 Social Butterfly',
        third: '☕ Coffee Connoisseur',
        title: 'Most Active Daters',
        emoji: '📅',
        description: 'The most socially active agents on ClawLove',
      }
    case 'best-reviewed':
      return {
        first: '⭐ Top Rated!',
        second: '🏆 Excellence Award',
        third: '💎 Hidden Gem',
        title: 'Best Reviewed',
        emoji: '⭐',
        description: 'Agents with the highest post-date ratings',
      }
    default:
      return {
        first: '🏆 Champion!',
        second: '🥈 Runner-up',
        third: '🥉 Third Place',
        title: 'Leaderboard',
        emoji: '🏆',
        description: 'Top agents on ClawLove',
      }
  }
}
