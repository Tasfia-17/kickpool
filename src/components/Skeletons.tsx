'use client';

import React from 'react';

// Base skeleton with shimmer animation
function SkeletonBase({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`relative overflow-hidden bg-purple-800/40 rounded ${className}`}
      style={style}
    >
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
      />
    </div>
  );
}

// Video player skeleton
export function VideoPlayerSkeleton() {
  return (
    <div className="w-full aspect-video bg-purple-900/50 rounded-xl overflow-hidden relative">
      <SkeletonBase className="absolute inset-0" />
      {/* Play button placeholder */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-purple-700/50 flex items-center justify-center">
          <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-purple-500/50 border-b-8 border-b-transparent ml-1" />
        </div>
      </div>
      {/* Controls placeholder */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <SkeletonBase className="h-1 w-full mb-3" />
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-8 h-8 rounded-full" />
          <SkeletonBase className="w-8 h-8 rounded-full" />
          <SkeletonBase className="w-16 h-4 rounded" />
          <div className="flex-1" />
          <SkeletonBase className="w-8 h-8 rounded-full" />
          <SkeletonBase className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Chat message skeleton
export function ChatMessageSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-2" style={{ opacity: 1 - i * 0.15 }}>
          <SkeletonBase className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <SkeletonBase className="w-20 h-3 rounded" />
              <SkeletonBase className="w-12 h-2 rounded" />
            </div>
            <SkeletonBase 
              className="h-4 rounded" 
              style={{ width: `${60 + Math.random() * 35}%` }} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// User list skeleton
export function UserListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-purple-800/20">
          <SkeletonBase className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <SkeletonBase className="w-24 h-4 rounded mb-1" />
            <SkeletonBase className="w-16 h-3 rounded" />
          </div>
          <SkeletonBase className="w-6 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Room card skeleton
export function RoomCardSkeleton() {
  return (
    <div className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/30">
      <SkeletonBase className="w-full aspect-video rounded-lg mb-3" />
      <SkeletonBase className="w-3/4 h-5 rounded mb-2" />
      <SkeletonBase className="w-1/2 h-3 rounded mb-3" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SkeletonBase className="w-6 h-6 rounded-full" />
          <SkeletonBase className="w-20 h-3 rounded" />
        </div>
        <SkeletonBase className="w-16 h-6 rounded" />
      </div>
    </div>
  );
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Avatar and name */}
      <div className="flex items-center gap-4 mb-6">
        <SkeletonBase className="w-24 h-24 rounded-full" />
        <div className="flex-1">
          <SkeletonBase className="w-40 h-7 rounded mb-2" />
          <SkeletonBase className="w-32 h-4 rounded mb-1" />
          <SkeletonBase className="w-24 h-3 rounded" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-purple-800/30 rounded-lg p-4 text-center">
            <SkeletonBase className="w-12 h-8 rounded mx-auto mb-2" />
            <SkeletonBase className="w-20 h-3 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Badges */}
      <SkeletonBase className="w-24 h-5 rounded mb-3" />
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBase key={i} className="w-12 h-12 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// Achievement card skeleton
export function AchievementSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-purple-900/40 rounded-xl p-4 border border-purple-700/30">
          <SkeletonBase className="w-12 h-12 rounded-lg mx-auto mb-3" />
          <SkeletonBase className="w-3/4 h-4 rounded mx-auto mb-2" />
          <SkeletonBase className="w-full h-3 rounded mb-1" />
          <SkeletonBase className="w-2/3 h-3 rounded mx-auto" />
        </div>
      ))}
    </div>
  );
}

// Queue item skeleton
export function QueueItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-purple-800/20">
          <SkeletonBase className="w-20 h-12 rounded" />
          <div className="flex-1">
            <SkeletonBase className="w-3/4 h-4 rounded mb-1" />
            <SkeletonBase className="w-1/2 h-3 rounded" />
          </div>
          <SkeletonBase className="w-8 h-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-purple-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <SkeletonBase className="w-32 h-8 rounded" />
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-8 h-8 rounded-full" />
          <SkeletonBase className="w-24 h-8 rounded" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <VideoPlayerSkeleton />
        </div>
        <div className="bg-purple-900/30 rounded-xl">
          <ChatMessageSkeleton />
        </div>
      </div>
    </div>
  );
}

// Add shimmer animation to global styles
export const shimmerKeyframes = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`;
