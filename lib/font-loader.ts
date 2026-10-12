import type { FontFaceSource, LoadedFont } from "@/lib/types"
import type { CatalogFont } from "@/lib/types"
import { parseFontBytes } from "@/lib/parse-sfnt"

const STYLE_ID = "specterfold-font-css"
const FONT_TIMEOUT_MS = 8000

export function specimenFamily(family: string) {
  return `Specterfold ${family}`
}

export async function loadGoogleFont(font: CatalogFont): Promise<LoadedFont> {
  const href = `/api/font-css?id=${encodeURIComponent(font.id)}`
  const response = await fetch(href)
  if (!response.ok) {
    throw new Error(`Could not load ${font.family}.`)
  }
  const cssFamily = specimenFamily(font.family)
  const css = rewriteFontFamily(await response.text(), font.family, cssFamily)
  const faces = parseFontCss(css)
  if (!faces.length) {
    throw new Error(`${font.family} did not return a font file.`)
  }
  mountCss(css)
  await withTimeout(
    document.fonts.load(`400 80px "${cssFamily}"`, "Specterfold Hamburgefontsiv"),
    FONT_TIMEOUT_MS,
    `${font.family} took too long to load.`,
  )
  return {
    id: font.id,
    family: font.family,
    cssFamily,
    axes: font.axes,
    source: "google",
    faces,
    staticFace: false,
  }
}

export async function loadLocalFont(file: File): Promise<LoadedFont> {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("That file is over 8 MB. Try a smaller cut.")
  }
  const buffer = await file.arrayBuffer()
  const parsed = await parseFontBytes(buffer.slice(0))
  const cssFamily = `Specterfold ${parsed.family} ${Math.random().toString(36).slice(2, 8)}`
  const face = new FontFace(cssFamily, buffer.slice(0))
  await face.load()
  document.fonts.add(face)
  return {
    id: "local",
    family: parsed.family,
    cssFamily,
    axes: parsed.axes,
    source: "local",
    fileName: file.name,
    buffer,
    staticFace: parsed.axes.length === 0,
  }
}

export function parseFontCss(css: string): FontFaceSource[] {
  const faces: FontFaceSource[] = []
  for (const block of css.split("@font-face").slice(1)) {
    const url = block.match(/url\(([^)]+)\)/)?.[1]?.replaceAll(/['"]/g, "")
    if (!url) continue
    const unicodeRange = block.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim()
    faces.push(unicodeRange ? { url, unicodeRange } : { url })
  }
  return faces
}

export function rewriteFontFamily(css: string, from: string, to: string) {
  return css
    .replaceAll(`font-family: '${from}'`, `font-family: '${to}'`)
    .replaceAll(`font-family: "${from}"`, `font-family: "${to}"`)
}

function mountCss(css: string) {
  document.getElementById(STYLE_ID)?.remove()
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    work.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (reason: unknown) => {
        window.clearTimeout(timer)
        reject(reason instanceof Error ? reason : new Error(message))
      },
    )
  })
}
