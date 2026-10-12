import type { AxisDef, Band, SpecimenLayout } from "@/lib/types"
import { formatAxis, variationSettings } from "@/lib/axes"

export const STAGE_W = 1400
export const STAGE_H = 860

const STOPS: Array<[number, number, number]> = [
  [198, 42, 28],
  [214, 96, 22],
  [196, 146, 28],
  [122, 140, 36],
  [18, 128, 104],
  [20, 108, 168],
  [16, 58, 122],
]

type LayoutInput = {
  text: string
  family: string
  values: Record<string, number>
  axes: AxisDef[]
  captionLeft: string
  captionRight: string
}

export function layoutSpecimen(
  ctx: CanvasRenderingContext2D,
  input: LayoutInput,
): SpecimenLayout {
  const lines = specimenLines(input.text)
  const empty = lines.length === 0
  const drawLines = empty ? ["M"] : lines
  const variation = variationSettings(input.values)
  let fontSize = drawLines.length > 1 ? 148 : 268
  let metrics = measure(ctx, drawLines, input.family, variation, fontSize)
  const maxW = STAGE_W - 240
  const maxH = 520

  for (let pass = 0; pass < 10; pass++) {
    const block =
      metrics.lineBox * drawLines.length + fontSize * 0.08 * (drawLines.length - 1)
    if (metrics.width <= maxW && block <= maxH) break
    const scale = Math.min(maxW / Math.max(metrics.width, 1), maxH / Math.max(block, 1))
    fontSize = Math.max(32, Math.floor(fontSize * scale * 0.97))
    metrics = measure(ctx, drawLines, input.family, variation, fontSize)
  }

  const gap = fontSize * 0.1
  const blockH = metrics.lineBox * drawLines.length + gap * (drawLines.length - 1)
  const textTop = (STAGE_H - blockH) / 2 - 8
  const baselines = drawLines.map(
    (_, index) => textTop + metrics.ascent + index * (metrics.lineBox + gap),
  )
  const visual = visualFromAxes(input.values, input.axes, fontSize)
  const bands = empty
    ? []
    : input.axes.length === 0
      ? [
          {
            y: textTop,
            h: blockH,
            shift: 0,
            color: "#f3efe4",
            highlight: "#f3efe4",
          },
        ]
      : buildBands({
          textTop,
          textHeight: blockH,
          ...visual,
        })

  return {
    width: STAGE_W,
    height: STAGE_H,
    fontSize,
    lines: empty ? [] : drawLines,
    centerX: STAGE_W / 2,
    baselines,
    textTop,
    textHeight: blockH,
    bands,
    variation,
    family: input.family,
    captionLeft: input.captionLeft,
    captionRight: input.captionRight,
    empty,
    foldLabel: empty
      ? "Awaiting a line"
      : input.axes.length === 0
        ? "Static face"
        : `${visual.bandCount} pleats · throw ${Math.round(visual.amplitude)} · ${visual.foldCycles.toFixed(1)} cycles`,
  }
}

export function specimenLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .filter((line) => line.trim().length > 0)
    .slice(0, 4)
}

export function captionFor(
  family: string,
  axes: AxisDef[],
  values: Record<string, number>,
): string {
  const shown = axes.slice(0, 6)
  const extra = axes.length - shown.length
  const body = shown
    .map((axis) => `${axis.tag} ${formatAxis(values[axis.tag] ?? axis.default)}`)
    .join("   ")
  return `${family}    ${body}${extra > 0 ? `   +${extra}` : ""}`
}

export function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text)
}

type Visual = {
  bandCount: number
  amplitude: number
  foldCycles: number
  shear: number
  hueShift: number
}

export function visualFromAxes(
  values: Record<string, number>,
  axes: AxisDef[],
  fontSize: number,
): Visual {
  const norm = (tag: string): number | null => {
    const axis = axes.find((item) => item.tag === tag)
    if (!axis || axis.max === axis.min) return null
    const value = values[tag]
    if (typeof value !== "number") return null
    return clamp01((value - axis.min) / (axis.max - axis.min))
  }
  const custom = axes
    .filter((axis) => !["wght", "wdth", "opsz", "slnt", "ital"].includes(axis.tag))
    .map((axis) => norm(axis.tag))
    .filter((value): value is number => value != null)
  const customMean = custom.length
    ? custom.reduce((sum, value) => sum + value, 0) / custom.length
    : 0.3
  const wght = norm("wght") ?? customMean
  const opsz = norm("opsz") ?? 0.55
  const wdth = norm("wdth")
  const slnt = norm("slnt") ?? norm("ital") ?? 0.5
  const spread = wdth ?? 0.22 + opsz * 0.58 + (1 - wght) * 0.2
  const bandCount = clampInt(Math.round(6 + (1 - wght) * 14), 5, 20)
  return {
    bandCount,
    amplitude: fontSize * (0.028 + spread * 0.15 + customMean * 0.045),
    foldCycles: 0.75 + opsz * 2.15 + customMean * 0.35,
    shear: (slnt - 0.5) * fontSize * 0.62,
    hueShift: (customMean * 0.46 + (wdth ?? opsz) * 0.06) % 1,
  }
}

export function buildBands(input: {
  textTop: number
  textHeight: number
  bandCount: number
  amplitude: number
  foldCycles: number
  shear: number
  hueShift: number
}): Band[] {
  const count = Math.max(1, input.bandCount)
  const gap = count === 1 ? 0 : Math.max(1.5, input.textHeight * 0.011)
  const usable = Math.max(count, input.textHeight - gap * (count - 1))
  const weights = Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1)
    return 0.7 + Math.sin(t * Math.PI) * 0.6
  })
  const sum = weights.reduce((total, weight) => total + weight, 0)
  const bands: Band[] = []
  let y = input.textTop
  for (let index = 0; index < count; index++) {
    const t = count === 1 ? 0.5 : index / (count - 1)
    const h = (weights[index] / sum) * usable
    const shift =
      triangle(t * input.foldCycles) * input.amplitude + (t - 0.5) * input.shear
    const color = spectrumAt((t + input.hueShift) % 1)
    bands.push({ y, h, shift, color: color.ink, highlight: color.highlight })
    y += h + gap
  }
  return bands
}

export function applyVariation(ctx: CanvasRenderingContext2D, variation: string) {
  const withVar = ctx as CanvasRenderingContext2D & { fontVariationSettings?: string }
  if ("fontVariationSettings" in withVar) {
    withVar.fontVariationSettings = variation
  }
}

function measure(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  family: string,
  variation: string,
  fontSize: number,
) {
  ctx.font = `${fontSize}px "${family}"`
  applyVariation(ctx, variation)
  let width = 0
  let ascent = fontSize * 0.74
  let descent = fontSize * 0.22
  for (const line of lines) {
    const metrics = ctx.measureText(line || "M")
    width = Math.max(width, metrics.width)
    if (metrics.actualBoundingBoxAscent) {
      ascent = Math.max(ascent, metrics.actualBoundingBoxAscent)
    }
    if (metrics.actualBoundingBoxDescent) {
      descent = Math.max(descent, metrics.actualBoundingBoxDescent)
    }
  }
  return { width, ascent, descent, lineBox: ascent + descent }
}

function spectrumAt(t: number): { ink: string; highlight: string } {
  const wrapped = ((t % 1) + 1) % 1
  const pos = wrapped * (STOPS.length - 1)
  const index = Math.min(STOPS.length - 2, Math.floor(pos))
  const mix = pos - index
  const a = STOPS[index]
  const b = STOPS[index + 1]
  const rgb = a.map((channel, i) => Math.round(channel + (b[i] - channel) * mix))
  const hi = rgb.map((channel) => Math.round(channel + (243 - channel) * 0.5))
  return { ink: `rgb(${rgb.join(",")})`, highlight: `rgb(${hi.join(",")})` }
}

function triangle(phase: number): number {
  const x = ((phase % 2) + 2) % 2
  return (x < 1 ? x : 2 - x) * 2 - 1
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
