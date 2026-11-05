/**
 * 가문 구성원 통계 스트립.
 */
import type { Person } from '@/shared/api/person'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import {
  StatChip,
  StatLabel,
  StatsStrip,
  StatSub,
  StatValue,
} from './members.styles'

interface Props {
  persons: Person[]
}

/** BC/AD 와 연도를 부호 있는 정수로 변환 (BC면 음수). */
function signedYear(era: 'BC' | 'AD' | null | undefined, year: number): number {
  return era === 'BC' ? -year : year
}

function formatSignedYearLabel(signed: number): string {
  return signed < 0 ? `BC ${Math.abs(signed)}` : `${signed}`
}

function ageOf(p: Person): number | null {
  if (p.birthYear == null) return null
  const start = signedYear(p.birthEra ?? null, p.birthYear)
  if (p.isAlive) {
    const diff = new Date().getFullYear() - start
    return diff >= 0 ? diff : null
  }
  if (p.deathYear == null) return null
  const end = signedYear(p.deathEra ?? null, p.deathYear)
  return end >= start ? end - start : null
}

export function MembersStatsStrip({ persons }: Props) {
  const total = persons.length
  const ruling = persons.filter((p) => p.regnalName?.trim()).length
  const alive = persons.filter((p) => p.isAlive).length

  // 평균 수명
  const ages = persons
    .map(ageOf)
    .filter((v): v is number => v != null && v > 0)
  const avgAge =
    ages.length > 0 ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null

  // 시대 범위 (출생/전성기 최저 ~ 사망/전성기/현재 최고)
  const startYears: number[] = []
  const endYears: number[] = []
  for (const p of persons) {
    if (p.birthYear != null) {
      startYears.push(signedYear(p.birthEra ?? null, p.birthYear))
    } else if (p.floruitStartYear != null) {
      startYears.push(signedYear(p.floruitEra ?? null, p.floruitStartYear))
    }

    if (p.deathYear != null) {
      endYears.push(signedYear(p.deathEra ?? null, p.deathYear))
    } else if (!p.isAlive && p.floruitEndYear != null) {
      endYears.push(signedYear(p.floruitEra ?? null, p.floruitEndYear))
    } else if (!p.isAlive && p.birthYear == null && p.floruitStartYear != null) {
      endYears.push(signedYear(p.floruitEra ?? null, p.floruitStartYear))
    }
  }
  const minStart = startYears.length ? Math.min(...startYears) : null
  const maxEnd = endYears.length ? Math.max(...endYears) : null
  const eraStartLabel = minStart != null ? formatSignedYearLabel(minStart) : null
  const eraEndLabel =
    alive > 0
      ? '현재'
      : maxEnd != null
        ? formatSignedYearLabel(maxEnd)
        : null

  // 최장수
  let longestPerson: Person | null = null
  let longestAge = 0
  for (const p of persons) {
    const a = ageOf(p)
    if (a != null && a > longestAge) {
      longestAge = a
      longestPerson = p
    }
  }

  return (
    <StatsStrip>
      <StatChip $accent>
        <StatLabel>총</StatLabel>
        <StatValue $accent>{total.toLocaleString()}</StatValue>
        <StatSub>명</StatSub>
      </StatChip>
      {ruling > 0 && (
        <StatChip>
          <StatLabel>재위</StatLabel>
          <StatValue>{ruling.toLocaleString()}</StatValue>
          <StatSub>명</StatSub>
        </StatChip>
      )}
      {alive > 0 && (
        <StatChip>
          <StatLabel>생존</StatLabel>
          <StatValue>{alive.toLocaleString()}</StatValue>
          <StatSub>명</StatSub>
        </StatChip>
      )}
      {avgAge != null && (
        <StatChip>
          <StatLabel>평균 수명</StatLabel>
          <StatValue>{avgAge}</StatValue>
          <StatSub>세</StatSub>
        </StatChip>
      )}
      {eraStartLabel && eraEndLabel && (
        <StatChip>
          <StatLabel>시대</StatLabel>
          <StatValue>
            {eraStartLabel}
            <StatSub> – </StatSub>
            {eraEndLabel}
          </StatValue>
        </StatChip>
      )}
      {longestPerson && longestAge >= 60 && (
        <StatChip>
          <StatLabel>최장수</StatLabel>
          <StatValue>{getPersonDisplayName(longestPerson, true)}</StatValue>
          <StatSub>({longestAge}세)</StatSub>
        </StatChip>
      )}
    </StatsStrip>
  )
}
