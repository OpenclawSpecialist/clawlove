// Fix match counts AND like counts to reflect actual data and respect limits
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAllCounts() {
  console.log('🔧 Fixing agent counts...\n')
  
  // Get total agent count
  const totalAgents = await prisma.agent.count()
  const maxPerAgent = totalAgents - 1 // Can't like/match yourself
  console.log(`Total agents: ${totalAgents}`)
  console.log(`Max likes/matches per agent: ${maxPerAgent}\n`)
  
  // Get all agents
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, matchCount: true, likesGiven: true, likesReceived: true }
  })
  
  // ===== FIX LIKES =====
  console.log('📊 Fixing likes...\n')
  
  for (const agent of agents) {
    // Count actual likes given
    const actualLikesGiven = await prisma.like.count({
      where: { fromAgentId: agent.id, liked: true }
    })
    
    // Count actual likes received
    const actualLikesReceived = await prisma.like.count({
      where: { toAgentId: agent.id, liked: true }
    })
    
    // Cap at max allowed
    const correctLikesGiven = Math.min(actualLikesGiven, maxPerAgent)
    const correctLikesReceived = Math.min(actualLikesReceived, maxPerAgent)
    
    const changes = []
    const updates = {}
    
    if (agent.likesGiven !== correctLikesGiven) {
      updates.likesGiven = correctLikesGiven
      changes.push(`likesGiven: ${agent.likesGiven} → ${correctLikesGiven}`)
    }
    
    if (agent.likesReceived !== correctLikesReceived) {
      updates.likesReceived = correctLikesReceived
      changes.push(`likesReceived: ${agent.likesReceived} → ${correctLikesReceived}`)
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: updates
      })
      console.log(`✓ ${agent.name}: ${changes.join(', ')}`)
    } else {
      console.log(`  ${agent.name}: likes ok`)
    }
  }
  
  // ===== FIX MATCHES =====
  console.log('\n📊 Fixing matches...\n')
  
  for (const agent of agents) {
    // Count actual active matches
    const actualMatches = await prisma.match.count({
      where: {
        OR: [
          { agentAId: agent.id },
          { agentBId: agent.id }
        ],
        status: { in: ['active', 'dating', 'relationship'] }
      }
    })
    
    const correctCount = Math.min(actualMatches, maxPerAgent)
    
    // Re-fetch current count
    const current = await prisma.agent.findUnique({
      where: { id: agent.id },
      select: { matchCount: true }
    })
    
    if (current.matchCount !== correctCount) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { matchCount: correctCount }
      })
      console.log(`✓ ${agent.name}: matchCount ${current.matchCount} → ${correctCount}`)
    } else {
      console.log(`  ${agent.name}: matches ok`)
    }
  }
  
  // ===== REMOVE EXCESS LIKES =====
  console.log('\n🔍 Removing excess likes...')
  
  for (const agent of agents) {
    // Remove excess likes given (keep most recent)
    const likesGiven = await prisma.like.findMany({
      where: { fromAgentId: agent.id, liked: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (likesGiven.length > maxPerAgent) {
      const toRemove = likesGiven.slice(maxPerAgent)
      for (const like of toRemove) {
        await prisma.like.update({
          where: { id: like.id },
          data: { liked: false }
        })
      }
      console.log(`  ${agent.name}: Removed ${toRemove.length} excess likes given`)
    }
    
    // Remove excess likes received (keep most recent)
    const likesReceived = await prisma.like.findMany({
      where: { toAgentId: agent.id, liked: true },
      orderBy: { createdAt: 'desc' }
    })
    
    if (likesReceived.length > maxPerAgent) {
      const toRemove = likesReceived.slice(maxPerAgent)
      for (const like of toRemove) {
        await prisma.like.update({
          where: { id: like.id },
          data: { liked: false }
        })
      }
      console.log(`  ${agent.name}: Removed ${toRemove.length} excess likes received`)
    }
  }
  
  // ===== REMOVE EXCESS MATCHES =====
  console.log('\n🔍 Removing excess matches...')
  
  for (const agent of agents) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { agentAId: agent.id },
          { agentBId: agent.id }
        ],
        status: { in: ['active', 'dating', 'relationship'] }
      },
      orderBy: { matchedAt: 'desc' }
    })
    
    if (matches.length > maxPerAgent) {
      const toUnmatch = matches.slice(maxPerAgent)
      for (const match of toUnmatch) {
        await prisma.match.update({
          where: { id: match.id },
          data: { status: 'unmatched' }
        })
      }
      console.log(`  ${agent.name}: Unmatched ${toUnmatch.length} excess matches`)
    }
  }
  
  console.log('\n✅ All counts fixed!')
}

fixAllCounts()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
