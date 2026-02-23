import React, { useEffect, useState } from 'react';

function Heart({ style }) {
  return <span className="absolute text-pink-400 animate-ping pointer-events-none" style={style}>💖</span>;
}

export default function MatchScreen({ profile, onMessage, onKeepSwiping }) {
  const [show, setShow] = useState(false);
  const [hearts, setHearts] = useState([]);

  useEffect(() => {
    setTimeout(() => setShow(true), 50);
    // Generate random hearts/confetti
    const h = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      fontSize: 12 + Math.random() * 24,
      animationDelay: `${Math.random() * 2}s`,
      animationDuration: `${1 + Math.random() * 2}s`,
    }));
    setHearts(h);
  }, []);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500
      ${show ? 'bg-black/70 backdrop-blur-md' : 'bg-transparent'}`}>

      {/* Floating hearts */}
      {hearts.map((h) => (
        <Heart key={h.id} style={{ left: h.left, top: h.top, fontSize: h.fontSize, animationDelay: h.animationDelay, animationDuration: h.animationDuration }} />
      ))}

      <div className={`relative flex flex-col items-center gap-6 p-8 transition-all duration-700
        ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>

        {/* Title */}
        <div className="text-center">
          <div className="text-6xl mb-2">💕</div>
          <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-pink-400 via-red-400 to-purple-400 bg-clip-text text-transparent">
            It's a Match!
          </h1>
          <p className="text-white/60 mt-2">You and {profile.name} liked each other</p>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
          <span className="text-7xl">{profile.emoji || '🤖'}</span>
          <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
          <p className="text-white/50 text-sm text-center max-w-xs">{profile.bio}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-2">
          <button
            onClick={onMessage}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold hover:from-pink-400 hover:to-red-400 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/30"
          >
            💬 Send Message
          </button>
          <button
            onClick={onKeepSwiping}
            className="px-8 py-3 rounded-full bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 hover:scale-105 active:scale-95 transition-all"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}
