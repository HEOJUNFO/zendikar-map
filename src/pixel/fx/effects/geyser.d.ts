// 효과 파일(JS)의 형 — fx/layer.ts 의 FxModule 과 같은 꼴
export const meta: import('../layer').FxModule['meta']
export function draw(p: unknown, t: number, o: Record<string, unknown>): void
export function variant(name: string): import('../layer').FxModule
