const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');
const distDir = path.join(__dirname, '..', 'www');

// Helper to recursively copy directories
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    // Ignore build files, source scripts, and native platform directories
    if (entry.name === 'node_modules' || 
        entry.name === 'android' || 
        entry.name === 'www' || 
        entry.name === 'dist' ||
        entry.name === '.git' || 
        entry.name === '.agents' || 
        entry.name === '.gemini' ||
        entry.name === 'scripts' ||
        entry.name === 'server.js' ||
        entry.name === 'main.js' ||
        entry.name === 'package.json' ||
        entry.name === 'package-lock.json' ||
        entry.name === 'capacitor.config.json') {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log("Cleaning www directory...");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

console.log("Copying index.html and style.css...");
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(distDir, 'index.html'));
fs.copyFileSync(path.join(srcDir, 'style.css'), path.join(distDir, 'style.css'));

console.log("Copying assets...");
copyDirSync(path.join(srcDir, 'assets'), path.join(distDir, 'assets'));

console.log("Copying js...");
copyDirSync(path.join(srcDir, 'js'), path.join(distDir, 'js'));

console.log("Mobile build complete inside www/!");
