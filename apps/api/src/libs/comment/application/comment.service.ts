import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AggregateType, EventMethod } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { ROOT_EVENT_WHERE } from '../../event/domain/event-hierarchy'
import { NotificationService } from '../../notification/application/notification.service'

/** 댓글 응답 (작성자 표시 + 요청자 기준 삭제 권한) */
export interface CommentView {
  id: string
  content: string
  authorAccountId: string
  /** displayName ?? username */
  authorName: string
  /** 작성자 대표인물 아바타 (없으면 null) */
  authorAvatarUrl: string | null
  createdAt: string
  /** 요청자가 이 댓글을 삭제할 수 있는지 (작성자 본인 또는 대상 콘텐츠 소유자) */
  canDelete: boolean
}

const MAX_COMMENT_LENGTH = 1000

const AUTHOR_INCLUDE = {
  author: {
    select: {
      id: true,
      username: true,
      displayName: true,
      representativePerson: { select: { profileImageUrl: true } },
    },
  },
} as const

type CommentRow = {
  id: string
  content: string
  authorAccountId: string
  createdAt: Date
  author: {
    username: string
    displayName: string | null
    representativePerson: { profileImageUrl: string | null } | null
  }
}

/**
 * 콘텐츠 댓글 서비스 (폴리모픽 — 현재 EVENT 대상).
 * Phase A: 알림 없음(전역 공유피드라 소유자 타겟 불가 — recipient 도입은 후속).
 * 삭제 권한 = 댓글 작성자 본인 + 대상 콘텐츠 소유자(자기 방 모더레이션).
 */
@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** 대상(ownerType+recordId)의 댓글 목록(미삭제, 오래된 순) */
  async list(
    ownerType: AggregateType,
    recordId: string,
    requesterAccountId?: string,
  ): Promise<CommentView[]> {
    // 목록도 작성과 동일하게 "방에 노출되는 대상"으로 한정 — 노출 스코프 밖이면 NotFound.
    const { ownerAccountId } = await this.resolveTarget(ownerType, recordId, true)
    const rows = await this.prisma.comment.findMany({
      where: { ownerType, recordId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: AUTHOR_INCLUDE,
    })
    return rows.map((row) => this.toView(row, requesterAccountId, ownerAccountId))
  }

  /** 댓글 작성 */
  async create(
    authorAccountId: string,
    ownerType: AggregateType,
    recordId: string,
    content: string,
  ): Promise<CommentView> {
    const trimmed = (content ?? '').trim()
    if (!trimmed) throw new BadRequestException('댓글 내용을 입력하세요')
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException(`댓글은 ${MAX_COMMENT_LENGTH}자 이내여야 합니다`)
    }
    // 대상 존재 확인(없는 콘텐츠에 댓글 방지) + 소유자·라벨 식별
    const { ownerAccountId, label } = await this.resolveTarget(ownerType, recordId, true)
    const created = await this.prisma.comment.create({
      data: { ownerType, recordId, authorAccountId, content: trimmed },
      include: AUTHOR_INCLUDE,
    })
    // 타겟 알림: "내 콘텐츠에 댓글 달림"을 소유자에게만. 본인 댓글은 제외. 실패는 본 흐름 비차단.
    if (ownerAccountId && ownerAccountId !== authorAccountId) {
      try {
        await this.notificationService.create({
          entityLabel: label ?? '',
          method: EventMethod.CREATE,
          ownerType,
          recordId,
          recipientAccountId: ownerAccountId,
          preview: trimmed.slice(0, 80),
          title: label ? `'${label}'에 댓글이 달렸습니다` : '내 콘텐츠에 댓글이 달렸습니다',
        })
      } catch {
        // 알림 생성 실패는 댓글 작성 본 흐름을 막지 않음
      }
    }
    return this.toView(created, authorAccountId, ownerAccountId)
  }

  /** 댓글 삭제 (소프트삭제). 작성자 본인 또는 대상 콘텐츠 소유자만. */
  async delete(commentId: string, requesterAccountId: string): Promise<void> {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, ownerType: true, recordId: true, authorAccountId: true },
    })
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다')
    const { ownerAccountId } = await this.resolveTarget(comment.ownerType, comment.recordId)
    const allowed =
      comment.authorAccountId === requesterAccountId || ownerAccountId === requesterAccountId
    if (!allowed) throw new ForbiddenException('삭제 권한이 없습니다')
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    })
  }

  // ── 내부 ──────────────────────────────────────────────────────────────────
  /**
   * 대상 콘텐츠의 소유자 accountId + 표시 라벨 식별 (삭제 권한 판정·존재 확인·알림용).
   * 현재 EVENT만 지원 — Event.createdById / title. 다른 타입은 MVP 미지원.
   */
  private async resolveTarget(
    ownerType: AggregateType,
    recordId: string,
    mustExist = false,
  ): Promise<{ ownerAccountId: string | null; label: string | null }> {
    if (ownerType === AggregateType.EVENT) {
      // 방(by-account)에 노출되는 조건과 정합: '살아있는 주 상위 없음'(실질 루트)·미삭제
      // 사건만 댓글 대상. 주 상위가 소프트삭제된(유령) 자식은 프론트 뷰가 부모를 숨겨
      // 루트로 취급하므로 댓글 대상으로 인정한다(CG-1) — 엄격 루트 일치만 걸면
      // 유령 부모 자식이 이유 없이 404가 된다.
      // 루트 분기는 event/domain/event-hierarchy.ts의 ROOT_EVENT_WHERE(단일출처) —
      // INV-2 의존 근거도 거기 있다. 이 게이트는 주 상위 FK만 본다(PD4 — 정책 확정
      // 대기, v1 현행 유지). 살아있는 주 상위가 있는 하위사건은 현행대로 차단해
      // 방-스코프와 일치시킨다.
      const event = await this.prisma.event.findFirst({
        where: {
          id: recordId,
          deletedAt: null,
          OR: [
            { ...ROOT_EVENT_WHERE },
            { parentEvent: { deletedAt: { not: null } } },
          ],
        },
        select: { createdById: true, title: true },
      })
      if (!event) {
        if (mustExist) throw new NotFoundException('대상 사건을 찾을 수 없습니다')
        return { ownerAccountId: null, label: null }
      }
      return { ownerAccountId: event.createdById, label: event.title }
    }
    if (mustExist) throw new BadRequestException('지원하지 않는 댓글 대상입니다')
    return { ownerAccountId: null, label: null }
  }

  private toView(
    row: CommentRow,
    requesterAccountId: string | undefined,
    ownerAccountId: string | null,
  ): CommentView {
    return {
      id: row.id,
      content: row.content,
      authorAccountId: row.authorAccountId,
      authorName: row.author.displayName ?? row.author.username,
      authorAvatarUrl: row.author.representativePerson?.profileImageUrl ?? null,
      createdAt: row.createdAt.toISOString(),
      canDelete:
        !!requesterAccountId &&
        (row.authorAccountId === requesterAccountId || ownerAccountId === requesterAccountId),
    }
  }
}
