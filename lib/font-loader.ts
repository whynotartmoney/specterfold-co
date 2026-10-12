import type { FontFaceSource, LoadedFont } from "@/lib/types"
import type { CatalogFont } from "@/lib/types"
import { parseFontBytes } from "@/lib/parse-sfnt"

const LINK_ID = "specterfold-font-css"

export async function loadGoogleFont(font: CatalogFont): Promise<LoadedFont> {
  const href = `/api/font-css?id=${encodeURIComponent(font.id)}`
  const css = await fetch(href).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not load ${font.family}.`)
    }
    return response.text()
  })
  const faces = parseFontCss(css)
  if (!faces.length) {
    throw new Error(`${font.family} did not return a font file.`)
  }
  await mountStylesheet(href)
  await document.fonts.load(`400 80px "${font.family}"`, "Specterfold Hamburgefontsiv")
  await document.fonts.ready
  return {
    id: font.id,
    family: font.family,
    cssFamily: font.family,
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

function mountStylesheet(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    document.getElementById(LINK_ID)?.remove()
    const link = document.createElement("link")
    link.id = LINK_ID
    link.rel = "stylesheet"
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error("The font stylesheet failed to load."))
    document.head.appendChild(link)
  })
}
