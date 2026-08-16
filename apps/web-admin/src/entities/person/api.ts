import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { invalidateGamification } from '@/entities/gamification'
import * as personsApi from '@/shared/api/persons'
import type {
  PersonResponseDto,
  PersonInfographicItemDto,
  CreatePersonDto,
  UpdatePersonDto,
  Era,
} from '@/shared/api/persons'

// SDK 타입을 그대로 사용
export type Person = PersonResponseDto
/** 인포그래픽 목록(경량) 아이템 — adapt가 쓰는 최소 필드만 */
export type PersonInfographicItem = PersonInfographicItemDto
export type CreatePersonData = CreatePersonDto
export type UpdatePersonData = UpdatePersonDto
export type { Era }

/**
 * Person API 쿼리 키
 */
export const personKeys = {
  all: ['persons'] as const,
  /** GET /persons/infographic (경량 목록) — ['persons'] 프리픽스라 all 무효화 시 함께 갱신됨 */
  infographic: ['persons', 'infographic'] as const,
  /** GET /persons/:id (요약) */
  detail: (id: string) => ['persons', id] as const,
  /** GET /persons/:id/detail (관계·재임 등 포함 상세) */
  detailFull: (id: string) => ['person-detail', id] as const,
  /** person-detail prefix 전체 (모달 스택의 다른 personId 상세까지 broad invalidate용) */
  detailFullAll: ['person-detail'] as const,
  /** 가계도 (다른 인물 상세에 박힌 가족 노드 profileImageUrl 공유) */
  familyTree: ['person-family-tree'] as const,
  /** 동시대 수장 스트립 */
  contemporaries: ['person-contemporaries'] as const,
  /** 같은 국가 전/후 재위(승계) */
  reignAdjacency: ['person-reign-adjacency'] as const,
  /** 국가 대시보드 인물 통계 */
  byCountry: ['persons-by-country'] as const,
  /** 가문 구성원 */
  byDynasty: ['persons-by-dynasty'] as const,
  /** 국가 상세 수장 섹션 */
  byTenureCountry: ['persons-by-tenure-country'] as const,
  /** GET /persons/dashboard/person-counts-by-modern-country */
  modernCountryPersonCounts: ['persons', 'modern-country-person-counts'] as const,
}

/**
 * 인물 관련 모든 쿼리 캐시 무효화 — 아바타·이름·생몰 수정, 생성, 삭제 후 공통 호출.
 *
 * **정본 세트.** 사본을 만들지 말고 반드시 이 헬퍼를 경유한다(invalidateTenureQueries와 동일 규약).
 * 가족 노드·사건 참여자 썸네일·국가 대시보드/수장 섹션·가문 구성원 등 다른 지면에 박힌
 * profileImageUrl·통계까지 broad invalidate해 수정 즉시 반영을 보장한다.
 *
 * @param options.personId 지정 시 해당 인물의 요약 쿼리(['persons', id])도 함께 무효화
 * @param options.skipEventDetail 사건 상세(무거운 키) 무효화 생략 (기본 false — 포함)
 */
export function invalidatePersonCaches(
  queryClient: QueryClient,
  options: { personId?: string; skipEventDetail?: boolean } = {},
): Promise<unknown> {
  const { personId, skipEventDetail = false } = options
  return Promise.all([
    ...(personId
      ? [queryClient.invalidateQueries({ queryKey: personKeys.detail(personId) })]
      : []),
    queryClient.invalidateQueries({ queryKey: personKeys.detailFullAll }),
    queryClient.invalidateQueries({ queryKey: personKeys.familyTree }),
    // 사건 상세 응답이 참여 행위자의 person.profileImageUrl을 박아 두므로 함께 무효화
    ...(skipEventDetail
      ? []
      : [queryClient.invalidateQueries({ queryKey: ['event-detail'] })]),
    queryClient.invalidateQueries({ queryKey: personKeys.all }),
    queryClient.invalidateQueries({ queryKey: personKeys.byCountry }),
    queryClient.invalidateQueries({ queryKey: personKeys.byDynasty }),
    queryClient.invalidateQueries({ queryKey: personKeys.byTenureCountry }),
    queryClient.invalidateQueries({ queryKey: personKeys.contemporaries }),
    queryClient.invalidateQueries({ queryKey: personKeys.reignAdjacency }),
  ])
}

/**
 * 방문(놀러가기): 타 계정이 등록한 인물 목록(카드, 읽기전용).
 * 방(공개 프로필)에서 그 사람이 등록한 인물관을 보여줄 때 사용.
 */
export const visitedPersonsQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ['persons', 'by-account', accountId] as const,
    queryFn: () => personsApi.getPersonsByAccount(accountId),
    staleTime: 60_000,
    enabled: !!accountId,
  })

/**
 * 모든 인물 목록 조회 훅
 */
export function usePersons() {
  return useQuery({
    queryKey: personKeys.all,
    queryFn: async () => {
      const response = await personsApi.getAllPersons()
      return response as Person[]
    },
    // 전량(+무거운 include) 로드라 마운트마다 재페치하면 비쌈.
    // 카드→상세→뒤로 네비게이션 동안 캐시 재사용. mutation invalidate로 갱신은 그대로 동작.
    staleTime: 60_000,
  })
}

/**
 * 인포그래픽 목록(경량) 조회 훅 — 대시보드 인포그래픽 전용.
 * usePersons(전체 payload)와 별도 캐시. 키가 ['persons'] 프리픽스라
 * 인물 생성/수정/삭제의 personKeys.all 무효화로 함께 갱신된다.
 */
export function usePersonsInfographic(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: personKeys.infographic,
    queryFn: () => personsApi.getInfographicPersons(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * 현대 국가별 연결 인물 수 (대시보드 통계)
 */
export function useModernCountryPersonCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: personKeys.modernCountryPersonCounts,
    queryFn: () => personsApi.getModernCountryPersonCounts(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

/**
 * ID로 인물 조회 훅
 */
export function usePerson(id: string) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: async () => {
      const response = await personsApi.getPersonById(id)
      return response as Person
    },
    enabled: !!id,
  })
}

/**
 * 인물 생성 뮤테이션 훅
 */
export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePersonData) => {
      const response = await personsApi.createPerson(data)
      return response as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      invalidateGamification(queryClient)
    },
  })
}

/**
 * 인물 수정 뮤테이션 훅
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdatePersonData
    }) => {
      const response = await personsApi.updatePerson(id, data)
      return response as Person
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detail(variables.id),
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(variables.id),
      })
    },
  })
}

/**
 * 인物 삭제 뮤테이션 훅
 */
export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await personsApi.deletePerson(id)
    },
    onSuccess: (_void, deletedId) => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.modernCountryPersonCounts,
      })
      queryClient.invalidateQueries({
        queryKey: personKeys.detailFull(deletedId),
      })
    },
  })
}
