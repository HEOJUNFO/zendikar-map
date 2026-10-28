import type { FigureArt } from './figures'

/** Keep each imported group once; publish completed batches without copying its paths. */
export class FigureArtStore {
  private readonly groups = new Map<string, Readonly<Record<string, FigureArt>>>()
  /** id → art from whichever group delivered it first (timeline views load a figure from a per-time group) */
  private readonly byId = new Map<string, FigureArt>()
  private readonly listeners = new Set<() => void>()
  private revision = 0

  get(group: string | undefined, id: string): FigureArt | undefined {
    return (group ? this.groups.get(group)?.[id] : undefined) ?? this.byId.get(id)
  }

  hasFigure(id: string): boolean {
    return this.byId.has(id)
  }

  has(group: string): boolean {
    return this.groups.has(group)
  }

  add(batch: Iterable<readonly [string, Readonly<Record<string, FigureArt>>]>) {
    let changed = false
    for (const [group, art] of batch) {
      if (this.groups.has(group)) continue
      this.groups.set(group, art)
      for (const [id, figure] of Object.entries(art)) if (!this.byId.has(id)) this.byId.set(id, figure)
      changed = true
    }
    if (!changed) return
    this.revision++
    for (const listener of this.listeners) listener()
  }

  getSnapshot = () => this.revision

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}
