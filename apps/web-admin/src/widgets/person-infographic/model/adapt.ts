import type { PersonInfographicItem } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  COUNTRY_REGION,
  ERAS,
  FIELDS,
  ISO_REGION,
  UNKNOWN_ERA,
} from './constants'
import type { AdaptedPerson } from './types'

/** 생존/사망연도 미상 시 폴백 기준 — 모듈 로드 1회. (인물마다 new Date() 생성 방지) */
const CURRENT_YEAR = new Date().getFullYear()

/** 2글자 이상인 국가 키워드만 긴 순서대로 부분일치 검사 (1글자 '오'·'조' 등이 '오스트리아'·'조지아'에 오매칭되는 것 방지) */
const SUBSTRING_COUNTRY_ENTRIES = Object.entries(COUNTRY_REGION)
  .filter(([k]) => k.length >= 2)
  .sort((a, b) => b[0].length - a[0].length)

export function getRegion(
  name?: string | null,
  isoCode?: string | null,
): string {
  const trimmed = name?.trim()
  if (trimmed && COUNTRY_REGION[trimmed]) return COUNTRY_REGION[trimmed]
  const iso = isoCode?.trim().toUpperCase()
  if (iso && ISO_REGION[iso]) return ISO_REGION[iso]
  if (trimmed) {
    for (const [k, v] of SUBSTRING_COUNTRY_ENTRIES) {
      if (trimmed.includes(k)) return v
    }
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
  'LOCAL_GOVERNOR',
  'DIPLOMAT',
  'ADVISOR',
  'ROYAL_FAMILY',
])

const SCIENCE_KEYWORDS =
  /과학|물리|화학|생물|수학|천문|의학|의사|한의|약학|공학|발명|박물학|지질|생리학|해부학|농학|역산|기상|식물학|동물학|유전학|컴퓨터/
const ART_KEYWORDS =
  /예술|화가|미술|조각|건축|음악|작곡|지휘자|연주|피아니스트|바이올리니스트|성악|가수|시인|소설|작가|극작|문학|문인|서예|무용|배우|영화|감독|만화가|사진가|디자이너/
const THOUGHT_KEYWORDS =
  /사상|철학|유학|성리학|실학|경학|양명학|학자|교수|역사가|사학|경제학|사회학|인류학|언어학|심리학|신학|종교|승려|선사|대사|스님|목사|신부|주교|추기경|교황|선지자|예언자|랍비|이맘|계몽|이론가|평론가|사상가|저술가|교육자/
const MILITARY_KEYWORDS =
  /군인|장군|제독|원수|장수|무장|무신|무관|사령관|지휘관|전사|기사|해군|육군|공군|용병|참모총장/
const POLITICAL_KEYWORDS =
  /정치|대통령|총리|수상|장관|의원|국왕|황제|군주|여왕|파라오|술탄|칸|쇼군|집정관|독재관|외교관|관료|문신|재상|승상|영의정|좌의정|우의정|독립운동|혁명가|활동가/

function matchFieldByText(text: string | null | undefined): string | null {
  if (!text) return null
  if (SCIENCE_KEYWORDS.test(text)) return '과학'
  if (ART_KEYWORDS.test(text)) return '예술'
  if (THOUGHT_KEYWORDS.test(text)) return '사상'
  if (MILITARY_KEYWORDS.test(text)) return '군사'
  if (POLITICAL_KEYWORDS.test(text)) return '정치'
  return null
}

/** Person → 분야 분류 (FIELDS 상수 기준: 정치·군사·사상·과학·예술·기타). */
export function getField(p: PersonInfographicItem): string {
  const tenures = p.governmentTenures ?? []
  if (p.sovereignReignCount > 0) return '정치'

  const types = tenures.map(
    (t) => t.positionType ?? t.positionDefinition?.positionType ?? '',
  )
  if (types.includes('MILITARY_COMMANDER')) return '군사'
  if (types.some((t) => POLITICAL_TYPES.has(t))) return '정치'

  const hints = p.careerHints
  if (hints) {
    if (hints.military) return '군사'
    if (hints.political) return '정치'
    if (hints.science) return '과학'
    if (hints.artist) return '예술'
    if (hints.academic) {
      if (hints.researchText && SCIENCE_KEYWORDS.test(hints.researchText)) {
        return '과학'
      }
      return '사상'
    }
    if (hints.religious) return '사상'
  }

  // 직업명·대표 직함 키워드 매칭
  const fromJob = matchFieldByText(p.jobTitle)
  if (fromJob) return fromJob

  const firstTenureTitle =
    tenures[0]?.positionDefinition?.title ?? tenures[0]?.title ?? null
  const fromTitle = matchFieldByText(firstTenureTitle)
  if (fromTitle) return fromTitle

  // 관직 재임 기록이 존재하면 정치·행정 인물로 분류
  if (tenures.length > 0) return '정치'

  // 생애 요약 첫 문장(최대 140자)에서 분야 키워드 보조 추출
  if (p.biography) {
    const bioLead = p.biography
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140)
    const fromBio = matchFieldByText(bioLead)
    if (fromBio) return fromBio
  }

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
  // 생몰연도는 미상이면 null (양수/음수 부호로 BC/AD 구분). 0 매직값 폐기.
  const born = toYear(p.birthYear, p.birthEra)
  const died = toYear(p.deathYear, p.deathEra)
  const floruitStart = toYear(p.floruitStartYear, p.floruitEra)
  const floruitEnd = toYear(p.floruitEndYear, p.floruitEra)
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

  // 시대 분류용 활동연도: 재임/재위 시작연도 평균 → 생몰 중점/단일값 → 활동시기(floruit) → 전면 미상이면 null.
  // 생몰 미상 인물도 폐기하지 않고 목록·검색·왕조·연도 미상 세기에서 누락되지 않게 보존한다.
  const tenureYears = tenures
    .map((t) => (t.startDate ? parseInt(t.startDate, 10) : null))
    .filter((y): y is number => y !== null && Number.isFinite(y))

  const floruitMidpoint =
    floruitStart != null && floruitEnd != null
      ? (floruitStart + floruitEnd) / 2
      : (floruitStart ?? floruitEnd ?? null)

  const lifeMidpoint =
    born != null && died != null
      ? (born + died) / 2
      : (born ?? died ?? floruitMidpoint)

  const activityYear: number | null = tenureYears.length
    ? tenureYears.reduce((a, b) => a + b, 0) / tenureYears.length
    : lifeMidpoint

  const era = activityYear != null ? yearOfEra(activityYear) : UNKNOWN_ERA

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
    p.jobTitle ||
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

  // 검색 대상 결합 — 표시명과 다를 수 있는 원본 이름/성/별호/직업명까지 포함해 누락 방지.
  const searchText = [
    name,
    p.name,
    p.surname,
    p.middleName,
    regnal,
    countryName,
    p.dynasty?.name,
    primaryTitle,
    p.jobTitle,
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
    region: getRegion(countryName, p.country?.isoCode),
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

/** 타임라인 배치용 시작연도 — 출생 미상이면 활동연도로 대체. */
export function bornForPlot(p: AdaptedPerson): number {
  return p.born ?? p.activityYear ?? 0
}

/** 타임라인 배치용 종료연도 — 사망 미상이면 생존자는 현재, 그 외엔 활동연도. */
export function diedForPlot(p: AdaptedPerson): number {
  return p.died ?? (p.isAlive ? CURRENT_YEAR : (p.activityYear ?? 0))
}
