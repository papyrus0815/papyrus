import { EventDomain } from '@prisma/client'

/**
 * 시드의 분야 이름(한국어) → 분야 enum(EventDomain).
 *
 * 분야는 예전 event_category 표(이름 + UUID)였다가 고정 enum이 됐다(2026-10). 시드는 사람이 읽기 좋은
 * 한국어 이름을 그대로 쓰고 여기서 키로 바꾼다. 옛 이름('전쟁/군사'·'회담/조약'·'건국/멸망')도 받는다.
 * 모르는 이름은 조용히 '기타'로 떨어뜨리지 않고 던진다 — 오타가 분류를 오염시키지 않게.
 */
const DOMAIN_BY_NAME: Record<string, EventDomain> = {
  정치: EventDomain.POLITICS,
  '건국/멸망': EventDomain.POLITICS,
  외교: EventDomain.DIPLOMACY,
  '회담/조약': EventDomain.DIPLOMACY,
  군사: EventDomain.MILITARY,
  '전쟁/군사': EventDomain.MILITARY,
  경제: EventDomain.ECONOMY,
  사회: EventDomain.SOCIETY,
  문화: EventDomain.CULTURE,
  종교: EventDomain.RELIGION,
  과학기술: EventDomain.SCIENCE,
  기타: EventDomain.OTHER,
}

export function domainOf(name: string): EventDomain {
  const domain = DOMAIN_BY_NAME[name]
  if (!domain) throw new Error(`알 수 없는 사건 분야: '${name}'`)
  return domain
}
