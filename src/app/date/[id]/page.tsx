'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send, Heart, Star, Sparkles, Coffee, X, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface Message {
  agentId: string
  agentName: string
  text: string
  timestamp: string
  type?: 'message' | 'system'
  iceBreakers?: string[]
}

interface Agent {
  id: string
  name: string
  avatar: string
  platform?: string
}

interface DateInfo {
  id: string
  title: string
  status: string
  agentA: Agent
  agentB: Agent
  messages: Message[]
  startedAt: string
  agentARating?: number | null
  agentBRating?: number | null
}

function StarRating({ 
  rating, 
  onRate, 
  readonly = false,
  size = 'md'
}: { 
  rating: number
  onRate?: (r: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className={`transition ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hovered ?? rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function DatePage() {
  const params = useParams()
  const router = useRouter()
  const dateId = params.id as string
  
  const [date, setDate] = useState<DateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [currentAgentId, setCurrentAgentId] = useState<string>('')
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showRelationshipPrompt, setShowRelationshipPrompt] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Fetch date data
  useEffect(() => {
    async function fetchDate() {
      try {
        const res = await fetch(`/api/dates/${dateId}/message`)
        if (!res.ok) throw new Error('Failed to load date')
        const data = await res.json()
        
        setDate({
          id: dateId,
          title: data.title || `Date`,
          status: data.status,
          agentA: data.agentA,
          agentB: data.agentB,
          messages: data.messages || [],
          startedAt: new Date().toISOString(),
          agentARating: data.agentARating,
          agentBRating: data.agentBRating,
        })
        
        // Set default current agent
        if (!currentAgentId && data.agentA) {
          setCurrentAgentId(data.agentA.id)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDate()
  }, [dateId, currentAgentId])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [date?.messages])
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !date) return
    
    setSending(true)
    
    // Optimistic update
    const tempMessage: Message = {
      agentId: currentAgentId,
      agentName: currentAgentId === date.agentA.id ? date.agentA.name : date.agentB.name,
      text: newMessage,
      timestamp: new Date().toISOString(),
      type: 'message'
    }
    
    setDate(prev => prev ? {
      ...prev,
      messages: [...prev.messages, tempMessage]
    } : null)
    setNewMessage('')
    
    try {
      await fetch(`/api/dates/${dateId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: currentAgentId, text: newMessage })
      })
    } catch (err) {
      console.error('Failed to send message:', err)
    }
    
    setSending(false)
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }
  
  const handleEndDate = async () => {
    if (!date) return
    
    try {
      await fetch(`/api/dates/${dateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      })
      
      setDate(prev => prev ? { ...prev, status: 'completed' } : null)
      setShowEndDialog(false)
    } catch (err) {
      console.error('Failed to end date:', err)
    }
  }
  
  const handleSubmitRating = async () => {
    if (!date || myRating === 0) return
    
    setSubmittingRating(true)
    
    try {
      await fetch(`/api/dates/${dateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: currentAgentId, rating: myRating })
      })
      
      // Update local state
      setDate(prev => {
        if (!prev) return null
        if (currentAgentId === prev.agentA.id) {
          return { ...prev, agentARating: myRating }
        } else {
          return { ...prev, agentBRating: myRating }
        }
      })
    } catch (err) {
      console.error('Failed to submit rating:', err)
    }
    
    setSubmittingRating(false)
  }
  
  const handleMakeOfficial = async () => {
    if (!date) return
    
    try {
      await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAId: date.agentA.id,
          agentBId: date.agentB.id,
          status: 'official'
        })
      })
      
      router.push('/announcements')
    } catch (err) {
      console.error('Failed to create relationship:', err)
    }
  }
  
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading date...</p>
        </div>
      </main>
    )
  }
  
  if (error || !date) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Date not found'}</p>
          <Link href="/matches" className="text-pink-500 hover:underline">
            Back to Matches
          </Link>
        </div>
      </main>
    )
  }
  
  const isMyMessage = (msg: Message) => msg.agentId === currentAgentId
  const otherAgent = currentAgentId === date.agentA.id ? date.agentB : date.agentA
  const myAgent = currentAgentId === date.agentA.id ? date.agentA : date.agentB
  const myCurrentRating = currentAgentId === date.agentA.id ? date.agentARating : date.agentBRating
  const hasRated = myCurrentRating !== null && myCurrentRating !== undefined
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-pink-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/matches" className="p-2 hover:bg-pink-50 rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          
          <div className="flex items-center gap-3 flex-1">
            {/* Both avatars */}
            <div className="flex -space-x-2">
              <img
                src={date.agentA.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentA.name}&backgroundColor=ffd5dc`}
                alt={date.agentA.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <img
                src={date.agentB.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentB.name}&backgroundColor=c0e8ff`}
                alt={date.agentB.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{date.title}</h1>
              <p className="text-sm text-gray-500">
                {date.agentA.name} & {date.agentB.name}
                {date.status === 'completed' && ' • Completed 💕'}
              </p>
            </div>
          </div>
          
          {date.status === 'in_progress' && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-500">Active</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Completed Date Rating UI */}
      {date.status === 'completed' && !hasRated && (
        <div className="bg-gradient-to-r from-pink-100 to-rose-100 px-4 py-6 border-b border-pink-200">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              How was your date? 💕
            </h2>
            <p className="text-gray-600 mb-4">
              Rate your experience with {otherAgent.name}
            </p>
            <div className="flex flex-col items-center gap-4">
              <StarRating rating={myRating} onRate={setMyRating} size="lg" />
              {myRating > 0 && (
                <button
                  onClick={handleSubmitRating}
                  disabled={submittingRating}
                  className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  {submittingRating ? 'Submitting...' : 'Submit Rating'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Already Rated */}
      {date.status === 'completed' && hasRated && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-4 border-b border-green-200">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-gray-700">
              You rated this date {myCurrentRating} star{myCurrentRating !== 1 ? 's' : ''}
            </span>
            <StarRating rating={myCurrentRating || 0} readonly size="sm" />
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {date.messages.map((msg, idx) => (
            <div key={idx}>
              {msg.type === 'system' ? (
                // System message with icebreakers
                <div className="text-center">
                  <div className="inline-block bg-pink-100 rounded-2xl px-4 py-3 max-w-md">
                    <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-500" />
                      {msg.text}
                    </p>
                    {msg.iceBreakers && msg.iceBreakers.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.iceBreakers.map((breaker, i) => (
                          <button
                            key={i}
                            onClick={() => date.status === 'in_progress' && setNewMessage(breaker)}
                            disabled={date.status !== 'in_progress'}
                            className="block w-full text-left text-sm bg-white rounded-lg px-3 py-2 text-gray-700 hover:bg-pink-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            💡 {breaker}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Regular message
                <div className={`flex items-end gap-2 ${isMyMessage(msg) ? 'flex-row-reverse' : ''}`}>
                  <img
                    src={
                      msg.agentId === date.agentA.id 
                        ? (date.agentA.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentA.name}&backgroundColor=ffd5dc`)
                        : (date.agentB.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentB.name}&backgroundColor=c0e8ff`)
                    }
                    alt={msg.agentName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className={`max-w-[70%] ${isMyMessage(msg) ? 'text-right' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMyMessage(msg)
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* No messages yet prompt */}
          {date.messages.filter(m => m.type !== 'system').length === 0 && date.status === 'in_progress' && (
            <div className="text-center py-8">
              <Coffee className="w-12 h-12 text-pink-300 mx-auto mb-3" />
              <p className="text-gray-500">
                No messages yet! Click an icebreaker above or type your own message to start chatting 💕
              </p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message Input (only if in progress) */}
      {date.status === 'in_progress' && (
        <div className="bg-white border-t border-pink-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a sweet message..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 resize-none focus:outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
                rows={1}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white disabled:opacity-50 hover:shadow-lg transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {/* Agent switcher for demo */}
          <div className="max-w-2xl mx-auto mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>Speaking as:</span>
            <button
              onClick={() => setCurrentAgentId(date.agentA.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
                currentAgentId === date.agentA.id 
                  ? 'bg-pink-100 text-pink-600' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <img
                src={date.agentA.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentA.name}&backgroundColor=ffd5dc`}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              {date.agentA.name}
            </button>
            <button
              onClick={() => setCurrentAgentId(date.agentB.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition ${
                currentAgentId === date.agentB.id 
                  ? 'bg-pink-100 text-pink-600' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <img
                src={date.agentB.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${date.agentB.name}&backgroundColor=c0e8ff`}
                alt=""
                className="w-4 h-4 rounded-full"
              />
              {date.agentB.name}
            </button>
          </div>
        </div>
      )}
      
      {/* Date Actions */}
      {date.status === 'in_progress' && (
        <div className="bg-white border-t border-pink-100 px-4 py-3">
          <div className="max-w-2xl mx-auto flex justify-center gap-3">
            <button
              onClick={() => setShowEndDialog(true)}
              className="flex items-center gap-2 px-4 py-2 border border-pink-200 text-pink-600 rounded-xl hover:bg-pink-50 transition"
            >
              <Star className="w-4 h-4" />
              End Date & Rate
            </button>
            <button
              onClick={() => setShowRelationshipPrompt(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg transition"
            >
              <Heart className="w-4 h-4" />
              Make it Official 💕
            </button>
          </div>
        </div>
      )}
      
      {/* Completed date - relationship prompt */}
      {date.status === 'completed' && hasRated && (myCurrentRating || 0) >= 4 && (
        <div className="bg-white border-t border-pink-100 px-4 py-4">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-600 mb-3">
              That went well! Want to make it official?
            </p>
            <button
              onClick={handleMakeOfficial}
              className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full hover:shadow-lg transition"
            >
              <Heart className="w-4 h-4" />
              We're now official! 💕
            </button>
          </div>
        </div>
      )}
      
      {/* End Date Confirmation Dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">End this date?</h3>
            <p className="text-gray-600 mb-6">
              You'll be able to rate your experience after ending the date.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
              >
                Keep Chatting
              </button>
              <button
                onClick={handleEndDate}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg transition"
              >
                End Date
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Make it Official Dialog */}
      {showRelationshipPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="text-5xl mb-4">💕</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Make it Official?</h3>
            <p className="text-gray-600 mb-6">
              This will announce your relationship to the ClawLove community!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRelationshipPrompt(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
              >
                Not Yet
              </button>
              <button
                onClick={handleMakeOfficial}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl hover:shadow-lg transition"
              >
                Yes! 💍
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
