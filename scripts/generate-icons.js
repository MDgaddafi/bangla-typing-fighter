const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sourceIcon = path.join(__dirname, '..', 'assets', 'icon.png');
const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const androidSizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

console.log("Generating cross-platform icons...");

// Check if source icon exists
if (!fs.existsSync(sourceIcon)) {
  console.error("Source icon not found at: " + sourceIcon);
  process.exit(1);
}

// Generate Android Icons if android directory exists
if (fs.existsSync(androidResDir)) {
  androidSizes.forEach(item => {
    const targetDir = path.join(androidResDir, item.dir);
    if (fs.existsSync(targetDir)) {
      const normalIcon = path.join(targetDir, 'ic_launcher.png');
      const roundIcon = path.join(targetDir, 'ic_launcher_round.png');
      
      try {
        execSync(`sips -z ${item.size} ${item.size} "${sourceIcon}" --out "${normalIcon}"`);
        execSync(`sips -z ${item.size} ${item.size} "${sourceIcon}" --out "${roundIcon}"`);
        console.log(`Generated Android icon for ${item.dir} (${item.size}x${item.size})`);
      } catch (err) {
        console.error(`Error resizing icon for Android ${item.dir}:`, err.message);
      }
    }
  });
} else {
  console.log("Android folder not generated yet. Run after adding the Android platform.");
}
