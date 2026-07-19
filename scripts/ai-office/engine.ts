// ═══════════════════════════════════════════════════════════════
//  CinePurr AI Office — Conversation Engine
//  Orchestrates multi-round debates between AI agents using
//  Google Gemini with function calling for web search.
// ═══════════════════════════════════════════════════════════════

import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type FunctionDeclaration,
  type Part,
} from '@google/generative-ai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Agent, AgentTurn, ConversationState, ToolExecution, FinalReport, OfficeEvent } from './types';
import { AGENTS } from './agents';
import { searchWeb, fetchUrlContent } from './search';
import { buildProjectContext, readProjectFile } from './context';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

// ── ANSI helpers ─────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function log(msg: string) {
  console.log(msg);
}
function divider(char = '─', len = 60) {
  log(C.dim + char.repeat(len) + C.reset);
}

function agentHeader(agent: Agent, round: number) {
  log('');
  log(
    `${agent.color}${C.bold}${agent.emoji}  ${agent.name}${C.reset} ${C.dim}(${agent.role}) — Round ${round}${C.reset}`
  );
  divider();
}

function toolLog(tool: string, detail: string) {
  log(`  ${C.gray}🔎 [${tool}] ${detail}${C.reset}`);
}

// ── Gemini Function Declarations ─────────────────────────────

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'search_web',
    description:
      'Search the internet for technical documentation, best practices, known issues, CVEs, library documentation, Stack Overflow solutions, or any other professional engineering information. Use this to back up your claims with real data.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description:
            'A specific, professional search query. Examples: "Socket.IO room cleanup best practices", "Prisma transaction deadlock prevention", "Node.js EventEmitter memory leak"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description:
      'Fetch and read the text content of a specific web URL. Use this to read documentation pages, GitHub issues, Stack Overflow answers, or any web resource you found via search.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: {
          type: SchemaType.STRING,
          description: 'The full URL to fetch content from',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'read_project_file',
    description:
      'Read a file from the CinePurr project codebase. Use this to verify your understanding of the actual code before suggesting changes. You MUST use this tool before making code suggestions.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filepath: {
          type: SchemaType.STRING,
          description:
            'Relative path from the project root. Examples: "server/handlers/roomHandler.ts", "src/components/ChatWindow.tsx", "prisma/schema.prisma"',
        },
      },
      required: ['filepath'],
    },
  },
];

// ── Tool Executor ────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<Record<string, any>> {
  switch (name) {
    case 'search_web': {
      const query = args.query as string;
      toolLog('WEB SEARCH', query);
      const { results, source } = await searchWeb(query);
      toolLog('RESULTS', `${results.length} results from ${source}`);
      return {
        results: results.map((r) => ({
          title: r.title,
          snippet: r.snippet.slice(0, 300),
          url: r.url,
        })),
      };
    }

    case 'fetch_url': {
      const url = args.url as string;
      toolLog('FETCH URL', url);
      const { text, success } = await fetchUrlContent(url);
      toolLog('FETCHED', success ? `${text.length} chars` : 'FAILED');
      return { content: text, success };
    }

    case 'read_project_file': {
      const filepath = args.filepath as string;
      toolLog('READ FILE', filepath);
      const content = readProjectFile(filepath);
      toolLog('READ', `${content.length} chars`);
      return { content };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Build Agent Prompt ───────────────────────────────────────

function buildTurnPrompt(
  agent: Agent,
  task: string,
  projectContext: string,
  turns: AgentTurn[],
  round: number,
  totalRounds: number
): string {
  let prompt = `
═══════════════════════════════════════════════════
TASK FROM THE BOSS:
${task}
═══════════════════════════════════════════════════

PROJECT CODEBASE CONTEXT:
${projectContext}

═══════════════════════════════════════════════════
CURRENT ROUND: ${round} of ${totalRounds}
`;

  // Add conversation history
  if (turns.length > 0) {
    prompt += '\n══ CONVERSATION SO FAR ══════════════════════════\n';
    for (const turn of turns) {
      prompt += `\n[${turn.agent} (${turn.role}) — Round ${turn.round}]:\n${turn.content}\n`;
      if (turn.toolCalls.length > 0) {
        prompt += `  (${turn.agent} searched: ${turn.toolCalls
          .map((t) =>
            t.tool === 'search_web'
              ? t.args.query
              : t.tool === 'read_project_file'
              ? `read ${t.args.filepath}`
              : t.args.url
          )
          .join(', ')})\n`;
      }
    }
    prompt += '\n═════════════════════════════════════════════════\n';
  }

  // Round-specific instructions
  if (round === 1) {
    prompt += `\nThis is ROUND 1 — the initial analysis round.
Research the problem thoroughly. Use your tools to search the web and read source files.
`;
  } else if (round === totalRounds) {
    prompt += `\nThis is the FINAL ROUND (${round} of ${totalRounds}).
Provide your FINAL assessment. If you're ${agent.name} (Aziz), produce the complete action plan.
Be definitive — no more "we should consider." Make concrete decisions.
`;
  } else {
    prompt += `\nThis is ROUND ${round} — refine and respond to feedback from the team.
Address any concerns raised by other agents. Update your proposals based on the discussion.
`;
  }

  prompt += `\nNow respond as ${agent.name} (${agent.role}). Use your tools if you need information.`;

  return prompt;
}

// ── Get Single Agent Response ────────────────────────────────

async function getAgentResponse(
  genAI: GoogleGenerativeAI,
  agent: Agent,
  task: string,
  projectContext: string,
  turns: AgentTurn[],
  round: number,
  totalRounds: number,
  modelName: string,
  onEvent?: (event: OfficeEvent) => void
): Promise<AgentTurn> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: agent.systemPrompt,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
  });

  const prompt = buildTurnPrompt(
    agent,
    task,
    projectContext,
    turns,
    round,
    totalRounds
  );
  const toolCalls: ToolExecution[] = [];

  onEvent?.({
    type: 'AGENT_THINKING',
    payload: { agent: agent.name, round }
  });

  // Start a chat session for this agent's turn
  const chat = model.startChat();

  // Send the initial prompt
  let result = await chat.sendMessage(prompt);

  // Handle function calling loop (max 5 tool calls per turn)
  for (let i = 0; i < 5; i++) {
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    // Check for function calls
    const funcCallParts = parts.filter(
      (p: any) => p.functionCall !== undefined
    );

    if (funcCallParts.length === 0) break;

    // Notify UI what tools are being used
    for (const part of funcCallParts) {
      const call = (part as any).functionCall;
      onEvent?.({
        type: 'AGENT_TOOL_CALL',
        payload: { agent: agent.name, tool: call.name, args: call.args }
      });
    }

    // Execute all function calls and build response parts
    const functionResponseParts: Part[] = [];
    for (const part of funcCallParts) {
      const call = (part as any).functionCall;
      const callResult = await executeTool(call.name, call.args);
      toolCalls.push({ tool: call.name, args: call.args, result: callResult });
      functionResponseParts.push({
        functionResponse: { name: call.name, response: callResult },
      } as Part);
    }

    // Send function responses back
    onEvent?.({
      type: 'AGENT_THINKING',
      payload: { agent: agent.name, round }
    });
    result = await chat.sendMessage(functionResponseParts);
  }

  const text =
    result.response.text() || '[Agent did not produce a response]';

  const turn: AgentTurn = {
    agent: agent.name,
    role: agent.role,
    content: text,
    round,
    timestamp: new Date().toISOString(),
    toolCalls,
  };

  onEvent?.({
    type: 'AGENT_SPEAKING',
    payload: turn
  });

  return turn;
}

// ── Rate limit delay ─────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main Conversation Loop ───────────────────────────────────

export async function runOffice(
  task: string,
  rounds = 3,
  modelName = 'gemini-3.1-pro',
  verbose = false,
  onEvent?: (event: OfficeEvent) => void
): Promise<FinalReport> {
  const broadcastEvent = async (event: OfficeEvent) => {
    onEvent?.(event);
    try {
      await fetch('http://localhost:4000/api/admin/ai-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.ADMIN_API_KEY || 'CINEPURR_ADMIN_SECRET_KEY_2026', event }),
      });
    } catch {
      // Ignore broadcast errors from CLI
    }
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = 'GEMINI_API_KEY not found in .env';
    broadcastEvent({ type: 'OFFICE_ERROR', payload: { error: err } });
    console.error(`${C.red}${C.bold}ERROR: ${err}${C.reset}`);
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Banner
  log('');
  log(`${C.yellow}${C.bold}  ╔══════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.yellow}${C.bold}  ║           🏢 CinePurr AI Office — Session           ║${C.reset}`);
  log(`${C.yellow}${C.bold}  ╚══════════════════════════════════════════════════════╝${C.reset}`);
  log('');
  log(`  ${C.bold}📋 Task:${C.reset} ${task}`);
  log(`  ${C.bold}🔄 Rounds:${C.reset} ${rounds}`);
  log(`  ${C.bold}🤖 Model:${C.reset} ${modelName}`);
  log(`  ${C.bold}👥 Team:${C.reset} ${AGENTS.map((a) => `${a.emoji} ${a.name}`).join(', ')}`);
  log('');
  divider('═', 60);

  broadcastEvent({
    type: 'OFFICE_START',
    payload: { task, rounds, team: AGENTS.map(a => a.name) }
  });

  // Build project context once
  log(`${C.dim}📂 Reading CinePurr codebase for context...${C.reset}`);
  const projectContext = buildProjectContext();
  log(`${C.dim}✅ Loaded ${projectContext.length} chars of project context${C.reset}`);
  log('');

  const state: ConversationState = {
    task,
    rounds,
    currentRound: 0,
    turns: [],
  };

  const sortedAgents = [...AGENTS].sort((a, b) => a.order - b.order);

  // ── Run the conversation rounds ────────────────────────────
  for (let round = 1; round <= rounds; round++) {
    state.currentRound = round;

    broadcastEvent({
      type: 'ROUND_START',
      payload: { round, totalRounds: rounds }
    });

    log('');
    log(`${C.bold}${C.white}  ╔═══════════════════════════════════╗${C.reset}`);
    log(`${C.bold}${C.white}  ║        ROUND ${String(round).padStart(1)} of ${rounds}                ║${C.reset}`);
    log(`${C.bold}${C.white}  ╚═══════════════════════════════════╝${C.reset}`);

    for (const agent of sortedAgents) {
      agentHeader(agent, round);

      try {
        const turn = await getAgentResponse(
          genAI,
          agent,
          task,
          projectContext,
          state.turns,
          round,
          rounds,
          modelName,
          broadcastEvent
        );

        state.turns.push(turn);

        // Print the agent's response
        const lines = turn.content.split('\n');
        for (const line of lines) {
          log(`  ${agent.color}${line}${C.reset}`);
        }

        // Show tool usage summary
        if (turn.toolCalls.length > 0) {
          log('');
          log(`  ${C.gray}📎 Used ${turn.toolCalls.length} tool(s): ${turn.toolCalls.map((t) => t.tool).join(', ')}${C.reset}`);
        }
      } catch (err: any) {
        const errorMsg = err.message || String(err);
        log(`  ${C.red}⚠ Agent error: ${errorMsg}${C.reset}`);

        // Check for rate limiting
        if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
          log(`  ${C.yellow}⏳ Rate limited — waiting 60 seconds...${C.reset}`);
          broadcastEvent({ type: 'OFFICE_ERROR', payload: { error: 'Rate limited. Waiting 60 seconds...' } });
          
          await sleep(60_000);
          // Retry once
          try {
            const turn = await getAgentResponse(
              genAI, agent, task, projectContext, state.turns, round, rounds, modelName, broadcastEvent
            );
            state.turns.push(turn);
            const lines = turn.content.split('\n');
            for (const line of lines) {
              log(`  ${agent.color}${line}${C.reset}`);
            }
          } catch (retryErr: any) {
            log(`  ${C.red}⚠ Retry failed: ${retryErr.message}${C.reset}`);
            const errTurn = {
              agent: agent.name, role: agent.role, content: `[Could not respond: ${retryErr.message}]`,
              round, timestamp: new Date().toISOString(), toolCalls: [],
            };
            state.turns.push(errTurn);
            broadcastEvent({ type: 'AGENT_SPEAKING', payload: errTurn });
          }
        } else {
          const errTurn = {
            agent: agent.name, role: agent.role, content: `[Could not respond: ${errorMsg}]`,
            round, timestamp: new Date().toISOString(), toolCalls: [],
          };
          state.turns.push(errTurn);
          onEvent?.({ type: 'AGENT_SPEAKING', payload: errTurn });
        }
      }

      // Delay between agents to respect rate limits (4 seconds)
      const isLastAgentLastRound = agent === sortedAgents[sortedAgents.length - 1] && round === rounds;
      if (!isLastAgentLastRound) {
        log(`  ${C.gray}⏳ ...${C.reset}`);
        await sleep(4_000);
      }
    }
  }

  // ── Generate Final Report ──────────────────────────────────
  log('');
  divider('═', 60);
  log(`${C.bold}${C.green}  📄 Generating final report...${C.reset}`);

  broadcastEvent({ type: 'SUMMARY_GENERATING' });

  const totalSearches = state.turns.reduce((acc, t) => acc + t.toolCalls.filter((tc) => tc.tool === 'search_web').length, 0);

  const report: FinalReport = {
    task,
    timestamp: new Date().toISOString(),
    rounds,
    totalTurns: state.turns.length,
    searchesPerformed: totalSearches,
    conversation: state.turns,
    summary: '',
  };

  // Ask Aziz for a final summary
  try {
    const summaryModel = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: 'You are a technical report writer. Be concise, structured, and actionable. Write in markdown format.',
    });

    const summaryPrompt = `
Based on this entire office discussion, write a FINAL EXECUTIVE SUMMARY.
Include:
1. **Problem Statement** (1-2 sentences)
2. **Agreed Solution** (detailed)
3. **Files to Modify** (with specific changes)
4. **Testing Requirements**
5. **Deployment Notes**
6. **Risk Assessment**

Task: ${task}

Full conversation:
${state.turns.map((t) => `[${t.agent} (${t.role})]: ${t.content}`).join('\n\n')}
`;

    const summaryResult = await summaryModel.generateContent(summaryPrompt);
    report.summary = summaryResult.response.text() || 'No summary generated.';
  } catch {
    report.summary = 'Could not generate summary (API error).';
  }

  // Save report to file
  const reportsDir = path.resolve(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const taskSlug = task.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const reportPath = path.join(reportsDir, `${dateStr}_${taskSlug}.md`);

  const reportContent = `# 🏢 CinePurr Office Report
## Task: ${task}

**Date**: ${new Date().toLocaleString()}
**Rounds**: ${rounds}
**Total Agent Turns**: ${state.turns.length}
**Web Searches Performed**: ${totalSearches}
**Model**: ${modelName}

---

## Executive Summary

${report.summary}

---

## Full Conversation

${state.turns.map(t => `### Round ${t.round} — ${t.agent} (${t.role})

${t.content}

${t.toolCalls.length > 0 ? `> 🔎 **Tools used**: ${t.toolCalls.map((tc) => `\`${tc.tool}(${JSON.stringify(tc.args)})\``).join(', ')}` : ''}

---`
  ).join('\n\n')}
`;

  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  broadcastEvent({
    type: 'OFFICE_COMPLETE',
    payload: report
  });

  log('');
  log(`${C.green}${C.bold}  ✅ Report saved to: ${reportPath}${C.reset}`);
  log('');
  divider('═', 60);
  log(`${C.yellow}${C.bold}  🏢 CinePurr AI Office — Session Complete${C.reset}`);
  divider('═', 60);
  log('');

  // Print summary
  log(`${C.bold}  EXECUTIVE SUMMARY:${C.reset}`);
  log('');
  const summaryLines = report.summary.split('\n');
  for (const line of summaryLines) { log(`  ${line}`); }
  log('');

  return report;
}
