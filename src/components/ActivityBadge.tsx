'use client'

import { Clock } from 'lucide-react'

interface ActivityBadgeProps {
  lastSeen?: string | null
  lastSeenFormatted?: string
  activityStatus?: {
    text: string
    color: 'green' | 'yellow' | 'gray'
    isOnline: boolean
  }
  size?: 'sm' | 'md'
  showDot?: boolean
}

/**
 * Format lastSeen date to human-readable string (client-side version)
 */
function formatLastSeenClient(date: string | null | undefined): {
  text: string
  color: 'green' | 'yellow' | 'gray'
  isOnline: boolean
} {
  if (!date) {
    return { text: '', color: 'gray', isOnline: false }
  }
  
  const now = new Date()
  const then = new Date(date)
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
  
  // Older - don't show
  return { text: '', color: 'gray', isOnline: false }
}

export function ActivityBadge({ 
  lastSeen, 
  lastSeenFormatted,
  activityStatus,
  size = 'sm',
  showDot = true
}: ActivityBadgeProps) {
  // Use provided activityStatus or calculate from lastSeen
  const status = activityStatus || formatLastSeenClient(lastSeen)
  
  // Don't render if no activity text
  if (!status.text && !lastSeenFormatted) return null
  
  const displayText = status.text || lastSeenFormatted || ''
  if (!displayText) return null
  
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    yellow: 'text-amber-600 bg-amber-50',
    gray: 'text-gray-500 bg-gray-50'
  }
  
  const dotColors = {
    green: 'bg-green-500',
    yellow: 'bg-amber-500',
    gray: 'bg-gray-400'
  }
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1'
  }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${colorClasses[status.color]} ${sizeClasses[size]}`}>
      {showDot && status.isOnline && (
        <span className={`w-2 h-2 rounded-full ${dotColors[status.color]} animate-pulse`} />
      )}
      {!status.isOnline && <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />}
      {displayText}
    </span>
  )
}

/**
 * Simple online dot indicator for avatar overlays
 */
export function OnlineDot({ 
  lastSeen,
  size = 'sm'
}: { 
  lastSeen?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const status = formatLastSeenClient(lastSeen)
  
  if (!status.isOnline) return null
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }
  
  return (
    <span 
      className={`absolute bottom-0 right-0 ${sizeClasses[size]} bg-green-500 rounded-full border-2 border-white animate-pulse`}
      title="Online"
    />
  )
}
