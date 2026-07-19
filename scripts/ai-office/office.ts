#!/usr/bin/env ts-node
// ═══════════════════════════════════════════════════════════════
//  CinePurr AI Office — CLI Entry Point
//
//  Usage:
//    npm run office "Fix the video sync race condition"
//    npm run office "Add dark mode to the profile page" -- --rounds 4
//    npm run office "Review security of the auth flow" -- --model gemini-2.5-pro
//
// ═══════════════════════════════════════════════════════════════

import { runOffice } from './engine';

// ── Parse CLI Arguments ──────────────────────────────────────

function parseArgs(): { task: string; rounds: number; model: string; verbose: boolean } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
  🏢 CinePurr AI Office — Multi-Agent Engineering Team

  Usage:
    npm run office "<task description>"

  Options:
    --rounds <n>       Number of discussion rounds (default: 3)
    --model <name>     Gemini model to use (default: gemini-3.1-pro)
    --verbose          Show detailed debug output

  Examples:
    npm run office "Fix the video sync race condition"
    npm run office "Add rate limiting to the chat API" -- --rounds 2
    npm run office "Review the room deletion flow for bugs" -- --model gemini-3.1-pro --rounds 4

  Team:
    📋 Arda    — Product Manager (breaks down the task)
    🔧 Açe    — Senior Engineer (writes the code)
    🔍 Demir   — QA & Security (reviews and critiques)
    🏗️  Rubar   — DevOps & Infrastructure (evaluates ops impact)
    👑 Aziz   — Project Owner & Tech Lead (makes final decisions)
`);
    process.exit(0);
  }

  // First non-flag argument is the task
  let task = '';
  let rounds = 3;
  let model = 'gemini-3.1-pro';
  let verbose = false;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--rounds' && args[i + 1]) {
      rounds = parseInt(args[i + 1], 10);
      if (isNaN(rounds) || rounds < 1) rounds = 3;
      if (rounds > 6) rounds = 6; // Cap to prevent excessive API usage
      i += 2;
    } else if (arg === '--model' && args[i + 1]) {
      model = args[i + 1];
      i += 2;
    } else if (arg === '--verbose') {
      verbose = true;
      i++;
    } else if (arg === '--') {
      // Skip the -- separator
      i++;
    } else if (!arg.startsWith('--')) {
      task = arg;
      i++;
    } else {
      i++;
    }
  }

  if (!task) {
    console.error('❌ No task provided. Run with --help for usage.');
    process.exit(1);
  }

  return { task, rounds, model, verbose };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const { task, rounds, model, verbose } = parseArgs();

  try {
    await runOffice(task, rounds, model, verbose);
  } catch (err: any) {
    console.error(`\n❌ Office crashed: ${err.message}\n`);
    if (verbose) console.error(err.stack);
    process.exit(1);
  }
}

main();
