import assert from "node:assert/strict"
import test from "node:test"
import { readSfntTables } from "./parse-sfnt.ts"

function u16(n: number): Buffer {
  const b = Buffer.alloc(2)
  b.writeUInt16BE(n)
  return b
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n >>> 0)
  return b
}

function i32(n: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeInt32BE(n)
  return b
}

function utf16be(value: string): Buffer {
  const b = Buffer.alloc(value.length * 2)
  for (let i = 0; i < value.length; i++) b.writeUInt16BE(value.charCodeAt(i), i * 2)
  return b
}

function nameTable(): Buffer {
  const family = utf16be("Fold Test")
  const soft = utf16be("Softness")
  const strings = Buffer.concat([family, soft])
  const records = Buffer.concat([
    Buffer.concat([u16(3), u16(1), u16(0x409), u16(1), u16(family.length), u16(0)]),
    Buffer.concat([
      u16(3),
      u16(1),
      u16(0x409),
      u16(256),
      u16(soft.length),
      u16(family.length),
    ]),
  ])
  const header = Buffer.concat([u16(0), u16(2), u16(6 + records.length)])
  return Buffer.concat([header, records, strings])
}

function fvarTable(): Buffer {
  const header = Buffer.concat([
    u16(1),
    u16(0),
    u16(16),
    u16(0),
    u16(1),
    u16(20),
    u16(0),
    u16(0),
  ])
  const axis = Buffer.concat([
    Buffer.from("SOFT"),
    i32(0),
    i32(50 * 65536),
    i32(100 * 65536),
    u16(0),
    u16(256),
  ])
  return Buffer.concat([header, axis])
}

function sfnt(tables: Record<string, Buffer>): Buffer {
  const tags = Object.keys(tables).sort()
  const num = tags.length
  let offset = 12 + num * 16
  const directory: Buffer[] = [u32(0x00010000), u16(num), u16(0), u16(0), u16(0)]
  const blobs: Buffer[] = []
  for (const tag of tags) {
    const data = tables[tag]
    directory.push(Buffer.from(tag), u32(0), u32(offset), u32(data.length))
    blobs.push(data)
    offset += data.length
    const pad = (4 - (data.length % 4)) % 4
    if (pad) blobs.push(Buffer.alloc(pad))
    offset += pad
  }
  return Buffer.concat([...directory, ...blobs])
}

test("reads fvar axis name and range from an sfnt", async () => {
  const font = sfnt({ name: nameTable(), fvar: fvarTable() })
  const { parseFontBytes } = await import("./parse-sfnt.ts")
  const parsed = await parseFontBytes(
    font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength),
  )
  assert.equal(parsed.family, "Fold Test")
  assert.equal(parsed.axes.length, 1)
  assert.deepEqual(parsed.axes[0], {
    tag: "SOFT",
    name: "Softness",
    min: 0,
    max: 100,
    default: 50,
  })
})

test("sfnt directory exposes name and fvar", () => {
  const font = sfnt({ name: nameTable(), fvar: fvarTable() })
  const tables = readSfntTables(new Uint8Array(font))
  assert.ok(tables.has("name"))
  assert.ok(tables.has("fvar"))
})
