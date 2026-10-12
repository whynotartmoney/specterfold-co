import { applyVariation } from "@/lib/specimen"
import type { SpecimenLayout } from "@/lib/types"
import type { FontFaceSource } from "@/lib/types"

export async function embedFontCss(
  family: string,
  faces: FontFaceSource[] | undefined,
  buffer?: ArrayBuffer,
  fileName?: string,
): Promise<string> {
  if (buffer) {
    const format = fontFormat(fileName ?? "")
    return faceRule(family, buffer, format)
  }
  if (!faces?.length) return ""
  const rules = await Promise.all(
    faces.map(async (face) => {
      const response = await fetch(face.url)
      if (!response.ok) return ""
      const data = await response.arrayBuffer()
      return faceRule(family, data, "woff2", face.unicodeRange)
    }),
  )
  return rules.filter(Boolean).join("\n")
}

export function drawSpecimen(
  ctx: CanvasRenderingContext2D,
  layout: SpecimenLayout,
  scale = 1,
) {
  const { width, height } = layout
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = "#0e0f0c"
  ctx.fillRect(0, 0, width, height)
  drawBeam(ctx)
  drawCropMarks(ctx, width, height)
  ctx.fillStyle = "#e23b22"
  ctx.font = '13px ui-monospace, monospace'
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText("OPENX 03", 48, 58)

  if (layout.empty || layout.lines.length === 0) {
    ctx.strokeStyle = "rgba(243,239,228,0.4)"
    ctx.beginPath()
    ctx.moveTo(180, 430)
    ctx.lineTo(1220, 430)
    ctx.stroke()
    ctx.fillStyle = "#c8c1b4"
    ctx.textAlign = "center"
    ctx.fillText("SET A LINE TO FOLD", width / 2, 468)
  } else {
    paintLines(ctx, layout, 0, "rgba(243,239,228,0.14)", null)
    for (const band of layout.bands) {
      paintLines(ctx, layout, band.shift, band.highlight, {
        y: band.y,
        h: band.h,
      })
      const inset = Math.min(1.7, Math.max(0, band.h - 0.8))
      paintLines(ctx, layout, band.shift, band.color, {
        y: band.y + inset,
        h: Math.max(0.4, band.h - inset),
      })
    }
  }

  ctx.font = '13px ui-monospace, monospace'
  ctx.fillStyle = "#c8c1b4"
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(layout.captionLeft, 48, height - 36)
  ctx.textAlign = "right"
  ctx.fillStyle = "#f3efe4"
  ctx.fillText(layout.captionRight, width - 48, height - 36)
}

export function canvasSupportsVariation(): boolean {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  return Boolean(ctx && "fontVariationSettings" in ctx)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function slugName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "specterfold"
}

function paintLines(
  ctx: CanvasRenderingContext2D,
  layout: SpecimenLayout,
  shift: number,
  fill: string,
  clip: { y: number; h: number } | null,
) {
  ctx.save()
  if (clip) {
    ctx.beginPath()
    ctx.rect(0, clip.y, layout.width, clip.h)
    ctx.clip()
  }
  ctx.font = `${layout.fontSize}px "${layout.family}"`
  applyVariation(ctx, layout.variation)
  ctx.fillStyle = fill
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"
  layout.lines.forEach((line, index) => {
    ctx.fillText(line, layout.centerX + shift, layout.baselines[index])
  })
  ctx.restore()
}

function drawBeam(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(92, 148, 390, 760)
  gradient.addColorStop(0, "#e23922")
  gradient.addColorStop(0.48, "#e0a820")
  gradient.addColorStop(1, "#2076c4")
  ctx.strokeStyle = gradient
  ctx.globalAlpha = 0.8
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(92, 148)
  ctx.lineTo(390, 760)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function drawCropMarks(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const inset = 26
  const len = 16
  ctx.strokeStyle = "rgba(243,239,228,0.78)"
  ctx.lineWidth = 1
  const corners: Array<[number, number, number, number]> = [
    [inset, inset, 1, 1],
    [width - inset, inset, -1, 1],
    [inset, height - inset, 1, -1],
    [width - inset, height - inset, -1, -1],
  ]
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len * sx, y)
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + len * sy)
    ctx.stroke()
  }
}

function faceRule(
  family: string,
  buffer: ArrayBuffer,
  format: string,
  unicodeRange?: string,
): string {
  const mime = format === "woff2" ? "font/woff2" : format === "woff" ? "font/woff" : "font/ttf"
  return `@font-face{font-family:"${family}";src:url(data:${mime};base64,${toBase64(buffer)}) format("${format}");${unicodeRange ? `unicode-range:${unicodeRange};` : ""}font-weight:1 1000;font-stretch:1% 1000%;font-style:oblique -20deg 20deg;}`
}

function fontFormat(fileName: string): string {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".woff2")) return "woff2"
  if (lower.endsWith(".woff")) return "woff"
  if (lower.endsWith(".otf")) return "opentype"
  return "truetype"
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
