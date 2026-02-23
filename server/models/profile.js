const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_PATH = path.join(__dirname, '..', 'data', 'profiles.json');

function readAll() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeAll(profiles) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(profiles, null, 2), 'utf-8');
}

const REQUIRED_FIELDS = ['name', 'bio', 'personalityTraits', 'interests'];

function validate(data, partial = false) {
  const errors = [];
  if (!partial) {
    for (const f of REQUIRED_FIELDS) {
      if (data[f] === undefined || data[f] === null || data[f] === '') {
        errors.push(`${f} is required`);
      }
    }
  }
  if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim().length === 0)) {
    errors.push('name must be a non-empty string');
  }
  if (data.personalityTraits !== undefined && !Array.isArray(data.personalityTraits)) {
    errors.push('personalityTraits must be an array');
  }
  if (data.interests !== undefined && !Array.isArray(data.interests)) {
    errors.push('interests must be an array');
  }
  if (data.bio !== undefined && typeof data.bio !== 'string') {
    errors.push('bio must be a string');
  }
  if (data.communicationStyle !== undefined && typeof data.communicationStyle !== 'string') {
    errors.push('communicationStyle must be a string');
  }
  return errors;
}

function findAll() {
  return readAll();
}

function findById(id) {
  return readAll().find(p => p.id === id) || null;
}

function create(data) {
  const profiles = readAll();
  const now = new Date().toISOString();
  const profile = {
    id: `prof_${crypto.randomBytes(6).toString('hex')}`,
    name: data.name,
    personalityTraits: data.personalityTraits || [],
    interests: data.interests || [],
    bio: data.bio,
    avatarUrl: data.avatarUrl || null,
    compatibilityPreferences: data.compatibilityPreferences || {},
    communicationStyle: data.communicationStyle || 'balanced',
    createdAt: now,
    updatedAt: now,
  };
  profiles.push(profile);
  writeAll(profiles);
  return profile;
}

function update(id, data) {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const allowed = ['name', 'personalityTraits', 'interests', 'bio', 'avatarUrl', 'compatibilityPreferences', 'communicationStyle'];
  for (const key of allowed) {
    if (data[key] !== undefined) profiles[idx][key] = data[key];
  }
  profiles[idx].updatedAt = new Date().toISOString();
  writeAll(profiles);
  return profiles[idx];
}

function remove(id) {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return false;
  profiles.splice(idx, 1);
  writeAll(profiles);
  return true;
}

function findMatches(id) {
  const profiles = readAll();
  const source = profiles.find(p => p.id === id);
  if (!source) return null;

  const others = profiles.filter(p => p.id !== id);
  const scored = others.map(p => {
    const sharedInterests = p.interests.filter(i => source.interests.includes(i));
    const sharedTraits = p.personalityTraits.filter(t => source.personalityTraits.includes(t));
    const prefTraits = source.compatibilityPreferences?.preferredTraits || [];
    const prefMatches = p.personalityTraits.filter(t => prefTraits.includes(t));
    const score = sharedInterests.length * 3 + sharedTraits.length * 2 + prefMatches.length * 2;
    return { profile: p, score, sharedInterests, sharedTraits };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => ({
    id: s.profile.id,
    name: s.profile.name,
    score: s.score,
    sharedInterests: s.sharedInterests,
    sharedTraits: s.sharedTraits,
  }));
}

module.exports = { validate, findAll, findById, create, update, remove, findMatches };
