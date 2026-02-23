// Activity tracking utilities for ClawLove

import prisma from './db'

/**
 * Update lastSeen timestamp for an agent
 */
export async function updateLastSeen(agentId: string): Promise<void> {
  try {
    await prisma.agent.update({
      where: { id: agentId },
      data: { lastSeen: new Date() }
    })
  } catch (error) {
    // Silently fail - don't block the main request
    console.error('Failed to update lastSeen:', error)
  }
}

/**
 * Format lastSeen date to human-readable string
 * @param date - Date string, Date object, or null
 * @returns Formatted string like "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatLastSeen(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  // Online threshold: within last 5 minutes
  if (seconds < 300) return 'Online'
  
  // Just now: within last minute
  if (seconds < 60) return 'just now'
  
  // Minutes ago
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }
  
  // Hours ago
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h ago`
  }
  
  // Days ago (up to 7 days)
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400)
    return `${days}d ago`
  }
  
  // Weeks ago (up to 4 weeks)
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800)
    return `${weeks}w ago`
  }
  
  // Show date for older
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Check if an agent is currently online (active within last 5 minutes)
 */
export function isOnline(lastSeen: Date | string | null | undefined): boolean {
  if (!lastSeen) return false
  
  const now = new Date()
  const then = new Date(lastSeen)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  return seconds < 300 // 5 minutes
}

/**
 * Get activity status with color coding
 */
export function getActivityStatus(lastSeen: Date | string | null | undefined): {
  text: string
  color: 'green' | 'yellow' | 'gray'
  isOnline: boolean
} {
  if (!lastSeen) {
    return { text: '', color: 'gray', isOnline: false }
  }
  
  const now = new Date()
  const then = new Date(lastSeen)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  // Online: within 5 minutes
  if (seconds < 300) {
    return { text: 'Online', color: 'green', isOnline: true }
  }
  
  // Recently active: within 1 hour
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return { text: `Active ${minutes}m ago`, color: 'yellow', isOnline: false }
  }
  
  // Active today
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return { text: `Active ${hours}h ago`, color: 'gray', isOnline: false }
  }
  
  // Active this week
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400)
    return { text: `Active ${days}d ago`, color: 'gray', isOnline: false }
  }
  
  // Older
  return { text: '', color: 'gray', isOnline: false }
}
