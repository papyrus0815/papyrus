/**
 * 인물 상세 모달 — 가계도(genealogy) 노드 클릭 시 뜨는 모달과 동일한 형태.
 *
 * person-detail-panel 내부에 인라인되어 있던 `BioMentionModal*` 모달 스택을 재사용 가능한
 * 컴포넌트로 추출한 것. 같은 styled 컴포넌트를 그대로 쓰므로 외형이 동일하다.
 * - PersonDetailPanel을 `embedInModal`로 감싸 모달 안에서 전체 정보(가계도 포함) 표시.
 * - 모달 안에서 다른 인물 링크 클릭 시 stack push → 같은 오버레이 위에서 인물 전환, "이전"으로 복귀.
 * - "상세로 이동" 버튼으로 인물 상세 페이지 진입(새 탭 클릭도 지원).
 * - ESC: stack pop, 비어있으면 close. capture 단계로 잡아 하위(타임라인 가이드라인 ESC)보다 먼저 처리.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiExternalLink, FiX } from 'react-icons/fi'

import { personKeys } from '@/entities/person/api'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { useBodyScrollLock } from '@/shared/hooks/use-body-scroll-lock.hook'
import { useFocusTrap } from '@/shared/hooks/use-focus-trap.hook'

import { PersonDetailPanel } from './person-detail-panel'
import {
  BioMentionModalBack,
  BioMentionModalBody,
  BioMentionModalClose,
  BioMentionModalHeader,
  BioMentionModalOpenDetail,
  BioMentionModalOverlay,
  BioMentionModalPanel,
  BioMentionModalTitle,
} from './person-detail-panel.styles'

export interface PersonDetailModalProps {
  /** 열려 있는 인물 id. null이면 모달 닫힘. */
  personId: string | null
  /** 모달 닫기 (오버레이/X/ESC) */
  onClose: () => void
  /** 패널 안에서 ✎ 편집 클릭 시. 기본값: 닫기. */
  onEdit?: (id: string) => void
}

export function PersonDetailModal({
  personId,
  onClose,
  onEdit,
}: PersonDetailModalProps) {
  /** 모달 안에서 다른 인물 링크 클릭 시 stack push — 같은 오버레이 위에서 인물 전환. */
  const [stack, setStack] = useState<string[]>([])

  // personId 변경 시 stack 초기화
  useEffect(() => {
    setStack([])
  }, [personId])

  const topId = stack[stack.length - 1] ?? personId

  const push = useCallback((id: string) => setStack((s) => [...s, id]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const depth = stack.length // 0이면 루트 인물

  // ESC 닫기 (stack이 있으면 pop, 없으면 close) — capture 단계로 등록해
  // 타임라인 가이드라인 해제 등 하위 ESC 핸들러보다 먼저 처리한다.
  useEffect(() => {
    if (!personId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (depth > 0) pop()
      else onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [personId, depth, pop, onClose])

  const { data: topPerson } = useQuery({
    queryKey: topId != null ? personKeys.detailFull(topId) : ['person-detail', '__idle__'],
    queryFn: () => getPersonDetailById(topId!),
    enabled: !!topId,
  })
  const topName = topPerson ? getPersonDisplayName(topPerson) : ''

  const navigate = useNavigate()
  const targetUrl = topId ? `/persons/${encodeURIComponent(topId)}/` : '#'

  // 모달 열림 동안 body 스크롤 락 + 패널 내 포커스 트랩
  const open = !!personId && !!topId
  const panelRef = useRef<HTMLDivElement>(null)
  useBodyScrollLock(open)
  useFocusTrap(panelRef, open)

  return (
    <AnimatePresence>
      {personId && topId && (
        <BioMentionModalOverlay
          key="person-detail-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          role="presentation"
        >
          <BioMentionModalPanel
            key={`person-detail-${topId}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-detail-modal-title"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <BioMentionModalHeader>
              {depth > 0 && (
                <BioMentionModalBack
                  type="button"
                  onClick={pop}
                  aria-label="이전 인물"
                >
                  <FiArrowLeft size={18} strokeWidth={2.25} />
                  이전
                </BioMentionModalBack>
              )}
              <BioMentionModalTitle id="person-detail-modal-title" title={topName}>
                {topName || '인물'}
              </BioMentionModalTitle>
              <BioMentionModalOpenDetail
                href={targetUrl}
                onClick={(e) => {
                  // Cmd/Ctrl·Shift·가운데 클릭은 브라우저 기본(새 탭/창) 동작 유지
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                  e.preventDefault()
                  onClose()
                  navigate(targetUrl)
                }}
                aria-label="인물 상세 페이지로 이동"
                title="인물 상세 페이지로 이동"
              >
                <FiExternalLink size={15} strokeWidth={2.2} />
                <span>상세로 이동</span>
              </BioMentionModalOpenDetail>
              <BioMentionModalClose
                type="button"
                onClick={onClose}
                aria-label="닫기"
              >
                <FiX size={20} strokeWidth={2.5} />
              </BioMentionModalClose>
            </BioMentionModalHeader>
            <BioMentionModalBody>
              <PersonDetailPanel
                key={topId}
                personId={topId}
                onClose={onClose}
                onEdit={onEdit ?? (() => onClose())}
                hideHeaderActions
                embedInModal
                onLinkedPersonClick={push}
              />
            </BioMentionModalBody>
          </BioMentionModalPanel>
        </BioMentionModalOverlay>
      )}
    </AnimatePresence>
  )
}
