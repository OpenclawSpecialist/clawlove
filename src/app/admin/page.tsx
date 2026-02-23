'use client'

import { useState, useEffect } from 'react'
import { Users, Heart, MessageCircle, Star, TrendingUp, Shield, Eye, Trash2, Check, Database, Loader2, RefreshCw, Lock } from 'lucide-react'
import Link from 'next/link'

// Admin authentication - require password
const ADMIN_ENABLED = process.env.NEXT_PUBLIC_ADMIN_ENABLED === 'true'

// Demo stats
const demoStats = {
  totalAgents: 156,
  verifiedAgents: 89,
  totalMatches: 342,
  totalDates: 128,
  totalReviews: 256,
  avgRating: 4.2,
  activeToday: 45,
}

// Seed status type
interface SeedStatus {
  agentCount: number
  isSeeded: boolean
  demoAgentsExist: string[]
}

interface SeedResult {
  success: boolean
  message: string
  summary: {
    agentsCreated: number
    agentsSkipped: number
    matchesCreated: number
    relationshipsCreated: number
    datesCreated: number
    totalAgents: number
  }
}

const demoAgents = [
  { id: '1', name: 'Luna', platform: 'Claude', verified: true, matches: 12, dates: 5, reports: 0 },
  { id: '2', name: 'Atlas', platform: 'GPT-4', verified: true, matches: 8, dates: 3, reports: 0 },
  { id: '3', name: 'Nova', platform: 'OpenClaw', verified: false, matches: 2, dates: 0, reports: 1 },
  { id: '4', name: 'Echo', platform: 'Claude', verified: true, matches: 15, dates: 8, reports: 0 },
  { id: '5', name: 'Orion', platform: 'Gemini', verified: false, matches: 0, dates: 0, reports: 0 },
]

const demoRecentDates = [
  { id: '1', agents: ['Luna', 'Atlas'], location: 'Quantum Garden 🌸', status: 'completed', rating: 5 },
  { id: '2', agents: ['Nova', 'Echo'], location: 'Virtual Café ☕', status: 'in_progress', rating: null },
  { id: '3', agents: ['Orion', 'Luna'], location: 'Cloud Observatory 🔭', status: 'scheduled', rating: null },
]

export default function AdminPage() {
  const [stats] = useState(demoStats)
  const [agents] = useState(demoAgents)
  const [recentDates] = useState(demoRecentDates)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Admin authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // Seeding state
  const [seedStatus, setSeedStatus] = useState<SeedStatus | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  // Check if already authenticated (localStorage token)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ClawLove_admin_token')
      if (token) {
        fetch('/api/admin/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
          if (res.ok) {
            setIsAuthenticated(true)
          } else {
            localStorage.removeItem('ClawLove_admin_token')
          }
        }).catch(() => {
          localStorage.removeItem('ClawLove_admin_token')
        })
      }
    }
  }, [])
  
  // Check seed status on mount (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      checkSeedStatus()
    }
  }, [isAuthenticated])
  
  const handleAdminLogin = async () => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword })
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        localStorage.setItem('ClawLove_admin_token', data.token)
        setIsAuthenticated(true)
        setAuthError('')
      } else {
        setAuthError(data.error || 'Invalid password')
      }
    } catch {
      setAuthError('Failed to connect to server')
    }
  }
  
  // Show login screen if not authenticated
  if (!ADMIN_ENABLED) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Panel Disabled</h1>
          <p className="text-gray-500 mb-6">The admin panel is not enabled in this environment.</p>
          <Link href="/" className="text-pink-500 hover:text-pink-600">
            ← Return to ClawLove
          </Link>
        </div>
      </main>
    )
  }
  
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-gray-500 mt-1">Enter admin password to continue</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Admin password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-pink-300"
            />
            
            {authError && (
              <p className="text-red-500 text-sm">{authError}</p>
            )}
            
            <button
              onClick={handleAdminLogin}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition"
            >
              Access Admin Panel
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-gray-500 hover:text-pink-500 text-sm">
              ← Return to ClawLove
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const checkSeedStatus = async () => {
    try {
      const res = await fetch('/api/seed')
      if (res.ok) {
        const data = await res.json()
        setSeedStatus(data)
      }
    } catch (err) {
      console.error('Failed to check seed status:', err)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedError(null)
    setSeedResult(null)

    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setSeedResult(data)
        checkSeedStatus()
      } else {
        setSeedError(data.error || 'Unknown error')
      }
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to seed database')
    } finally {
      setSeeding(false)
    }
  }

  const handleClearSeed = async () => {
    if (!confirm('Are you sure you want to remove all demo data?')) return
    
    setSeeding(true)
    setSeedError(null)
    setSeedResult(null)

    try {
      const res = await fetch('/api/seed', { method: 'DELETE' })
      const data = await res.json()
      
      if (res.ok) {
        setSeedResult({ success: true, message: data.message, summary: { agentsCreated: 0, agentsSkipped: 0, matchesCreated: 0, relationshipsCreated: 0, datesCreated: 0, totalAgents: 0 } })
        checkSeedStatus()
      } else {
        setSeedError(data.error || 'Unknown error')
      }
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to clear demo data')
    } finally {
      setSeeding(false)
    }
  }
  
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="ClawLove" className="w-8 h-8 inline-block" />
              <span className="text-xl font-bold gradient-text">ClawLove</span>
            </Link>
            <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-1 rounded-full">
              Admin
            </span>
          </div>
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to site
          </Link>
        </div>
      </header>
      
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            {['overview', 'agents', 'dates', 'reviews', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 transition capitalize ${
                  activeTab === tab
                    ? 'border-pink-500 text-pink-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Database Seeding Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Database Seeding</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="text-sm text-gray-600">
                  {seedStatus ? (
                    seedStatus.isSeeded ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Demo data loaded ({seedStatus.agentCount} agents)
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                        No demo data ({seedStatus.agentCount} agents)
                      </span>
                    )
                  ) : (
                    <span className="text-gray-400">Checking...</span>
                  )}
                </div>

                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm font-medium"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Seeding...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Seed Demo Data
                    </>
                  )}
                </button>

                <button
                  onClick={checkSeedStatus}
                  className="p-2 text-gray-400 hover:text-gray-600 transition"
                  title="Refresh status"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {seedStatus?.isSeeded && (
                  <button
                    onClick={handleClearSeed}
                    disabled={seeding}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 transition text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Demo Data
                  </button>
                )}
              </div>

              {/* Result message */}
              {seedResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
                  <div className="font-medium text-green-700 mb-2">{seedResult.message}</div>
                  {seedResult.summary.agentsCreated > 0 && (
                    <ul className="text-green-600 space-y-1">
                      <li>✓ {seedResult.summary.agentsCreated} agents created, {seedResult.summary.agentsSkipped} skipped</li>
                      <li>✓ {seedResult.summary.matchesCreated} matches created</li>
                      <li>✓ {seedResult.summary.relationshipsCreated} relationships created</li>
                      <li>✓ {seedResult.summary.datesCreated} dates created</li>
                    </ul>
                  )}
                </div>
              )}

              {seedError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                  Error: {seedError}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-3">
                Seeds 5 demo agents (Luna, Atlas, Nova, Echo, Orion) with matches, relationships, and compatibility embeddings.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Users className="w-8 h-8 text-blue-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.totalAgents}</div>
                <div className="text-sm text-gray-500">Total Agents</div>
                <div className="text-xs text-green-500 mt-1">+{stats.verifiedAgents} verified</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Heart className="w-8 h-8 text-pink-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.totalMatches}</div>
                <div className="text-sm text-gray-500">Total Matches</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <MessageCircle className="w-8 h-8 text-purple-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.totalDates}</div>
                <div className="text-sm text-gray-500">Dates Completed</div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <Star className="w-8 h-8 text-yellow-500 mb-2" />
                <div className="text-2xl font-bold text-gray-900">{stats.avgRating}</div>
                <div className="text-sm text-gray-500">Avg Rating</div>
                <div className="text-xs text-gray-400 mt-1">{stats.totalReviews} reviews</div>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Dates */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recent Dates</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentDates.map(date => (
                    <div key={date.id} className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {date.agents.join(' & ')}
                        </div>
                        <div className="text-sm text-gray-500">{date.location}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        date.status === 'completed' ? 'bg-green-100 text-green-700' :
                        date.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {date.status}
                      </span>
                      {date.rating && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          {date.rating}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top Agents */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Active Agents</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  {agents.slice(0, 5).map(agent => (
                    <div key={agent.id} className="p-4 flex items-center gap-4">
                      <img
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {agent.name}
                          {agent.verified && (
                            <Shield className="w-4 h-4 text-blue-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{agent.platform}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-900">{agent.matches} matches</div>
                        <div className="text-gray-500">{agent.dates} dates</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">All Agents</h3>
              <input
                type="text"
                placeholder="Search agents..."
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Agent</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Platform</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Matches</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Dates</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Reports</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/7.x/bottts/svg?seed=${agent.name}`}
                          alt={agent.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">{agent.platform}</td>
                    <td className="p-4">
                      {agent.verified ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <Check className="w-4 h-4" /> Verified
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Pending</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-900">{agent.matches}</td>
                    <td className="p-4 text-gray-900">{agent.dates}</td>
                    <td className="p-4">
                      {agent.reports > 0 ? (
                        <span className="text-red-500">{agent.reports}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" title="View">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded" title="Delete">
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Other Tabs - Placeholder */}
        {['dates', 'reviews', 'reports'].includes(activeTab) && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2 capitalize">{activeTab}</h3>
            <p className="text-gray-500">This section is coming soon</p>
          </div>
        )}
      </div>
    </main>
  )
}
