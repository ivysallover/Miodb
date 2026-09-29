const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
console.log('Building MIO Vite app from root:', rootDir);

const viteBin = path.join(rootDir, 'node_modules', '.bin', 'vite');
if (!fs.existsSync(viteBin)) {
  console.log('Installing dependencies in repository root...');
  execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
}

// Build Vite in parent directory
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// Copy output dist to local dist
const srcDist = path.join(rootDir, 'dist');
const destDist = path.join(__dirname, 'dist');

if (fs.existsSync(destDist)) {
  fs.rmSync(destDist, { recursive: true, force: true });
}

fs.cpSync(srcDist, destDist, { recursive: true });
console.log('Successfully copied dist into frontend/dist for Vercel deployment.');
