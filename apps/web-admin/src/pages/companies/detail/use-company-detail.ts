import {
  queryOptions,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'

import {
  type CompanyDetail,
  type UpdateCompanyInput,
  companyApi,
} from '@/shared/api/company'
import { notify } from '@/shared/ui/toast'

/* ───────────────────────── Query keys ───────────────────────── */

export const companyKeys = {
  root: ['companies'] as const,
  lists: () => ['companies', 'list'] as const,
  detail: (id: string) => ['companies', 'detail', id] as const,
}

export function companyDetailQuery(id: string) {
  return queryOptions({
    queryKey: companyKeys.detail(id),
    queryFn: async (): Promise<CompanyDetail> => {
      const company = await companyApi.getById(id)
      if (!company) {
        const err = new Error('기업을 찾을 수 없습니다') as Error & {
          status?: number
        }
        err.status = 404
        throw err
      }
      return company
    },
  })
}

/**
 * 기업 상세 — 로딩은 Suspense, 에러는 ErrorBoundary로 위임(사건 상세와 동일 패턴).
 */
export function useCompanyDetail(id: string): CompanyDetail {
  const { data } = useSuspenseQuery(companyDetailQuery(id))
  return data
}

/* ───────────────────────── Mutation (부분 업데이트) ───────────────────────── */

/**
 * 목록 표시에 영향 있는 필드 — 변경 시 목록 캐시도 무효화.
 * 본문/연혁/시설 등은 목록에 안 보이므로 인라인 편집 빈도가 높은 흐름에서
 * 불필요한 목록 refetch를 유발하지 않는다.
 */
const LIST_FIELDS: ReadonlyArray<keyof UpdateCompanyInput> = [
  'name',
  'shortName',
  'status',
  'logoUrl',
  'foundedAt',
  'dissolvedAt',
  'countryId',
  'historicalCountryId',
]

/**
 * 낙관적으로 그대로 덮어써도 되는 스칼라 필드(파생 객체 없음).
 * countryId/founderId 등 *파생 요약 객체*(country/founder)를 동반하는 FK는
 * 이름 해소가 필요해 낙관 대상에서 제외 — refetch로만 반영(이 v1에서는 인라인
 * 편집 대상도 아님).
 */
const OPTIMISTIC_SCALARS = [
  'name',
  'shortName',
  'localName',
  'description',
  'status',
  'foundedAt',
  'dissolvedAt',
  'websiteUrl',
  'logoUrl',
  'financialCommentary',
] as const satisfies ReadonlyArray<keyof UpdateCompanyInput>

function buildOptimistic(
  prev: CompanyDetail,
  patch: UpdateCompanyInput,
): CompanyDetail | null {
  let changed = false
  const next: CompanyDetail = { ...prev }
  const p = patch as Record<string, unknown>
  for (const key of OPTIMISTIC_SCALARS) {
    if (key in patch) {
      ;(next as unknown as Record<string, unknown>)[key] = p[key] ?? null
      changed = true
    }
  }
  return changed ? next : null
}

function patchAffectsList(patch: UpdateCompanyInput): boolean {
  return LIST_FIELDS.some((key) => key in patch)
}

/**
 * 기업 부분 업데이트 — `UpdateCompanyInput`의 필드는 모두 optional이라 호출 측이
 * 변경된 필드만 담아 보내면 서버가 나머지는 건드리지 않는다.
 *
 * 배열 필드(histories·facilities·categories)는 서버가 delete-and-recreate라
 * 호출 측은 항상 *전체 배열*을 보낼 것. 이 배열들은 각 모듈이 로컬 state로 들고
 * 있다가 변경 시마다 전체를 PUT하고, 성공 시 invalidate→refetch로 서버 정본(파생
 * 이름 포함)을 다시 동기화한다(낙관 갱신은 스칼라만).
 *
 * 성공 시그널은 SaveStatus 인디케이터로만 — 토스트는 실패만(인라인 편집은 patch
 * 빈도가 높아 매번 toast가 뜨면 폭격).
 */
export function useCompanyMutation(id: string) {
  const queryClient = useQueryClient()
  const detailKey = companyKeys.detail(id)
  const mutationKey = ['company-detail-mutation', id] as const

  return useMutation({
    mutationKey,
    mutationFn: (patch: UpdateCompanyInput) => companyApi.update(id, patch),
    onMutate: async (patch: UpdateCompanyInput) => {
      const previous = queryClient.getQueryData<CompanyDetail>(detailKey)
      if (previous) {
        const next = buildOptimistic(previous, patch)
        if (next) {
          await queryClient.cancelQueries({ queryKey: detailKey })
          queryClient.setQueryData<CompanyDetail>(detailKey, next)
        }
      }
      return { previous }
    },
    onSuccess: (_data, patch) => {
      // 같은 기업의 다른 mutation이 아직 in-flight면 detail refetch를 미룬다 —
      // 마지막 mutation만 최종 reconcile해 역행 깜빡임 방지.
      if (queryClient.isMutating({ mutationKey }) === 0) {
        queryClient.invalidateQueries({ queryKey: detailKey })
      }
      if (patchAffectsList(patch)) {
        queryClient.invalidateQueries({ queryKey: companyKeys.root })
      }
    },
    onError: (error: unknown) => {
      // 서버 정본으로 재동기화해 실패분만 되돌리고 이미 저장된 변경은 보존.
      queryClient.invalidateQueries({ queryKey: detailKey })
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      notify.error(`저장 실패: ${message}`)
    },
  })
}
