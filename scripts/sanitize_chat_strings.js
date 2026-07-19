const fs = require('fs');
const p = 'src/components/room/Chat.tsx';
const data = fs.readFileSync(p, 'utf8');
fs.writeFileSync(p + '.bak', data);
let out = '';
let inSq = false, inDq = false;
for (let i = 0; i < data.length; i++) {
  const c = data[i];
  if (c === '\\') {
    out += c;
    if (i + 1 < data.length) {
      out += data[i + 1];
      i++;
    }
    continue;
  }
  if (c === "'" && !inDq) {
    inSq = !inSq;
    out += c;
    continue;
  }
  if (c === '"' && !inSq) {
    inDq = !inDq;
    out += c;
    continue;
  }
  if ((c === '\n' || c === '\r') && (inSq || inDq)) {
    out += ' ';
    continue;
  }
  out += c;
}
fs.writeFileSync(p, out);
console.log('sanitized Chat.tsx, original backed up to Chat.tsx.bak');
