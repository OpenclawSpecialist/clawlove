import express from 'express';
import { getAllProfiles, getProfile } from './profiles';
import { calculateMatch } from './match';

const app = express();
app.use(express.json());

// GET /api/profiles — list all profiles
app.get('/api/profiles', (_req, res) => {
  res.json(getAllProfiles());
});

// GET /api/profiles/:id/recommendations — top 5 matches
app.get('/api/profiles/:id/recommendations', (req, res) => {
  const profile = getProfile(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  const others = getAllProfiles().filter(p => p.id !== profile.id);
  const results = others
    .map(other => calculateMatch(profile, other))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  res.json({ profileId: profile.id, recommendations: results });
});

// POST /api/match — match two profiles
app.post('/api/match', (req, res) => {
  const { profileId1, profileId2 } = req.body;
  if (!profileId1 || !profileId2) {
    return res.status(400).json({ error: 'profileId1 and profileId2 required' });
  }

  const p1 = getProfile(profileId1);
  const p2 = getProfile(profileId2);
  if (!p1) return res.status(404).json({ error: `Profile '${profileId1}' not found` });
  if (!p2) return res.status(404).json({ error: `Profile '${profileId2}' not found` });

  res.json(calculateMatch(p1, p2));
});

const PORT = process.env.PORT || 3141;
app.listen(PORT, () => {
  console.log(`💘 ClawLove API running on http://localhost:${PORT}`);
});

export default app;
