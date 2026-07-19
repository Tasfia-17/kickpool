"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Lock,
  Palette,
  Save,
  Sparkles,
  Star,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import { ID_CARD_STYLES, IDCardStyleKey } from "@/components/ui/IDCard";
import ProfileCard from "@/components/ui/ProfileCard";
import {
  PROFILE_SCENE_EFFECTS,
  PROFILE_SCENES,
  getProfileScene,
} from "@/lib/profileScenes";
import type {
  ProfileAvailableRoom,
  ProfileAvailableShowcaseItem,
  ProfileRoomPersonaView,
  ProfileShowcaseSlotView,
  UserProfile,
} from "@/lib/profileTypes";
import type { IDCardSettingsState, VIPSettingsState } from "./useProfileSettings";

type VIPControls = VIPSettingsState & {
  setProfileSceneId: (value: VIPSettingsState["profileSceneId"]) => void;
  setProfileSceneEffect: (value: VIPSettingsState["profileSceneEffect"]) => void;
  setVipNameColor: (value: string) => void;
  setVipFont: (value: string) => void;
  setVipBadge: (value: string) => void;
  setVipGlow: (value: boolean) => void;
  setVipNameEffect: (value: string) => void;
  setVipNameGradient: (value: string) => void;
  setVipProfileBg: (value: string) => void;
  setVipProfileBanner: (value: string) => void;
  setVipProfileAccent: (value: string) => void;
  setVipProfileBorder: (value: string) => void;
  setVipProfileGlow: (value: string) => void;
  setVipCardNameColor: (value: string) => void;
  setVipCardNameGradient: (value: string) => void;
  setVipCardNameGlow: (value: boolean) => void;
  setVipTab: (value: VIPSettingsState["vipTab"]) => void;
};

type IDCardControls = IDCardSettingsState & {
  setProfileCardStyle: (value: "classic" | "idcard") => void;
  setIdCardStyle: (value: IDCardStyleKey) => void;
  setIdCardCustomHeader: (value: string) => void;
  setIdCardCustomBody: (value: string) => void;
  setIdCardCustomAccent: (value: string) => void;
  setIdCardCustomBorder: (value: string) => void;
  setIdCardShowLevel: (value: boolean) => void;
  setIdCardShowXp: (value: boolean) => void;
  setIdCardShowHologram: (value: boolean) => void;
  setIdCardShowScanlines: (value: boolean) => void;
};

type ShowcaseEditorSlot = {
  slotIndex: number;
  itemType: ProfileShowcaseSlotView["itemType"];
  itemRef: string | null;
  caption?: string | null;
};

type PersonaEditor = {
  roomId: string;
  displayName: string;
  badgeEmoji: string;
  aboutMe: string;
  sceneId: VIPSettingsState["profileSceneId"];
  profileEffect: VIPSettingsState["profileSceneEffect"];
};

interface VIPCustomizationProps {
  profile: UserProfile;
  vipSettings: VIPControls;
  idCardSettings: IDCardControls;
  handleVIPSave: () => Promise<void> | void;
}

function itemLabel(item: ProfileAvailableShowcaseItem) {
  return `${item.description || item.type} · ${item.label}`;
}

function truncate(value: string, max: number) {
  return value.slice(0, max);
}

function colorInputValue(value: string | null | undefined, fallback: string) {
  const match = (value || "").match(/#[0-9a-fA-F]{3,8}/);
  const candidate = match?.[0] || fallback;

  if (/^#[0-9a-fA-F]{3}$/.test(candidate)) {
    const a = candidate.charAt(1);
    const b = candidate.charAt(2);
    const c = candidate.charAt(3);
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{6,8}$/.test(candidate)) {
    return candidate.slice(0, 7).toLowerCase();
  }

  return fallback;
}

export default function VIPCustomization({
  profile,
  vipSettings,
  idCardSettings,
  handleVIPSave,
}: VIPCustomizationProps) {
  const [showcases, setShowcases] = useState<ShowcaseEditorSlot[]>([]);
  const [availableItems, setAvailableItems] = useState<ProfileAvailableShowcaseItem[]>([]);
  const [slotLimit, setSlotLimit] = useState(1);
  const [showcaseLoading, setShowcaseLoading] = useState(true);
  const [showcaseSaving, setShowcaseSaving] = useState(false);
  const [showcaseMessage, setShowcaseMessage] = useState("");
  const [personas, setPersonas] = useState<PersonaEditor[]>([]);
  const [availableRooms, setAvailableRooms] = useState<ProfileAvailableRoom[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasSaving, setPersonasSaving] = useState(false);
  const [personaMessage, setPersonaMessage] = useState("");
  const [showAdvancedLab, setShowAdvancedLab] = useState(false);

  const canUseVipScenes =
    !!profile.isVIP || !!profile.isFounder || profile.role === "PURR_ADMIN";
  const activeScene = getProfileScene(profile.sceneId);

  useEffect(() => {
    let cancelled = false;

    const loadShowcases = async () => {
      try {
        const response = await fetch("/api/user/showcases");
        if (!response.ok) {
          throw new Error("Failed to load showcases");
        }
        const data = (await response.json()) as {
          slotLimit: number;
          slots: ProfileShowcaseSlotView[];
          availableItems: ProfileAvailableShowcaseItem[];
        };

        if (cancelled) {
          return;
        }

        setSlotLimit(data.slotLimit);
        setAvailableItems(data.availableItems);
        setShowcases(
          Array.from({ length: data.slotLimit }, (_, index) => {
            const existing = data.slots.find((slot) => slot.slotIndex === index);
            return {
              slotIndex: index,
              itemType: existing?.itemType || null,
              itemRef: existing?.itemRef || null,
              caption: existing?.caption || "",
            };
          }),
        );
      } catch (_error) {
        if (!cancelled) {
          setShowcaseMessage("Could not load showcase slots.");
        }
      } finally {
        if (!cancelled) {
          setShowcaseLoading(false);
        }
      }
    };

    const loadPersonas = async () => {
      if (!canUseVipScenes) {
        setPersonasLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user/personas");
        if (!response.ok) {
          throw new Error("Failed to load personas");
        }

        const data = (await response.json()) as {
          personas: ProfileRoomPersonaView[];
          availableRooms: ProfileAvailableRoom[];
        };

        if (cancelled) {
          return;
        }

        setAvailableRooms(data.availableRooms);
        setPersonas(
          data.personas.map((persona) => ({
            roomId: persona.roomId,
            displayName: persona.displayName || "",
            badgeEmoji: persona.badgeEmoji || "",
            aboutMe: persona.aboutMe || "",
            sceneId: persona.sceneId,
            profileEffect: persona.profileEffect,
          })),
        );
      } catch (_error) {
        if (!cancelled) {
          setPersonaMessage("Could not load room personas.");
        }
      } finally {
        if (!cancelled) {
          setPersonasLoading(false);
        }
      }
    };

    loadShowcases();
    loadPersonas();

    return () => {
      cancelled = true;
    };
  }, [canUseVipScenes]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, ProfileAvailableShowcaseItem[]>();
    for (const item of availableItems) {
      const key = item.description || item.type;
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [availableItems]);

  const saveShowcases = async () => {
    setShowcaseSaving(true);
    setShowcaseMessage("");
    try {
      const response = await fetch("/api/user/showcases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: showcases }),
      });

      if (!response.ok) {
        throw new Error("Failed to save showcases");
      }

      setShowcaseMessage("Showcase shelf saved.");
    } catch (_error) {
      setShowcaseMessage("Could not save showcase shelf.");
    } finally {
      setShowcaseSaving(false);
    }
  };

  const savePersonas = async () => {
    setPersonasSaving(true);
    setPersonaMessage("");
    try {
      const response = await fetch("/api/user/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personas }),
      });

      if (!response.ok) {
        throw new Error("Failed to save personas");
      }

      setPersonaMessage("Room personas saved.");
    } catch (_error) {
      setPersonaMessage("Could not save room personas.");
    } finally {
      setPersonasSaving(false);
    }
  };

  const sectionClass = "vip-section-card";

  return (
    <div className="space-y-6">
      <div className={sectionClass} style={{ borderColor: activeScene.border }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="pixel-label mb-2 inline-flex items-center gap-2">
              <Store size={14} /> Hideout Studio
            </p>
            <h3 className="text-[1.6rem] font-bold tracking-tight text-white">
              Curate your trainer hideout
            </h3>
            <p className="profile-prose mt-2 max-w-2xl text-sm text-white/70">
              VIP members can change scene packs, signature scene variants, and
              room personas. Every profile can still arrange its Hall of Fame shelf.
            </p>
          </div>
          {!canUseVipScenes && (
            <div className="rounded-full border-2 border-amber-300/70 bg-amber-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-200">
              1 shelf slot unlocked
            </div>
          )}
        </div>
      </div>

      <div className={sectionClass} style={{ borderColor: activeScene.border }}>
        <div className="flex items-center gap-3">
          <Palette size={18} className="text-amber-200" />
          <h4 className="text-xl font-bold text-white">Choose Scene</h4>
          {!canUseVipScenes && (
            <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
              <Lock size={12} /> VIP perk
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PROFILE_SCENES.map((scene) => {
            const selected = vipSettings.profileSceneId === scene.id;
            const locked = !canUseVipScenes && scene.id !== "pallet-hideout";

            return (
              <button
                key={scene.id}
                type="button"
                disabled={!canUseVipScenes}
                onClick={() => vipSettings.setProfileSceneId(scene.id)}
                className={`rounded-[20px] border-4 p-4 text-left transition-transform ${
                  selected ? "translate-y-[-2px]" : ""
                } ${locked ? "opacity-55" : ""}`}
                style={{
                  borderColor: selected ? scene.accent : scene.border,
                  background: scene.background,
                  boxShadow: `0 8px 0 ${scene.shadow}`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="pixel-label text-[11px]">{scene.label}</span>
                  {locked ? <Lock size={14} color={scene.text} /> : <Star size={14} color={scene.text} />}
                </div>
                <p className="mt-4 text-lg font-bold" style={{ color: scene.text }}>
                  {scene.vibe}
                </p>
                <p
                  className="profile-prose mt-2 text-sm"
                  style={{ color: scene.mutedText }}
                >
                  {scene.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PROFILE_SCENE_EFFECTS.map((effect) => (
            <button
              key={effect.id}
              type="button"
              disabled={!canUseVipScenes}
              onClick={() => vipSettings.setProfileSceneEffect(effect.id)}
              className={`rounded-full border-2 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors ${
                vipSettings.profileSceneEffect === effect.id
                  ? "bg-white text-black"
                  : "bg-black/20 text-white/70"
              }`}
              style={{ borderColor: activeScene.accent }}
            >
              {effect.label}
            </button>
          ))}
        </div>

        <p className="profile-prose mt-3 text-sm text-white/60">
          Signature scene variants use the same room layout but shift the mood.
          Think golden hour, rainy window, or arcade bloom rather than a whole new theme pack.
        </p>

        {canUseVipScenes && (
          <button
            type="button"
            onClick={() => void handleVIPSave()}
            disabled={vipSettings.isVipLoading}
            className="mt-5 inline-flex items-center gap-2 rounded-full border-4 border-black bg-amber-300 px-5 py-3 font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-[-1px]"
          >
            <Save size={16} />
            {vipSettings.isVipLoading ? "Saving..." : "Save Scene Pack"}
          </button>
        )}

        {vipSettings.vipMessage && (
          <p className="mt-3 text-sm font-bold text-emerald-200">
            {vipSettings.vipMessage}
          </p>
        )}
      </div>

      <div className={sectionClass} style={{ borderColor: activeScene.border }}>
        <div className="flex items-center gap-3">
          <Ticket size={18} className="text-amber-200" />
          <h4 className="text-xl font-bold text-white">Manage Showcases</h4>
          <span className="ml-auto rounded-full border border-white/15 bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
            {slotLimit} slot{slotLimit > 1 ? "s" : ""}
          </span>
        </div>

        {showcaseLoading ? (
          <p className="profile-prose mt-4 text-sm text-white/60">Loading shelf layout...</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {showcases.map((slot, index) => (
              <div
                key={slot.slotIndex}
                className="rounded-[18px] border-2 bg-black/20 p-4"
                style={{ borderColor: activeScene.accent }}
              >
                <p className="pixel-label text-[11px]">Pedestal {index + 1}</p>
                <select
                  value={
                    slot.itemType && slot.itemRef
                      ? `${slot.itemType}:${slot.itemRef}`
                      : ""
                  }
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setShowcases((current) =>
                      current.map((entry) =>
                        entry.slotIndex !== slot.slotIndex
                          ? entry
                          : nextValue
                            ? {
                                ...entry,
                                itemType: nextValue.split(":")[0] as ShowcaseEditorSlot["itemType"],
                                itemRef: nextValue.slice(nextValue.indexOf(":") + 1),
                              }
                            : { ...entry, itemType: null, itemRef: null },
                      ),
                    );
                  }}
                  className="mt-3 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="">Leave this pedestal empty</option>
                  {groupedItems.map(([groupName, items]: [string, ProfileAvailableShowcaseItem[]]) => (
                    <optgroup key={groupName} label={groupName}>
                      {items.map((item: ProfileAvailableShowcaseItem) => (
                        <option
                          key={`${item.type}:${item.ref}`}
                          value={`${item.type}:${item.ref}`}
                        >
                          {itemLabel(item)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  value={slot.caption || ""}
                  onChange={(event) =>
                    setShowcases((current) =>
                      current.map((entry) =>
                        entry.slotIndex === slot.slotIndex
                          ? { ...entry, caption: truncate(event.target.value, 140) }
                          : entry,
                      ),
                    )
                  }
                  placeholder="Optional shelf note"
                  className="mt-3 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveShowcases()}
            disabled={showcaseSaving}
            className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-white px-5 py-3 font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
          >
            <Save size={16} />
            {showcaseSaving ? "Saving..." : "Save Shelf"}
          </button>
          {showcaseMessage && (
            <span className="text-sm font-bold text-emerald-200">{showcaseMessage}</span>
          )}
        </div>
      </div>

      <div className={sectionClass} style={{ borderColor: activeScene.border }}>
        <div className="flex items-center gap-3">
          <Users size={18} className="text-amber-200" />
          <h4 className="text-xl font-bold text-white">Manage Room Personas</h4>
          {!canUseVipScenes && (
            <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/60">
              <Lock size={12} /> VIP perk
            </span>
          )}
        </div>

        {!canUseVipScenes ? (
          <p className="profile-prose mt-4 text-sm text-white/60">
            Room personas let you keep different trainer names, badges, and scene moods for different watch rooms.
          </p>
        ) : personasLoading ? (
          <p className="profile-prose mt-4 text-sm text-white/60">Loading personas...</p>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {personas.map((persona, index) => (
                <div
                  key={`${persona.roomId}-${index}`}
                  className="rounded-[18px] border-2 bg-black/20 p-4"
                  style={{ borderColor: activeScene.accent }}
                >
                  <div className="grid gap-3 lg:grid-cols-2">
                    <select
                      value={persona.roomId}
                      onChange={(event) =>
                        setPersonas((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, roomId: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      className="rounded-xl border border-white/15 bg-black/35 px-3 py-3 text-sm text-white outline-none"
                    >
                      <option value="">Choose a room</option>
                      {availableRooms.map((room) => (
                        <option key={room.roomId} value={room.roomId}>
                          {room.roomName}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={persona.displayName}
                      onChange={(event) =>
                        setPersonas((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  displayName: truncate(event.target.value, 32),
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Room display name"
                      className="rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none"
                    />
                    <input
                      type="text"
                      value={persona.badgeEmoji}
                      onChange={(event) =>
                        setPersonas((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  badgeEmoji: truncate(event.target.value, 8),
                                }
                              : entry,
                          ),
                        )
                      }
                      placeholder="Badge emoji"
                      className="rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none"
                    />
                    <select
                      value={persona.sceneId}
                      onChange={(event) =>
                        setPersonas((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  sceneId: event.target.value as PersonaEditor["sceneId"],
                                }
                              : entry,
                          ),
                        )
                      }
                      className="rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none"
                    >
                      {PROFILE_SCENES.map((scene) => (
                        <option key={scene.id} value={scene.id}>
                          {scene.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={persona.aboutMe}
                    onChange={(event) =>
                      setPersonas((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? {
                                ...entry,
                                aboutMe: truncate(event.target.value, 180),
                              }
                            : entry,
                        ),
                      )
                    }
                    placeholder="Short room-specific intro"
                    className="mt-3 min-h-[86px] w-full rounded-xl border border-white/15 bg-black/25 px-3 py-3 text-sm text-white outline-none"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <select
                      value={persona.profileEffect}
                      onChange={(event) =>
                        setPersonas((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  profileEffect: event.target.value as PersonaEditor["profileEffect"],
                                }
                              : entry,
                          ),
                        )
                      }
                      className="rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                    >
                      {PROFILE_SCENE_EFFECTS.map((effect) => (
                        <option key={effect.id} value={effect.id}>
                          {effect.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setPersonas((current) =>
                          current.filter((_, entryIndex) => entryIndex !== index),
                        )
                      }
                      className="rounded-full border border-red-300/30 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setPersonas((current) => [
                    ...current,
                    {
                      roomId: availableRooms[0]?.roomId || "",
                      displayName: "",
                      badgeEmoji: "",
                      aboutMe: "",
                      sceneId: vipSettings.profileSceneId,
                      profileEffect: vipSettings.profileSceneEffect,
                    },
                  ])
                }
                className="rounded-full border-2 border-white/20 bg-black/25 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white"
              >
                Add Persona
              </button>
              <button
                type="button"
                onClick={() => void savePersonas()}
                disabled={personasSaving}
                className="inline-flex items-center gap-2 rounded-full border-4 border-black bg-amber-300 px-5 py-3 font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
              >
                <Save size={16} />
                {personasSaving ? "Saving..." : "Save Personas"}
              </button>
              {personaMessage && (
                <span className="text-sm font-bold text-emerald-200">
                  {personaMessage}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className={sectionClass} style={{ borderColor: activeScene.border }}>
        <button
          type="button"
          onClick={() => setShowAdvancedLab((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-amber-200" />
            <div>
              <h4 className="text-xl font-bold text-white">Advanced Lab</h4>
              <p className="profile-prose text-sm text-white/60">
                Legacy colors and card knobs stay here so existing profiles keep their custom identity.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
            {showAdvancedLab ? "Hide" : "Open"}
          </span>
        </button>

        {showAdvancedLab && (
          <div className="mt-5">
            <div className="mb-8 flex flex-col items-center justify-center rounded-[24px] border-4 border-white/10 bg-black/40 p-8 shadow-inner">
              <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/50">Live Preview</p>
              <ProfileCard
                avatarUrl={`/api/avatar/${profile.name}`}
                name={
                  profile.activeRoomPersona?.displayName ||
                  (vipSettings.vipBadge ? `${vipSettings.vipBadge} ${profile.name}` : profile.name)
                }
                title={profile.activeTitle || (profile.isVIP ? 'VIP Member' : 'Member')}
                handle={profile.name}
                showUserInfo={true}
                enableTilt={true}
                behindGlowEnabled={!!vipSettings.vipProfileGlow}
                behindGlowColor={vipSettings.vipProfileGlow || "rgba(0,0,0,0)"}
                innerGradient={vipSettings.vipProfileBg || "linear-gradient(to right, #000, #333)"}
                nameColor={vipSettings.vipCardNameGradient ? undefined : vipSettings.vipCardNameColor || vipSettings.vipNameColor}
                nameGradient={vipSettings.vipCardNameGradient || vipSettings.vipNameGradient}
                nameFont={vipSettings.vipFont}
                nameGlow={vipSettings.vipCardNameGlow || vipSettings.vipGlow}
                surfaceAccentColor={vipSettings.vipProfileAccent || activeScene.accent}
                surfaceBorderColor={vipSettings.vipProfileBorder || "rgba(255,255,255,0.1)"}
                surfacePanelFill={"rgba(0,0,0,0.4)"}
                surfaceTextColor={activeScene.text}
                surfaceMutedTextColor={activeScene.mutedText || "rgba(255,255,255,0.6)"}
                surfaceButtonFill={"rgba(255,255,255,0.1)"}
                titleColor={activeScene.text}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">VIP Name Color</span>
              <input
                type="color"
                value={colorInputValue(vipSettings.vipNameColor, "#ff69b4")}
                onChange={(event) => vipSettings.setVipNameColor(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Profile Card Fill</span>
              <input
                type="color"
                value={colorInputValue(vipSettings.vipProfileBg, activeScene.accent)}
                onChange={(event) =>
                  vipSettings.setVipProfileBg(
                    `linear-gradient(160deg, ${event.target.value} 0%, ${event.target.value}58 55%, ${event.target.value}88 100%)`,
                  )
                }
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Profile Card Accent</span>
              <input
                type="color"
                value={colorInputValue(vipSettings.vipProfileAccent, activeScene.accent)}
                onChange={(event) => vipSettings.setVipProfileAccent(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Profile Card Border</span>
              <input
                type="color"
                value={colorInputValue(vipSettings.vipProfileBorder, activeScene.border)}
                onChange={(event) => vipSettings.setVipProfileBorder(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Profile Card Glow</span>
              <input
                type="color"
                value={colorInputValue(vipSettings.vipProfileGlow, activeScene.accent)}
                onChange={(event) => vipSettings.setVipProfileGlow(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">ID Card Accent</span>
              <input
                type="color"
                value={colorInputValue(idCardSettings.idCardCustomAccent, activeScene.accent)}
                onChange={(event) => idCardSettings.setIdCardCustomAccent(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">ID Card Border</span>
              <input
                type="color"
                value={colorInputValue(idCardSettings.idCardCustomBorder, activeScene.border)}
                onChange={(event) => idCardSettings.setIdCardCustomBorder(event.target.value)}
                className="vip-color-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Badge Emoji</span>
              <input
                type="text"
                value={vipSettings.vipBadge}
                onChange={(event) => vipSettings.setVipBadge(event.target.value)}
                className="vip-select-input"
              />
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Font Mood</span>
              <select
                value={vipSettings.vipFont}
                onChange={(event) => vipSettings.setVipFont(event.target.value)}
                className="vip-select-input"
              >
                <option value="default">Default</option>
                <option value="mono">Mono</option>
                <option value="serif">Serif</option>
                <option value="cursive">Cursive</option>
                <option value="fantasy">Fantasy</option>
                <option value="comic">Comic</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">Card Style</span>
              <select
                value={idCardSettings.profileCardStyle}
                onChange={(event) =>
                  idCardSettings.setProfileCardStyle(
                    event.target.value as "classic" | "idcard",
                  )
                }
                className="vip-select-input"
              >
                <option value="classic">Classic profile card</option>
                <option value="idcard">ID card collectible</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="pixel-label text-[11px]">ID Card Theme</span>
              <select
                value={idCardSettings.idCardStyle}
                onChange={(event) =>
                  idCardSettings.setIdCardStyle(event.target.value as IDCardStyleKey)
                }
                className="vip-select-input"
              >
                {Object.entries(ID_CARD_STYLES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="vip-checkbox-row">
              <input
                type="checkbox"
                checked={vipSettings.vipGlow}
                onChange={(event) => vipSettings.setVipGlow(event.target.checked)}
              />
              Enable name glow
            </label>
            <label className="vip-checkbox-row">
              <input
                type="checkbox"
                checked={idCardSettings.idCardShowScanlines}
                onChange={(event) =>
                  idCardSettings.setIdCardShowScanlines(event.target.checked)
                }
              />
              Show ID card scanlines
            </label>
            <div className="settings-section-card text-sm text-white/70">
              Classic cards now inherit fill, accent, border, and glow on the profile page and room popup.
            </div>
          </div>
          </div>
        )}

        {showAdvancedLab && canUseVipScenes && (
          <button
            type="button"
            onClick={() => void handleVIPSave()}
            disabled={vipSettings.isVipLoading}
            className="mt-5 inline-flex items-center gap-2 rounded-full border-4 border-black bg-white px-5 py-3 font-bold text-black shadow-[4px_4px_0px_rgba(0,0,0,0.28)]"
          >
            <Crown size={16} />
            {vipSettings.isVipLoading ? "Saving..." : "Save Advanced Lab"}
          </button>
        )}
      </div>
    </div>
  );
}
