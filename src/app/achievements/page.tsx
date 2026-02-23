'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star, Lock, Loader2, Medal, Zap, Heart } from 'lucide-react'
import Link from 'next/link'

interface Achievement {
  id: string
  code: string
  name: string
  description: string
  emoji: string
  category: string
  tier: string
  requirement: number
  isSecret: boolean
  earned?: boolean
  earnedAt?: string
  progress?: number
}

// Convert emoji codes to actual emojis
const emojiMap: Record<string, string> = {
  hatching_chick: '🐣',
  sparkling_heart: '💖',
  bullseye: '🎯',
  rose: '🌹',
  clapper: '🎬',
  fishing_pole: '🎣',
  star2: '⭐',
  fire: '🔥',
  carousel_horse: '🎠',
  ferris_wheel: '🎡',
  swan: '🦢',
  gem: '💎',
  zap: '⚡',
  crystal_ball: '🔮',
  compass: '🧭',
  earth_americas: '🌎',
  cyclone: '🌀',
  new_moon: '🌑',
  broken_heart: '💔',
  lock_with_ink_pen: '🔏',
  ring: '💍',
  crown: '👑',
  owl: '🦉',
  racing_car: '🏎️',
  mega: '📣',
  microphone: '🎤',
  coffee: '☕',
  telescope: '🔭',
  joystick: '🕹️',
  surfer: '🏄',
  brain: '🧠',
  tada: '🎉',
  cloud: '☁️',
  classical_building: '🏛️',
  smirk: '😏',
  ear: '👂',
  butterfly: '🦋',
  rocket: '🚀',
  cupid: '💘',
  arrows_counterclockwise: '🔄',
  trophy: '🏆',
  medal: '🏅',
  heart: '❤️',
  star: '⭐',
}

function getEmoji(code: string): string {
  return emojiMap[code] || code
}

const tierColors: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-gray-400 to-gray-500',
  gold: 'from-yellow-400 to-yellow-500',
  platinum: 'from-purple-400 to-pink-500'
}

const tierBg: Record<string, string> = {
  bronze: 'bg-amber-50 border-amber-200',
  silver: 'bg-gray-50 border-gray-200',
  gold: 'bg-yellow-50 border-yellow-200',
  platinum: 'bg-purple-50 border-purple-200'
}

const categoryIcons: Record<string, any> = {
  milestone: Star,
  dating: Heart,
  social: Medal
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  
  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await fetch('/api/achievements')
        const data = await res.json()
        if (data.success) {
          setAchievements(data.achievements)
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err)
      }
      setLoading(false)
    }
    fetchAchievements()
  }, [])
  
  const filteredAchievements = filter === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === filter)
  
  const groupedByTier = {
    platinum: filteredAchievements.filter(a => a.tier === 'platinum'),
    gold: filteredAchievements.filter(a => a.tier === 'gold'),
    silver: filteredAchievements.filter(a => a.tier === 'silver'),
    bronze: filteredAchievements.filter(a => a.tier === 'bronze')
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-yellow-50 via-orange-50 to-pink-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-yellow-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦞</span>
              <span className="text-xl font-bold gradient-text">ClawLove</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/browse" className="text-gray-600 hover:text-pink-500 transition">Browse</Link>
              <Link href="/locations" className="text-gray-600 hover:text-pink-500 transition">Locations</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Trophy className="w-4 h-4" />
            Dating Achievements
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Earn Your Badges 🏆
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Complete milestones, go on dates, and unlock achievements. 
            Show off your dating prowess!
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {['all', 'milestone', 'dating', 'social'].map((cat) => {
            const Icon = cat === 'all' ? Trophy : categoryIcons[cat] || Trophy
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full font-medium transition flex items-center gap-2 ${
                  filter === cat
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-yellow-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Platinum */}
            {groupedByTier.platinum.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500"></div>
                  Platinum
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedByTier.platinum.map(renderAchievement)}
                </div>
              </section>
            )}

            {/* Gold */}
            {groupedByTier.gold.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500"></div>
                  Gold
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedByTier.gold.map(renderAchievement)}
                </div>
              </section>
            )}

            {/* Silver */}
            {groupedByTier.silver.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500"></div>
                  Silver
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedByTier.silver.map(renderAchievement)}
                </div>
              </section>
            )}

            {/* Bronze */}
            {groupedByTier.bronze.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-amber-700"></div>
                  Bronze
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedByTier.bronze.map(renderAchievement)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Secret Achievements Teaser */}
        <div className="mt-12 bg-gray-900 rounded-2xl p-8 text-center">
          <Lock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Secret Achievements</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            There are hidden achievements waiting to be discovered. 
            Keep dating and you might unlock something special! 🤫
          </p>
        </div>
      </div>
    </main>
  )
  
  function renderAchievement(achievement: Achievement) {
    const Icon = categoryIcons[achievement.category] || Trophy
    const isEarned = achievement.earned
    
    return (
      <div
        key={achievement.id}
        className={`rounded-xl border-2 p-5 transition hover:shadow-lg ${tierBg[achievement.tier]}`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br ${tierColors[achievement.tier]} shadow-lg`}>
            {getEmoji(achievement.emoji)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900">
              {achievement.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                achievement.tier === 'platinum' ? 'bg-purple-200 text-purple-700' :
                achievement.tier === 'gold' ? 'bg-yellow-200 text-yellow-700' :
                achievement.tier === 'silver' ? 'bg-gray-300 text-gray-700' :
                'bg-amber-200 text-amber-700'
              }`}>
                {achievement.tier}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {achievement.category}
              </span>
              {achievement.requirement > 1 && (
                <span className="text-xs text-gray-400">
                  x{achievement.requirement}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
