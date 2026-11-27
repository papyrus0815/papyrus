/**
 * 기관·부대 전용 직책 정의를 확보한다 — 있으면 그 id, 없으면 그 기관·부대 소속으로 DB에 등록하고 id.
 *
 * 서버는 2026-11-27부터 재임에 **DB 직책 정의**를 요구한다(이름만 오면 DB 직책으로 해석하고, 없으면 400).
 * 부대 지휘관 목록·내각 일괄 각료처럼 보직 이름이 그 기관·부대에서 정해지는 입력은, 저장하기 전에
 * 그 이름을 기관·부대의 직책으로 DB에 등록해 둔다 — 일반 정의('각료'·'군 지휘관')에 이름만 문자열로
 * 남기지 않기 위해서다. 기관·부대 전용 정의는 다른 나라 피커로 새지 않는다(서버가 소속 국가로 스코프).
 */
import { personCareerApi, type PickerPositionDefinition } from '@/shared/api/person-career'

export interface EnsureOwnedPositionDefinitionParams {
  title: string
  positionType: string
  administrationDepartmentId?: string | null
  militaryUnitId?: string | null
  /** 이미 받아 둔 정의 목록 — 있으면 같은 이름을 먼저 찾는다(요청 절약·중복 방지) */
  pool?: ReadonlyArray<PickerPositionDefinition & { isGeneric?: boolean | null }>
}

function sameTitle(left: string | null | undefined, right: string): boolean {
  return (left ?? '').replace(/\s+/g, '') === right.replace(/\s+/g, '')
}

export async function ensureOwnedPositionDefinition({
  title,
  positionType,
  administrationDepartmentId,
  militaryUnitId,
  pool = [],
}: EnsureOwnedPositionDefinitionParams): Promise<string> {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) throw new Error('직책 이름이 비어 있습니다.')
  if (!administrationDepartmentId && !militaryUnitId) {
    throw new Error('기관이나 부대가 정해져야 그 소속 직책으로 등록할 수 있습니다.')
  }

  const existing = pool.find(
    (definition) =>
      definition.isGeneric !== true &&
      sameTitle(definition.title, trimmedTitle) &&
      (militaryUnitId
        ? definition.militaryUnitId === militaryUnitId
        : definition.administrationDepartmentId === administrationDepartmentId),
  )
  if (existing) return existing.id

  const created = (await personCareerApi.createPositionDefinition({
    title: trimmedTitle,
    positionType,
    isMonarchical: false,
    administrationDepartmentId: militaryUnitId ? null : (administrationDepartmentId ?? null),
    militaryUnitId: militaryUnitId ?? null,
  })) as { id?: string } | null
  if (!created?.id) throw new Error(`직책 '${trimmedTitle}'을(를) DB에 등록하지 못했습니다.`)
  return created.id
}
