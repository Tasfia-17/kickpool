/**
 * KickPool — AI Pundit Commentary Engine
 *
 * Generates personality-driven football commentary for match events
 * using Google Gemini (via @google/generative-ai already in deps).
 * Falls back to rule-based templates when AI is unavailable.
 *
 * Context injected: event type, score, odds at moment of event,
 * match phase, minute, participant names.
 *
 * Commentary is streamed as Socket.io 'pundit:commentary' events.
 */

import logger from './logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PunditEventType =
  | 'goal'
  | 'own_goal'
  | 'yellow_card'
  | 'red_card'
  | 'var_review'
  | 'var_overturned'
  | 'penalty_awarded'
  | 'penalty_scored'
  | 'penalty_missed'
  | 'kick_off'
  | 'half_time'
  | 'full_time'
  | 'extra_time'
  | 'penalties_start'
  | 'odds_shift'
  | 'match_finalised';

export interface PunditContext {
  eventType: PunditEventType;
  participant1: string;
  participant2: string;
  score1: number;
  score2: number;
  minute?: number;
  period: string;           // "1st Half" | "2nd Half" | etc.
  scorer?: string;          // player name if available
  team?: string;            // team name for card/goal
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
  extraContext?: string;    // any additional TxLINE event data
}

export interface PunditCommentary {
  text: string;
  emoji: string;
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  aiGenerated: boolean;
}

// ─── Rule-based templates (fallback) ────────────────────────────────────────

const TEMPLATES: Record<PunditEventType, Array<(ctx: PunditContext) => string>> = {
  goal: [
    (c) => `⚽ GOAAAAL! ${c.team ?? 'A team'} scores! ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}. The place erupts!`,
    (c) => `MAGNIFICENT! A clinical finish! ${c.team} lead/equalise! Score: ${c.score1}–${c.score2}`,
    (c) => `${c.team} find the back of the net! The market instantly reacts — this changes everything. ${c.score1}–${c.score2}`,
  ],
  own_goal: [
    (c) => `😱 Oh no — an own goal! That's a nightmare moment. ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}`,
  ],
  yellow_card: [
    (c) => `🟨 Yellow card! ${c.team} have a player walking a tightrope now. One more and they're off.`,
  ],
  red_card: [
    (c) => `🟥 RED CARD! ${c.team} are down to ten men! This completely changes the complexion of the match. Odds are shifting hard.`,
  ],
  var_review: [
    (_c) => `🖥️ VAR is checking... the stadium holds its breath. We wait.`,
  ],
  var_overturned: [
    (_c) => `📺 VAR overturns the decision! The on-field call is reversed. Drama!`,
  ],
  penalty_awarded: [
    (c) => `⚡ PENALTY to ${c.team}! The goalkeeper will face the spot-kick. High pressure moment.`,
  ],
  penalty_scored: [
    (c) => `✅ Penalty converted! Ice-cold. ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}`,
  ],
  penalty_missed: [
    (_c) => `❌ Saved! The keeper is the hero! Penalty missed — the crowd goes wild!`,
  ],
  kick_off: [
    (c) => `🏟️ We're underway! ${c.participant1} vs ${c.participant2}. The World Cup Final has BEGUN. Let's go!`,
  ],
  half_time: [
    (c) => `📊 Half time: ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}. What a first 45 — plenty more to come!`,
  ],
  full_time: [
    (c) => `🎉 FULL TIME! ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}. What an incredible match!`,
  ],
  extra_time: [
    (_c) => `⏱️ We're going to extra time! Neither side blinks. 30 more minutes to decide the World Cup winner.`,
  ],
  penalties_start: [
    (_c) => `🎯 Penalties! The ultimate lottery. Hearts in mouths. Who wants it more?`,
  ],
  odds_shift: [
    (c) => `📈 Market update! The books are moving. Current lines: ${c.participant1} @ ${c.homeOdds?.toFixed(2) ?? '—'}, Draw @ ${c.drawOdds?.toFixed(2) ?? '—'}, ${c.participant2} @ ${c.awayOdds?.toFixed(2) ?? '—'}`,
  ],
  match_finalised: [
    (c) => `🏆 IT'S ALL OVER! ${c.participant1} ${c.score1}–${c.score2} ${c.participant2}. The World Cup champion is decided. Historic night!`,
  ],
};

function getTemplate(ctx: PunditContext): string {
  const fns = TEMPLATES[ctx.eventType];
  if (!fns || fns.length === 0) return `Match event: ${ctx.eventType}`;
  return fns[Math.floor(Math.random() * fns.length)](ctx);
}

function getEmoji(eventType: PunditEventType): string {
  const map: Record<PunditEventType, string> = {
    goal:              '⚽',
    own_goal:          '😱',
    yellow_card:       '🟨',
    red_card:          '🟥',
    var_review:        '🖥️',
    var_overturned:    '📺',
    penalty_awarded:   '⚡',
    penalty_scored:    '✅',
    penalty_missed:    '❌',
    kick_off:          '🏟️',
    half_time:         '📊',
    full_time:         '🎉',
    extra_time:        '⏱️',
    penalties_start:   '🎯',
    odds_shift:        '📈',
    match_finalised:   '🏆',
  };
  return map[eventType] ?? '📣';
}

function getIntensity(eventType: PunditEventType): PunditCommentary['intensity'] {
  if (['goal', 'red_card', 'penalty_scored', 'match_finalised', 'full_time'].includes(eventType)) return 'extreme';
  if (['own_goal', 'var_overturned', 'penalty_awarded', 'extra_time', 'penalties_start'].includes(eventType)) return 'high';
  if (['yellow_card', 'var_review', 'kick_off', 'half_time'].includes(eventType)) return 'medium';
  return 'low';
}

// ─── AI generation ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an electrifying football pundit and commentator for KickPool, 
a live watch-party sweepstakes platform. You generate SHORT (1-3 sentences max), 
personality-driven, punchy commentary for live World Cup match events. 

Style: Think Gary Neville + Jamie Carragher energy — opinionated, vivid, occasionally funny.
Rules:
- Be specific to the event and context provided
- Reference the odds when provided to show market insight  
- Do NOT use asterisks or markdown formatting
- Keep it under 50 words
- End with energy, not a full stop if dramatic

Always respond with ONLY the commentary text, no labels or metadata.`;

export async function generateAICommentary(
  ctx: PunditContext
): Promise<PunditCommentary> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // No AI key — use template
    return {
      text:        getTemplate(ctx),
      emoji:       getEmoji(ctx.eventType),
      intensity:   getIntensity(ctx.eventType),
      aiGenerated: false,
    };
  }

  try {
    // Dynamic import to keep server bundle clean
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const oddsLine = ctx.homeOdds
      ? `Current odds: ${ctx.participant1} ${ctx.homeOdds.toFixed(2)}, Draw ${ctx.drawOdds?.toFixed(2) ?? '—'}, ${ctx.participant2} ${ctx.awayOdds?.toFixed(2) ?? '—'}.`
      : '';

    const prompt = [
      `Event: ${ctx.eventType.replace(/_/g, ' ').toUpperCase()}`,
      `Match: ${ctx.participant1} ${ctx.score1}–${ctx.score2} ${ctx.participant2}`,
      ctx.minute ? `Minute: ${ctx.minute}'` : '',
      `Period: ${ctx.period}`,
      ctx.scorer ? `Player: ${ctx.scorer}` : '',
      ctx.team ? `Team: ${ctx.team}` : '',
      oddsLine,
      ctx.extraContext ?? '',
    ].filter(Boolean).join('\n');

    const result = await model.generateContent({
      systemInstruction: SYSTEM_PROMPT,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = result.response.text().trim();
    if (!text) throw new Error('Empty AI response');

    logger.info(`[Pundit] AI generated commentary for ${ctx.eventType}`);

    return {
      text,
      emoji:       getEmoji(ctx.eventType),
      intensity:   getIntensity(ctx.eventType),
      aiGenerated: true,
    };
  } catch (err) {
    logger.warn('[Pundit] AI generation failed, using template:', (err as Error).message);
    return {
      text:        getTemplate(ctx),
      emoji:       getEmoji(ctx.eventType),
      intensity:   getIntensity(ctx.eventType),
      aiGenerated: false,
    };
  }
}

// ─── TxLINE event → PunditContext mapper ────────────────────────────────────

import type { TxLineScoreEvent, TxLineOddsEvent } from './txline';
import { extractGoals, extractResult1x2, gameStateLabel, STAT_KEYS } from './txline';

export function mapTxLineEventToPunditContext(
  scoreEvent: TxLineScoreEvent,
  latestOdds: TxLineOddsEvent | null,
  participant1: string,
  participant2: string,
  prevScore?: { p1: number; p2: number },
  prevStats?: Record<number, number>
): PunditContext | null {
  const goals  = extractGoals(scoreEvent.Stats);
  const odds   = extractResult1x2(latestOdds);
  const period = gameStateLabel(scoreEvent.statusId);

  const base: Omit<PunditContext, 'eventType'> = {
    participant1,
    participant2,
    score1:   goals.p1,
    score2:   goals.p2,
    period,
    homeOdds: odds.home,
    drawOdds: odds.draw,
    awayOdds: odds.away,
  };

  // Goal detected (score changed)
  if (prevScore && (goals.p1 > prevScore.p1 || goals.p2 > prevScore.p2)) {
    // Check own_goal first
    if (scoreEvent.action === 'own_goal') {
      const team = goals.p1 > prevScore.p1 ? participant1 : participant2;
      return { ...base, eventType: 'own_goal', team };
    }
    const scoringTeam = goals.p1 > prevScore.p1 ? participant1 : participant2;
    return { ...base, eventType: 'goal', team: scoringTeam };
  }

  // Own goal without score change (edge case)
  if (scoreEvent.action === 'own_goal') {
    return { ...base, eventType: 'own_goal' };
  }

  // Red card — use stat delta to identify team
  if (scoreEvent.action === 'red_card') {
    const p1Prev = prevStats?.[STAT_KEYS.P1_RED_CARDS] ?? 0;
    const p2Prev = prevStats?.[STAT_KEYS.P2_RED_CARDS] ?? 0;
    const p1Now  = scoreEvent.Stats[STAT_KEYS.P1_RED_CARDS] ?? 0;
    const p2Now  = scoreEvent.Stats[STAT_KEYS.P2_RED_CARDS] ?? 0;
    const team   = p1Now > p1Prev ? participant1 : p2Now > p2Prev ? participant2 : undefined;
    return { ...base, eventType: 'red_card', team };
  }

  // Yellow card — FIXED: use card stat keys, not goal counts
  if (scoreEvent.action === 'yellow_card') {
    const p1Prev = prevStats?.[STAT_KEYS.P1_YELLOW_CARDS] ?? 0;
    const p2Prev = prevStats?.[STAT_KEYS.P2_YELLOW_CARDS] ?? 0;
    const p1Now  = scoreEvent.Stats[STAT_KEYS.P1_YELLOW_CARDS] ?? 0;
    const p2Now  = scoreEvent.Stats[STAT_KEYS.P2_YELLOW_CARDS] ?? 0;
    const team   = p1Now > p1Prev ? participant1 : p2Now > p2Prev ? participant2 : undefined;
    return { ...base, eventType: 'yellow_card', team };
  }

  // VAR
  if (scoreEvent.action === 'var') {
    return { ...base, eventType: 'var_review', extraContext: JSON.stringify(scoreEvent.Data) };
  }
  if (scoreEvent.action === 'var_end') {
    const outcome = (scoreEvent.Data?.Outcome as string) ?? '';
    if (outcome === 'Overturned') return { ...base, eventType: 'var_overturned' };
    return null;
  }

  // Penalties
  if (scoreEvent.period === 12) {
    if (scoreEvent.action === 'Scored') return { ...base, eventType: 'penalty_scored' };
    if (scoreEvent.action === 'Missed') return { ...base, eventType: 'penalty_missed' };
  }

  // Phase transitions
  if (scoreEvent.action === 'kick_off' && scoreEvent.statusId === 2) {
    return { ...base, eventType: 'kick_off' };
  }
  if (scoreEvent.action === 'halftime_finalised') {
    return { ...base, eventType: 'half_time' };
  }
  if (scoreEvent.statusId === 6 || scoreEvent.statusId === 7) {
    return { ...base, eventType: 'extra_time' };
  }
  if (scoreEvent.statusId === 11 || scoreEvent.statusId === 12) {
    return { ...base, eventType: 'penalties_start' };
  }
  if (scoreEvent.action === 'game_finalised' && scoreEvent.statusId === 100) {
    return { ...base, eventType: 'match_finalised' };
  }

  return null;
}
