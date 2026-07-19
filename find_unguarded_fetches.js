const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const COMPONENTS_DIR = path.join(__dirname, 'src', 'components');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : 
      (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) && callback(dirPath);
  });
}

function analyzeSyntaxTree(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  let hasUnguardedFetch = false;
  let matches = [];

  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'useEffect') {
      const effectText = node.getText(sourceFile);
      // If it contains fetch but doesn't mention AbortController or signal
      if (effectText.includes('fetch') && !effectText.includes('AbortController') && !effectText.includes('signal')) {
        hasUnguardedFetch = true;
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        matches.push(start.line + 1);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  
  if (hasUnguardedFetch) {
    console.log(`\n📄 ${filePath.replace(COMPONENTS_DIR, '')}`);
    matches.forEach(line => console.log(`   useEffect at line ${line}`));
  }
}

console.log('Scanning for unguarded useEffect fetches...');
walkDir(COMPONENTS_DIR, analyzeSyntaxTree);
