import { getCatalogFont } from "@/lib/catalog"
import { mergeAxisValues } from "@/lib/axes"
import type { StudioState } from "@/lib/types"

export type SearchQuery = Record<string, string | string[] | undefined>

const MAX_TEXT = 240

export function createState(query: SearchQuery): { state: StudioState; notice: string | null } {
  const requested = first(query.f)
  const localLink = requested === "local"
  const font = getCatalogFont(localLink ? "fraunces" : requested)
  const encodedA = decodeAxes(first(query.a))
  const encodedB = decodeAxes(first(query.b))
  const text = clampText(first(query.t) || "Specterfold")
  const active = first(query.p) === "b" ? "b" : "a"
  const view = first(query.v) === "compare" ? "compare" : "stage"
  return {
    notice: localLink
      ? "This link used a font file from another browser. Fraunces is standing in."
      : null,
    state: {
      fontId: font.id,
      text,
      poseA: mergeAxisValues(font.axes, encodedA, encodedA ? null : "noon"),
      poseB: mergeAxisValues(font.axes, encodedB, encodedB ? null : "hairline"),
      active,
      view,
    },
  }
}

export function encodeState(state: StudioState): string {
  const params = new URLSearchParams()
  params.set("f", state.fontId)
  params.set("t", state.text)
  params.set("a", encodeAxes(state.poseA))
  params.set("b", encodeAxes(state.poseB))
  params.set("p", state.active)
  if (state.view !== "stage") params.set("v", state.view)
  return params.toString()
}

export function encodeAxes(values: Record<string, number>): string {
  return Object.entries(values)
    .filter(([, value]) => Number.isFinite(value))
    .map(([tag, value]) => `${tag}:${trim(value)}`)
    .join(",")
}

export function decodeAxes(value: string | null): Record<string, number> | null {
  if (!value) return null
  const out: Record<string, number> = {}
  for (const part of value.split(",")) {
    const splitAt = part.indexOf(":")
    if (splitAt <= 0) continue
    const tag = part.slice(0, splitAt)
    const num = Number(part.slice(splitAt + 1))
    if (!/^[A-Za-z0-9]{4}$/.test(tag) || !Number.isFinite(num)) continue
    out[tag] = num
  }
  return Object.keys(out).length ? out : null
}

export function clampText(value: string): string {
  return value.replace(/\r/g, "").slice(0, MAX_TEXT)
}

export function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function trim(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}
