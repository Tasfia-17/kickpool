// ═══════════════════════════════════════════════════════════════
//  CinePurr AI Office — Type Definitions
// ═══════════════════════════════════════════════════════════════

export interface Agent {
  /** Display name */
  name: string;
  /** Role title */
  role: string;
  /** Emoji icon */
  emoji: string;
  /** ANSI colour code for terminal output */
  color: string;
  /** Speaking order within each round (lower = earlier) */
  order: number;
  /** Deep system prompt that defines persona, expertise & behaviour */
  systemPrompt: string;
}

export interface SearchHit {
  title: string;
  snippet: string;
  url: string;
}

export interface ToolExecution {
  tool: string;
  args: Record<string, any>;
  result: any;
}

export interface AgentTurn {
  /** Which agent spoke */
  agent: string;
  /** Their role */
  role: string;
  /** The textual response */
  content: string;
  /** Which round this belongs to */
  round: number;
  /** ISO timestamp */
  timestamp: string;
  /** Any tool calls (searches, file reads) the agent performed */
  toolCalls: ToolExecution[];
}

export interface ConversationState {
  task: string;
  rounds: number;
  currentRound: number;
  turns: AgentTurn[];
}

export interface OfficeConfig {
  task: string;
  rounds: number;
  model: string;
  verbose: boolean;
}

export interface FinalReport {
  task: string;
  timestamp: string;
  rounds: number;
  totalTurns: number;
  searchesPerformed: number;
  conversation: AgentTurn[];
  summary: string;
}

// ── SSE Event Types for the Frontend ─────────────────────────

export type OfficeEventType =
  | 'OFFICE_START'
  | 'ROUND_START'
  | 'AGENT_THINKING'
  | 'AGENT_TOOL_CALL'
  | 'AGENT_SPEAKING'
  | 'SUMMARY_GENERATING'
  | 'OFFICE_COMPLETE'
  | 'OFFICE_ERROR';

export interface OfficeEvent {
  type: OfficeEventType;
  payload?: any;
}
