import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Brand colors
const BRAND_BLUE = '#3b82f6';
const WHITE = '#ffffff';

// Create SVG source with proper text centering for favicon
// Using a bold, simple design for small size readability
function createSvg(size) {
  const fontSize = Math.round(size * 0.44); // Slightly larger for readability
  const cornerRadius = Math.round(size * 0.1875); // ~6px at 32px
  const yOffset = size * 0.69; // Adjust vertical centering for text baseline

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${BRAND_BLUE}"/>
  <text x="${size/2}" y="${yOffset}" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${fontSize}" font-weight="800" fill="${WHITE}" letter-spacing="-0.02em">GS</text>
</svg>`;
}

// Generate PNG from SVG
async function generatePng(size, outputName) {
  const svg = createSvg(size);
  const buffer = Buffer.from(svg);

  await sharp(buffer)
    .resize(size, size)
    .png()
    .toFile(join(publicDir, outputName));

  console.log(`Generated: ${outputName}`);
}

// Generate ICO (multi-resolution)
async function generateIco() {
  // For ICO, we'll create a 32x32 PNG that works well as favicon.ico
  const svg = createSvg(32);
  const buffer = Buffer.from(svg);

  // Create the individual size buffers for ICO
  const sizes = [16, 32, 48];
  const pngBuffers = await Promise.all(
    sizes.map(async (size) => {
      const svgForSize = createSvg(size);
      return sharp(Buffer.from(svgForSize))
        .resize(size, size)
        .png()
        .toBuffer();
    })
  );

  // Create ICO file manually (simplified - single 32x32 image)
  // For true multi-res ICO, we'd need a proper ICO library
  // Using 32x32 PNG as favicon.ico (browsers handle it)
  const png32 = await sharp(Buffer.from(createSvg(32)))
    .resize(32, 32)
    .png()
    .toBuffer();

  // Create a proper ICO header for 16x16, 32x32, and 48x48
  const ico = await createIcoBuffer(pngBuffers, sizes);
  writeFileSync(join(publicDir, 'favicon.ico'), ico);
  console.log('Generated: favicon.ico');
}

// Create ICO buffer from PNG buffers
async function createIcoBuffer(pngBuffers, sizes) {
  // ICO file structure:
  // - ICONDIR header (6 bytes)
  // - ICONDIRENTRY for each image (16 bytes each)
  // - Image data

  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + (dirEntrySize * numImages);

  // Calculate total size
  let totalSize = dataOffset;
  for (const buf of pngBuffers) {
    totalSize += buf.length;
  }

  const ico = Buffer.alloc(totalSize);
  let offset = 0;

  // ICONDIR header
  ico.writeUInt16LE(0, offset); offset += 2; // Reserved
  ico.writeUInt16LE(1, offset); offset += 2; // Type: 1 = ICO
  ico.writeUInt16LE(numImages, offset); offset += 2; // Number of images

  // ICONDIRENTRY for each image
  let imageOffset = dataOffset;
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const pngBuf = pngBuffers[i];

    ico.writeUInt8(size === 256 ? 0 : size, offset); offset += 1; // Width
    ico.writeUInt8(size === 256 ? 0 : size, offset); offset += 1; // Height
    ico.writeUInt8(0, offset); offset += 1; // Color palette (0 = no palette)
    ico.writeUInt8(0, offset); offset += 1; // Reserved
    ico.writeUInt16LE(1, offset); offset += 2; // Color planes
    ico.writeUInt16LE(32, offset); offset += 2; // Bits per pixel
    ico.writeUInt32LE(pngBuf.length, offset); offset += 4; // Image size
    ico.writeUInt32LE(imageOffset, offset); offset += 4; // Image offset

    imageOffset += pngBuf.length;
  }

  // Image data
  for (const pngBuf of pngBuffers) {
    pngBuf.copy(ico, offset);
    offset += pngBuf.length;
  }

  return ico;
}

async function main() {
  console.log('Generating favicon set for Guardrail-Sim...\n');

  // Ensure public directory exists
  mkdirSync(publicDir, { recursive: true });

  // Generate standard favicon PNGs
  await generatePng(16, 'favicon-16x16.png');
  await generatePng(32, 'favicon-32x32.png');

  // Apple touch icon (180x180)
  await generatePng(180, 'apple-touch-icon.png');

  // Android Chrome icons
  await generatePng(192, 'android-chrome-192x192.png');
  await generatePng(512, 'android-chrome-512x512.png');

  // Generate ICO file
  await generateIco();

  // Update the SVG favicon with optimized version
  const optimizedSvg = createSvg(32);
  writeFileSync(join(publicDir, 'favicon.svg'), optimizedSvg);
  console.log('Updated: favicon.svg');

  console.log('\nFavicon generation complete!');
}

main().catch(console.error);
