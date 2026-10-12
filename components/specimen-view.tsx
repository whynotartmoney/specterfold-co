"use client"

import { useId } from "react"
import { specimenMarkup } from "@/lib/markup"
import type { SpecimenLayout } from "@/lib/types"

export function SpecimenView({
  layout,
  label,
}: {
  layout: SpecimenLayout
  label: string
}) {
  const prefix = useId().replaceAll(":", "")
  let markup: string
  try {
    markup = specimenMarkup(layout, { idPrefix: prefix })
  } catch {
    return (
      <div className="stage-pending">
        <p>Could not draw that line.</p>
      </div>
    )
  }
  return (
    <div
      className="specimen-view"
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
