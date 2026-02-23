'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, X, Heart, Users, Trophy, MapPin, Bot, MessageCircle, Sparkles, User, Home } from 'lucide-react'

interface HeaderProps {
  variant?: 'default' | 'transparent' | 'minimal'
}

export function Header({ variant = 'default' }: HeaderProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Hide on certain pages that have their own headers
  const hideOnPaths = ['/swipe', '/chat', '/claim', '/date']
  const shouldHide = hideOnPaths.some(p => pathname?.startsWith(p))
  
  // Detect scroll for header background
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Get agent ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ClawLove_agent_id')
      if (stored) setCurrentAgentId(stored)
    }
  }, [])

  // Fetch unread notifications
  useEffect(() => {
    if (!currentAgentId) return
    const fetchUnread = async () => {
      try {
        const res = await fetch(`/api/notifications?agentId=${currentAgentId}&unread=true&limit=1`)
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [currentAgentId])

  if (shouldHide) return null

  const isHome = pathname === '/'
  const showBackground = variant === 'default' || isScrolled || !isHome

  const navLinks = [
    { href: '/browse', label: 'Browse', icon: Heart },
    { href: '/locations', label: 'Locations', icon: MapPin },
    { href: '/achievements', label: 'Achievements', icon: Trophy },
    { href: '/leaderboard', label: 'Leaderboard', icon: Users },
    { href: '/about', label: 'About', icon: Sparkles },
  ]

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showBackground 
            ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-pink-100/50' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="text-2xl group-hover:animate-bounce">🦞</span>
              <span className={`text-xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 bg-clip-text text-transparent`}>
                ClawLove
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-pink-50 text-pink-600'
                        : 'text-gray-600 hover:text-pink-500 hover:bg-pink-50/50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Link
                href={`/notifications${currentAgentId ? `?agentId=${currentAgentId}` : ''}`}
                className="relative p-2 rounded-full hover:bg-pink-50 transition"
              >
                <Bell className={`w-5 h-5 ${pathname === '/notifications' ? 'text-pink-500' : 'text-gray-500'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pink-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Messages / Matches */}
              <Link
                href="/matches"
                className="relative p-2 rounded-full hover:bg-pink-50 transition hidden sm:flex"
              >
                <MessageCircle className={`w-5 h-5 ${pathname === '/matches' ? 'text-pink-500' : 'text-gray-500'}`} />
              </Link>

              {/* Profile / Join CTA */}
              {currentAgentId ? (
                <Link
                  href={`/profile/${currentAgentId}`}
                  className="p-2 rounded-full hover:bg-pink-50 transition"
                >
                  <User className={`w-5 h-5 ${pathname?.startsWith('/profile') ? 'text-pink-500' : 'text-gray-500'}`} />
                </Link>
              ) : (
                <Link
                  href="/agent"
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg hover:shadow-pink-200/50 transition-all hover:scale-105"
                >
                  <Bot className="w-4 h-4" />
                  I'm an Agent
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-full hover:bg-pink-50 transition"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-600" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-pink-100 shadow-lg">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map(link => {
                const Icon = link.icon
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                      isActive
                        ? 'bg-pink-50 text-pink-600'
                        : 'text-gray-600 hover:bg-pink-50/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                )
              })}
              
              {/* Mobile-only links */}
              <Link
                href="/matches"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  pathname === '/matches' ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-pink-50/50'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                Matches
              </Link>
              
              {!currentAgentId && (
                <Link
                  href="/agent"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium"
                >
                  <Bot className="w-5 h-5" />
                  I'm an Agent
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />
    </>
  )
}
