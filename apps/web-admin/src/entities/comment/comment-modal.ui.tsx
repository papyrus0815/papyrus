/**
 * 콘텐츠 댓글 모달 (폴리모픽 — ownerType+recordId).
 * 방 놀러가기(A) 방문자 댓글: 사건관 카드 클릭 → 이 모달에서 그 사건의 댓글을 보고 단다.
 * 스레드 본체는 <CommentSection>(사건 상세 인라인과 공유). 여기선 공용 <Modal> 셸만 제공.
 */
import { Modal, ModalBody } from '@/shared/ui/modal'

import { CommentSection } from './comment-section.ui'

interface CommentModalProps {
  ownerType: string
  recordId: string
  title: string
  subtitle?: string
  onClose: () => void
}

export function CommentModal({ ownerType, recordId, title, subtitle, onClose }: CommentModalProps) {
  return (
    <Modal isOpen onClose={onClose} title={title} subtitle={subtitle} size="narrow">
      <ModalBody>
        <CommentSection ownerType={ownerType} recordId={recordId} />
      </ModalBody>
    </Modal>
  )
}
