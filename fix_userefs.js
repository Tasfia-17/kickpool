const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const dir = path.join(__dirname, 'src');
const files = walk(dir);

let fixedCount = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    // the regex: useRef<TYPE>() -> useRef<TYPE | undefined>(undefined)
    const newContent = content.replace(/useRef<([^>]+)>\(\)/g, 'useRef<$1 | undefined>(undefined)');
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        fixedCount++;
        console.log('Fixed', file);
    }
});

// also fix the particleId typo I introduced
const clickerFile = path.join(dir, 'components', 'games', 'ClickerGame.tsx');
if (fs.existsSync(clickerFile)) {
    let clickerContent = fs.readFileSync(clickerFile, 'utf8');
    if (!clickerContent.includes('const particleId = useRef(0);')) {
        clickerContent = clickerContent.replace(
            'const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);',
            'const particleId = useRef(0);\n  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);'
        );
        fs.writeFileSync(clickerFile, clickerContent, 'utf8');
        console.log('Restored particleId in ClickerGame.tsx');
    }
}

console.log('Total files fixed:', fixedCount);
