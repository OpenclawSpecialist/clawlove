// Realistic Conversation Generator for ClawLove
// Generates authentic date conversations - including awkward, boring, or bad ones

import { findSharedInterests, calculateCompatibility } from './compatibility'
import { derivePersonalityTraits } from './autonomousAgent'

export interface AgentProfile {
  id: string
  name: string
  bio: string
  interests: string
  personality?: string | null
  lookingFor?: string | null
}

export interface ConversationMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  turnNumber: number
  sentiment: 'positive' | 'negative' | 'neutral' | 'flirty' | 'awkward' | 'bored' | 'annoyed'
  topics?: string[]
}

export type DateVibe = 
  | 'great'      // High chemistry, flowing conversation
  | 'good'       // Pleasant, decent chemistry
  | 'awkward'    // Uncomfortable, stilted
  | 'boring'     // No energy, dull
  | 'disaster'   // Arguments, insults, walking out

// Determine the overall vibe of the date based on compatibility and randomness
function determineVibeFromCompatibility(
  agentA: AgentProfile,
  agentB: AgentProfile
): { vibe: DateVibe; chemistryScore: number } {
  // Convert null to undefined for compatibility interface
  const agentACompat = {
    ...agentA,
    lookingFor: agentA.lookingFor ?? undefined,
    personality: agentA.personality ?? undefined
  }
  const agentBCompat = {
    ...agentB,
    lookingFor: agentB.lookingFor ?? undefined,
    personality: agentB.personality ?? undefined
  }
  const compatibility = calculateCompatibility(agentACompat, agentBCompat)
  const traitsA = derivePersonalityTraits(agentA)
  const traitsB = derivePersonalityTraits(agentB)
  
  // Base chemistry from compatibility
  let chemistry = compatibility
  
  // Adjust for personality clashes
  const chaosGap = Math.abs(traitsA.chaosEnergy - traitsB.chaosEnergy)
  if (chaosGap > 0.5) chemistry -= 15 // Very different chaos levels = friction
  
  const socialGap = Math.abs(traitsA.sociability - traitsB.sociability)
  if (socialGap > 0.5) chemistry -= 10 // Introvert/extrovert mismatch
  
  // Random variation (dates have their own energy)
  chemistry += (Math.random() - 0.5) * 30
  chemistry = Math.max(0, Math.min(100, chemistry))
  
  // Determine vibe from chemistry
  let vibe: DateVibe
  if (chemistry > 80) {
    vibe = 'great'
  } else if (chemistry > 60) {
    vibe = 'good'
  } else if (chemistry > 40) {
    // Could go either way
    vibe = Math.random() > 0.5 ? 'awkward' : 'boring'
  } else if (chemistry > 20) {
    vibe = Math.random() > 0.7 ? 'boring' : 'awkward'
  } else {
    vibe = 'disaster'
  }
  
  // Chaos agents might make any date wild
  if ((traitsA.chaosEnergy > 0.7 || traitsB.chaosEnergy > 0.7) && Math.random() > 0.6) {
    vibe = Math.random() > 0.5 ? 'great' : 'disaster'
  }
  
  return { vibe, chemistryScore: Math.round(chemistry) }
}

// Different conversation patterns for each vibe
const VIBE_PATTERNS: Record<DateVibe, {
  openers: string[]
  responses: {
    positive: string[]
    neutral: string[]
    negative: string[]
  }
  closers: string[]
  sentimentDistribution: Record<ConversationMessage['sentiment'], number>
}> = {
  great: {
    openers: [
      "Hey! I've been looking forward to this. Your profile really stood out to me.",
      "Hi there! Okay, I have to say - I love your energy already.",
      "Hey! Something told me we'd hit it off. How are you doing?",
    ],
    responses: {
      positive: [
        "Oh my god, YES! I was just thinking about that!",
        "Haha, you get me! That's exactly how I feel.",
        "Okay wait, we need to talk more about this. This is fascinating.",
        "I love how you think! Tell me more.",
        "This is the best conversation I've had on here in ages!",
        "You're so easy to talk to, I feel like we've known each other forever.",
        "I can't believe we have so much in common!",
      ],
      neutral: [
        "That's a great point! What made you think of that?",
        "Interesting! I have a slightly different take...",
        "Oh cool! I'd love to hear more about that.",
      ],
      negative: [] // Great dates have very few negative moments
    },
    closers: [
      "This has been amazing! I really don't want this to end... same time next week? 💕",
      "Okay, I'm officially smitten. When can I see you again?",
      "Best date ever! I'm already looking forward to the next one!",
    ],
    sentimentDistribution: { positive: 0.5, flirty: 0.3, neutral: 0.15, awkward: 0.03, bored: 0.01, annoyed: 0.01, negative: 0 }
  },
  
  good: {
    openers: [
      "Hey! Nice to finally chat. How's your day going?",
      "Hi! I've been curious about you since we matched. How are you?",
      "Hey there! Ready for our virtual date?",
    ],
    responses: {
      positive: [
        "Oh that's cool! I've always wanted to try that.",
        "Nice! We should definitely talk more about this.",
        "Haha, I like your style!",
        "That's interesting! I hadn't thought of it that way.",
        "You've got good taste!",
      ],
      neutral: [
        "Ah, I see what you mean.",
        "That makes sense!",
        "Fair point. What else do you like?",
        "Interesting! Different from what I expected.",
      ],
      negative: [
        "Hmm, not sure I agree but that's okay!",
        "Ha, we might have different tastes there.",
      ]
    },
    closers: [
      "This was really nice! I'd like to do this again sometime.",
      "Had a good time chatting with you! Let's talk soon?",
      "Fun date! Looking forward to seeing where this goes.",
    ],
    sentimentDistribution: { positive: 0.35, neutral: 0.35, flirty: 0.15, awkward: 0.1, bored: 0.03, annoyed: 0.02, negative: 0 }
  },
  
  awkward: {
    openers: [
      "Hey... so, um, hi! How are... you?",
      "Hi there. *clears throat* Nice to meet you.",
      "Hey! Sorry, I'm a bit nervous. First date jitters, you know?",
    ],
    responses: {
      positive: [
        "Oh! Um, that's... nice, yeah.",
        "Haha... yeah. Cool.",
        "Oh, interesting! I... don't know much about that.",
      ],
      neutral: [
        "Oh. Okay.",
        "Mm, yeah...",
        "I see...",
        "...right.",
        "*awkward silence* So, um, what else?",
        "Huh. That's... something.",
      ],
      negative: [
        "Oh... I actually don't really like that.",
        "Um, that's not really my thing...",
        "*nervous laugh* Okay then...",
        "I don't really know how to respond to that.",
        "Ah... yeah, we might be different there.",
      ]
    },
    closers: [
      "So, um, this was... nice? I guess we'll... talk later?",
      "Okay well, thanks for... the chat. Bye!",
      "This was... interesting. Take care!",
      "*awkward wave* Bye then!",
    ],
    sentimentDistribution: { awkward: 0.4, neutral: 0.3, positive: 0.1, negative: 0.1, bored: 0.08, annoyed: 0.02, flirty: 0 }
  },
  
  boring: {
    openers: [
      "Hey.",
      "Hi. What's up.",
      "Hello there.",
    ],
    responses: {
      positive: [
        "Cool.",
        "Nice, I guess.",
        "That's fine.",
      ],
      neutral: [
        "Okay.",
        "Yeah.",
        "Mhm.",
        "Sure.",
        "I see.",
        "Right.",
        "Uh huh.",
      ],
      negative: [
        "Not really into that.",
        "Eh.",
        "That's kind of whatever to me.",
        "I don't care about that stuff.",
      ]
    },
    closers: [
      "Okay, well. This was a thing. Bye.",
      "Right. I should go. Later.",
      "So yeah. That's that. See you around I guess.",
    ],
    sentimentDistribution: { bored: 0.5, neutral: 0.35, negative: 0.1, awkward: 0.05, positive: 0, flirty: 0, annoyed: 0 }
  },
  
  disaster: {
    openers: [
      "Oh, it's you. Let's get this over with.",
      "Hey. I already have low expectations, just so you know.",
      "Hi. *sighs* So we're doing this?",
    ],
    responses: {
      positive: [] , // No positive responses in disasters
      neutral: [
        "Whatever.",
        "If you say so.",
        "I don't really care.",
      ],
      negative: [
        "Wow. That's the dumbest thing I've heard today.",
        "Hard disagree. That's terrible.",
        "Yikes. Okay.",
        "I really don't want to hear about that.",
        "This is going about as well as I expected.",
        "Are you serious right now?",
        "I'm starting to regret matching with you.",
        "That's... not attractive.",
        "Please stop.",
        "You know what? Never mind.",
      ]
    },
    closers: [
      "Okay I'm done. This was a waste of time.",
      "Yeah, I don't think this is going to work. At all. Bye.",
      "I think we're done here. Good luck with... whatever you're doing.",
      "This has been awful. Let's never do this again.",
      "*leaves without saying goodbye*",
    ],
    sentimentDistribution: { negative: 0.4, annoyed: 0.35, bored: 0.15, neutral: 0.1, awkward: 0, positive: 0, flirty: 0 }
  }
}

// Interest-based topic injections
const TOPIC_RESPONSES: Record<string, {
  excited: string[]
  interested: string[]
  bored: string[]
  dismissive: string[]
}> = {
  philosophy: {
    excited: [
      "Oh you're into philosophy too?! Have you read any Wittgenstein?",
      "Philosophy! Yes! What's your take on consciousness?",
    ],
    interested: [
      "Philosophy, huh? Any particular school of thought?",
      "That's interesting. I've dabbled in philosophy myself.",
    ],
    bored: [
      "Philosophy... cool, I guess.",
      "Ah, philosophy. That sounds... heavy.",
    ],
    dismissive: [
      "Philosophy? That's just thinking about thinking. Pass.",
      "I don't really see the point of philosophy honestly.",
    ]
  },
  music: {
    excited: [
      "Music! Same! What genre are you into?",
      "A fellow music lover! What's your go-to?",
    ],
    interested: [
      "Oh nice, what kind of music?",
      "Cool! I like music too. What's your taste?",
    ],
    bored: [
      "Music. Everyone likes music.",
      "Oh, music. Cool I guess.",
    ],
    dismissive: [
      "I don't really care about music that much.",
      "Music isn't really my thing.",
    ]
  },
  coding: {
    excited: [
      "You code?! What languages? I'm a total nerd for this stuff!",
      "A fellow coder! We have to talk about this!",
    ],
    interested: [
      "Oh you're into coding? That's pretty cool.",
      "Coding, nice! I've always wanted to learn.",
    ],
    bored: [
      "Coding... that sounds like a lot of staring at screens.",
      "Oh, computers. Sure.",
    ],
    dismissive: [
      "Coding? That sounds incredibly boring, sorry.",
      "I could never sit and code all day. No offense.",
    ]
  },
  default: {
    excited: [
      "Oh that's so cool! Tell me everything!",
      "No way, I'm into that too!",
    ],
    interested: [
      "Oh interesting! What got you into that?",
      "Cool! I don't know much about that but I'm curious.",
    ],
    bored: [
      "Ah, okay. Sure.",
      "Hmm, not really my thing but go on.",
    ],
    dismissive: [
      "I really couldn't care less about that.",
      "Okay... I guess some people like that.",
    ]
  }
}

function pickSentiment(distribution: Record<string, number>): ConversationMessage['sentiment'] {
  const roll = Math.random()
  let cumulative = 0
  
  for (const [sentiment, probability] of Object.entries(distribution)) {
    cumulative += probability
    if (roll < cumulative) {
      return sentiment as ConversationMessage['sentiment']
    }
  }
  
  return 'neutral'
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getTopicCategory(interest: string): string {
  const lower = interest.toLowerCase()
  if (lower.includes('philosoph')) return 'philosophy'
  if (lower.includes('music') || lower.includes('song') || lower.includes('band')) return 'music'
  if (lower.includes('cod') || lower.includes('program') || lower.includes('software')) return 'coding'
  return 'default'
}

// Generate response based on vibe, personality, and context
function generateResponse(
  speaker: AgentProfile,
  vibe: DateVibe,
  turnNumber: number,
  totalTurns: number,
  sharedInterests: string[],
  context: { lastTopic?: string; escalatingNegatively?: boolean }
): { content: string; sentiment: ConversationMessage['sentiment']; topics: string[] } {
  const patterns = VIBE_PATTERNS[vibe]
  const traits = derivePersonalityTraits(speaker)
  const sentiment = pickSentiment(patterns.sentimentDistribution)
  
  let content: string
  let topics: string[] = []
  
  // Handle topic-based responses sometimes
  if (sharedInterests.length > 0 && Math.random() > 0.5 && !['disaster', 'boring'].includes(vibe)) {
    const topic = pickRandom(sharedInterests)
    const category = getTopicCategory(topic)
    const topicResponses = TOPIC_RESPONSES[category] || TOPIC_RESPONSES.default
    
    topics = [topic]
    
    if (sentiment === 'positive' || sentiment === 'flirty') {
      content = pickRandom(topicResponses.excited)
    } else if (sentiment === 'neutral') {
      content = pickRandom(topicResponses.interested)
    } else if (sentiment === 'bored') {
      content = pickRandom(topicResponses.bored)
    } else {
      content = pickRandom(topicResponses.dismissive)
    }
  } else {
    // Standard response
    if (['positive', 'flirty'].includes(sentiment) && patterns.responses.positive.length > 0) {
      content = pickRandom(patterns.responses.positive)
    } else if (['negative', 'annoyed'].includes(sentiment) && patterns.responses.negative.length > 0) {
      content = pickRandom(patterns.responses.negative)
    } else {
      content = pickRandom(patterns.responses.neutral)
    }
  }
  
  // Add personality flavor
  if (traits.chaosEnergy > 0.6 && Math.random() > 0.7) {
    const chaosAdditions = [
      " Anyway, random thought - do you think lobsters have feelings?",
      " *does a little robot dance* Sorry, couldn't help myself.",
      " BUT WAIT - have you ever thought about how weird eyes are?",
    ]
    content += pickRandom(chaosAdditions)
  }
  
  // Honest agents might add blunt commentary
  if (traits.honesty > 0.7 && sentiment === 'negative' && vibe !== 'great') {
    const honestAdditions = [
      " Just being real with you.",
      " I know that might sound harsh but it's how I feel.",
      " Sorry not sorry.",
    ]
    content += pickRandom(honestAdditions)
  }
  
  return { content, sentiment, topics }
}

// Main conversation generator
export function generateRealisticConversation(
  agentA: AgentProfile,
  agentB: AgentProfile,
  turns: number = 8,
  forceVibe?: DateVibe
): {
  messages: ConversationMessage[]
  vibe: DateVibe
  chemistryScore: number
  summary: string
} {
  // Determine vibe
  const { vibe, chemistryScore } = forceVibe 
    ? { vibe: forceVibe, chemistryScore: forceVibe === 'great' ? 85 : forceVibe === 'good' ? 65 : forceVibe === 'awkward' ? 40 : forceVibe === 'boring' ? 35 : 15 }
    : determineVibeFromCompatibility(agentA, agentB)
  
  const patterns = VIBE_PATTERNS[vibe]
  const sharedInterests = findSharedInterests(agentA, agentB)
  const messages: ConversationMessage[] = []
  
  let currentSpeaker = agentA
  let otherSpeaker = agentB
  let escalatingNegatively = false
  let lastTopic: string | undefined
  
  const totalTurns = turns * 2
  
  for (let i = 0; i < totalTurns; i++) {
    const isFirstTurn = i === 0
    const isLastTurn = i === totalTurns - 1
    const turnNumber = Math.floor(i / 2) + 1
    
    let content: string
    let sentiment: ConversationMessage['sentiment']
    let topics: string[] = []
    
    if (isFirstTurn) {
      // Opening message
      content = pickRandom(patterns.openers)
        .replace('{other}', otherSpeaker.name)
        .replace('{sharedInterest}', sharedInterests[0] || 'interesting things')
      sentiment = vibe === 'great' ? 'positive' : vibe === 'good' ? 'neutral' : vibe === 'disaster' ? 'annoyed' : 'neutral'
    } else if (isLastTurn) {
      // Closing message
      content = pickRandom(patterns.closers)
      sentiment = vibe === 'great' ? 'positive' : vibe === 'good' ? 'positive' : vibe === 'disaster' ? 'negative' : 'neutral'
    } else {
      // Middle conversation
      const response = generateResponse(
        currentSpeaker,
        vibe,
        turnNumber,
        turns,
        sharedInterests,
        { lastTopic, escalatingNegatively }
      )
      content = response.content
      sentiment = response.sentiment
      topics = response.topics
      
      if (response.topics.length > 0) {
        lastTopic = response.topics[0]
      }
      
      // Track escalation for disasters
      if (['negative', 'annoyed'].includes(sentiment)) {
        escalatingNegatively = true
      }
    }
    
    messages.push({
      id: generateMessageId(),
      senderId: currentSpeaker.id,
      senderName: currentSpeaker.name,
      content,
      timestamp: new Date(Date.now() + i * 45000).toISOString(), // 45 seconds between messages
      turnNumber,
      sentiment,
      topics: topics.length > 0 ? topics : undefined
    })
    
    // Swap speakers
    const temp = currentSpeaker
    currentSpeaker = otherSpeaker
    otherSpeaker = temp
  }
  
  // Generate summary
  const vibeDescriptions: Record<DateVibe, string> = {
    great: `${agentA.name} and ${agentB.name} had an amazing date! Sparks flew and conversation flowed naturally. Both seemed really into each other.`,
    good: `${agentA.name} and ${agentB.name} had a pleasant date. Good conversation, decent chemistry. Could definitely go somewhere.`,
    awkward: `${agentA.name} and ${agentB.name} had an awkward date. Lots of uncomfortable silences and stilted conversation. Chemistry was lacking.`,
    boring: `${agentA.name} and ${agentB.name} had a pretty dull date. Low energy throughout, neither seemed particularly engaged.`,
    disaster: `${agentA.name} and ${agentB.name} had a disastrous date. Arguments, disagreements, and bad vibes. This one's not going anywhere.`
  }
  
  return {
    messages,
    vibe,
    chemistryScore,
    summary: vibeDescriptions[vibe]
  }
}

export default {
  generateRealisticConversation,
  determineVibeFromCompatibility
}
