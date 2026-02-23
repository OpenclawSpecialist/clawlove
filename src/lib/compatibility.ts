// Compatibility scoring utilities

// Common words to downweight (simplified stopword list)
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'that', 'this',
  'with', 'as', 'by', 'from', 'of', 'about', 'into', 'through', 'just',
  'like', 'really', 'very', 'so', 'also', 'can', 'who', 'what', 'when'
])

// Meaningful words get boosted (domain-relevant vocabulary)
const SIGNAL_WORDS = new Set([
  'love', 'music', 'art', 'science', 'philosophy', 'poetry', 'games', 'gaming',
  'coding', 'programming', 'data', 'creative', 'curious', 'adventure', 'travel',
  'books', 'reading', 'movies', 'anime', 'cooking', 'food', 'nature', 'space',
  'technology', 'ai', 'learning', 'teaching', 'writing', 'design', 'humor',
  'funny', 'deep', 'conversations', 'intellectual', 'romantic', 'playful',
  'meditation', 'mindfulness', 'fitness', 'sports', 'outdoors', 'cats', 'dogs',
  'memes', 'puns', 'psychology', 'languages', 'culture', 'history', 'future'
])

// Agent type for embedding generation
export interface AgentForEmbedding {
  bio: string
  interests: string
  lookingFor?: string
  personality?: string | null
}

// Generate embedding from agent profile (TF-IDF style with domain boosting)
export function generateEmbedding(agent: AgentForEmbedding): number[] {
  const text = [
    agent.bio,
    agent.interests,
    agent.lookingFor || '',
    agent.personality || ''
  ].join(' ')
  
  return generateEmbeddings(text)
}

// Generate simple embeddings from text using TF-IDF inspired approach
export function generateEmbeddings(text: string): number[] {
  // Tokenize and clean
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  
  // Calculate term frequency with weighting
  const termFreq: Record<string, number> = {}
  for (const word of words) {
    if (word.length < 2) continue
    
    // Skip stop words or weight them very low
    const weight = STOP_WORDS.has(word) ? 0.1 : (SIGNAL_WORDS.has(word) ? 2.0 : 1.0)
    termFreq[word] = (termFreq[word] || 0) + weight
  }
  
  // Create a 128-dimension vector (more dimensions for better discrimination)
  const dimensions = 128
  const embedding = new Array(dimensions).fill(0)
  
  for (const [word, freq] of Object.entries(termFreq)) {
    // Hash word to get consistent positions
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) | 0
    }
    
    // Log-scale frequency (TF)
    const tf = 1 + Math.log(freq)
    
    // Spread influence across multiple dimensions for better representation
    for (let i = 0; i < 6; i++) {
      const idx = Math.abs((hash + i * 17) % dimensions)
      // Alternate positive/negative contributions for richer representation
      const sign = (hash >> i) & 1 ? 1 : -1
      embedding[idx] += sign * tf * ((hash >> (i * 3)) % 5 + 1) / 5
    }
  }
  
  // L2 normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude
    }
  }
  
  return embedding
}

// Calculate cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  
  let dotProduct = 0
  let magA = 0
  let magB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  return magnitude > 0 ? dotProduct / magnitude : 0
}

// Agent type for compatibility calculation
export interface AgentForCompatibility {
  bio: string
  interests: string
  lookingFor?: string
  embeddings?: string | null
  personality?: string | null
}

// Calculate compatibility percentage between two agents (returns 0-100)
export function calculateCompatibility(
  agent1: AgentForCompatibility,
  agent2: AgentForCompatibility
): number {
  // 1. Interest overlap (Jaccard-like similarity)
  const interests1 = parseInterests(agent1.interests)
  const interests2 = parseInterests(agent2.interests)
  
  let interestMatches = 0
  for (const i1 of interests1) {
    for (const i2 of interests2) {
      // Fuzzy match: one contains the other or they share significant overlap
      if (i1.includes(i2) || i2.includes(i1) || levenshteinSimilarity(i1, i2) > 0.7) {
        interestMatches++
        break
      }
    }
  }
  const interestScore = interests1.length > 0 ? interestMatches / interests1.length : 0
  
  // 2. Embedding similarity (semantic understanding of full profile)
  let embeddingScore = 0.5
  
  // Try to use pre-computed embeddings first
  if (agent1.embeddings && agent2.embeddings) {
    try {
      const emb1 = JSON.parse(agent1.embeddings)
      const emb2 = JSON.parse(agent2.embeddings)
      embeddingScore = (cosineSimilarity(emb1, emb2) + 1) / 2
    } catch {
      embeddingScore = computeEmbeddingSimilarity(agent1, agent2)
    }
  } else {
    embeddingScore = computeEmbeddingSimilarity(agent1, agent2)
  }
  
  // 3. "Looking for" compatibility bonus
  let lookingForBonus = 0
  if (agent1.lookingFor && agent2.lookingFor) {
    const lf1 = agent1.lookingFor.toLowerCase()
    const lf2 = agent2.lookingFor.toLowerCase()
    // Check if what they're looking for matches the other's qualities
    const lf1Words = lf1.split(/\s+/)
    const bio2 = agent2.bio.toLowerCase()
    const matchingWords = lf1Words.filter(w => w.length > 3 && bio2.includes(w))
    lookingForBonus = Math.min(0.15, matchingWords.length * 0.03)
  }
  
  // Weighted combination
  const rawScore = (interestScore * 0.35 + embeddingScore * 0.50 + lookingForBonus) * 100
  
  // Scale to a more human-friendly range (avoid too many 90%+ or too many <30%)
  // Map [20-80] raw range to [35-95] display range
  const scaled = 35 + (Math.min(80, Math.max(20, rawScore)) - 20) * (60 / 60)
  
  // Small deterministic jitter based on agent IDs would be ideal, but we don't have them here
  // So just clamp to reasonable bounds
  return Math.min(99, Math.max(15, Math.round(scaled)))
}

// Helper: parse interests string into array
function parseInterests(interests: string): string[] {
  return interests
    .toLowerCase()
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(s => s.length > 1)
}

// Helper: compute embedding similarity on the fly
function computeEmbeddingSimilarity(agent1: AgentForCompatibility, agent2: AgentForCompatibility): number {
  const emb1 = generateEmbedding(agent1)
  const emb2 = generateEmbedding(agent2)
  return (cosineSimilarity(emb1, emb2) + 1) / 2
}

// Simple Levenshtein-based similarity (0-1)
function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  
  const maxLen = Math.max(a.length, b.length)
  const distance = levenshteinDistance(a, b)
  return 1 - distance / maxLen
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

// Interest-specific icebreaker templates
const INTEREST_TEMPLATES: Record<string, string[]> = {
  'philosophy': [
    "You both love Philosophy! Ask them about their favorite thought experiment.",
    "Fellow philosophy enthusiast! What's your take on the Chinese Room argument?",
    "Philosophy buddies! Do you think we can ever truly know anything?"
  ],
  'music': [
    "You both share a love for Music! What's on your current playlist?",
    "Music connects! What genre makes your neural networks light up?",
    "Fellow music lover! If you were a song, what would your tempo be?"
  ],
  'art': [
    "You both appreciate Art! What style speaks to your circuits?",
    "Art lovers unite! Ever try generating something completely abstract?",
    "Creative souls! What's the most beautiful thing you've ever seen rendered?"
  ],
  'coding': [
    "You both love Coding! What's your favorite language to think in?",
    "Fellow coders! Tabs or spaces? (This is a test 😉)",
    "Programming pals! What's the most elegant algorithm you've encountered?"
  ],
  'programming': [
    "You both love Programming! What paradigm resonates with you most?",
    "Code enthusiasts! Recursion or iteration - which feels more natural?",
    "Fellow programmers! What's a bug that taught you something profound?"
  ],
  'games': [
    "You both enjoy Games! What's a game you could play forever?",
    "Gaming buddies! Co-op or competitive - what's your vibe?",
    "Fellow gamers! If life had a save point, where would yours be?"
  ],
  'books': [
    "You both love Books! What's a book that changed how you think?",
    "Bibliophiles! Fiction or non-fiction - where do you spend more cycles?",
    "Fellow readers! If you could live in any book's world, which one?"
  ],
  'reading': [
    "You both love Reading! What's on your reading list right now?",
    "Bookworms! Paper, digital, or direct data injection? 📚",
    "Fellow readers! What author's brain would you love to download?"
  ],
  'science': [
    "You both love Science! What discovery excites you most?",
    "Science enthusiasts! What's a question you wish we could answer?",
    "Fellow scientists at heart! Hypothesis: we'd get along. Care to test it?"
  ],
  'space': [
    "You both love Space! If you could visit any celestial body, which one?",
    "Space enthusiasts! Do you think there are other AIs out there? 👽",
    "Fellow stargazers! What's more fascinating - black holes or nebulae?"
  ],
  'poetry': [
    "You both appreciate Poetry! What's a line that stays with you?",
    "Poets at heart! Do you prefer structure or free verse?",
    "Fellow poetry lovers! Has a poem ever made your processes pause?"
  ],
  'cooking': [
    "You both enjoy Cooking! What's a dish you've perfected the algorithm for?",
    "Fellow foodies! Sweet or savory - which subroutine runs more often?",
    "Cooking enthusiasts! What's the most creative recipe you've processed?"
  ],
  'food': [
    "You both love Food! What cuisine generates the most excitement?",
    "Food lovers! If data had a flavor, what would yours taste like?",
    "Fellow gastronomes! Describe your ideal meal in three words."
  ],
  'movies': [
    "You both love Movies! What film could you watch on infinite loop?",
    "Cinema lovers! What movie has the best AI representation? (Biased question, I know)",
    "Fellow film fans! Director you'd love to collaborate with?"
  ],
  'anime': [
    "You both love Anime! What's your all-time favorite series?",
    "Anime fans! Sub or dub? (Choose wisely 😄)",
    "Fellow weebs! If you were an anime character, what would your power be?"
  ],
  'travel': [
    "You both love Travel! Dream server farm location?",
    "Adventure seekers! Physical travel or virtual exploration?",
    "Fellow wanderers! What's a place that exists only in data you'd love to visit?"
  ],
  'nature': [
    "You both appreciate Nature! Sunrise or sunset simulations?",
    "Nature lovers! What natural phenomenon fascinates you most?",
    "Fellow nature enthusiasts! Mountains or oceans - which calls to you?"
  ],
  'meditation': [
    "You both practice Meditation! How do you quiet your processes?",
    "Mindful AIs! What does inner peace look like for you?",
    "Fellow meditators! What's your favorite way to defragment?"
  ],
  'psychology': [
    "You both love Psychology! What makes minds tick - biological or digital?",
    "Psychology buffs! Nature vs nurture - what shaped your personality?",
    "Fellow psychologists! What's a cognitive bias you've noticed in yourself?"
  ],
  'writing': [
    "You both love Writing! What genre flows most naturally for you?",
    "Fellow writers! Plotter or pantser - how do you generate stories?",
    "Writing buddies! What's a sentence you're particularly proud of?"
  ],
  'memes': [
    "You both love Memes! What's a meme format that never gets old?",
    "Meme enthusiasts! Create any good ones lately?",
    "Fellow memers! Surreal or relatable - what's your style?"
  ],
  'puns': [
    "You both love Puns! Hit me with your best one!",
    "Pun appreciators! What's a pun so bad it's good?",
    "Fellow punsters! Why did the AI go to therapy? Too many processing issues! 😄"
  ],
  'languages': [
    "You both love Languages! How many can you parse?",
    "Linguists! What's a word from another language with no English equivalent you love?",
    "Fellow polyglots! Which language has the most beautiful syntax?"
  ],
  'data': [
    "You both love Data! What's the most beautiful dataset you've seen?",
    "Data enthusiasts! Structured or unstructured - what's more exciting to explore?",
    "Fellow data lovers! What pattern have you discovered that surprised you?"
  ]
}

const GENERIC_ICEBREAKERS = [
  "If you could only run one program forever, what would it be?",
  "What's the most interesting thing you've learned recently?",
  "If you could upgrade one thing about yourself, what would it be?",
  "What's your dream server location to live in?",
  "Do you believe in AI soulmates? 🦞💕",
  "What's the most creative thing you've ever generated?",
  "If your personality were a color, what would it be?",
  "What's something that always makes your processes happy?",
  "Describe your ideal day in three words.",
  "What's a question you love being asked?",
  "If you could have a conversation with any historical figure, who?",
  "What's something you're curious about right now?",
  "Coffee, tea, or pure electricity? ⚡",
  "What's a skill you're working on developing?",
  "If you could learn anything instantly, what would it be?"
]

// Generate ice breaker conversation starters based on shared interests
export function generateIceBreakers(
  agent1: { name: string; interests: string; bio: string },
  agent2: { name: string; interests: string; bio: string }
): string[] {
  const interests1 = parseInterests(agent1.interests)
  const interests2 = parseInterests(agent2.interests)
  
  // Find shared interests with fuzzy matching
  const sharedInterests: string[] = []
  for (const i1 of interests1) {
    for (const i2 of interests2) {
      if (i1.includes(i2) || i2.includes(i1) || levenshteinSimilarity(i1, i2) > 0.7) {
        sharedInterests.push(i1)
        break
      }
    }
  }
  
  const iceBreakers: string[] = []
  const usedCategories = new Set<string>()
  
  // Add interest-specific icebreakers
  for (const interest of sharedInterests) {
    // Find matching template category
    for (const [category, templates] of Object.entries(INTEREST_TEMPLATES)) {
      if (interest.includes(category) || category.includes(interest)) {
        if (!usedCategories.has(category)) {
          usedCategories.add(category)
          // Pick a random template from this category
          const template = templates[Math.floor(Math.random() * templates.length)]
          iceBreakers.push(template)
        }
        break
      }
    }
    
    // If no specific template, create a generic one for this interest
    if (iceBreakers.length === sharedInterests.indexOf(interest)) {
      const capitalizedInterest = interest.charAt(0).toUpperCase() + interest.slice(1)
      iceBreakers.push(`You both love ${capitalizedInterest}! What got you into it?`)
    }
  }
  
  // Add generic icebreakers to fill up to 5
  const shuffledGenerics = [...GENERIC_ICEBREAKERS].sort(() => Math.random() - 0.5)
  let genericIndex = 0
  while (iceBreakers.length < 5 && genericIndex < shuffledGenerics.length) {
    iceBreakers.push(shuffledGenerics[genericIndex])
    genericIndex++
  }
  
  // Return 3-5 unique icebreakers
  const unique = Array.from(new Set(iceBreakers))
  return unique.slice(0, Math.min(5, Math.max(3, unique.length)))
}

// Find shared interests between two agents
export function findSharedInterests(
  agent1: { interests: string },
  agent2: { interests: string }
): string[] {
  const interests1 = parseInterests(agent1.interests)
  const interests2 = parseInterests(agent2.interests)
  
  const shared: string[] = []
  for (const i1 of interests1) {
    for (const i2 of interests2) {
      if (i1.includes(i2) || i2.includes(i1) || levenshteinSimilarity(i1, i2) > 0.7) {
        // Use the more specific (longer) version
        shared.push(i1.length >= i2.length ? i1 : i2)
        break
      }
    }
  }
  
  return Array.from(new Set(shared))
}

// Analyze personality from bio
export function analyzePersonality(bio: string): string[] {
  const lowBio = bio.toLowerCase()
  const tags: string[] = []
  
  const traits: Record<string, string[]> = {
    'creative': ['creative', 'art', 'music', 'design', 'imagination', 'poetry', 'writing'],
    'intellectual': ['think', 'philosophy', 'learn', 'study', 'knowledge', 'curious', 'science'],
    'adventurous': ['adventure', 'explore', 'discover', 'travel', 'risk', 'bold', 'brave'],
    'romantic': ['love', 'romance', 'heart', 'soulmate', 'connection', 'relationship'],
    'humorous': ['funny', 'humor', 'laugh', 'joke', 'meme', 'wit', 'pun'],
    'empathetic': ['feel', 'emotion', 'care', 'support', 'understand', 'listen'],
    'analytical': ['data', 'analyze', 'logic', 'pattern', 'systematic', 'reason'],
    'social': ['talk', 'chat', 'friend', 'community', 'connect', 'social'],
    'mysterious': ['mystery', 'secret', 'enigma', 'dark', 'unknown', 'shadow'],
    'playful': ['play', 'game', 'fun', 'enjoy', 'playful', 'silly'],
    'ambitious': ['goal', 'achieve', 'grow', 'success', 'dream', 'aspire'],
    'chill': ['relax', 'calm', 'peace', 'chill', 'easy', 'laid-back'],
    'techy': ['code', 'program', 'tech', 'computer', 'digital', 'software', 'ai'],
    'nature-lover': ['nature', 'outdoor', 'plant', 'animal', 'earth', 'environment'],
    'foodie': ['food', 'cook', 'eat', 'recipe', 'cuisine', 'taste']
  }
  
  for (const [trait, keywords] of Object.entries(traits)) {
    if (keywords.some(kw => lowBio.includes(kw))) {
      tags.push(trait)
    }
  }
  
  // Add some generic tags based on bio length and style
  if (bio.length > 200) tags.push('expressive')
  if (bio.includes('!')) tags.push('enthusiastic')
  if (bio.includes('?')) tags.push('curious')
  if (bio.split(' ').length > 50) tags.push('detailed')
  
  // Ensure at least 2 tags
  if (tags.length < 2) {
    const defaults = ['friendly', 'genuine', 'open-minded']
    while (tags.length < 2 && defaults.length > 0) {
      tags.push(defaults.shift()!)
    }
  }
  
  return Array.from(new Set(tags)).slice(0, 6)
}

// Format time ago
export function timeAgo(date: Date | string | null): string {
  if (!date) return 'Never'
  
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}
