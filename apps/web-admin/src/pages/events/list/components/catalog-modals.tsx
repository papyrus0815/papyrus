/**
 * 카탈로그 모달 컬렉션 — 카테고리 / 국가 / 직책 / 단축키 도움말 / 사건 요약.
 *
 * 모든 모달의 표시/숨김은 부모(페이지)가 제어. 단축키 도움말과 요약 모달은
 * portal로 body에 렌더링한다.
 */
import React from 'react'

import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiUsers, FiX } from 'react-icons/fi'

import { FILTER_ALL } from '@/features/event-list/lib'
import type { CountryResponseDto } from '@/shared/api/countries'
import type { EventCategoryDto } from '@/shared/api/event-categories'
import type { HistoricalCountryResponseDto } from '@/shared/api/historical-countries'
import { AdvancedCountrySelectModal } from '@/shared/ui/advanced-country-select-modal/advanced-country-select-modal'
import { CategoryModal } from '@/widgets/event-list/ui/category-modal'
import { SimpleSelectModal } from '@/widgets/event-list/ui/simple-select-modal'
import { TreeView } from '@/widgets/event-list/ui/tree-view'

import { MOCK_POSITION_TYPES } from '../../../../entities/event/model/mock-government-positions'
import type { EventHierarchyNode } from '../../create/events.types'
import * as PageStyles from '../../styles/list-page.styles'
import * as Modal from '../../styles/modal.styles'
import { formatDateRange } from '../../utils/events.utils'

interface Props {
  // 카테고리
  showCategoryModal: boolean
  setShowCategoryModal: (v: boolean) => void
  dbCategories: EventCategoryDto[]
  selectedCategory: string
  setSelectedCategory: (v: string) => void

  // 국가
  showCountryModal: boolean
  setShowCountryModal: (v: boolean) => void
  countries: CountryResponseDto[]
  historicalCountries: HistoricalCountryResponseDto[]
  selectedCountry: string
  setSelectedCountry: (v: string) => void

  // 직책
  showPositionTypeModal: boolean
  setShowPositionTypeModal: (v: boolean) => void
  selectedPositionType: string
  setSelectedPositionType: (v: string) => void

  // 단축키
  shortcutHelpOpen: boolean
  closeShortcutHelp: () => void

  // 요약 모달
  showSummaryModal: boolean
  setShowSummaryModal: (v: boolean) => void
  summaryNode: EventHierarchyNode | null
}

export const CatalogModals: React.FC<Props> = ({
  showCategoryModal,
  setShowCategoryModal,
  dbCategories,
  selectedCategory,
  setSelectedCategory,
  showCountryModal,
  setShowCountryModal,
  countries,
  historicalCountries,
  selectedCountry,
  setSelectedCountry,
  showPositionTypeModal,
  setShowPositionTypeModal,
  selectedPositionType,
  setSelectedPositionType,
  shortcutHelpOpen,
  closeShortcutHelp,
  showSummaryModal,
  setShowSummaryModal,
  summaryNode,
}) => {
  return (
    <>
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        dbCategories={dbCategories}
        selectedCategory={selectedCategory}
        onSelect={(categoryId) => {
          setSelectedCategory(categoryId)
        }}
      />

      <AdvancedCountrySelectModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        onSelect={(country) => {
          if (country.id === FILTER_ALL) {
            setSelectedCountry(FILTER_ALL)
          } else {
            setSelectedCountry(country.id)
          }
          setShowCountryModal(false)
        }}
        modernCountries={[
          { id: FILTER_ALL, name: '전체 국가', flagEmoji: '🌍' } as any,
          ...countries,
        ]}
        historicalCountries={historicalCountries}
        title="국가 필터"
        selectedCountryIds={
          selectedCountry === FILTER_ALL ? [] : [selectedCountry]
        }
        multiSelect={false}
      />

      <SimpleSelectModal
        isOpen={showPositionTypeModal}
        onClose={() => setShowPositionTypeModal(false)}
        title="역대 수반 직책"
        selectedValue={selectedPositionType}
        options={MOCK_POSITION_TYPES}
        onSelect={(value) => setSelectedPositionType(value)}
        allLabel="전체 직책"
        allDescription="모든 역대 수반"
        Icon={FiUsers}
      />

      {/* ===== 단축키 도움말 모달 ===== */}
      {shortcutHelpOpen &&
        createPortal(
          <PageStyles.ShortcutOverlay
            role="dialog"
            aria-label="단축키 도움말"
            onClick={closeShortcutHelp}
          >
            <PageStyles.ShortcutBox onClick={(e) => e.stopPropagation()}>
              <PageStyles.ShortcutHeader>
                <span>키보드 단축키</span>
                <PageStyles.ShortcutClose
                  type="button"
                  aria-label="닫기"
                  onClick={closeShortcutHelp}
                >
                  <FiX size={18} />
                </PageStyles.ShortcutClose>
              </PageStyles.ShortcutHeader>
              <PageStyles.ShortcutList>
                <li>
                  <kbd>?</kbd>
                  <span>이 도움말 열기/닫기</span>
                </li>
                <li>
                  <kbd>/</kbd>
                  <span>검색 입력 포커스</span>
                </li>
                <li>
                  <kbd>↑</kbd> / <kbd>↓</kbd>
                  <span>이전 / 다음 사건 선택</span>
                </li>
                <li>
                  <kbd>Home</kbd> / <kbd>End</kbd>
                  <span>맨 처음 / 맨 끝</span>
                </li>
                <li>
                  <kbd>Enter</kbd>
                  <span>선택한 사건 상세로 이동</span>
                </li>
                <li>
                  <kbd>Esc</kbd>
                  <span>도움말 닫기 / 선택 해제</span>
                </li>
              </PageStyles.ShortcutList>
            </PageStyles.ShortcutBox>
          </PageStyles.ShortcutOverlay>,
          document.body,
        )}

      {/* ===== 사건 요약 모달 ===== */}
      {showSummaryModal &&
        summaryNode &&
        createPortal(
          <>
            <Modal.ModalOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowSummaryModal(false)}
            />
            <Modal.SummaryModal>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Modal.ModalHeader>
                  <div>
                    <Modal.ModalTitle>{summaryNode.title}</Modal.ModalTitle>
                    <Modal.SummarySubtitle>
                      {formatDateRange(
                        summaryNode.period.start,
                        summaryNode.period.end,
                      )}
                    </Modal.SummarySubtitle>
                  </div>
                  <Modal.ModalClose onClick={() => setShowSummaryModal(false)}>
                    <FiX size={20} />
                  </Modal.ModalClose>
                </Modal.ModalHeader>

                <Modal.SummaryContent>
                  <TreeView node={summaryNode} />
                </Modal.SummaryContent>
              </motion.div>
            </Modal.SummaryModal>
          </>,
          document.body,
        )}
    </>
  )
}
