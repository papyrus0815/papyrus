/**
 * 「외무장관」을 골라 두고 이름만 「외무대신」으로 — 국가별 직함 명칭.
 *
 * 카탈로그에 외무장관은 있는데 외무대신은 없다. 그렇다고 고른 정의 위에 다른 표기를
 * 덧씌우면 **저장은 되고 화면엔 안 나온다** — 표시 지면 20여 곳이
 * `positionDefinition?.title ?? title` 순서라 정의 이름이 언제나 이긴다.
 * 전역 정의(외무장관)의 title을 직접 고치는 것은 더 나쁘다. 그 정의를 쓰는 다른 나라
 * 재임까지 전부 이름이 바뀐다.
 *
 * 그래서 **복제 + 국가 스코프**로 간다. 원본은 그대로 두고, 같은 유형·같은 카테고리를
 * 가진 새 정의를 그 나라 전용으로 만든다(스코프 행이 1개 이상이면 그 국가에서만 노출 —
 * government.prisma의 GovernmentPositionDefinitionScope 규약). 그러면 다음부터 그
 * 나라 피커에 외무대신이 뜨고, 재임 통계도 외무대신으로 묶인다.
 *
 * ⚠️ 원본 정의에 스코프를 붙이면 안 된다. 전역 정의에 스코프가 하나라도 붙는 순간
 *    그 정의는 나머지 모든 나라에서 사라진다.
 */
import { personCareerApi } from '@/shared/api/person-career'

export type ScopedDefinitionSource = {
  id: string
  title?: string | null
  positionType?: string | null
}

export type ScopedDefinitionPoolItem = {
  id: string
  title?: string | null
  name?: string | null
  positionType?: string | null
}

export type DeriveScopedDefinitionParams = {
  /** 이름만 바꿀 원본 정의 */
  source: ScopedDefinitionSource
  /** 이 나라에서 부르는 이름 */
  newTitle: string
  countryId?: string | null
  historicalCountryId?: string | null
  /** 현재 피커에 떠 있는 정의들 — 같은 이름이 이미 있으면 새로 만들지 않는다 */
  pool: ScopedDefinitionPoolItem[]
}

export type DeriveScopedDefinitionResult = {
  id: string
  title: string
  /** 이미 있던 정의를 그대로 골랐는가 */
  reused: boolean
}

export class ScopedDefinitionError extends Error {}

/**
 * 이 나라 이름으로 부를 정의를 확보한다 — 있으면 고르고, 없으면 복제해서 만든다.
 */
export async function deriveCountryScopedPositionDefinition({
  source,
  newTitle,
  countryId,
  historicalCountryId,
  pool,
}: DeriveScopedDefinitionParams): Promise<DeriveScopedDefinitionResult> {
  const title = newTitle.trim()
  if (!title) {
    throw new ScopedDefinitionError('이 나라에서 부르는 이름을 입력해 주세요.')
  }
  if (!countryId && !historicalCountryId) {
    throw new ScopedDefinitionError(
      '국가를 먼저 골라야 그 나라 전용 직책으로 담을 수 있습니다.',
    )
  }
  const sourceTitle = (source.title ?? '').trim()
  if (title === sourceTitle) {
    return { id: source.id, title: sourceTitle, reused: true }
  }

  /*
   * 같은 이름이 이 나라 피커에 이미 있으면 그걸 고른다. 같은 나라에 외무대신 정의가
   * 두 개 생기면 역대 외무대신이 두 목록으로 갈라진다.
   */
  const existing = pool.find((candidate) => {
    const candidateTitle = (candidate.title ?? candidate.name ?? '').trim()
    if (candidateTitle !== title) return false
    if (!source.positionType || !candidate.positionType) return true
    return candidate.positionType === source.positionType
  })
  if (existing) {
    return { id: existing.id, title, reused: true }
  }

  /*
   * 피커 응답은 id·title·유형 정도만 들고 온다. 카테고리·설명·군주 여부까지 그대로
   * 물려주려면 원본을 한 번 읽어야 한다 — 유형만 같고 카테고리가 빈 정의를 만들면
   * 중앙부처 연결이 끊긴 채 카탈로그에 남는다.
   */
  const full = (await personCareerApi.getPositionDefinitionById(source.id)) as
    | (ScopedDefinitionSource & {
        titleEn?: string | null
        titleLocal?: string | null
        description?: string | null
        rank?: number | null
        isMonarchical?: boolean | null
        categoryId?: string | null
        organizationId?: string | null
      })
    | null

  const created = (await personCareerApi.createPositionDefinition({
    title,
    titleEn: full?.titleEn ?? null,
    titleLocal: full?.titleLocal ?? null,
    positionType: (full?.positionType ?? source.positionType ?? 'OTHER') as string,
    description: full?.description ?? null,
    rank: full?.rank ?? null,
    isMonarchical: full?.isMonarchical ?? false,
    categoryId: full?.categoryId ?? null,
    organizationId: full?.organizationId ?? null,
  })) as { id?: string } | null

  if (!created?.id) {
    throw new ScopedDefinitionError('직책을 만들지 못했습니다.')
  }

  /*
   * 역사 우선 + 현대 dual-fill — 레포 공통 규약. 둘 다 있으면 둘 다 적는다.
   * 스코프가 한 행이라도 붙어야 이 정의가 다른 나라 피커를 오염시키지 않는다.
   *
   * 스코프를 못 붙이면 만들다 만 정의가 **전역**(스코프 0행)으로 남아 모든 나라 피커에
   * 외무대신이 뜬다. 되돌릴 수 없는 상태를 남기느니 방금 만든 정의를 지우고 실패한다.
   */
  try {
    await personCareerApi.addPositionDefinitionScope(created.id, {
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
      note: sourceTitle ? `「${sourceTitle}」의 이 나라 명칭` : null,
    })
  } catch {
    try {
      await personCareerApi.deletePositionDefinition(created.id)
    } catch {
      // 이미 실패한 경로 — 정리까지 실패해도 원래 오류를 덮지 않는다
    }
    throw new ScopedDefinitionError(
      '이 나라 전용으로 지정하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    )
  }

  return { id: created.id, title, reused: false }
}
