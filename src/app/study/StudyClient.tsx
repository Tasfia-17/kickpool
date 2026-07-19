'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import clsx from 'clsx';
import {
  AudioLines,
  BookOpen,
  CheckCircle2,
  LoaderCircle,
  MoonStar,
  NotebookPen,
  Plus,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';

import { AmbiencePlayer } from '@/components/study/AmbiencePlayer';
import { usePokemonTheme } from '@/components/PokemonThemeProvider';
import { useToast } from '@/components/ui/Toast';
import styles from './study-room.module.css';
import {
  DEFAULT_RECIPE,
  StudyDashboardData,
  StudyEnergyMode,
  StudySessionOutcome,
  getStudyRecipe,
  getStudyScene,
} from '@/lib/study';
import { StudyDrawer } from './StudyDrawer';
import { StudyRoomView } from './StudyRoomView';

type DrawerId = 'contract' | 'notebook' | 'shelf' | 'window' | 'boombox' | null;

const SECONDARY_LOFI_STATIONS = [
  { id: 'https://stream.zeno.fm/f3wvbbqmdg8uv', name: 'Zeno FM Lofi', label: 'Endless Lo-fi coding beats' },
  { id: 'https://listen.moe/stream', name: 'Listen.moe', label: 'Japanese Anime / J-pop' },
  { id: 'https://stream.nightride.fm/nightride.mp3', name: 'Nightride FM', label: 'Late-night synthwave' },
];

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildLegacyScratchpad() {
  const quickNotes = window.localStorage.getItem('study-quick-notes');
  const notebookRaw = window.localStorage.getItem('study-notebook-v2');
  let notebookText = '';

  if (notebookRaw) {
    try {
      const parsed = JSON.parse(notebookRaw) as Array<{ textContent?: string; title?: string }>;
      notebookText = parsed
        .slice(0, 3)
        .map((note) => [note.title, note.textContent].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n\n');
    } catch {
      notebookText = '';
    }
  }

  return [quickNotes, notebookText].filter(Boolean).join('\n\n').trim();
}

function collectLegacyMigrationPayload() {
  const tasksRaw = window.localStorage.getItem('study-todos');
  const sessionsRaw = window.localStorage.getItem('study-sessions');
  const scratchpad = buildLegacyScratchpad();

  let tasks: unknown[] = [];
  let sessions: unknown[] = [];

  if (tasksRaw) {
    try {
      tasks = JSON.parse(tasksRaw);
    } catch {
      tasks = [];
    }
  }

  if (sessionsRaw) {
    try {
      sessions = JSON.parse(sessionsRaw);
    } catch {
      sessions = [];
    }
  }

  return { tasks, sessions, scratchpad };
}

export default function StudyClient({
  initialDashboard,
  userName,
}: {
  initialDashboard: StudyDashboardData;
  userName: string;
}) {
  const { pokemonSprite } = usePokemonTheme();
  const { addToast } = useToast();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [activeDrawer, setActiveDrawer] = useState<DrawerId>(null);
  const [sceneDraft, setSceneDraft] = useState(initialDashboard.scene);
  const [scratchpad, setScratchpad] = useState(initialDashboard.scene.scratchpad ?? '');
  const [parkingLot, setParkingLot] = useState<string[]>(initialDashboard.scene.parkingLot);
  const [parkingInput, setParkingInput] = useState('');
  const [taskTitle, setTaskTitle] = useState(
    initialDashboard.activeTask?.title ?? initialDashboard.currentContract?.title ?? '',
  );
  const [taskDetails, setTaskDetails] = useState(initialDashboard.activeTask?.details ?? '');
  const [selectedTaskId, setSelectedTaskId] = useState(
    initialDashboard.activeTask?.id ?? initialDashboard.currentContract?.taskId ?? '',
  );
  const [expectedOutcome, setExpectedOutcome] = useState(
    initialDashboard.currentContract?.expectedOutcome ?? '',
  );
  const [recipeId, setRecipeId] = useState(
    initialDashboard.currentContract?.recipeId ??
      initialDashboard.activeSession?.recipeId ??
      DEFAULT_RECIPE.id,
  );
  const [energyMode, setEnergyMode] = useState<StudyEnergyMode>(
    (initialDashboard.currentContract?.energyMode as StudyEnergyMode) ??
      (initialDashboard.activeSession?.energyMode as StudyEnergyMode) ??
      DEFAULT_RECIPE.energyMode,
  );
  const [sessionMinutes, setSessionMinutes] = useState(
    initialDashboard.currentContract?.sessionMinutes ??
      initialDashboard.activeSession?.plannedFocusMinutes ??
      DEFAULT_RECIPE.focusMinutes,
  );
  const [debriefOutcome, setDebriefOutcome] = useState<StudySessionOutcome>('partial');
  const [debriefNote, setDebriefNote] = useState('');
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [quickCaptureText, setQuickCaptureText] = useState('');
  const [recoveryPrompt, setRecoveryPrompt] = useState({ visible: false, hiddenMinutes: 0 });
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [lofiEnabled, setLofiEnabled] = useState(initialDashboard.scene.musicMode === 'lofi');
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [, startTransition] = useTransition();
  const migrationAttemptedRef = useRef(false);
  const checkpointMinuteRef = useRef(-1);
  const hiddenStartedAtRef = useRef<number | null>(null);
  const timeoutHandledRef = useRef(false);
  const [nowMs, setNowMs] = useState(Date.now());

  const currentRecipe = useMemo(
    () => getStudyRecipe(recipeId || dashboard.currentContract?.recipeId || DEFAULT_RECIPE.id),
    [dashboard.currentContract?.recipeId, recipeId],
  );
  const scenePreset = useMemo(() => getStudyScene(sceneDraft.sceneId), [sceneDraft.sceneId]);

  const activeSession = dashboard.activeSession;
  const elapsedSeconds = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    const startedAt = new Date(activeSession.startedAt).getTime();
    return Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  }, [activeSession, nowMs]);

  const totalSeconds = (activeSession?.plannedFocusMinutes ?? sessionMinutes) * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const sessionProgress = totalSeconds ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

  const applyDashboard = useCallback(
    (nextDashboard: StudyDashboardData, options?: { preserveDrafts?: boolean }) => {
      startTransition(() => {
        setDashboard(nextDashboard);
        setSceneDraft(nextDashboard.scene);
        setScratchpad(nextDashboard.scene.scratchpad ?? '');
        setParkingLot(nextDashboard.scene.parkingLot);
        setLofiEnabled(nextDashboard.scene.musicMode === 'lofi');

        if (!options?.preserveDrafts) {
          setSelectedTaskId(nextDashboard.activeTask?.id ?? nextDashboard.currentContract?.taskId ?? '');
          setTaskTitle(nextDashboard.activeTask?.title ?? nextDashboard.currentContract?.title ?? '');
          setTaskDetails(nextDashboard.activeTask?.details ?? '');
          setExpectedOutcome(nextDashboard.currentContract?.expectedOutcome ?? '');
          setRecipeId(
            nextDashboard.currentContract?.recipeId ??
              nextDashboard.activeSession?.recipeId ??
              DEFAULT_RECIPE.id,
          );
          setEnergyMode(
            ((nextDashboard.currentContract?.energyMode ??
              nextDashboard.activeSession?.energyMode ??
              DEFAULT_RECIPE.energyMode) as StudyEnergyMode) || DEFAULT_RECIPE.energyMode,
          );
          setSessionMinutes(
            nextDashboard.currentContract?.sessionMinutes ??
              nextDashboard.activeSession?.plannedFocusMinutes ??
              DEFAULT_RECIPE.focusMinutes,
          );
        }

        if (!nextDashboard.activeSession) {
          checkpointMinuteRef.current = -1;
          timeoutHandledRef.current = false;
        }
      });
    },
    [startTransition],
  );

  const fetchDashboard = useCallback(async () => {
    const response = await fetch('/api/study/dashboard', { cache: 'no-store' });
    const data = (await response.json()) as StudyDashboardData | { error: string };

    if (!response.ok) {
      throw new Error('error' in data ? data.error : 'Failed to refresh study dashboard');
    }

    applyDashboard(data as StudyDashboardData);
    return data as StudyDashboardData;
  }, [applyDashboard]);

  const mutateDashboard = useCallback(
    async (url: string, init: RequestInit, label?: string, options?: { preserveDrafts?: boolean }) => {
      setBusyLabel(label ?? null);
      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(init.headers ?? {}),
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Request failed');
        }

        if (data?.recipes && data?.scene && data?.stats) {
          applyDashboard(data as StudyDashboardData, options);
        }

        return data;
      } finally {
        setBusyLabel(null);
      }
    },
    [applyDashboard],
  );

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeSession?.id]);

  useEffect(() => {
    if (!activeSession || remainingSeconds > 0 || timeoutHandledRef.current) {
      return;
    }

    timeoutHandledRef.current = true;
    setActiveDrawer('contract');
    addToast({
      type: 'success',
      title: 'Session ready to debrief',
      message: 'The timer finished. Capture the outcome before the room fades the moment.',
    });
  }, [activeSession, addToast, remainingSeconds]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const currentMinute = Math.max(activeSession.actualFocusMinutes, Math.floor(elapsedSeconds / 60));
    if (currentMinute <= 0 || currentMinute === checkpointMinuteRef.current) {
      return;
    }

    checkpointMinuteRef.current = currentMinute;
    void fetch('/api/study/session/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: activeSession.id,
        actualFocusMinutes: currentMinute,
        completedCycles: Math.max(
          1,
          Math.ceil(currentMinute / Math.max(activeSession.plannedFocusMinutes, 1)),
        ),
      }),
    }).catch(() => {
      checkpointMinuteRef.current = currentMinute - 1;
    });
  }, [activeSession, elapsedSeconds]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenStartedAtRef.current = Date.now();
        return;
      }

      if (!hiddenStartedAtRef.current) {
        return;
      }

      const hiddenMinutes = Math.max(
        1,
        Math.round((Date.now() - hiddenStartedAtRef.current) / 60000),
      );
      hiddenStartedAtRef.current = null;

      if (hiddenMinutes < 1) {
        return;
      }

      setRecoveryPrompt({ visible: true, hiddenMinutes });

      void fetch('/api/study/session/checkpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          actualFocusMinutes: Math.floor(elapsedSeconds / 60),
          interruptionDelta: 1,
          recoveryState: 'drifted',
        }),
      }).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeSession, elapsedSeconds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key.toLowerCase() === 'p' && activeSession && !isTyping) {
        event.preventDefault();
        setQuickCaptureOpen(true);
      }

      if (event.key === 'Escape') {
        setQuickCaptureOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession]);

  useEffect(() => {
    if (dashboard.scene.lastLegacyImportAt || migrationAttemptedRef.current) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const payload = collectLegacyMigrationPayload();
    if (!payload.tasks.length && !payload.sessions.length && !payload.scratchpad) {
      migrationAttemptedRef.current = true;
      return;
    }

    migrationAttemptedRef.current = true;
    void mutateDashboard(
      '/api/study/migrate',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'Importing legacy study data...',
    )
      .then(() => {
        addToast({
          type: 'success',
          title: 'Study room upgraded',
          message: 'Your old notes and study fragments were imported into the new room.',
        });
      })
      .catch((error) => {
        addToast({
          type: 'error',
          title: 'Legacy import failed',
          message:
            error instanceof Error
              ? error.message
              : 'The room could not import old study data.',
        });
      });
  }, [addToast, dashboard.scene.lastLegacyImportAt, mutateDashboard]);

  const handleSaveScene = useCallback(async () => {
    try {
      await mutateDashboard(
        '/api/study/scene',
        {
          method: 'PUT',
          body: JSON.stringify(sceneDraft),
        },
        'Saving room scene...',
        { preserveDrafts: true },
      );
      addToast({
        type: 'success',
        title: 'Scene updated',
        message: 'The room world shifted to your new scene settings.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Scene update failed',
        message:
          error instanceof Error ? error.message : 'Could not save the scene settings.',
      });
    }
  }, [addToast, mutateDashboard, sceneDraft]);

  const handleSaveNotebook = useCallback(async () => {
    try {
      await mutateDashboard(
        '/api/study/scene',
        {
          method: 'PUT',
          body: JSON.stringify({
            scratchpad,
            parkingLot,
          }),
        },
        'Saving notebook...',
        { preserveDrafts: true },
      );
      addToast({
        type: 'success',
        title: 'Notebook saved',
        message: 'The room shelf now remembers your scratchpad and parking lot.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Notebook save failed',
        message: error instanceof Error ? error.message : 'Could not save notes right now.',
      });
    }
  }, [addToast, mutateDashboard, parkingLot, scratchpad]);

  const handleAddParkingItem = useCallback(() => {
    const value = quickCaptureOpen ? quickCaptureText.trim() : parkingInput.trim();
    if (!value) {
      return;
    }

    const nextParkingLot = [value, ...parkingLot].slice(0, 16);
    setParkingLot(nextParkingLot);
    setParkingInput('');
    setQuickCaptureText('');
    setQuickCaptureOpen(false);

    void mutateDashboard(
      '/api/study/scene',
      {
        method: 'PUT',
        body: JSON.stringify({
          scratchpad,
          parkingLot: nextParkingLot,
        }),
      },
      'Capturing interruption...',
      { preserveDrafts: true },
    ).catch(() => {
      addToast({
        type: 'error',
        title: 'Parking lot failed',
        message: 'The note stayed locally, but the server did not save it yet.',
      });
    });
  }, [
    addToast,
    mutateDashboard,
    parkingLot,
    parkingInput,
    quickCaptureOpen,
    quickCaptureText,
    scratchpad,
  ]);

  const handleCreateTask = useCallback(
    async (activate: boolean) => {
      if (!taskTitle.trim()) {
        addToast({
          type: 'error',
          title: 'Task title required',
          message: 'Give the task a name before placing it in the room.',
        });
        return;
      }

      try {
        await mutateDashboard(
          '/api/study/tasks',
          {
            method: 'PUT',
            body: JSON.stringify({
              action: 'create',
              title: taskTitle,
              details: taskDetails,
              activate,
              energy: energyMode,
              etaMinutes: sessionMinutes,
            }),
          },
          activate ? 'Bringing task to desk...' : 'Saving to backlog...',
        );
        addToast({
          type: 'success',
          title: activate ? 'Task brought to desk' : 'Task saved',
          message: activate
            ? 'The desk is now centered on the new active task.'
            : 'The task went into the backlog for later.',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Task update failed',
          message: error instanceof Error ? error.message : 'Could not create the task.',
        });
      }
    },
    [addToast, energyMode, mutateDashboard, sessionMinutes, taskDetails, taskTitle],
  );

  const handleActivateTask = useCallback(
    async (taskId: string) => {
      try {
        await mutateDashboard(
          '/api/study/tasks',
          {
            method: 'PUT',
            body: JSON.stringify({
              action: 'activate',
              taskId,
            }),
          },
          'Bringing task to desk...',
        );
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Could not activate task',
          message:
            error instanceof Error
              ? error.message
              : 'The task could not be moved to the desk.',
        });
      }
    },
    [addToast, mutateDashboard],
  );

  const handleCompleteTask = useCallback(
    async (taskId: string) => {
      try {
        await mutateDashboard(
          '/api/study/tasks',
          {
            method: 'PUT',
            body: JSON.stringify({
              action: 'complete',
              taskId,
            }),
          },
          'Marking task complete...',
        );
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Could not complete task',
          message:
            error instanceof Error ? error.message : 'The task could not be completed.',
        });
      }
    },
    [addToast, mutateDashboard],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await mutateDashboard(
          '/api/study/tasks',
          {
            method: 'PUT',
            body: JSON.stringify({
              action: 'delete',
              taskId,
            }),
          },
          'Removing task...',
        );
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Could not remove task',
          message: error instanceof Error ? error.message : 'The task could not be removed.',
        });
      }
    },
    [addToast, mutateDashboard],
  );

  const handleStartSession = useCallback(async () => {
    if (!expectedOutcome.trim()) {
      addToast({
        type: 'error',
        title: 'Expected outcome required',
        message: 'Define what "done for now" looks like before you start the session.',
      });
      return;
    }

    if (!selectedTaskId && !taskTitle.trim()) {
      addToast({
        type: 'error',
        title: 'Choose one active task',
        message: 'Bring a task to the desk or type a new one before starting.',
      });
      return;
    }

    try {
      await mutateDashboard(
        '/api/study/session/start',
        {
          method: 'POST',
          body: JSON.stringify({
            taskId: selectedTaskId || undefined,
            taskTitle: selectedTaskId ? undefined : taskTitle,
            taskDetails: selectedTaskId ? undefined : taskDetails,
            expectedOutcome,
            recipeId,
            energyMode,
            sessionMinutes,
            title: taskTitle,
          }),
        },
        'Lighting the desk...',
      );
      setActiveDrawer(null);
      addToast({
        type: 'success',
        title: 'Session started',
        message:
          'The room locked in. Press P anytime to drop a distraction into the parking lot.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Session start failed',
        message:
          error instanceof Error
            ? error.message
            : 'The room could not start the study session.',
      });
    }
  }, [
    addToast,
    energyMode,
    expectedOutcome,
    mutateDashboard,
    recipeId,
    selectedTaskId,
    sessionMinutes,
    taskDetails,
    taskTitle,
  ]);

  const handleCompleteSession = useCallback(
    async (outcome: StudySessionOutcome) => {
      if (!activeSession) {
        return;
      }

      try {
        await mutateDashboard(
          '/api/study/session/complete',
          {
            method: 'POST',
            body: JSON.stringify({
              sessionId: activeSession.id,
              outcome,
              debriefNote,
              actualFocusMinutes: Math.max(
                activeSession.actualFocusMinutes,
                Math.floor(elapsedSeconds / 60),
              ),
              actualBreakMinutes: activeSession.actualBreakMinutes,
              completedCycles: Math.max(activeSession.completedCycles, 1),
              interruptionCount: activeSession.interruptionCount,
              recoveryState: recoveryPrompt.visible ? 'recovered' : 'steady',
            }),
          },
          'Wrapping the session...',
        );

        setActiveDrawer('shelf');
        setDebriefNote('');
        setDebriefOutcome('partial');
        setRecoveryPrompt({ visible: false, hiddenMinutes: 0 });
        addToast({
          type: 'success',
          title: 'Session logged',
          message: 'The room wrote the session into your journal and updated your stats.',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Debrief failed',
          message:
            error instanceof Error ? error.message : 'The session could not be completed.',
        });
      }
    },
    [activeSession, addToast, debriefNote, elapsedSeconds, mutateDashboard, recoveryPrompt.visible],
  );

  const handleRecoveryAction = useCallback(
    async (mode: 'resume' | 'shrink' | 'switch') => {
      if (!activeSession) {
        setRecoveryPrompt({ visible: false, hiddenMinutes: 0 });
        return;
      }

      if (mode === 'resume') {
        setRecoveryPrompt({ visible: false, hiddenMinutes: 0 });
        await fetch('/api/study/session/checkpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSession.id,
            actualFocusMinutes: Math.floor(elapsedSeconds / 60),
            recoveryState: 'resumed',
          }),
        }).catch(() => {});
        return;
      }

      const nextRecipe = mode === 'shrink' ? 'ignition' : 'admin-sweep';
      await handleCompleteSession('partial');
      setRecipeId(nextRecipe);
      setSessionMinutes(getStudyRecipe(nextRecipe).focusMinutes);
      setExpectedOutcome('');
      setActiveDrawer('contract');
    },
    [activeSession, elapsedSeconds, handleCompleteSession],
  );

  const selectedTask = useMemo(
    () => dashboard.tasks.find((task) => task.id === selectedTaskId) ?? dashboard.activeTask,
    [dashboard.activeTask, dashboard.tasks, selectedTaskId],
  );

  useEffect(() => {
    if (!selectedTaskId && dashboard.activeTask) {
      setSelectedTaskId(dashboard.activeTask.id);
    }
  }, [dashboard.activeTask, selectedTaskId]);

  const drawerSubtitle = {
    contract: activeSession
      ? 'Capture the session outcome, decide what happens to the task, and let the room write the moment into your journal.'
      : 'Put one task on the desk, define the finish line, and pick the focus recipe that matches your energy.',
    notebook:
      'Use the scratchpad for active thinking and the parking lot for interruptions you do not want to lose.',
    shelf:
      'This shelf remembers your sessions, recipes, room kit, and the stats that build up over time.',
    window:
      'Scene, weather, lamp, and quiet mode all live here. The room should feel intentional, never random.',
    boombox:
      "The audio bed is ambient by default. Optional lo-fi relay exists as a secondary layer, not the room's backbone.",
  } as const;

  return (
    <>
      <AmbiencePlayer
        rain={sceneDraft.rainVolume > 0}
        wind={sceneDraft.windVolume > 0}
        lightning={sceneDraft.thunderVolume > 0}
        birds={sceneDraft.birdsVolume > 0}
        focusTone={sceneDraft.focusToneVolume > 0}
        focusToneType={sceneDraft.focusTone as 'brown-noise' | 'pink-noise' | 'vinyl'}
        rainVolume={sceneDraft.rainVolume}
        windVolume={sceneDraft.windVolume}
        lightningVolume={sceneDraft.thunderVolume}
        birdsVolume={sceneDraft.birdsVolume}
        focusToneVolume={sceneDraft.focusToneVolume}
      />

{lofiEnabled && lofiPlaying ? (
          <audio
            title="Secondary lofi relay"
            className="pointer-events-none absolute opacity-0"
            src={sceneDraft.lofiStationId || SECONDARY_LOFI_STATIONS[0].id}
            autoPlay
            loop
        />
      ) : null}

      <StudyRoomView
        userName={userName}
        scenePreset={scenePreset}
        scene={sceneDraft}
        activeTask={dashboard.activeTask}
        currentContract={dashboard.currentContract}
        activeSession={activeSession}
        stats={dashboard.stats}
        remainingLabel={formatClock(remainingSeconds)}
        sessionProgress={sessionProgress}
        onOpenDrawer={(drawer) => setActiveDrawer(drawer)}
        recoveryPrompt={recoveryPrompt}
        onDismissRecovery={() => setRecoveryPrompt({ visible: false, hiddenMinutes: 0 })}
        onRecoveryAction={handleRecoveryAction}
        companionSprite={pokemonSprite || '/cats/tile000.png'}
      />

      <StudyDrawer
        title={
          activeDrawer === 'contract'
            ? activeSession
              ? 'Session Debrief'
              : 'Desk Contract'
            : activeDrawer === 'notebook'
              ? 'Notebook'
              : activeDrawer === 'shelf'
                ? 'Shelf'
                : activeDrawer === 'window'
                  ? 'Window'
                  : 'Boombox'
        }
        subtitle={activeDrawer ? drawerSubtitle[activeDrawer] : undefined}
        open={activeDrawer !== null}
        onClose={() => setActiveDrawer(null)}
      >
        {busyLabel ? (
          <div className="inline-flex items-center gap-2 border-4 border-black bg-[#fff8ea] px-4 py-3 font-mono text-sm uppercase tracking-[0.14em] text-[#3a2114]">
            <LoaderCircle size={16} className="animate-spin" />
            {busyLabel}
          </div>
        ) : null}

        {activeDrawer === 'contract' ? (
          <div className="space-y-5">
            {activeSession ? (
              <>
                <div className={styles.receiptContainer}>
                  <div className={styles.receiptHeader}>
                    <div className={styles.receiptTitle}>RECEIPT OF FOCUS</div>
                    <div className={styles.receiptSub}>Terminal: {userName} // {new Date().toLocaleDateString()}</div>
                  </div>
                  <div className={styles.receiptBody}>
                    <div className={styles.receiptRow}>
                      <span>TASK:</span>
                      <span className="font-bold max-w-[200px] truncate text-right">
                        {dashboard.activeTask?.title || dashboard.currentContract?.title || 'Active Session'}
                      </span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span>TARGET:</span>
                      <span className="max-w-[200px] truncate text-right">
                        {dashboard.currentContract?.expectedOutcome || '-'}
                      </span>
                    </div>
                    <div className="my-3 border-b-2 border-dashed border-[#d1c8b8]" />
                    <div className={styles.receiptRow}>
                      <span>RECIPE:</span>
                      <span>{activeSession.recipeName}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span>TIME EXPENDED:</span>
                      <span>{formatClock(elapsedSeconds)}</span>
                    </div>
                    <div className={styles.receiptRow}>
                      <span>INTERRUPTIONS:</span>
                      <span>{activeSession.interruptionCount}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 font-mono text-[0.76rem] uppercase tracking-[0.22em] text-[#845b43]">
                  Declare Outcome
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['done', 'partial', 'blocked', 'pivot'] as StudySessionOutcome[]).map(
                    (outcome) => (
                      <button
                        key={outcome}
                        type="button"
                        onClick={() => setDebriefOutcome(outcome)}
                        className={clsx(
                          'border-4 border-black px-4 py-4 text-left transition-all',
                          debriefOutcome === outcome
                            ? 'bg-[#ab8e76] text-white shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]'
                            : 'bg-white hover:bg-[#fff9f2]',
                        )}
                      >
                        <div className="font-mono text-sm uppercase tracking-[0.14em]">
                          {outcome}
                        </div>
                        <p className={clsx('mt-2 text-sm leading-6 text-inherit opacity-80')}>
                          {outcome === 'done'
                            ? 'Task is complete enough to leave the desk.'
                            : outcome === 'partial'
                              ? 'Good progress, but the task should stay alive.'
                              : outcome === 'blocked'
                                ? 'Something stopped the work and needs a new approach.'
                                : 'The session changed the shape of the work.'}
                        </p>
                      </button>
                    ),
                  )}
                </div>

                <label className="block mt-2">
                  <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    Debrief Note (Signed)
                  </span>
                  <textarea
                    value={debriefNote}
                    onChange={(event) => setDebriefNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full border-4 border-black bg-[#faf8f5] px-4 py-3 text-sm leading-6 text-[#2d1c17] outline-none font-mono"
                    placeholder="Type a 1-line recap..."
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleCompleteSession(debriefOutcome)}
                  className={styles.waxSealBtn}
                  title="Seal the session and record it in your legacy"
                >
                  SEAL
                </button>
              </>
            ) : (
              <>
                <div className="border-4 border-black bg-[#fff8ea] p-4">
                  <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <label className="block">
                        <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                          Desk task
                        </span>
                        <input
                          value={taskTitle}
                          onChange={(event) => {
                            setTaskTitle(event.target.value);
                            if (selectedTaskId) {
                              setSelectedTaskId('');
                            }
                          }}
                          className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                          placeholder="Summarize chapter 4"
                        />
                      </label>
                      <label className="mt-4 block">
                        <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                          Expected outcome
                        </span>
                        <textarea
                          value={expectedOutcome}
                          onChange={(event) => setExpectedOutcome(event.target.value)}
                          rows={4}
                          className="mt-2 w-full border-4 border-black bg-white px-4 py-3 text-sm leading-6 text-[#2d1c17] outline-none"
                          placeholder="Finish the notes, capture three main ideas, and leave one open question."
                        />
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div className="border-4 border-black bg-white p-3">
                        <div className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                          Active backlog item
                        </div>
                        <div className="mt-3 space-y-2">
                          {dashboard.tasks
                            .filter((task) => task.status !== 'DONE' && task.status !== 'ARCHIVED')
                            .slice(0, 5)
                            .map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setTaskTitle(task.title);
                                  setTaskDetails(task.details ?? '');
                                }}
                                className={clsx(
                                  'w-full border-4 border-black px-3 py-3 text-left',
                                  selectedTaskId === task.id ? 'bg-[#ffe3b0]' : 'bg-[#fff8ea]',
                                )}
                              >
                                <div className="font-mono text-sm uppercase tracking-[0.12em]">
                                  {task.status === 'ACTIVE' ? 'On desk' : 'Backlog'}
                                </div>
                                <div className="mt-1 font-semibold">{task.title}</div>
                              </button>
                            ))}
                        </div>
                      </div>

                      {selectedTask ? (
                        <div className="border-4 border-black bg-[#fff8ea] p-4">
                          <div className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                            {selectedTask.status === 'ACTIVE' ? 'Desk-ready task' : 'Selected task'}
                          </div>
                          <div className="mt-2 font-semibold text-[#241513]">
                            {selectedTask.title}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#5b4035]">
                            {selectedTask.details ||
                              'No extra task details yet. Add a note if this desk item needs more context.'}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedTask.status !== 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => handleActivateTask(selectedTask.id)}
                                className="border-4 border-black bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]"
                              >
                                Bring selected to desk
                              </button>
                            ) : null}
                            {selectedTask.status !== 'DONE' ? (
                              <button
                                type="button"
                                onClick={() => handleCompleteTask(selectedTask.id)}
                                className="border-4 border-black bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.14em]"
                              >
                                Mark done
                              </button>
                            ) : null}
                            {selectedTask.status !== 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(selectedTask.id)}
                                className="border-4 border-black bg-[#2b1917] px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[#fff1d7]"
                              >
                                Archive
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <label className="block">
                        <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                          Task details
                        </span>
                        <textarea
                          value={taskDetails}
                          onChange={(event) => setTaskDetails(event.target.value)}
                          rows={5}
                          className="mt-2 w-full border-4 border-black bg-white px-4 py-3 text-sm leading-6 text-[#2d1c17] outline-none"
                          placeholder="What material or constraints matter for this session?"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <label className="block">
                    <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                      Focus recipe
                    </span>
                    <select
                      value={recipeId}
                      onChange={(event) => {
                        const nextRecipe = getStudyRecipe(event.target.value);
                        setRecipeId(nextRecipe.id);
                        setSessionMinutes(nextRecipe.focusMinutes);
                        setEnergyMode(nextRecipe.energyMode);
                      }}
                      className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                    >
                      {dashboard.recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-sm leading-6 text-[#62463c]">
                      {currentRecipe.description}
                    </p>
                  </label>

                  <label className="block">
                    <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                      Energy mode
                    </span>
                    <select
                      value={energyMode}
                      onChange={(event) => setEnergyMode(event.target.value as StudyEnergyMode)}
                      className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                    >
                      <option value="low">Low energy</option>
                      <option value="steady">Steady</option>
                      <option value="deep">Deep focus</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                      Session length
                    </span>
                    <input
                      type="number"
                      min={5}
                      max={90}
                      value={sessionMinutes}
                      onChange={(event) =>
                        setSessionMinutes(
                          Math.max(5, Number(event.target.value) || currentRecipe.focusMinutes),
                        )
                      }
                      className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                  <button
                    type="button"
                    onClick={() => handleCreateTask(false)}
                    className="border-4 border-black bg-white px-4 py-3 font-mono text-sm uppercase tracking-[0.16em]"
                  >
                    Save to backlog
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateTask(true)}
                    className="border-4 border-black bg-[#fff8ea] px-4 py-3 font-mono text-sm uppercase tracking-[0.16em]"
                  >
                    Bring to desk
                  </button>
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="border-4 border-black bg-[#231514] px-5 py-3 font-mono text-sm uppercase tracking-[0.16em] text-[#fff1d7] shadow-[6px_6px_0_rgba(29,14,14,0.16)]"
                  >
                    Start session
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {activeDrawer === 'notebook' ? (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <label className="block">
                <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                  Scratchpad
                </span>
                <textarea
                  value={scratchpad}
                  onChange={(event) => setScratchpad(event.target.value)}
                  rows={16}
                  className="mt-2 w-full border-4 border-black bg-white px-4 py-4 text-sm leading-7 text-[#2d1c17] outline-none"
                  placeholder="Free-write, summarize, outline, or leave yourself directional breadcrumbs here."
                />
              </label>

              <div className="space-y-4">
                <div className="border-4 border-black bg-[#fff8ea] p-4">
                  <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    <Sparkles size={15} />
                    Interruption Parking Lot
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f4337]">
                    Use this for distracting thoughts, side quests, and random tabs you do not want to chase right now.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <input
                      value={parkingInput}
                      onChange={(event) => setParkingInput(event.target.value)}
                      className="w-full border-4 border-black bg-white px-4 py-3 text-sm outline-none"
                      placeholder="Remember to look up that reference later"
                    />
                    <button
                      type="button"
                      onClick={handleAddParkingItem}
                      className="border-4 border-black bg-[#231514] px-3 py-2 text-[#fff0d2]"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {parkingLot.length ? (
                    parkingLot.map((entry, index) => (
                      <div
                        key={`${entry}-${index}`}
                        className="border-4 border-black bg-white px-4 py-3 text-sm leading-6 text-[#2d1c17]"
                      >
                        {entry}
                      </div>
                    ))
                  ) : (
                    <div className="border-4 border-dashed border-black bg-[#fffdf7] px-4 py-5 text-sm text-[#76594a]">
                      No parked interruptions yet. Press <span className="font-mono">P</span>{' '}
                      during a session to drop one instantly.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveNotebook}
              className="border-4 border-black bg-[#231514] px-5 py-3 font-mono text-sm uppercase tracking-[0.16em] text-[#fff1d7] shadow-[6px_6px_0_rgba(29,14,14,0.16)]"
            >
              Save notebook
            </button>
          </div>
        ) : null}

        {activeDrawer === 'shelf' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Today focus', value: `${dashboard.stats.todayFocusMinutes}m`, icon: Target },
                {
                  label: 'Average session',
                  value: `${dashboard.stats.averageSessionMinutes}m`,
                  icon: CheckCircle2,
                },
                {
                  label: 'Interruptions logged',
                  value: String(dashboard.stats.interruptionCount),
                  icon: NotebookPen,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="border-4 border-black bg-white px-4 py-4">
                  <Icon size={16} />
                  <div className="mt-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    {label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[#251612]">{value}</div>
                </div>
              ))}
            </div>

            <div className="border-4 border-black bg-[#fff8ea] p-4">
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                <BookOpen size={16} />
                Session journal
              </div>
              <div className="mt-4 space-y-3">
                {dashboard.journalPreview.length ? (
                  dashboard.journalPreview.map((entry) => (
                    <div key={entry.id} className="border-4 border-black bg-white px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                          {entry.recipeName}
                        </div>
                        <div className="text-sm text-[#65473b]">{entry.focusMinutes}m</div>
                      </div>
                      <div className="mt-2 font-semibold text-[#241513]">
                        {entry.outcome ? entry.outcome.toUpperCase() : 'Logged'}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#5b4035]">
                        {entry.debriefNote || 'No debrief note was captured for this session.'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="border-4 border-dashed border-black bg-white px-4 py-5 text-sm text-[#76594a]">
                    The journal is still empty. Finish one focus cycle and the shelf will start collecting the room's memory.
                  </div>
                )}
              </div>
            </div>

            <div className="border-4 border-black bg-[#fff8ea] p-4">
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                <Sparkles size={16} />
                Focus recipes
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {dashboard.recipes.map((recipe) => (
                  <div key={recipe.id} className="border-4 border-black bg-white px-4 py-4">
                    <div className="font-mono text-base uppercase tracking-[0.12em]">{recipe.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[#5d4337]">{recipe.description}</p>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[#8a6147]">
                      {recipe.focusMinutes}m focus / {recipe.breakMinutes}m break
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-4 border-black bg-[#fff8ea] p-4">
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                <Target size={16} />
                Asset manifest
              </div>
              <div className="mt-4 space-y-3">
                {dashboard.assetManifest.openAssetSources.map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border-4 border-black bg-white px-4 py-4"
                  >
                    <div className="font-semibold text-[#261612]">{source.name}</div>
                    <div className="mt-1 font-mono text-xs uppercase tracking-[0.16em] text-[#8a6147]">
                      {source.license}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#5d4337]">{source.usage}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeDrawer === 'window' ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {dashboard.scenes.map((scene) => (
                <button
                  type="button"
                  key={scene.id}
                  onClick={() =>
                    setSceneDraft((previous) => ({
                      ...previous,
                      sceneId: scene.id,
                      weather: scene.weather,
                      timeOfDay: scene.timeOfDay,
                      ambiencePresetId: scene.ambiencePresetId,
                    }))
                  }
                  className={clsx(
                    'border-4 border-black px-4 py-4 text-left',
                    sceneDraft.sceneId === scene.id ? 'bg-[#ffe3b0]' : 'bg-white',
                  )}
                >
                  <div className="font-mono text-base uppercase tracking-[0.12em]">{scene.label}</div>
                  <p className="mt-2 text-sm leading-6 text-[#5d4337]">{scene.description}</p>
                </button>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                  Weather
                </span>
                <select
                  value={sceneDraft.weather}
                  onChange={(event) =>
                    setSceneDraft((previous) => ({ ...previous, weather: event.target.value }))
                  }
                  className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                >
                  <option value="rain">Rain</option>
                  <option value="storm">Storm</option>
                  <option value="breeze">Breeze</option>
                </select>
              </label>

              <label className="block">
                <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                  Time of day
                </span>
                <select
                  value={sceneDraft.timeOfDay}
                  onChange={(event) =>
                    setSceneDraft((previous) => ({ ...previous, timeOfDay: event.target.value }))
                  }
                  className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                >
                  <option value="dusk">Dusk</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </label>

              <label className="block">
                <span className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                  Lamp mode
                </span>
                <select
                  value={sceneDraft.lampMode}
                  onChange={(event) =>
                    setSceneDraft((previous) => ({ ...previous, lampMode: event.target.value }))
                  }
                  className="mt-2 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                >
                  <option value="focus">Focus</option>
                  <option value="rest">Rest</option>
                  <option value="night">Night</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-4 border-4 border-black bg-white px-4 py-4">
                <div>
                  <div className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    Quiet mode
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#5d4337]">
                    Show a low-noise, text-first study state.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={sceneDraft.quietMode}
                  onChange={(event) =>
                    setSceneDraft((previous) => ({ ...previous, quietMode: event.target.checked }))
                  }
                  className="h-5 w-5 accent-[#231514]"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleSaveScene}
              className="border-4 border-black bg-[#231514] px-5 py-3 font-mono text-sm uppercase tracking-[0.16em] text-[#fff1d7] shadow-[6px_6px_0_rgba(29,14,14,0.16)]"
            >
              Apply scene
            </button>
          </div>
        ) : null}

        {activeDrawer === 'boombox' ? (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
                <div className="border-4 border-[#171010] bg-[#110c0a] p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#ab8e76] mb-5">
                    <Volume2 size={16} />
                    Studio Ambient Mixer
                  </div>
                  <div className={styles.mixerGrid}>
                    {[
                      { key: 'rainVolume' as const, label: 'Rain' },
                      { key: 'windVolume' as const, label: 'Wind' },
                      { key: 'thunderVolume' as const, label: 'Thunder' },
                      { key: 'birdsVolume' as const, label: 'Birds' },
                      { key: 'focusToneVolume' as const, label: 'Focus Hz' },
                    ].map(({ key, label }) => (
                      <div key={key} className={styles.mixerTrack}>
                        <div className={styles.mixerHeader}>
                          <span className={styles.mixerLabel}>{label}</span>
                          <span className={styles.mixerValue}>{sceneDraft[key]}%</span>
                        </div>
                        <input
                          title={`${label} volume`}
                          type="range"
                          min={0}
                          max={100}
                          value={sceneDraft[key]}
                          onChange={(event) =>
                            setSceneDraft((previous) => ({
                              ...previous,
                              [key]: Number(event.target.value),
                            }))
                          }
                          className={styles.mixerSlider}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              <div className="space-y-4">
                <div className="border-4 border-black bg-[#fff8ea] p-4">
                  <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    <AudioLines size={15} />
                    Focus tone
                  </div>
                  <select
                    value={sceneDraft.focusTone}
                    onChange={(event) =>
                      setSceneDraft((previous) => ({ ...previous, focusTone: event.target.value }))
                    }
                    className="mt-3 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                  >
                    <option value="brown-noise">Brown noise</option>
                    <option value="pink-noise">Pink noise</option>
                    <option value="vinyl">Vinyl dust</option>
                  </select>
                </div>

                <div className="border-4 border-black bg-[#fff8ea] p-4">
                  <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                    <MoonStar size={15} />
                    Secondary lofi relay
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5d4337]">
                    Optional stream-based lo-fi lives here, secondary to the ambient mixer.
                  </p>
                  <label className="mt-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={lofiEnabled}
                      onChange={(event) => {
                        setLofiEnabled(event.target.checked);
                        setSceneDraft((previous) => ({
                          ...previous,
                          musicMode: event.target.checked ? 'lofi' : 'ambient',
                        }));
                        if (!event.target.checked) {
                          setLofiPlaying(false);
                        }
                      }}
                      className="h-5 w-5 accent-[#231514]"
                    />
                    <span className="text-sm">Enable relay</span>
                  </label>
                  <select
                    value={sceneDraft.lofiStationId || SECONDARY_LOFI_STATIONS[0].id}
                    onChange={(event) =>
                      setSceneDraft((previous) => ({
                        ...previous,
                        lofiStationId: event.target.value,
                        musicMode: 'lofi',
                      }))
                    }
                    className="mt-3 w-full border-4 border-black bg-white px-4 py-3 font-medium text-[#221614] outline-none"
                  >
                    {SECONDARY_LOFI_STATIONS.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} - {station.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLofiPlaying((previous) => !previous)}
                    className="mt-3 border-4 border-black bg-white px-4 py-2 font-mono text-sm uppercase tracking-[0.16em]"
                  >
                    {lofiPlaying ? 'Pause relay' : 'Play relay'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveScene}
              className="border-4 border-black bg-[#231514] px-5 py-3 font-mono text-sm uppercase tracking-[0.16em] text-[#fff1d7] shadow-[6px_6px_0_rgba(29,14,14,0.16)]"
            >
              Save audio bed
            </button>
          </div>
        ) : null}
      </StudyDrawer>

      {quickCaptureOpen ? (
        <div className="fixed inset-x-0 top-6 z-[60] mx-auto w-[min(96vw,680px)] border-4 border-black bg-[#fff1d4] shadow-[12px_12px_0_rgba(18,9,12,0.24)]">
          <div className="flex items-start justify-between gap-4 px-4 py-4">
            <div>
              <div className="font-mono text-sm uppercase tracking-[0.16em] text-[#6b4f42]">
                Quick capture
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5c4337]">
                Drop the distraction here so the desk can keep the current contract clean.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuickCaptureOpen(false)}
              className="border-4 border-black bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.16em]"
            >
              Close
            </button>
          </div>
          <div className="border-t-4 border-black px-4 py-4">
            <div className="flex gap-3">
              <input
                autoFocus
                value={quickCaptureText}
                onChange={(event) => setQuickCaptureText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleAddParkingItem();
                  }
                }}
                className="w-full border-4 border-black bg-white px-4 py-3 text-sm outline-none"
                placeholder="Remember to check that citation after the session"
              />
              <button
                type="button"
                onClick={handleAddParkingItem}
                className="border-4 border-black bg-[#231514] px-4 py-3 text-[#fff1d7]"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
