/**
 * Arsham Form — brand asset builder.
 * Rasterizes the SVG logo mark into all PNG assets the site needs,
 * builds a self-contained full lockup (embedded Vazirmatn) and an OG image.
 *
 * Run from project root:  node scripts/build-brand.mjs
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const PUB = join(ROOT, 'public')
const BRAND = join(PUB, 'brand')

const markSvg = readFileSync(join(BRAND, 'logo-mark.svg'), 'utf8')
const fontB64 = readFileSync(join(PUB, 'fonts', 'Vazirmatn-Variable.woff2')).toString('base64')

async function png(svg, out, width) {
  const img = sharp(Buffer.from(svg), { density: 300 })
  const buf = width ? await img.resize({ width }).png().toBuffer() : await img.png().toBuffer()
  writeFileSync(join(PUB, out), buf)
  console.log('✓', out, buf.length, 'bytes')
}

// ---------- 1. icons from the mark ----------
await png(markSvg, 'logo-512.png', 512)
await png(markSvg, 'logo-192.png', 192)
await png(markSvg, 'apple-touch-icon.png', 180)
await png(markSvg, 'favicon-32.png', 32)

// maskable icon: full-bleed background + mark scaled into the safe zone
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="mbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset=".45" stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#mbg)"/>
  <g transform="translate(256 256) scale(0.66) translate(-256 -256)">${markSvg.replace(/<\?xml[^>]*\?>/, '').replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Arsham Form">', '').replace('</svg>', '')}</g>
</svg>`
await png(maskable, 'icon-maskable.png', 512)

// ---------- 2. full lockup (mark + Persian wordmark, font embedded) ----------
const inner = markSvg
  .replace(/<\?xml[^>]*\?>/, '')
  .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Arsham Form">', '<g transform="scale(0.625)">')
  .replace('</svg>', '</g>')

const fullSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 360" role="img" aria-label="آرشام فرم">
  <defs>
    <style>
      @font-face {
        font-family: 'Vazirmatn';
        src: url(data:font/woff2;base64,${fontB64}) format('woff2-variations');
        font-weight: 100 900;
      }
    </style>
  </defs>
  <g transform="translate(0 10)">${inner}</g>
  <text x="360" y="205" font-family="Vazirmatn" font-weight="800" font-size="150" fill="#115e59">آرشام فرم</text>
  <text x="372" y="278" font-family="Vazirmatn" font-weight="500" font-size="44" fill="#0f766e">سامانه طراحی پرسشنامه و آزمون آنلاین</text>
</svg>`
writeFileSync(join(BRAND, 'logo-full.svg'), fullSvg)
console.log('✓ brand/logo-full.svg')
await png(fullSvg, 'brand/logo-full.png', 1024)

// ---------- 3. OG image 1200×630 (for social previews) ----------
const innerOg = markSvg
  .replace(/<\?xml[^>]*\?>/, '')
  .replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Arsham Form">', '<g transform="scale(0.94)">')
  .replace('</svg>', '</g>')

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs>
    <style>
      @font-face {
        font-family: 'Vazirmatn';
        src: url(data:font/woff2;base64,${fontB64}) format('woff2-variations');
        font-weight: 100 900;
      }
    </style>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#134e4a"/>
      <stop offset="1" stop-color="#0b3f3b"/>
    </linearGradient>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="#2dd4bf" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect x="40" y="40" width="1120" height="550" rx="36" fill="none" stroke="#2dd4bf" stroke-opacity=".25" stroke-width="2"/>
  <g transform="translate(70 163)">${innerOg}</g>
  <text x="1128" y="228" text-anchor="end" font-family="Vazirmatn" font-weight="900" font-size="104" fill="#ffffff">آرشام فرم</text>
  <text x="1128" y="318" text-anchor="end" font-family="Vazirmatn" font-weight="400" font-size="40" fill="#99f6e4">فرم بساز، آزمون برگزار کن، پاسخ‌ها را تحلیل کن</text>
  <text x="1128" y="398" text-anchor="end" font-family="Vazirmatn" font-weight="300" font-size="30" fill="#5eead4">پرسشنامه · نظرسنجی · آزمون آنلاین · تحلیل واقعی داده‌ها</text>
  <text x="1116" y="540" text-anchor="end" font-family="Vazirmatn" font-weight="600" font-size="30" fill="#2dd4bf" direction="ltr">aflab.vercel.app</text>
</svg>`
await png(ogSvg, 'og-image.png')

console.log('brand assets done.')
