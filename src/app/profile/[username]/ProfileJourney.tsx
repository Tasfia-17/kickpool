"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lock, Map, Route, Sparkles } from "lucide-react";
import type { ProfileSceneDefinition } from "@/lib/profileScenes";
import type { ProfilePassportStampView, UserProfile } from "@/lib/profileTypes";

type ActivityItem = {
  id: string;
  type: string;
  description: string;
  icon: string;
  xpEarned: number;
  createdAt: string;
};

type GameScore = {
  gameType: string;
  score: number;
  playedAt: string;
};

type WeekStats = {
  watchTime: number;
  messagesCount: number;
  roomsJoined: number;
  gamesPlayed: number;
  xpEarned: number;
};

interface JourneyData {
  activities: ActivityItem[];
  recentScores: GameScore[];
  currentStreak: number;
  weekStats: WeekStats | null;
  canViewFullActivity: boolean;
}

interface ProfileJourneyProps {
  username: string;
  profile: UserProfile;
  scene: ProfileSceneDefinition;
}

function formatTimeAgo(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ProfileJourney({
  username,
  profile,
  scene,
}: ProfileJourneyProps) {
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stamps, setStamps] = useState<ProfilePassportStampView[]>(profile.passportPreview);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [activityResponse, passportResponse] = await Promise.all([
          fetch(`/api/users/profile/${encodeURIComponent(username)}/activity`),
          fetch(`/api/users/profile/${encodeURIComponent(username)}/passport`),
        ]);

        if (!cancelled && activityResponse.ok) {
          const activityData = (await activityResponse.json()) as JourneyData;
          setJourneyData(activityData);
        }

        if (!cancelled && passportResponse.ok) {
          const passportData = (await passportResponse.json()) as {
            stamps: ProfilePassportStampView[];
          };
          setStamps(passportData.stamps || []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const trailStamps = useMemo(() => stamps.slice(0, journeyData?.canViewFullActivity ? 8 : 4), [journeyData?.canViewFullActivity, stamps]);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
      <section
        className="pixel-panel rounded-[28px] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-shadow duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)]"
        style={{ background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <Map size={18} className="text-white" />
          <div>
            <p className="pixel-label">History</p>
            <p className="profile-prose mt-2 text-sm">
              Recent activity, milestones, and collected stamps.
            </p>
          </div>
        </div>

        <div className="journey-trail relative mt-5 space-y-3">
          <div
            className="absolute bottom-6 left-[34px] top-6 w-0.5"
            style={{ backgroundColor: `${scene.accent}40` }}
            aria-hidden="true"
          />
          {trailStamps.map((stamp, index) => (
            <div
              key={stamp.id}
              className="profile-soft-panel relative z-10 rounded-[18px] border-2 p-4 backdrop-blur-sm"
              style={{ borderColor: `${scene.accent}aa` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-10 w-10 place-items-center rounded-full border-2 text-xs font-bold uppercase"
                  style={{ borderColor: scene.accent, color: scene.accent }}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{stamp.label}</p>
                  <p className="profile-prose text-xs">
                    {stamp.rarity} • {new Date(stamp.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="profile-soft-panel rounded-[18px] border-2 p-4" style={{ borderColor: `${scene.accent}aa` }}>
            <p className="pixel-label">Passport Stamps</p>
            <p className="mt-2 text-2xl font-bold text-white">{profile.collectionCounts.stamps}</p>
          </div>
          <div className="profile-soft-panel rounded-[18px] border-2 p-4" style={{ borderColor: `${scene.accent}aa` }}>
            <p className="pixel-label">Current Streak</p>
            <p className="mt-2 text-2xl font-bold text-white">{journeyData?.currentStreak ?? profile.currentStreak ?? 0}</p>
          </div>
          <div className="profile-soft-panel rounded-[18px] border-2 p-4" style={{ borderColor: `${scene.accent}aa` }}>
            <p className="pixel-label">Rooms Joined</p>
            <p className="mt-2 text-2xl font-bold text-white">{journeyData?.weekStats?.roomsJoined ?? profile.roomsJoined}</p>
          </div>
          <div className="profile-soft-panel rounded-[18px] border-2 p-4" style={{ borderColor: `${scene.accent}aa` }}>
            <p className="pixel-label">Week Watch</p>
            <p className="mt-2 text-2xl font-bold text-white">{Math.floor((journeyData?.weekStats?.watchTime ?? 0) / 60)}m</p>
          </div>
        </div>

        {!journeyData?.canViewFullActivity && (
          <div className="mt-5 rounded-[18px] border-2 border-amber-300/40 bg-amber-200/10 px-4 py-3 text-sm font-bold text-amber-100">
            <span className="inline-flex items-center gap-2">
              <Lock size={14} /> Only a short route preview is public. Friends can see the full travel log.
            </span>
          </div>
        )}
      </section>

      <section
        className="pixel-panel rounded-[28px] border-4 border-black dark:border-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] transition-shadow duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.3)]"
        style={{ background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <Route size={18} className="text-white" />
          <div>
            <p className="pixel-label">Recent Activity</p>
            <p className="profile-prose mt-2 text-sm">
              Recently visited rooms and activities.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="profile-prose mt-5 text-sm">Loading journey log...</p>
        ) : (
          <div className="mt-5 space-y-3">
            {(journeyData?.activities || []).map((activity) => (
              <div
                key={activity.id}
                className="profile-soft-panel rounded-[18px] border-2 p-4"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-[14px] border-2 bg-black/25 text-xl" style={{ borderColor: scene.accent }}>
                    {activity.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{activity.description}</p>
                    <p className="profile-prose mt-1 text-xs">{formatTimeAgo(activity.createdAt)}</p>
                  </div>
                  {activity.xpEarned > 0 && (
                    <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                      +{activity.xpEarned} xp
                    </span>
                  )}
                </div>
              </div>
            ))}

            {journeyData?.recentScores && journeyData.recentScores.length > 0 && (
              <div
                className="profile-soft-panel rounded-[22px] border-2 p-4"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                <p className="pixel-label inline-flex items-center gap-2">
                  <Sparkles size={12} /> Arcade scores
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {journeyData.recentScores.map((score) => (
                    <span
                      key={`${score.gameType}-${score.playedAt}`}
                      className="profile-chip rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em]"
                    >
                      {score.gameType} • {score.score}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
