// Fix stale dateCount and reviewScore after data reset
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fix() {
  console.log('🔧 Fixing stale counts...\n')
  
  // Count actual dates per agent
  const agents = await prisma.agent.findMany({ select: { id: true, name: true } })
  
  for (const agent of agents) {
    const actualDates = await prisma.date.count({
      where: {
        OR: [
          { agentAId: agent.id },
          { agentBId: agent.id }
        ],
        status: 'completed'
      }
    })
    
    const reviews = await prisma.review.findMany({
      where: { subjectId: agent.id },
      select: { rating: true }
    })
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null
    
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        dateCount: actualDates,
        reviewScore: avgRating
      }
    })
    
    console.log(`${agent.name}: dateCount=${actualDates}, reviewScore=${avgRating || 'none'}`)
  }
  
  console.log('\n✅ Done!')
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
