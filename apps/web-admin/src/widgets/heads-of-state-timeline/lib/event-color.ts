/**
 * 타임라인 위 사건 칩의 색 — 분야(EventDomain)의 soft 톤에서 만든다.
 *
 * 예전엔 카테고리 **이름을 정규식으로**(/전쟁|침공|혁명/·/외교|조약/…) 맞춰 별도 팔레트 다섯 색을 골랐다.
 * 분야가 고정 enum이 되면서 추측할 필요가 없어졌고, 색도 목록·상세와 같은 분야 레지스트리 한 벌을 쓴다.
 * 분야를 모르면 기본 회색.
 */
import { eventDomainDef, isEventDomainKey } from '@/entities/event/model/event-domain'

export interface EventColorTone {
  background: string
  border: string
  color: string
}

const FALLBACK = {
  light: {
    background: 'rgba(107, 114, 128, 0.14)',
    border: 'rgba(75, 85, 99, 0.5)',
    color: '#1f2937',
  },
  dark: {
    background: 'rgba(148, 163, 184, 0.16)',
    border: 'rgba(148, 163, 184, 0.5)',
    color: '#e2e8f0',
  },
}

export function eventToneFor(domain: string | null | undefined, isDark: boolean): EventColorTone {
  if (!isEventDomainKey(domain)) return isDark ? FALLBACK.dark : FALLBACK.light
  const { soft } = eventDomainDef(domain)
  return {
    background: `rgba(${soft.rgb}, ${isDark ? 0.18 : 0.12})`,
    border: `rgba(${soft.rgb}, 0.55)`,
    color: isDark ? soft.textDark : soft.text,
  }
}
