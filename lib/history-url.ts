export type SearchRecord = Record<string, string | string[] | undefined>

// Captured when this module evaluates, which is before Next's App Router
// effect patches history.replaceState. Pose sync must call this native
// method: the patch treats an external query write as a history restore and
// refetches the Flight stream for the new search params.
const nativeReplaceState: History["replaceState"] | null =
  typeof window === "undefined" ? null : window.history.replaceState.bind(window.history)

export function readSearchQuery(): SearchRecord {
  if (typeof window === "undefined") return {}
  const params = new URLSearchParams(window.location.search)
  const query: SearchRecord = {}
  params.forEach((value, key) => {
    const current = query[key]
    if (current === undefined) query[key] = value
    else if (Array.isArray(current)) current.push(value)
    else query[key] = [current, value]
  })
  return query
}

export function writePoseUrl(
  replaceState: History["replaceState"] | null,
  next: string,
  location: { pathname: string; search: string },
  historyState: unknown,
): void {
  if (!replaceState) return
  try {
    const current = `${location.pathname}${location.search}`
    if (current === next) return
    replaceState(historyState, "", next)
  } catch {
    // A failed clone must not escape the effect. React reports commit-phase
    // throws to the root error boundary, which replaces the lab.
  }
}

export function replacePoseUrl(next: string): void {
  if (typeof window === "undefined") return
  // Keep the router entry (__NA and the flight tree) so back/forward still
  // belong to Next, but do not notify the patched method.
  writePoseUrl(nativeReplaceState, next, window.location, window.history.state)
}
