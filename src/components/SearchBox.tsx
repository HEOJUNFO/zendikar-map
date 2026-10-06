import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { LandCard } from '../data/cards'
import type { Continent, Location } from '../data/types'
import { KIND_LABEL } from './labels'
import './SearchBox.css'

export type SearchHit =
  | { type: 'location'; item: Location }
  | { type: 'continent'; item: Continent }
  | { type: 'card'; item: LandCard }

interface Props {
  continents: Continent[]
  locations: Location[]
  /** 대지 카드(ZEN·WWK) 가운데 패널이 따로 있는 것 — 검색 결과에도 따로 나온다 */
  cards: LandCard[]
  /** 장소와 하나인 카드 — 따로 나오지 않고, 그 카드 이름으로도 장소가 찾아진다 */
  placeCardOf: (place: Location) => LandCard | undefined
  /** 카드가 이어진 대륙 이름 */
  cardContinent: (card: LandCard) => string
  continentName: (id: string | null) => string
  onPick: (hit: SearchHit) => void
  /** 패널을 닫을 때 초점을 돌려받는 자리 */
  inputRef?: RefObject<HTMLInputElement | null>
}

// 한글은 자모 단위로 맞춘다 — 입력기가 조합하는 동안 '말ㄹ'(다음 글자 첫소리가 받침에 붙음)이나 'ㅁ' 같은 중간 상태가
// 완성 글자 '말라키르'의 앞부분으로 맞아야 결과가 깜박이며 '없음'을 알리지 않는다. 겹받침·겹모음은 낱자로 푼다.
const INITIAL = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const MEDIAL = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅗㅏ', 'ㅗㅐ', 'ㅗㅣ', 'ㅛ', 'ㅜ', 'ㅜㅓ', 'ㅜㅔ', 'ㅜㅣ', 'ㅠ', 'ㅡ', 'ㅡㅣ', 'ㅣ']
const FINAL = ['', 'ㄱ', 'ㄲ', 'ㄱㅅ', 'ㄴ', 'ㄴㅈ', 'ㄴㅎ', 'ㄷ', 'ㄹ', 'ㄹㄱ', 'ㄹㅁ', 'ㄹㅂ', 'ㄹㅅ', 'ㄹㅌ', 'ㄹㅍ', 'ㄹㅎ', 'ㅁ', 'ㅂ', 'ㅂㅅ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
// 따로 친 겹낱자 (호환 자모)
const COMPOUND: Record<string, string> = {
  ㄳ: 'ㄱㅅ', ㄵ: 'ㄴㅈ', ㄶ: 'ㄴㅎ', ㄺ: 'ㄹㄱ', ㄻ: 'ㄹㅁ', ㄼ: 'ㄹㅂ', ㄽ: 'ㄹㅅ', ㄾ: 'ㄹㅌ', ㄿ: 'ㄹㅍ', ㅀ: 'ㄹㅎ', ㅄ: 'ㅂㅅ',
  ㅘ: 'ㅗㅏ', ㅙ: 'ㅗㅐ', ㅚ: 'ㅗㅣ', ㅝ: 'ㅜㅓ', ㅞ: 'ㅜㅔ', ㅟ: 'ㅜㅣ', ㅢ: 'ㅡㅣ',
}

function jamo(s: string): string {
  let out = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)! - 0xac00
    if (c >= 0 && c < 11172) out += INITIAL[Math.floor(c / 588)] + MEDIAL[Math.floor((c % 588) / 28)] + FINAL[c % 28]
    else out += COMPOUND[ch] ?? ch
  }
  return out
}

const fold = (s: string) =>
  jamo(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-'’.]/g, '')

const MAX_RESULTS = 8

export function SearchBox({ continents, locations, cards, placeCardOf, cardContinent, continentName, onPick, inputRef }: Props) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const ownInput = useRef<HTMLInputElement | null>(null)

  const hits = useMemo<SearchHit[]>(() => {
    const q = fold(query)
    if (!q) return []
    const score = (names: (string | undefined)[]) => {
      const folded = names.filter((n): n is string => Boolean(n)).map(fold)
      if (folded.some((n) => n.startsWith(q))) return 2
      if (folded.some((n) => n.includes(q))) return 1
      return 0
    }
    const all: (SearchHit & { s: number })[] = [
      ...continents.map((c) => ({ type: 'continent' as const, item: c, s: score([c.name, c.nameKo]) + 1 })),
      ...locations.map((l) => {
        const card = placeCardOf(l)
        return { type: 'location' as const, item: l, s: score([l.name, l.nameKo, ...(l.aliases ?? []), card?.name, card?.nameKo]) }
      }),
      ...cards.map((c) => ({ type: 'card' as const, item: c, s: score([c.name, c.nameKo]) })),
    ]
    return all
      .filter((h) => h.s > (h.type === 'continent' ? 1 : 0))
      .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
      .slice(0, MAX_RESULTS)
  }, [query, continents, locations, cards, placeCardOf])

  const typed = open && query.length > 0
  const expanded = typed && hits.length > 0
  const noMatch = typed && hits.length === 0

  // 화살표로 고른 결과가 목록 밖으로 나가지 않게
  useEffect(() => {
    if (expanded) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, expanded, listId])

  const pick = (hit: SearchHit) => {
    onPick(hit)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter·화살표는 입력기 몫이다 (Safari 는 조합을 끝낸 뒤 keyCode 229 로 Enter 를 보낸다)
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(hits.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && expanded && hits[active]) {
      e.preventDefault()
      pick(hits[active])
    } else if (e.key === 'Escape' && (query || open)) {
      // 검색어만 지운다 — 열린 장소 패널까지 닫히지 않게 여기서 멈춘다
      e.preventDefault()
      e.stopPropagation()
      setQuery('')
      setOpen(false)
    }
  }

  return (
    <div className="search">
      <label className="search-label" htmlFor={`${listId}-input`}>
        지명 찾기
      </label>
      <div className="search-field">
        <input
          ref={(el) => {
            ownInput.current = el
            if (inputRef) inputRef.current = el
          }}
          id={`${listId}-input`}
          className="search-input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="예: Sea Gate, 말라키르"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded && hits[active] ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            aria-label="검색어 지우기"
            // 입력창의 초점을 빼앗지 않는다
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery('')
              setActive(0)
              // 단추는 검색어가 있을 때만 있다 — 키보드로 눌렀을 때 초점이 사라지지 않게 입력창으로 돌려준다
              ownInput.current?.focus()
            }}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4.5 4.5 11.5 11.5M11.5 4.5 4.5 11.5" />
            </svg>
          </button>
        )}
      </div>
      {expanded && (
        <ul id={listId} role="listbox" className="search-results" aria-label="검색 결과">
          {hits.map((h, i) => (
            <li
              key={`${h.type}-${h.item.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="search-hit"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h)}
              onMouseEnter={() => setActive(i)}
            >
              <span className="hit-name">{h.item.name}</span>
              {h.item.nameKo && <span className="hit-ko">{h.item.nameKo}</span>}
              <span className="hit-meta">
                {h.type === 'continent'
                  ? '대륙'
                  : h.type === 'card'
                    ? `${h.item.set.toUpperCase()} 대지 카드, ${cardContinent(h.item)}`
                    : `${KIND_LABEL[h.item.kind]}, ${continentName(h.item.continentId)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* 결과 수와 '없음'을 화면 읽기 프로그램에 알린다 — 결과가 없을 때만 눈에도 보인다 */}
      <p className={`search-status ${noMatch ? 'is-empty' : ''}`} role="status">
        {noMatch
          ? '일치하는 지명이 없습니다. 영문이나 공식 한국어 표기로 찾아보세요.'
          : expanded
            ? `검색 결과 ${hits.length}개`
            : ''}
      </p>
    </div>
  )
}
