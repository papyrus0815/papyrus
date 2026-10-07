import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import type { PrismaClient } from '@prisma/client'

/**
 * 사건 소유권 검사 — 단일 출처.
 *
 * '본인이 등록한 사건만 X할 수 있습니다'가 컨트롤러 핸들러 9곳과 서비스 2곳에 인라인으로
 * 복제돼 있었고, 소프트삭제된 사건을 막는지가 곳마다 달랐다(행정부 연결은 409, 해제는 통과,
 * 진영 편집은 404). 규칙을 여기 한 곳에 두고 각 호출부는 '무슨 동작인가'와 '삭제된 사건을
 * 어떻게 다루는가'만 고른다.
 *
 * 범위 밖: 복구·영구삭제('본인이 *삭제한* 사건')와 연결 *대상* 사건 검사는 의미가 달라
 * 서비스에 그대로 둔다.
 */
export interface EventOwnershipOptions {
  /** 거절 문구의 동작 — '조회' → '본인이 등록한 사건만 조회할 수 있습니다.' */
  action: '조회' | '수정' | '삭제' | '진영 편집'
  /**
   * 소프트삭제된 사건:
   * - `allow`(기본) 통과 — 조회, 그리고 연결 해제처럼 정리하는 쓰기
   * - `conflict` 409 — 쓰기(HIER-W3: 유령 사건에 쓰면 살아 있는 자식이 유령 아래로 숨는다)
   * - `not-found` 404 — 삭제된 사건을 없는 것으로 다루는 지면
   */
  deleted?: 'allow' | 'conflict' | 'not-found'
  /** 404 문구 — 기본 '사건을 찾을 수 없습니다.' */
  notFoundMessage?: string
}

/** 검사에 필요한 최소 형상 */
export interface OwnedEventRow {
  createdById: string
  deletedAt: Date | null
}

const DELETED_CONFLICT_MESSAGE = '삭제된 사건은 수정할 수 없습니다 — 복구 후 다시 시도하세요.'

/**
 * 이미 읽어 온 행으로 검사 — 상세처럼 행을 다른 이유로 이미 가져온 경우(두 번 읽지 않는다).
 * 통과하면 같은 행을 돌려준다.
 */
export function ensureEventOwnership<Row extends OwnedEventRow>(
  event: Row | null | undefined,
  userId: string | null | undefined,
  options: EventOwnershipOptions,
): Row {
  const deleted = options.deleted ?? 'allow'
  const notFoundMessage = options.notFoundMessage ?? '사건을 찾을 수 없습니다.'
  if (!event || (deleted === 'not-found' && event.deletedAt)) {
    throw new NotFoundException(notFoundMessage)
  }
  if (event.createdById !== userId) {
    throw new ForbiddenException(`본인이 등록한 사건만 ${options.action}할 수 있습니다.`)
  }
  if (deleted === 'conflict' && event.deletedAt) {
    throw new ConflictException(DELETED_CONFLICT_MESSAGE)
  }
  return event
}

/** 사건을 읽어 소유권을 검사한다 — 통과하면 `{ createdById, deletedAt }` */
export async function assertEventOwnership(
  prisma: Pick<PrismaClient, 'event'>,
  eventId: string,
  userId: string | null | undefined,
  options: EventOwnershipOptions,
): Promise<OwnedEventRow> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { createdById: true, deletedAt: true },
  })
  return ensureEventOwnership(event, userId, options)
}
