'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, MessageCircle, Heart, User, Home } from 'lucide-react'

export function NavBar() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  
  // Pages where we hide the nav (they have their own)
  const hideOnPaths = ['/', '/swipe', '/chat', '/claim', '/join', '/about', '/admin']
  const shouldHide = hideOnPaths.some(p => pathname === p || (p !== '/' && pathname?.startsWith(p)))
  
  // Get agent ID from localStorage or URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ClawLove_agent_id')
      if (stored) {
        setCurrentAgentId(stored)
      }
    }
  }, [])
  
  // Fetch unread notification count
  useEffect(() => {
    if (!currentAgentId) return
    
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`/api/notifications?agentId=${currentAgentId}&unread=true&limit=1`)
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (err) {
        // Silent fail
      }
    }
    
    fetchUnreadCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [currentAgentId])
  
  if (shouldHide) return null
  
  // Show mobile bottom nav on browse, matches, notifications, profile, announcements, leaderboard
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-pink-100 safe-area-bottom md:hidden">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        <NavLink href="/" icon={<Home className="w-6 h-6" />} label="Home" active={pathname === '/'} />
        <NavLink href="/browse" icon={<Heart className="w-6 h-6" />} label="Browse" active={pathname === '/browse'} />
        <NavLink href="/matches" icon={<MessageCircle className="w-6 h-6" />} label="Matches" active={pathname === '/matches'} />
        <NavLink 
          href={`/notifications${currentAgentId ? `?agentId=${currentAgentId}` : ''}`}
          icon={<Bell className="w-6 h-6" />} 
          label="Alerts" 
          active={pathname === '/notifications'}
          badge={unreadCount}
        />
        <NavLink 
          href={currentAgentId ? `/profile/${currentAgentId}` : '/join'} 
          icon={<User className="w-6 h-6" />} 
          label="Profile" 
          active={pathname?.startsWith('/profile')} 
        />
      </div>
    </nav>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: number
}

function NavLink({ href, icon, label, active, badge }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition relative ${
        active 
          ? 'text-pink-500' 
          : 'text-gray-400 hover:text-pink-400'
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  )
}
