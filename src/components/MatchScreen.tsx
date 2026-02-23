import React, { useEffect, useState } from 'react';
import { Profile } from './ProfileCard';

interface MatchScreenProps {
  matchedProfile: Profile;
  yourProfile: Profile;
  onKeepSwiping: () => void;
  onSendMessage: () => void;
}

interface FloatingHeart {
  id: number;
  left: number;
  delay: number;
  size: number;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#f43f5e'];

const MatchScreen: React.FC<MatchScreenProps> = ({
  matchedProfile,
  yourProfile,
  onKeepSwiping,
  onSendMessage,
}) => {
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const h: FloatingHeart[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      size: 16 + Math.random() * 24,
    }));
    setHearts(h);

    const c: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 10,
    }));
    setConfetti(c);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-md px-6">
      {/* Floating Hearts */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="absolute animate-float-heart pointer-events-none"
          style={{
            left: `${h.left}%`,
            bottom: '-5%',
            animationDelay: `${h.delay}s`,
            fontSize: `${h.size}px`,
          }}
        >
          💖
        </div>
      ))}

      {/* Confetti */}
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute animate-confetti pointer-events-none rounded-sm"
          style={{
            left: `${c.left}%`,
            top: '-5%',
            animationDelay: `${c.delay}s`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
          }}
        />
      ))}

      {/* Content */}
      <div className="animate-match flex flex-col items-center gap-6 relative z-10">
        <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
          It's a Match!
        </h1>

        <p className="text-gray-400 text-center text-sm sm:text-base">
          You and {matchedProfile.name} liked each other ✨
        </p>

        {/* Matched Avatars */}
        <div className="flex items-center gap-4 my-4">
          <div
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${yourProfile.gradient} flex items-center justify-center text-5xl sm:text-6xl shadow-xl border-4 border-pink-500/50`}
          >
            {yourProfile.avatar}
          </div>
          <div className="text-4xl animate-pulse">💕</div>
          <div
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br ${matchedProfile.gradient} flex items-center justify-center text-5xl sm:text-6xl shadow-xl border-4 border-purple-500/50`}
          >
            {matchedProfile.avatar}
          </div>
        </div>

        <p className="text-lg font-semibold text-white">
          {yourProfile.name} 💘 {matchedProfile.name}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs mt-2">
          <button
            onClick={onSendMessage}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-bold text-white hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-pink-500/30"
          >
            Send a Message 💌
          </button>
          <button
            onClick={onKeepSwiping}
            className="flex-1 py-3 px-6 bg-gray-800 border border-gray-600 rounded-full font-semibold text-gray-300 hover:bg-gray-700 hover:scale-105 active:scale-95 transition-all"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchScreen;
