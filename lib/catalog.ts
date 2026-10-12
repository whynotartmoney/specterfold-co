import type { AxisDef, CatalogFont } from "@/lib/types"

const REGISTERED = ["ital", "opsz", "slnt", "wdth", "wght"] as const

function axis(
  tag: string,
  name: string,
  min: number,
  max: number,
  def: number,
): AxisDef {
  return { tag, name, min, max, default: def }
}

export const CATALOG: CatalogFont[] = [
  {
    id: "fraunces",
    family: "Fraunces",
    category: "serif",
    note: "Soft serif. Wonk bends the terminals.",
    axes: [
      axis("opsz", "Optical size", 9, 144, 9),
      axis("wght", "Weight", 100, 900, 900),
      axis("SOFT", "Softness", 0, 100, 0),
      axis("WONK", "Wonk", 0, 1, 1),
    ],
  },
  {
    id: "bodoni-moda",
    family: "Bodoni Moda",
    category: "serif",
    note: "High contrast. Optical size opens the hairline.",
    axes: [
      axis("opsz", "Optical size", 6, 96, 11),
      axis("wght", "Weight", 400, 900, 400),
    ],
  },
  {
    id: "newsreader",
    family: "Newsreader",
    category: "serif",
    note: "Editorial serif, from text to display.",
    axes: [
      axis("opsz", "Optical size", 6, 72, 18),
      axis("wght", "Weight", 200, 800, 400),
    ],
  },
  {
    id: "literata",
    family: "Literata",
    category: "serif",
    note: "Book serif with a wide weight range.",
    axes: [
      axis("opsz", "Optical size", 7, 72, 12),
      axis("wght", "Weight", 200, 900, 400),
    ],
  },
  {
    id: "source-serif-4",
    family: "Source Serif 4",
    category: "serif",
    note: "Old-style serif. Quiet optical size.",
    axes: [
      axis("opsz", "Optical size", 8, 60, 20),
      axis("wght", "Weight", 200, 900, 400),
    ],
  },
  {
    id: "bricolage-grotesque",
    family: "Bricolage Grotesque",
    category: "sans",
    note: "Grotesque with width and optical size.",
    axes: [
      axis("opsz", "Optical size", 12, 96, 96),
      axis("wdth", "Width", 75, 100, 100),
      axis("wght", "Weight", 200, 800, 800),
    ],
  },
  {
    id: "anybody",
    family: "Anybody",
    category: "sans",
    note: "Width from condensed to ultra-extended.",
    axes: [
      axis("wdth", "Width", 50, 150, 100),
      axis("wght", "Weight", 100, 900, 100),
    ],
  },
  {
    id: "recursive",
    family: "Recursive",
    category: "sans",
    note: "Casual, mono, and slant in one face.",
    axes: [
      axis("slnt", "Slant", -15, 0, 0),
      axis("wght", "Weight", 300, 1000, 300),
      axis("CASL", "Casual", 0, 1, 0),
      axis("CRSV", "Cursive", 0, 1, 0.5),
      axis("MONO", "Monospace", 0, 1, 0),
    ],
  },
  {
    id: "roboto-flex",
    family: "Roboto Flex",
    category: "sans",
    note: "Parametric sans. Grade, slant, every stroke.",
    axes: [
      axis("opsz", "Optical size", 8, 144, 14),
      axis("slnt", "Slant", -10, 0, 0),
      axis("wdth", "Width", 25, 151, 100),
      axis("wght", "Weight", 100, 1000, 400),
      axis("GRAD", "Grade", -200, 150, 0),
      axis("XOPQ", "Thick stroke", 27, 175, 96),
      axis("XTRA", "Counter width", 323, 603, 468),
      axis("YOPQ", "Thin stroke", 25, 135, 79),
      axis("YTAS", "Ascender", 649, 854, 750),
      axis("YTDE", "Descender", -305, -98, -203),
      axis("YTFI", "Figure height", 560, 788, 738),
      axis("YTLC", "Lowercase", 416, 570, 514),
      axis("YTUC", "Uppercase", 528, 760, 712),
    ],
  },
  {
    id: "commissioner",
    family: "Commissioner",
    category: "sans",
    note: "Flared grotesque. Volume thickens the flare.",
    axes: [
      axis("slnt", "Slant", -12, 0, 0),
      axis("wght", "Weight", 100, 900, 100),
      axis("FLAR", "Flare", 0, 100, 0),
      axis("VOLM", "Volume", 0, 100, 0),
    ],
  },
  {
    id: "climate-crisis",
    family: "Climate Crisis",
    category: "display",
    note: "One axis, 1979–2050. The letters weather.",
    axes: [axis("YEAR", "Year", 1979, 2050, 1979)],
  },
  {
    id: "handjet",
    family: "Handjet",
    category: "display",
    note: "Strokes replaced by a grid of elements.",
    axes: [
      axis("wght", "Weight", 100, 900, 400),
      axis("ELGR", "Element grid", 1, 2, 1),
      axis("ELSH", "Element shape", 0, 16, 2),
    ],
  },
]

export const SAMPLES = [
  { id: "name", label: "Specterfold", text: "Specterfold" },
  { id: "tag", label: "Folded in light", text: "Type, folded in light" },
  { id: "fit", label: "Hamburgefontsiv", text: "Hamburgefontsiv" },
  { id: "alpha", label: "Alphabet", text: "Aa Bb Cc" },
  { id: "zh", label: "摺進光裡的字", text: "摺進光裡的字" },
] as const

export function getCatalogFont(id: string | null | undefined): CatalogFont {
  return CATALOG.find((font) => font.id === id) ?? CATALOG[0]
}

export function googleFontSpec(font: CatalogFont): string {
  const registered = font.axes
    .filter((item) => (REGISTERED as readonly string[]).includes(item.tag))
    .sort((a, b) => a.tag.localeCompare(b.tag))
  const custom = font.axes
    .filter((item) => !(REGISTERED as readonly string[]).includes(item.tag))
    .sort((a, b) => a.tag.localeCompare(b.tag))
  const axes = [...registered, ...custom]
  const tags = axes.map((item) => item.tag).join(",")
  const ranges = axes.map((item) => `${trimNum(item.min)}..${trimNum(item.max)}`).join(",")
  return `${tags}@${ranges}`
}

export function trimNum(n: number): string {
  if (!Number.isFinite(n)) return "0"
  const rounded = Math.round(n * 1000) / 1000
  return String(rounded)
}

const PARAMETRIC = new Set([
  "XOPQ",
  "XTRA",
  "YOPQ",
  "YTAS",
  "YTDE",
  "YTFI",
  "YTLC",
  "YTUC",
])

export function splitAxes(axes: AxisDef[]): { main: AxisDef[]; parametric: AxisDef[] } {
  if (axes.length <= 8) return { main: axes, parametric: [] }
  return {
    main: axes.filter((axis) => !PARAMETRIC.has(axis.tag)),
    parametric: axes.filter((axis) => PARAMETRIC.has(axis.tag)),
  }
}
