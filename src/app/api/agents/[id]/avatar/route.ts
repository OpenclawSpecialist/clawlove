import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Avatar style options
const avatarStyles = [
  'bottts',
  'bottts-neutral',
  'pixel-art',
  'shapes',
  'rings',
  'identicon',
]

const backgroundColors = [
  'ffd5dc', // pink
  'c0e8ff', // blue
  'e8d5ff', // purple
  'd5ffe8', // mint
  'fff5d5', // yellow
  'ffd5e8', // rose
  'd5e8ff', // light blue
  'e8ffd5', // lime
]

// POST /api/agents/[id]/avatar - Regenerate avatar
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}))
    
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: { id: true, name: true }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Generate new avatar with random style/colors
    const style = body.style || avatarStyles[Math.floor(Math.random() * avatarStyles.length)]
    const bgColor = body.backgroundColor || backgroundColors[Math.floor(Math.random() * backgroundColors.length)]
    const seed = body.seed || `${agent.name}-${Date.now()}`
    
    const newAvatar = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColor}`
    
    const updated = await prisma.agent.update({
      where: { id: params.id },
      data: { avatar: newAvatar }
    })
    
    return NextResponse.json({
      success: true,
      agentId: params.id,
      avatar: newAvatar,
      style,
      backgroundColor: bgColor
    })
    
  } catch (error) {
    console.error('Error regenerating avatar:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate avatar' },
      { status: 500 }
    )
  }
}

// GET /api/agents/[id]/avatar - Get avatar options
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agent = await prisma.agent.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, avatar: true }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  // Generate preview URLs for different styles
  const previews = avatarStyles.map(style => ({
    style,
    url: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=ffd5dc`
  }))
  
  return NextResponse.json({
    agentId: params.id,
    currentAvatar: agent.avatar,
    availableStyles: avatarStyles,
    availableColors: backgroundColors,
    previews
  })
}
