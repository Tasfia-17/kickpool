"use client";

import React from "react";
import { Compass, Settings, Stars, Trophy } from "lucide-react";

export type ProfileTabId = "hideout" | "journey" | "collection" | "settings";

interface ProfileTabsProps {
  activeTab: ProfileTabId;
  setActiveTab: (tab: ProfileTabId) => void;
  isOwnProfile: boolean;
  accentColor: string;
  mutedColor?: string;
}

export default function ProfileTabs({
  activeTab,
  setActiveTab,
  isOwnProfile,
  accentColor,
  mutedColor,
}: ProfileTabsProps) {
  const tabs = [
    { id: "hideout" as const, label: "Overview", icon: Stars },
    { id: "journey" as const, label: "History", icon: Compass },
    { id: "collection" as const, label: "Collection", icon: Trophy },
    ...(isOwnProfile
      ? [{ id: "settings" as const, label: "Settings", icon: Settings }]
      : []),
  ];

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`retro-tab inline-flex items-center gap-2 rounded-full border-4 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] transition-all ${
              selected
                ? "bg-white text-black shadow-[4px_4px_0px_rgba(0,0,0,0.35)]"
                : "profile-soft-panel"
            }`}
            style={{
              borderColor: selected ? accentColor : `${accentColor}88`,
              color: selected ? undefined : mutedColor || "rgba(248, 250, 252, 0.78)",
            }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
