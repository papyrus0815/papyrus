import type { PersonInfographicItem } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { COUNTRY_REGION, ERAS, FIELDS } from './constants'
import type { AdaptedPerson, TenureLite } from './types'

/** 생존/사망연도 미상 시 폴백 기준 — 모듈 로드 1회. (인물마다 new Date() 생성 방지) */
const CURRENT_YEAR = new Date().getFullYear()

export function getRegion(name?: string | null): string {
  if (!name) return '기타'
  if (COUNTRY_REGION[name]) return COUNTRY_REGION[name]
  for (const [k, v] of Object.entries(COUNTRY_REGION)) {
    if (name.includes(k) || k.includes(name)) return v
  }
  return '기타'
}

/**
 * 소속 국가명 — 경량 엔드포인트가 서버에서 이미 이름 해석
 * (CITIZENSHIP 소속 → country FK → BIRTH_PLACE, HC↔모던 링크 포함)을 끝내 `country.name`으로 내려준다.
 * 따라서 클라이언트는 그 값을 그대로 쓴다.
 */
export function pickCountryName(p: PersonInfographicItem): string {
  return p.country?.name ?? ''
}

const POLITICAL_TYPES = new Set([
  'HEAD_OF_STATE',
  'HEAD_OF_GOVERNMENT',
  'CABINET_MINISTER',
  'LEGISLATOR',
  'JUDICIARY',
])

/** Person → 분야 분류 (FIELDS 상수 기준). */
export function getField(p: PersonInfographicItem): string {
  const tenures = (p.governmentTenures ?? []) as TenureLite[]
  if (p.sovereignReignCount > 0) return '정치'
  const types = tenures.map((t) => t.positionType ?? '')
  if (types.includes('MILITARY_COMMANDER')) return '군사'
  if (types.some((t) => POLITICAL_TYPES.has(t))) return '정치'
  // 매칭 정보가 없으면 '기타' — 데이터 부족이지 정치 분류는 아님
  return FIELDS[FIELDS.length - 1]
}

export function toYear(y?: number | null, era?: string | null): number {
  if (!y) return 0
  return era === 'BC' ? -y : y
}

export function yearOfEra(y: number) {
  for (const e of ERAS) if (y >= e.from && y < e.to) return e
  return ERAS[ERAS.length - 1]
}

export function adapt(p: PersonInfographicItem): AdaptedPerson | null {
  if (!p.birthYear && !p.deathYear) return null

  const born = toYear(p.birthYear, p.birthEra)
  // deathYear가 있으면 isAlive와 무관하게 그 값을 우선. 없으면 생존/사망 모두 올해로 폴백(수명 계산 기준).
  const deathYearVal = toYear(p.deathYear, p.deathEra)
  const isAliveFlag = !!p.isAlive
  const died = deathYearVal !== 0 ? deathYearVal : CURRENT_YEAR

  // 잘못된 입력(NaN/Infinity) 방어 — 시각화가 깨지지 않도록 폐기
  if (!Number.isFinite(born) || !Number.isFinite(died)) return null

  const countryName = pickCountryName(p)
  const tenures = (p.governmentTenures ?? []) as TenureLite[]
  const rawInfluence = p.influence
  const influence =
    typeof rawInfluence === 'number'
      ? Math.max(0, Math.min(100, rawInfluence))
      : 0
  const name =
    getPersonDisplayName({
      name: p.name,
      surname: p.surname,
      middleName: p.middleName,
      country: p.country,
    }) ||
    p.name ||
    '이름 없음'

  // 시대 분류용 활동연도: 재임 시작연도 평균 → 없으면 생몰 중간값
  const tenureYears = tenures
    .map((t) => (t.startDate ? new Date(t.startDate).getFullYear() : null))
    .filter((y): y is number => y !== null && !isNaN(y))
  const activityYear = tenureYears.length
    ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length
    : (born + died) / 2

  const age =
    p.birthYear && (p.deathYear || isAliveFlag)
      ? Math.max(0, Math.abs(died - born))
      : null

  const regnal = p.regnalName
  const firstTenure = tenures[0]
  const primaryTitle: string | null =
    (regnal && regnal.trim()) ||
    firstTenure?.positionDefinition?.title ||
    firstTenure?.title ||
    null

  const isMonarch = p.sovereignReignCount > 0 || !!(regnal && regnal.trim())
  const isHeadOfState = tenures.some(
    (t) =>
      t.positionType === 'HEAD_OF_STATE' ||
      t.positionDefinition?.positionType === 'HEAD_OF_STATE',
  )

  const bioRaw = p.biography
  const biography =
    typeof bioRaw === 'string' && bioRaw.trim() ? bioRaw.trim() : null

  // 검색 대상 결합 — 표시명과 다를 수 있는 원본 이름/성/별호까지 포함해 누락 방지.
  const searchText = [
    name,
    p.name,
    p.surname,
    p.middleName,
    regnal,
    countryName,
    p.dynasty?.name,
    primaryTitle,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return {
    id: p.id,
    name,
    born,
    died,
    activityYear,
    age,
    region: getRegion(countryName),
    country: countryName || '미상',
    field: getField(p),
    faction: p.dynasty?.name ?? '',
    influence,
    profileImageUrl: p.profileImageUrl ?? null,
    isMonarch,
    isHeadOfState,
    primaryTitle,
    biography,
    isAlive: isAliveFlag,
    searchText,
  }
}

/** 이름 해시 → hue (썸네일 폴백 그라데이션용) */
export function hueFrom(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}
