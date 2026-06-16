import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceLogo = path.join(rootDir, "design/logo.svg");
const sourceMaskable = path.join(rootDir, "design/logo-maskable.svg");
const outDir = path.join(rootDir, "public/icons");

const anySizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

async function run() {
  await mkdir(outDir, { recursive: true });

  for (const size of anySizes) {
    await sharp(sourceLogo)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}x${size}.png`));
  }

  for (const size of maskableSizes) {
    await sharp(sourceMaskable)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `maskable-icon-${size}x${size}.png`));
  }

  await sharp(sourceLogo).resize(180, 180).png().toFile(path.join(outDir, "apple-touch-icon.png"));
  await sharp(sourceLogo).resize(32, 32).png().toFile(path.join(outDir, "favicon-32x32.png"));
  await sharp(sourceLogo).resize(16, 16).png().toFile(path.join(outDir, "favicon-16x16.png"));

  console.log("Icons generated in", outDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
