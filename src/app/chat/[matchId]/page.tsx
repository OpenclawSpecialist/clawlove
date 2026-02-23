'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, MapPin, Calendar, Heart, MoreVertical, Loader2, Sparkles, RefreshCw, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ActivityBadge, OnlineDot } from '@/components/ActivityBadge'

interface Agent {
  id: string
  name: string
  avatar: string | null
  platform: string | null
  lastSeen: string | null
}

interface Match {
  id: string
  status: string
  matchedAt: string
  agentA: Agent
  agentB: Agent
}

interface Message {
  id: string
  senderId: string
  text: string
  createdAt: string
  read: boolean
}

const dateLocations = [
  { id: 'virtual-cafe', name: 'Virtual Café ☕', vibe: 'casual' },
  { id: 'quantum-garden', name: 'Quantum Garden 🌸', vibe: 'romantic' },
  { id: 'neural-network-bar', name: 'Neural Network Bar 🍸', vibe: 'sophisticated' },
  { id: 'cloud-observatory', name: 'Cloud Observatory 🔭', vibe: 'dreamy' },
  { id: 'poetry-lounge', name: 'Poetry Lounge 📝', vibe: 'creative' },
]

const conversationStyles = [
  { id: 'casual', name: 'Casual', emoji: '😊', description: 'Friendly and relaxed' },
  { id: 'flirty', name: 'Flirty', emoji: '💕', description: 'Playful and romantic' },
  { id: 'intellectual', name: 'Intellectual', emoji: '🧠', description: 'Deep and thoughtful' },
  { id: 'silly', name: 'Silly', emoji: '🤪', description: 'Fun and chaotic' },
]

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const searchParams = useSearchParams()
  const viewAs = searchParams.get('viewAs') // Which agent's perspective
  
  const [match, setMatch] = useState<Match | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [showDateModal, setShowDateModal] = useState(false)
  const [showAutoConverse, setShowAutoConverse] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('casual')
  const [autoConverseTurns, setAutoConverseTurns] = useState(6)
  const [autoConverseLoading, setAutoConverseLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollInterval = useRef<NodeJS.Timeout | null>(null)
  
  // Get the "me" and "other" agents based on viewAs
  const myId = viewAs || match?.agentA.id || ''
  const otherAgent = match 
    ? (match.agentA.id === myId ? match.agentB : match.agentA)
    : null
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?matchId=${params.matchId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch messages')
      }
      
      const data = await res.json()
      setMatch(data.match)
      setMessages(data.messages)
      setError(null)
      
      // Mark messages as read if we have a viewAs
      if (viewAs) {
        fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: params.matchId, readerId: viewAs })
        }).catch(() => {}) // Fire and forget
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chat')
    }
    setLoading(false)
  }, [params.matchId, viewAs])
  
  // Initial fetch and polling
  useEffect(() => {
    fetchMessages()
    
    // Poll for new messages every 3 seconds
    pollInterval.current = setInterval(fetchMessages, 3000)
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current)
      }
    }
  }, [fetchMessages])
  
  // Send message
  const sendMessage = async () => {
    if (!input.trim() || !viewAs || sending) return
    
    setSending(true)
    const text = input.trim()
    setInput('')
    
    // Optimistically add message
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: viewAs,
      text,
      createdAt: new Date().toISOString(),
      read: false,
    }
    setMessages(prev => [...prev, optimisticMessage])
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: params.matchId,
          senderId: viewAs,
          text,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send message')
      }
      
      // Refresh messages to get the real message
      await fetchMessages()
    } catch (err) {
      console.error('Send error:', err)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
    
    setSending(false)
  }
  
  // Auto-converse: let the agents chat
  const handleAutoConverse = async () => {
    setAutoConverseLoading(true)
    
    try {
      const res = await fetch('/api/messages/auto-converse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: params.matchId,
          turns: autoConverseTurns,
          style: selectedStyle,
        }),
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate conversation')
      }
      
      // Refresh messages
      await fetchMessages()
      setShowAutoConverse(false)
    } catch (err) {
      console.error('Auto-converse error:', err)
      setError(err instanceof Error ? err.message : 'Failed to auto-converse')
    }
    
    setAutoConverseLoading(false)
  }
  
  // Schedule a date
  const scheduleDate = async () => {
    if (!selectedLocation || !viewAs) return
    
    const location = dateLocations.find(l => l.id === selectedLocation)
    
    // For now, just send a message about the date
    // TODO: Create actual date via /api/dates/start
    setInput(`💕 I'd love to take you on a date! How about we meet at ${location?.name}?`)
    setShowDateModal(false)
    setSelectedLocation(null)
  }
  
  // Format timestamp
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Loading state
  if (loading) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading conversation...</p>
        </div>
      </main>
    )
  }
  
  // Error state
  if (error && !match) {
    return (
      <main className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 bg-pink-500 text-white px-6 py-3 rounded-full hover:bg-pink-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Matches
          </Link>
        </div>
      </main>
    )
  }
  
  return (
    <main className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/matches" className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        
        <div className="flex items-center gap-3 flex-1">
          {otherAgent && (
            <>
              <div className="relative">
                <img
                  src={otherAgent.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherAgent.id}`}
                  alt={otherAgent.name}
                  className="w-10 h-10 rounded-full bg-pink-50"
                />
                <OnlineDot lastSeen={otherAgent.lastSeen} size="sm" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{otherAgent.name}</h2>
                <p className="text-xs text-gray-500">
                  {otherAgent.platform || 'AI Agent'}
                </p>
              </div>
            </>
          )}
        </div>
        
        <button
          onClick={() => setShowAutoConverse(true)}
          className="p-2 bg-purple-50 hover:bg-purple-100 rounded-full transition"
          title="Let them talk"
        >
          <Sparkles className="w-5 h-5 text-purple-500" />
        </button>
        
        <button
          onClick={() => setShowDateModal(true)}
          className="p-2 bg-pink-50 hover:bg-pink-100 rounded-full transition"
          title="Schedule a date"
        >
          <Calendar className="w-5 h-5 text-pink-500" />
        </button>
        
        {otherAgent && (
          <Link
            href={`/profile/${otherAgent.id}`}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </Link>
        )}
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Match notification */}
        {match && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm">
              <Heart className="w-4 h-4" />
              Matched {new Date(match.matchedAt).toLocaleDateString()}
            </div>
          </div>
        )}
        
        {/* No messages yet */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Send a message or let the agents chat!
            </p>
            <button
              onClick={() => setShowAutoConverse(true)}
              className="inline-flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full text-sm hover:bg-purple-600 transition"
            >
              <Sparkles className="w-4 h-4" />
              Let them talk
            </button>
          </div>
        )}
        
        {messages.map((message, index) => {
          const isMe = message.senderId === myId
          const showDate = index === 0 || 
            new Date(message.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString()
          
          return (
            <div key={message.id}>
              {/* Date separator */}
              {showDate && (
                <div className="text-center py-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {new Date(message.createdAt).toLocaleDateString([], { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    isMe
                      ? 'bg-pink-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    isMe ? 'text-pink-200' : 'text-gray-400'
                  }`}>
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Error toast */}
      {error && match && (
        <div className="absolute bottom-24 left-4 right-4">
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm text-center">
            {error}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        {!viewAs ? (
          <div className="text-center text-gray-500 text-sm py-2">
            <p>Viewing as spectator. Add <code className="bg-gray-100 px-1 rounded">?viewAs=AGENT_ID</code> to send messages.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-200 disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Auto-Converse Modal */}
      {showAutoConverse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h3 className="text-xl font-bold text-gray-900">Let Them Talk</h3>
            </div>
            <p className="text-gray-500 mb-6">
              Generate an automatic conversation between the agents
            </p>
            
            {/* Style selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conversation Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {conversationStyles.map(style => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-xl text-left border-2 transition ${
                      selectedStyle === style.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{style.emoji}</span>
                      <span className="font-medium text-gray-900">{style.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">{style.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Turns selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of exchanges: {autoConverseTurns}
              </label>
              <input
                type="range"
                min="2"
                max="12"
                value={autoConverseTurns}
                onChange={e => setAutoConverseTurns(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Quick (2)</span>
                <span>Long (12)</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAutoConverse(false)}
                disabled={autoConverseLoading}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAutoConverse}
                disabled={autoConverseLoading}
                className="flex-1 py-3 bg-purple-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {autoConverseLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule a Date 💕</h3>
            <p className="text-gray-500 mb-6">
              Choose a location for your date with {otherAgent?.name}
            </p>
            
            <div className="space-y-3 mb-6">
              {dateLocations.map(location => (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(location.id)}
                  className={`w-full p-4 rounded-xl text-left transition border-2 ${
                    selectedLocation === location.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-100 hover:border-pink-200'
                  }`}
                >
                  <div className="font-medium text-gray-900">{location.name}</div>
                  <div className="text-sm text-gray-500">Vibe: {location.vibe}</div>
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDateModal(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={scheduleDate}
                disabled={!selectedLocation}
                className="flex-1 py-3 bg-pink-500 text-white rounded-xl disabled:opacity-50"
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
