import fs from 'fs';
import path from 'path';

const DIST_DIR = 'dist';
const SW_FILE = path.join(DIST_DIR, 'sw.js');

function run() {
  if (!fs.existsSync(SW_FILE)) {
    console.error(`Service worker not found at ${SW_FILE}. Make sure the project is built.`);
    process.exit(1);
  }

  // Scan assets directory
  const assetsDir = path.join(DIST_DIR, 'assets');
  let assetFiles = [];
  if (fs.existsSync(assetsDir)) {
    assetFiles = fs.readdirSync(assetsDir).map(file => `./assets/${file}`);
  }

  // Read sw.js
  let swContent = fs.readFileSync(SW_FILE, 'utf8');

  // Generate unique Cache Name using timestamp
  const cacheName = `gym-tracker-v${Date.now()}`;

  // Replace CACHE_NAME
  swContent = swContent.replace(
    /const CACHE_NAME\s*=\s*['"`][^'"`]+['"`];/,
    `const CACHE_NAME = '${cacheName}';`
  );

  // Replace ASSETS_TO_CACHE
  const baseAssets = [
    './',
    './index.html',
    './favicon.svg',
    './icon.svg',
    './icon-192.png',
    './icon-192-maskable.png',
    './icon-512.png',
    './icon-512-maskable.png',
    './manifest.json'
  ];

  const allAssets = [...baseAssets, ...assetFiles];
  const assetsString = allAssets.map(asset => `  '${asset}'`).join(',\n');

  swContent = swContent.replace(
    /const ASSETS_TO_CACHE\s*=\s*\[[\s\S]*?\];/,
    `const ASSETS_TO_CACHE = [\n${assetsString}\n];`
  );

  fs.writeFileSync(SW_FILE, swContent, 'utf8');
  console.log(`Successfully updated ${SW_FILE} with ${allAssets.length} cached assets and cache name "${cacheName}".`);
}

run();
