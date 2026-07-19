"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useReducedMotion } from "motion/react";
import { usePokemonTheme } from "@/components/PokemonThemeProvider";
import Header from "@/components/layout/Header";
import { Ghost, MapPinned, Sparkles, Users } from "lucide-react";
import { getProfileScene, getProfileSceneEffect } from "@/lib/profileScenes";
import { resolveProfileTheme } from "@/lib/profileTheme";
import type { UserProfile } from "@/lib/profileTypes";
import "./profile.css";
import { useProfileSettings } from "./useProfileSettings";
import ProfileTabs, { ProfileTabId } from "./ProfileTabs";
import ProfileHideout from "./ProfileHideout";
import ProfileJourney from "./ProfileJourney";
import ProfileCollection from "./ProfileCollection";
import ProfileSettings from "./ProfileSettings";
import VIPCustomization from "./VIPCustomization";
import dynamic from "next/dynamic";

const FloatingParticles = dynamic(() => import('@/components/FunEffects').then(m => ({ default: m.FloatingParticles })), { ssr: false });

interface ProfileClientProps {
  initialProfile: UserProfile;
}

type LiveWatchState = {
  roomId: string;
  videoTitle: string;
  userCount: number;
} | null;

const VALID_TABS: ProfileTabId[] = [
  "hideout",
  "journey",
  "collection",
  "settings",
];

function sanitizeTab(value: string | null, canOpenSettings: boolean): ProfileTabId {
  if (!value || !VALID_TABS.includes(value as ProfileTabId)) {
    return "hideout";
  }
  if (value === "settings" && !canOpenSettings) {
    return "hideout";
  }
  return value as ProfileTabId;
}

function friendButtonText(status: UserProfile["friendStatus"]) {
  switch (status) {
    case "pending":
      return "Request Sent";
    case "requested":
      return "Accept Friend";
    case "friends":
      return "Remove Friend";
    default:
      return "Add Friend";
  }
}

export default function ProfileClient({ initialProfile }: ProfileClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { currentTheme, isDarkMode } = usePokemonTheme();
  const reduceMotion = useReducedMotion();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<ProfileTabId>(
    sanitizeTab(searchParams.get("tab"), session?.user?.name === initialProfile.name),
  );
  const [friendLoading, setFriendLoading] = useState(false);
  const [liveWatch, setLiveWatch] = useState<LiveWatchState>(null);
  const [passportBoardOpen, setPassportBoardOpen] = useState(false);
  const [, startTransition] = useTransition();

  const isOwnProfile = session?.user?.name === profile.name;
  const scene = useMemo(
    () =>
      resolveProfileTheme(
        getProfileScene(profile.sceneId),
        currentTheme,
        isDarkMode,
        {
          accentColor: profile.vipProfileAccent,
          borderColor: profile.vipProfileBorder,
          cardGlowColor: profile.vipProfileGlow,
          cardGradient: profile.vipProfileBg,
        },
      ),
    [
      currentTheme,
      isDarkMode,
      profile.sceneId,
      profile.vipProfileAccent,
      profile.vipProfileBg,
      profile.vipProfileBorder,
      profile.vipProfileGlow,
    ],
  );
  const sceneEffect = useMemo(
    () => getProfileSceneEffect(profile.sceneEffect),
    [profile.sceneEffect],
  );
  const rootStyle = useMemo(
    () =>
      ({
        backgroundColor: scene.pageBase,
        "--profile-text": scene.text,
        "--profile-muted-text": scene.mutedText,
        "--profile-label-color": scene.labelColor,
        "--profile-chip-bg": scene.chipBackground,
        "--profile-chip-border": scene.chipBorder,
        "--profile-chip-text": scene.chipText,
        "--profile-soft-panel": scene.softPanel,
      }) as React.CSSProperties,
    [scene],
  );

  const settings = useProfileSettings(profile.name, setProfile);
  const { initializeFromUser, initializeFromVIP } = settings.handlers;

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    const nextTab = sanitizeTab(searchParams.get("tab"), isOwnProfile);
    setActiveTab(nextTab);
  }, [isOwnProfile, searchParams]);

  useEffect(() => {
    initializeFromUser(profile);
    initializeFromVIP(profile);
  }, [initializeFromUser, initializeFromVIP, profile]);

  useEffect(() => {
    let cancelled = false;

    const loadPresence = async () => {
      try {
        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
        const response = await fetch(`${socketUrl}/api/presence/${profile.id}`);
        if (!cancelled && response.ok) {
          const data = (await response.json()) as LiveWatchState;
          setLiveWatch(data || null);
        }
      } catch {
        if (!cancelled) {
          setLiveWatch(null);
        }
      }
    };

    loadPresence();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const updateTab = (tab: ProfileTabId) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (tab === "hideout") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }
    startTransition(() => {
      router.replace(
        nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname,
        { scroll: false },
      );
    });
  };

  const handleFriendAction = async () => {
    setFriendLoading(true);
    try {
      const status = profile.friendStatus || "none";
      const endpoints: Record<
        string,
        { url: string; bodyKey: string; nextStatus: UserProfile["friendStatus"] }
      > = {
        none: {
          url: "/api/friends/request",
          bodyKey: "receiverId",
          nextStatus: "pending",
        },
        requested: {
          url: "/api/friends/accept",
          bodyKey: "senderId",
          nextStatus: "friends",
        },
        friends: {
          url: "/api/friends/remove",
          bodyKey: "friendId",
          nextStatus: "none",
        },
        pending: {
          url: "/api/friends/cancel",
          bodyKey: "receiverId",
          nextStatus: "none",
        },
      };

      const config = endpoints[status];
      if (!config) {
        return;
      }

      await fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.bodyKey]: profile.id }),
      });

      setProfile((current) => ({ ...current, friendStatus: config.nextStatus }));
    } finally {
      setFriendLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <Ghost size={48} className="opacity-60" />
          <p className="mt-4 text-xl font-bold">This hideout could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="profile-root relative min-h-screen overflow-hidden"
      style={rootStyle}
    >
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{ background: scene.pageVeil }}
        />
        <div
          className="graph-paper-bg-subtle h-full w-full"
          style={{ color: scene.pageGlowAccent }}
        />
        <div className="crt-scanlines-subtle h-full w-full opacity-70" />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div
          className={`absolute left-[-8%] top-[8%] h-[26rem] w-[26rem] rounded-full blur-[110px] opacity-[0.16] ${reduceMotion ? "" : "animate-float"}`}
          style={{ backgroundColor: scene.pageGlowPrimary }}
        />
        <div
          className={`absolute right-[-10%] top-[18%] h-[22rem] w-[22rem] rounded-full blur-[110px] opacity-[0.12] ${reduceMotion ? "" : "animate-float"}`}
          style={{ backgroundColor: scene.pageGlowSecondary, animationDelay: "3s" }}
        />
        <div
          className={`absolute bottom-[-14%] left-[28%] h-[24rem] w-[24rem] rounded-full blur-[120px] opacity-[0.12] ${reduceMotion ? "" : "animate-float"}`}
          style={{ backgroundColor: scene.pageGlowAccent, animationDelay: "1.5s" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: sceneEffect.overlay }}
        />
      </div>
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.12) 100%)",
        }}
      />
      <FloatingParticles />
      <Header />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section
          className="pixel-panel rounded-[30px] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-shadow duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)]"
          style={{ background: scene.panel }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="pixel-label inline-flex items-center gap-2">
                  <Users size={14} /> CinePurr Member
              </p>
              <h1 className="mt-3 text-[2.4rem] font-bold leading-none text-white sm:text-[3.3rem]">
                {profile.activeRoomPersona?.displayName || profile.name}
              </h1>
              {profile.bio && (
                <p className="profile-prose mt-3 max-w-2xl text-sm sm:text-base">
                  {profile.bio}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.activeTitle && (
                  <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    {profile.activeTitle}
                  </span>
                )}
                {profile.isFounder && (
                  <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    Founder
                  </span>
                )}
                {profile.role === "PURR_ADMIN" && (
                  <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    PuRRRRRFect Admin
                  </span>
                )}
                {profile.isVIP && !profile.isFounder && (
                  <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    VIP
                  </span>
                )}
                <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                  <Users size={12} className="mr-2 inline-block" />
                  {profile.collectionCounts.badges} badges
                </span>
                <span className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                  <Sparkles size={12} className="mr-2 inline-block" />
                  {profile.collectionCounts.stamps} stamps
                </span>
              </div>
            </div>

            {!isOwnProfile && session?.user && (
              <button
                type="button"
                onClick={() => void handleFriendAction()}
                disabled={friendLoading}
                className="rounded-full border-4 border-black bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
              >
                {friendLoading
                  ? "Working..."
                  : friendButtonText(profile.friendStatus)}
              </button>
            )}
          </div>

          <ProfileTabs
            activeTab={activeTab}
            setActiveTab={updateTab}
            isOwnProfile={isOwnProfile}
            accentColor={scene.accent}
            mutedColor={scene.mutedText}
          />
        </section>

        <div className="mt-5">
          {activeTab === "hideout" && (
            <ProfileHideout
              profile={profile}
              scene={scene}
              isOwnProfile={isOwnProfile}
              liveWatch={liveWatch}
              passportBoardOpen={passportBoardOpen}
              onTogglePassport={() => setPassportBoardOpen((current) => !current)}
              reduceMotion={!!reduceMotion}
            />
          )}

          {activeTab === "journey" && (
            <ProfileJourney username={profile.name} profile={profile} scene={scene} />
          )}

          {activeTab === "collection" && (
            <ProfileCollection username={profile.name} profile={profile} scene={scene} />
          )}

          {activeTab === "settings" && isOwnProfile && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section
                className="pixel-panel rounded-[28px] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-shadow duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)]"
                style={{ background: scene.panel }}
              >
                <ProfileSettings
                  profileForm={settings.profileForm}
                  passwordForm={settings.passwordForm}
                  handlers={settings.handlers}
                  fileInputRef={settings.profileForm.fileInputRef}
                />
              </section>
              <VIPCustomization
                profile={profile}
                vipSettings={settings.vipSettings}
                idCardSettings={settings.idCardSettings}
                handleVIPSave={settings.handlers.handleVIPSave}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
