const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
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
    // replace from 'framer-motion' with from 'motion/react'
    // and from "framer-motion" with from "motion/react"
    const newContent = content.replace(/from\s+['"]framer-motion['"]/g, "from 'motion/react'");
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        fixedCount++;
        console.log('Migrated', file);
    }
});

console.log('Total files migrated to motion/react:', fixedCount);
