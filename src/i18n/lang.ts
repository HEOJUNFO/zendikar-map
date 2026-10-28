// 지명 언어의 맥락 — App 이 한 번 두고, 패널처럼 화면 글이 언어를 따르는 곳은 useMessages() 로 받는다 (props 로 내려보내지 않게).
// 데이터 글(한국어 원본)의 영어는 TextContext 의 사전 — 영어 보기에서만 받는다 (src/i18n/en/*.json, App 의 loadDicts)
import { createContext, use } from 'react'
import type { LabelLang } from '../map/names'
import { MESSAGES } from './messages'
import { translate, type Dict } from './units'

export const LangContext = createContext<LabelLang>('en')
export const TextContext = createContext<Dict | null>(null)

export const useLang = () => use(LangContext)
export const useMessages = () => MESSAGES[use(LangContext)]

/** 사전마다 옮긴 글을 기억한다 — 패널을 다시 그릴 때마다 문장을 다시 자르지 않게 */
const memo = new WeakMap<Dict, Map<string, string | null>>()

/**
 * 데이터 글을 화면 언어로 — 그 글과 그 언어(lang 속성)를 함께 준다 (<p {...tx(글)} />).
 * 영어 보기에서 사전에 없는 문장이 하나라도 있으면 한국어 원본 그대로
 */
export function useText() {
  const lang = use(LangContext)
  const dict = use(TextContext)
  return (text: string): { lang: LabelLang; children: string } => {
    if (lang !== 'en' || !dict) return { lang: 'ko', children: text }
    let m = memo.get(dict)
    if (!m) memo.set(dict, (m = new Map()))
    let en = m.get(text)
    if (en === undefined) m.set(text, (en = translate(text, dict)))
    return en === null ? { lang: 'ko', children: text } : { lang: 'en', children: en }
  }
}
