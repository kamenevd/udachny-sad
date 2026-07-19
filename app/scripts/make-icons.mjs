#!/usr/bin/env node
/**
 * Генерация PWA-иконок из icon.svg
 * Запуск: npm run icons  (нужен sharp: npm i -D sharp)
 * Продукт: public/icon-192.png, public/icon-512.png
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public", "icon.svg");

const svgBuffer = readFileSync(svgPath);

for (const size of [192, 512]) {
  const outPath = resolve(root, "public", `icon-${size}.png`);
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath} (${size}×${size})`);
}

console.log("Иконки готовы: public/icon-{192,512}.png");
