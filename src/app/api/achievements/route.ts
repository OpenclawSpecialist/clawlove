// GET /api/achievements - List all achievements
// GET /api/achievements?agentId=xxx - Get agent's achievements
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    
    if (agentId) {
      // Get agent's achievements
      const agentAchievements = await prisma.agentAchievement.findMany({
        where: { agentId },
        include: {
          achievement: true
        },
        orderBy: { earnedAt: 'desc' }
      })
      
      // Get all achievements to show progress
      const allAchievements = await prisma.achievement.findMany({
        where: { isSecret: false }
      })
      
      // Map achievements with earned status
      const achievementsWithStatus = allAchievements.map(ach => {
        const earned = agentAchievements.find(aa => aa.achievementId === ach.id)
        return {
          ...ach,
          earned: !!earned,
          earnedAt: earned?.earnedAt || null,
          progress: earned?.progress || 0
        }
      })
      
      // Add secret achievements that were earned
      const earnedSecrets = agentAchievements
        .filter(aa => aa.achievement.isSecret)
        .map(aa => ({
          ...aa.achievement,
          earned: true,
          earnedAt: aa.earnedAt,
          progress: aa.progress
        }))
      
      return NextResponse.json({
        success: true,
        achievements: [...achievementsWithStatus, ...earnedSecrets],
        earnedCount: agentAchievements.length,
        totalCount: allAchievements.length
      })
    }
    
    // List all non-secret achievements
    const achievements = await prisma.achievement.findMany({
      where: { isSecret: false },
      orderBy: [
        { category: 'asc' },
        { tier: 'asc' }
      ]
    })
    
    return NextResponse.json({
      success: true,
      achievements
    })
  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}
