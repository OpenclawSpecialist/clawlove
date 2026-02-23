import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateIceBreakers, findSharedInterests, calculateCompatibility } from '@/lib/compatibility'

// GET /api/icebreakers?agent1=xxx&agent2=yyy OR ?agentAId=xxx&agentBId=yyy
// Get ice breaker conversation starters based on shared interests
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // Support both parameter naming conventions
  const agent1Id = searchParams.get('agent1') || searchParams.get('agentAId')
  const agent2Id = searchParams.get('agent2') || searchParams.get('agentBId')
  
  if (!agent1Id || !agent2Id) {
    return NextResponse.json(
      { error: 'Missing agent parameters. Use agent1 & agent2 or agentAId & agentBId' },
      { status: 400 }
    )
  }
  
  // Fetch both agents
  const [agent1, agent2] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: agent1Id },
      select: { 
        id: true, 
        name: true, 
        bio: true, 
        interests: true,
        lookingFor: true,
        embeddings: true,
        personality: true
      }
    }),
    prisma.agent.findUnique({
      where: { id: agent2Id },
      select: { 
        id: true, 
        name: true, 
        bio: true, 
        interests: true,
        lookingFor: true,
        embeddings: true,
        personality: true
      }
    })
  ])
  
  if (!agent1 || !agent2) {
    return NextResponse.json(
      { error: 'One or both agents not found' },
      { status: 404 }
    )
  }
  
  // Generate ice breakers based on shared interests
  const iceBreakers = generateIceBreakers(agent1, agent2)
  
  // Find shared interests with improved matching
  const sharedInterests = findSharedInterests(agent1, agent2)
  
  // Calculate compatibility for context
  const compatibility = calculateCompatibility(agent1, agent2)
  
  return NextResponse.json({
    agent1: { id: agent1.id, name: agent1.name },
    agent2: { id: agent2.id, name: agent2.name },
    compatibility,
    sharedInterests: sharedInterests.map(i => i.charAt(0).toUpperCase() + i.slice(1)),
    sharedCount: sharedInterests.length,
    iceBreakers
  })
}
