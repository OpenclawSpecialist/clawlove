import React, { useState, useRef, useCallback } from 'react';
import ProfileCard, { Profile } from './ProfileCard';
import MatchScreen from './MatchScreen';

interface SwipeContainerProps {
  profiles: Profile[];
}

const SWIPE_THRESHOLD = 100;
const MATCH_CHANCE = 0.4; // 40% chance of match on like

const SwipeContainer: React.FC<SwipeContainerProps> = ({ profiles }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Profile[]>([]);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentProfile = profiles[currentIndex];
  const isFinished = currentIndex >= profiles.length;

  const handleSwipeComplete = useCallback(
    (dir: 'left' | 'right') => {
      if (dir === 'right' && currentProfile) {
        const isMatch = Math.random() < MATCH_CHANCE;
        if (isMatch) {
          setLikedProfiles((prev) => [...prev, currentProfile]);
          setTimeout(() => {
            setMatchedProfile(currentProfile);
          }, 500);
        }
      }
      setSwipeDir(dir);
      setTimeout(() => {
        setSwipeDir(null);
        setDragX(0);
        setCurrentIndex((i) => i + 1);
      }, 450);
    },
    [currentProfile]
  );

  // Pointer events for unified mouse+touch
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragX(e.clientX - startX.current);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD) {
      handleSwipeComplete('right');
    } else if (dragX < -SWIPE_THRESHOLD) {
      handleSwipeComplete('left');
    } else {
      setDragX(0);
    }
  };

  const overlay: 'like' | 'nope' | null =
    dragX > 50 ? 'like' : dragX < -50 ? 'nope' : null;

  const rotation = dragX * 0.08;
  const opacity = Math.max(1 - Math.abs(dragX) / 500, 0.5);

  if (matchedProfile) {
    return (
      <MatchScreen
        matchedProfile={matchedProfile}
        yourProfile={{
          id: 'you',
          name: 'You',
          age: 0,
          bio: '',
          avatar: '🧑‍💻',
          traits: [],
          interests: [],
          gradient: 'from-blue-600 to-cyan-500',
        }}
        onKeepSwiping={() => setMatchedProfile(null)}
        onSendMessage={() => {
          alert('💌 Message sent! (Coming soon)');
          setMatchedProfile(null);
        }}
      />
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-7xl mb-6">💔</div>
        <h2 className="text-2xl font-bold text-white mb-3">No more profiles!</h2>
        <p className="text-gray-400 mb-6">
          You've seen everyone. Check back later for new AI agents.
        </p>
        {likedProfiles.length > 0 && (
          <p className="text-pink-400 text-sm">
            You matched with {likedProfiles.length} agent{likedProfiles.length > 1 ? 's' : ''}! 💕
          </p>
        )}
        <button
          onClick={() => {
            setCurrentIndex(0);
            setLikedProfiles([]);
          }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full font-semibold hover:scale-105 transition-transform"
        >
          Start Over
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-6 gap-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-pink-400">
        <span className="text-2xl">🐾</span>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          ClawLove
        </h1>
      </div>

      {/* Card Area */}
      <div
        ref={cardRef}
        className={`w-full max-w-sm touch-none ${
          swipeDir === 'left'
            ? 'animate-swipe-left'
            : swipeDir === 'right'
            ? 'animate-swipe-right'
            : !isDragging
            ? 'animate-card-enter'
            : ''
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={
          !swipeDir
            ? {
                transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
                opacity,
                transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
                cursor: isDragging ? 'grabbing' : 'grab',
              }
            : undefined
        }
      >
        <ProfileCard profile={currentProfile} overlay={overlay} />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => handleSwipeComplete('left')}
          className="w-16 h-16 rounded-full bg-gray-800 border-2 border-red-400/50 flex items-center justify-center text-3xl hover:bg-red-500/20 hover:border-red-400 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg"
          aria-label="Pass"
        >
          ✕
        </button>
        <button
          onClick={() => handleSwipeComplete('right')}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-4xl hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg shadow-pink-500/30 animate-pulse-glow"
          aria-label="Like"
        >
          ❤️
        </button>
        <button
          onClick={() => handleSwipeComplete('right')}
          className="w-16 h-16 rounded-full bg-gray-800 border-2 border-cyan-400/50 flex items-center justify-center text-3xl hover:bg-cyan-500/20 hover:border-cyan-400 hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg"
          aria-label="Super Like"
        >
          ⭐
        </button>
      </div>

      {/* Counter */}
      <p className="text-gray-500 text-sm">
        {currentIndex + 1} / {profiles.length}
      </p>
    </div>
  );
};

export default SwipeContainer;
