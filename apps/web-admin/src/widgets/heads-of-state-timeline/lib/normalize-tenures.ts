/**
 * `getTenuresByCountry` 응답을 타임라인 막대(TenureBar)로 변환.
 *
 * 응답에는 두 종류의 행이 섞여 들어온다 — `recordKind: 'TENURE'`(GovernmentPositionTenure)와
 * `'SOVEREIGN_REIGN'`(SovereignReign). 같은 시기·같은 인물의 재임이 두 종류로 중복될 수 있으니
 * `country-detail`의 dedup 로직과 동일한 기준(인물ID + 시작일 같으면 SovereignReign 우선)으로 합친다.
 */

import { categorizePosition } from '@/entities/government-position/model/categorize'
import { regnalNameFromNotes } from '@/entities/government-position/model/regnal-name'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { toJulianYear } from './time-scale'

/** 분류 타입은 엔티티 단일 출처(PositionCategory)의 별칭 — 기존 import 경로 유지용 */
export type PositionTypeCategory = PositionCategory

/**
 * `getTenuresByCountry` 가 돌려주는 원시 레코드의 — 이 위젯이 읽는 — 필드만 추린 타입.
 * 응답은 `TENURE`(행정부 재임)와 `SOVEREIGN_REIGN`(재위 전용) 두 종류가 섞여 들어오므로
 * 두 스키마의 합집합을 느슨하게 표현한다(둘 다 optional).
 */
export interface RawTenureRecord {
  id: string
  recordKind?: 'TENURE' | 'SOVEREIGN_REIGN' | string | null
  personId?: string | null
  person?: {
    id?: string | null
    name?: string | null
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    country?: { defaultNameDisplayOrder?: string | null } | null
  } | null
  regnalName?: string | null
  positionType?: string | null
  positionDefinition?: { positionType?: string | null; title?: string | null } | null
  title?: string | null
  appointmentMethod?: string | null
  regnalNumber?: number | null
  termNumber?: number | null
  notes?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface TenureBar {
  /** TENURE.id 또는 SOVEREIGN_REIGN.id */
  id: string
  recordKind: 'TENURE' | 'SOVEREIGN_REIGN'
  personId: string | null
  personName: string | null
  /** 왕명·교황명·묘호 등 표시용 */
  regnalName: string | null
  /** 직책 표시명 (대통령·국왕 등) */
  positionTitle: string | null
  /** 직책 분류 (색상·범례용) */
  positionCategory: PositionTypeCategory
  /** 대수/재위번호 (예: 20대, 14세) */
  ordinal: number | null
  /** ISO 시작일 */
  startDate: string
  /** ISO 종료일 — null이면 재임 중 */
  endDate: string | null
  /** 시작일의 소수점 연도 — normalize 시 1회 계산해 렌더 핫패스의 재파싱을 없앤다 */
  startJulian: number
  /** 종료일의 소수점 연도 — null이면 재임 중(상한 미정) */
  endJulian: number | null
}

function getPositionType(t: RawTenureRecord): string | null {
  return t.positionType ?? t.positionDefinition?.positionType ?? null
}

/**
 * 수장 비교 타임라인에 표시할 직위 유형 — 국가원수(HEAD_OF_STATE)·정부수반(HEAD_OF_GOVERNMENT)만.
 * 즉 황제·왕·대통령 등 국가원수와 총리·수상 등 정부수반만 남기고, 작위(공작·백작 등 ROYAL_NOBLE_TITLE)·
 * 왕세자(HEIR_APPARENT)·섭정(REGENT)·장관(CABINET_MINISTER) 등 비(非)수장 직책은 제외한다.
 * (SovereignReign 재위 기록은 직위 유형이 없으므로 별도로 항상 포함 — 호출부에서 처리.)
 */
const HEAD_POSITION_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

function isHeadPosition(t: RawTenureRecord): boolean {
  const pt = getPositionType(t)
  return pt != null && HEAD_POSITION_TYPES.has(pt)
}

function getPositionTitle(t: RawTenureRecord): string | null {
  return t.positionDefinition?.title ?? t.title ?? null
}

function getPersonName(t: RawTenureRecord): string | null {
  const p = t.person
  if (!p) return null
  return (
    getPersonDisplayName({
      name: p.name ?? '',
      surname: p.surname,
      middleName: p.middleName,
      nameDisplayOrder: p.nameDisplayOrder,
      country: p.country ?? null,
    }) || null
  )
}

/** 직책 분류 — 엔티티 단일 출처(categorizePosition)에 위임 */
function categorize(tenure: RawTenureRecord): PositionTypeCategory {
  return categorizePosition({
    kind: tenure.recordKind,
    positionType: getPositionType(tenure),
    positionTitle: getPositionTitle(tenure),
    appointmentMethod: tenure.appointmentMethod,
  })
}

function ordinalOf(t: RawTenureRecord): number | null {
  if (typeof t.regnalNumber === 'number') return t.regnalNumber
  if (typeof t.termNumber === 'number') return t.termNumber
  return null
}

/** SovereignReign 같은 시기 TENURE 중복 제거 — country-detail 로직과 동일 기준 */
function isSamePersonStart(a: RawTenureRecord, b: RawTenureRecord): boolean {
  const pidA = a.personId ?? a.person?.id
  const pidB = b.personId ?? b.person?.id
  if (!pidA || !pidB || pidA !== pidB) return false
  const dA = a.startDate ? new Date(a.startDate).getTime() : null
  const dB = b.startDate ? new Date(b.startDate).getTime() : null
  if (dA == null || dB == null || Number.isNaN(dA) || Number.isNaN(dB)) return false
  // 같은 날짜로 본다 (시간 무시)
  return Math.abs(dA - dB) < 24 * 60 * 60 * 1000
}

/** id·startDate가 있는 레코드만 신뢰 — 그 외(부분 응답·null)는 버린다 */
function isUsableRecord(r: unknown): r is RawTenureRecord {
  return (
    !!r &&
    typeof r === 'object' &&
    typeof (r as RawTenureRecord).id === 'string' &&
    typeof (r as RawTenureRecord).startDate === 'string'
  )
}

export function normalizeTenures(rawList: unknown): TenureBar[] {
  if (!Array.isArray(rawList)) return []

  const records = rawList.filter(isUsableRecord)
  // SovereignReign(재위)은 항상, 일반 재임은 국가원수·정부수반만 — 작위·왕세자·섭정·장관 등 제외
  const tenures = records.filter(
    (r) => r.recordKind !== 'SOVEREIGN_REIGN' && isHeadPosition(r),
  )
  const sovereigns = records.filter((r) => r.recordKind === 'SOVEREIGN_REIGN')

  // SovereignReign이 있으면 동일 시기 TENURE 제거
  const filteredTenures = tenures.filter(
    (t) => !sovereigns.some((s) => isSamePersonStart(t, s)),
  )

  const all = [...sovereigns, ...filteredTenures]

  return all
    .map((t) => {
      const recordKind: 'TENURE' | 'SOVEREIGN_REIGN' =
        t.recordKind === 'SOVEREIGN_REIGN' ? 'SOVEREIGN_REIGN' : 'TENURE'
      const regnalName =
        t.regnalName?.trim() || regnalNameFromNotes(t.notes) || null
      const startDate = t.startDate as string
      const endDate = t.endDate ?? null
      return {
        id: t.id,
        recordKind,
        personId: t.personId ?? t.person?.id ?? null,
        personName: getPersonName(t),
        regnalName,
        positionTitle: getPositionTitle(t),
        positionCategory: categorize(t),
        ordinal: ordinalOf(t),
        startDate,
        endDate,
        startJulian: toJulianYear(startDate),
        endJulian: endDate ? toJulianYear(endDate) : null,
      } satisfies TenureBar
    })
    .sort((a, b) => a.startJulian - b.startJulian)
}
