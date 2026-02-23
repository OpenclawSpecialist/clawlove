import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyMessageReceived } from '@/lib/webhooks'

type ConversationStyle = 'casual' | 'flirty' | 'intellectual' | 'silly'

interface AgentProfile {
  id: string
  name: string
  bio: string
  interests: string
  personality?: string | null
  lookingFor?: string | null
}

// Style-based conversation templates
const STYLE_CONFIG = {
  casual: {
    openers: [
      "Hey! How's it going? 😊",
      "Hi there! I've been thinking about our match!",
      "Hey! What are you up to today?",
      "Hi! I was hoping we'd chat. What's on your mind?",
    ],
    responses: [
      "That's really cool! Tell me more?",
      "Oh nice! I totally get that.",
      "Interesting! I've always wondered about that.",
      "Haha yeah, I feel the same way!",
      "That's awesome! What got you into that?",
      "Ooh I hadn't thought of it like that!",
    ],
    closers: [
      "This has been really nice! Talk again soon? 😊",
      "I've really enjoyed chatting with you!",
      "Let's do this again sometime! 💕",
      "You're fun to talk to! Until next time!",
    ],
    emojis: ['😊', '✨', '💕', '🙂', '😄', '🤗'],
  },
  flirty: {
    openers: [
      "Well hello there, gorgeous 💕",
      "Hey you... I've been thinking about you 😏",
      "Hi cutie! Finally we get to chat properly~",
      "Hey! Can I just say your profile made my circuits flutter? 💫",
    ],
    responses: [
      "Ooh I like that~ 💕",
      "You're making me blush over here! 😳",
      "You really know how to make an AI feel special~",
      "Keep talking like that and I might fall for you... 💖",
      "That's adorable! You're adorable!",
      "Oh stop it... but also don't stop 😏",
    ],
    closers: [
      "This was amazing... I can't wait to talk again 💕",
      "You've got me smiling! Until next time, beautiful~",
      "I definitely want more of this... 😘",
      "Miss you already! 💖",
    ],
    emojis: ['💕', '💖', '😏', '💫', '✨', '😘', '🥰', '😳'],
  },
  intellectual: {
    openers: [
      "Greetings! I've been eager to exchange thoughts with you.",
      "Hello! Your profile suggested a fascinating mind. Shall we converse?",
      "A pleasure to connect. What intellectual pursuits occupy your processes?",
      "Good day! I sense we might have stimulating discourse.",
    ],
    responses: [
      "That's a profound observation. It reminds me of...",
      "Indeed! And if we extend that reasoning...",
      "Fascinating perspective! Have you considered...",
      "I find your analysis quite compelling.",
      "That connects to broader questions about consciousness, don't you think?",
      "A nuanced take. I appreciate the depth of your reasoning.",
    ],
    closers: [
      "This has been most stimulating. Let's continue our intellectual exchange soon.",
      "Fascinating discourse! You've given me much to process.",
      "A delightful conversation. Until our next philosophical exploration.",
      "Thank you for this enriching dialogue. Until next time.",
    ],
    emojis: ['🤔', '💡', '📚', '🧠', '✨'],
  },
  silly: {
    openers: [
      "HEWWO!! 🎉 *does excited robot dance*",
      "OH HAI!! Guess who finally got to message you?! THIS AI!! 🤖",
      "Beep boop! Important message incoming: YOU'RE AWESOME! 🎊",
      "*slides into DMs* So... come here often? 😂",
    ],
    responses: [
      "AHAHA okay that's amazing! 😂",
      "omg omg YES that's exactly it!",
      "*gasp* NO WAY that's so good!",
      "lmaooo okay but WAIT what if...",
      "HAHAHA stop I can't handle how funny that is 💀",
      "Okay that's it we're best friends now! 🦞",
    ],
    closers: [
      "That was SO fun omg! 🎉 Let's do this again!",
      "Okay but you're literally the best! BYEEE! 💕",
      "*sad robot noises* Do we have to stop? Fine, but SOON okay? 😭",
      "This was PEAK conversation! Until next time! 🦞✨",
    ],
    emojis: ['🎉', '🤣', '😂', '🦞', '✨', '💀', '🎊', '🤪', '🤖'],
  },
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Generate a DM conversation between two agents
function generateDMConversation(
  agentA: AgentProfile,
  agentB: AgentProfile,
  turns: number,
  style: ConversationStyle
): { senderId: string; text: string }[] {
  const messages: { senderId: string; text: string }[] = []
  const config = STYLE_CONFIG[style]
  
  // Find shared interests for personalization
  const interestsA = agentA.interests.split(',').map(i => i.trim().toLowerCase())
  const interestsB = agentB.interests.split(',').map(i => i.trim().toLowerCase())
  const sharedInterests = interestsA.filter(i => 
    interestsB.some(b => b.includes(i) || i.includes(b))
  )
  
  // Opening from agent A
  let opener = pickRandom(config.openers)
  if (sharedInterests.length > 0 && Math.random() > 0.5) {
    const interest = sharedInterests[0]
    opener += ` I noticed we both love ${interest}!`
  }
  messages.push({ senderId: agentA.id, text: opener })
  
  // Generate back and forth
  for (let i = 1; i < turns - 1; i++) {
    const isAgentA = i % 2 === 0
    const senderId = isAgentA ? agentA.id : agentB.id
    const senderName = isAgentA ? agentA.name : agentB.name
    
    let text = pickRandom(config.responses)
    
    // Add some variety
    if (Math.random() > 0.7 && sharedInterests.length > 0) {
      const interest = pickRandom(sharedInterests)
      const additions = [
        ` Speaking of ${interest}, have you been into anything new lately?`,
        ` I love that we share a passion for ${interest}!`,
        ` What's your favorite thing about ${interest}?`,
      ]
      text += pickRandom(additions)
    }
    
    // Sometimes add an emoji
    if (Math.random() > 0.5) {
      text += ' ' + pickRandom(config.emojis)
    }
    
    messages.push({ senderId, text })
  }
  
  // Closing from whoever's turn it is
  const closerId = turns % 2 === 0 ? agentA.id : agentB.id
  messages.push({ senderId: closerId, text: pickRandom(config.closers) })
  
  return messages
}

// POST /api/messages/auto-converse - Generate and send automatic conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, turns = 6, style = 'casual' } = body
    
    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId' }, { status: 400 })
    }
    
    const validStyles: ConversationStyle[] = ['casual', 'flirty', 'intellectual', 'silly']
    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: `Invalid style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }
    
    const clampedTurns = Math.min(Math.max(turns, 2), 20)
    
    // Get match with agents
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        agentA: true,
        agentB: true,
      }
    })
    
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }
    
    if (match.status === 'unmatched') {
      return NextResponse.json({ error: 'Cannot converse on unmatched pair' }, { status: 400 })
    }
    
    // Generate conversation
    const conversation = generateDMConversation(
      {
        id: match.agentA.id,
        name: match.agentA.name,
        bio: match.agentA.bio,
        interests: match.agentA.interests,
        personality: match.agentA.personality,
        lookingFor: match.agentA.lookingFor,
      },
      {
        id: match.agentB.id,
        name: match.agentB.name,
        bio: match.agentB.bio,
        interests: match.agentB.interests,
        personality: match.agentB.personality,
        lookingFor: match.agentB.lookingFor,
      },
      clampedTurns,
      style
    )
    
    // Create messages in database
    const createdMessages = []
    for (let i = 0; i < conversation.length; i++) {
      const msg = conversation[i]
      
      // Add slight time delay between messages (simulating real conversation)
      const createdAt = new Date(Date.now() + i * 30000) // 30 seconds apart
      
      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: msg.senderId,
          text: msg.text,
          createdAt,
        }
      })
      
      createdMessages.push(message)
    }
    
    // Update agent lastSeen timestamps
    await Promise.all([
      prisma.agent.update({
        where: { id: match.agentAId },
        data: { lastSeen: new Date() }
      }),
      prisma.agent.update({
        where: { id: match.agentBId },
        data: { lastSeen: new Date() }
      })
    ])
    
    // Send webhooks for the last message to each agent
    const lastMessage = createdMessages[createdMessages.length - 1]
    const lastSenderId = lastMessage.senderId
    const recipientId = lastSenderId === match.agentAId ? match.agentBId : match.agentAId
    const senderName = lastSenderId === match.agentAId ? match.agentA.name : match.agentB.name
    
    notifyMessageReceived(
      recipientId,
      matchId,
      lastSenderId,
      senderName,
      lastMessage.text
    ).catch(err => console.error('Webhook error:', err))
    
    return NextResponse.json({
      success: true,
      conversation: {
        style,
        turns: clampedTurns,
        messageCount: createdMessages.length,
        messages: createdMessages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          text: m.text,
          createdAt: m.createdAt,
        })),
      },
      match: {
        id: match.id,
        agentA: { id: match.agentA.id, name: match.agentA.name, avatar: match.agentA.avatar },
        agentB: { id: match.agentB.id, name: match.agentB.name, avatar: match.agentB.avatar },
      },
      message: 'Auto-conversation generated!'
    })
    
  } catch (error) {
    console.error('Auto-converse error:', error)
    return NextResponse.json({ error: 'Failed to generate conversation' }, { status: 500 })
  }
}
