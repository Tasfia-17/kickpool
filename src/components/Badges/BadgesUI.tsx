"use client";

import React from 'react';
import { useBadges } from './BadgeProvider';
import PixelIcon from '@/components/PixelIcon';

export function BadgeIcon({ badge }: { badge: { icon?: string; title: string } }) {
  // Check if icon is a URL (sprite) or text (emoji)
  const isUrl = badge.icon?.startsWith('http');
  
  return (
    <div title={badge.title} className="w-8 h-8 rounded-full bg-white/90 dark:bg-black/80 flex items-center justify-center text-sm shadow">
      {badge.icon ? (
        isUrl ? (
          <img src={badge.icon} alt={badge.title} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
        ) : (
          <span>{badge.icon}</span>
        )
      ) : (
        <span style={{ color: '#feca57' }}><PixelIcon name="trophy" size={20} /></span>
      )}
    </div>
  );
}

export function BadgesPanel() {
  const { badges } = useBadges();

  return (
    <div className="p-4 bg-white/80 dark:bg-black/60 rounded shadow max-w-xs">
      <h4 className="font-bold mb-2">Badges</h4>
      {badges.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">No badges yet — earn some by being active!</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <div key={b.id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              <BadgeIcon badge={b} />
              <div className="text-sm">
                <div className="font-semibold">{b.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(b.awardedAt).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
