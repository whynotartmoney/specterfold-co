import type { AxisDef } from "@/lib/types"
import { trimNum } from "@/lib/catalog"

export type FoldId = "noon" | "crease" | "hairline"

export type FoldPreset = {
  id: FoldId
  name: string
  gloss: string
  blurb: string
  targets: Record<string, number>
  fallback: number
}

export const FOLDS: FoldPreset[] = [
  {
    id: "noon",
    name: "Noon prism",
    gloss: "正午",
    blurb: "Spectrum fanned open, type at a working size.",
    fallback: 0.48,
    targets: {
      wght: 0.42,
      wdth: 0.7,
      opsz: 0.82,
      slnt: 0.28,
      ital: 0,
      SOFT: 0.28,
      WONK: 0.15,
      GRAD: 0.55,
      CASL: 0.2,
      CRSV: 0.35,
      MONO: 0,
      FLAR: 0.15,
      VOLM: 0.2,
      YEAR: 0.55,
      ELGR: 0.35,
      ELSH: 0.25,
    },
  },
  {
    id: "crease",
    name: "Night crease",
    gloss: "夜摺",
    blurb: "Heavy ink, tight pleats, the sheet pressed shut.",
    fallback: 0.84,
    targets: {
      wght: 0.9,
      wdth: 0.12,
      opsz: 0.08,
      slnt: 0.78,
      ital: 1,
      SOFT: 0.92,
      WONK: 1,
      GRAD: 0.15,
      CASL: 0.85,
      CRSV: 1,
      MONO: 0.15,
      FLAR: 0.9,
      VOLM: 0.88,
      YEAR: 0.96,
      ELGR: 1,
      ELSH: 0.8,
    },
  },
  {
    id: "hairline",
    name: "Hairline",
    gloss: "髮絲",
    blurb: "Thin stroke, large optical size, light thrown wide.",
    fallback: 0.12,
    targets: {
      wght: 0.02,
      wdth: 1,
      opsz: 1,
      slnt: 0.5,
      ital: 0,
      SOFT: 0,
      WONK: 0,
      GRAD: 0.72,
      CASL: 0,
      CRSV: 0,
      MONO: 1,
      FLAR: 0,
      VOLM: 0.05,
      YEAR: 0.02,
      ELGR: 0,
      ELSH: 0.05,
    },
  },
]

export function getFold(id: FoldId): FoldPreset {
  return FOLDS.find((fold) => fold.id === id) ?? FOLDS[0]
}

export function poseFromFold(axes: AxisDef[], id: FoldId): Record<string, number> {
  const fold = getFold(id)
  const values: Record<string, number> = {}
  for (const axis of axes) {
    const norm = fold.targets[axis.tag] ?? fold.fallback
    values[axis.tag] = quantize(axis.min + (axis.max - axis.min) * clamp01(norm), axis)
  }
  return values
}

export function defaultsFor(axes: AxisDef[]): Record<string, number> {
  return Object.fromEntries(axes.map((axis) => [axis.tag, axis.default]))
}

export function mergeAxisValues(
  axes: AxisDef[],
  partial: Record<string, number> | null,
  fallbackFold: FoldId | null,
): Record<string, number> {
  if (!partial) {
    return fallbackFold ? poseFromFold(axes, fallbackFold) : defaultsFor(axes)
  }
  const values: Record<string, number> = {}
  for (const axis of axes) {
    const raw = partial[axis.tag]
    values[axis.tag] =
      typeof raw === "number" && Number.isFinite(raw)
        ? quantize(clamp(raw, axis.min, axis.max), axis)
        : axis.default
  }
  return values
}

export function lerpAxes(
  from: Record<string, number>,
  to: Record<string, number>,
  t: number,
  axes: AxisDef[],
): Record<string, number> {
  const values: Record<string, number> = {}
  for (const axis of axes) {
    const a = from[axis.tag] ?? axis.default
    const b = to[axis.tag] ?? axis.default
    values[axis.tag] = a + (b - a) * t
  }
  return values
}

export function variationSettings(values: Record<string, number>): string {
  return Object.entries(values)
    .filter(([, value]) => Number.isFinite(value))
    .map(([tag, value]) => `"${tag}" ${trimNum(value)}`)
    .join(", ")
}

export function axisStep(axis: AxisDef): number {
  const span = axis.max - axis.min
  if (span <= 1) return 0.01
  if (span <= 2) return 0.1
  return 1
}

export function quantize(value: number, axis: AxisDef): number {
  const step = axisStep(axis)
  const steps = Math.round((value - axis.min) / step)
  const next = axis.min + steps * step
  return Math.round(clamp(next, axis.min, axis.max) * 1000) / 1000
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2
}

export function formatAxis(n: number): string {
  if (!Number.isFinite(n)) return "—"
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function clamp01(n: number): number {
  return clamp(n, 0, 1)
}
