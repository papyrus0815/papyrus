/**
 * 카탈로그 portal/focus-trap overlay 모음 — 단축키 도움말 + 사건 요약.
 *
 * 단축키 도움말은 a11y dialog (focus trap + aria-modal + ESC),
 * 요약 모달은 사건 trees view를 띄우는 dialog. 둘 다 framer-motion으로
 * exit fade 처리해 portal에 mount/unmount.
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { TreeView } from '@/widgets/event-list/ui/tree-view'

import type { EventHierarchyNode } from '../../create/events.types'
import * as PageStyles from '../../styles/list-page.styles'
import * as Modal from '../../styles/modal.styles'
import { ICON_SIZE } from '../../styles/theme'
import { formatDateRange } from '../../utils/events.utils'
import { useFocusTrap } from '../hooks/use-focus-trap'

interface Props {
  shortcutHelpOpen: boolean
  closeShortcutHelp: () => void

  showSummaryModal: boolean
  setShowSummaryModal: (v: boolean) => void
  summaryNode: EventHierarchyNode | null
  /** 트리 노드 선택 — 그 사건을 열고 모달을 닫는다(조상 펼침은 페이지가 담당) */
  onSelectNode?: (eventId: string) => void
}

const SHORTCUT_TITLE_ID = 'catalog-shortcut-help-title'
const SUMMARY_TITLE_ID = 'catalog-summary-title'

export const CatalogOverlayModals: React.FC<Props> = ({
  shortcutHelpOpen,
  closeShortcutHelp,
  showSummaryModal,
  setShowSummaryModal,
  summaryNode,
  onSelectNode,
}) => {
  const shortcutTrapRef = useFocusTrap<HTMLDivElement>(shortcutHelpOpen)
  const summaryTrapRef = useFocusTrap<HTMLDivElement>(
    showSummaryModal && !!summaryNode,
  )

  return (
    <>
      {/*
       * ⚠️ createPortal은 **AnimatePresence 바깥**에 있어야 한다.
       *
       * 포털이 AnimatePresence의 자식이면 아무것도 렌더되지 않는다 —
       * AnimatePresence는 자식을 `isValidElement`로 거르는데, createPortal이 돌려주는 값은
       * `$$typeof: REACT_PORTAL_TYPE`이라 element가 아니어서 통째로 버려진다.
       * 실측: 버튼을 눌러 state는 열리고(body.overflow → hidden) 콘솔 에러도 없는데
       * document.body의 자식 수가 그대로였고 [role=dialog]가 0이었다.
       * 즉 **단축키 도움말·사건 요약 모달이 열리지 않는 상태**였다.
       */}
      {createPortal(
        <AnimatePresence>
          {shortcutHelpOpen && (
            <PageStyles.ShortcutOverlay
              as={motion.div}
              role="dialog"
              aria-modal="true"
              aria-labelledby={SHORTCUT_TITLE_ID}
              onClick={closeShortcutHelp}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <PageStyles.ShortcutBox
                ref={shortcutTrapRef}
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
              >
                <PageStyles.ShortcutHeader>
                  <span id={SHORTCUT_TITLE_ID}>키보드 단축키</span>
                  <PageStyles.ShortcutClose
                    type="button"
                    aria-label="단축키 도움말 닫기"
                    onClick={closeShortcutHelp}
                  >
                    <FiX size={ICON_SIZE.lg} aria-hidden="true" />
                  </PageStyles.ShortcutClose>
                </PageStyles.ShortcutHeader>
                <PageStyles.ShortcutList>
                  <li>
                    <kbd aria-label="물음표">?</kbd>
                    <span>이 도움말 열기/닫기</span>
                  </li>
                  <li>
                    <kbd aria-label="슬래시">/</kbd>
                    <span>검색 입력 포커스</span>
                  </li>
                  <li>
                    <kbd aria-label="위쪽 화살표">↑</kbd> /{' '}
                    <kbd aria-label="아래쪽 화살표">↓</kbd>
                    <span>이전 / 다음 사건 선택 (목록 행에 포커스가 있을 때)</span>
                  </li>
                  <li>
                    <kbd aria-label="오른쪽 화살표">→</kbd>
                    <span>하위 사건 펼치기 · 이미 펼쳐져 있으면 첫 하위로</span>
                  </li>
                  <li>
                    <kbd aria-label="왼쪽 화살표">←</kbd>
                    <span>하위 사건 접기 · 접혀 있으면 상위 사건으로</span>
                  </li>
                  <li>
                    <kbd>Home</kbd> / <kbd>End</kbd>
                    <span>맨 처음 / 맨 끝 (목록 행에 포커스가 있을 때)</span>
                  </li>
                  <li>
                    <kbd>Enter</kbd> / <kbd>Space</kbd>
                    <span>포커스한 사건 열기 (우측 상세 패널)</span>
                  </li>
                  <li>
                    <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                    <span>상세 페이지로 이동 (목록을 떠남)</span>
                  </li>
                  <li>
                    <kbd>Esc</kbd>
                    <span>열린 창 닫기 → 없으면 선택 해제</span>
                  </li>
                </PageStyles.ShortcutList>

                <PageStyles.ShortcutSectionTitle>
                  타임라인 보기
                </PageStyles.ShortcutSectionTitle>
                <PageStyles.ShortcutList>
                  <li>
                    <kbd>Tab</kbd>
                    <span>다음 막대 포커스</span>
                  </li>
                  <li>
                    <kbd>Enter</kbd> / <kbd>Space</kbd>
                    <span>포커스된 막대 선택</span>
                  </li>
                  <li>
                    <kbd aria-label="왼쪽 화살표">←</kbd> /{' '}
                    <kbd aria-label="오른쪽 화살표">→</kbd>
                    <span>같은 카테고리 안 시간순 이동</span>
                  </li>
                  <li>
                    <kbd>Home</kbd> / <kbd>End</kbd>
                    <span>같은 카테고리 첫/마지막 사건</span>
                  </li>
                  <li>
                    <kbd>Ctrl</kbd>+<kbd aria-label="마우스 휠">휠</kbd>
                    <span>확대/축소 (포인터 위치 중심)</span>
                  </li>
                  <li>
                    <kbd>Space</kbd>+드래그
                    <span>가로 패닝 (또는 마우스 미들 버튼)</span>
                  </li>
                  <li>
                    <kbd>Enter</kbd> on +N
                    <span>밀집 사건 묶음 자동 확대 + 첫 사건 포커스</span>
                  </li>
                </PageStyles.ShortcutList>
              </PageStyles.ShortcutBox>
            </PageStyles.ShortcutOverlay>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {showSummaryModal && summaryNode && (
            <>
              <Modal.ModalOverlay
                as={motion.div}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setShowSummaryModal(false)}
              />
              <Modal.SummaryModal
                ref={summaryTrapRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={SUMMARY_TITLE_ID}
                tabIndex={-1}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Modal.ModalHeader>
                    <div>
                      <Modal.ModalTitle id={SUMMARY_TITLE_ID}>
                        {summaryNode.title}
                      </Modal.ModalTitle>
                      <Modal.SummarySubtitle>
                        {formatDateRange(
                          summaryNode.period.start,
                          summaryNode.period.end,
                          summaryNode.period.startPrecision,
                          summaryNode.period.endPrecision,
                        )}
                      </Modal.SummarySubtitle>
                    </div>
                    <Modal.ModalClose
                      aria-label="하위 사건 계층 닫기"
                      onClick={() => setShowSummaryModal(false)}
                    >
                      <FiX size={ICON_SIZE.lg} aria-hidden="true" />
                    </Modal.ModalClose>
                  </Modal.ModalHeader>

                  <Modal.SummaryContent>
                    <TreeView node={summaryNode} onSelectNode={onSelectNode} />
                  </Modal.SummaryContent>
                </motion.div>
              </Modal.SummaryModal>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
