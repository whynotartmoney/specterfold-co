export type AxisDef = {
  tag: string
  name: string
  min: number
  max: number
  default: number
}

export type CatalogFont = {
  id: string
  family: string
  category: "serif" | "sans" | "display" | "mono"
  note: string
  axes: AxisDef[]
}

export type LoadedFont = {
  id: string
  family: string
  cssFamily: string
  axes: AxisDef[]
  source: "google" | "local"
  fileName?: string
  /** Original upload, kept for SVG embedding. */
  buffer?: ArrayBuffer
  /** Google CSS faces, latin-first when possible. */
  faces?: FontFaceSource[]
  staticFace: boolean
}

export type FontFaceSource = {
  url: string
  unicodeRange?: string
}

export type PoseId = "a" | "b"

export type StudioView = "stage" | "compare"

export type StudioState = {
  fontId: string
  text: string
  poseA: Record<string, number>
  poseB: Record<string, number>
  active: PoseId
  view: StudioView
}

export type Band = {
  y: number
  h: number
  shift: number
  color: string
  highlight: string
}

export type SpecimenLayout = {
  width: number
  height: number
  fontSize: number
  lines: string[]
  centerX: number
  baselines: number[]
  textTop: number
  textHeight: number
  bands: Band[]
  variation: string
  family: string
  captionLeft: string
  captionRight: string
  empty: boolean
  foldLabel: string
}
