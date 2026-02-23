import React, { useState, useRef, useCallback } from 'react';
import ProfileCard from './ProfileCard';

const SWIPE_THRESHOLD = 100;
const SWIPE_OUT = 600;

export default function SwipeContainer({ profiles, onSwipe, onEmpty }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exiting, setExiting] = useState(null); // 'left' | 'right'
  const startPos = useRef({ x: 0, y: 0 });

  const current = profiles[currentIndex];
  const next = profiles[currentIndex + 1];

  const handleSwipe = useCallback((direction) => {
    if (exiting) return;
    setExiting(direction);
    const liked = direction === 'right';
    onSwipe?.(current, liked);

    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setExiting(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 350);
  }, [current, exiting, onSwipe]);

  // Pointer events for drag
  const onPointerDown = (e) => {
    if (exiting) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startPos.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const onPointerMove = (e) => {
    if (!drag.active) return;
    setDrag({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
      active: true,
    });
  };

  const onPointerUp = () => {
    if (!drag.active) return;
    if (drag.x > SWIPE_THRESHOLD) handleSwipe('right');
    else if (drag.x < -SWIPE_THRESHOLD) handleSwipe('left');
    else setDrag({ x: 0, y: 0, active: false });
  };

  if (currentIndex >= profiles.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/60 gap-4">
        <span className="text-6xl">💔</span>
        <p className="text-xl">No more profiles!</p>
        <button onClick={onEmpty} className="px-6 py-2 rounded-full bg-pink-600 text-white hover:bg-pink-500 transition">
          Start Over
        </button>
      </div>
    );
  }

  const exitX = exiting === 'right' ? SWIPE_OUT : exiting === 'left' ? -SWIPE_OUT : 0;
  const dx = exiting ? exitX : drag.x;
  const rotation = dx * 0.06;
  const likeOpacity = Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD));
  const passOpacity = Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD));

  return (
    <div className="relative w-full max-w-sm mx-auto" style={{ height: '70vh', maxHeight: 600 }}>
      {/* Next card (behind) */}
      {next && (
        <ProfileCard
          key={next.id}
          profile={next}
          style={{ transform: 'scale(0.95) translateY(12px)', opacity: 0.6 }}
        />
      )}

      {/* Current card */}
      {current && (
        <div
          className="absolute inset-0 z-10 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* LIKE / NOPE stamps */}
          <div className="absolute top-8 left-6 z-30 text-green-400 text-4xl font-black border-4 border-green-400 rounded-xl px-4 py-1 -rotate-12 pointer-events-none transition-opacity"
            style={{ opacity: likeOpacity }}>LIKE</div>
          <div className="absolute top-8 right-6 z-30 text-red-400 text-4xl font-black border-4 border-red-400 rounded-xl px-4 py-1 rotate-12 pointer-events-none transition-opacity"
            style={{ opacity: passOpacity }}>NOPE</div>

          <ProfileCard
            key={current.id}
            profile={current}
            style={{
              transform: `translateX(${dx}px) rotate(${rotation}deg)`,
              opacity: exiting ? 0.5 : 1,
              transition: exiting || !drag.active ? 'transform 0.35s cubic-bezier(.4,0,.2,1), opacity 0.35s ease' : 'none',
            }}
          />
        </div>
      )}

      {/* Buttons */}
      <div className="absolute -bottom-20 left-0 right-0 flex justify-center gap-6 z-20">
        <button
          onClick={() => handleSwipe('left')}
          className="w-16 h-16 rounded-full bg-white/10 border-2 border-red-400/60 text-red-400 text-2xl flex items-center justify-center backdrop-blur-sm hover:bg-red-500/20 hover:scale-110 active:scale-95 transition-all"
        >✕</button>
        <button
          onClick={() => handleSwipe('right')}
          className="w-16 h-16 rounded-full bg-white/10 border-2 border-green-400/60 text-green-400 text-2xl flex items-center justify-center backdrop-blur-sm hover:bg-green-500/20 hover:scale-110 active:scale-95 transition-all"
        >♥</button>
      </div>
    </div>
  );
}
