import { getCatalogFont, googleFontSpec } from "@/lib/catalog"
import { NextResponse } from "next/server"

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? ""
  const font = getCatalogFont(id)
  if (font.id !== id) {
    return NextResponse.json({ error: "Unknown font." }, { status: 404 })
  }
  const family = encodeURIComponent(font.family).replaceAll("%20", "+")
  const spec = googleFontSpec(font)
  const upstream = `https://fonts.googleapis.com/css2?family=${family}:${spec}&display=swap`
  const css = await fetch(upstream, {
    headers: { "User-Agent": CHROME_UA },
    next: { revalidate: 86400 },
  })
  if (!css.ok) {
    return NextResponse.json({ error: "Font CSS failed." }, { status: 502 })
  }
  return new NextResponse(await css.text(), {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  })
}
