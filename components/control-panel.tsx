"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { FOLDS, axisStep, formatAxis, type FoldId } from "@/lib/axes"
import { CATALOG, SAMPLES, splitAxes } from "@/lib/catalog"
import type { AxisDef } from "@/lib/types"
import type { PoseId, StudioView } from "@/lib/types"

const labButton =
  "h-9 rounded-none border border-[#161513]/25 bg-transparent px-2.5 font-mono text-[11px] tracking-[0.14em] text-[#161513] uppercase shadow-none hover:border-[#161513] hover:bg-[#161513] hover:text-white"

const SUPPORT_URL = "https://buymeacoffee.com/whynotartmoney"

type PanelProps = {
  fontId: string
  text: string
  axes: AxisDef[]
  values: Record<string, number>
  active: PoseId
  view: StudioView
  disabled: boolean
  status: "loading" | "ready" | "error"
  error: string | null
  notice: string | null
  localName: string | null
  cjk: boolean
  staticFace: boolean
  copied: boolean
  busy: string | null
  canRecord: boolean
  onFont: (id: string) => void
  onUpload: (file: File) => void
  onText: (value: string) => void
  onAxis: (tag: string, value: number) => void
  onFold: (id: FoldId) => void
  onActive: (pose: PoseId) => void
  onView: (view: StudioView) => void
  onSwap: () => void
  onSend: () => void
  onDefaults: () => void
  onPlay: () => void
  onPng: () => void
  onSvg: () => void
  onWebm: () => void
  onCopy: () => void
  onDismissNotice: () => void
}

export function ControlPanel(props: PanelProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { main, parametric } = splitAxes(props.axes)

  return (
    <aside className="panel">
      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>01</span> Font
          </h2>
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={() => fileRef.current?.click()}
          >
            Upload
          </Button>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) props.onUpload(file)
            }}
          />
        </div>
        <ul className="font-list">
          {CATALOG.map((font) => {
            const selected = props.fontId === font.id
            return (
              <li key={font.id}>
                <button
                  type="button"
                  className={selected ? "font-row is-active" : "font-row"}
                  onClick={() => props.onFont(font.id)}
                  aria-pressed={selected}
                >
                  <span className="font-name">{font.family}</span>
                  <span className="font-note">{font.note}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {props.localName ? (
          <p className="note">
            Local file {props.localName}. The link keeps the line and the axes; the
            file stays in this browser.
          </p>
        ) : null}
        {props.status === "loading" ? <p className="note">Loading the face…</p> : null}
        {props.error ? (
          <p className="note is-alert" role="alert">
            {props.error}
          </p>
        ) : null}
        {props.notice ? (
          <p className="note">
            {props.notice}{" "}
            <button type="button" className="text-button" onClick={props.onDismissNotice}>
              Dismiss
            </button>
          </p>
        ) : null}
        {props.staticFace ? (
          <p className="note">
            This face has no variation axes. It sits on the stage as a proof, not a fold.
          </p>
        ) : null}
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>02</span> Line
          </h2>
        </div>
        <Textarea
          value={props.text}
          maxLength={240}
          aria-label="Specimen text"
          className="specimen-input min-h-24 rounded-none border-[#161513]/25 bg-transparent px-3 py-2 font-sans text-[1.2rem] leading-snug shadow-none focus-visible:border-[#e23b22] focus-visible:ring-[#e23b22]/30"
          onChange={(event) => props.onText(event.target.value)}
        />
        <ul className="sample-list">
          {SAMPLES.map((sample, index) => (
            <li key={sample.id}>
              <button
                type="button"
                className={props.text === sample.text ? "sample is-active" : "sample"}
                onClick={() => props.onText(sample.text)}
              >
                <span>0{index + 1}</span>
                {sample.label}
              </button>
            </li>
          ))}
        </ul>
        {props.cjk ? (
          <p className="note">
            These Latin faces have no CJK glyphs. The line will show gaps unless you
            upload a face that covers them.
          </p>
        ) : null}
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>03</span> Folds
          </h2>
        </div>
        <div className="fold-list">
          {FOLDS.map((fold) => (
            <button
              key={fold.id}
              type="button"
              className="fold"
              onClick={() => props.onFold(fold.id)}
            >
              <span className="fold-name">
                {fold.name}
                <i>{fold.gloss}</i>
              </span>
              <span className="fold-blurb">{fold.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>04</span> Axes
          </h2>
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={props.onDefaults}
            disabled={props.disabled || props.axes.length === 0}
          >
            Defaults
          </Button>
        </div>
        <p className="note">
          Editing pose {props.active.toUpperCase()}. Weight sets the pleat count.
          Width — or optical size, when there is no width — sets the throw.
        </p>
        {props.axes.length === 0 ? (
          <p className="note">No axes on this face.</p>
        ) : (
          <div className="axis-list">
            {main.map((axis) => (
              <AxisRow
                key={axis.tag}
                axis={axis}
                value={props.values[axis.tag] ?? axis.default}
                disabled={props.disabled}
                onAxis={props.onAxis}
              />
            ))}
            {parametric.length > 0 ? (
              <details className="parametric">
                <summary>Parametric axes</summary>
                {parametric.map((axis) => (
                  <AxisRow
                    key={axis.tag}
                    axis={axis}
                    value={props.values[axis.tag] ?? axis.default}
                    disabled={props.disabled}
                    onAxis={props.onAxis}
                  />
                ))}
              </details>
            ) : null}
          </div>
        )}
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>05</span> Poses
          </h2>
        </div>
        <div className="pose-row">
          {(["a", "b"] as const).map((pose) => (
            <Button
              key={pose}
              type="button"
              variant="outline"
              aria-pressed={props.active === pose}
              className={props.active === pose ? `${labButton} is-filled` : labButton}
              onClick={() => props.onActive(pose)}
            >
              Pose {pose.toUpperCase()}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={() => props.onView(props.view === "compare" ? "stage" : "compare")}
          >
            {props.view === "compare" ? "Single" : "Compare"}
          </Button>
        </div>
        <div className="pose-row">
          <Button type="button" variant="outline" className={labButton} onClick={props.onSwap}>
            Swap
          </Button>
          <Button type="button" variant="outline" className={labButton} onClick={props.onSend}>
            Send to {props.active === "a" ? "B" : "A"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={props.onPlay}
            disabled={props.disabled || props.axes.length === 0}
          >
            Play A→B
          </Button>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-head">
          <h2>
            <span>06</span> Export
          </h2>
        </div>
        <div className="pose-row">
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={props.onPng}
            disabled={props.busy !== null || props.status !== "ready"}
          >
            {props.busy === "png" ? "PNG…" : "PNG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={props.onSvg}
            disabled={props.busy !== null || props.status !== "ready"}
          >
            {props.busy === "svg" ? "SVG…" : "SVG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={labButton}
            onClick={props.onWebm}
            disabled={!props.canRecord || props.busy !== null || props.status !== "ready" || props.axes.length === 0}
          >
            {props.busy === "webm" ? "WebM…" : "WebM"}
          </Button>
          <Button type="button" variant="outline" className={labButton} onClick={props.onCopy}>
            {props.copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </section>

      <footer className="colophon">
        <p>Specterfold · OpenX series 03</p>
        <span className="colophon-links">
          <Dialog>
            <DialogTrigger
              render={
                <button type="button" className="text-button">
                  Colophon
                </button>
              }
            />
            <DialogContent className="colophon-dialog rounded-none border border-[#161513] bg-white p-6 text-[#161513] ring-0 sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Type, folded in light</DialogTitle>
                <DialogDescription>
                  Specterfold is OpenX series 03, an open instrument for variable type.
                </DialogDescription>
              </DialogHeader>
              <div className="colophon-body">
                <p>
                  The stage cuts a line into horizontal pleats. Weight decides how many.
                  Width, or optical size when a face has no width axis, decides how far
                  they throw. Slant shears the stack. Custom axes rotate the spectrum.
                </p>
                <p>
                  Google faces are requested through this app and served by Google Fonts.
                  A file you upload is parsed here and is not sent anywhere.
                </p>
                <p>
                  MIT license. A hosted Pro bench — saved libraries, shared rooms — can
                  come later. This one is the open lab.
                </p>
                <p>
                  Support the open lab:{" "}
                  <a href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                    buy me a coffee
                  </a>
                  .
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <a className="text-button" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            Buy me a coffee
          </a>
        </span>
      </footer>
    </aside>
  )
}

function AxisRow({
  axis,
  value,
  disabled,
  onAxis,
}: {
  axis: AxisDef
  value: number
  disabled: boolean
  onAxis: (tag: string, value: number) => void
}) {
  const step = axisStep(axis)
  return (
    <label className="axis">
      <span className="axis-top">
        <span className="axis-tag">{axis.tag}</span>
        <span className="axis-name">{axis.name}</span>
        <Input
          className="axis-num h-7 w-[4.6rem] rounded-none border-[#161513]/25 bg-transparent px-1 text-right font-mono text-[12px] tabular-nums shadow-none focus-visible:border-[#e23b22] focus-visible:ring-[#e23b22]/30"
          type="number"
          inputMode="decimal"
          min={axis.min}
          max={axis.max}
          step={step}
          value={formatAxis(value)}
          disabled={disabled}
          aria-label={`${axis.name} value`}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onAxis(axis.tag, next)
          }}
        />
      </span>
      <Slider
        min={axis.min}
        max={axis.max}
        step={step}
        value={[value]}
        disabled={disabled}
        aria-label={axis.name}
        onValueChange={(next) => {
          const resolved = Array.isArray(next) ? next[0] : next
          if (typeof resolved === "number") onAxis(axis.tag, resolved)
        }}
      />
      <span className="axis-ends">
        <span>{formatAxis(axis.min)}</span>
        <span>{formatAxis(axis.max)}</span>
      </span>
    </label>
  )
}
