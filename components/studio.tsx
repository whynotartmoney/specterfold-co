"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { ControlPanel } from "@/components/control-panel"
import { SpecimenView } from "@/components/specimen-view"
import {
  defaultsFor,
  easeInOut,
  lerpAxes,
  poseFromFold,
  quantize,
  type FoldId,
} from "@/lib/axes"
import { getCatalogFont } from "@/lib/catalog"
import {
  canvasSupportsVariation,
  downloadBlob,
  drawSpecimen,
  embedFontCss,
  slugName,
} from "@/lib/export-specimen"
import { loadGoogleFont, loadLocalFont } from "@/lib/font-loader"
import { readSearchQuery, replacePoseUrl } from "@/lib/history-url"
import { specimenMarkup } from "@/lib/markup"
import { captionFor, hasCjk, layoutSpecimen, STAGE_H, STAGE_W } from "@/lib/specimen"
import type { LoadedFont, PoseId, SpecimenLayout, StudioState, StudioView } from "@/lib/types"
import { clampText, createState, encodeState } from "@/lib/url-state"

type Morph = { t: number; values: Record<string, number> } | null

const FALLBACK_FAMILY = "Palatino Linotype"

export function Studio({ syncUrl = true }: { syncUrl?: boolean }) {
  const initialSearch = useSyncExternalStore(subscribeNothing, clientSearch, serverSearch)
  const [state, setState] = useState<StudioState>(() => createState({}).state)
  const [notice, setNotice] = useState<string | null>(null)
  const [appliedSearch, setAppliedSearch] = useState("")
  if (appliedSearch !== initialSearch) {
    setAppliedSearch(initialSearch)
    if (initialSearch.length > 0) {
      const next = createState(readSearchQuery())
      setState(next.state)
      if (next.notice) setNotice(next.notice)
    }
  }
  const [loaded, setLoaded] = useState<LoadedFont | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [loadKey, setLoadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [morph, setMorph] = useState<Morph>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const canRecord = useSyncExternalStore(subscribeNothing, mediaRecorderSupported, () => false)
  const [layouts, setLayouts] = useState<{
    single: SpecimenLayout
    a: SpecimenLayout
    b: SpecimenLayout
  } | null>(null)
  const direction = useRef<"forward" | "back">("forward")
  const raf = useRef(0)
  const measure = useRef<HTMLCanvasElement | null>(null)

  const catalog = getCatalogFont(state.fontId === "local" ? "fraunces" : state.fontId)
  const axes = useMemo(() => {
    if (state.fontId === "local") {
      return loaded?.source === "local" ? loaded.axes : EMPTY_AXES
    }
    return getCatalogFont(state.fontId).axes
  }, [loaded, state.fontId])
  const shown = morph?.values ?? (state.active === "a" ? state.poseA : state.poseB)
  const familyLabel = loaded?.family ?? catalog.family
  const cssFamily = status === "ready" && loaded ? loaded.cssFamily : null

  useEffect(() => {
    if (!syncUrl || appliedSearch !== initialSearch) return
    const frame = requestAnimationFrame(() => {
      replacePoseUrl(`${window.location.pathname}?${encodeState(state)}`)
    })
    return () => cancelAnimationFrame(frame)
  }, [appliedSearch, initialSearch, state, syncUrl])

  useEffect(() => {
    if (state.fontId === "local") return
    const font = getCatalogFont(state.fontId)
    let cancel = false
    loadGoogleFont(font)
      .then((next) => {
        if (cancel) return
        setLoaded(next)
        setStatus("ready")
        setError(null)
      })
      .catch((reason: unknown) => {
        if (cancel) return
        setLoaded({
          id: font.id,
          family: font.family,
          cssFamily: FALLBACK_FAMILY,
          axes: font.axes,
          source: "google",
          staticFace: false,
        })
        setStatus("ready")
        setError(
          reason instanceof Error
            ? `${reason.message} Showing a fallback face so the lab can stay open.`
            : "Could not load that font. Showing a fallback face so the lab can stay open.",
        )
      })
    return () => {
      cancel = true
    }
  }, [loadKey, state.fontId])

  useEffect(() => {
    if (!cssFamily) return
    const canvas = measure.current ?? document.createElement("canvas")
    measure.current = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    try {
      const make = (values: Record<string, number>, pose: string) =>
        layoutSpecimen(ctx, {
          text: state.text,
          family: cssFamily,
          values,
          axes,
          captionLeft: captionFor(familyLabel, axes, values),
          captionRight: pose,
        })
      setLayouts({
        single: make(shown, morph ? "FOLD" : `POSE ${state.active.toUpperCase()}`),
        a: make(state.poseA, "POSE A"),
        b: make(state.poseB, "POSE B"),
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not draw that line.")
    }
  }, [axes, cssFamily, familyLabel, morph, shown, state.active, state.poseA, state.poseB, state.text])

  useEffect(() => {
    return () => cancelAnimationFrame(raf.current)
  }, [])

  function updatePose(tag: string, value: number) {
    if (morph || busy === "webm") return
    const axis = axes.find((item) => item.tag === tag)
    if (!axis) return
    const next = quantize(value, axis)
    setState((current) => {
      const key = current.active === "a" ? "poseA" : "poseB"
      if (current[key][tag] === next) return current
      return { ...current, [key]: { ...current[key], [tag]: next } }
    })
  }

  function selectFont(id: string) {
    if (id === state.fontId && status !== "error") return
    const font = getCatalogFont(id)
    cancelAnimationFrame(raf.current)
    setMorph(null)
    setStatus("loading")
    setError(null)
    setLoadKey((key) => key + 1)
    setState({
      fontId: font.id,
      text: state.text,
      poseA: poseFromFold(font.axes, "noon"),
      poseB: poseFromFold(font.axes, "hairline"),
      active: "a",
      view: state.view,
    })
  }

  async function upload(file: File) {
    cancelAnimationFrame(raf.current)
    setMorph(null)
    setStatus("loading")
    setError(null)
    setNotice(null)
    try {
      const next = await loadLocalFont(file)
      setLoaded(next)
      setStatus("ready")
      setState((current) => ({
        ...current,
        fontId: "local",
        poseA: next.axes.length ? poseFromFold(next.axes, "noon") : {},
        poseB: next.axes.length ? poseFromFold(next.axes, "hairline") : {},
        active: "a",
      }))
    } catch (reason) {
      setStatus("error")
      setError(reason instanceof Error ? reason.message : "Could not read that font.")
    }
  }

  function applyFold(id: FoldId) {
    if (!axes.length || morph) return
    setState((current) => {
      const key = current.active === "a" ? "poseA" : "poseB"
      return { ...current, [key]: poseFromFold(axes, id) }
    })
  }

  function play() {
    if (!axes.length || busy === "webm") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setState((current) => ({ ...current, active: current.active === "a" ? "b" : "a", view: "stage" }))
      setNotice("Motion is reduced, so the pose jumps instead of folding.")
      return
    }
    const forward = direction.current === "forward"
    direction.current = forward ? "back" : "forward"
    const from = forward ? state.poseA : state.poseB
    const to = forward ? state.poseB : state.poseA
    setState((current) => ({ ...current, view: "stage" }))
    let started = 0
    const step = (now: number) => {
      if (!started) started = now
      const raw = Math.min(1, (now - started) / 2200)
      setMorph({ t: raw, values: lerpAxes(from, to, easeInOut(raw), axes) })
      if (raw < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        setMorph(null)
        setState((current) => ({ ...current, active: forward ? "b" : "a" }))
      }
    }
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(step)
  }

  async function exportPng() {
    if (!layouts || !cssFamily) return
    setBusy("png")
    setError(null)
    try {
      const layout = layouts.single
      if (canvasSupportsVariation()) {
        const canvas = document.createElement("canvas")
        canvas.width = STAGE_W * 2
        canvas.height = STAGE_H * 2
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not open a canvas.")
        drawSpecimen(ctx, { ...layout, family: cssFamily }, 2)
        const blob = await blobFromCanvas(canvas)
        downloadBlob(blob, fileName("png"))
      } else {
        const markup = await exportMarkup(layout)
        downloadBlob(await rasterize(markup), fileName("png"))
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PNG export failed.")
    } finally {
      setBusy(null)
    }
  }

  async function exportSvg() {
    if (!layouts) return
    setBusy("svg")
    setError(null)
    try {
      const markup = await exportMarkup(layouts.single)
      downloadBlob(new Blob([markup], { type: "image/svg+xml" }), fileName("svg"))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "SVG export failed.")
    } finally {
      setBusy(null)
    }
  }

  async function exportWebm() {
    if (!cssFamily || !axes.length) return
    if (typeof MediaRecorder === "undefined") {
      setError("This browser cannot record WebM.")
      return
    }
    setBusy("webm")
    setError(null)
    setState((current) => ({ ...current, view: "stage" }))
    const canvas = document.createElement("canvas")
    canvas.width = STAGE_W
    canvas.height = STAGE_H
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setBusy(null)
      return
    }
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm"
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 5_000_000,
    })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    const stopped = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }))
    })
    const from = state.poseA
    const to = state.poseB
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const drawAt = (t: number) => {
      const values = lerpAxes(from, to, easeInOut(t), axes)
      const layout = layoutSpecimen(ctx, {
        text: state.text,
        family: cssFamily,
        values,
        axes,
        captionLeft: captionFor(familyLabel, axes, values),
        captionRight: "FOLD",
      })
      drawSpecimen(ctx, layout, 1)
      if (!reduced) setMorph({ t, values })
    }
    try {
      drawAt(0)
      recorder.start(100)
      await new Promise<void>((resolve) => {
        let started = 0
        const step = (now: number) => {
          if (!started) started = now
          const t = Math.min(1, (now - started) / 2400)
          drawAt(t)
          if (t < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
      recorder.stop()
      downloadBlob(await stopped, fileName("webm"))
      setMorph(null)
      setState((current) => ({ ...current, active: "b" }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "WebM export failed.")
      if (recorder.state !== "inactive") recorder.stop()
    } finally {
      setBusy(null)
    }
  }

  async function exportMarkup(layout: SpecimenLayout) {
    const css = await embedFontCss("Specimen", loaded?.faces, loaded?.buffer, loaded?.fileName)
    return specimenMarkup(
      { ...layout, family: "Specimen" },
      { embedCss: css, exportName: "Specimen", idPrefix: "export" },
    ).replace('width="100%" height="100%"', 'width="1400" height="860"')
  }

  function fileName(ext: string) {
    return `specterfold-${slugName(familyLabel)}.${ext}`
  }

  async function copyLink() {
    const href = `${window.location.origin}${window.location.pathname}?${encodeState(state)}`
    try {
      await navigator.clipboard.writeText(href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError("Could not copy the link. The address bar already holds this pose.")
    }
  }

  const label = state.text.trim() || "Empty stage"
  const single = layouts?.single

  return (
    <div className="lab">
      <header className="masthead">
        <div className="mast-id">
          <p className="eyebrow">OpenX · 03</p>
          <h1 className="wordmark">Specterfold</h1>
        </div>
      </header>

      <div
        className={dragOver ? "stage-wrap is-drag" : "stage-wrap"}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          const file = event.dataTransfer.files?.[0]
          if (file) void upload(file)
        }}
      >
        <div className="stage-meta">
          <span>{state.view === "compare" ? "Compare" : morph ? "Folding" : `Pose ${state.active.toUpperCase()}`}</span>
          <span>{single?.foldLabel ?? "Setting type"}</span>
        </div>
        <div className={status === "loading" ? "stage-frame is-loading" : "stage-frame"}>
          {state.view === "compare" && layouts ? (
            <div className="compare">
              <PoseFrame
                pose="a"
                active={state.active === "a"}
                layout={layouts.a}
                onPick={() => setState((current) => ({ ...current, active: "a" }))}
              />
              <PoseFrame
                pose="b"
                active={state.active === "b"}
                layout={layouts.b}
                onPick={() => setState((current) => ({ ...current, active: "b" }))}
              />
            </div>
          ) : single ? (
            <SpecimenView layout={single} label={label} />
          ) : (
            <div className="stage-pending">
              <p>Setting type…</p>
            </div>
          )}
        </div>
        {morph ? (
          <div className="morph-track" aria-hidden="true">
            <div style={{ width: `${morph.t * 100}%` }} />
          </div>
        ) : null}
        {dragOver ? <p className="drop-hint">Drop a .woff2 or .ttf</p> : null}
      </div>

      <ControlPanel
        fontId={state.fontId}
        text={state.text}
        axes={axes}
        values={shown}
        active={state.active}
        view={state.view}
        disabled={Boolean(morph) || busy === "webm"}
        status={status}
        error={error}
        notice={notice}
        localName={loaded?.source === "local" && state.fontId === "local" ? loaded.fileName ?? loaded.family : null}
        cjk={hasCjk(state.text)}
        staticFace={Boolean(loaded?.staticFace && state.fontId === "local")}
        copied={copied}
        busy={busy}
        canRecord={canRecord}
        onFont={selectFont}
        onUpload={(file) => void upload(file)}
        onText={(value) => setState((current) => ({ ...current, text: clampText(value) }))}
        onAxis={updatePose}
        onFold={applyFold}
        onActive={(pose: PoseId) => setState((current) => ({ ...current, active: pose }))}
        onView={(view: StudioView) => setState((current) => ({ ...current, view }))}
        onSwap={() =>
          setState((current) => ({ ...current, poseA: current.poseB, poseB: current.poseA }))
        }
        onSend={() =>
          setState((current) =>
            current.active === "a"
              ? { ...current, poseB: { ...current.poseA } }
              : { ...current, poseA: { ...current.poseB } },
          )
        }
        onDefaults={() => {
          if (!axes.length) return
          setState((current) => {
            const key = current.active === "a" ? "poseA" : "poseB"
            return { ...current, [key]: defaultsFor(axes) }
          })
        }}
        onPlay={play}
        onPng={() => void exportPng()}
        onSvg={() => void exportSvg()}
        onWebm={() => void exportWebm()}
        onCopy={() => void copyLink()}
        onDismissNotice={() => setNotice(null)}
      />
    </div>
  )
}

function PoseFrame({
  pose,
  active,
  layout,
  onPick,
}: {
  pose: PoseId
  active: boolean
  layout: SpecimenLayout
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? "pose-frame is-active" : "pose-frame"}
      onClick={onPick}
      aria-pressed={active}
    >
      <span className="pose-label">Pose {pose.toUpperCase()}{active ? " · editing" : ""}</span>
      <SpecimenView layout={layout} label={`Pose ${pose.toUpperCase()}`} />
    </button>
  )
}

const EMPTY_AXES: [] = []

function subscribeNothing() {
  return () => {}
}

let cachedSearch: string | null = null

function clientSearch() {
  // Freeze the first client read. Later pose writes update the address bar
  // and must not be pulled back in as a new snapshot.
  if (cachedSearch === null) cachedSearch = window.location.search
  return cachedSearch
}

function serverSearch() {
  return ""
}

function mediaRecorderSupported() {
  return typeof MediaRecorder !== "undefined"
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Could not encode PNG."))
    }, "image/png")
  })
}

function rasterize(markup: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = STAGE_W * 2
      canvas.height = STAGE_H * 2
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("Could not open a canvas."))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      blobFromCanvas(canvas).then(resolve, reject)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not rasterize the specimen."))
    }
    image.src = url
  })
}
