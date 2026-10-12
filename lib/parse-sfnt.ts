import type { AxisDef } from "@/lib/types"

const AXIS_NAMES: Record<string, string> = {
  wght: "Weight",
  wdth: "Width",
  opsz: "Optical size",
  slnt: "Slant",
  ital: "Italic",
  SOFT: "Softness",
  WONK: "Wonk",
  GRAD: "Grade",
  CASL: "Casual",
  CRSV: "Cursive",
  MONO: "Monospace",
  FLAR: "Flare",
  VOLM: "Volume",
  YEAR: "Year",
  XOPQ: "Thick stroke",
  XTRA: "Counter width",
  YOPQ: "Thin stroke",
  YTAS: "Ascender",
  YTDE: "Descender",
  YTFI: "Figure height",
  YTLC: "Lowercase",
  YTUC: "Uppercase",
  ELGR: "Element grid",
  ELSH: "Element shape",
  EHLT: "Element height",
}

export type ParsedFont = {
  family: string
  axes: AxisDef[]
}

export async function parseFontBytes(data: ArrayBuffer): Promise<ParsedFont> {
  const bytes = new Uint8Array(data)
  if (bytes.length < 12) {
    throw new Error("That file is too small to be a font.")
  }
  const tag = readTag(bytes, 0)
  const tables =
    tag === "wOFF"
      ? await readWoffTables(bytes)
      : tag === "wOF2"
        ? await readWoff2Tables(bytes)
        : readSfntTables(bytes)

  const nameTable = tables.get("name")
  if (!nameTable) {
    throw new Error("This font has no name table.")
  }
  const names = parseNameTable(nameTable)
  const family = names.get(16) || names.get(1) || "Uploaded font"
  const fvar = tables.get("fvar")
  const axes = fvar ? parseFvar(fvar, names) : []
  return { family, axes }
}

export function readSfntTables(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = viewOf(bytes)
  const scalar = view.getUint32(0)
  const tag = readTag(bytes, 0)
  const isSfnt =
    scalar === 0x00010000 || tag === "OTTO" || tag === "true" || tag === "typ1"
  if (!isSfnt) {
    throw new Error("Use a .woff2, .woff, .ttf, or .otf variable font.")
  }
  const numTables = view.getUint16(4)
  const tables = new Map<string, Uint8Array>()
  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16
    const tableTag = readTag(bytes, offset)
    const start = view.getUint32(offset + 8)
    const length = view.getUint32(offset + 12)
    tables.set(tableTag, bytes.subarray(start, start + length))
  }
  return tables
}

async function readWoffTables(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = viewOf(bytes)
  const numTables = view.getUint16(12)
  const tables = new Map<string, Uint8Array>()
  let cursor = 44
  for (let i = 0; i < numTables; i++) {
    const tableTag = readTag(bytes, cursor)
    const offset = view.getUint32(cursor + 4)
    const compLength = view.getUint32(cursor + 8)
    const origLength = view.getUint32(cursor + 12)
    cursor += 20
    const slice = bytes.subarray(offset, offset + compLength)
    const data = compLength < origLength ? await inflateZlib(slice) : copyBytes(slice)
    if (data.length < origLength) {
      throw new Error(`Could not decompress the ${tableTag} table.`)
    }
    tables.set(tableTag, data.subarray(0, origLength))
  }
  return tables
}

const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post",
  "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT",
  "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea",
  "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH",
  "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar",
  "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar",
  "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop",
  "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
]

async function readWoff2Tables(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = viewOf(bytes)
  if (view.getUint32(4) === 0x74746366) {
    throw new Error("Font collections are not supported. Upload a single font file.")
  }
  const numTables = view.getUint16(12)
  const totalCompressedSize = view.getUint32(20)
  let offset = 48
  const entries: { tag: string; streamLength: number; keep: boolean }[] = []
  for (let i = 0; i < numTables; i++) {
    const flags = bytes[offset++]
    const index = flags & 63
    const version = flags >> 6
    let tag: string
    if (index === 63) {
      tag = readTag(bytes, offset)
      offset += 4
    } else {
      tag = KNOWN_TAGS[index] ?? "unk "
    }
    const orig = readBase128(bytes, offset)
    offset = orig.offset
    const nullTransform = tag === "glyf" || tag === "loca" ? version === 3 : version === 0
    let streamLength = orig.value
    if (!nullTransform) {
      const transformed = readBase128(bytes, offset)
      offset = transformed.offset
      streamLength = tag === "loca" ? 0 : transformed.value
    }
    entries.push({ tag, streamLength, keep: nullTransform && streamLength > 0 })
  }
  const compressed = bytes.subarray(offset, offset + totalCompressedSize)
  const expected = entries.reduce((sum, entry) => sum + entry.streamLength, 0)
  const { decompress } = await import("brotli/decompress")
  const decoded = decompress(compressed, expected)
  if (!decoded || decoded.length < expected) {
    throw new Error("Could not decompress that WOFF2 file.")
  }
  const tables = new Map<string, Uint8Array>()
  let cursor = 0
  for (const entry of entries) {
    if (entry.keep) {
      tables.set(entry.tag, decoded.subarray(cursor, cursor + entry.streamLength))
    }
    cursor += entry.streamLength
  }
  return tables
}

function readBase128(bytes: Uint8Array, offset: number): { value: number; offset: number } {
  let result = 0
  for (let i = 0; i < 5; i++) {
    const byte = bytes[offset++]
    if (byte === undefined) throw new Error("Truncated WOFF2 directory.")
    if (result > 0x1ffffff) throw new Error("Invalid WOFF2 length.")
    result = (result << 7) | (byte & 0x7f)
    if ((byte & 0x80) === 0) return { value: result >>> 0, offset }
  }
  throw new Error("Invalid WOFF2 length.")
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read WOFF. Upload a .woff2 or .ttf.")
  }
  const stream = new Blob([copyBytes(data).buffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

function copyBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(data.byteLength))
  copy.set(data)
  return copy
}

function parseFvar(table: Uint8Array, names: Map<number, string>): AxisDef[] {
  const view = viewOf(table)
  if (table.length < 16) return []
  const axesArrayOffset = view.getUint16(4)
  const axisCount = view.getUint16(8)
  const axisSize = view.getUint16(10) || 20
  const axes: AxisDef[] = []
  for (let i = 0; i < axisCount; i++) {
    const offset = axesArrayOffset + i * axisSize
    if (offset + 20 > table.length) break
    const tag = readTag(table, offset)
    const min = tidy(view.getInt32(offset + 4) / 65536)
    const def = tidy(view.getInt32(offset + 8) / 65536)
    const max = tidy(view.getInt32(offset + 12) / 65536)
    const nameID = view.getUint16(offset + 18)
    if (!(max > min)) continue
    axes.push({
      tag,
      name: cleanName(names.get(nameID) || AXIS_NAMES[tag] || tag),
      min,
      max,
      default: clamp(def, min, max),
    })
  }
  return axes
}

function parseNameTable(table: Uint8Array): Map<number, string> {
  const view = viewOf(table)
  const count = view.getUint16(2)
  const stringOffset = view.getUint16(4)
  const best = new Map<number, { priority: number; value: string }>()
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 12
    if (offset + 12 > table.length) break
    const platformID = view.getUint16(offset)
    const encodingID = view.getUint16(offset + 2)
    const languageID = view.getUint16(offset + 4)
    const nameID = view.getUint16(offset + 6)
    const length = view.getUint16(offset + 8)
    const rel = view.getUint16(offset + 10)
    const start = stringOffset + rel
    const slice = table.subarray(start, start + length)
    let value = ""
    let priority = 0
    if (platformID === 3 && (encodingID === 1 || encodingID === 10)) {
      value = decodeUtf16BE(slice)
      priority = languageID === 0x409 ? 4 : 3
    } else if (platformID === 0) {
      value = decodeUtf16BE(slice)
      priority = 2
    } else if (platformID === 1) {
      value = decodeLatin1(slice)
      priority = 1
    }
    value = value.replace(/\0/g, "").trim()
    if (!value) continue
    const prev = best.get(nameID)
    if (!prev || priority >= prev.priority) {
      best.set(nameID, { priority, value })
    }
  }
  return new Map([...best].map(([id, entry]) => [id, entry.value]))
}

function decodeUtf16BE(bytes: Uint8Array): string {
  const codes: number[] = []
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    codes.push((bytes[i] << 8) | bytes[i + 1])
  }
  return String.fromCharCode(...codes)
}

function decodeLatin1(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes)
}

function readTag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  )
}

function viewOf(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function tidy(n: number): number {
  return Math.round(n * 1000) / 1000
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim()
}
