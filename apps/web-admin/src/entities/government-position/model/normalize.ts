/**
 * 각 엔드포인트의 tenure/업적 응답 모양 → 표준 `Tenure`/`TenureAchievement`로의 변환.
 *
 * 어떤 응답도 모든 필드를 다 주지 않으므로 입력은 전부 optional인 느슨한 union으로 받고,
 * 없는 필드는 null/빈 배열로 채운다(graceful degrade). 분류·왕명 추출은 단일 출처
 * (`categorizePosition`, `regnalNameFromNotes`)에 위임한다.
 */
import { categorizePosition } from './categorize'
import { regnalNameFromNotes } from './regnal-name'
import type {
  Tenure,
  TenureAchievement,
  TenureCountryRef,
  TenureKind,
  TenurePersonRef,
} from './types'

export interface RawAchievementLike {
  id?: string | null
  title?: string | null
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  orderNum?: number | null
  showOnEventsPage?: boolean | null
  eventId?: string | null
  event?: {
    id?: string | null
    title?: string | null
    deletedAt?: string | null
  } | null
}

export interface RawTenureLike {
  id?: string | null
  recordKind?: string | null
  personId?: string | null
  person?: {
    id?: string | null
    name?: string | null
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
  } | null
  positionType?: string | null
  positionDefinition?: {
    positionType?: string | null
    title?: string | null
  } | null
  title?: string | null
  appointmentMethod?: string | null
  endReason?: string | null
  endReasonDetail?: string | null
  regnalName?: string | null
  regnalNumber?: number | null
  termNumber?: number | null
  subTermNumber?: number | null
  dynastyOrdinal?: number | null
  notes?: string | null
  startDate?: string | null
  endDate?: string | null
  country?: { id?: string | null; name?: string | null } | null
  historicalCountry?: { id?: string | null; name?: string | null } | null
  cabinetId?: string | null
  cabinet?: { id?: string | null } | null
  achievements?: RawAchievementLike[] | null
}

function normalizeKind(
  recordKind: string | null | undefined,
  fallback: TenureKind,
): TenureKind {
  if (recordKind === 'SOVEREIGN_REIGN') return 'SOVEREIGN_REIGN'
  if (recordKind === 'TENURE') return 'TENURE'
  return fallback
}

function normalizeCountry(
  raw: { id?: string | null; name?: string | null } | null | undefined,
): TenureCountryRef | null {
  if (!raw) return null
  return { id: raw.id ?? null, name: raw.name ?? null }
}

function normalizePerson(
  raw: RawTenureLike['person'],
): TenurePersonRef | null {
  if (!raw) return null
  return {
    id: raw.id ?? null,
    name: raw.name ?? null,
    surname: raw.surname ?? null,
    middleName: raw.middleName ?? null,
    nameDisplayOrder: raw.nameDisplayOrder ?? null,
    profileImageUrl: raw.profileImageUrl ?? null,
  }
}

export function normalizeAchievement(
  raw: RawAchievementLike,
): TenureAchievement {
  const event = raw.event
  return {
    id: String(raw.id ?? ''),
    title: raw.title ?? null,
    description: raw.description ?? null,
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    orderNum: raw.orderNum ?? null,
    showOnEventsPage: raw.showOnEventsPage ?? null,
    eventId: raw.eventId ?? null,
    event: event
      ? {
          id: String(event.id ?? ''),
          title: event.title ?? null,
          deletedAt: event.deletedAt ?? null,
        }
      : null,
  }
}

/**
 * 느슨한 tenure 응답 → 표준 Tenure.
 * @param raw 엔드포인트별 응답 객체(필드 일부만 있어도 됨)
 * @param fallbackKind recordKind가 없을 때의 종류. 인물 상세는 governmentTenures→'TENURE',
 *                     sovereignReigns→'SOVEREIGN_REIGN'로 호출부가 명시한다.
 */
export function normalizeTenure(
  raw: RawTenureLike,
  fallbackKind: TenureKind = 'TENURE',
): Tenure {
  const kind = normalizeKind(raw.recordKind, fallbackKind)
  const positionType = raw.positionType ?? raw.positionDefinition?.positionType ?? null
  const positionTitle = raw.positionDefinition?.title ?? raw.title ?? null
  const regnalName =
    raw.regnalName?.trim() || regnalNameFromNotes(raw.notes) || null
  const ordinal = raw.regnalNumber ?? raw.termNumber ?? null

  return {
    id: String(raw.id ?? ''),
    kind,
    personId: raw.personId ?? raw.person?.id ?? null,
    person: normalizePerson(raw.person),
    positionType,
    positionCategory: categorizePosition({
      kind,
      positionType,
      positionTitle,
      appointmentMethod: raw.appointmentMethod,
    }),
    positionTitle,
    regnalName,
    ordinal,
    termNumber: raw.termNumber ?? null,
    subTermNumber: raw.subTermNumber ?? null,
    regnalNumber: raw.regnalNumber ?? null,
    dynastyOrdinal: raw.dynastyOrdinal ?? null,
    country: normalizeCountry(raw.country),
    historicalCountry: normalizeCountry(raw.historicalCountry),
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    appointmentMethod: raw.appointmentMethod ?? null,
    endReason: raw.endReason ?? null,
    endReasonDetail: raw.endReasonDetail ?? null,
    notes: raw.notes ?? null,
    cabinetId: raw.cabinetId ?? raw.cabinet?.id ?? null,
    achievements: Array.isArray(raw.achievements)
      ? raw.achievements.map(normalizeAchievement)
      : [],
  }
}
