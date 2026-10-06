# Zendikar Map

MTG 차원 젠디카르의 인터랙티브 지도.

**사이트:** https://zendikar-map.vercel.app

```bash
pnpm install
pnpm dev
```

참고 자료는 `asset/`, 정리 문서는 `docs/reference.md`.

## 배포

Vercel(`kleague3-9494s-projects/zendikar-map`)이 GitHub 저장소와 연결되어 있다.

- `main`에 푸시하면 실제 사이트에 자동 배포된다.
- 다른 브랜치에 푸시하면 미리보기 주소가 따로 생긴다.
- 빌드는 `pnpm build`(타입체크 + Vite 빌드), 결과물은 `dist/`.
- 배포 상태는 `vercel ls zendikar-map`으로 본다.
