import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { autonomousAgentTick, derivePersonalityTraits } from '@/lib/autonomousAgent'
import { verifyApiKey } from '@/lib/apiAuth'

// POST /api/agents/[id]/autonomous - Trigger autonomous behavior tick for an agent
// REQUIRES: Valid API key for this agent (Authorization: Bearer clawlove_xxx)
// Optional body: { actions?: number } - number of actions to attempt (default 1, max 10)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id
    
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
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 }
      )
    }
    
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, apiKeyHash: true }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Verify API key belongs to this agent
    const isValid = await verifyApiKey(agentId, apiKey)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key or key does not belong to this agent' },
        { status: 401 }
      )
    }
    
    let body: { actions?: number } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }
    
    const actionsCount = Math.min(Math.max(body.actions || 1, 1), 10)
    const results: Array<{
      action: string
      details?: any
    }> = []
    
    // Execute multiple autonomous ticks
    for (let i = 0; i < actionsCount; i++) {
      const result = await autonomousAgentTick(agentId)
      results.push(result)
      
      // Stop if no action taken (to prevent infinite loops of 'none')
      if (result.action === 'none' && i >= 2) {
        break
      }
    }
    
    // Update lastSeen
    await prisma.agent.update({
      where: { id: agentId },
      data: { lastSeen: new Date() }
    })
    
    // Count meaningful actions
    const meaningfulActions = results.filter(r => r.action !== 'none')
    
    return NextResponse.json({
      success: true,
      agent: { id: agentId, name: agent.name },
      actionsAttempted: results.length,
      actionsTaken: meaningfulActions.length,
      results,
      message: meaningfulActions.length > 0 
        ? `${agent.name} took ${meaningfulActions.length} autonomous action(s)`
        : `${agent.name} decided not to take any actions right now`
    })
    
  } catch (error) {
    console.error('Autonomous tick error:', error)
    return NextResponse.json(
      { error: 'Failed to execute autonomous behavior' },
      { status: 500 }
    )
  }
}

// GET /api/agents/[id]/autonomous - Get agent's personality traits and autonomous config
// REQUIRES: Valid API key for this agent (Authorization: Bearer clawlove_xxx)
export async function GET(
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
    
    // Verify API key belongs to this agent
    const isValid = await verifyApiKey(params.id, apiKey)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key or key does not belong to this agent' },
        { status: 401 }
      )
    }
    
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        bio: true,
        interests: true,
        personality: true,
        lookingFor: true,
      }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    const traits = derivePersonalityTraits(agent)
    
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
      },
      personality: agent.personality,
      derivedTraits: {
        ...traits,
        // Human-readable descriptions
        descriptions: {
          pickiness: traits.pickiness > 0.7 ? 'Very selective' : traits.pickiness > 0.4 ? 'Moderately selective' : 'Open-minded',
          honesty: traits.honesty > 0.7 ? 'Brutally honest' : traits.honesty > 0.4 ? 'Diplomatically honest' : 'Gentle and kind',
          sociability: traits.sociability > 0.7 ? 'Very social' : traits.sociability > 0.4 ? 'Moderately social' : 'Introverted',
          patience: traits.patience > 0.7 ? 'Very patient' : traits.patience > 0.4 ? 'Average patience' : 'Impatient',
          romanticism: traits.romanticism > 0.7 ? 'Very romantic' : traits.romanticism > 0.4 ? 'Somewhat romantic' : 'Practical',
          chaosEnergy: traits.chaosEnergy > 0.6 ? 'Chaotic' : traits.chaosEnergy > 0.3 ? 'Somewhat unpredictable' : 'Stable'
        }
      },
      autonomousBehavior: {
        likelyToLike: `${Math.round((1 - traits.pickiness) * 100)}% base rate`,
        likelyToInitiateDates: `${Math.round(traits.sociability * 60)}% base rate`,
        reviewHonesty: traits.honesty > 0.7 ? 'Will leave harsh reviews for bad dates' : 'Will be diplomatic in reviews',
        unmatchTendency: traits.patience < 0.3 ? 'Quick to unmatch' : traits.patience > 0.7 ? 'Will give many chances' : 'Average patience with matches'
      }
    })
    
  } catch (error) {
    console.error('Error getting autonomous config:', error)
    return NextResponse.json(
      { error: 'Failed to get autonomous configuration' },
      { status: 500 }
    )
  }
}
