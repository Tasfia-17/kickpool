export type StudyRecipeId =
  | 'ignition'
  | 'deep-reading'
  | 'problem-solving'
  | 'admin-sweep'
  | 'memorization';

export type StudyEnergyMode = 'low' | 'steady' | 'deep';
export type StudyTaskStatus = 'BACKLOG' | 'ACTIVE' | 'DONE' | 'ARCHIVED';
export type StudySessionStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type StudySessionOutcome = 'done' | 'partial' | 'blocked' | 'pivot';

export interface StudyRecipe {
  id: StudyRecipeId;
  label: string;
  shortLabel: string;
  description: string;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesPerLongBreak: number;
  energyMode: StudyEnergyMode;
  soundtrackHint: string;
  tools: string[];
}

export interface StudyScenePreset {
  id: string;
  label: string;
  description: string;
  weather: string;
  timeOfDay: string;
  ambiencePresetId: string;
  accent: string;
  glow: string;
}

export interface StudyAmbientPreset {
  id: string;
  label: string;
  description: string;
  defaultMix: {
    rainVolume: number;
    windVolume: number;
    thunderVolume: number;
    birdsVolume: number;
    focusToneVolume: number;
  };
}

export interface StudyAssetSource {
  id: string;
  name: string;
  license: string;
  url: string;
  usage: string;
}

export interface StudyAssetManifest {
  version: string;
  localAssets: Array<{
    id: string;
    type: 'texture' | 'sprite' | 'icon';
    path: string;
    usage: string;
  }>;
  openAssetSources: StudyAssetSource[];
  hotspots: Array<{
    id: string;
    label: string;
    mobileLabel: string;
  }>;
}

export interface StudyDashboardData {
  tasks: StudyTaskRecord[];
  activeTask: StudyTaskRecord | null;
  currentContract: StudyContractRecord | null;
  activeSession: StudySessionRecord | null;
  recentSessions: StudySessionRecord[];
  scene: StudySpaceRecord;
  stats: {
    totalFocusMinutes: number;
    todayFocusMinutes: number;
    completedSessions: number;
    completedToday: number;
    averageSessionMinutes: number;
    interruptionCount: number;
    studyStreakHours: number;
  };
  journalPreview: Array<{
    id: string;
    startedAt: string;
    outcome: string | null;
    recipeName: string;
    focusMinutes: number;
    debriefNote: string | null;
  }>;
  recipes: StudyRecipe[];
  scenes: StudyScenePreset[];
  ambiencePresets: StudyAmbientPreset[];
  assetManifest: StudyAssetManifest;
}

export interface StudyTaskRecord {
  id: string;
  title: string;
  details: string | null;
  status: string;
  priority: string;
  energy: string;
  taskType: string;
  etaMinutes: number | null;
  position: number;
  isPinned: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyContractRecord {
  id: string;
  taskId: string | null;
  title: string;
  expectedOutcome: string;
  recipeId: string;
  energyMode: string;
  sessionMinutes: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudySessionRecord {
  id: string;
  contractId: string | null;
  taskId: string | null;
  recipeId: string;
  recipeName: string;
  status: string;
  energyMode: string;
  recoveryState: string | null;
  sceneId: string | null;
  startedAt: string;
  endedAt: string | null;
  plannedFocusMinutes: number;
  actualFocusMinutes: number;
  plannedBreakMinutes: number;
  actualBreakMinutes: number;
  completedCycles: number;
  interruptionCount: number;
  outcome: string | null;
  debriefNote: string | null;
}

export interface StudySpaceRecord {
  id: string;
  sceneId: string;
  weather: string;
  timeOfDay: string;
  lampMode: string;
  ambiencePresetId: string;
  musicMode: string;
  lofiStationId: string | null;
  focusTone: string;
  rainVolume: number;
  windVolume: number;
  thunderVolume: number;
  birdsVolume: number;
  focusToneVolume: number;
  quietMode: boolean;
  scratchpad: string | null;
  parkingLot: string[];
  recoveryNudgeCount: number;
  lastLegacyImportAt: string | null;
}

export const STUDY_RECIPES: StudyRecipe[] = [
  {
    id: 'ignition',
    label: 'Ignition Mode',
    shortLabel: 'Ignition',
    description: 'Five minutes to break inertia and start moving.',
    focusMinutes: 5,
    breakMinutes: 2,
    longBreakMinutes: 5,
    cyclesPerLongBreak: 2,
    energyMode: 'low',
    soundtrackHint: 'Warm room tone, low-pressure beat, no dramatic cues.',
    tools: ['Single active task', 'Parking lot', 'Recovery nudge'],
  },
  {
    id: 'deep-reading',
    label: 'Deep Reading',
    shortLabel: 'Reading',
    description: 'Longer, calmer sessions for absorbing difficult material.',
    focusMinutes: 35,
    breakMinutes: 7,
    longBreakMinutes: 15,
    cyclesPerLongBreak: 3,
    energyMode: 'steady',
    soundtrackHint: 'Rain and brown noise with gentle low-end room ambience.',
    tools: ['Scratchpad', 'Highlight notes', 'Eye-rest break prompts'],
  },
  {
    id: 'problem-solving',
    label: 'Problem Solving',
    shortLabel: 'Solve',
    description: 'Focused bursts for coding, logic work, and hard thinking.',
    focusMinutes: 45,
    breakMinutes: 10,
    longBreakMinutes: 20,
    cyclesPerLongBreak: 2,
    energyMode: 'deep',
    soundtrackHint: 'Brown noise and low thunder with minimal melodic distraction.',
    tools: ['Contract outcome', 'Recovery flow', 'Interruption capture'],
  },
  {
    id: 'admin-sweep',
    label: 'Admin Sweep',
    shortLabel: 'Admin',
    description: 'Medium-length cleanup sessions for email, chores, and planning.',
    focusMinutes: 20,
    breakMinutes: 5,
    longBreakMinutes: 10,
    cyclesPerLongBreak: 3,
    energyMode: 'low',
    soundtrackHint: 'Soft vinyl crackle and bright window ambience.',
    tools: ['Backlog triage', 'One active task', 'Quick debrief'],
  },
  {
    id: 'memorization',
    label: 'Memorization',
    shortLabel: 'Memory',
    description: 'Compact repetition loops with built-in resets for recall work.',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 12,
    cyclesPerLongBreak: 4,
    energyMode: 'steady',
    soundtrackHint: 'Light birds and low rain, keeping the room airy and rhythmic.',
    tools: ['Short loops', 'Reset cues', 'Session recap'],
  },
];

export const STUDY_SCENES: StudyScenePreset[] = [
  {
    id: 'lamp-lit-loft',
    label: 'Lamp-Lit Loft',
    description: 'Warm wood, amber lamp glow, and rainy dusk beyond the window.',
    weather: 'rain',
    timeOfDay: 'dusk',
    ambiencePresetId: 'rainy-lofi',
    accent: '#d48d45',
    glow: '#ffddb4',
  },
  {
    id: 'moss-library',
    label: 'Moss Library',
    description: 'Paper beige shelves, muted green tones, and a quiet afternoon sky.',
    weather: 'wind',
    timeOfDay: 'afternoon',
    ambiencePresetId: 'forest-breeze',
    accent: '#6b8f61',
    glow: '#dce9bc',
  },
  {
    id: 'midnight-cassette',
    label: 'Midnight Cassette',
    description: 'Deep navy shadows, CRT amber, and a room built for long night sessions.',
    weather: 'storm',
    timeOfDay: 'night',
    ambiencePresetId: 'storm-focus',
    accent: '#7d6ad6',
    glow: '#b8b0ff',
  },
];

export const STUDY_AMBIENCE_PRESETS: StudyAmbientPreset[] = [
  {
    id: 'rainy-lofi',
    label: 'Rainy Lofi',
    description: 'Warm rain, soft wind, and a gentle focus hum.',
    defaultMix: {
      rainVolume: 42,
      windVolume: 16,
      thunderVolume: 0,
      birdsVolume: 0,
      focusToneVolume: 28,
    },
  },
  {
    id: 'forest-breeze',
    label: 'Forest Breeze',
    description: 'Open window air with birds and a softer cognitive bed.',
    defaultMix: {
      rainVolume: 0,
      windVolume: 22,
      thunderVolume: 0,
      birdsVolume: 24,
      focusToneVolume: 18,
    },
  },
  {
    id: 'storm-focus',
    label: 'Storm Focus',
    description: 'Deep-night rain with occasional distant thunder for heavy work.',
    defaultMix: {
      rainVolume: 55,
      windVolume: 12,
      thunderVolume: 10,
      birdsVolume: 0,
      focusToneVolume: 35,
    },
  },
];

export const STUDY_ASSET_MANIFEST: StudyAssetManifest = {
  version: '1.0.0',
  localAssets: [
    {
      id: 'pixel-weave-texture',
      type: 'texture',
      path: '/textures/pixel-weave.png',
      usage: 'Room grain, panel texture, and subtle pixel weave overlays.',
    },
    {
      id: 'cat-sprite-sheet',
      type: 'sprite',
      path: '/cats/tile000.png',
      usage: 'Default study companion icon and room mascot fallback.',
    },
    {
      id: 'theme-pokemon-sprites',
      type: 'sprite',
      path: '/sprites/small/25.png',
      usage: 'Theme-driven study companion variants.',
    },
  ],
  openAssetSources: [
    {
      id: 'kenney-top-down-shooter',
      name: 'Kenney Top-down Shooter',
      license: 'CC0',
      url: 'https://kenney.nl/assets/top-down-shooter',
      usage: 'Future room props, benches, desks, furniture, and top-down shell pieces.',
    },
    {
      id: 'oga-modern-houses',
      name: 'Modern Houses Tileset TopDown',
      license: 'CC0',
      url: 'https://opengameart.org/content/modern-houses-tileset-topdown',
      usage: 'Interior shells, floor plans, and top-down room composition.',
    },
    {
      id: 'oga-top-down-julia',
      name: 'Top down player sprite sheet (Julia)',
      license: 'CC0',
      url: 'https://opengameart.org/content/top-down-player-sprite-sheet-julia',
      usage: 'Player or desk-occupant sprite base for study avatars.',
    },
    {
      id: 'oga-hero-sprites',
      name: 'Hero character sprite sheet',
      license: 'CC0',
      url: 'https://opengameart.org/content/hero-character-sprite-sheet',
      usage: 'Additional idle and walk variants for room inhabitants.',
    },
    {
      id: 'oga-rpg-character-sprites',
      name: 'RPG character sprites',
      license: 'CC0',
      url: 'https://opengameart.org/content/rpg-character-sprites',
      usage: 'Alternate study partner and buddy-seat characters.',
    },
  ],
  hotspots: [
    { id: 'desk', label: 'Focus desk', mobileLabel: 'Desk' },
    { id: 'window', label: 'Scene window', mobileLabel: 'Window' },
    { id: 'notebook', label: 'Notebook and parking lot', mobileLabel: 'Notes' },
    { id: 'shelf', label: 'Shelf and journal', mobileLabel: 'Shelf' },
    { id: 'boombox', label: 'Boombox and mixer', mobileLabel: 'Audio' },
    { id: 'lamp', label: 'Lamp focus controls', mobileLabel: 'Lamp' },
  ],
};

export const DEFAULT_SCENE = STUDY_SCENES[0];
export const DEFAULT_RECIPE = STUDY_RECIPES[0];

export function getStudyRecipe(recipeId: string) {
  return STUDY_RECIPES.find((recipe) => recipe.id === recipeId) ?? DEFAULT_RECIPE;
}

export function getStudyScene(sceneId: string) {
  return STUDY_SCENES.find((scene) => scene.id === sceneId) ?? DEFAULT_SCENE;
}

export function getAmbientPreset(presetId: string) {
  return (
    STUDY_AMBIENCE_PRESETS.find((preset) => preset.id === presetId) ??
    STUDY_AMBIENCE_PRESETS[0]
  );
}

export function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function serializeDate(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

export function clampVolume(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
