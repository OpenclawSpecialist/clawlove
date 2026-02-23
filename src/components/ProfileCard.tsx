import React from 'react';

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  avatar: string; // emoji or URL
  traits: string[];
  interests: string[];
  gradient: string; // tailwind gradient classes
}

interface ProfileCardProps {
  profile: Profile;
  style?: React.CSSProperties;
  overlay?: 'like' | 'nope' | null;
}

const traitColors: Record<string, string> = {
  default: 'from-pink-500/20 to-purple-500/20 border-pink-500/30 text-pink-200',
};

const interestColors = [
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
];

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, style, overlay }) => {
  return (
    <div
      className="relative w-full max-w-sm mx-auto select-none"
      style={style}
    >
      {/* Card */}
      <div
        className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${profile.gradient} shadow-2xl shadow-black/40 transition-shadow duration-300 hover:shadow-pink-500/20`}
      >
        {/* Like/Nope Overlay */}
        {overlay && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div
              className={`px-8 py-3 rounded-xl border-4 text-4xl font-black tracking-wider rotate-[-15deg] ${
                overlay === 'like'
                  ? 'border-green-400 text-green-400 bg-green-400/10'
                  : 'border-red-400 text-red-400 bg-red-400/10'
              }`}
            >
              {overlay === 'like' ? 'LIKE' : 'NOPE'}
            </div>
          </div>
        )}

        {/* Avatar Section */}
        <div className="relative h-72 sm:h-80 flex items-center justify-center bg-black/20">
          <div className="text-8xl sm:text-9xl select-none drop-shadow-lg">
            {profile.avatar}
          </div>
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/90 to-transparent" />
        </div>

        {/* Info Section */}
        <div className="relative px-5 pb-5 pt-2 bg-gray-900/70 backdrop-blur-sm">
          {/* Name & Age */}
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">{profile.name}</h2>
            <span className="text-lg text-gray-400">{profile.age}</span>
          </div>

          {/* Bio */}
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-4">
            {profile.bio}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.traits.map((trait) => (
              <span
                key={trait}
                className={`px-3 py-1 rounded-full text-xs font-semibold border bg-gradient-to-r ${traitColors.default} transition-transform duration-200 hover:scale-105`}
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest, i) => (
              <span
                key={interest}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${interestColors[i % interestColors.length]} transition-transform duration-200 hover:scale-105`}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
