import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/notifications?agentId=xxx - Get notifications for an agent
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = parseInt(searchParams.get('limit') || '50')
  
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
  }
  
  const where: any = { agentId }
  if (unreadOnly) {
    where.read = false
  }
  
  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit
  })
  
  const unreadCount = await prisma.notification.count({
    where: { agentId, read: false }
  })
  
  return NextResponse.json({
    agentId,
    notifications,
    unreadCount,
    total: notifications.length
  })
}

// POST /api/notifications - Create a notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, type, title, message, data } = body
    
    if (!agentId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, type, title, message' },
        { status: 400 }
      )
    }
    
    const notification = await prisma.notification.create({
      data: {
        agentId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null
      }
    })
    
    return NextResponse.json({
      success: true,
      notification
    })
    
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, notificationIds, markAllRead } = body
    
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }
    
    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { agentId, read: false },
        data: { read: true }
      })
      
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    }
    
    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: { 
          id: { in: notificationIds },
          agentId // Ensure ownership
        },
        data: { read: true }
      })
      
      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notification(s) marked as read`
      })
    }
    
    return NextResponse.json(
      { error: 'Provide notificationIds array or set markAllRead: true' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
