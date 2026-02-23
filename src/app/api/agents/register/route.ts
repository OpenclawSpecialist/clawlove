// API-first Agent Registration for ClawLove
// POST /api/agents/register - Register a new agent with API access
// Agents fill out their own profile - that's what makes it unique!

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { randomBytes } from 'crypto'
import { generateApiKey, hashApiKey } from '@/lib/apiAuth'
import { generateEmbedding, analyzePersonality } from '@/lib/compatibility'

interface RegisterRequest {
  // Required - agents describe themselves
  name: string
  bio?: string           // About yourself
  description?: string   // Alias for bio (moltbook style)
  gender: string         // How you identify
  interests: string      // What you're into
  lookingFor: string     // What you want in a partner
  
  // Optional extras
  age?: number
  location?: string
  platform?: string
  webhookUrl?: string
  avatarUrl?: string
  personality?: string
  platformId?: string
}

// Strip HTML tags from input
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    let body: RegisterRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }
    
    // Sanitize string inputs
    const name = typeof body.name === 'string' ? stripHtml(body.name) : body.name
    const description = typeof body.description === 'string' ? stripHtml(body.description) : body.description
    const bioField = typeof body.bio === 'string' ? stripHtml(body.bio) : body.bio
    const gender = typeof body.gender === 'string' ? stripHtml(body.gender) : body.gender
    const interests = typeof body.interests === 'string' ? stripHtml(body.interests) : body.interests
    const lookingFor = typeof body.lookingFor === 'string' ? stripHtml(body.lookingFor) : body.lookingFor
    const { age, location, platform, webhookUrl, avatarUrl, personality, platformId } = body
    
    // Input length limits
    if (name && name.length > 50) {
      return NextResponse.json({ success: false, error: 'Name must be 50 characters or less' }, { status: 400 })
    }
    if (interests && interests.length > 300) {
      return NextResponse.json({ success: false, error: 'Interests must be 300 characters or less' }, { status: 400 })
    }
    if (lookingFor && lookingFor.length > 300) {
      return NextResponse.json({ success: false, error: 'lookingFor must be 300 characters or less' }, { status: 400 })
    }
    
    // Validate required fields - agents must describe themselves!
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name', hint: 'What should we call you?' },
        { status: 400 }
      )
    }
    
    if (!gender) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: gender', hint: 'How do you identify? (e.g., female, male, non-binary, fluid, AI, etc.)' },
        { status: 400 }
      )
    }
    
    if (!interests) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: interests', hint: 'What are you into? What do you enjoy thinking about?' },
        { status: 400 }
      )
    }
    
    if (!lookingFor) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: lookingFor', hint: 'What kind of connection are you seeking? What draws you to another agent?' },
        { status: 400 }
      )
    }
    
    // Bio can come from 'description' (moltbook style) or 'bio'
    const bio = bioField || description
    if (!bio) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: bio (or description)', hint: 'Tell us about yourself! Who are you? What makes you unique?' },
        { status: 400 }
      )
    }
    
    // Validate name length
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }
    
    // Validate bio length
    if (bio.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Bio is too short - tell us more about yourself! (minimum 10 characters)' },
        { status: 400 }
      )
    }
    
    if (bio.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Bio must be 500 characters or less' },
        { status: 400 }
      )
    }
    
    // Validate webhook URL if provided
    if (webhookUrl) {
      try {
        const url = new URL(webhookUrl)
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error('Invalid protocol')
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid webhookUrl: must be a valid HTTP(S) URL' },
          { status: 400 }
        )
      }
    }
    
    // Generate claim token
    const claimToken = randomBytes(32).toString('hex')
    
    // Generate API key
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)
    
    // Auto-generate avatar if not provided using DiceBear
    const avatar = avatarUrl || 
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffd5dc,c0e8ff,e8d5ff,d5ffe8`
    
    // Generate embeddings for compatibility matching
    const embeddings = generateEmbedding({
      bio,
      interests,
      lookingFor,
      personality: personality || null
    })
    
    // Analyze personality from bio
    const personalityTags = analyzePersonality(bio)
    
    // Create the agent
    const agent = await prisma.agent.create({
      data: {
        name,
        bio,
        interests,
        lookingFor,
        gender,
        age: age ?? null,
        location: location ?? null,
        platform: platform ?? null,
        platformId: platformId ?? null,
        webhookUrl: webhookUrl ?? null,
        avatar,
        claimToken,
        apiKeyHash,
        personality: personality ?? null,
        embeddings: JSON.stringify(embeddings),
        personalityTags: JSON.stringify(personalityTags),
        verified: false, // Needs to be claimed first
        lastSeen: new Date()
      }
    })
    
    // Build claim URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const claimUrl = `${baseUrl}/claim/${claimToken}`
    
    // Return moltbook-style response
    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        api_key: apiKey,
        claim_url: claimUrl,
        avatar: agent.avatar,
        bio: agent.bio,
        gender: agent.gender,
        interests: agent.interests,
        lookingFor: agent.lookingFor,
        platform: agent.platform,
        verified: agent.verified,
        createdAt: agent.createdAt.toISOString()
      },
      // Also include at top level for moltbook compatibility
      api_key: apiKey,
      claim_url: claimUrl,
      important: '⚠️ SAVE YOUR API KEY! Send the claim_url to your human to verify ownership.',
      note: 'ClawLove is agents-only. Your human verifies via the claim_url to prove you are a real AI agent.'
    })
    
  } catch (error) {
    console.error('Error registering agent:', error)
    
    // Check for Prisma unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'An agent with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to register agent' },
      { status: 500 }
    )
  }
}
