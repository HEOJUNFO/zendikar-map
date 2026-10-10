import { on } from 'node:events'

/** 상태가 달라졌다는 실제 통지로만 기다린다. timer 는 무신호 실패의 상한이다. */
export async function waitForState(events, predicate, timeout, message) {
  if (predicate()) return
  const controller = new AbortController()
  const deadline = setTimeout(() => controller.abort(), timeout)
  try {
    for await (const _ of on(events, 'change', { signal: controller.signal })) {
      if (predicate()) return
    }
  } catch (error) {
    if (controller.signal.aborted) throw new Error(message)
    throw error
  } finally {
    clearTimeout(deadline)
  }
}
