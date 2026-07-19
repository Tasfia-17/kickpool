'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Radio, Sparkles } from 'lucide-react';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import ProfileCard from '../ui/ProfileCard';
import { IDCard, IDCardStyleKey } from '../ui/IDCard';
import { getProfileScene } from '@/lib/profileScenes';
import { resolveProfileTheme } from '@/lib/profileTheme';
import type { UserProfile } from '@/lib/profileTypes';

interface UserProfilePopupProps {
  username: string;
  onClose: () => void;
  position: { x: number; y: number };
  openProfilePage?: () => void;
  roomId?: string;
}

export const UserProfilePopup: React.FC<UserProfilePopupProps> = ({
  username,
  onClose,
  openProfilePage,
  roomId,
}) => {
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const search = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
        const response = await fetch(`/api/users/profile/${encodeURIComponent(username)}${search}`);
        if (!response.ok) {
          throw new Error('Failed to load profile');
        }
        const data = (await response.json()) as UserProfile;
        if (!cancelled) {
          setProfile(data);
        }
      } catch (_error) {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [roomId, username]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const scene = useMemo(
    () =>
      resolveProfileTheme(
        getProfileScene(profile?.sceneId || 'pallet-hideout'),
        currentTheme,
        isDarkMode,
        {
          accentColor: profile?.vipProfileAccent,
          borderColor: profile?.vipProfileBorder,
          cardGlowColor: profile?.vipProfileGlow,
          cardGradient: profile?.vipProfileBg,
        },
      ),
    [
      currentTheme,
      isDarkMode,
      profile?.sceneId,
      profile?.vipProfileAccent,
      profile?.vipProfileBg,
      profile?.vipProfileBorder,
      profile?.vipProfileGlow,
    ],
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border-4 border-black dark:border-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b-4 border-black dark:border-white bg-[#e0e0e0] px-4 py-3 dark:bg-zinc-900">
          <div className="flex gap-2">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-black bg-rose-500" />
            <div className="h-3.5 w-3.5 rounded-full border-2 border-black bg-amber-400" />
            <div className="h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-400" />
          </div>
          <p className="ml-2 text-xs font-bold uppercase tracking-[0.2em] text-black dark:text-white">
            Trainer File
          </p>
          <button
            onClick={onClose}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black/10 active:translate-y-[2px] active:shadow-none dark:border-white dark:bg-black dark:text-white"
          >
            <X size={14} />
          </button>
        </div>
        <div className="relative p-5" style={{ background: scene.panel }}>
        <div className="pointer-events-none absolute inset-0 rounded-[24px] opacity-90" style={{ background: scene.pageVeil }} />







        {loading || !profile ? (
          <div className="grid min-h-[320px] place-items-center rounded-[22px] border-4 border-white/15 bg-black/30 text-white">
            Loading hideout...
          </div>
        ) : (
          <div className="relative z-10 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="flex justify-center">
              {profile.profileCardStyle === 'idcard' ? (
                <IDCard
                  username={profile.activeRoomPersona?.displayName || profile.name}
                  title={profile.activeTitle || (profile.isVIP ? 'VIP Member' : 'Member')}
                  level={profile.level ?? 1}
                  xp={Math.max((profile.totalXP ?? 0) % Math.max((profile.level ?? 1) ** 2 * 100, 100), 0)}
                  maxXp={Math.max((profile.level ?? 1) ** 2 * 100, 100)}
                  avatarUrl={`/api/avatar/${profile.name}`}
                  cardStyle={(profile.idCardStyle as IDCardStyleKey) || 'officer'}
                  customHeaderBg={profile.idCardCustomHeader}
                  customBodyBg={profile.idCardCustomBody}
                  customAccent={profile.idCardCustomAccent || profile.vipProfileAccent}
                  customBorder={profile.idCardCustomBorder || profile.vipProfileBorder}
                  showLevel={profile.idCardShowLevel !== false}
                  showXpBar={profile.idCardShowXp !== false}
                  showHologram={profile.idCardShowHologram !== false}
                  showScanlines={profile.idCardShowScanlines !== false}
                  size="md"
                />
              ) : (
                <ProfileCard
                  avatarUrl={`/api/avatar/${profile.name}`}
                  name={
                    profile.activeRoomPersona?.displayName ||
                    (profile.vipBadge ? `${profile.vipBadge} ${profile.name}` : profile.name)
                  }
                  title={profile.activeTitle || (profile.isVIP ? 'VIP Member' : 'Member')}
                  handle={profile.name}
                  status={profile.activeRoomPersona ? 'Room persona active' : 'Hideout resident'}
                  showUserInfo={true}
                  enableTilt={true}
                  contactText="Open Profile"
                  onContactClick={() => {
                    if (openProfilePage) {
                      openProfilePage();
                    } else {
                      window.location.href = `/profile/${profile.name}`;
                    }
                  }}
                  behindGlowEnabled={!!profile.vipProfileGlow}
                  behindGlowColor={profile.vipProfileGlow || scene.cardGlow}
                  innerGradient={profile.vipProfileBg || scene.cardGradient}
                  nameColor={profile.vipCardNameGradient ? undefined : profile.vipCardNameColor || profile.vipNameColor}
                  nameGradient={profile.vipCardNameGradient || profile.vipNameGradient}
                  nameFont={profile.vipFont}
                  nameGlow={profile.vipCardNameGlow || profile.vipGlow}
                  surfaceAccentColor={profile.vipProfileAccent || scene.accent}
                  surfaceBorderColor={profile.vipProfileBorder || scene.cardBorder}
                  surfacePanelFill={scene.cardUiFill}
                  surfaceTextColor={scene.text}
                  surfaceMutedTextColor={scene.cardMutedText}
                  surfaceButtonFill={scene.cardButtonFill}
                  titleColor={scene.text}
                />
              )}
            </div>

            <div className="rounded-[24px] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]" style={{ background: scene.panel }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                    {scene.label}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-white">
                    {profile.activeRoomPersona?.displayName || profile.name}
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: scene.mutedText, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                    {profile.activeRoomPersona?.aboutMe || profile.bio || 'This room identity is keeping things mysterious.'}
                  </p>
                </div>
                {profile.featuredWatch && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                    <Radio size={12} /> {profile.featuredWatch.kind === 'live' ? 'Live' : 'Last watched'}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border-2 border-black dark:border-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]" style={{ background: scene.softPanel }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">Watch Time</p>
                  <p className="mt-2 text-xl font-bold text-white">{Math.floor((profile.watchTime ?? 0) / 3600)}h</p>
                </div>
                <div className="rounded-[18px] border-2 border-black dark:border-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]" style={{ background: scene.softPanel }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">Badges</p>
                  <p className="mt-2 text-xl font-bold text-white">{profile.collectionCounts.badges}</p>
                </div>
                <div className="rounded-[18px] border-2 border-black dark:border-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]" style={{ background: scene.softPanel }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">Stamps</p>
                  <p className="mt-2 text-xl font-bold text-white">{profile.collectionCounts.stamps}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border-2 border-black dark:border-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]" style={{ background: scene.softPanel }}>
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
                  <Sparkles size={12} /> Showcase Spotlight
                </p>
                {profile.showcaseSlots[0]?.itemType ? (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-[14px] border-2 bg-black/25 text-lg" style={{ borderColor: scene.accent }}>
                      {profile.showcaseSlots[0].emoji || '•'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{profile.showcaseSlots[0].title}</p>
                      <p className="text-xs" style={{ color: scene.mutedText, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                        {profile.showcaseSlots[0].subtitle}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm" style={{ color: scene.mutedText, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                    No showcase item pinned yet.
                  </p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/profile/${encodeURIComponent(profile.name)}`}
                  className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
                >
                  Full Profile <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
