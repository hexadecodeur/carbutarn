/**
 * Génère les PNG PWA (192 / 512 / apple-touch) depuis public/icons/icon.svg
 * Usage : pnpm icons
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const svgPath = join(root, "public/icons/icon.svg")
const outDir = join(root, "public/icons")

const svg = await readFile(svgPath)

await mkdir(outDir, { recursive: true })

async function writePng(name, size) {
  const buf = await sharp(svg).resize(size, size).png().toBuffer()
  const dest = join(outDir, name)
  await writeFile(dest, buf)
  console.log(`wrote ${name} (${size}×${size})`)
}

await writePng("icon-192.png", 192)
await writePng("icon-512.png", 512)
await writePng("apple-touch-icon.png", 180)

console.log("PWA icons OK")
