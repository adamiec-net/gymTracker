import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.join('public', 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    // Generate regular PNG icon
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(path.join('public', `icon-${size}.png`));
    console.log(`Generated public/icon-${size}.png`);

    // Generate maskable PNG icon (no rounded corners so OS can mask it)
    const maskableSvg = svgContent.replace('rx="15%"', '');
    await sharp(Buffer.from(maskableSvg))
      .resize(size, size)
      .png()
      .toFile(path.join('public', `icon-${size}-maskable.png`));
    console.log(`Generated public/icon-${size}-maskable.png`);
  }
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
