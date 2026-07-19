import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const [,, agent, action, text] = process.argv;

if (!agent || !action || !text) {
  console.error("Usage: npx ts-node cast.ts <agent> <action> <text>");
  process.exit(1);
}

const payload = {
  secret: process.env.ADMIN_API_KEY || 'CINEPURR_ADMIN_SECRET_KEY_2026',
  event: {
    type: action === 'thinking' ? 'AGENT_THINKING' : 
          action === 'searching' ? 'AGENT_TOOL_CALL' : 
          'AGENT_SPEAKING',
    payload: action === 'searching' 
      ? { agent, tool: text, args: {} }
      : { agent, content: text, role: 'Agent' }
  }
};

fetch('http://localhost:4000/api/admin/ai-office', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).catch(() => {});
