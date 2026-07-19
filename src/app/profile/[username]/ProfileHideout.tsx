"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, MapPinned, Radio, Sparkles, Tv2 } from "lucide-react";
import ProfileCard from "@/components/ui/ProfileCard";
import { IDCard, IDCardStyleKey } from "@/components/ui/IDCard";
import type { ResolvedProfileScene } from "@/lib/profileTheme";
import type { UserProfile } from "@/lib/profileTypes";

interface LiveWatchState {
  roomId: string;
  videoTitle: string;
  userCount?: number;
}

interface ProfileHideoutProps {
  profile: UserProfile;
  scene: ResolvedProfileScene;
  isOwnProfile: boolean;
  liveWatch: LiveWatchState | null;
  passportBoardOpen: boolean;
  onTogglePassport: () => void;
  reduceMotion: boolean;
}

function displayTitle(profile: UserProfile) {
  if (profile.activeTitle) {
    return profile.activeTitle;
  }
  if (profile.isFounder) {
    return "Founder";
  }
  if (profile.role === "PURR_ADMIN") {
    return "PuRRRRRFect Admin";
  }
  if (profile.isVIP) {
    return "VIP Member";
  }
  return "Member";
}

export default function ProfileHideout({
  profile,
  scene,
  isOwnProfile,
  liveWatch,
  passportBoardOpen,
  onTogglePassport,
  reduceMotion,
}: ProfileHideoutProps) {
  const useIdCard = profile.profileCardStyle === "idcard";
  const screenCard = liveWatch
    ? {
        label: "Live screening",
        title: liveWatch.videoTitle,
        caption: `${liveWatch.userCount || 1} trainer${liveWatch.userCount === 1 ? "" : "s"} in room`,
        roomId: liveWatch.roomId,
      }
    : profile.featuredWatch
      ? {
          label: profile.featuredWatch.kind === "live" ? "Live screening" : "Last watched",
          title: profile.featuredWatch.videoTitle,
          caption:
            profile.featuredWatch.kind === "live"
              ? "Broadcasting now"
              : new Date(profile.featuredWatch.watchedAt).toLocaleDateString(),
          roomId: profile.featuredWatch.roomId || undefined,
        }
      : null;

  return (
    <div className="space-y-5">
      <div className="hideout-grid grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section
          className="pixel-panel relative overflow-hidden rounded-[28px] border-4 p-5 shadow-[10px_10px_0px_rgba(0,0,0,0.28)]"
          style={{ borderColor: scene.border, background: scene.panel }}
        >
          <div className="absolute inset-x-0 top-0 h-16 opacity-40" style={{ background: scene.panelSoft }} />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="pixel-label inline-flex items-center gap-2">
                <Sparkles size={14} /> ID Card
              </p>
              <span className="profile-chip rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]">
                {displayTitle(profile)}
              </span>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <div className="flex justify-center">
                {useIdCard ? (
                  <IDCard
                    username={profile.name}
                    title={displayTitle(profile)}
                    level={profile.level ?? 1}
                    xp={Math.max((profile.totalXP ?? 0) % Math.max((profile.level ?? 1) ** 2 * 100, 100), 0)}
                    maxXp={Math.max((profile.level ?? 1) ** 2 * 100, 100)}
                    avatarUrl={`/api/avatar/${profile.name}`}
                    cardStyle={(profile.idCardStyle as IDCardStyleKey) || "officer"}
                    customHeaderBg={profile.idCardCustomHeader}
                    customBodyBg={profile.idCardCustomBody}
                    customAccent={profile.idCardCustomAccent || profile.vipProfileAccent}
                    customBorder={profile.idCardCustomBorder || profile.vipProfileBorder}
                    showLevel={profile.idCardShowLevel !== false}
                    showXpBar={profile.idCardShowXp !== false}
                    showHologram={!reduceMotion && profile.idCardShowHologram !== false}
                    showScanlines={!reduceMotion && profile.idCardShowScanlines !== false}
                    enableTilt={!reduceMotion}
                    size="md"
                  />
                ) : (
                  <ProfileCard
                    avatarUrl={`/api/avatar/${profile.name}`}
                    name={profile.vipBadge ? `${profile.vipBadge} ${profile.name}` : profile.name}
                    title={displayTitle(profile)}
                    handle={profile.name}
                    status={liveWatch ? "Watching now" : "Hideout resident"}
                    showUserInfo={true}
                    enableTilt={!reduceMotion}
                    contactText={isOwnProfile ? "Settings" : "Profile"}
                    innerGradient={profile.vipProfileBg || scene.cardGradient}
                    behindGlowEnabled={!!profile.vipProfileGlow && !reduceMotion}
                    behindGlowColor={profile.vipProfileGlow || scene.cardGlow}
                    nameColor={profile.vipCardNameGradient ? undefined : profile.vipCardNameColor || profile.vipNameColor}
                    nameGradient={profile.vipCardNameGradient || profile.vipNameGradient}
                    nameFont={profile.vipFont}
                    nameGlow={!reduceMotion && (profile.vipCardNameGlow || profile.vipGlow)}
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

              <div className="space-y-4">
                <div>
                  <p className="pixel-label text-[11px]">About Me</p>
                  <p className="profile-prose mt-2 text-sm">
                    {profile.bio || (isOwnProfile ? "Add a bio in Settings to give your profile more personality." : "This hideout keeps its notes tucked away for now.")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="profile-soft-panel rounded-[18px] border-2 p-3" style={{ borderColor: `${scene.accent}aa` }}>
                    <p className="pixel-label text-[10px]">Watch Time</p>
                    <p className="mt-2 text-xl font-bold text-white">{Math.floor((profile.watchTime ?? 0) / 3600)}h</p>
                  </div>
                  <div className="profile-soft-panel rounded-[18px] border-2 p-3" style={{ borderColor: `${scene.accent}aa` }}>
                    <p className="pixel-label text-[10px]">Messages</p>
                    <p className="mt-2 text-xl font-bold text-white">{profile.messagesCount ?? 0}</p>
                  </div>
                  <div className="profile-soft-panel rounded-[18px] border-2 p-3" style={{ borderColor: `${scene.accent}aa` }}>
                    <p className="pixel-label text-[10px]">Level</p>
                    <p className="mt-2 text-xl font-bold text-white">{profile.level ?? 1}</p>
                  </div>
                </div>

                {(profile.discord || profile.instagram || profile.twitter) && (
                  <div className="flex flex-wrap gap-2">
                    {profile.discord && (
                      <span className="profile-chip rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                        Discord · {profile.discord}
                      </span>
                    )}
                    {profile.instagram && (
                      <span className="profile-chip rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                        Instagram · {profile.instagram}
                      </span>
                    )}
                    {profile.twitter && (
                      <span className="profile-chip rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                        X · {profile.twitter}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5">
          <section
            className={`pixel-panel crt-screen rounded-[28px] border-4 p-5 shadow-[10px_10px_0px_rgba(0,0,0,0.28)] ${reduceMotion ? "" : "ambient-flicker"}`}
            style={{ borderColor: scene.border, background: scene.panel }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="pixel-label inline-flex items-center gap-2">
                <Tv2 size={14} /> Current Activity
              </p>
              {liveWatch && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                  <Radio size={12} /> Live
                </span>
              )}
            </div>

            <div
              className={`mt-4 rounded-[22px] border-4 p-4 ${reduceMotion ? "" : "scene-scanlines"}`}
              style={{ borderColor: scene.accent, background: scene.screen }}
            >
              {screenCard ? (
                <>
                  <p className="pixel-label text-[11px]">{screenCard.label}</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">{screenCard.title}</h3>
                  <p className="profile-prose mt-2 text-sm">{screenCard.caption}</p>
                  {screenCard.roomId && (
                    <Link
                      href={`/room/${screenCard.roomId}`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_rgba(0,0,0,0.25)]"
                    >
                      Open Room <ExternalLink size={14} />
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <p className="pixel-label text-[11px]">Offline</p>
                  <h3 className="mt-3 text-xl font-bold text-white">Not watching anything right now</h3>
                  <p className="profile-prose mt-2 text-sm">
                    This user is currently offline or not active in any room.</p>
                </>
              )}
            </div>
          </section>

          <section
            className="pixel-panel rounded-[28px] border-4 p-5 shadow-[10px_10px_0px_rgba(0,0,0,0.28)]"
            style={{ borderColor: scene.border, background: scene.panel }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="pixel-label inline-flex items-center gap-2">
                <Sparkles size={14} /> Showcase Badges
              </p>
              <span className="profile-chip rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]">
                {profile.collectionCounts.showcases}/{profile.showcaseSlots.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {profile.showcaseSlots.map((slot) => (
                <div
                  key={slot.slotIndex}
                  className="shelf-pedestal rounded-[18px] border-2 px-4 py-3"
                  style={{ borderColor: `${scene.accent}aa`, background: scene.shelf }}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-[14px] border-2 bg-black/25 text-lg" style={{ borderColor: scene.accent }}>
                      {slot.emoji || "•"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{slot.title}</p>
                      <p className="profile-prose text-xs">{slot.subtitle || "Showcase item"}</p>
                      {slot.caption && (
                        <p className="profile-prose mt-1 text-xs">{slot.caption}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section
        className="pixel-panel rounded-[28px] border-4 p-5 shadow-[10px_10px_0px_rgba(0,0,0,0.28)]"
        style={{ borderColor: scene.border, background: scene.panel }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pixel-label inline-flex items-center gap-2">
              <MapPinned size={14} /> Passport Board
            </p>
            <p className="profile-prose mt-2 text-sm">
              {passportBoardOpen
                ? "Open drawer showing the latest room stamps and travel markers."
                : "Kept folded by default so the room stays sparse on first load."}
            </p>
          </div>
          <button
            type="button"
            onClick={onTogglePassport}
            className="rounded-full border-4 border-black bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
          >
            {passportBoardOpen ? "Hide Board" : "Open Board"}
          </button>
        </div>

        {passportBoardOpen && (
          <div className="passport-drawer mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profile.passportPreview.map((stamp) => (
              <div
                key={stamp.id}
                className="profile-soft-panel rounded-[18px] border-2 p-4"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                <p className="pixel-label text-[10px]">{stamp.rarity}</p>
                <p className="mt-2 text-base font-bold text-white">{stamp.label}</p>
                <p className="profile-prose mt-1 text-xs">
                  Earned {new Date(stamp.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
