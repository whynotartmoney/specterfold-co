import type { SpecimenLayout } from "@/lib/types"

export function specimenMarkup(
  layout: SpecimenLayout,
  options: { embedCss?: string; exportName?: string; idPrefix?: string },
): string {
  const prefix = options.idPrefix ?? "sf"
  const family = options.exportName ?? layout.family
  const metaFamily = options.exportName
    ? "ui-monospace, monospace"
    : "var(--font-mono), ui-monospace, monospace"
  const zhFamily = options.exportName
    ? '"Songti TC", "Noto Serif TC", "WenQuanYi Micro Hei", serif'
    : '"Songti TC", "Noto Serif TC", "WenQuanYi Micro Hei", "Droid Sans Fallback", serif'
  const style = `
    .specimen { font-family: "${escapeAttr(family)}"; font-size: ${layout.fontSize}px; font-variation-settings: ${layout.variation || "normal"}; font-synthesis: none; white-space: pre; }
    .meta { font-family: ${metaFamily}; font-size: 13px; letter-spacing: 0.12em; }
    .zh { font-family: ${zhFamily}; font-size: 15px; letter-spacing: 0.08em; }
    ${options.embedCss ?? ""}
  `
  const lines = (shift: number, fill: string) =>
    layout.lines
      .map(
        (line, index) =>
          `<text class="specimen" x="${round(layout.centerX + shift)}" y="${round(layout.baselines[index])}" text-anchor="middle" fill="${fill}">${escapeXml(line)}</text>`,
      )
      .join("")

  const clips = layout.bands
    .map((band, index) => {
      const inset = Math.min(1.7, Math.max(0, band.h - 0.8))
      return `
        <clipPath id="${prefix}-pleat-${index}"><rect x="0" y="${round(band.y)}" width="${layout.width}" height="${round(band.h)}"/></clipPath>
        <clipPath id="${prefix}-ink-${index}"><rect x="0" y="${round(band.y + inset)}" width="${layout.width}" height="${round(Math.max(0.4, band.h - inset))}"/></clipPath>
      `
    })
    .join("")

  const pleats = layout.bands
    .map(
      (band, index) => `
        <g clip-path="url(#${prefix}-pleat-${index})">
          ${lines(band.shift, band.highlight)}
          <g clip-path="url(#${prefix}-ink-${index})">
            ${lines(band.shift, band.color)}
          </g>
        </g>
      `,
    )
    .join("")

  const ghost =
    layout.lines.length > 0
      ? `<g opacity="0.14">${lines(0, "#f3efe4")}</g>`
      : `
        <line x1="180" y1="430" x2="1220" y2="430" stroke="#f3efe4" stroke-opacity="0.4" stroke-width="1"/>
        <text class="meta" x="700" y="468" text-anchor="middle" fill="#c8c1b4">SET A LINE TO FOLD</text>
      `

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <title>Specterfold — ${escapeXml(layout.lines.join(" ") || "empty stage")}</title>
  <style>${style}</style>
  <rect width="100%" height="100%" fill="#0e0f0c"/>
  <line x1="92" y1="148" x2="390" y2="760" stroke="url(#${prefix}-beam)" stroke-width="1.6" opacity="0.8"/>
  <defs>
    <linearGradient id="${prefix}-beam" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="#e23922"/>
      <stop offset="0.48" stop-color="#e0a820"/>
      <stop offset="1" stop-color="#2076c4"/>
    </linearGradient>
    ${clips}
  </defs>
  ${cropMarks(layout.width, layout.height)}
  <text class="meta" x="48" y="58" fill="#e23b22">OPENX 03</text>
  ${ghost}
  ${pleats}
  <text class="meta" x="48" y="${layout.height - 36}" fill="#c8c1b4">${escapeXml(layout.captionLeft)}</text>
  <text class="zh" x="${layout.width - 48}" y="${layout.height - 36}" text-anchor="end" fill="#f3efe4">${escapeXml(layout.captionRight)}</text>
</svg>`
}

function cropMarks(width: number, height: number): string {
  const inset = 26
  const len = 16
  const color = "rgba(243,239,228,0.78)"
  const corners = [
    [inset, inset, 1, 1],
    [width - inset, inset, -1, 1],
    [inset, height - inset, 1, -1],
    [width - inset, height - inset, -1, -1],
  ]
  return corners
    .map(([x, y, sx, sy]) => {
      return `<path d="M${x} ${y} H${x + len * sx} M${x} ${y} V${y + len * sy}" fill="none" stroke="${color}" stroke-width="1"/>`
    })
    .join("")
}

function round(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")
}
