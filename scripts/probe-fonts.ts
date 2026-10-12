import { parseFontBytes } from "../lib/parse-sfnt.ts"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const fonts: Record<string, string> = {
  Fraunces: "opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1",
  "Bodoni Moda": "opsz,wght@6..96,400..900",
  Newsreader: "opsz,wght@6..72,200..800",
  Literata: "opsz,wght@7..72,200..900",
  "Source Serif 4": "opsz,wght@8..60,200..900",
  "Bricolage Grotesque": "opsz,wdth,wght@12..96,75..100,200..800",
  Anybody: "wdth,wght@50..150,100..900",
  Recursive: "CASL,CRSV,MONO,slnt,wght@0..1,0..1,0..1,-15..0,300..1000",
  "Roboto Flex":
    "opsz,slnt,wdth,wght,GRAD,XOPQ,XTRA,YOPQ,YTAS,YTDE,YTFI,YTLC,YTUC@8..144,-10..0,25..151,100..1000,-200..150,27..175,323..603,25..135,649..854,-305..-98,560..788,416..570,528..760",
  Commissioner: "FLAR,VOLM,slnt,wght@0..100,0..100,-10..0,100..900",
  "Climate Crisis": "YEAR@1979..2050",
  Handjet: "ELGR,ELSH,wght@1..2,0..16,100..900",
}

async function main() {
  for (const [family, spec] of Object.entries(fonts)) {
    const familyParam = family.replaceAll(" ", "+")
    const url = `https://fonts.googleapis.com/css2?family=${familyParam}:${spec}&display=swap`
    try {
      const cssRes = await fetch(url, { headers: { "User-Agent": UA } })
      if (!cssRes.ok) {
        console.log(`FAIL ${family} css ${cssRes.status}`)
        continue
      }
      const css = await cssRes.text()
      const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) =>
        m[1].replaceAll(/['"]/g, ""),
      )
      const fileUrl = urls.at(-1)
      if (!fileUrl) {
        console.log(`FAIL ${family} no url`)
        continue
      }
      const buf = await fetch(fileUrl).then((r) => r.arrayBuffer())
      const parsed = await parseFontBytes(buf)
      const axes = parsed.axes
        .map((a) => `${a.tag} ${a.min}..${a.max} def ${a.default} (${a.name})`)
        .join(" | ")
      console.log(`OK ${family} bytes=${buf.byteLength} faces=${urls.length}\n  ${axes || "NO AXES"}`)
    } catch (error) {
      console.log(`FAIL ${family} ${error instanceof Error ? error.message : error}`)
    }
  }
}

await main()
