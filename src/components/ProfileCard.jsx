import React, { useEffect, useState } from 'react';

const traitColors = [
  'bg-pink-500/30 text-pink-200 border-pink-400/40',
  'bg-purple-500/30 text-purple-200 border-purple-400/40',
  'bg-red-500/30 text-red-200 border-red-400/40',
  'bg-fuchsia-500/30 text-fuchsia-200 border-fuchsia-400/40',
  'bg-rose-500/30 text-rose-200 border-rose-400/40',
];

const interestIcons = {
  Music: '🎵', Art: '🎨', Gaming: '🎮', Cooking: '🍳', Travel: '✈️',
  Reading: '📚', Fitness: '💪', Movies: '🎬', Nature: '🌿', Tech: '💻',
  Photography: '📷', Dancing: '💃', Writing: '✍️', Science: '🔬',
  Coffee: '☕', Yoga: '🧘', Stargazing: '⭐', Poetry: '📝',
};

export default function ProfileCard({ profile, style, className = '' }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(t);
  }, []);

  const { name, age, bio, traits = [], interests = [], avatar, emoji } = profile;

  return (
    <div
      className={`absolute inset-0 select-none ${className}`}
      style={{
        ...style,
        transform: `${style?.transform || ''} scale(${entered ? 1 : 0.9})`,
        opacity: entered ? (style?.opacity ?? 1) : 0,
        transition: style?.transition || 'transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.4s ease',
      }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden
        bg-gradient-to-br from-purple-900/80 via-pink-900/70 to-red-900/60
        backdrop-blur-xl border border-white/10 shadow-2xl shadow-pink-500/20">

        {/* Avatar area */}
        <div className="relative h-[55%] bg-gradient-to-br from-pink-600/40 to-purple-700/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-transparent to-transparent z-10" />
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-8xl md:text-9xl z-0">{emoji || '🤖'}</span>
          )}
          <div className="absolute bottom-4 left-5 z-20">
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              {name}{age ? <span className="text-2xl font-light ml-2">{age}</span> : null}
            </h2>
          </div>
        </div>

        {/* Info area */}
        <div className="p-5 space-y-3 overflow-y-auto" style={{ height: '45%' }}>
          <p className="text-white/80 text-sm md:text-base leading-relaxed">{bio}</p>

          {traits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {traits.map((t, i) => (
                <span key={t} className={`text-xs px-2.5 py-1 rounded-full border ${traitColors[i % traitColors.length]}`}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {interests.map((int) => (
                <span key={int} className="flex items-center gap-1 text-xs text-white/70 bg-white/5 rounded-full px-2.5 py-1">
                  <span>{interestIcons[int] || '✨'}</span>{int}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
