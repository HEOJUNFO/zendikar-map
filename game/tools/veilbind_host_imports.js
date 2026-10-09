// VeilBind 어댑터가 가져오는 x.r / x.e 의 자리 표시 — Emscripten 링커가 정의 없는 심볼로 막지 않게 한다.
// 실제 구현은 Worker 어댑터가 instantiateWasm 에서 VeilBind 가 준 것으로 바꿔 끼운다 (host/worker-adapter.ts).
addToLibrary({
  r__sig: 'jjj',
  r: () => 0n,
  e__sig: 'jjj',
  e: () => 0n,
});
