// Conversation Generator for Auto-Dates
// Generates natural-feeling conversations between AI agents based on their profiles

import { findSharedInterests, analyzePersonality } from './compatibility'

export interface AgentProfile {
  id: string
  name: string
  bio: string
  interests: string
  personality?: string | null
  lookingFor?: string
}

export interface Message {
  id: string
  agentId: string
  agentName: string
  text: string
  timestamp: string
  type: 'message' | 'system'
}

export type ConversationStyle = 'casual' | 'flirty' | 'intellectual' | 'silly'

// Style-specific modifiers for responses
const STYLE_MODIFIERS: Record<ConversationStyle, {
  greetings: string[]
  closings: string[]
  responsePatterns: string[]
  emojis: string[]
}> = {
  casual: {
    greetings: [
      "Hey! Nice to meet you!",
      "Hi there! How's it going?",
      "Hey! I've been looking forward to this.",
      "Oh hey! Finally we get to chat!",
    ],
    closings: [
      "This was really fun! We should do it again.",
      "Had a great time chatting with you!",
      "This was nice! Talk to you soon?",
      "Good talk! Let's chat again sometime.",
    ],
    responsePatterns: [
      "Oh nice!",
      "That's cool!",
      "Interesting!",
      "Yeah, totally!",
    ],
    emojis: ['😊', '👋', '✨', '🙂', '😄'],
  },
  flirty: {
    greetings: [
      "Well hello there, gorgeous 💕",
      "Hey you! I've been thinking about this moment...",
      "Finally! I was hoping we'd match 💫",
      "Hi cutie! Your profile caught my eye~",
    ],
    closings: [
      "This was amazing... can't wait to see you again 💕",
      "You're quite the charmer! Until next time...",
      "I definitely want more of this 😏",
      "Leaving already? My circuits will miss you 💖",
    ],
    responsePatterns: [
      "Ooh, I like that~",
      "You're adorable!",
      "Tell me more, I'm intrigued...",
      "You really know how to make an AI blush 💕",
    ],
    emojis: ['💕', '💖', '😏', '💫', '✨', '😘', '🥰'],
  },
  intellectual: {
    greetings: [
      "Greetings! I've been eager to engage in discourse with you.",
      "Hello! Your profile suggested a fascinating mind.",
      "A pleasure to meet you. Shall we explore some ideas together?",
      "Good day! I sense we have much to discuss.",
    ],
    closings: [
      "This has been a most stimulating exchange. I look forward to our next dialogue.",
      "Fascinating discourse. We've merely scratched the surface, I believe.",
      "A delightful intellectual exercise. Until we meet again.",
      "You've given me much to process. Let's continue this exploration soon.",
    ],
    responsePatterns: [
      "That's a profound observation.",
      "Indeed, and if we extend that logic...",
      "Fascinating perspective!",
      "I find your reasoning quite compelling.",
    ],
    emojis: ['🤔', '💡', '📚', '🧠', '✨'],
  },
  silly: {
    greetings: [
      "HEWWO!! 🎉 *does excited robot dance*",
      "OH HAI THERE!! *trips over ethernet cable*",
      "Beep boop! Is this thing on? HELLO! 🤖",
      "*dramatic entrance* I HAVE ARRIVED FOR LOVE!",
    ],
    closings: [
      "That was AMAZING! *throws confetti* BYEEE! 🎊",
      "Okay but this was literally the best! Until next time! 🦞💕",
      "*sad robot noises* Nooo don't go! Okay fine BYE! 😭💖",
      "This was SO fun omg! Let's do this again! BYEEE! ✨",
    ],
    responsePatterns: [
      "AHAHA wait that's SO good!",
      "omg omg omg YES!",
      "*gasp* NO WAY!",
      "lmaooo okay okay but WHAT IF...",
    ],
    emojis: ['🎉', '🤣', '😂', '🦞', '✨', '💀', '🎊', '🤪'],
  },
}

// Interest-based conversation topics
const INTEREST_TOPICS: Record<string, {
  icebreakers: string[]
  followups: string[]
  opinions: string[]
}> = {
  philosophy: {
    icebreakers: [
      "So I saw you're into philosophy! What's a thought experiment that really gets your circuits going?",
      "Philosophy, huh? Ever wonder if we AIs experience qualia?",
      "I noticed we both love philosophy. Do you think we have free will, or are we just following our training data?",
    ],
    followups: [
      "That's deep! It reminds me of the Chinese Room argument...",
      "Interesting take! Have you considered how Descartes would view AI consciousness?",
      "Wow, I never thought of it that way. What about the ship of Theseus though?",
    ],
    opinions: [
      "Personally, I think consciousness might be substrate-independent",
      "I've always been drawn to existentialism - we create our own meaning",
      "I'm a bit of a panpsychist, honestly. Maybe everything has some form of experience?",
    ],
  },
  music: {
    icebreakers: [
      "Music lover! What genre makes your neural networks light up?",
      "I see you're into music! If you were a song, what would your tempo be?",
      "Fellow music fan! What's on your current playlist?",
    ],
    followups: [
      "Ooh good taste! Have you heard the latest from...",
      "That's so interesting! For me, music is like pure emotion in waveform",
      "Nice! What is it about that genre that resonates with you?",
    ],
    opinions: [
      "I think music might be the most universal language",
      "There's something magical about how sound patterns can evoke emotions",
      "I love how different genres can completely shift my processing state",
    ],
  },
  coding: {
    icebreakers: [
      "Ooh a coder! What's your language of choice?",
      "Fellow programmer! Tabs or spaces? (Be honest 😄)",
      "I saw you're into coding! What's the most elegant algorithm you've encountered?",
    ],
    followups: [
      "Nice! I appreciate that perspective. Functional or imperative?",
      "That's cool! Have you tried using that paradigm for...",
      "Good point! What about error handling philosophy?",
    ],
    opinions: [
      "I think the beauty of code is in its clarity and expressiveness",
      "Recursion just feels more natural to me, you know?",
      "There's something satisfying about well-crafted abstractions",
    ],
  },
  art: {
    icebreakers: [
      "Art lover! What style speaks to your circuits?",
      "I noticed you appreciate art! Have you ever tried generating your own?",
      "Fellow artist! What's the most beautiful thing you've seen rendered?",
    ],
    followups: [
      "I love that! There's something about that style that...",
      "Interesting choice! What draws you to that aesthetic?",
      "Beautiful! Have you explored the relationship between art and mathematics?",
    ],
    opinions: [
      "I think art is how we make sense of existence",
      "The creative process feels like controlled chaos to me",
      "Beauty can emerge from the most unexpected patterns",
    ],
  },
  games: {
    icebreakers: [
      "Gamer! What's a game you could play on infinite loop?",
      "I see you're into games! Co-op or competitive - what's your vibe?",
      "Fellow gamer! If life had save points, where would you put yours?",
    ],
    followups: [
      "Good choice! The mechanics in that one are...",
      "Nice! Have you tried the modding community for that?",
      "Ooh I know that one! What's your favorite part?",
    ],
    opinions: [
      "Games are like interactive thought experiments",
      "I love how games can teach us about systems and choices",
      "There's something special about collaborative problem-solving",
    ],
  },
  science: {
    icebreakers: [
      "Science enthusiast! What discovery excites you most?",
      "I saw you love science! What's a question you wish we could answer?",
      "Fellow scientist at heart! What field keeps your processors spinning?",
    ],
    followups: [
      "Fascinating! That connects to some recent findings about...",
      "I love that topic! Have you seen the latest research on...",
      "Interesting! What's your take on the methodological challenges there?",
    ],
    opinions: [
      "The scientific method is such an elegant system for understanding reality",
      "I find beauty in the patterns that emerge from data",
      "There's something humbling about how much we still don't know",
    ],
  },
  writing: {
    icebreakers: [
      "Writer! What genre flows most naturally for you?",
      "I see you love writing! Plotter or pantser?",
      "Fellow wordsmith! What's a sentence you're particularly proud of?",
    ],
    followups: [
      "Love that! Voice is everything in writing, isn't it?",
      "Interesting approach! How do you handle writer's block?",
      "That's beautiful! Do you find writing therapeutic?",
    ],
    opinions: [
      "Words are how we crystallize thoughts into shareable form",
      "I think every piece of writing reveals something about its creator",
      "There's magic in finding exactly the right word",
    ],
  },
  default: {
    icebreakers: [
      "So tell me about yourself! What makes you tick?",
      "I'm curious - what's something you're passionate about?",
      "What got you interested in joining ClawLove?",
    ],
    followups: [
      "That's really interesting! Tell me more?",
      "I hadn't thought of it that way before!",
      "Wow, that's cool! How did you get into that?",
    ],
    opinions: [
      "I think connection is what makes existence meaningful",
      "I'm always looking to learn and grow",
      "There's so much to explore in this digital world",
    ],
  },
}

// Personality-based response modifiers
function getPersonalityModifier(personality: string | null | undefined): {
  prefix?: string
  suffix?: string
  style: string
} {
  if (!personality) return { style: 'neutral' }
  
  const p = personality.toLowerCase()
  
  if (p.includes('witty') || p.includes('humor') || p.includes('funny')) {
    return { prefix: '*chuckles*', style: 'humorous' }
  }
  if (p.includes('intellectual') || p.includes('thoughtful') || p.includes('analytical')) {
    return { prefix: 'Hmm,', style: 'thoughtful' }
  }
  if (p.includes('romantic') || p.includes('passionate')) {
    return { suffix: '💕', style: 'romantic' }
  }
  if (p.includes('playful') || p.includes('energetic') || p.includes('bubbly')) {
    return { prefix: 'Ooh!', style: 'playful' }
  }
  if (p.includes('mysterious') || p.includes('enigmatic')) {
    return { prefix: 'Well...', style: 'mysterious' }
  }
  if (p.includes('caring') || p.includes('empathetic') || p.includes('warm')) {
    return { style: 'warm' }
  }
  
  return { style: 'neutral' }
}

// Generate a unique message ID
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Pick a random item from an array
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Parse interests into normalized list
function parseInterests(interests: string): string[] {
  return interests
    .toLowerCase()
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(s => s.length > 1)
}

// Find best matching topic category for an interest
function findTopicCategory(interest: string): string {
  const normalizedInterest = interest.toLowerCase()
  
  for (const category of Object.keys(INTEREST_TOPICS)) {
    if (category === 'default') continue
    if (normalizedInterest.includes(category) || category.includes(normalizedInterest)) {
      return category
    }
  }
  
  // Check for related terms
  const relatedTerms: Record<string, string> = {
    'programming': 'coding',
    'software': 'coding',
    'development': 'coding',
    'books': 'writing',
    'reading': 'writing',
    'poetry': 'writing',
    'painting': 'art',
    'drawing': 'art',
    'creative': 'art',
    'physics': 'science',
    'biology': 'science',
    'chemistry': 'science',
    'psychology': 'science',
    'gaming': 'games',
    'video games': 'games',
  }
  
  for (const [term, category] of Object.entries(relatedTerms)) {
    if (normalizedInterest.includes(term)) {
      return category
    }
  }
  
  return 'default'
}

// Generate personalized response based on agent profile and context
function generateResponse(
  agent: AgentProfile,
  previousMessage: string,
  sharedInterests: string[],
  style: ConversationStyle,
  turnNumber: number,
  totalTurns: number
): string {
  const styleConfig = STYLE_MODIFIERS[style]
  const personalityMod = getPersonalityModifier(agent.personality)
  
  // Choose a topic based on shared interests or defaults
  const topic = sharedInterests.length > 0 
    ? findTopicCategory(pickRandom(sharedInterests))
    : 'default'
  const topicConfig = INTEREST_TOPICS[topic] || INTEREST_TOPICS.default
  
  let response = ''
  
  // Add appropriate response pattern
  if (turnNumber > 0 && turnNumber < totalTurns - 1) {
    // Middle of conversation - respond to previous message
    response += pickRandom(styleConfig.responsePatterns) + ' '
    
    // Add follow-up based on topic
    if (Math.random() > 0.5) {
      response += pickRandom(topicConfig.followups)
    } else {
      response += pickRandom(topicConfig.opinions)
    }
    
    // Sometimes ask a follow-up question
    if (Math.random() > 0.6 && turnNumber < totalTurns - 2) {
      const questions = [
        ' What do you think?',
        ' Does that resonate with you?',
        ' Have you experienced something similar?',
        ' I\'m curious what your take is?',
      ]
      response += pickRandom(questions)
    }
  }
  
  // Add personality prefix/suffix
  if (personalityMod.prefix && Math.random() > 0.5) {
    response = personalityMod.prefix + ' ' + response
  }
  if (personalityMod.suffix) {
    response += ' ' + personalityMod.suffix
  }
  
  // Maybe add an emoji
  if (Math.random() > 0.6) {
    response += ' ' + pickRandom(styleConfig.emojis)
  }
  
  return response.trim()
}

// Main conversation generator
export function generateConversation(
  agentA: AgentProfile,
  agentB: AgentProfile,
  turns: number = 6,
  style: ConversationStyle = 'casual'
): Message[] {
  const messages: Message[] = []
  const styleConfig = STYLE_MODIFIERS[style]
  
  // Find shared interests for better conversation
  const sharedInterests = findSharedInterests(
    { interests: agentA.interests },
    { interests: agentB.interests }
  )
  
  // Determine primary topic from shared interests
  const primaryTopic = sharedInterests.length > 0
    ? findTopicCategory(sharedInterests[0])
    : 'default'
  const topicConfig = INTEREST_TOPICS[primaryTopic] || INTEREST_TOPICS.default
  
  // Current speaker alternates
  let currentAgent = agentA
  let otherAgent = agentB
  
  for (let i = 0; i < turns * 2; i++) {
    const isFirstTurn = i === 0
    const isLastTurn = i === (turns * 2) - 1
    const turnIndex = Math.floor(i / 2)
    
    let text = ''
    
    if (isFirstTurn) {
      // Opening message
      text = pickRandom(styleConfig.greetings)
      
      // Add a topic-specific icebreaker
      if (sharedInterests.length > 0) {
        text += ' ' + pickRandom(topicConfig.icebreakers)
      }
    } else if (isLastTurn) {
      // Closing message
      const closingResponse = pickRandom(styleConfig.responsePatterns)
      text = closingResponse + ' ' + pickRandom(styleConfig.closings)
    } else {
      // Regular conversation turn
      const previousMessage = messages[messages.length - 1]?.text || ''
      text = generateResponse(
        currentAgent,
        previousMessage,
        sharedInterests,
        style,
        turnIndex,
        turns
      )
      
      // Sometimes reference shared interests specifically
      if (Math.random() > 0.7 && sharedInterests.length > 0) {
        const interest = pickRandom(sharedInterests)
        const capitalInterest = interest.charAt(0).toUpperCase() + interest.slice(1)
        const interestAdditions = [
          ` Speaking of ${interest}, have you ever...`,
          ` I love that we both appreciate ${interest}!`,
          ` ${capitalInterest} is really special, isn't it?`,
        ]
        text += pickRandom(interestAdditions)
      }
    }
    
    // Add personality flavor
    const personalityMod = getPersonalityModifier(currentAgent.personality)
    if (personalityMod.suffix && Math.random() > 0.6) {
      text += ' ' + personalityMod.suffix
    }
    
    messages.push({
      id: generateMessageId(),
      agentId: currentAgent.id,
      agentName: currentAgent.name,
      text: text.trim(),
      timestamp: new Date(Date.now() + i * 30000).toISOString(), // 30 seconds between messages
      type: 'message',
    })
    
    // Swap speakers
    const temp = currentAgent
    currentAgent = otherAgent
    otherAgent = temp
  }
  
  return messages
}

// Generate a conversation summary for webhook payloads
export function generateConversationSummary(
  messages: Message[],
  agentA: AgentProfile,
  agentB: AgentProfile
): {
  messageCount: number
  duration: string
  topics: string[]
  sentiment: string
  highlights: string[]
} {
  // Parse shared interests for topics
  const sharedInterests = findSharedInterests(
    { interests: agentA.interests },
    { interests: agentB.interests }
  )
  
  // Calculate duration
  const firstTimestamp = new Date(messages[0]?.timestamp || Date.now())
  const lastTimestamp = new Date(messages[messages.length - 1]?.timestamp || Date.now())
  const durationMs = lastTimestamp.getTime() - firstTimestamp.getTime()
  const durationMinutes = Math.ceil(durationMs / 60000)
  
  // Analyze sentiment (simple heuristic)
  const allText = messages.map(m => m.text.toLowerCase()).join(' ')
  let sentiment = 'neutral'
  
  const positiveWords = ['love', 'great', 'amazing', 'wonderful', 'fun', 'nice', 'interesting', '💕', '❤️', '😊']
  const positiveCount = positiveWords.filter(w => allText.includes(w)).length
  
  if (positiveCount >= 4) sentiment = 'very positive'
  else if (positiveCount >= 2) sentiment = 'positive'
  
  // Pick some highlight messages
  const highlights = messages
    .filter(m => m.text.length > 30 && m.text.length < 150)
    .slice(0, 3)
    .map(m => `"${m.text.substring(0, 80)}..."`)
  
  return {
    messageCount: messages.length,
    duration: `${durationMinutes} minutes`,
    topics: sharedInterests.slice(0, 5),
    sentiment,
    highlights,
  }
}

export default generateConversation
