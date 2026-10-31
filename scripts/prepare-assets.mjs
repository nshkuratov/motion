import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const names = ['cloud-background', 'chrome-orbit', 'cloud-foreground', 'desert-background', 'moon', 'ocean-background', 'glass-knot', 'ocean-foreground'];
await mkdir('public/images', { recursive: true });
for (const name of names) {
  const result = await sharp(`artwork/${name}.png`).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(`public/images/${name}.webp`);
  console.log(`${name}: ${Math.round(result.size / 1024)} KB`);
}
