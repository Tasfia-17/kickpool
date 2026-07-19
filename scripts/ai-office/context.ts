// ═══════════════════════════════════════════════════════════════
//  CinePurr AI Office — Codebase Context Reader
//  Reads key project files so agents have real knowledge of
//  the codebase they're working on.
// ═══════════════════════════════════════════════════════════════

import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

/** Safely read a file, returns empty string on failure */
function safeRead(filePath: string, maxChars = 3000): string {
  try {
    const abs = path.resolve(PROJECT_ROOT, filePath);
    const content = fs.readFileSync(abs, 'utf-8');
    return content.slice(0, maxChars);
  } catch {
    return `[Could not read ${filePath}]`;
  }
}

/** Recursively list directory contents (shallow, 1 level) */
function listDir(dirPath: string): string[] {
  try {
    const abs = path.resolve(PROJECT_ROOT, dirPath);
    return fs.readdirSync(abs).map((f) => {
      const stat = fs.statSync(path.join(abs, f));
      return stat.isDirectory() ? `${f}/` : f;
    });
  } catch {
    return [];
  }
}

/** Read a project file (for agents via tool call). Returns content. */
export function readProjectFile(filePath: string): string {
  // Security: only allow reading within the project
  const abs = path.resolve(PROJECT_ROOT, filePath);
  if (!abs.startsWith(PROJECT_ROOT)) {
    return 'ACCESS DENIED: Cannot read files outside the project root.';
  }

  // Block .env and other sensitive files
  const basename = path.basename(abs).toLowerCase();
  if (basename === '.env' || basename === '.env.local' || basename === '.env.production') {
    return 'ACCESS DENIED: Cannot read environment files (may contain secrets).';
  }

  try {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const items = listDir(filePath);
      return `Directory listing for ${filePath}:\n${items.join('\n')}`;
    }

    // Cap file reads to 8000 chars (enough for large files)
    const content = fs.readFileSync(abs, 'utf-8');
    if (content.length > 8000) {
      return content.slice(0, 8000) + '\n\n... [TRUNCATED — file is ' + content.length + ' chars total]';
    }
    return content;
  } catch (err: any) {
    return `Could not read ${filePath}: ${err.message}`;
  }
}

/**
 * Build a comprehensive context string for the AI agents.
 * This gives them awareness of the actual project structure,
 * architecture, dependencies, and key source files.
 */
export function buildProjectContext(): string {
  const sections: string[] = [];

  // 1. Architecture overview (trimmed)
  sections.push(`
══ PROJECT: CinePurr ══════════════════════════════
A synchronized video watching platform with real-time chat,
gamification, and social features.

Tech Stack: Next.js 16 + React 19 + TypeScript 5 + Socket.IO 4 + Prisma 6 + Redis
Deployment: Docker on DigitalOcean, Nginx reverse proxy, PostgreSQL
Domain: cinepurr.me
`);

  // 2. Architecture doc summary
  const archDoc = safeRead('ARCHITECTURE.md', 2000);
  if (archDoc && !archDoc.startsWith('[Could not')) {
    sections.push(`══ ARCHITECTURE.md (excerpt) ══\n${archDoc}`);
  }

  // 3. Project structure
  sections.push(`══ PROJECT STRUCTURE ══
Root files: ${listDir('.').filter(f => !f.endsWith('/')).join(', ')}
Root dirs:  ${listDir('.').filter(f => f.endsWith('/')).join(', ')}

server/ contents:     ${listDir('server').join(', ')}
server/handlers/:    ${listDir('server/handlers').join(', ')}
src/components/:     ${listDir('src/components').slice(0, 20).join(', ')}
src/app/:            ${listDir('src/app').join(', ')}
src/lib/:            ${listDir('src/lib').join(', ')}
`);

  // 4. Package.json dependencies
  const pkgJson = safeRead('package.json', 3000);
  if (pkgJson) {
    sections.push(`══ DEPENDENCIES (package.json) ══\n${pkgJson}`);
  }

  // 5. Server entry point (first 120 lines)
  const serverIndex = safeRead('server/index.ts', 4000);
  sections.push(`══ SERVER ENTRY (server/index.ts excerpt) ══\n${serverIndex}`);

  // 6. Server types
  const serverTypes = safeRead('server/types.ts', 3000);
  sections.push(`══ SERVER TYPES (server/types.ts) ══\n${serverTypes}`);

  return sections.join('\n\n');
}
