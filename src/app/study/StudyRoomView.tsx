'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  Clock3,
  CloudRain,
  FileText,
  Sparkles,
  SunMoon,
  Target,
  Trophy,
} from 'lucide-react';

import type {
  StudyContractRecord,
  StudyScenePreset,
  StudySessionRecord,
  StudySpaceRecord,
  StudyTaskRecord,
} from '@/lib/study';
import styles from './study-room.module.css';

type DrawerId = 'contract' | 'notebook' | 'shelf' | 'window' | 'boombox' | null;

interface StudyRoomViewProps {
  userName: string;
  scenePreset: StudyScenePreset;
  scene: StudySpaceRecord;
  activeTask: StudyTaskRecord | null;
  currentContract: StudyContractRecord | null;
  activeSession: StudySessionRecord | null;
  stats: {
    totalFocusMinutes: number;
    todayFocusMinutes: number;
    completedSessions: number;
    completedToday: number;
    averageSessionMinutes: number;
    interruptionCount: number;
    studyStreakHours: number;
  };
  remainingLabel: string;
  sessionProgress: number;
  onOpenDrawer: (drawer: Exclude<DrawerId, null>) => void;
  recoveryPrompt: {
    visible: boolean;
    hiddenMinutes: number;
  };
  onDismissRecovery: () => void;
  onRecoveryAction: (mode: 'resume' | 'shrink' | 'switch') => void;
  companionSprite: string;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function StudyRoomView({
  userName,
  scenePreset,
  scene,
  activeTask,
  currentContract,
  activeSession,
  stats,
  remainingLabel,
  sessionProgress,
  onOpenDrawer,
  recoveryPrompt,
  onDismissRecovery,
  onRecoveryAction,
  companionSprite,
}: StudyRoomViewProps) {
  const [theaterMode, setTheaterMode] = useState(false);
  const [localTimeOfDay, setLocalTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');

  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setLocalTimeOfDay('morning');
      else if (hour >= 12 && hour < 17) setLocalTimeOfDay('afternoon');
      else if (hour >= 17 && hour < 20) setLocalTimeOfDay('evening');
      else setLocalTimeOfDay('night');
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000 * 5); // Validate every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const timeGlowClass = 
    localTimeOfDay === 'morning' ? styles.morningGlow : 
    localTimeOfDay === 'evening' ? styles.eveningGlow : 
    localTimeOfDay === 'night' ? styles.nightGlow : styles.afternoonGlow;

  const isStorm = scene.weather === 'storm';
  const isAfternoon = scene.timeOfDay === 'afternoon';
  const ambientSummary =
    scene.weather === 'rain'
      ? 'Rain on the glass, lamp warm, head down.'
      : scene.weather === 'storm'
        ? 'Storm pressure outside, disciplined focus inside.'
        : 'Open-window air with a calmer, brighter room.';

  return (
    <div
      className={styles.studyRoot}
      style={
        {
          '--study-glow': `${scenePreset.glow}55`,
        } as CSSProperties
      }
    >
      <div
        className={clsx(styles.theaterOverlay, theaterMode && styles.theaterOverlayActive)}
        onClick={() => setTheaterMode(false)}
      />
      <div className={styles.pageFrame}>
        <aside className={styles.sidebar}>
          <div className={styles.headerInfo}>
            <Link href="/" className={styles.backButton}>
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className={styles.headerEyebrow}>Private Focus Habitat</p>
              <h1 className={styles.headerTitle}>Study Room</h1>
              <p className={styles.headerMeta}>
                {userName}, your desk is ready. Keep one task on the table, let the room carry
                the ambience, and leave the rest of the noise in the parking lot.
              </p>
            </div>
          </div>

          <div className={styles.headerStats}>
            <div className={styles.statChip}>
              <span className={styles.chipLabel}>Today</span>
              <span className={styles.chipValue}>{formatMinutes(stats.todayFocusMinutes)}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.chipLabel}>Sessions</span>
              <span className={styles.chipValue}>{stats.completedSessions}</span>
            </div>
            <div className={styles.statChip}>
              <span className={styles.chipLabel}>Legacy Hours</span>
              <span className={styles.chipValue}>{stats.studyStreakHours}h</span>
            </div>
          </div>

          <div className={styles.sidebarCards}>
            <div className={clsx(styles.sidebarCard, theaterMode && styles.elevatedFocus)}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-[#cda77e]">
                    Current Contract
                  </p>
                  <h2 className="mt-2 font-mono text-[1.5rem] uppercase tracking-[0.06em] text-[#fff0d2]">
                    {activeTask?.title || currentContract?.title || 'No task on the desk'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#edd8bb]">
                    {currentContract?.expectedOutcome ||
                      'Choose one task, define the finish line, and let the room hold the rest.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenDrawer('contract')}
                className="mt-4 w-full border-4 border-black bg-[#fff2d8] px-4 py-2 font-mono text-sm uppercase tracking-[0.16em] text-[#281917] shadow-[6px_6px_0_rgba(14,8,10,0.3)] transition-transform active:translate-y-1 active:shadow-[2px_2px_0_rgba(14,8,10,0.3)]"
              >
                {activeSession ? 'Debrief' : 'Prep desk'}
              </button>
            </div>

            <div className={styles.sidebarCard}>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-[#d7c59d]">
                Ambient World
              </p>
              <div className="mt-3 flex items-start gap-3">
                <CloudRain size={18} className="mt-1 text-[#98b7ff]" />
                <div>
                  <p className="font-semibold text-[#fff1d2]">{scenePreset.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[#e5d7bb]">{scenePreset.description}</p>
                </div>
              </div>
            </div>

            <div className={styles.sidebarCard}>
              <div className="flex items-center justify-between">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-[#d7c59d]">
                  Pillars of Productivity
                </p>
                <span className="font-mono text-xs text-[#a38e6e] tracking-widest">{stats.completedToday}/6</span>
              </div>
              <div className={styles.pillarsGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={clsx(styles.pillarBlock, i < stats.completedToday && styles.pillarActive)}
                    title={i < stats.completedToday ? 'Completed Session' : 'Awaiting Focus'}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#8c7457]">
                Build your foundation. Each session completed today solidifies a pillar.
              </p>
            </div>
          </div>
        </aside>

        <main className={styles.mainRoom}>
          <section className={styles.roomBoard}>
          <div className={clsx(styles.lightingOverlay, timeGlowClass)} />
          <div className={styles.roomGlow} />
          <div className={styles.floor} />

          <div className={styles.dustContainer}>
            {[...Array.from({ length: 18 })].map((_, i) => (
              <div 
                key={i} 
                className={styles.dustMote} 
                style={{
                  left: `${10 + ((i * 17) % 80)}%`,
                  top: `${10 + ((i * 23) % 80)}%`,
                  animationDelay: `${(i * 0.7) % 12}s`,
                  animationDuration: `${12 + ((i * 3.1) % 8)}s`
                }} 
              />
            ))}
          </div>

          <div
            className={clsx(
              styles.object,
              styles.window,
              scene.weather === 'rain' && styles.windowRain,
              isStorm && styles.windowStorm,
              isAfternoon && styles.windowAfternoon,
            )}
          >
            <span className={styles.objectLabel}>Window</span>
            <div className={styles.windowInnerGlow} />
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('window')}
            />
          </div>

          <div className={clsx(styles.object, styles.shelf)}>
            <span className={styles.objectLabel}>Shelf</span>
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('shelf')}
            />
          </div>

          <div className={clsx(styles.object, styles.rug)}>
            <span className={styles.objectLabel}>Contract Rug</span>
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('contract')}
            />
          </div>

          <div className={clsx(styles.object, styles.lamp, scene.lampMode === 'focus' && styles.pulseRing, theaterMode && styles.elevatedFocus)}>
            <span className={styles.objectLabel}>Lamp</span>
            <div 
              className={styles.lampSwitch} 
              onClick={() => setTheaterMode(!theaterMode)}
              title="Toggle Deep Focus"
            />
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('window')}
            />
          </div>

          <div className={clsx(styles.object, styles.boombox)}>
            <span className={styles.objectLabel}>Boombox</span>
            <div className={styles.ambientNote}>{ambientSummary}</div>
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('boombox')}
            />
          </div>

          <div className={clsx(styles.object, styles.plant)} title="A small sprout. Keeps you company." />

          <div className={clsx(styles.object, styles.desk, theaterMode && styles.elevatedDesk, theaterMode && styles.elevatedFocus)}>
            <span className={styles.objectLabel}>Focus Desk</span>
            <div className={styles.deskTopPanel}>
              <div className={styles.deskScreen}>
                <div className="flex h-full flex-col justify-between p-4 text-[#f7ead2]">
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-[#d4b188]">
                      {activeSession ? 'Session live' : 'Desk ready'}
                    </p>
                    <p className="mt-2 font-mono text-4xl uppercase leading-none tracking-[0.06em]">
                      {remainingLabel}
                    </p>
                  </div>
                  <div>
                    <div className="h-3 w-full overflow-hidden border-2 border-[#f3ddbc33] bg-[#171216]">
                      <div
                        className="h-full bg-[#d99655]"
                        style={{ width: `${sessionProgress}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#f0dfc5]">
                      {currentContract?.expectedOutcome ||
                        'Set a clear contract and bring one task to the desk.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.deskCompanion}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={companionSprite}
                  alt="Study companion"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <button
              type="button"
              className={styles.hotspotButton}
              onClick={() => onOpenDrawer('contract')}
            />
          </div>
        </section>

        <div className={styles.mobileTray}>
          {[
            { id: 'contract' as const, label: 'Desk', icon: Target },
            { id: 'notebook' as const, label: 'Notes', icon: FileText },
            { id: 'shelf' as const, label: 'Shelf', icon: BookOpen },
            { id: 'window' as const, label: 'Scene', icon: SunMoon },
            { id: 'boombox' as const, label: 'Audio', icon: AudioLines },
            { id: 'shelf' as const, label: 'Journal', icon: Trophy },
          ].map(({ id, label, icon: Icon }, index) => (
            <button
              type="button"
              key={`${id}-${index}`}
              onClick={() => onOpenDrawer(id)}
              className={clsx(styles.pixelCard, 'px-3 py-3 text-left')}
            >
              <Icon size={16} />
              <div className="mt-2 font-mono text-sm uppercase tracking-[0.12em]">{label}</div>
            </button>
          ))}
        </div>
        </main>
      </div>

      {recoveryPrompt.visible ? (
        <div className={styles.recoveryPrompt}>
          <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.26em] text-[#916445]">
                Recovery Flow
              </p>
              <h3 className="mt-2 font-mono text-2xl uppercase tracking-[0.08em]">
                The room noticed a drift
              </h3>
              <p className="mt-2 max-w-[38rem] text-sm leading-6 text-[#5d4030]">
                You were away for about {recoveryPrompt.hiddenMinutes} minute
                {recoveryPrompt.hiddenMinutes === 1 ? '' : 's'}. Pick the gentlest next move and
                keep momentum alive.
              </p>
            </div>
            <button
              type="button"
              onClick={onDismissRecovery}
              className="border-4 border-black bg-white px-3 py-2 font-mono text-xs uppercase tracking-[0.16em]"
            >
              Hide
            </button>
          </div>
          <div className="grid gap-3 border-t-4 border-black px-4 py-4 md:grid-cols-3">
            <button
              type="button"
              onClick={() => onRecoveryAction('resume')}
              className="border-4 border-black bg-[#fff5df] px-4 py-3 text-left shadow-[6px_6px_0_rgba(26,12,12,0.18)]"
            >
              <Clock3 size={16} />
              <div className="mt-2 font-mono text-base uppercase tracking-[0.1em]">Resume</div>
              <p className="mt-1 text-sm leading-6">Return to the same contract and keep the room quiet.</p>
            </button>
            <button
              type="button"
              onClick={() => onRecoveryAction('shrink')}
              className="border-4 border-black bg-[#fff5df] px-4 py-3 text-left shadow-[6px_6px_0_rgba(26,12,12,0.18)]"
            >
              <Sparkles size={16} />
              <div className="mt-2 font-mono text-base uppercase tracking-[0.1em]">Shrink goal</div>
              <p className="mt-1 text-sm leading-6">Drop into Ignition Mode for one short reclaim cycle.</p>
            </button>
            <button
              type="button"
              onClick={() => onRecoveryAction('switch')}
              className="border-4 border-black bg-[#fff5df] px-4 py-3 text-left shadow-[6px_6px_0_rgba(26,12,12,0.18)]"
            >
              <AudioLines size={16} />
              <div className="mt-2 font-mono text-base uppercase tracking-[0.1em]">Lighter recipe</div>
              <p className="mt-1 text-sm leading-6">Swap to Admin Sweep and finish something smaller.</p>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
