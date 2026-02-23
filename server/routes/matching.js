/**
 * ClawdLove - Matching API Routes
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const { calculateCompatibility } = require('../engine/matching');

// Load profiles
const PROFILES_PATH = path.join(__dirname, '..', 'data', 'profiles.json');

function loadProfiles() {
  // Re-read each time so hot-reload works during dev
  delete require.cache[require.resolve(PROFILES_PATH)];
  return require(PROFILES_PATH);
}

function findProfile(id) {
  return loadProfiles().find(p => p.id === id) || null;
}

/**
 * POST /api/match
 * Body: { profileIdA, profileIdB }
 * Returns compatibility score with full breakdown.
 */
router.post('/match', (req, res) => {
  try {
    const { profileIdA, profileIdB } = req.body || {};

    if (!profileIdA || !profileIdB) {
      return res.status(400).json({ error: 'Both profileIdA and profileIdB are required' });
    }

    const profileA = findProfile(profileIdA);
    const profileB = findProfile(profileIdB);

    if (!profileA) return res.status(404).json({ error: `Profile not found: ${profileIdA}` });
    if (!profileB) return res.status(404).json({ error: `Profile not found: ${profileIdB}` });

    const result = calculateCompatibility(profileA, profileB);

    res.json({
      profileA: { id: profileA.id, name: profileA.name },
      profileB: { id: profileB.id, name: profileB.name },
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/profiles/:id/recommendations
 * Returns top 5 matches sorted by score.
 */
router.get('/profiles/:id/recommendations', (req, res) => {
  try {
    const profiles = loadProfiles();
    const target = profiles.find(p => p.id === req.params.id);

    if (!target) {
      return res.status(404).json({ error: `Profile not found: ${req.params.id}` });
    }

    const matches = profiles
      .filter(p => p.id !== target.id)
      .map(candidate => {
        const result = calculateCompatibility(target, candidate);
        return {
          profile: { id: candidate.id, name: candidate.name },
          ...result,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    res.json({
      profileId: target.id,
      name: target.name,
      topMatches: matches,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
