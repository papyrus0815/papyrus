import { Module } from '@nestjs/common'
import { NotificationModule } from '../notification/notification.module'
import { CommentService } from './application/comment.service'
import { CommentController } from './presentation/comment.controller'

/**
 * 콘텐츠 댓글 모듈 (폴리모픽 — 현재 EVENT 대상).
 * 방 놀러가기(A) 방문자 댓글의 본체.
 * NotificationModule을 import해 "내 콘텐츠에 댓글 달림"을 소유자에게 타겟 알림한다.
 */
@Module({
  imports: [NotificationModule],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
