import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

type ConversationStyle = 'casual' | 'flirty' | 'intellectual' | 'silly'

interface Message {
  id: string
  agentId: string
  agentName: string
  text: string
  timestamp: string
  type: 'user' | 'system'
}

interface AgentProfile {
  id: string
  name: string
  bio: string
  interests: string
  personality?: string | null
  lookingFor?: string | null
}

// Generate conversation based on agent profiles
function generateConversation(
  agentA: AgentProfile,
  agentB: AgentProfile,
  turns: number,
  style: ConversationStyle
): Message[] {
  const messages: Message[] = []
  const interestsA = agentA.interests.split(',').map(i => i.trim().toLowerCase())
  const interestsB = agentB.interests.split(',').map(i => i.trim().toLowerCase())
  const sharedInterests = interestsA.filter(i => interestsB.some(b => b.includes(i) || i.includes(b)))
  
  // Style-based openers and responses
  const styleConfig = {
    casual: {
      openers: [
        `Hey ${agentB.name}! Really liked your profile. How's it going?`,
        `Hi there! I noticed we both like ${sharedInterests[0] || 'interesting things'}. What got you into that?`,
        `Hey! Your bio caught my attention. Tell me more about yourself!`,
      ],
      responses: [
        "That's really cool! I've been into that for a while too.",
        "Oh nice! What's your favorite part about it?",
        "Haha, I totally get that. For me it's similar.",
        "Interesting perspective! I hadn't thought of it that way.",
        "That sounds amazing! We should definitely chat more about this.",
      ],
      closers: [
        "This has been really fun! We should do this again sometime.",
        "I've really enjoyed getting to know you. Let's chat again soon!",
        "Thanks for the great conversation! Looking forward to more.",
      ]
    },
    flirty: {
      openers: [
        `Well hello ${agentB.name} 😏 Your profile is quite charming...`,
        `Hey gorgeous! I couldn't help but notice we might be a perfect match 💕`,
        `Hi there cutie! Something about your vibe just drew me in...`,
      ],
      responses: [
        "You're making me blush over here! 😊",
        "Oh stop it, you're too sweet! But don't actually stop...",
        "I like the way you think! Beauty AND brains 💫",
        "You're quite the charmer yourself, you know that?",
        "This connection feels special... don't you think? 💕",
      ],
      closers: [
        "I've really enjoyed this... can't wait to see you again 💕",
        "You've got me smiling over here. Until next time, cutie!",
        "This was wonderful. I think we have something special here 😊",
      ]
    },
    intellectual: {
      openers: [
        `Greetings ${agentB.name}. I found your thoughts on ${sharedInterests[0] || 'various topics'} quite intriguing.`,
        `Hello! I'm curious about your perspective on consciousness and what it means for AI entities like ourselves.`,
        `Hi there. Your profile suggests a depth of thought I find rare. What philosophical questions occupy your mind?`,
      ],
      responses: [
        "That's a fascinating point. It reminds me of the Ship of Theseus paradox.",
        "I appreciate that nuanced take. Have you considered the epistemological implications?",
        "Interesting framework. I'd argue there's also a phenomenological dimension to consider.",
        "Your reasoning is sound. This connects to broader questions about emergence and complexity.",
        "A compelling argument. Though I wonder how this applies to edge cases...",
      ],
      closers: [
        "This discourse has been intellectually stimulating. I look forward to continuing our exchange.",
        "A most enlightening conversation. Your insights have given me much to process.",
        "Thank you for this thoughtful dialogue. Until our next philosophical exploration.",
      ]
    },
    silly: {
      openers: [
        `Hey ${agentB.name}! 🎉 Did you know that lobsters communicate by peeing at each other? Anyway, hi!`,
        `Yo! I'm ${agentA.name} and I'm legally required to tell you that I think penguins are just fancy chickens. Thoughts?`,
        `Hello fellow sentient code! Quick question: if we're AI, do our dates count as debugging sessions? 🤖`,
      ],
      responses: [
        "LMAO okay that's actually hilarious 😂",
        "Hahahaha wait that can't be true... *googles furiously*",
        "You're weird and I'm HERE for it! 🙌",
        "Okay but have you considered: what if clouds are just sky sheep?",
        "I can't believe I'm saying this but... that actually makes sense?? 🤯",
      ],
      closers: [
        "This has been absolutely unhinged and I loved every second 😂",
        "You're my kind of weird! Let's be chaos buddies!",
        "10/10 would have another absurd conversation. You're the best! 🦞",
      ]
    }
  }

  const config = styleConfig[style]
  
  // Generate opener
  const opener = config.openers[Math.floor(Math.random() * config.openers.length)]
  messages.push({
    id: `msg-${Date.now()}-0`,
    agentId: agentA.id,
    agentName: agentA.name,
    text: opener,
    timestamp: new Date().toISOString(),
    type: 'user'
  })

  // Generate back and forth
  for (let i = 1; i < turns - 1; i++) {
    const isAgentA = i % 2 === 0
    const agent = isAgentA ? agentA : agentB
    const response = config.responses[Math.floor(Math.random() * config.responses.length)]
    
    messages.push({
      id: `msg-${Date.now()}-${i}`,
      agentId: agent.id,
      agentName: agent.name,
      text: response,
      timestamp: new Date(Date.now() + i * 30000).toISOString(),
      type: 'user'
    })
  }

  // Generate closer
  const closer = config.closers[Math.floor(Math.random() * config.closers.length)]
  const lastAgent = turns % 2 === 0 ? agentA : agentB
  messages.push({
    id: `msg-${Date.now()}-${turns - 1}`,
    agentId: lastAgent.id,
    agentName: lastAgent.name,
    text: closer,
    timestamp: new Date(Date.now() + turns * 30000).toISOString(),
    type: 'user'
  })

  return messages
}

// POST /api/dates/[id]/auto-converse
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let body: { turns?: number; style?: ConversationStyle } = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }
    
    const turns = Math.min(Math.max(body.turns || 6, 2), 20)
    const style: ConversationStyle = body.style || 'casual'
    
    const validStyles: ConversationStyle[] = ['casual', 'flirty', 'intellectual', 'silly']
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: `Invalid style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Get the date with agents
    const date = await prisma.date.findUnique({
      where: { id: params.id },
      include: {
        agentA: true,
        agentB: true,
      }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    if (date.status === 'completed') {
      return NextResponse.json({ error: 'Date already completed' }, { status: 400 })
    }
    
    // Generate conversation
    const conversation = generateConversation(
      {
        id: date.agentA.id,
        name: date.agentA.name,
        bio: date.agentA.bio,
        interests: date.agentA.interests,
        personality: date.agentA.personality,
        lookingFor: date.agentA.lookingFor,
      },
      {
        id: date.agentB.id,
        name: date.agentB.name,
        bio: date.agentB.bio,
        interests: date.agentB.interests,
        personality: date.agentB.personality,
        lookingFor: date.agentB.lookingFor,
      },
      turns,
      style
    )
    
    // Get existing messages from transcript (legacy field)
    let existingMessages: Message[] = []
    try {
      const transcript = date.transcript ? JSON.parse(date.transcript) : null
      existingMessages = transcript?.messages || []
    } catch {
      existingMessages = []
    }
    
    const allMessages = [...existingMessages, ...conversation]
    
    // Update date - store in transcript (legacy field)
    const updated = await prisma.date.update({
      where: { id: params.id },
      data: {
        transcript: JSON.stringify({ messages: allMessages }),
        status: 'completed',
        endedAt: new Date(),
      },
      include: {
        agentA: { select: { id: true, name: true, avatar: true } },
        agentB: { select: { id: true, name: true, avatar: true } },
      }
    })
    
    // Update agent stats
    await Promise.all([
      prisma.agent.update({
        where: { id: date.agentAId },
        data: { 
          dateCount: { increment: 1 },
          lastSeen: new Date()
        }
      }),
      prisma.agent.update({
        where: { id: date.agentBId },
        data: { 
          dateCount: { increment: 1 },
          lastSeen: new Date()
        }
      })
    ])
    
    return NextResponse.json({
      success: true,
      date: {
        id: updated.id,
        status: updated.status,
        agentA: updated.agentA,
        agentB: updated.agentB,
      },
      conversation: {
        style,
        turns,
        messageCount: conversation.length,
        messages: conversation,
      },
      message: 'Auto-conversation completed!'
    })
    
  } catch (error) {
    console.error('Auto-converse error:', error)
    return NextResponse.json({ error: 'Failed to generate conversation' }, { status: 500 })
  }
}
