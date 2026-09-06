/**
 * 교역 도메인 어휘 — enum ↔ 한국어 라벨.
 *
 * 편집 폼과 조회 지면이 같은 말을 쓰게 한 곳에 둔다. 각 항목의 `hint`는 왜 그 칸이
 * 있는지를 짧게 적은 것으로, 폼의 도움말로 그대로 쓴다.
 */
import type { TradeFlow, TradeRecord } from '@/shared/api/trade'

/*
 * 값 타입은 SDK 응답에서 뽑는다 — DTO 파일을 상대경로로 끌어오면 웹 번들이 API 소스에
 * 직접 매달리고, 필드가 바뀌었을 때 여기만 조용히 어긋난다.
 */
type TradeChannelDto = NonNullable<TradeFlow['channel']>
type TradeRestrictionKindDto = NonNullable<TradeFlow['restriction']>
type TradeTransportModeDto = NonNullable<TradeFlow['transportMode']>
type TradePriceBasisDto = NonNullable<TradeFlow['priceBasis']>
type TradeFlowGrainDto = TradeFlow['grain']
type TradeValueScaleDto = TradeRecord['valueScale']
type TradePeriodAggregationDto = TradeRecord['aggregation']
type TradeDataConfidenceDto = NonNullable<TradeRecord['confidence']>

export interface VocabEntry<T extends string> {
  value: T
  label: string
  hint?: string
}

export const DIRECTION_LABEL: Record<'EXPORT' | 'IMPORT', string> = {
  EXPORT: '수출',
  IMPORT: '수입',
}

export const GRAIN_OPTIONS: VocabEntry<TradeFlowGrainDto>[] = [
  {
    value: 'COMMODITY',
    label: '품목별',
    hint: '상대국을 가리지 않은 품목 구성 — "수출의 24%가 면직물"',
  },
  {
    value: 'PARTNER',
    label: '상대국별',
    hint: '품목을 가리지 않은 상대 구성 — "수출의 12%가 인도로"',
  },
  {
    value: 'PARTNER_COMMODITY',
    label: '상대국×품목',
    hint: '둘을 함께 특정 — "대인도 면직물 수출"',
  },
]

export const VALUE_SCALE_OPTIONS: VocabEntry<TradeValueScaleDto>[] = [
  { value: 'ONE', label: '단위 없음' },
  { value: 'THOUSAND', label: '천' },
  { value: 'MILLION', label: '백만' },
  { value: 'BILLION', label: '십억' },
  { value: 'TRILLION', label: '조' },
]

export const VALUE_SCALE_MULTIPLIER: Record<TradeValueScaleDto, number> = {
  ONE: 1,
  THOUSAND: 1e3,
  MILLION: 1e6,
  BILLION: 1e9,
  TRILLION: 1e12,
}

export const PRICE_BASIS_OPTIONS: VocabEntry<TradePriceBasisDto>[] = [
  { value: 'FOB', label: 'FOB(본선인도)', hint: '운임·보험 제외 — 보통 수출 통계' },
  { value: 'CIF', label: 'CIF(운임보험포함)', hint: '운임·보험 포함 — 보통 수입 통계' },
  { value: 'FRONTIER', label: '국경인도가' },
  { value: 'UNKNOWN', label: '미상' },
]

export const AGGREGATION_OPTIONS: VocabEntry<TradePeriodAggregationDto>[] = [
  { value: 'ANNUAL', label: '그 해 한 해치' },
  { value: 'AVERAGE', label: '기간 연평균' },
  { value: 'TOTAL', label: '기간 합계' },
]

export const CONFIDENCE_OPTIONS: VocabEntry<TradeDataConfidenceDto>[] = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
]

export const CHANNEL_OPTIONS: VocabEntry<TradeChannelDto>[] = [
  { value: 'OFFICIAL', label: '공무역', hint: '국가가 주체이거나 승인한 정규 교역' },
  { value: 'TRIBUTE', label: '조공무역', hint: '책봉·조공 체제의 사행 무역' },
  { value: 'PRIVATE', label: '사무역', hint: '민간 상인의 교역' },
  { value: 'SMUGGLING', label: '밀무역', hint: '금지된 잠상·후시' },
  { value: 'CONCESSION', label: '개항장·조계', hint: '데지마·왜관·상하이 조계' },
  { value: 'CHARTERED_COMPANY', label: '특허회사 독점', hint: '동인도회사 등' },
  { value: 'STATE_MONOPOLY', label: '국가 전매', hint: '소금·담배·아편 전매' },
  { value: 'AID', label: '원조·차관' },
  { value: 'BARTER', label: '물물교환·구상무역' },
]

export const RESTRICTION_OPTIONS: VocabEntry<TradeRestrictionKindDto>[] = [
  { value: 'NONE', label: '없음' },
  { value: 'EMBARGO', label: '금수' },
  { value: 'SANCTION', label: '제재' },
  { value: 'QUOTA', label: '수량 할당' },
  { value: 'PROHIBITED', label: '금지 품목' },
  { value: 'LICENSED', label: '허가제' },
  { value: 'PROTECTIVE_TARIFF', label: '보호관세' },
  { value: 'ANTIDUMPING', label: '반덤핑' },
]

export const TRANSPORT_OPTIONS: VocabEntry<TradeTransportModeDto>[] = [
  { value: 'SEA', label: '해상' },
  { value: 'RIVER', label: '하천' },
  { value: 'LAND', label: '육상' },
  { value: 'CARAVAN', label: '대상(隊商)' },
  { value: 'RAIL', label: '철도' },
  { value: 'AIR', label: '항공' },
  { value: 'PIPELINE', label: '파이프라인' },
  { value: 'CABLE', label: '해저케이블' },
  { value: 'UNKNOWN', label: '미상' },
]

function toLabelMap<T extends string>(
  entries: VocabEntry<T>[],
): Record<T, string> {
  return entries.reduce(
    (acc, entry) => {
      acc[entry.value] = entry.label
      return acc
    },
    {} as Record<T, string>,
  )
}

export const GRAIN_LABEL = toLabelMap(GRAIN_OPTIONS)
export const CHANNEL_LABEL = toLabelMap(CHANNEL_OPTIONS)
export const RESTRICTION_LABEL = toLabelMap(RESTRICTION_OPTIONS)
export const TRANSPORT_LABEL = toLabelMap(TRANSPORT_OPTIONS)
export const PRICE_BASIS_LABEL = toLabelMap(PRICE_BASIS_OPTIONS)
export const VALUE_SCALE_LABEL = toLabelMap(VALUE_SCALE_OPTIONS)
export const AGGREGATION_LABEL = toLabelMap(AGGREGATION_OPTIONS)
export const CONFIDENCE_LABEL = toLabelMap(CONFIDENCE_OPTIONS)

/**
 * 교역액은 자릿수가 커서 원시 숫자를 그대로 쓰면 읽히지 않는다.
 * 단위 안에서 세 자리가 넘어가면 소수점은 잡음이라 뗀다(5160.0억 → 5,160억).
 */
export function formatTradeValue(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  const scaled = (divisor: number, unit: string) => {
    const quotient = abs / divisor
    const text =
      quotient >= 100
        ? Math.round(quotient).toLocaleString('ko-KR')
        : quotient.toFixed(1)
    return `${sign}${text}${unit}`
  }
  if (abs >= 1_0000_0000_0000) return scaled(1_0000_0000_0000, '조')
  if (abs >= 1_0000_0000) return scaled(1_0000_0000, '억')
  if (abs >= 1_0000) return scaled(1_0000, '만')
  return `${sign}${abs.toLocaleString('ko-KR')}`
}

/** 연도 표기 — 기원전은 접두사로. 기간이면 "1860–1869". */
export function formatTradeYear(
  era: 'BC' | 'AD',
  year: number,
  periodEndYear?: number | null,
): string {
  const prefix = era === 'BC' ? '기원전 ' : ''
  if (periodEndYear != null && periodEndYear !== year) {
    return `${prefix}${year}–${periodEndYear}년`
  }
  return `${prefix}${year}년`
}

/**
 * 분류 색 키 → 실제 색.
 *
 * 분류마다 색을 고정해야 구성 막대와 범례가 화면을 옮겨도 같은 뜻으로 읽힌다.
 * 키를 모르면 회색으로 떨어뜨린다 — 색이 없다고 자료가 없는 건 아니다.
 *
 * **대분류가 15개라 색만으로는 끝까지 갈라지지 않는다.** 그래서 두 가지를 같이 한다.
 * ⑴ 계열은 지키되 명도·채도를 벌려 가장 나쁜 쌍을 끌어올렸다 —
 *    옛 값은 무기(#ef4444)와 섬유(#f43f5e)가 정상 시각 ΔE 3.5로 사실상 같은 빨강,
 *    운송(#6366f1)·화학(#8b5cf6)·전자(#3b82f6)가 ΔE 6.3~7.2로 한 덩어리였고
 *    15색 중 8색이 흰 배경 대비 3:1 미만이었다. 지금은 최악 쌍 6.9, 대비 미달 0.
 * ⑵ 그래도 하한(15)에는 못 미치므로 **식별은 색이 아니라 이름표가 맡는다** — 범례를
 *    막대 조각과 같은 순서로 놓아 왼쪽부터 짝지어 읽게 한다. 색은 묶음을 보여줄 뿐
 *    혼자 뜻을 지지 않는다.
 * 값을 바꾸려면 눈대중 말고 팔레트 검증을 다시 돌릴 것.
 */
const CATEGORY_COLORS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    lime: '#5d8c0a', // 농산물
    cyan: '#0891b2', // 수산물
    amber: '#c2740a', // 에너지·광물
    slate: '#546b8a', // 금속·소재
    violet: '#7c3aed', // 화학·의약
    rose: '#db2777', // 섬유·의류
    stone: '#78716c', // 기계
    blue: '#2a78d6', // 전자·전기
    indigo: '#4338ca', // 운송장비
    red: '#b91c1c', // 무기·군수
    yellow: '#a16207', // 사치품·귀금속
    orange: '#ea580c', // 기호품
    teal: '#0d9488', // 소비재
    emerald: '#16a34a', // 서비스
    zinc: '#8b8b93', // 기타
  },
  /* 같은 계열을 어두운 면에 맞춰 한두 단계 밝힌 값 — 라이트용을 그대로 쓰면
     남색(#4338ca 2.27:1)·빨강(#b91c1c 2.77:1)이 배경에 잠긴다 */
  dark: {
    lime: '#7cb518',
    cyan: '#06b6d4',
    amber: '#d9820c',
    slate: '#7b93b5',
    violet: '#a78bfa',
    rose: '#f0509a',
    stone: '#a58260',
    blue: '#3987e5',
    indigo: '#7a72ee',
    red: '#ef4444',
    yellow: '#c99a10',
    orange: '#f97316',
    teal: '#17b8a6',
    emerald: '#2eb85c',
    zinc: '#a1a1aa',
  },
}

const FALLBACK_CATEGORY_COLOR = { light: '#7a8699', dark: '#9aa5b5' }

/**
 * 방향 색 — 수출·수입은 **맞선** 두 값이라 따뜻한 색 하나, 찬 색 하나로 갈라야
 * 대립으로 읽힌다. 예전엔 초록(#10b981)·청록(#06b6d4)이라 둘 다 찬 색이었고
 * 정상 시각 ΔE 12.5(하한 15)로 색만으로는 갈라지지 않았다.
 * 아래 두 쌍은 명도대·채도·색각이상 분리·배경 대비를 모두 통과한 값이다.
 */
export const DIRECTION_COLORS = {
  light: { EXPORT: '#17a06f', IMPORT: '#eb6834' },
  dark: { EXPORT: '#199e70', IMPORT: '#d95926' },
} as const

export function directionColor(
  direction: 'EXPORT' | 'IMPORT',
  isDark: boolean,
): string {
  return DIRECTION_COLORS[isDark ? 'dark' : 'light'][direction]
}

export function categoryColor(
  colorKey: string | null | undefined,
  isDark = false,
): string {
  const mode = isDark ? 'dark' : 'light'
  if (!colorKey) return FALLBACK_CATEGORY_COLOR[mode]
  return CATEGORY_COLORS[mode][colorKey] ?? FALLBACK_CATEGORY_COLOR[mode]
}
