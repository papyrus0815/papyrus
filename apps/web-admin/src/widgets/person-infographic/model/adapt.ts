import type { Person } from '@/entities/person/api'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { COUNTRY_REGION, ERAS } from './constants'
import type { AdaptedPerson } from './types'

export function getRegion(name?: string | null): string {
  if (!name) return '기타'
  if (COUNTRY_REGION[name]) return COUNTRY_REGION[name]
  for (const [k, v] of Object.entries(COUNTRY_REGION)) {
    if (name.includes(k) || k.includes(name)) return v
  }
  return '기타'
}

export function getField(p: Person): string {
  const reigns: any[] = (p as any).sovereignReigns ?? []
  const tenures: any[] = (p as any).governmentTenures ?? []
  if (reigns.length > 0) return '정치'
  const types = tenures.map((t) => t.positionType as string)
  if (types.includes('MILITARY_COMMANDER')) return '군사'
  if (
    types.some((t) =>
      ['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT', 'CABINET_MINISTER', 'LEGISLATOR', 'JUDICIARY'].includes(t),
    )
  )
    return '정치'
  return '정치'
}

export function toYear(y?: number | null, era?: string | null): number {
  if (!y) return 0
  return era === 'BC' ? -y : y
}

export function yearOfEra(y: number) {
  for (const e of ERAS) if (y >= e.from && y < e.to) return e
  return ERAS[ERAS.length - 1]
}

export function adapt(p: Person): AdaptedPerson | null {
  if (!p.birthYear && !p.deathYear) return null
  const born = toYear(p.birthYear, p.birthEra)
  const isAliveFlag = !!p.isAlive
  const died = isAliveFlag
    ? new Date().getFullYear()
    : toYear(p.deathYear, p.deathEra) || new Date().getFullYear()
  const countryName = (p as any).country?.name ?? ''
  const tenures: any[] = (p as any).governmentTenures ?? []
  const reigns: any[] = (p as any).sovereignReigns ?? []
  const raw = (p as any).influence
  const influence =
    typeof raw === 'number' ? Math.max(0, Math.min(100, raw)) : 0
  const name =
    getPersonDisplayName({
      name: p.name,
      surname: (p as any).surname,
      middleName: (p as any).middleName,
      country: (p as any).country,
    }) ||
    p.name ||
    '이름 없음'

  // 시대 분류용 활동연도: 재임 시작연도 평균 → 없으면 생몰 중간값
  const tenureYears = tenures
    .map((t: any) =>
      t.startDate ? new Date(t.startDate).getFullYear() : null,
    )
    .filter((y: number | null): y is number => y !== null && !isNaN(y))
  const activityYear = tenureYears.length
    ? tenureYears.reduce((a: number, b: number) => a + b, 0) /
      tenureYears.length
    : (born + died) / 2

  const age =
    p.birthYear && (p.deathYear || isAliveFlag)
      ? Math.max(0, Math.abs(died - born))
      : null

  const regnal = (p as any).regnalName as string | null | undefined
  const firstTenure = tenures[0]
  const primaryTitle: string | null =
    (regnal && regnal.trim()) ||
    firstTenure?.positionDefinition?.title ||
    firstTenure?.title ||
    null

  const isMonarch = reigns.length > 0 || !!(regnal && regnal.trim())
  const isHeadOfState = tenures.some(
    (t: any) =>
      t.positionType === 'HEAD_OF_STATE' ||
      t.positionDefinition?.positionType === 'HEAD_OF_STATE',
  )

  const bioRaw = (p as any).biography
  const biography =
    typeof bioRaw === 'string' && bioRaw.trim() ? bioRaw.trim() : null

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
    faction: (p as any).dynasty?.name ?? '',
    influence,
    profileImageUrl: (p as any).profileImageUrl ?? null,
    isMonarch,
    isHeadOfState,
    primaryTitle,
    biography,
    isAlive: isAliveFlag,
  }
}

/** 이름 해시 → hue (썸네일 폴백 그라데이션용) */
export function hueFrom(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360
  return h
}
