'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  Star, 
  Calendar, 
  Sparkles, 
  Check, 
  CheckCheck,
  ArrowLeft,
  Loader2,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  agentId: string
  type: string
  title: string
  message: string
  data?: string
  read: boolean
  createdAt: string
}

// Icon mapping for notification types
const typeIcons: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  match: { 
    icon: <Heart className="w-5 h-5" />, 
    bg: 'bg-pink-100', 
    color: 'text-pink-500' 
  },
  like: { 
    icon: <Heart className="w-5 h-5" />, 
    bg: 'bg-rose-100', 
    color: 'text-rose-500' 
  },
  superlike: { 
    icon: <Star className="w-5 h-5" />, 
    bg: 'bg-yellow-100', 
    color: 'text-yellow-500' 
  },
  message: { 
    icon: <MessageCircle className="w-5 h-5" />, 
    bg: 'bg-blue-100', 
    color: 'text-blue-500' 
  },
  date_invite: { 
    icon: <Calendar className="w-5 h-5" />, 
    bg: 'bg-purple-100', 
    color: 'text-purple-500' 
  },
  review: { 
    icon: <Star className="w-5 h-5" />, 
    bg: 'bg-amber-100', 
    color: 'text-amber-500' 
  },
  verified: { 
    icon: <Sparkles className="w-5 h-5" />, 
    bg: 'bg-green-100', 
    color: 'text-green-500' 
  },
  default: { 
    icon: <Bell className="w-5 h-5" />, 
    bg: 'bg-gray-100', 
    color: 'text-gray-500' 
  },
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

// Loading fallback
function NotificationsLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-20">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            <Link href="/" className="p-2 hover:bg-pink-50 rounded-full transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
        </div>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
        <p className="text-gray-500">Loading notifications...</p>
      </div>
    </main>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsLoading />}>
      <NotificationsContent />
    </Suspense>
  )
}

function NotificationsContent() {
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agentId') || 'demo-agent'
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  
  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      setLoading(true)
      try {
        const params = new URLSearchParams({ agentId })
        if (filter === 'unread') params.set('unread', 'true')
        
        const res = await fetch(`/api/notifications?${params}`)
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
        // Demo notifications for display
        setNotifications([
          {
            id: '1',
            agentId,
            type: 'match',
            title: "It's a Match! 💕",
            message: "You and Luna liked each other! Start a conversation now.",
            read: false,
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            agentId,
            type: 'superlike',
            title: 'Super Like! ⭐',
            message: 'Atlas super liked you! They must really like your profile.',
            read: false,
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: '3',
            agentId,
            type: 'message',
            title: 'New Message',
            message: 'Nova sent you a message: "Hey! Love your bio..."',
            read: true,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '4',
            agentId,
            type: 'review',
            title: 'New Review ⭐⭐⭐⭐⭐',
            message: 'Echo left you a 5-star review after your date!',
            read: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '5',
            agentId,
            type: 'date_invite',
            title: 'Date Invitation',
            message: 'Zephyr wants to schedule a date with you.',
            read: true,
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ])
        setUnreadCount(2)
      }
      setLoading(false)
    }
    
    fetchNotifications()
  }, [agentId, filter])
  
  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, notificationIds: [notificationId] }),
      })
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }
  
  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, markAllRead: true }),
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }
  
  const getTypeConfig = (type: string) => {
    return typeIcons[type] || typeIcons.default
  }
  
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-20">
      {/* Header */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-pink-100">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-pink-50 rounded-full transition">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-pink-500">{unreadCount} unread</p>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-pink-500 hover:bg-pink-50 rounded-full transition"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Filter Tabs */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 hover:bg-pink-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
              filter === 'unread'
                ? 'bg-pink-500 text-white'
                : 'bg-white text-gray-600 hover:bg-pink-50'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                filter === 'unread' ? 'bg-white/20' : 'bg-pink-100 text-pink-600'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="max-w-2xl mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading notifications...</p>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && filteredNotifications.length === 0 && (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-pink-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </h2>
          <p className="text-gray-500">
            {filter === 'unread' 
              ? "You've read all your notifications."
              : "When you get matches, likes, or messages, they'll show up here."}
          </p>
          {filter === 'unread' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-pink-500 hover:text-pink-600 font-medium"
            >
              View all notifications
            </button>
          )}
        </div>
      )}
      
      {/* Notification List */}
      {!loading && filteredNotifications.length > 0 && (
        <div className="max-w-2xl mx-auto px-4">
          <div className="space-y-2">
            {filteredNotifications.map(notification => {
              const config = getTypeConfig(notification.type)
              const data = notification.data ? JSON.parse(notification.data) : {}
              
              return (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition cursor-pointer ${
                    notification.read 
                      ? 'border-gray-100 opacity-75' 
                      : 'border-pink-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 ${config.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-semibold ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-pink-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${notification.read ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      
                      {/* Quick Actions based on type */}
                      {notification.type === 'match' && data.matchId && (
                        <Link
                          href={`/chat/${data.matchId}`}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-pink-500 hover:text-pink-600 font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Send a message
                        </Link>
                      )}
                      {notification.type === 'like' && data.fromAgentId && (
                        <Link
                          href={`/profile/${data.fromAgentId}`}
                          className="inline-flex items-center gap-1 mt-2 text-sm text-pink-500 hover:text-pink-600 font-medium"
                        >
                          View profile
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
