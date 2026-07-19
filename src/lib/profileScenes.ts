import type {
  ProfileSceneEffectId,
  ProfileSceneId,
} from "@/lib/profileTypes";

export interface ProfileSceneDefinition {
  id: ProfileSceneId;
  label: string;
  vibe: string;
  description: string;
  background: string;
  panel: string;
  panelSoft: string;
  border: string;
  accent: string;
  accentSoft: string;
  text: string;
  mutedText: string;
  shadow: string;
  shelf: string;
  desk: string;
  screen: string;
  sticker: string;
}

export interface ProfileSceneEffectDefinition {
  id: ProfileSceneEffectId;
  label: string;
  description: string;
  overlay: string;
  ambient: string;
}

export const PROFILE_SCENES: ProfileSceneDefinition[] = [
  {
    id: "pallet-hideout",
    label: "Pallet Hideout",
    vibe: "Warm starter-town bedroom",
    description: "Soft wood, map pins, VHS clutter, and a beginner trainer desk.",
    background:
      "radial-gradient(circle at top left, #f6d9a2 0%, #efc97f 22%, #4f2f1f 58%, #1d1312 100%)",
    panel: "rgba(46, 28, 22, 0.88)",
    panelSoft: "rgba(91, 55, 37, 0.5)",
    border: "#7d4e32",
    accent: "#f0b35e",
    accentSoft: "rgba(240, 179, 94, 0.18)",
    text: "#fff0d6",
    mutedText: "#e3c79f",
    shadow: "rgba(21, 8, 4, 0.5)",
    shelf: "#70492d",
    desk: "#9c6a43",
    screen: "#183529",
    sticker: "#ef8475",
  },
  {
    id: "celadon-video-club",
    label: "Celadon Video Club",
    vibe: "Green rental counter and membership wall",
    description: "Indoor neon signs, stacked tapes, and a boutique movie-club vibe.",
    background:
      "radial-gradient(circle at top right, #91f0b3 0%, #5fcf84 24%, #1e5140 58%, #0b1815 100%)",
    panel: "rgba(9, 32, 24, 0.9)",
    panelSoft: "rgba(34, 88, 67, 0.45)",
    border: "#4aa06c",
    accent: "#9dedb2",
    accentSoft: "rgba(157, 237, 178, 0.18)",
    text: "#e8fff0",
    mutedText: "#b9e7c8",
    shadow: "rgba(4, 18, 11, 0.52)",
    shelf: "#315d45",
    desk: "#467961",
    screen: "#1a3e32",
    sticker: "#ffe08c",
  },
  {
    id: "lavender-late-show",
    label: "Lavender Late Show",
    vibe: "Nocturnal projector nook",
    description: "Moonlit purple walls, glowing posters, and a sleepover marathoning mood.",
    background:
      "radial-gradient(circle at top center, #bb9eff 0%, #8353da 26%, #26153f 60%, #09050f 100%)",
    panel: "rgba(18, 10, 34, 0.92)",
    panelSoft: "rgba(55, 34, 95, 0.5)",
    border: "#8e6ce3",
    accent: "#dcb7ff",
    accentSoft: "rgba(220, 183, 255, 0.18)",
    text: "#f8ecff",
    mutedText: "#d3c4ef",
    shadow: "rgba(6, 4, 12, 0.6)",
    shelf: "#55387f",
    desk: "#6b4995",
    screen: "#1d1930",
    sticker: "#ff9ec9",
  },
  {
    id: "goldenrod-arcade-loft",
    label: "Goldenrod Arcade Loft",
    vibe: "Cozy arcade above the city",
    description: "Cabinet glow, scoreboards, and warm city lights behind the loft window.",
    background:
      "radial-gradient(circle at top left, #ffd85f 0%, #f7b33d 20%, #604112 58%, #171008 100%)",
    panel: "rgba(34, 22, 7, 0.92)",
    panelSoft: "rgba(107, 69, 21, 0.45)",
    border: "#d8a23e",
    accent: "#ffd56c",
    accentSoft: "rgba(255, 213, 108, 0.18)",
    text: "#fff5da",
    mutedText: "#e7cd9d",
    shadow: "rgba(26, 15, 4, 0.55)",
    shelf: "#7b5722",
    desk: "#9b7336",
    screen: "#281f0f",
    sticker: "#ff7c5a",
  },
  {
    id: "cinnabar-projection-booth",
    label: "Cinnabar Projection Booth",
    vibe: "Hot projector room with red bulbs",
    description: "Molten glow, analog projectors, and premium midnight screening energy.",
    background:
      "radial-gradient(circle at top right, #ff9d71 0%, #d85639 22%, #511c19 55%, #120708 100%)",
    panel: "rgba(38, 13, 12, 0.92)",
    panelSoft: "rgba(96, 31, 26, 0.46)",
    border: "#d46b4d",
    accent: "#ffb085",
    accentSoft: "rgba(255, 176, 133, 0.18)",
    text: "#fff0e5",
    mutedText: "#e8bea8",
    shadow: "rgba(21, 7, 5, 0.58)",
    shelf: "#7d3427",
    desk: "#995240",
    screen: "#321313",
    sticker: "#ffd166",
  },
];

export const PROFILE_SCENE_EFFECTS: ProfileSceneEffectDefinition[] = [
  {
    id: "none",
    label: "Calm",
    description: "Clean scene lighting with no signature variant.",
    overlay: "transparent",
    ambient: "none",
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    description: "Late-afternoon warmth and amber spill across the room.",
    overlay:
      "linear-gradient(135deg, rgba(255, 208, 122, 0.18) 0%, transparent 42%, rgba(255, 149, 87, 0.12) 100%)",
    ambient: "amber",
  },
  {
    id: "rainy-window",
    label: "Rainy Window",
    description: "Dimmed room edges and cool reflections rolling over the glass.",
    overlay:
      "linear-gradient(180deg, rgba(121, 180, 220, 0.18) 0%, transparent 36%, rgba(42, 69, 103, 0.22) 100%)",
    ambient: "rain",
  },
  {
    id: "starlit",
    label: "Starlit",
    description: "Soft moon particles and a calmer, midnight hideout tone.",
    overlay:
      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16) 0%, transparent 18%), radial-gradient(circle at 72% 24%, rgba(211, 194, 255, 0.14) 0%, transparent 14%), linear-gradient(180deg, rgba(38, 35, 76, 0.16) 0%, transparent 48%, rgba(8, 10, 20, 0.26) 100%)",
    ambient: "starlight",
  },
  {
    id: "arcade-bloom",
    label: "Arcade Bloom",
    description: "Scoreboard bloom and color bounce for VIP scene variants.",
    overlay:
      "linear-gradient(90deg, rgba(255, 77, 121, 0.14) 0%, transparent 22%, rgba(80, 246, 255, 0.12) 58%, transparent 100%)",
    ambient: "neon",
  },
];

export const PROFILE_SCENES_BY_ID = Object.fromEntries(
  PROFILE_SCENES.map((scene) => [scene.id, scene]),
) as Record<ProfileSceneId, ProfileSceneDefinition>;

export const PROFILE_SCENE_EFFECTS_BY_ID = Object.fromEntries(
  PROFILE_SCENE_EFFECTS.map((effect) => [effect.id, effect]),
) as Record<ProfileSceneEffectId, ProfileSceneEffectDefinition>;

export function getProfileScene(sceneId: ProfileSceneId): ProfileSceneDefinition {
  return PROFILE_SCENES_BY_ID[sceneId] ?? PROFILE_SCENES_BY_ID["pallet-hideout"];
}

export function getProfileSceneEffect(
  effectId: ProfileSceneEffectId,
): ProfileSceneEffectDefinition {
  return PROFILE_SCENE_EFFECTS_BY_ID[effectId] ?? PROFILE_SCENE_EFFECTS_BY_ID.none;
}
