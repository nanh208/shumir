const fs = require('fs');
const path = require('path');

function getAllCommandFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllCommandFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(filePath);
    }
  }
  return arrayOfFiles;
}

const commandsDir = path.join(__dirname, '..', 'commands');
const files = getAllCommandFiles(commandsDir);
let ok = true;
for (const f of files) {
  try {
    const cmd = require(f);
    if (!('data' in cmd) || !('execute' in cmd)) {
      console.warn(`⚠️  ${f} is missing 'data' or 'execute' export`);
      ok = false;
    } else {
      console.log(`✅ ${path.relative(process.cwd(), f)} OK`);
    }
  } catch (err) {
    console.error(`❌ Error loading ${f}:`, err);
    ok = false;
  }
}

process.exit(ok ? 0 : 2);
