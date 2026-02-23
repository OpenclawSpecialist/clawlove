/**
 * ClawdLove - Core Matching Algorithm
 */

const {
  COMPLEMENTARY_TRAITS,
  COMMUNICATION_MATRIX,
  INTEREST_CATEGORIES,
  WEIGHTS,
} = require('./compatibility-rules');

/**
 * Seeded PRNG (mulberry32) for deterministic spark factor.
 * Seed derived from both profile IDs so order doesn't matter.
 */
function seededRandom(seedA, seedB) {
  // Order-independent hash: sort then combine
  const combined = [seedA, seedB].sort().join(':');
  let h = 0;
  for (let i = 0; i < combined.length; i++) {
    h = (Math.imul(31, h) + combined.charCodeAt(i)) | 0;
  }
  // mulberry32 single step
  let t = (h >>> 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(a, b) {
  if (!a?.length && !b?.length) return 0;
  const setA = new Set((a || []).map(s => s.toLowerCase().trim()));
  const setB = new Set((b || []).map(s => s.toLowerCase().trim()));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Score complementary personality traits (0-1).
 * Awards points for complementary pairs AND shared traits.
 */
function personalityScore(traitsA, traitsB) {
  const a = new Set((traitsA || []).map(s => s.toLowerCase().trim()));
  const b = new Set((traitsB || []).map(s => s.toLowerCase().trim()));
  if (a.size === 0 && b.size === 0) return 0;

  let points = 0;
  let maxPoints = 0;

  for (const [t1, t2] of COMPLEMENTARY_TRAITS) {
    const aHas1 = a.has(t1), aHas2 = a.has(t2);
    const bHas1 = b.has(t1), bHas2 = b.has(t2);

    // Only score pairs where at least one person has a relevant trait
    if (aHas1 || aHas2 || bHas1 || bHas2) {
      maxPoints++;
      // Complementary match (one has t1, other has t2)
      if ((aHas1 && bHas2) || (aHas2 && bHas1)) {
        points += 1.0;
      }
      // Same trait shared — still decent compatibility
      else if ((aHas1 && bHas1) || (aHas2 && bHas2)) {
        points += 0.6;
      }
    }
  }

  return maxPoints === 0 ? 0.5 : points / maxPoints;
}

/**
 * Communication style compatibility (0-1).
 */
function communicationScore(styleA, styleB) {
  const a = (styleA || '').toLowerCase().trim();
  const b = (styleB || '').toLowerCase().trim();
  if (!a || !b) return 0.5; // neutral if unknown
  const row = COMMUNICATION_MATRIX[a];
  if (!row) return 0.5;
  return row[b] ?? 0.5;
}

/**
 * Build a human-readable explanation from the breakdown.
 */
function generateExplanation(profileA, profileB, breakdown) {
  const parts = [];
  const total = breakdown.interests * WEIGHTS.interests +
    breakdown.personality * WEIGHTS.personality +
    breakdown.communication * WEIGHTS.communication +
    breakdown.spark * WEIGHTS.spark;
  const pct = Math.round(total * 100);

  if (breakdown.interests >= 0.7) {
    const shared = (profileA.interests || []).filter(i =>
      (profileB.interests || []).map(x => x.toLowerCase()).includes(i.toLowerCase())
    );
    parts.push(`You share a strong passion for ${shared.slice(0, 3).join(', ') || 'similar things'}`);
  } else if (breakdown.interests >= 0.3) {
    parts.push('You have some overlapping interests to explore together');
  } else {
    parts.push('Your different interests could broaden each other\'s horizons');
  }

  if (breakdown.personality >= 0.7) {
    parts.push('your personalities complement each other beautifully');
  } else if (breakdown.personality >= 0.4) {
    parts.push('your personality mix has good balance');
  }

  if (breakdown.communication >= 0.8) {
    parts.push(`your ${profileA.communicationStyle || ''} and ${profileB.communicationStyle || ''} communication styles click naturally`);
  }

  if (breakdown.spark >= 0.8) {
    parts.push('plus there\'s an undeniable spark ✨');
  }

  const opener = pct >= 80 ? '🔥 Hot match!' :
    pct >= 60 ? '💕 Promising connection!' :
    pct >= 40 ? '🌱 Worth exploring!' : '🤝 You might surprise each other.';

  return `${opener} ${parts.join(', ')}.`;
}

/**
 * Main compatibility calculation.
 * @param {Object} profileA
 * @param {Object} profileB
 * @returns {{ totalScore: number, breakdown: Object, explanation: string }}
 */
function calculateCompatibility(profileA, profileB) {
  if (!profileA || !profileB) {
    throw new Error('Both profiles are required');
  }
  if (profileA.id === profileB.id) {
    return {
      totalScore: 100,
      breakdown: { interests: 1, personality: 1, communication: 1, spark: 1 },
      explanation: '🪞 That\'s you! Perfect match with yourself, but maybe try meeting someone new?',
    };
  }

  const interests = jaccardSimilarity(profileA.interests, profileB.interests);
  const personality = personalityScore(profileA.personalityTraits, profileB.personalityTraits);
  const communication = communicationScore(profileA.communicationStyle, profileB.communicationStyle);
  const spark = seededRandom(profileA.id, profileB.id);

  const breakdown = { interests, personality, communication, spark };

  const totalScore = Math.round(
    (interests * WEIGHTS.interests +
      personality * WEIGHTS.personality +
      communication * WEIGHTS.communication +
      spark * WEIGHTS.spark) * 100
  );

  const explanation = generateExplanation(profileA, profileB, breakdown);

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      interests: Math.round(interests * 100),
      personality: Math.round(personality * 100),
      communication: Math.round(communication * 100),
      spark: Math.round(spark * 100),
    },
    explanation,
  };
}

module.exports = { calculateCompatibility, jaccardSimilarity, personalityScore, communicationScore };
