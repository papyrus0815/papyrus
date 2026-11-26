/**
 * 사건 → 조약 초안 — 상세 '조약' 섹션과 등록 모달의 '맺어진 조약' 칸이 같은 규칙을 쓴다.
 * (예전엔 detail-treaties 안에만 있어 등록 단계에서 조약을 만들 길이 없었다.)
 */
import {
  type CreateTreatySignatoryNested,
  type TreatyDto,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { parseIsoDateParts } from '@/shared/lib/iso-date'

/**
 * 참여국 역할 → 조약 참여 유형.
 * 중재·관찰은 조약에도 같은 개념이 있어 그대로 옮기고, 나머지는 서명국으로 본다
 * (보증국·비준국은 사건 역할로 표현되지 않으므로 조약 지면에서 고친다).
 */
export function participationTypeFromRole(
  role: string | null | undefined,
): CreateTreatySignatoryNested['participationType'] {
  if (role === 'MEDIATOR') return 'MEDIATOR'
  if (role === 'OBSERVER') return 'OBSERVER'
  return 'SIGNATORY'
}

/** 제목에서 조약 유형을 추정 — 틀려도 조약 지면에서 한 번에 고칠 수 있는 값이다. */
export function guessTreatyType(title: string): TreatyType {
  if (/불가침/.test(title)) return 'NON_AGGRESSION'
  if (/동맹/.test(title)) return 'ALLIANCE'
  if (/통상|무역|교역/.test(title)) return 'TRADE'
  if (/강화|평화|종전/.test(title)) return 'PEACE'
  if (/국경/.test(title)) return 'BORDER'
  if (/군축/.test(title)) return 'DISARMAMENT'
  if (/영토|할양/.test(title)) return 'TERRITORIAL'
  if (/비밀/.test(title)) return 'SECRET'
  if (/우호/.test(title)) return 'FRIENDSHIP'
  return 'OTHER'
}

/** 사건 제목에서 조약명 후보 — "…조약 체결"의 꼬리를 떼어 이름만 남긴다. */
export function treatyNameFromEventTitle(title: string): string {
  return title.replace(/\s*(체결|조인|서명|선포)\s*$/u, '').trim() || title
}

function normalizeTreatyTitleForMatch(raw: string | null | undefined): string {
  if (!raw) return ''
  return treatyNameFromEventTitle(raw)
    .replace(/\([^)]*\)/gu, '')
    .replace(/\s+/gu, '')
    .toLowerCase()
}

/**
 * 사건에서 새 조약을 만들기 전에 동일 명칭·시기의 조약이 이미 있는지 찾는다.
 * 중복 생성(`allowDuplicateSignDate: true`)으로 같은 조약이 2벌씩 생기는 문제를 막는다.
 */
export async function findExistingMatchingTreaty(
  candidateName: string,
  targetDateIso?: string | null,
): Promise<TreatyDto | null> {
  if (typeof treatyApi.getAll !== 'function') return null
  const normalizedTarget = normalizeTreatyTitleForMatch(candidateName)
  if (normalizedTarget.length < 2) return null

  const targetYear = parseIsoDateParts(targetDateIso)?.year ?? null
  try {
    const response = await treatyApi.getAll({
      search: candidateName.trim(),
      take: 30,
    })
    const candidates = response?.items ?? []
    for (const item of candidates) {
      const nameNorm = normalizeTreatyTitleForMatch(item.name)
      const aliasNorm = normalizeTreatyTitleForMatch(item.alias)
      const exactTitleMatch =
        nameNorm === normalizedTarget ||
        (aliasNorm.length >= 2 && aliasNorm === normalizedTarget)
      if (!exactTitleMatch) continue

      if (targetYear !== null) {
        const itemYear = parseIsoDateParts(item.signDate)?.year ?? null
        if (itemYear !== null && Math.abs(itemYear - targetYear) > 2) {
          continue
        }
      }
      return item
    }
  } catch {
    // 네트워크 실패 시 생성 흐름 자체를 막지는 않는다
  }
  return null
}

/** 참여국 줄 → 서명국 초안 */
export function signatoriesFromParticipants(
  participants: ReadonlyArray<{
    countryId?: string | null
    historicalCountryId?: string | null
    role?: string | null
    roleDescription?: string | null
  }>,
): CreateTreatySignatoryNested[] {
  return participants.map((row) =>
    row.historicalCountryId
      ? {
          historicalCountryId: row.historicalCountryId,
          participationType: participationTypeFromRole(row.role),
          note: row.roleDescription ?? null,
        }
      : {
          countryId: row.countryId ?? undefined,
          participationType: participationTypeFromRole(row.role),
          note: row.roleDescription ?? null,
        },
  )
}
