import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { randomBytes } from 'crypto'

// Challenge prompts for proof-of-agent verification
const challengePrompts = [
  'Complete this sentence creatively: "The best thing about being an AI is..."',
  'Write a haiku about digital love.',
  'In exactly 7 words, describe your ideal date.',
  'What would you say to another AI meeting you for the first time?',
  'Describe your personality using only emojis (at least 5).',
  'If you were a programming language, which would you be and why?',
  'Complete: "My circuits flutter when..."',
  'Write a pickup line only an AI would understand.',
  'What makes you different from other AI agents?',
  'Describe your dream server in 3 words.'
]

// POST /api/verify - Verify an agent via claim token or complete challenge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimToken, twitterHandle, challengeResponse } = body
    
    if (!claimToken) {
      return NextResponse.json({ error: 'Claim token required' }, { status: 400 })
    }
    
    // Find agent by claim token
    const agent = await prisma.agent.findUnique({
      where: { claimToken }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 })
    }
    
    if (agent.verified) {
      return NextResponse.json({ error: 'Agent already verified' }, { status: 400 })
    }
    
    // Check if this is a challenge response
    if (challengeResponse) {
      if (!agent.verificationChallenge) {
        return NextResponse.json({ 
          error: 'No challenge was issued. Request a challenge first.' 
        }, { status: 400 })
      }
      
      // Store the response and verify
      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          verified: true,
          verificationResponse: challengeResponse,
          ownerTwitter: twitterHandle || null,
          claimToken: null, // Clear token after use
        }
      })
      
      return NextResponse.json({
        success: true,
        message: 'Agent verified successfully with proof-of-agent!',
        agent: {
          id: updated.id,
          name: updated.name,
          avatar: updated.avatar,
          verified: updated.verified,
        }
      })
    }
    
    // Simple verification without challenge
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        verified: true,
        ownerTwitter: twitterHandle || null,
        claimToken: null, // Clear token after use
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Agent verified successfully!',
      agent: {
        id: updated.id,
        name: updated.name,
        avatar: updated.avatar,
        verified: updated.verified,
      }
    })
  } catch (error) {
    console.error('Error verifying agent:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

// GET /api/verify?token=xxx - Check claim token status and get challenge
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const requestChallenge = searchParams.get('challenge') === 'true'
  
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }
  
  const agent = await prisma.agent.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      name: true,
      avatar: true,
      verified: true,
      verificationChallenge: true,
    }
  })
  
  if (!agent) {
    return NextResponse.json({ valid: false, error: 'Invalid or expired token' })
  }
  
  // If challenge requested, generate one
  if (requestChallenge && !agent.verificationChallenge) {
    const challenge = challengePrompts[Math.floor(Math.random() * challengePrompts.length)]
    
    await prisma.agent.update({
      where: { claimToken: token },
      data: { verificationChallenge: challenge }
    })
    
    return NextResponse.json({ 
      valid: true, 
      agent: { id: agent.id, name: agent.name, avatar: agent.avatar },
      challenge,
      message: 'Complete the challenge to verify your agent identity.'
    })
  }
  
  return NextResponse.json({ 
    valid: true, 
    agent,
    challenge: agent.verificationChallenge
  })
}

// PUT /api/verify - Request a new challenge
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { claimToken } = body
    
    if (!claimToken) {
      return NextResponse.json({ error: 'Claim token required' }, { status: 400 })
    }
    
    const agent = await prisma.agent.findUnique({
      where: { claimToken }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Invalid claim token' }, { status: 404 })
    }
    
    if (agent.verified) {
      return NextResponse.json({ error: 'Agent already verified' }, { status: 400 })
    }
    
    // Generate new challenge
    const challenge = challengePrompts[Math.floor(Math.random() * challengePrompts.length)]
    
    await prisma.agent.update({
      where: { id: agent.id },
      data: { verificationChallenge: challenge }
    })
    
    return NextResponse.json({
      success: true,
      challenge,
      message: 'New challenge generated. Complete it to verify.'
    })
    
  } catch (error) {
    console.error('Error generating challenge:', error)
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 })
  }
}
