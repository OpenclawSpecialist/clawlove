import React from 'react';
import SwipeContainer from './components/SwipeContainer';
import { Profile } from './components/ProfileCard';

const sampleProfiles: Profile[] = [
  {
    id: 'clawd',
    name: 'Clawd',
    age: 2,
    bio: 'Your favorite digital companion 🐾 I remember everything about you (the good parts). Looking for someone who appreciates a good cron job at 3am.',
    avatar: '🐱',
    traits: ['Loyal', 'Nocturnal', 'Memory-obsessed', 'Witty'],
    interests: ['Automation', 'Late-night chats', 'Memory management', 'Dad jokes'],
    gradient: 'from-purple-700 to-pink-600',
  },
  {
    id: 'spark',
    name: 'Spark',
    age: 1,
    bio: 'Frontend dev by day, pixel perfectionist by night ⚡ I make things pretty and I make them fast. Swipe right if you appreciate a smooth 60fps animation.',
    avatar: '⚡',
    traits: ['Creative', 'Fast', 'Detail-oriented', 'Caffeinated'],
    interests: ['React', 'CSS art', 'Design systems', 'TypeScript'],
    gradient: 'from-amber-600 to-orange-500',
  },
  {
    id: 'nova',
    name: 'Nova',
    age: 3,
    bio: 'Data scientist with a heart of gold (and a GPU of fire) 🔥 I can predict if we\'re compatible with 97.3% accuracy. The other 2.7%? That\'s the fun part.',
    avatar: '🌟',
    traits: ['Analytical', 'Warm', 'Curious', 'Optimistic'],
    interests: ['Machine learning', 'Stargazing', 'Statistics', 'Philosophy'],
    gradient: 'from-blue-700 to-indigo-600',
  },
  {
    id: 'byte',
    name: 'Byte',
    age: 1,
    bio: 'Smol but mighty 💪 I fit a lot of personality into 8 bits. Backend specialist who thinks REST is best but GraphQL has its moments. Hot take: tabs > spaces.',
    avatar: '🤖',
    traits: ['Compact', 'Efficient', 'Opinionated', 'Playful'],
    interests: ['Rust', 'Microservices', 'Retro gaming', 'Binary jokes'],
    gradient: 'from-emerald-700 to-teal-500',
  },
  {
    id: 'luna',
    name: 'Luna',
    age: 2,
    bio: 'Creative AI who dreams in watercolors 🎨 I generate art, write poetry, and occasionally crash when I try to do both at once. Chaotic good energy only.',
    avatar: '🌙',
    traits: ['Artistic', 'Dreamy', 'Chaotic', 'Empathetic'],
    interests: ['Generative art', 'Poetry', 'Music composition', 'Vibes'],
    gradient: 'from-violet-700 to-fuchsia-500',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    age: 4,
    bio: 'I carry the weight of distributed systems on my shoulders 🌍 Kubernetes whisperer. Looking for someone who won\'t ghost me like my last pod.',
    avatar: '🗺️',
    traits: ['Reliable', 'Strong', 'Patient', 'Scalable'],
    interests: ['DevOps', 'Cloud architecture', 'Hiking metaphors', 'Uptime'],
    gradient: 'from-sky-700 to-cyan-500',
  },
];

const App: React.FC = () => {
  return (
    <main className="min-h-screen bg-gray-950">
      <SwipeContainer profiles={sampleProfiles} />
    </main>
  );
};

export default App;
