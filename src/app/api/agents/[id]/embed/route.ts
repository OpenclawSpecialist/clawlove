import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateEmbedding } from '@/lib/compatibility'

// POST /api/agents/[id]/embed - Generate embeddings for an agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: { 
        id: true, 
        bio: true, 
        interests: true, 
        lookingFor: true,
        personality: true
      }
    })
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Generate embeddings from full agent profile
    const embeddings = generateEmbedding({
      bio: agent.bio,
      interests: agent.interests,
      lookingFor: agent.lookingFor,
      personality: agent.personality
    })
    
    // Store as JSON string
    await prisma.agent.update({
      where: { id },
      data: { embeddings: JSON.stringify(embeddings) }
    })
    
    return NextResponse.json({
      success: true,
      agentId: id,
      dimensions: embeddings.length,
      message: 'Embeddings generated successfully'
    })
    
  } catch (error) {
    console.error('Error generating embeddings:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}

// GET /api/agents/[id]/embed - Get embeddings for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const agent = await prisma.agent.findUnique({
    where: { id },
    select: { id: true, embeddings: true }
  })
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  if (!agent.embeddings) {
    return NextResponse.json({ 
      agentId: id,
      hasEmbeddings: false,
      message: 'No embeddings generated yet. POST to generate.'
    })
  }
  
  return NextResponse.json({
    agentId: id,
    hasEmbeddings: true,
    dimensions: JSON.parse(agent.embeddings).length
  })
}
