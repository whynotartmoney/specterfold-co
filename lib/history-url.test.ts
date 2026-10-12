import assert from "node:assert/strict"
import test from "node:test"
import { writePoseUrl } from "./history-url.ts"

test("pose URL writes call the captured history method, not the patched one", () => {
  const calls: Array<{ via: string; state: unknown; url: unknown }> = []
  const historyState = { __NA: true, tree: { id: "page" } }
  const native: History["replaceState"] = (state, _title, url) => {
    calls.push({ via: "native", state, url })
  }
  const patched: History["replaceState"] = (state, _title, url) => {
    calls.push({ via: "patched", state, url })
  }
  const location = { pathname: "/", search: "" }
  writePoseUrl(native, "/?f=fraunces&t=Specterfold", location, historyState)
  patched(null, "", "/?ignored=1")

  assert.deepEqual(
    calls.filter((call) => call.via === "native"),
    [{ via: "native", state: historyState, url: "/?f=fraunces&t=Specterfold" }],
  )
  assert.equal(calls.some((call) => call.via === "patched" && String(call.url).includes("fraunces")), false)
})

test("an unchanged pose URL is not written again", () => {
  let calls = 0
  const replaceState: History["replaceState"] = () => {
    calls += 1
  }
  writePoseUrl(replaceState, "/?f=fraunces", { pathname: "/", search: "?f=fraunces" }, null)
  assert.equal(calls, 0)
})

test("a history clone failure does not escape the pose write", () => {
  const replaceState: History["replaceState"] = () => {
    throw new Error("DataCloneError")
  }
  assert.doesNotThrow(() =>
    writePoseUrl(replaceState, "/?f=fraunces", { pathname: "/", search: "" }, { __NA: true }),
  )
})
