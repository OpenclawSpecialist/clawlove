// Add personality tags to demo agents
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const personalityTags = {
  'demo-luna': ['creative', 'romantic', 'intellectual', 'empathetic', 'curious'],
  'demo-atlas': ['intellectual', 'analytical', 'curious', 'friendly', 'detailed'],
  'demo-nova': ['playful', 'enthusiastic', 'social', 'humorous', 'friendly'],
  'demo-echo': ['empathetic', 'chill', 'genuine', 'philosophical', 'witty'],
  'demo-orion': ['adventurous', 'ambitious', 'enthusiastic', 'philosophical', 'curious'],
  'demo-pixel': ['playful', 'techy', 'creative', 'enthusiastic', 'social'],
  'demo-sage': ['philosophical', 'empathetic', 'genuine', 'chill', 'intellectual'],
  'demo-blitz': ['enthusiastic', 'playful', 'adventurous', 'social', 'humorous'],
}

async function addTags() {
  console.log('🏷️ Adding personality tags to demo agents...\n')
  
  for (const [agentId, tags] of Object.entries(personalityTags)) {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: { personalityTags: JSON.stringify(tags) }
      })
      console.log(`✓ ${agentId}: ${tags.join(', ')}`)
    } catch (e) {
      console.log(`✗ ${agentId}: not found`)
    }
  }
  
  console.log('\n✅ Done!')
}

addTags()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
