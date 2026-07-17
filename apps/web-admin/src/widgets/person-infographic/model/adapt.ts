import type { PersonInfographicItem } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { COUNTRY_REGION, ERAS, FIELDS } from './constants'
import type { AdaptedPerson } from './types'

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
  const tenures = p.governmentTenures ?? []
  if (p.sovereignReignCount > 0) return '정치'
  const types = tenures.map((t) => t.positionType ?? '')
  if (types.includes('MILITARY_COMMANDER')) return '군사'
  if (types.some((t) => POLITICAL_TYPES.has(t))) return '정치'
  // 매칭 정보가 없으면 '기타' — 데이터 부족이지 정치 분류는 아님
  return FIELDS[FIELDS.length - 1]
}

/** 연도+표기 → 부호 연도. 미상(0/null)은 명시적으로 null (이전엔 0으로 폴백돼 '서기 0년'으로 오염). */
export function toYear(y?: number | null, era?: string | null): number | null {
  if (!y) return null
  return era === 'BC' ? -y : y
}

export function yearOfEra(y: number) {
  for (const e of ERAS) if (y >= e.from && y < e.to) return e
  // 범위 밖: ERAS(-800~2100) 이전은 가장 이른 시대(고대), 그 외(미래)는 마지막 시대.
  // (이전엔 양끝 모두 마지막='당대'로 떨어져 고대 인물이 현대로 오분류·오채색됐음)
  return y < ERAS[0].from ? ERAS[0] : ERAS[ERAS.length - 1]
}

export function adapt(p: PersonInfographicItem): AdaptedPerson | null {
  if (!p.birthYear && !p.deathYear) return null

  // 생몰연도는 미상이면 null (양수/음수 부호로 BC/AD 구분). 0 매직값 폐기.
  const born = toYear(p.birthYear, p.birthEra)
  const died = toYear(p.deathYear, p.deathEra)
  const isAliveFlag = !!p.isAlive

  // 잘못된 입력(NaN/Infinity) 방어 — 시각화가 깨지지 않도록 폐기
  if (born != null && !Number.isFinite(born)) return null
  if (died != null && !Number.isFinite(died)) return null

  const countryName = pickCountryName(p)
  const tenures = p.governmentTenures ?? []
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
      nameDisplayOrder: p.nameDisplayOrder,
      country: p.country,
    }) ||
    p.name ||
    '이름 없음'

  // 시대 분류용 활동연도: 재임 시작연도 평균 → 없으면 알려진 생몰값 평균.
  // (상단 가드로 born·died 중 최소 하나는 non-null 이라 분모 0 불가)
  // BC/고대 안전: 네이티브 Date(로컬 TZ) 대신 ISO 문자열 선두 연도를 직접 파싱.
  // (음수 확장연도 "-YYYYYY-..."도 parseInt가 부호 포함 처리 → 서버 birthYear 추출과 일치)
  const tenureYears = tenures
    .map((t) => (t.startDate ? parseInt(t.startDate, 10) : null))
    .filter((y): y is number => y !== null && !isNaN(y))
  // 생몰 둘 다 알면 중간값, 하나만 알면 그 값. (상단 가드로 최소 하나는 non-null)
  const lifeMidpoint =
    born != null && died != null ? (born + died) / 2 : born ?? died ?? 0
  const activityYear = tenureYears.length
    ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length
    : lifeMidpoint
  const era = yearOfEra(activityYear)

  // 수명: 생몰 둘 다 알 때만 정확. 출생만 알고 생존 중이면 현재 나이. 그 외(미상)는 null.
  const age =
    born != null && died != null
      ? Math.max(0, Math.abs(died - born))
      : born != null && isAliveFlag
        ? Math.max(0, CURRENT_YEAR - born)
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
    era,
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

/** 타임라인 배치용 시작연도 — 출생 미상이면 활동연도로 대체(항상 finite). */
export function bornForPlot(p: AdaptedPerson): number {
  return p.born ?? p.activityYear
}

/** 타임라인 배치용 종료연도 — 사망 미상이면 생존자는 현재, 그 외엔 활동연도. */
export function diedForPlot(p: AdaptedPerson): number {
  return p.died ?? (p.isAlive ? CURRENT_YEAR : p.activityYear)
}
