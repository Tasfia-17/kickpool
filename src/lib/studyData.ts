import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SCENE,
  STUDY_AMBIENCE_PRESETS,
  STUDY_ASSET_MANIFEST,
  STUDY_RECIPES,
  STUDY_SCENES,
  StudyContractRecord,
  StudyDashboardData,
  StudySessionRecord,
  StudySpaceRecord,
  StudyTaskRecord,
  getAmbientPreset,
  getStartOfDay,
  serializeDate,
} from '@/lib/study';

const ACTIVE_STATUSES = ['DRAFT', 'ACTIVE'];

function mapTask(task: {
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
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): StudyTaskRecord {
  return {
    ...task,
    completedAt: serializeDate(task.completedAt),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function mapContract(contract: {
  id: string;
  taskId: string | null;
  title: string;
  expectedOutcome: string;
  recipeId: string;
  energyMode: string;
  sessionMinutes: number;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
} | null): StudyContractRecord | null {
  if (!contract) {
    return null;
  }

  return {
    ...contract,
    startedAt: serializeDate(contract.startedAt),
    completedAt: serializeDate(contract.completedAt),
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

function mapSession(session: {
  id: string;
  contractId: string | null;
  taskId: string | null;
  recipeId: string;
  recipeName: string;
  status: string;
  energyMode: string;
  recoveryState: string | null;
  sceneId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  plannedFocusMinutes: number;
  actualFocusMinutes: number;
  plannedBreakMinutes: number;
  actualBreakMinutes: number;
  completedCycles: number;
  interruptionCount: number;
  outcome: string | null;
  debriefNote: string | null;
}): StudySessionRecord {
  return {
    ...session,
    startedAt: session.startedAt.toISOString(),
    endedAt: serializeDate(session.endedAt),
  };
}

function mapSpace(space: {
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
  lastLegacyImportAt: Date | null;
}): StudySpaceRecord {
  return {
    ...space,
    lastLegacyImportAt: serializeDate(space.lastLegacyImportAt),
  };
}

export function ensureStudySpace(userId: string) {
  const preset = getAmbientPreset(DEFAULT_SCENE.ambiencePresetId);
  return prisma.studySpace.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      sceneId: DEFAULT_SCENE.id,
      weather: DEFAULT_SCENE.weather,
      timeOfDay: DEFAULT_SCENE.timeOfDay,
      lampMode: 'focus',
      ambiencePresetId: DEFAULT_SCENE.ambiencePresetId,
      musicMode: 'ambient',
      focusTone: 'brown-noise',
      rainVolume: preset.defaultMix.rainVolume,
      windVolume: preset.defaultMix.windVolume,
      thunderVolume: preset.defaultMix.thunderVolume,
      birdsVolume: preset.defaultMix.birdsVolume,
      focusToneVolume: preset.defaultMix.focusToneVolume,
    },
  });
}

function sortTasks(tasks: StudyTaskRecord[]) {
  const statusWeight: Record<string, number> = {
    ACTIVE: 0,
    BACKLOG: 1,
    DONE: 2,
    ARCHIVED: 3,
  };
  const priorityWeight: Record<string, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };

  return [...tasks].sort((a, b) => {
    const statusDelta = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9);
    if (statusDelta !== 0) return statusDelta;

    const priorityDelta =
      (priorityWeight[a.priority] ?? 9) - (priorityWeight[b.priority] ?? 9);
    if (priorityDelta !== 0) return priorityDelta;

    if (a.position !== b.position) return a.position - b.position;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getStudyDashboard(userId: string): Promise<StudyDashboardData> {
  const startOfDay = getStartOfDay();

  const [
    space,
    tasks,
    contract,
    activeSession,
    recentSessions,
    completedStats,
    todayStats,
    user,
  ] = await prisma.$transaction([
    ensureStudySpace(userId),
    prisma.studyTask.findMany({
      where: { userId },
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
    }),
    prisma.studyContract.findFirst({
      where: {
        userId,
        status: { in: ACTIVE_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.studySession.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.studySession.findMany({
      where: {
        userId,
        status: { not: 'ACTIVE' },
      },
      orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
      take: 8,
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
      },
      _sum: {
        actualFocusMinutes: true,
        interruptionCount: true,
      },
      _avg: {
        actualFocusMinutes: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.studySession.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        startedAt: {
          gte: startOfDay,
        },
      },
      _sum: {
        actualFocusMinutes: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { studyStreak: true },
    }),
  ]);

  const mappedTasks = sortTasks(tasks.map(mapTask));
  const mappedRecentSessions = recentSessions.map(mapSession);
  const activeTask =
    mappedTasks.find((task) => task.status === 'ACTIVE') ??
    (contract?.taskId
      ? mappedTasks.find((task) => task.id === contract.taskId) ?? null
      : null);

  return {
    tasks: mappedTasks,
    activeTask,
    currentContract: mapContract(contract),
    activeSession: activeSession ? mapSession(activeSession) : null,
    recentSessions: mappedRecentSessions,
    scene: mapSpace(space),
    stats: {
      totalFocusMinutes: completedStats._sum.actualFocusMinutes ?? 0,
      todayFocusMinutes: todayStats._sum.actualFocusMinutes ?? 0,
      completedSessions: completedStats._count._all,
      completedToday: todayStats._count._all,
      averageSessionMinutes: Math.round(completedStats._avg.actualFocusMinutes ?? 0),
      interruptionCount: completedStats._sum.interruptionCount ?? 0,
      studyStreakHours: user?.studyStreak ?? 0,
    },
    journalPreview: mappedRecentSessions.slice(0, 4).map((session: StudySessionRecord) => ({
      id: session.id,
      startedAt: session.startedAt,
      outcome: session.outcome,
      recipeName: session.recipeName,
      focusMinutes: session.actualFocusMinutes,
      debriefNote: session.debriefNote,
    })),
    recipes: STUDY_RECIPES,
    scenes: STUDY_SCENES,
    ambiencePresets: STUDY_AMBIENCE_PRESETS,
    assetManifest: STUDY_ASSET_MANIFEST,
  };
}

export async function syncLegacyStudyStreak(userId: string) {
  const totals = await prisma.studySession.aggregate({
    where: {
      userId,
      status: 'COMPLETED',
    },
    _sum: {
      actualFocusMinutes: true,
    },
  });

  const totalFocusMinutes = totals._sum.actualFocusMinutes ?? 0;
  const derivedHours = Math.floor(totalFocusMinutes / 60);

  await prisma.user.update({
    where: { id: userId },
    data: {
      studyStreak: derivedHours,
    },
  });

  return derivedHours;
}

export async function getStudyJournal(userId: string) {
  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      status: { not: 'ACTIVE' },
    },
    orderBy: [{ endedAt: 'desc' }, { startedAt: 'desc' }],
    take: 24,
  });

  return sessions.map(mapSession);
}
