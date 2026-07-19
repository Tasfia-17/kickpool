'use client';

import { useEffect, useRef } from 'react';

const STREAM_URLS = {
    heavyRain: 'https://archive.org/download/ytmp3free.cc_rain-sound-effect-rain-sounds-no-copyright-sound-effect-youtubemp3free.org/ytmp3free.cc_rain-sound-effect-rain-sounds-no-copyright-sound-effect-youtubemp3free.org.mp3',
    wind: 'https://archive.org/download/cold-winter-wind-sound-effect/Cold-winter-wind-sound-effect.mp3',
    thunder: 'https://archive.org/download/thunder-sound-effect/Thunder%20%20%20Sound%20effect.mp3',
    birds: 'https://archive.org/download/morningbirdssingingringtones/Morning%20Birds%20Singing%20Ringtones.mp3',
    lofiRadio: 'https://stream.zeno.fm/f3wvbbqmdg8uv'
};

interface AmbiencePlayerProps {
  rain: boolean;
  wind?: boolean;
  lightning?: boolean;
  birds?: boolean;
  focusTone?: boolean;
  focusToneType?: 'brown-noise' | 'pink-noise' | 'vinyl';
  rainVolume?: number;
  windVolume?: number;
  lightningVolume?: number;
  birdsVolume?: number;
  focusToneVolume?: number;
}

export function AmbiencePlayer({
  rain,
  wind = false,
  lightning = false,
  birds = false,
  focusTone = false,
  rainVolume = 0,
  windVolume = 0,
  lightningVolume = 0,
  birdsVolume = 0,
  focusToneVolume = 0,
}: AmbiencePlayerProps) {
  const rainRef = useRef<HTMLAudioElement>(null);
  const windRef = useRef<HTMLAudioElement>(null);
  const birdsRef = useRef<HTMLAudioElement>(null);
  const lofiRef = useRef<HTMLAudioElement>(null);
  const thunderRef = useRef<HTMLAudioElement>(null);

  const safePlay = (audio: HTMLAudioElement | null) => {
    if (audio && audio.paused) {
      audio.play().catch(e => console.warn('Audio play failed:', e));
    }
  };

  const safePause = (audio: HTMLAudioElement | null) => {
    if (audio && !audio.paused) {
      audio.pause();
    }
  };

  useEffect(() => {
    if (rain) safePlay(rainRef.current); else safePause(rainRef.current);
    if (wind) safePlay(windRef.current); else safePause(windRef.current);
    if (birds) safePlay(birdsRef.current); else safePause(birdsRef.current);
    if (focusTone) safePlay(lofiRef.current); else safePause(lofiRef.current);
  }, [rain, wind, birds, focusTone]);

  useEffect(() => {
    if (rainRef.current) rainRef.current.volume = Math.max(0, Math.min(1, rainVolume / 100));
  }, [rainVolume]);

  useEffect(() => {
    if (windRef.current) windRef.current.volume = Math.max(0, Math.min(1, windVolume / 100));
  }, [windVolume]);

  useEffect(() => {
    if (birdsRef.current) birdsRef.current.volume = Math.max(0, Math.min(1, birdsVolume / 100));
  }, [birdsVolume]);

  useEffect(() => {
    if (lofiRef.current) lofiRef.current.volume = Math.max(0, Math.min(1, focusToneVolume / 100));
  }, [focusToneVolume]);

  useEffect(() => {
    if (thunderRef.current) thunderRef.current.volume = Math.max(0, Math.min(1, lightningVolume / 100));
    
    let interval: NodeJS.Timeout;
    if (lightning) {
      safePlay(thunderRef.current);
      interval = setInterval(() => {
         if (thunderRef.current) {
            thunderRef.current.currentTime = 0;
            safePlay(thunderRef.current);
         }
      }, 15000 + Math.random() * 20000);
    } else {
      safePause(thunderRef.current);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lightning, lightningVolume]);

  return (
    <div style={{ display: 'none' }}>
      <audio ref={rainRef} src={STREAM_URLS.heavyRain} loop crossOrigin="anonymous" />
      <audio ref={windRef} src={STREAM_URLS.wind} loop crossOrigin="anonymous" />
      <audio ref={birdsRef} src={STREAM_URLS.birds} loop crossOrigin="anonymous" />
      <audio ref={lofiRef} src={STREAM_URLS.lofiRadio} crossOrigin="anonymous" />
      <audio ref={thunderRef} src={STREAM_URLS.thunder} crossOrigin="anonymous" />
    </div>
  );
}
