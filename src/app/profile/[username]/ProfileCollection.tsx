"use client";

import React, { useEffect, useState } from "react";
import { Award, BookOpen, Palette, Stamp } from "lucide-react";
import type { ProfilePassportStampView, UserProfile } from "@/lib/profileTypes";
import type { ProfileSceneDefinition } from "@/lib/profileScenes";

interface ProfileCollectionProps {
  username: string;
  profile: UserProfile;
  scene: ProfileSceneDefinition;
}

function titleize(value: string) {
  return value.replace(/[-_]/g, " ");
}

export default function ProfileCollection({
  username,
  profile,
  scene,
}: ProfileCollectionProps) {
  const [passportStamps, setPassportStamps] = useState<ProfilePassportStampView[]>(
    profile.passportPreview,
  );

  useEffect(() => {
    let cancelled = false;

    const loadPassport = async () => {
      const response = await fetch(
        `/api/users/profile/${encodeURIComponent(username)}/passport`,
      );
      if (!cancelled && response.ok) {
        const data = (await response.json()) as { stamps: ProfilePassportStampView[] };
        setPassportStamps(data.stamps || []);
      }
    };

    loadPassport();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const sectionClass =
    "pixel-panel rounded-[28px] border-4 p-5 shadow-[10px_10px_0px_rgba(0,0,0,0.28)]";

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section
          className={sectionClass}
        style={{ borderColor: scene.border, background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <Award size={18} className="text-amber-200" />
          <div>
            <p className="pixel-label">Badges</p>
            <p className="profile-prose mt-2 text-sm">
              Achievements and collectibles.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.unlockedBadges?.length ? (
            profile.unlockedBadges.map((badge) => (
              <span
                key={badge}
                className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                {titleize(badge)}
              </span>
            ))
          ) : (
            <p className="profile-prose text-sm">No badges unlocked yet.</p>
          )}
        </div>
      </section>

      <section
        className={sectionClass}
        style={{ borderColor: scene.border, background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-amber-200" />
          <div>
            <p className="pixel-label">Titles</p>
            <p className="profile-prose mt-2 text-sm">
              Unlocked community titles.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.unlockedTitles?.length ? (
            profile.unlockedTitles.map((title) => (
              <span
                key={title}
                className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                {title}
              </span>
            ))
          ) : (
            <p className="profile-prose text-sm">No titles unlocked yet.</p>
          )}
        </div>
      </section>

      <section
        className={sectionClass}
        style={{ borderColor: scene.border, background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <Palette size={18} className="text-amber-200" />
          <div>
            <p className="pixel-label">Themes</p>
            <p className="profile-prose mt-2 text-sm">
              Unlocked profile themes and gradients.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.unlockedThemes?.length ? (
            profile.unlockedThemes.map((theme) => (
              <span
                key={theme}
                className="profile-chip rounded-full border-2 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                {titleize(theme)}
              </span>
            ))
          ) : (
            <p className="profile-prose text-sm">No themes unlocked yet.</p>
          )}
        </div>
      </section>

      <section
        className={sectionClass}
        style={{ borderColor: scene.border, background: scene.panel }}
      >
        <div className="flex items-center gap-3">
          <Stamp size={18} className="text-amber-200" />
          <div>
            <p className="pixel-label">Stamps</p>
            <p className="profile-prose mt-2 text-sm">
              Room milestones and special event collectibles.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {passportStamps.length ? (
            passportStamps.map((stamp) => (
              <div
                key={stamp.id}
                className="profile-soft-panel rounded-[18px] border-2 p-4"
                style={{ borderColor: `${scene.accent}aa` }}
              >
                <p className="pixel-label text-[10px]">{stamp.rarity}</p>
                <p className="mt-2 text-sm font-bold text-white">{stamp.label}</p>
                <p className="profile-prose mt-1 text-xs">
                  {new Date(stamp.earnedAt).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="profile-prose text-sm">No stamps minted yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
