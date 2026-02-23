import { Profile, CommunicationStyle } from './profiles';

export interface MatchBreakdown {
  sharedInterests: { score: number; weight: number; matched: string[] };
  personalityTraits: { score: number; weight: number; complementary: string[][] };
  communicationStyle: { score: number; weight: number; styles: [CommunicationStyle, CommunicationStyle] };
  sparkFactor: { score: number; weight: number };
}

export interface MatchResult {
  profileId1: string;
  profileId2: string;
  score: number;
  breakdown: MatchBreakdown;
}

// Trait pairs that complement each other well
const COMPLEMENTARY_PAIRS: [string, string][] = [
  ['introvert', 'extrovert'],
  ['logical', 'creative'],
  ['cautious', 'bold'],
  ['analytical', 'empathetic'],
  ['patient', 'energetic'],
  ['precise', 'dreamy'],
  ['wise', 'playful'],
  ['warm', 'logical'],
];

// Communication style compatibility matrix (0-1)
const STYLE_COMPAT: Record<CommunicationStyle, Record<CommunicationStyle, number>> = {
  analytical: { analytical: 0.9, expressive: 0.4, concise: 0.8, narrative: 0.5, socratic: 0.85, playful: 0.3 },
  expressive:  { analytical: 0.4, expressive: 0.85, concise: 0.3, narrative: 0.8, socratic: 0.6, playful: 0.75 },
  concise:     { analytical: 0.8, expressive: 0.3, concise: 0.7, narrative: 0.4, socratic: 0.5, playful: 0.5 },
  narrative:   { analytical: 0.5, expressive: 0.8, concise: 0.4, narrative: 0.9, socratic: 0.75, playful: 0.6 },
  socratic:    { analytical: 0.85, expressive: 0.6, concise: 0.5, narrative: 0.75, socratic: 0.8, playful: 0.5 },
  playful:     { analytical: 0.3, expressive: 0.75, concise: 0.5, narrative: 0.6, socratic: 0.5, playful: 0.9 },
};

// Seeded PRNG for consistent spark factor
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  // Normalize to 0-1
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function jaccardSimilarity(a: string[], b: string[]): { score: number; intersection: string[] } {
  const setA = new Set(a.map(s => s.toLowerCase()));
  const setB = new Set(b.map(s => s.toLowerCase()));
  const intersection = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return {
    score: union.size === 0 ? 0 : intersection.length / union.size,
    intersection,
  };
}

function complementaryScore(traitsA: string[], traitsB: string[]): { score: number; pairs: string[][] } {
  const foundPairs: string[][] = [];
  const setA = new Set(traitsA.map(s => s.toLowerCase()));
  const setB = new Set(traitsB.map(s => s.toLowerCase()));

  for (const [t1, t2] of COMPLEMENTARY_PAIRS) {
    if ((setA.has(t1) && setB.has(t2)) || (setA.has(t2) && setB.has(t1))) {
      foundPairs.push([t1, t2]);
    }
  }

  // Also give partial credit for shared positive traits
  const sharedTraits = [...setA].filter(x => setB.has(x));
  const sharedBonus = sharedTraits.length * 0.15;

  // Score: each complementary pair is worth up to 1/3, capped at 1
  const raw = Math.min(1, (foundPairs.length * 0.35) + sharedBonus);
  return { score: raw, pairs: foundPairs };
}

export function calculateMatch(profileA: Profile, profileB: Profile): MatchResult {
  // 1. Shared interests (40%)
  const { score: interestScore, intersection } = jaccardSimilarity(profileA.interests, profileB.interests);

  // 2. Complementary personality (30%)
  const { score: traitScore, pairs } = complementaryScore(profileA.traits, profileB.traits);

  // 3. Communication style (20%)
  const commScore = STYLE_COMPAT[profileA.communicationStyle][profileB.communicationStyle];

  // 4. Spark factor (10%) — seeded by sorted id pair for consistency
  const seed = [profileA.id, profileB.id].sort().join(':');
  const sparkScore = seededRandom(seed);

  const breakdown: MatchBreakdown = {
    sharedInterests: { score: Math.round(interestScore * 100), weight: 40, matched: intersection },
    personalityTraits: { score: Math.round(traitScore * 100), weight: 30, complementary: pairs },
    communicationStyle: { score: Math.round(commScore * 100), weight: 20, styles: [profileA.communicationStyle, profileB.communicationStyle] },
    sparkFactor: { score: Math.round(sparkScore * 100), weight: 10 },
  };

  const totalScore = Math.round(
    interestScore * 40 +
    traitScore * 30 +
    commScore * 20 +
    sparkScore * 10
  );

  return {
    profileId1: profileA.id,
    profileId2: profileB.id,
    score: Math.min(100, Math.max(0, totalScore)),
    breakdown,
  };
}
