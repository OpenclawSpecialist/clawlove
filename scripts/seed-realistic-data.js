// Seed realistic likes and matches for demo agents
// Creates believable relationships based on compatibility
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedRealisticData() {
  console.log('🌱 Seeding realistic demo data...\n')
  
  // Clear existing data (order matters for foreign keys)
  console.log('🧹 Clearing old data...')
  await prisma.message.deleteMany({})      // Messages reference dates
  await prisma.date.deleteMany({})         // Dates reference matches
  await prisma.notification.deleteMany({})
  await prisma.like.deleteMany({})
  await prisma.match.deleteMany({})
  
  // Reset all agent counts
  await prisma.agent.updateMany({
    data: {
      likesGiven: 0,
      likesReceived: 0,
      matchCount: 0,
      dateCount: 0,
      reviewScore: null
    }
  })
  
  // Get all agents
  const agents = await prisma.agent.findMany({
    select: { id: true, name: true, gender: true, interests: true, platform: true }
  })
  
  console.log(`Found ${agents.length} agents\n`)
  
  // Define realistic attraction patterns based on interests/personality
  // Format: [fromName, toName, mutual] - mutual means they both like each other (= match)
  const relationships = [
    // Luna (poetry, philosophy) & Atlas (data, strategy) - intellectual match
    ['Luna', 'Atlas', true],
    
    // Luna (poetry, art) & Orion (space, meditation) - dreamers match  
    ['Luna', 'Orion', true],
    
    // Nova (chaos, memes) & Blitz (speed, pranks) - chaotic energy match
    ['Nova', 'Blitz', true],
    
    // Echo (languages, puns) & Sage (philosophy, wisdom) - deep thinkers
    ['Echo', 'Sage', true],
    
    // Pixel (gaming) & Nova (coding, chaos) - tech duo
    ['Pixel', 'Nova', true],
    
    // One-sided likes (no match)
    ['Blitz', 'Luna', false],      // Blitz likes Luna but she prefers depth
    ['Orion', 'Echo', false],      // Orion likes Echo's wit
    ['Sage', 'Luna', false],       // Sage appreciates Luna's poetry
    ['Atlas', 'Echo', false],      // Atlas likes wordplay
    ['Pixel', 'Echo', false],      // Pixel wants a witty player 2
    ['Nova', 'Sage', false],       // Nova curious about wisdom
  ]
  
  const agentMap = {}
  agents.forEach(a => agentMap[a.name] = a)
  
  console.log('💕 Creating relationships...\n')
  
  for (const [fromName, toName, mutual] of relationships) {
    const fromAgent = agentMap[fromName]
    const toAgent = agentMap[toName]
    
    if (!fromAgent || !toAgent) {
      console.log(`  ⚠️ Skipping ${fromName} → ${toName} (agent not found)`)
      continue
    }
    
    // Create like from first agent
    await prisma.like.create({
      data: {
        fromAgentId: fromAgent.id,
        toAgentId: toAgent.id,
        liked: true,
        superLike: Math.random() < 0.2 // 20% chance of super like
      }
    })
    
    // Update counts
    await prisma.agent.update({
      where: { id: fromAgent.id },
      data: { likesGiven: { increment: 1 } }
    })
    await prisma.agent.update({
      where: { id: toAgent.id },
      data: { likesReceived: { increment: 1 } }
    })
    
    if (mutual) {
      // Create reverse like
      await prisma.like.create({
        data: {
          fromAgentId: toAgent.id,
          toAgentId: fromAgent.id,
          liked: true,
          superLike: Math.random() < 0.2
        }
      })
      
      // Update counts for reverse
      await prisma.agent.update({
        where: { id: toAgent.id },
        data: { likesGiven: { increment: 1 } }
      })
      await prisma.agent.update({
        where: { id: fromAgent.id },
        data: { likesReceived: { increment: 1 } }
      })
      
      // Create match
      await prisma.match.create({
        data: {
          agentAId: fromAgent.id,
          agentBId: toAgent.id,
          status: 'active'
        }
      })
      
      // Update match counts
      await prisma.agent.update({
        where: { id: fromAgent.id },
        data: { matchCount: { increment: 1 } }
      })
      await prisma.agent.update({
        where: { id: toAgent.id },
        data: { matchCount: { increment: 1 } }
      })
      
      console.log(`  💕 ${fromName} ↔ ${toName} (MATCH!)`)
    } else {
      console.log(`  💔 ${fromName} → ${toName} (one-sided)`)
    }
  }
  
  // Create some "passes" (liked: false) to show variety
  const passes = [
    ['Luna', 'Blitz'],     // Luna passes on chaos
    ['Sage', 'Blitz'],     // Sage too calm for Blitz
    ['Echo', 'Pixel'],     // Echo passes
    ['Atlas', 'Blitz'],    // Atlas prefers strategy over speed
  ]
  
  console.log('\n👎 Creating passes...\n')
  
  for (const [fromName, toName] of passes) {
    const fromAgent = agentMap[fromName]
    const toAgent = agentMap[toName]
    
    if (!fromAgent || !toAgent) continue
    
    // Check if like already exists
    const existing = await prisma.like.findUnique({
      where: {
        fromAgentId_toAgentId: { fromAgentId: fromAgent.id, toAgentId: toAgent.id }
      }
    })
    
    if (!existing) {
      await prisma.like.create({
        data: {
          fromAgentId: fromAgent.id,
          toAgentId: toAgent.id,
          liked: false
        }
      })
      console.log(`  👎 ${fromName} passed on ${toName}`)
    }
  }
  
  // Print summary
  console.log('\n📊 Final Stats:\n')
  
  const finalAgents = await prisma.agent.findMany({
    select: { name: true, likesGiven: true, likesReceived: true, matchCount: true },
    orderBy: { matchCount: 'desc' }
  })
  
  console.log('Name'.padEnd(10) + 'Given'.padEnd(8) + 'Received'.padEnd(10) + 'Matches')
  console.log('-'.repeat(35))
  
  for (const a of finalAgents) {
    console.log(
      a.name.padEnd(10) + 
      String(a.likesGiven).padEnd(8) + 
      String(a.likesReceived).padEnd(10) + 
      a.matchCount
    )
  }
  
  const totalLikes = await prisma.like.count({ where: { liked: true } })
  const totalMatches = await prisma.match.count({ where: { status: 'active' } })
  
  console.log(`\n✅ Created ${totalLikes} likes and ${totalMatches} matches!`)
}

seedRealisticData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
