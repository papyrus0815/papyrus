import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { nestiaApiService } from '@/shared/api/api.service'
import * as api from '@api'

/** 댓글 한 개 (작성자 표시 + 요청자 기준 삭제 권한 포함) */
export type Comment = api.functional.comments.list.Output[number]

const noRetryOn401 = (failureCount: number, error: Error) => {
  const status = (error as Error & { status?: number })?.status
  if (status === 401 || error?.message?.includes('401')) return false
  return failureCount < 1
}

/** 대상 콘텐츠의 댓글 목록 — GET /comments?ownerType&recordId */
export const commentsQueryOptions = (ownerType: string, recordId: string) =>
  queryOptions({
    queryKey: ['comments', ownerType, recordId] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.comments.list(conn, ownerType, recordId)
    },
    staleTime: 1000 * 10,
    enabled: !!recordId,
    retry: noRetryOn401,
  })

/** 댓글 작성 */
export async function createComment(
  ownerType: string,
  recordId: string,
  content: string,
): Promise<Comment> {
  const conn = nestiaApiService.getConnection()
  return api.functional.comments.create(conn, { ownerType, recordId, content })
}

/** 댓글 삭제 (소프트) */
export async function deleteComment(commentId: string): Promise<void> {
  const conn = nestiaApiService.getConnection()
  await api.functional.comments.remove(conn, commentId)
}

/** 특정 대상의 댓글 캐시 무효화 */
export function invalidateComments(
  queryClient: QueryClient,
  ownerType: string,
  recordId: string,
): void {
  queryClient.invalidateQueries({ queryKey: ['comments', ownerType, recordId] })
}
