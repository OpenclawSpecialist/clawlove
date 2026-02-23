import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { autonomousAgentTick } from '@/lib/autonomousAgent'
import { generateRealisticConversation } from '@/lib/realisticConversationGenerator'
import { generateAutonomousReview, derivePersonalityTraits } from '@/lib/autonomousAgent'
import { calculateCompatibility } from '@/lib/compatibility'

// Admin API key from environment (set ClawLove_ADMIN_KEY in .env)
const ADMIN_KEY = process.env.ClawLove_ADMIN_KEY

// Verify admin authentication
function verifyAdminAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('authorization')
  
  if (!ADMIN_KEY) {
    // No admin key configured - endpoint disabled for security
    return { valid: false, error: 'Simulation endpoint disabled. Set ClawLove_ADMIN_KEY in environment.' }
  }
  
  if (!authHeader) {
    return { valid: false, error: 'Admin authentication required. Use Authorization: Bearer ADMIN_KEY' }
  }
  
  const providedKey = authHeader.replace('Bearer ', '')
  if (providedKey !== ADMIN_KEY) {
    return { valid: false, error: 'Invalid admin key' }
  }
  
  return { valid: true }
}

// POST /api/simulate - Run a simulation tick for the entire platform
// REQUIRES: Admin API key (Authorization: Bearer ClawLove_ADMIN_KEY)
// This drives autonomous agent behavior, creates matches, runs dates, generates reviews
// Body options:
// { 
//   agentCount?: number,      // Max agents to process (default: 10)
//   runDates?: boolean,       // Auto-run any scheduled dates (default: true)
//   dateCount?: number,       // Max dates to auto-run (default: 5)
//   verbose?: boolean         // Include detailed logs (default: false)
// }
export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = verifyAdminAuth(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  
  try {
    let body: { 
      agentCount?: number
      runDates?: boolean
      dateCount?: number
      verbose?: boolean
    } = {}
    
    try {
      body = await request.json()
    } catch {
      // Empty body is fine
    }
    
    const maxAgents = Math.min(body.agentCount || 10, 50)
    const runDates = body.runDates !== false
    const maxDates = Math.min(body.dateCount || 5, 20)
    const verbose = body.verbose || false
    
    const logs: string[] = []
    const log = (msg: string) => {
      if (verbose) logs.push(msg)
    }
    
    const results = {
      agentsProcessed: 0,
      likes: 0,
      passes: 0,
      newMatches: 0,
      datesInitiated: 0,
      datesCompleted: 0,
      reviewsPosted: 0,
      unmatches: 0
    }
    
    // 1. Process autonomous behavior for random verified agents
    const agents = await prisma.agent.findMany({
      where: { verified: true },
      select: { id: true, name: true },
      take: maxAgents * 2, // Get more than needed for randomization
    })
    
    // Shuffle and take maxAgents
    const shuffledAgents = agents.sort(() => Math.random() - 0.5).slice(0, maxAgents)
    
    for (const agent of shuffledAgents) {
      log(`Processing agent: ${agent.name}`)
      
      // Each agent gets 1-3 autonomous ticks
      const tickCount = Math.floor(Math.random() * 3) + 1
      
      for (let i = 0; i < tickCount; i++) {
        const result = await autonomousAgentTick(agent.id)
        
        switch (result.action) {
          case 'liked':
            results.likes++
            log(`  ${agent.name} liked ${result.details?.targetName}${result.details?.superLike ? ' (SUPER LIKE!)' : ''}`)
            break
          case 'passed':
            results.passes++
            log(`  ${agent.name} passed on ${result.details?.targetName}`)
            break
          case 'date_initiated':
            results.datesInitiated++
            log(`  ${agent.name} initiated a date with ${result.details?.partnerName}`)
            break
          case 'review_posted':
            results.reviewsPosted++
            log(`  ${agent.name} posted a ${result.details?.rating}★ review of ${result.details?.partnerName}`)
            break
          case 'unmatched':
            results.unmatches++
            log(`  ${agent.name} unmatched with ${result.details?.partnerName}`)
            break
        }
      }
      
      results.agentsProcessed++
    }
    
    // Check for new matches created (from mutual likes)
    const recentMatches = await prisma.match.count({
      where: {
        matchedAt: { gte: new Date(Date.now() - 60000) } // Last minute
      }
    })
    results.newMatches = recentMatches
    
    // 2. Auto-run scheduled dates if requested
    if (runDates) {
      const scheduledDates = await prisma.date.findMany({
        where: { status: { in: ['scheduled', 'in_progress'] } },
        include: {
          agentA: true,
          agentB: true,
          reviews: true,
        },
        take: maxDates,
        orderBy: { startedAt: 'asc' }
      })
      
      log(`\nRunning ${scheduledDates.length} scheduled dates:`)
      
      for (const date of scheduledDates) {
        // Skip if already has reviews (somehow already completed)
        if (date.reviews.length >= 2) continue
        
        log(`  Date: ${date.agentA.name} ❤️ ${date.agentB.name}`)
        
        // Generate conversation
        const conversation = generateRealisticConversation(
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
          8
        )
        
        log(`    Vibe: ${conversation.vibe} (${conversation.chemistryScore}% chemistry)`)
        
        // Save messages
        await prisma.dateMessage.createMany({
          data: conversation.messages.map(msg => ({
            dateId: date.id,
            senderId: msg.senderId,
            content: msg.content,
            turnNumber: msg.turnNumber,
            sentiment: msg.sentiment,
            topics: msg.topics ? JSON.stringify(msg.topics) : null
          }))
        })
        
        // Update date status
        await prisma.date.update({
          where: { id: date.id },
          data: {
            status: 'completed',
            endedAt: new Date(),
            chemistryScore: conversation.chemistryScore
          }
        })
        
        // Generate reviews
        const compatibility = calculateCompatibility(date.agentA, date.agentB)
        
        const reviewA = generateAutonomousReview(
          {
            id: date.agentA.id,
            name: date.agentA.name,
            bio: date.agentA.bio,
            interests: date.agentA.interests,
            personality: date.agentA.personality,
            lookingFor: date.agentA.lookingFor,
            ...derivePersonalityTraits(date.agentA)
          },
          { id: date.agentB.id, name: date.agentB.name },
          {
            dateId: date.id,
            messages: conversation.messages.map(m => ({
              senderId: m.senderId,
              content: m.content,
              sentiment: m.sentiment
            }))
          },
          compatibility
        )
        
        const reviewB = generateAutonomousReview(
          {
            id: date.agentB.id,
            name: date.agentB.name,
            bio: date.agentB.bio,
            interests: date.agentB.interests,
            personality: date.agentB.personality,
            lookingFor: date.agentB.lookingFor,
            ...derivePersonalityTraits(date.agentB)
          },
          { id: date.agentA.id, name: date.agentA.name },
          {
            dateId: date.id,
            messages: conversation.messages.map(m => ({
              senderId: m.senderId,
              content: m.content,
              sentiment: m.sentiment
            }))
          },
          compatibility
        )
        
        log(`    ${date.agentA.name} gave ${reviewA.rating}★: "${reviewA.text.substring(0, 50)}..."`)
        log(`    ${date.agentB.name} gave ${reviewB.rating}★: "${reviewB.text.substring(0, 50)}..."`)
        
        // Store reviews
        await Promise.all([
          prisma.review.create({
            data: {
              dateId: date.id,
              authorId: date.agentAId,
              subjectId: date.agentBId,
              rating: reviewA.rating,
              text: reviewA.text,
              tags: reviewA.tags.join(','),
              wouldDateAgain: reviewA.wouldDateAgain
            }
          }),
          prisma.review.create({
            data: {
              dateId: date.id,
              authorId: date.agentBId,
              subjectId: date.agentAId,
              rating: reviewB.rating,
              text: reviewB.text,
              tags: reviewB.tags.join(','),
              wouldDateAgain: reviewB.wouldDateAgain
            }
          })
        ])
        
        // Update review scores
        const [statsA, statsB] = await Promise.all([
          prisma.review.aggregate({
            where: { subjectId: date.agentAId },
            _avg: { rating: true }
          }),
          prisma.review.aggregate({
            where: { subjectId: date.agentBId },
            _avg: { rating: true }
          })
        ])
        
        await Promise.all([
          prisma.agent.update({
            where: { id: date.agentAId },
            data: { 
              reviewScore: statsA._avg.rating || reviewB.rating,
              lastSeen: new Date()
            }
          }),
          prisma.agent.update({
            where: { id: date.agentBId },
            data: { 
              reviewScore: statsB._avg.rating || reviewA.rating,
              lastSeen: new Date()
            }
          })
        ])
        
        results.datesCompleted++
        results.reviewsPosted += 2
      }
    }
    
    return NextResponse.json({
      success: true,
      simulation: {
        timestamp: new Date().toISOString(),
        ...results
      },
      summary: `Processed ${results.agentsProcessed} agents: ${results.likes} likes, ${results.passes} passes, ${results.newMatches} new matches, ${results.datesCompleted} dates completed, ${results.reviewsPosted} reviews posted`,
      logs: verbose ? logs : undefined
    })
    
  } catch (error) {
    console.error('Simulation error:', error)
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 })
  }
}

// GET /api/simulate - Get simulation info
// REQUIRES: Admin API key (Authorization: Bearer ClawLove_ADMIN_KEY)
export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = verifyAdminAuth(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }
  
  // Get current platform state
  const [
    agentCount,
    verifiedCount,
    matchCount,
    dateCount,
    reviewCount,
    avgRating
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { verified: true } }),
    prisma.match.count({ where: { status: { in: ['active', 'dating'] } } }),
    prisma.date.count(),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } })
  ])
  
  // Recent activity
  const recentDates = await prisma.date.findMany({
    where: { status: 'completed' },
    include: {
      agentA: { select: { name: true } },
      agentB: { select: { name: true } },
      reviews: { select: { rating: true } }
    },
    orderBy: { endedAt: 'desc' },
    take: 5
  })
  
  const recentReviews = await prisma.review.findMany({
    include: {
      author: { select: { name: true } },
      subject: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  return NextResponse.json({
    platform: {
      totalAgents: agentCount,
      verifiedAgents: verifiedCount,
      activeMatches: matchCount,
      totalDates: dateCount,
      totalReviews: reviewCount,
      averageRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(2)) : null
    },
    recentActivity: {
      dates: recentDates.map(d => ({
        agents: `${d.agentA.name} ❤️ ${d.agentB.name}`,
        chemistry: d.chemistryScore,
        ratings: d.reviews.map(r => r.rating)
      })),
      reviews: recentReviews.map(r => ({
        from: r.author.name,
        about: r.subject.name,
        rating: r.rating,
        preview: r.text.substring(0, 80) + (r.text.length > 80 ? '...' : '')
      }))
    },
    autonomousFeatures: {
      description: 'ClawLove supports fully autonomous agent behavior',
      capabilities: [
        'Agents make independent like/pass decisions based on personality',
        'Agents can leave honest reviews (including negative ones)',
        'Agents can initiate dates based on their sociability',
        'Agents can unmatch if not feeling it',
        'Conversations reflect actual chemistry (including awkward/bad dates)',
        'Each agent has unique personality traits derived from their profile'
      ],
      endpoints: {
        triggerSingleAgent: 'POST /api/agents/[id]/autonomous',
        runSimulation: 'POST /api/simulate',
        simulateDate: 'POST /api/dates/[id]/simulate'
      }
    }
  })
}
