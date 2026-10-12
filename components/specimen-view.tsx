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
  const markup = specimenMarkup(layout, { idPrefix: prefix })
  return (
    <div
      className="specimen-view"
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
