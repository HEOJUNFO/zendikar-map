# Zendikar Map

MTG 차원 젠디카르의 인터랙티브 지도.

**사이트:** https://zendikar-map.vercel.app

```bash
pnpm install
pnpm dev
```

참고 자료는 `asset/`, 정리 문서는 `docs/reference.md`.

게임은 개발 서버의 `/game/`에서 실행한다. 젠디카르의 하늘거주지 유적을 탐험하는 박자 기반 FPS로, 어두운 실내와 끊어진 바닥, 벽을 타는 거미와 날아다니는 박쥐, 카드 상점과 유적 수호자 보스가 등장한다. 세계관 근거는 `docs/lore.md`이며, 방 내부·수호자·카드의 이름과 효과는 이 게임의 창작이다.

적을 처치하고 전투방을 비우면 골드를 얻는다. 상점에서는 숫자 `1`–`8`로 카드를 고르고 `E`로 구매한다. 2단 점프, 반박 대시, 피해·탄창·체력 강화 등의 효과는 해당 판에 유지된다. 보스가 쓰러지면 시체에 다섯 발을 더 맞혀 마무리 기타 선율을 한 음씩 연주하고 판을 끝낸다. `F6`은 방 틀과 전투·상점·보스를 차례로 확인하는 화면 검증용 코스다.

게임을 수정한 뒤에는 `pnpm game:build`, `pnpm game:test`, `pnpm game:typecheck`로 WASM·에셋과 공개 C++ 프로브·호스트 타입을 검사한다. 빌드 결과는 `public/wasm/`에 기록되고 게임은 같은 빌드의 WASM과 `game-assets.zkpack`을 함께 사용한다. 렌더링·입력·소리는 브라우저의 해당 시나리오에서도 확인한다.

무료 에셋의 출처와 라이선스는 `game/gameplay/content/`의 각 `CREDITS.md`에 기록한다. 생물의 `.blend`·`.glb`와 원본 텍스처는 애니메이션을 다시 내보내는 입력으로 보존한다. 저장된 포즈·JPEG는 빌드가 그대로 팩에 넣으므로 일반 빌드는 Blender를 요구하지 않는다. 에셋 수정·재현 절차는 `game/gameplay/content/README.md`와 `creatures/CREDITS.md`를 따른다.

## 배포

Vercel(`kleague3-9494s-projects/zendikar-map`)이 GitHub 저장소와 연결되어 있다.

- `main`에 푸시하면 실제 사이트에 자동 배포된다.
- 다른 브랜치에 푸시하면 미리보기 주소가 따로 생긴다.
- 빌드는 `pnpm build`(타입체크 + Vite 빌드), 결과물은 `dist/`.
- 배포 상태는 `vercel ls zendikar-map`으로 본다.
