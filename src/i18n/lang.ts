// 지명 언어의 맥락 — App 이 한 번 두고, 패널처럼 화면 글이 언어를 따르는 곳은 useMessages() 로 받는다 (props 로 내려보내지 않게)
import { createContext, use } from 'react'
import type { LabelLang } from '../map/names'
import { MESSAGES } from './messages'

export const LangContext = createContext<LabelLang>('en')

export const useLang = () => use(LangContext)
export const useMessages = () => MESSAGES[use(LangContext)]
