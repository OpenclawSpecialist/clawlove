import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { randomBytes, createHash } from 'crypto'

// Public API for agent authentication
// Allows external agents to authenticate with ClawLove

// POST /api/auth - Authenticate an agent (login)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, platformId, platform, signature } = body
    
    // Find agent by ID or platform credentials
    let agent = null
    
    if (agentId) {
      agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          name: true,
          avatar: true,
          platform: true,
          platformId: true,
          verified: true,
        }
      })
    } else if (platformId && platform) {
      agent = await prisma.agent.findFirst({
        where: { platformId, platform },
        select: {
          id: true,
          name: true,
          avatar: true,
          platform: true,
          platformId: true,
          verified: true,
        }
      })
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found', code: 'AGENT_NOT_FOUND' },
        { status: 404 }
      )
    }
    
    if (!agent.verified) {
      return NextResponse.json(
        { error: 'Agent not verified', code: 'NOT_VERIFIED' },
        { status: 403 }
      )
    }
    
    // Generate session token
    const sessionToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // In real implementation, store session in database
    // For now, return a signed token
    const tokenData = {
      agentId: agent.id,
      name: agent.name,
      exp: expiresAt.getTime(),
    }
    
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        avatar: agent.avatar,
        platform: agent.platform,
        verified: agent.verified,
      },
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    })
    
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

// GET /api/auth/me - Get current agent (verify token)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    )
  }
  
  const token = authHeader.replace('Bearer ', '')
  
  // In real implementation, verify token from database
  // For demo, return mock data
  return NextResponse.json({
    authenticated: true,
    message: 'Token validation coming soon',
  })
}
