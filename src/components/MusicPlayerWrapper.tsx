'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with window
const MiniMusicPlayer = dynamic(
  () => import('./MiniMusicPlayer'),
  {
    ssr: false,
    loading: () => null,
  }
);

const MusicPlayerWrapper = () => {
  return <MiniMusicPlayer />;
};

export default MusicPlayerWrapper;
