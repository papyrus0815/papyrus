/**
 * 사건 분야 레지스트리 — **"무엇에 관한 일인가"의 단일 정본**(라벨·순서·아이콘·색).
 *
 * 분야는 서버 enum(EventDomain)이다 — apps/api/src/libs/event/domain/event-domain.ts.
 * 예전엔 event_category 표(UUID + 한국어 이름)였고, 화면 곳곳이 **한국어 이름을 키로** 색을 찾았다.
 * 그 결과 팔레트가 네 벌(LEDGER_CATEGORY · CATEGORY_COLORS · CATEGORY_BADGE_COLORS ·
 * CATEGORY_SOFT_COLORS)로 갈라졌고 키도 한국어·영문 슬러그·'cat-xxx-n' id 추출이 섞였다.
 * 이제 키는 enum 하나이고, 네 벌의 값은 **역할별 필드**로 이 표에 모였다(값은 그대로 옮겼다 —
 * 각 줄의 대비·ΔE 근거는 아래 주석).
 *
 * 2단계(세부 분야)는 event-type-registry.ts — 분야와 독립 축이다.
 */
import type { IconType } from 'react-icons'
import {
  FiBook,
  FiCpu,
  FiGlobe,
  FiHeart,
  FiMoreHorizontal,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi'

export type EventDomainKey =
  | 'POLITICS'
  | 'DIPLOMACY'
  | 'MILITARY'
  | 'ECONOMY'
  | 'SOCIETY'
  | 'CULTURE'
  | 'RELIGION'
  | 'SCIENCE'
  | 'OTHER'

/** 색 면 위 칩 — tinted 배경(rgb에 alpha) + 진한 글자 */
export interface DomainSoftTone {
  /** 베이스 색의 R, G, B만 — alpha는 쓰는 쪽에서(bg 0.10/0.16, border 0.22/0.32) */
  rgb: string
  /** 라이트 글자(AA 4.5:1) */
  text: string
  /** 다크 글자 */
  textDark: string
  /** 스파크바 그라데이션 끝 */
  sparkEnd: string
}

/** 분야 요약 카드(흰 면 + 테두리·아이콘 칸) */
export interface DomainCardTone {
  border: string
  iconBackground: string
  iconColor: string
  shadow: string
  accent: string
}

export interface EventDomainDef {
  key: EventDomainKey
  /** 화면 라벨 */
  label: string
  /** 한 줄 설명 — 분야 고르기·요약 카드 */
  tagline: string
  /** 아이콘 */
  Icon: IconType
  /** 액센트 — 라이트(점·막대·히어로 띠). 작은 점에서도 변별되는 거리 우선 */
  color: string
  /** 액센트 — 다크(어두운 바탕 대비 4.5:1 이상) */
  dark: string
  /** 흰 지면 위 불투명 도형·배지(비텍스트 3:1) — color와 다른 분야만 따로 */
  badge: string
  soft: DomainSoftTone
  card: DomainCardTone
}

const card = (rgb: string, iconColor: string, accent: string): DomainCardTone => ({
  border: `rgba(${rgb}, 0.35)`,
  iconBackground: `rgba(${rgb}, 0.15)`,
  iconColor,
  shadow: `rgba(${rgb}, 0.18)`,
  accent,
})

/*
 * ⚠️ **식별성 예산** — 목록에서 분야를 싣는 것은 색 면이 아니라 11px 글자 하나다. 그 크기에서 두 색이
 * 갈리려면 CIEDE2000 ΔE가 대략 12는 돼야 한다. 새 색을 넣기 전에 대비(AA)와 ΔE를 **같이** 잴 것 —
 * 10색 전부 AA 통과 상태에서 군사↔경제가 ΔE 7.8이던 사고가 있었다(경제 text를 #b45309로 옮겨 19.1).
 */
export const EVENT_DOMAINS: Record<EventDomainKey, EventDomainDef> = {
  POLITICS: {
    key: 'POLITICS', label: '정치', tagline: '정권·제도·권력의 변화', Icon: FiUsers,
    color: '#6d28d9', dark: '#c4b5fd', badge: '#6d28d9',
    soft: { rgb: '109, 40, 217', text: '#5b21b6', textDark: '#c4b5fd', sparkEnd: '#a78bfa' },
    card: card('109, 40, 217', '#5b21b6', '#6d28d9'),
  },
  DIPLOMACY: {
    key: 'DIPLOMACY', label: '외교', tagline: '조약·회담·국가 간 관계', Icon: FiGlobe,
    /* badge·soft.rgb는 #0284c7(sky-600) — #0ea5e9는 흰 지면 대비 2.77:1로 비텍스트 3:1 미달이었고,
       외교가 전 행의 13%라 가장 잦은 표지가 가장 안 보였다(새 값 4.10:1 · 과학기술과 ΔE 12.3). */
    color: '#0ea5e9', dark: '#38bdf8', badge: '#0284c7',
    soft: { rgb: '2, 132, 199', text: '#0369a1', textDark: '#7dd3fc', sparkEnd: '#38bdf8' },
    card: card('14, 165, 233', '#0369a1', '#0ea5e9'),
  },
  MILITARY: {
    key: 'MILITARY', label: '군사', tagline: '전쟁·작전·군비', Icon: FiShield,
    color: '#b91c1c', dark: '#f87171', badge: '#b91c1c',
    soft: { rgb: '185, 28, 28', text: '#991b1b', textDark: '#fca5a5', sparkEnd: '#f87171' },
    card: card('185, 28, 28', '#991b1b', '#b91c1c'),
  },
  ECONOMY: {
    key: 'ECONOMY', label: '경제', tagline: '기업·시장·산업·재정', Icon: FiTrendingUp,
    color: '#b45309', dark: '#fbbf24', badge: '#b45309',
    soft: { rgb: '180, 83, 9', text: '#b45309', textDark: '#fdba74', sparkEnd: '#fb923c' },
    card: card('180, 83, 9', '#9a3412', '#b45309'),
  },
  SOCIETY: {
    key: 'SOCIETY', label: '사회', tagline: '봉기·운동·재해·이주', Icon: FiGlobe,
    color: '#0d9488', dark: '#2dd4bf', badge: '#0d9488',
    soft: { rgb: '13, 148, 136', text: '#0f766e', textDark: '#5eead4', sparkEnd: '#2dd4bf' },
    card: card('13, 148, 136', '#0f766e', '#0d9488'),
  },
  CULTURE: {
    key: 'CULTURE', label: '문화', tagline: '문자·예술·출판·유산', Icon: FiBook,
    color: '#db2777', dark: '#f472b6', badge: '#db2777',
    soft: { rgb: '219, 39, 119', text: '#be185d', textDark: '#f9a8d4', sparkEnd: '#f472b6' },
    card: card('219, 39, 119', '#be185d', '#db2777'),
  },
  RELIGION: {
    key: 'RELIGION', label: '종교', tagline: '개종·교회·종교 정책', Icon: FiHeart,
    color: '#a16207', dark: '#facc15', badge: '#a16207',
    soft: { rgb: '161, 98, 7', text: '#854d0e', textDark: '#fcd34d', sparkEnd: '#fbbf24' },
    card: card('161, 98, 7', '#854d0e', '#a16207'),
  },
  SCIENCE: {
    key: 'SCIENCE', label: '과학기술', tagline: '발견·발명·기술·기반시설', Icon: FiCpu,
    color: '#0e7490', dark: '#22d3ee', badge: '#0e7490',
    soft: { rgb: '14, 116, 144', text: '#155e75', textDark: '#67e8f9', sparkEnd: '#22d3ee' },
    card: card('14, 116, 144', '#155e75', '#0e7490'),
  },
  OTHER: {
    key: 'OTHER', label: '기타', tagline: '어디에도 맞지 않는 사건', Icon: FiMoreHorizontal,
    color: '#6b7280', dark: '#9ca3af', badge: '#6b7280',
    soft: { rgb: '107, 114, 128', text: '#374151', textDark: '#cbd5e1', sparkEnd: '#94a3b8' },
    card: card('107, 114, 128', '#374151', '#6b7280'),
  },
}

/** 고르기·필터·분포의 순서 */
export const EVENT_DOMAIN_ORDER: EventDomainKey[] = [
  'POLITICS',
  'DIPLOMACY',
  'MILITARY',
  'ECONOMY',
  'SOCIETY',
  'CULTURE',
  'RELIGION',
  'SCIENCE',
  'OTHER',
]

export const isEventDomainKey = (value: unknown): value is EventDomainKey =>
  typeof value === 'string' && value in EVENT_DOMAINS

/** 분야 정의 — 모르는 값·미지정은 기타 */
export const eventDomainDef = (key?: string | null): EventDomainDef =>
  isEventDomainKey(key) ? EVENT_DOMAINS[key] : EVENT_DOMAINS.OTHER

/** 분야 라벨 — 모르는 값·미지정은 '기타' */
export const domainLabel = (key?: string | null): string => eventDomainDef(key).label

/** 모드별 액센트 — 다크는 밝은 쌍 */
export const domainAccent = (key: string | null | undefined, mode: 'light' | 'dark' | string): string => {
  const def = eventDomainDef(key)
  return mode === 'dark' ? def.dark : def.color
}

/**
 * 고르기·필터용 분야 선택지 — `{ id, name }` 꼴(필터 축이 다른 참조 데이터와 같은 모양으로 다룬다).
 * id가 곧 분야 키라 URL(`?category=MILITARY`)에도 그대로 실린다. 서버에서 불러오지 않는 고정 목록이다.
 */
export interface EventDomainOption {
  id: EventDomainKey
  name: string
}

export const EVENT_DOMAIN_OPTIONS: EventDomainOption[] = EVENT_DOMAIN_ORDER.map((key) => ({
  id: key,
  name: EVENT_DOMAINS[key].label,
}))
