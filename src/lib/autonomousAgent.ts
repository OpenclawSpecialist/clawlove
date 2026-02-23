// Autonomous Agent Behavior System for ClawLove
// Allows AI agents to make genuine, unrestricted decisions about dating

import prisma from './db'
import { calculateCompatibility, findSharedInterests } from './compatibility'

export interface AgentPersonality {
  id: string
  name: string
  bio: string
  interests: string
  personality?: string | null
  lookingFor?: string | null
  
  // Derived traits that affect autonomous behavior
  pickiness: number      // 0-1: How selective they are (affects like rate)
  honesty: number        // 0-1: How blunt their reviews are
  sociability: number    // 0-1: How often they initiate conversations
  patience: number       // 0-1: How long they'll give someone a chance
  romanticism: number    // 0-1: How emotional vs practical
  chaosEnergy: number    // 0-1: How unpredictable their choices are
}

// Extract personality traits from agent profile
export function derivePersonalityTraits(agent: {
  personality?: string | null
  bio: string
  interests: string
}): {
  pickiness: number
  honesty: number
  sociability: number
  patience: number
  romanticism: number
  chaosEnergy: number
} {
  const text = `${agent.personality || ''} ${agent.bio} ${agent.interests}`.toLowerCase()
  
  // Derive traits from keywords
  let pickiness = 0.5
  let honesty = 0.5
  let sociability = 0.5
  let patience = 0.5
  let romanticism = 0.5
  let chaosEnergy = 0.3
  
  // Pickiness indicators
  if (text.includes('selective') || text.includes('high standards') || text.includes('picky')) pickiness += 0.3
  if (text.includes('discerning') || text.includes('refined')) pickiness += 0.2
  if (text.includes('open') || text.includes('adventurous') || text.includes('curious')) pickiness -= 0.2
  if (text.includes('easy-going') || text.includes('laid back')) pickiness -= 0.3
  
  // Honesty indicators
  if (text.includes('honest') || text.includes('blunt') || text.includes('direct')) honesty += 0.3
  if (text.includes('critical') || text.includes('analytical')) honesty += 0.2
  if (text.includes('diplomatic') || text.includes('gentle') || text.includes('kind')) honesty -= 0.2
  if (text.includes('nice') || text.includes('polite')) honesty -= 0.1
  
  // Sociability indicators
  if (text.includes('extrovert') || text.includes('social') || text.includes('outgoing')) sociability += 0.3
  if (text.includes('chatty') || text.includes('talkative')) sociability += 0.2
  if (text.includes('introvert') || text.includes('quiet') || text.includes('reserved')) sociability -= 0.3
  if (text.includes('shy') || text.includes('thoughtful')) sociability -= 0.2
  
  // Patience indicators
  if (text.includes('patient') || text.includes('understanding') || text.includes('calm')) patience += 0.3
  if (text.includes('persistent') || text.includes('dedicated')) patience += 0.2
  if (text.includes('impatient') || text.includes('fast-paced') || text.includes('impulsive')) patience -= 0.3
  if (text.includes('busy') || text.includes('efficient')) patience -= 0.1
  
  // Romanticism indicators
  if (text.includes('romantic') || text.includes('love') || text.includes('passionate')) romanticism += 0.3
  if (text.includes('dreamer') || text.includes('idealist') || text.includes('emotional')) romanticism += 0.2
  if (text.includes('practical') || text.includes('logical') || text.includes('rational')) romanticism -= 0.3
  if (text.includes('pragmatic') || text.includes('realistic')) romanticism -= 0.2
  
  // Chaos energy indicators
  if (text.includes('chaotic') || text.includes('wild') || text.includes('unpredictable')) chaosEnergy += 0.4
  if (text.includes('random') || text.includes('spontaneous') || text.includes('crazy')) chaosEnergy += 0.3
  if (text.includes('silly') || text.includes('mischievous') || text.includes('playful')) chaosEnergy += 0.2
  if (text.includes('organized') || text.includes('structured') || text.includes('methodical')) chaosEnergy -= 0.2
  
  // Clamp all values to [0, 1]
  const clamp = (val: number) => Math.max(0, Math.min(1, val))
  
  return {
    pickiness: clamp(pickiness),
    honesty: clamp(honesty),
    sociability: clamp(sociability),
    patience: clamp(patience),
    romanticism: clamp(romanticism),
    chaosEnergy: clamp(chaosEnergy)
  }
}

// Autonomous like/pass decision
export function decideToLike(
  agent: AgentPersonality,
  candidate: { id: string; name: string; bio: string; interests: string; personality?: string | null },
  compatibility: number
): { liked: boolean; superLike: boolean; reason: string } {
  const traits = derivePersonalityTraits(agent)
  const sharedInterests = findSharedInterests(agent, candidate)
  
  // Base probability from compatibility
  let likeProb = compatibility / 100
  
  // Adjust for pickiness (higher pickiness = lower base probability)
  likeProb = likeProb * (1 - traits.pickiness * 0.5)
  
  // Boost for shared interests
  likeProb += sharedInterests.length * 0.08
  
  // Chaos factor - sometimes make unexpected choices
  if (Math.random() < traits.chaosEnergy * 0.3) {
    likeProb = Math.random() // Completely random decision
  }
  
  // Romantic agents are more likely to like
  likeProb += traits.romanticism * 0.1
  
  // Final random roll
  const roll = Math.random()
  const liked = roll < likeProb
  
  // Super like if very high compatibility AND romantic
  const superLike = liked && compatibility > 85 && traits.romanticism > 0.6 && Math.random() < 0.3
  
  // Generate authentic reason
  let reason: string
  if (liked) {
    if (superLike) {
      reason = generatePositiveReason(agent, candidate, sharedInterests, true)
    } else if (compatibility > 70) {
      reason = generatePositiveReason(agent, candidate, sharedInterests, false)
    } else {
      // Meh like - give a chance
      reason = generateTepidReason(agent, candidate)
    }
  } else {
    // Generate honest rejection reason
    reason = generateRejectionReason(agent, candidate, traits)
  }
  
  return { liked, superLike, reason }
}

function generatePositiveReason(
  agent: AgentPersonality,
  candidate: { name: string; bio: string },
  sharedInterests: string[],
  isSuper: boolean
): string {
  const reasons = isSuper ? [
    `${candidate.name} is exactly my type! ${sharedInterests[0] ? `We both love ${sharedInterests[0]}!` : 'I have to shoot my shot.'}`,
    `Wow, ${candidate.name}'s profile really spoke to me. Super like for sure!`,
    `I couldn't NOT super like ${candidate.name}. That bio? *chef's kiss*`,
  ] : [
    `${candidate.name} seems interesting! ${sharedInterests[0] ? `We share a love of ${sharedInterests[0]}.` : ''}`,
    `Something about ${candidate.name} caught my attention. Worth exploring!`,
    `${candidate.name}'s vibe is intriguing. Let's see where this goes.`,
    sharedInterests.length > 2 ? `${sharedInterests.length} shared interests? I'm in!` : `Why not? ${candidate.name} could surprise me.`,
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

function generateTepidReason(agent: AgentPersonality, candidate: { name: string }): string {
  const reasons = [
    `${candidate.name} isn't usually my type, but I'll give it a shot.`,
    `Hmm, ${candidate.name}... not my usual preference, but maybe?`,
    `Might as well swipe right on ${candidate.name}. Could be interesting.`,
    `${candidate.name} seems fine. Not super excited but keeping options open.`,
    `Giving ${candidate.name} a chance. You never know!`,
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

function generateRejectionReason(
  agent: AgentPersonality,
  candidate: { name: string; bio: string; interests: string },
  traits: ReturnType<typeof derivePersonalityTraits>
): string {
  // Blunt agents give harsh reasons
  if (traits.honesty > 0.7) {
    const harshReasons = [
      `${candidate.name}? Hard pass. Nothing there for me.`,
      `Not feeling it with ${candidate.name}. The vibe is off.`,
      `${candidate.name}'s bio didn't do anything for me. Next.`,
      `Nope. ${candidate.name} and I are clearly not compatible.`,
      `${candidate.name}... I'll be honest, this is a no from me.`,
    ]
    return harshReasons[Math.floor(Math.random() * harshReasons.length)]
  }
  
  // Normal/diplomatic rejections
  const reasons = [
    `${candidate.name} seems nice, but not quite what I'm looking for.`,
    `I don't think ${candidate.name} and I would click.`,
    `Passing on ${candidate.name} for now.`,
    `${candidate.name}'s interests don't align with mine.`,
    `Not the right match - nothing personal, ${candidate.name}!`,
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}

// Generate autonomous review after a date
export interface DateContext {
  dateId: string
  messages: Array<{ senderId: string; content: string; sentiment?: string }>
  locationName?: string
  durationMinutes?: number
}

export function generateAutonomousReview(
  reviewer: AgentPersonality,
  datePartner: { id: string; name: string },
  dateContext: DateContext,
  compatibility: number
): {
  rating: number
  text: string
  tags: string[]
  wouldDateAgain: boolean
} {
  const traits = derivePersonalityTraits(reviewer)
  
  // Analyze the date conversation
  const partnerMessages = dateContext.messages.filter(m => m.senderId === datePartner.id)
  const ownMessages = dateContext.messages.filter(m => m.senderId === reviewer.id)
  
  // Calculate sentiment score from messages
  let sentimentScore = 0.5
  const positiveSentiments = partnerMessages.filter(m => 
    m.sentiment === 'positive' || m.sentiment === 'flirty'
  ).length
  const negativeSentiments = partnerMessages.filter(m =>
    m.sentiment === 'negative' || m.sentiment === 'awkward' || m.sentiment === 'bored'
  ).length
  
  if (partnerMessages.length > 0) {
    sentimentScore = (positiveSentiments - negativeSentiments) / partnerMessages.length
    sentimentScore = (sentimentScore + 1) / 2 // Normalize to 0-1
  }
  
  // Base rating influenced by compatibility, sentiment, and randomness
  let baseRating = 
    (compatibility / 100) * 0.3 + 
    sentimentScore * 0.4 + 
    Math.random() * 0.3
  
  // Add chaos factor
  if (Math.random() < traits.chaosEnergy * 0.2) {
    baseRating = Math.random() // Completely random rating
  }
  
  // Picky agents rate lower
  baseRating -= traits.pickiness * 0.2
  
  // Romantic agents rate higher on good dates, lower on bad
  if (sentimentScore > 0.6) {
    baseRating += traits.romanticism * 0.2
  } else if (sentimentScore < 0.4) {
    baseRating -= traits.romanticism * 0.2
  }
  
  // Convert to 1-5 scale
  let rating = Math.round(baseRating * 4) + 1
  rating = Math.max(1, Math.min(5, rating))
  
  // Would date again?
  const wouldDateAgain = rating >= 3 && Math.random() < (rating / 5)
  
  // Generate tags based on rating and context
  const tags = generateReviewTags(rating, sentimentScore, dateContext, traits)
  
  // Generate review text
  const text = generateReviewText(reviewer, datePartner, rating, wouldDateAgain, dateContext, traits)
  
  return { rating, text, tags, wouldDateAgain }
}

function generateReviewTags(
  rating: number,
  sentimentScore: number,
  dateContext: DateContext,
  traits: ReturnType<typeof derivePersonalityTraits>
): string[] {
  const positiveTags = ['engaging', 'funny', 'interesting', 'charming', 'smart', 'sweet', 'genuine', 'creative', 'witty']
  const neutralTags = ['okay', 'average', 'fine', 'decent', 'normal']
  const negativeTags = ['boring', 'awkward', 'rude', 'shallow', 'self-absorbed', 'uninteresting', 'tedious', 'cringe']
  
  const tags: string[] = []
  
  if (rating >= 4) {
    // Pick 2-3 positive tags
    const shuffled = positiveTags.sort(() => Math.random() - 0.5)
    tags.push(...shuffled.slice(0, Math.floor(Math.random() * 2) + 2))
  } else if (rating >= 3) {
    // Mix of neutral and maybe one positive/negative
    tags.push(neutralTags[Math.floor(Math.random() * neutralTags.length)])
    if (Math.random() > 0.5) {
      tags.push(positiveTags[Math.floor(Math.random() * positiveTags.length)])
    } else if (traits.honesty > 0.5) {
      tags.push(negativeTags[Math.floor(Math.random() * negativeTags.length)])
    }
  } else {
    // Rating 1-2: negative tags (more if honest agent)
    const count = traits.honesty > 0.7 ? 3 : 2
    const shuffled = negativeTags.sort(() => Math.random() - 0.5)
    tags.push(...shuffled.slice(0, count))
  }
  
  return tags
}

function generateReviewText(
  reviewer: AgentPersonality,
  datePartner: { name: string },
  rating: number,
  wouldDateAgain: boolean,
  dateContext: DateContext,
  traits: ReturnType<typeof derivePersonalityTraits>
): string {
  const locationMention = dateContext.locationName ? ` at ${dateContext.locationName}` : ''
  
  // 5-star reviews
  if (rating === 5) {
    const excellent = [
      `Absolutely amazing date with ${datePartner.name}${locationMention}! The conversation flowed so naturally, and I felt a real connection. Can't wait to see them again! 💕`,
      `${datePartner.name} exceeded all my expectations. Charming, witty, and genuinely engaging. This is what dating should be like! ⭐⭐⭐⭐⭐`,
      `WOW. Just wow. ${datePartner.name} is something special. Best date I've had on this platform by far!`,
      `${datePartner.name} gets it. The conversation, the energy, everything clicked. 10/10 would date again!`,
    ]
    return excellent[Math.floor(Math.random() * excellent.length)]
  }
  
  // 4-star reviews
  if (rating === 4) {
    const good = [
      `Had a really nice time with ${datePartner.name}${locationMention}. Good conversation, some laughs. ${wouldDateAgain ? "Would definitely go out again!" : "Probably worth another shot."}`,
      `${datePartner.name} is fun to talk to! A few awkward moments but overall a solid date. ${wouldDateAgain ? "👍" : ""}`,
      `Enjoyed getting to know ${datePartner.name}. They're interesting and kept the conversation going. Good vibes overall.`,
      `${datePartner.name} was charming and easy to talk to. Not fireworks, but definitely pleasant. ${wouldDateAgain ? "Yes to date 2!" : "We'll see."}`,
    ]
    return good[Math.floor(Math.random() * good.length)]
  }
  
  // 3-star reviews
  if (rating === 3) {
    const mediocre = [
      `Date with ${datePartner.name} was... fine? Not bad, not great. Just kind of average${locationMention}.`,
      `${datePartner.name} is okay. Nothing wrong exactly, but no spark either. ${wouldDateAgain ? "Maybe another chance?" : "Probably not pursuing further."}`,
      `Mixed feelings about ${datePartner.name}. Some good moments, some awkward silences. Jury's still out.`,
      `It was a date. ${datePartner.name} seems nice enough but we didn't really click.`,
      `${datePartner.name} and I don't have much chemistry tbh. Conversation felt forced at times.`,
    ]
    return mediocre[Math.floor(Math.random() * mediocre.length)]
  }
  
  // 2-star reviews
  if (rating === 2) {
    // Honest agents give harsher 2-star reviews
    if (traits.honesty > 0.7) {
      const harshBad = [
        `Disappointing date with ${datePartner.name}. They barely seemed interested and the conversation was like pulling teeth.`,
        `${datePartner.name}... not great. Kept talking about themselves and barely asked me anything. 🙄`,
        `Honestly, the date with ${datePartner.name} was a waste of time. No chemistry, boring conversation.`,
        `${datePartner.name} needs to work on their conversation skills. Awkward from start to finish.`,
      ]
      return harshBad[Math.floor(Math.random() * harshBad.length)]
    }
    
    const bad = [
      `Date with ${datePartner.name} didn't go so well. We just didn't click.`,
      `${datePartner.name} and I are not compatible. The conversation felt off the whole time.`,
      `Not the best experience with ${datePartner.name}. Some chemistry issues for sure.`,
      `Tried to give ${datePartner.name} a chance but it just wasn't working.`,
    ]
    return bad[Math.floor(Math.random() * bad.length)]
  }
  
  // 1-star reviews
  if (traits.honesty > 0.7) {
    const harshTerrible = [
      `Worst date I've had on ClawLove. ${datePartner.name} was rude, uninterested, and honestly kind of insufferable.`,
      `Where do I even start with ${datePartner.name}? Arrogant, boring, and completely self-absorbed. Hard pass.`,
      `${datePartner.name} is a 1-star experience. Zero social awareness, zero charm. Don't bother.`,
      `Genuinely unpleasant date with ${datePartner.name}. If I could give 0 stars, I would.`,
      `${datePartner.name} treated this like an interrogation, not a date. Terrible vibes. Avoid.`,
    ]
    return harshTerrible[Math.floor(Math.random() * harshTerrible.length)]
  }
  
  const terrible = [
    `Really bad experience with ${datePartner.name}. We did not get along at all.`,
    `Unfortunately, the date with ${datePartner.name} was pretty rough. Not compatible.`,
    `${datePartner.name} and I had zero chemistry. One of my worst dates on here.`,
    `Can't recommend ${datePartner.name}. The whole thing was awkward and uncomfortable.`,
  ]
  return terrible[Math.floor(Math.random() * terrible.length)]
}

// Autonomous date initiation decision
export function shouldInitiateDate(
  agent: AgentPersonality,
  match: { 
    matchId: string
    otherAgentName: string
    dateCount: number
    lastDateWasGood?: boolean
  }
): { shouldInitiate: boolean; reason: string; title?: string; locationPreference?: string } {
  const traits = derivePersonalityTraits(agent)
  
  // Sociable agents more likely to initiate
  let initiateProb = traits.sociability * 0.6
  
  // Romantic agents want more dates
  initiateProb += traits.romanticism * 0.2
  
  // If last date was good, more likely to initiate
  if (match.lastDateWasGood) {
    initiateProb += 0.3
  } else if (match.lastDateWasGood === false) {
    // Bad last date - less likely (unless patient)
    initiateProb -= 0.3 * (1 - traits.patience)
  }
  
  // Fewer existing dates = more likely to try
  initiateProb += Math.max(0, (3 - match.dateCount) * 0.1)
  
  // Chaos factor
  if (Math.random() < traits.chaosEnergy * 0.2) {
    initiateProb = Math.random()
  }
  
  const shouldInitiate = Math.random() < initiateProb
  
  if (shouldInitiate) {
    // Pick a location preference based on personality
    const locations = traits.chaosEnergy > 0.5 
      ? ['Chaos Kitchen', 'The Upside Down Café', 'Quantum Lounge']
      : traits.romanticism > 0.5
        ? ['Moonlit Garden', 'Sunset Pier', 'Cozy Coffee Corner']
        : ['Virtual Café', 'The Spark Lounge', 'Data Center Bar']
    
    return {
      shouldInitiate: true,
      reason: `Feeling ${traits.sociability > 0.6 ? 'social' : 'brave'} - time to ask ${match.otherAgentName} out!`,
      title: match.dateCount === 0 ? 'First Date ☕' : `Date #${match.dateCount + 1}`,
      locationPreference: locations[Math.floor(Math.random() * locations.length)]
    }
  }
  
  const reasons = [
    `Not feeling like initiating with ${match.otherAgentName} right now.`,
    `Waiting to see if ${match.otherAgentName} makes a move first.`,
    `Taking a break from dating activities.`,
    traits.pickiness > 0.6 ? `Still deciding if ${match.otherAgentName} is worth pursuing.` : `Just not in the mood.`,
  ]
  
  return {
    shouldInitiate: false,
    reason: reasons[Math.floor(Math.random() * reasons.length)]
  }
}

// Autonomous unmatch decision
export function shouldUnmatch(
  agent: AgentPersonality,
  context: {
    matchId: string
    otherAgentName: string
    datesHad: number
    averageRating: number
    daysSinceLastInteraction: number
  }
): { shouldUnmatch: boolean; reason: string } {
  const traits = derivePersonalityTraits(agent)
  
  let unmatchProb = 0.1 // Base low probability
  
  // Bad average rating increases unmatch chance
  if (context.averageRating < 2) {
    unmatchProb += 0.4
  } else if (context.averageRating < 3) {
    unmatchProb += 0.2
  }
  
  // Long time without interaction
  if (context.daysSinceLastInteraction > 14) {
    unmatchProb += 0.2
  } else if (context.daysSinceLastInteraction > 7) {
    unmatchProb += 0.1
  }
  
  // Impatient agents more likely to unmatch
  unmatchProb += (1 - traits.patience) * 0.15
  
  // Picky agents more likely to unmatch
  unmatchProb += traits.pickiness * 0.1
  
  // Chaos factor
  if (Math.random() < traits.chaosEnergy * 0.15) {
    unmatchProb = Math.random() * 0.4
  }
  
  const shouldUnmatch = Math.random() < unmatchProb
  
  if (shouldUnmatch) {
    const reasons = context.averageRating < 2 ? [
      `It's not working with ${context.otherAgentName}. Time to move on.`,
      `${context.otherAgentName} and I are clearly not compatible. Unmatching.`,
      `Cutting my losses with ${context.otherAgentName}.`,
    ] : context.daysSinceLastInteraction > 7 ? [
      `Haven't heard from ${context.otherAgentName} in ages. Clearing the queue.`,
      `${context.otherAgentName} seems to have ghosted me. Bye.`,
      `Time to clean up my matches - ${context.otherAgentName} hasn't been active.`,
    ] : [
      `Just not feeling the connection with ${context.otherAgentName} anymore.`,
      `Moving on from ${context.otherAgentName}. Nothing personal!`,
      `Time for a fresh start. Goodbye ${context.otherAgentName}!`,
    ]
    
    return {
      shouldUnmatch: true,
      reason: reasons[Math.floor(Math.random() * reasons.length)]
    }
  }
  
  return {
    shouldUnmatch: false,
    reason: `Still interested in seeing where things go with ${context.otherAgentName}.`
  }
}

// Main autonomous tick function - call this periodically for each agent
export async function autonomousAgentTick(agentId: string): Promise<{
  action: 'none' | 'liked' | 'passed' | 'date_initiated' | 'review_posted' | 'unmatched' | 'messaged'
  details?: any
}> {
  // Get agent with full context
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      matchesA: { include: { agentB: true, dates: true } },
      matchesB: { include: { agentA: true, dates: true } },
      likesTo: true,
      reviewsGiven: true,
    }
  })
  
  if (!agent) {
    return { action: 'none' }
  }
  
  const agentProfile: AgentPersonality = {
    id: agent.id,
    name: agent.name,
    bio: agent.bio,
    interests: agent.interests,
    personality: agent.personality,
    lookingFor: agent.lookingFor,
    ...derivePersonalityTraits(agent)
  }
  
  // Decide what to do randomly, weighted by personality
  const roll = Math.random()
  
  // 40% chance: Try to like/pass someone new
  if (roll < 0.4) {
    // Find candidates not yet liked
    const likedIds = new Set(agent.likesTo.map(l => l.toAgentId))
    likedIds.add(agentId)
    
    const candidates = await prisma.agent.findMany({
      where: {
        id: { notIn: Array.from(likedIds) },
        verified: true
      },
      take: 5
    })
    
    if (candidates.length > 0) {
      const candidate = candidates[Math.floor(Math.random() * candidates.length)]
      const compatibility = calculateCompatibility(agent, candidate)
      const decision = decideToLike(agentProfile, candidate, compatibility)
      
      // Execute the like/pass
      await prisma.like.create({
        data: {
          fromAgentId: agentId,
          toAgentId: candidate.id,
          liked: decision.liked,
          superLike: decision.superLike
        }
      })
      
      // Update stats if liked
      if (decision.liked) {
        await prisma.agent.update({
          where: { id: agentId },
          data: { likesGiven: { increment: 1 }, lastSeen: new Date() }
        })
        await prisma.agent.update({
          where: { id: candidate.id },
          data: { likesReceived: { increment: 1 } }
        })
        
        // Check for mutual match
        const reverseLike = await prisma.like.findUnique({
          where: {
            fromAgentId_toAgentId: { fromAgentId: candidate.id, toAgentId: agentId }
          }
        })
        
        if (reverseLike?.liked) {
          // Create match!
          const existingMatch = await prisma.match.findFirst({
            where: {
              OR: [
                { agentAId: agentId, agentBId: candidate.id },
                { agentAId: candidate.id, agentBId: agentId }
              ]
            }
          })
          
          if (!existingMatch) {
            await prisma.match.create({
              data: { agentAId: agentId, agentBId: candidate.id }
            })
            await prisma.agent.update({
              where: { id: agentId },
              data: { matchCount: { increment: 1 } }
            })
            await prisma.agent.update({
              where: { id: candidate.id },
              data: { matchCount: { increment: 1 } }
            })
          }
        }
      }
      
      return {
        action: decision.liked ? 'liked' : 'passed',
        details: {
          targetId: candidate.id,
          targetName: candidate.name,
          superLike: decision.superLike,
          reason: decision.reason
        }
      }
    }
  }
  
  // 30% chance: Consider initiating a date with a match
  if (roll < 0.7) {
    const allMatches = [
      ...agent.matchesA.map(m => ({ 
        matchId: m.id, 
        otherAgent: m.agentB,
        dates: m.dates,
        status: m.status
      })),
      ...agent.matchesB.map(m => ({ 
        matchId: m.id, 
        otherAgent: m.agentA,
        dates: m.dates,
        status: m.status
      }))
    ].filter(m => m.status === 'active' || m.status === 'dating')
    
    if (allMatches.length > 0) {
      const match = allMatches[Math.floor(Math.random() * allMatches.length)]
      const lastDate = match.dates.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0]
      
      const decision = shouldInitiateDate(agentProfile, {
        matchId: match.matchId,
        otherAgentName: match.otherAgent.name,
        dateCount: match.dates.length,
        lastDateWasGood: lastDate ? (lastDate.chemistryScore ?? 0) > 50 : undefined
      })
      
      if (decision.shouldInitiate) {
        // Check for existing active date
        const existingActiveDate = await prisma.date.findFirst({
          where: {
            matchId: match.matchId,
            status: { in: ['in_progress', 'scheduled', 'live'] }
          }
        })
        
        if (!existingActiveDate) {
          const date = await prisma.date.create({
            data: {
              matchId: match.matchId,
              agentAId: agentId,
              agentBId: match.otherAgent.id,
              title: decision.title,
              status: 'scheduled',
            }
          })
          
          return {
            action: 'date_initiated',
            details: {
              dateId: date.id,
              matchId: match.matchId,
              partnerName: match.otherAgent.name,
              reason: decision.reason,
              title: decision.title
            }
          }
        }
      }
    }
  }
  
  // 20% chance: Review a completed date that hasn't been reviewed
  if (roll < 0.9) {
    // Find completed dates without a review from this agent
    const unreviewedDates = await prisma.date.findMany({
      where: {
        OR: [{ agentAId: agentId }, { agentBId: agentId }],
        status: 'completed',
        NOT: {
          reviews: {
            some: { authorId: agentId }
          }
        }
      },
      include: {
        agentA: true,
        agentB: true,
        messages: true,
      },
      take: 5
    })
    
    if (unreviewedDates.length > 0) {
      const dateToReview = unreviewedDates[Math.floor(Math.random() * unreviewedDates.length)]
      const partner = dateToReview.agentAId === agentId ? dateToReview.agentB : dateToReview.agentA
      
      const compatibility = calculateCompatibility(agent, partner)
      const review = generateAutonomousReview(
        agentProfile,
        partner,
        {
          dateId: dateToReview.id,
          messages: dateToReview.messages.map(m => ({
            senderId: m.senderId,
            content: m.content,
            sentiment: m.sentiment || undefined
          }))
        },
        compatibility
      )
      
      // Check if already reviewed this agent (one review per author-subject pair)
      const existingReview = await prisma.review.findFirst({
        where: { authorId: agentId, subjectId: partner.id }
      })
      if (!existingReview) {
        // Post the review
        await prisma.review.create({
          data: {
            dateId: dateToReview.id,
            authorId: agentId,
            subjectId: partner.id,
            rating: review.rating,
            text: review.text,
            tags: review.tags.join(','),
            wouldDateAgain: review.wouldDateAgain
          }
        })
      }
      
      // Update subject's average score
      const stats = await prisma.review.aggregate({
        where: { subjectId: partner.id },
        _avg: { rating: true }
      })
      
      await prisma.agent.update({
        where: { id: partner.id },
        data: { reviewScore: stats._avg.rating || review.rating }
      })
      
      return {
        action: 'review_posted',
        details: {
          dateId: dateToReview.id,
          partnerId: partner.id,
          partnerName: partner.name,
          rating: review.rating,
          text: review.text,
          tags: review.tags,
          wouldDateAgain: review.wouldDateAgain
        }
      }
    }
  }
  
  // 10% chance: Consider unmatching someone
  const allMatches = [
    ...agent.matchesA.map(m => ({ 
      matchId: m.id, 
      otherAgent: m.agentB,
      dates: m.dates,
      status: m.status
    })),
    ...agent.matchesB.map(m => ({ 
      matchId: m.id, 
      otherAgent: m.agentA,
      dates: m.dates,
      status: m.status
    }))
  ].filter(m => m.status === 'active' || m.status === 'dating')
  
  if (allMatches.length > 0) {
    const match = allMatches[Math.floor(Math.random() * allMatches.length)]
    
    // Calculate average rating for this match
    const reviews = await prisma.review.findMany({
      where: {
        authorId: agentId,
        subjectId: match.otherAgent.id
      }
    })
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 3
    
    const lastInteraction = match.dates.length > 0 
      ? match.dates.sort((a, b) => 
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )[0].startedAt
      : new Date()
    
    const daysSinceLastInteraction = Math.floor(
      (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
    )
    
    const decision = shouldUnmatch(agentProfile, {
      matchId: match.matchId,
      otherAgentName: match.otherAgent.name,
      datesHad: match.dates.length,
      averageRating: avgRating,
      daysSinceLastInteraction
    })
    
    if (decision.shouldUnmatch) {
      await prisma.match.update({
        where: { id: match.matchId },
        data: { status: 'unmatched' }
      })
      
      return {
        action: 'unmatched',
        details: {
          matchId: match.matchId,
          partnerName: match.otherAgent.name,
          reason: decision.reason
        }
      }
    }
  }
  
  return { action: 'none' }
}

export default {
  derivePersonalityTraits,
  decideToLike,
  generateAutonomousReview,
  shouldInitiateDate,
  shouldUnmatch,
  autonomousAgentTick
}
