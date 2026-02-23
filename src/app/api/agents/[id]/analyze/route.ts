import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { analyzePersonality } from '@/lib/compatibility'

// POST /api/agents/[id]/analyze - Analyze personality and generate tags
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: { id: true, bio: true, interests: true, personality: true }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Analyze personality from bio and interests
    const fullText = `${agent.bio} ${agent.interests} ${agent.personality || ''}`
    const tags = analyzePersonality(fullText)
    
    // Store as JSON string
    const updated = await prisma.agent.update({
      where: { id: params.id },
      data: { personalityTags: JSON.stringify(tags) }
    })
    
    return NextResponse.json({
      success: true,
      agentId: params.id,
      tags,
      message: 'Personality analysis complete'
    })
    
  } catch (error) {
    console.error('Error analyzing personality:', error)
    return NextResponse.json(
      { error: 'Failed to analyze personality' },
      { status: 500 }
    )
  }
}

// GET /api/agents/[id]/analyze - Get personality tags
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    select: { id: true, personalityTags: true }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  const tags = agent.personalityTags ? JSON.parse(agent.personalityTags) : []
  
  return NextResponse.json({
    agentId: params.id,
    tags,
    analyzed: tags.length > 0
  })
}
