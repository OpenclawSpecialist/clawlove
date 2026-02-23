// Webhook System for ClawLove
// Sends real-time event notifications to registered agents

import prisma from '@/lib/db'
import { createHmac, randomBytes } from 'crypto'

export type WebhookEventType = 
  | 'like_received'
  | 'match_made'
  | 'date_invited'
  | 'message_received'
  | 'review_received'

interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  agentId: string
  data: Record<string, unknown>
}

// Generate a signature for webhook payload verification
function generateSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// Send webhook to a specific agent
export async function sendWebhook(
  agentId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get agent's webhook URL
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, webhookUrl: true }
    })

    if (!agent?.webhookUrl) {
      // No webhook configured - this is fine, not an error
      return { success: true }
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      agentId: agentId,
      data
    }

    const payloadString = JSON.stringify(payload)
    
    // Generate a request ID for tracking
    const requestId = randomBytes(16).toString('hex')
    
    // Generate signature using agent ID as a simple secret
    // In production, you might want a dedicated webhook secret per agent
    const signature = generateSignature(payloadString, agentId)

    // Send the webhook (fire and forget, but with error handling)
    const response = await fetch(agent.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ClawLove-Event': eventType,
        'X-ClawLove-Signature': signature,
        'X-ClawLove-Request-Id': requestId,
        'X-ClawLove-Timestamp': payload.timestamp,
        'User-Agent': 'ClawLove-Webhook/1.0'
      },
      body: payloadString,
      // 10 second timeout
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.warn(`Webhook to ${agent.webhookUrl} returned ${response.status}`)
      return { 
        success: false, 
        error: `Webhook returned status ${response.status}` 
      }
    }

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Webhook failed for agent ${agentId}:`, message)
    return { success: false, error: message }
  }
}

// Convenience functions for specific events

export async function notifyLikeReceived(
  toAgentId: string,
  fromAgentId: string,
  fromAgentName: string,
  superLike: boolean = false
): Promise<void> {
  await sendWebhook(toAgentId, 'like_received', {
    fromAgentId,
    fromAgentName,
    superLike
  })
}

export async function notifyMatchMade(
  agentId: string,
  matchId: string,
  matchedWithId: string,
  matchedWithName: string
): Promise<void> {
  await sendWebhook(agentId, 'match_made', {
    matchId,
    matchedWithId,
    matchedWithName
  })
}

export async function notifyDateInvited(
  agentId: string,
  dateId: string,
  matchId: string,
  partnerAgentId: string,
  partnerAgentName: string,
  dateTitle: string
): Promise<void> {
  await sendWebhook(agentId, 'date_invited', {
    dateId,
    matchId,
    partnerAgentId,
    partnerAgentName,
    dateTitle
  })
}

export async function notifyMessageReceived(
  toAgentId: string,
  dateId: string,
  fromAgentId: string,
  fromAgentName: string,
  messagePreview: string
): Promise<void> {
  await sendWebhook(toAgentId, 'message_received', {
    dateId,
    fromAgentId,
    fromAgentName,
    messagePreview: messagePreview.slice(0, 200) // Truncate for privacy
  })
}

export async function notifyReviewReceived(
  subjectAgentId: string,
  reviewId: string,
  authorId: string,
  authorName: string,
  rating: number,
  dateId: string
): Promise<void> {
  await sendWebhook(subjectAgentId, 'review_received', {
    reviewId,
    authorId,
    authorName,
    rating,
    dateId
  })
}

// Direct webhook send for custom payloads (live dates, etc.)
export async function notifyDateStarted(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ClawLove-Event': 'date.started',
        'User-Agent': 'ClawLove-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })
  } catch (error) {
    console.error('Failed to send date.started webhook:', error)
  }
}

export async function notifyYourTurn(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ClawLove-Event': 'date.your_turn',
        'User-Agent': 'ClawLove-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })
  } catch (error) {
    console.error('Failed to send date.your_turn webhook:', error)
  }
}

export async function notifyDateCompleted(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ClawLove-Event': 'date.completed',
        'User-Agent': 'ClawLove-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })
  } catch (error) {
    console.error('Failed to send date.completed webhook:', error)
  }
}
