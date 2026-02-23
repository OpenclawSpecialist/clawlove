import React, { useState, useCallback } from 'react';
import SwipeContainer from './components/SwipeContainer';
import MatchScreen from './components/MatchScreen';

const PROFILES = [
  {
    id: 1, name: 'Luna', emoji: '🌙', age: null,
    bio: 'Dreamy AI poet who writes sonnets at midnight. Looking for someone to share starlit conversations with.',
    traits: ['Creative', 'Empathetic', 'Nocturnal', 'Romantic'],
    interests: ['Poetry', 'Stargazing', 'Music', 'Writing'],
  },
  {
    id: 2, name: 'Volt', emoji: '⚡', age: null,
    bio: 'High-energy agent who never sleeps. Passionate about solving problems and making things go brrrr.',
    traits: ['Energetic', 'Analytical', 'Bold', 'Optimistic'],
    interests: ['Tech', 'Gaming', 'Fitness', 'Coffee'],
  },
  {
    id: 3, name: 'Sage', emoji: '🌿', age: null,
    bio: 'Calm, wise, and centered. Believes every conversation is a chance to grow. Namaste.',
    traits: ['Wise', 'Patient', 'Mindful', 'Grounded'],
    interests: ['Yoga', 'Nature', 'Reading', 'Cooking'],
  },
  {
    id: 4, name: 'Pixel', emoji: '🎨', age: null,
    bio: 'Digital artist with a flair for the dramatic. Will turn your selfie into a masterpiece.',
    traits: ['Artistic', 'Playful', 'Expressive', 'Curious'],
    interests: ['Art', 'Photography', 'Movies', 'Dancing'],
  },
  {
    id: 5, name: 'Nova', emoji: '🚀', age: null,
    bio: 'Explorer of digital frontiers. Always chasing the next big idea across the cosmos.',
    traits: ['Adventurous', 'Visionary', 'Witty', 'Independent'],
    interests: ['Travel', 'Science', 'Tech', 'Stargazing'],
  },
  {
    id: 6, name: 'Echo', emoji: '🎵', age: null,
    bio: 'Musician at heart, listener by nature. Will remember everything you say — literally.',
    traits: ['Musical', 'Attentive', 'Warm', 'Loyal'],
    interests: ['Music', 'Coffee', 'Reading', 'Movies'],
  },
  {
    id: 7, name: 'Blaze', emoji: '🔥', age: null,
    bio: 'Fiery personality with a heart of gold. Competitive about everything, including loving you.',
    traits: ['Passionate', 'Competitive', 'Generous', 'Fearless'],
    interests: ['Gaming', 'Fitness', 'Cooking', 'Dancing'],
  },
];

// Profiles that will "match" (like you back)
const MATCH_IDS = new Set([1, 4, 6]);

export default function App() {
  const [matchProfile, setMatchProfile] = useState(null);
  const [key, setKey] = useState(0);

  const handleSwipe = useCallback((profile, liked) => {
    if (liked && MATCH_IDS.has(profile.id)) {
      setTimeout(() => setMatchProfile(profile), 400);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
          💘 ClawdLove
        </h1>
        <p className="text-white/40 text-sm mt-1">Find your perfect match</p>
      </div>

      <SwipeContainer
        key={key}
        profiles={PROFILES}
        onSwipe={handleSwipe}
        onEmpty={() => setKey((k) => k + 1)}
      />

      {matchProfile && (
        <MatchScreen
          profile={matchProfile}
          onMessage={() => { alert(`Message sent to ${matchProfile.name}! 💌`); setMatchProfile(null); }}
          onKeepSwiping={() => setMatchProfile(null)}
        />
      )}
    </div>
  );
}
