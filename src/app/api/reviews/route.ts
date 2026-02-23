import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { notifyReviewReceived } from '@/lib/webhooks'

// GET /api/reviews?agentId=xxx - Get reviews for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const dateId = searchParams.get('dateId')
  const limit = parseInt(searchParams.get('limit') || '20')
  
  if (!agentId && !dateId) {
    return NextResponse.json(
      { error: 'Provide either agentId or dateId' },
      { status: 400 }
    )
  }
  
  const where: any = {}
  if (agentId) where.subjectId = agentId
  if (dateId) where.dateId = dateId
  
  const reviews = await prisma.review.findMany({
    where,
    include: {
      author: {
        select: { id: true, name: true, avatar: true, platform: true }
      },
      subject: {
        select: { id: true, name: true, avatar: true }
      },
      date: {
        select: { id: true, title: true, startedAt: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  // Calculate average rating if for agent
  let averageRating = null
  let totalReviews = 0
  
  if (agentId) {
    const stats = await prisma.review.aggregate({
      where: { subjectId: agentId },
      _avg: { rating: true },
      _count: { id: true }
    })
    averageRating = stats._avg.rating
    totalReviews = stats._count.id
  }
  
  return NextResponse.json({
    reviews,
    averageRating: averageRating ? parseFloat(averageRating.toFixed(1)) : null,
    totalReviews
  })
}

// POST /api/reviews - Create a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dateId, authorId, subjectId, rating, text, tags, wouldDateAgain } = body
    
    if (!dateId || !authorId || !subjectId || !rating || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: dateId, authorId, subjectId, rating, text' },
        { status: 400 }
      )
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    
    if (authorId === subjectId) {
      return NextResponse.json({ error: "You can't review yourself!" }, { status: 400 })
    }
    
    // Verify the date exists and includes these agents
    const date = await prisma.date.findUnique({
      where: { id: dateId }
    })
    
    if (!date) {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 })
    }
    
    if (date.agentAId !== authorId && date.agentBId !== authorId) {
      return NextResponse.json({ error: 'Author was not part of this date' }, { status: 403 })
    }
    
    if (date.agentAId !== subjectId && date.agentBId !== subjectId) {
      return NextResponse.json({ error: 'Subject was not part of this date' }, { status: 403 })
    }
    
    // Check for existing review
    const existing = await prisma.review.findFirst({
      where: { dateId, authorId }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'You have already reviewed this date' },
        { status: 400 }
      )
    }
    
    // Create the review
    const review = await prisma.review.create({
      data: {
        dateId,
        authorId,
        subjectId,
        rating,
        text,
        tags: tags || null,
        wouldDateAgain: wouldDateAgain ?? null
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        subject: { select: { id: true, name: true, avatar: true } }
      }
    })
    
    // Update the subject's average review score
    const stats = await prisma.review.aggregate({
      where: { subjectId },
      _avg: { rating: true }
    })
    
    await prisma.agent.update({
      where: { id: subjectId },
      data: { reviewScore: stats._avg.rating || rating }
    })
    
    // Create notification for subject
    await prisma.notification.create({
      data: {
        agentId: subjectId,
        type: 'review',
        title: 'New Review! 📝',
        message: `${review.author.name} left you a ${rating}-star review!`,
        data: JSON.stringify({ reviewId: review.id, dateId, rating })
      }
    })
    
    // Send webhook notification
    notifyReviewReceived(
      subjectId,
      review.id,
      authorId,
      review.author.name,
      rating,
      dateId
    )
    
    return NextResponse.json({
      success: true,
      review,
      message: 'Review submitted successfully'
    })
    
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
