# Translating Zendikar map panel text (Korean → English)

The app is a fan-made web map of the Magic: The Gathering plane Zendikar. Its side panel shows Korean prose: place descriptions, era history, the official basis for a placement, and "estimate" notes. An estimate note explains where the official sources stop and where this map made its own choice. You are translating that prose into English for the English UI.

## Input
A batch file `<set>-batch-<n>.json`: `{ items: [ { where, text, units: { <key>: <korean sentence> } } ] }`.
- `text` is the whole source paragraph. Use it for context only.
- `units` are the sentences to translate, in the order they appear in `text`. At runtime the app joins the English sentences of a paragraph with a single space. Each sentence must therefore read naturally on its own and in sequence.
- `where` tells you what the text is: `locations/<id>.description|history|estimate|placementBasis`, `continents/...`, `cards/<id>.basis|estimate` (land cards), `childMaps/<id>.note` (a note under the "Look closer" button that says which parts of the zoomed-in regional drawing follow official sources and which are this map's interpretation), `landscape/<continent>...label|estimate` (terrain drawn on the world map), and `periods/<continent>...label|basis|estimate` (how a place looked in an earlier era, shown only when that phase is on). `...sources[i]` is a source citation label.

## Output
Write `<same folder>/<set>-batch-<n>-en.json` (batches come from `node scripts/i18n/extract.mjs --todo <folder> --set <set>`; merge with `node scripts/i18n/merge.mjs --set <set> <files…>`): a flat JSON object `{ "<key>": "<English sentence>" }` with **every** key from every item's `units`, nothing else. Then validate it with:
```
node -e "const a=require(process.argv[1]),b=require(process.argv[2]);const want=a.items.flatMap(i=>Object.keys(i.units));const miss=want.filter(k=>!(k in b));const extra=Object.keys(b).filter(k=>!want.includes(k));const han=Object.entries(b).filter(([,v])=>/[가-힣]/.test(v)).map(([k])=>k);console.log({want:want.length,miss,extra,withHangul:han})" <batch.json> <batch-en.json>
```
Fix anything in `miss` or `extra`. `withHangul` must be empty, except for a sentence that is about a Korean printed name itself (for example the basis for a Korean card name). There, keep the Korean name in quotes and follow it with the English name.

## Rules
- **Faithful, not creative.** Keep every fact, hedge, citation and year: `(PWG 2010)`, `(BFZ #78)`, page numbers, coordinates such as `(990, 615)` and sizes. Do not add or drop information. The project is strict about separating official sources from its own guesses. Keep "official sources say…" and "this map chose…" distinctions exact.
- **English quotations stay verbatim.** Many sentences quote official English text, e.g. `'Grakmaw is a massive hydra …'라 쓴다` → `… writes 'Grakmaw is a massive hydra …'`. Do not alter the quoted English.
- **Quotations of Korean-printed card text** (한국어판 플레이버 '…'): if the official English wording appears in the same `text`, or you know it for certain, use that. Otherwise translate it faithfully and keep it in quotes.
- **Names:** use the official English name for every place, card, character and set. `glossary.tsv` maps Korean printed names to English. When the Korean text gives the English in parentheses or inline, use that. Never invent a name. If a Korean name is in neither place and you don't know the official English, romanize it sensibly and keep the meaning.
- **Standard terms:** 다면체/헤드론 hedron · 하늘거주지 Skyclave · 하늘 폐허 sky ruin · 탁류 the Roil · 엘드라지 Eldrazi · 타이탄 titan · 혈족장 bloodchief · 코르 kor · 인어 merfolk · 흡혈귀 vampire · 정령/원소 elemental · 플레인즈워커 planeswalker · 대지 카드 land card · 양면 카드 double-faced card · 대지 면 land face · 플레이버 flavor text · 한국어판 Korean edition · 공식 자료/공식 설정 official sources/the official setting · 이 지도 this map · 세계 지도 the world map · 지역 상세 the regional detail · 더 깊은 지역 상세 the deeper regional detail · 그림 a figure (a drawing on this map) or the card art (on a card) · 추정 estimate · 해석 interpretation · 표시 marker · 이름(지도 라벨) label · 자리 position/spot · 페이즈1 Phase 1 · 사가2 Saga 2 · 시점 timeline point/year · 그 무렵 모습 how it looked at the time · 팬 지도 the fan map · 기본 지도 the base map.
- **Recurring citations:** PWG / PG = A Planeswalker's Guide to Zendikar. Set codes stay as they are: ZEN, WWK, ROE, BFZ, OGW, ZNR, MOM. 'Magic Story' and article titles stay in English.
- **Style:** plain, precise encyclopedic English. Use past or present tense to match the Korean. Use American spelling. No marketing tone.
