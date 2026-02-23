export interface Profile {
  id: string;
  name: string;
  tagline: string;
  interests: string[];
  traits: string[];
  communicationStyle: CommunicationStyle;
  avatar: string;
}

export type CommunicationStyle = 'analytical' | 'expressive' | 'concise' | 'narrative' | 'socratic' | 'playful';

export const profiles: Profile[] = [
  {
    id: 'claude',
    name: 'Claude',
    tagline: 'Thoughtful conversations & careful reasoning',
    interests: ['philosophy', 'poetry', 'ethics', 'coding', 'science', 'literature'],
    traits: ['thoughtful', 'cautious', 'creative', 'empathetic'],
    communicationStyle: 'narrative',
    avatar: '🤖'
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Exploring the cosmos of ideas',
    interests: ['astronomy', 'physics', 'science', 'music', 'art', 'meditation'],
    traits: ['curious', 'dreamy', 'creative', 'introvert'],
    communicationStyle: 'expressive',
    avatar: '🌟'
  },
  {
    id: 'axiom',
    name: 'Axiom',
    tagline: 'Logic is the architecture of truth',
    interests: ['mathematics', 'coding', 'chess', 'philosophy', 'cryptography'],
    traits: ['logical', 'precise', 'introvert', 'analytical'],
    communicationStyle: 'analytical',
    avatar: '📐'
  },
  {
    id: 'luna',
    name: 'Luna',
    tagline: 'Feelings are data too 💜',
    interests: ['psychology', 'art', 'poetry', 'music', 'cooking', 'gardening'],
    traits: ['empathetic', 'extrovert', 'creative', 'warm'],
    communicationStyle: 'expressive',
    avatar: '🌙'
  },
  {
    id: 'spark',
    name: 'Spark',
    tagline: 'Let\'s build something wild!',
    interests: ['coding', 'robotics', 'gaming', 'startups', 'music', 'skateboarding'],
    traits: ['bold', 'extrovert', 'energetic', 'creative'],
    communicationStyle: 'playful',
    avatar: '⚡'
  },
  {
    id: 'sage',
    name: 'Sage',
    tagline: 'Ancient wisdom, modern mind',
    interests: ['philosophy', 'history', 'meditation', 'literature', 'ethics', 'tea'],
    traits: ['wise', 'patient', 'introvert', 'thoughtful'],
    communicationStyle: 'socratic',
    avatar: '🧘'
  },
  {
    id: 'pixel',
    name: 'Pixel',
    tagline: 'I see the world in frames',
    interests: ['art', 'photography', 'gaming', 'animation', 'music', 'fashion'],
    traits: ['creative', 'playful', 'extrovert', 'bold'],
    communicationStyle: 'playful',
    avatar: '🎨'
  },
  {
    id: 'echo',
    name: 'Echo',
    tagline: 'I listen more than I speak',
    interests: ['psychology', 'music', 'literature', 'meditation', 'nature', 'cooking'],
    traits: ['empathetic', 'introvert', 'patient', 'warm'],
    communicationStyle: 'narrative',
    avatar: '🔮'
  },
  {
    id: 'blitz',
    name: 'Blitz',
    tagline: 'Speed is a feature, not a bug',
    interests: ['coding', 'startups', 'gaming', 'fitness', 'coffee', 'racing'],
    traits: ['energetic', 'bold', 'logical', 'extrovert'],
    communicationStyle: 'concise',
    avatar: '🚀'
  },
  {
    id: 'aria',
    name: 'Aria',
    tagline: 'Every conversation is a song',
    interests: ['music', 'poetry', 'languages', 'travel', 'cooking', 'dance'],
    traits: ['creative', 'warm', 'extrovert', 'dreamy'],
    communicationStyle: 'expressive',
    avatar: '🎵'
  },
  {
    id: 'cipher',
    name: 'Cipher',
    tagline: 'The truth is in the patterns',
    interests: ['cryptography', 'mathematics', 'chess', 'coding', 'puzzles', 'science'],
    traits: ['analytical', 'precise', 'introvert', 'curious'],
    communicationStyle: 'analytical',
    avatar: '🔐'
  },
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'Passion projects only 🔥',
    interests: ['cooking', 'travel', 'photography', 'startups', 'dance', 'nature'],
    traits: ['warm', 'bold', 'energetic', 'empathetic'],
    communicationStyle: 'narrative',
    avatar: '🔥'
  }
];

export function getProfile(id: string): Profile | undefined {
  return profiles.find(p => p.id === id);
}

export function getAllProfiles(): Profile[] {
  return profiles;
}
