/**
 * /history/dashboard/persons
 * /history/dashboard/persons/:personId
 *
 * 인물 대시보드 — 인포그래픽 4뷰 + 필터 패널.
 * 인물 상세는 같은 페이지에서 PersonDetailPanel로 우측 렌더.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'
import { FiFilter } from 'react-icons/fi'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { PersonRegisterViewModal } from '@/widgets/country/country-list/ui/person-register-view-modal'
import {
  HistoryShell,
  LeftFilterSlot,
  SidebarSheet,
  SidebarSheetTrigger,
} from '@/widgets/history-shell'
import { PersonDetailPanel } from '@/widgets/person/person-detail-panel/person-detail-panel'
import {
  PersonFilterPanel,
  PersonInfographicPane,
} from '@/widgets/person-infographic'

export default function DashboardPersonsPage() {
  const navigate = useNavigate()
  const params = useParams<{ personId?: string }>()
  const personId = params.personId ?? null
  const [searchParams] = useSearchParams()
  /** 국가 상세 "인물 전체 보기 →" 진입 시 국가 필터 프리셋. 없으면 헤더 "인물" 기본(인포그래픽). */
  const countryIdParam = searchParams.get('country')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)

  /** 프리셋 해제 — 헤더 인물 페이지(쿼리 없음)로 이동 → 인포그래픽 뷰로 복귀 */
  const handleClearPreset = useCallback(() => {
    navigate(pathKeys.history.dashboardPersons())
  }, [navigate])

  /** 카드 → 상세 → 뒤로 왔을 때 스크롤 위치 복원 */
  const scrollKeyRef = useRef<string>('person-list-scroll')
  useEffect(() => {
    // 상세(personId 있음)로 진입할 때: 리스트 뷰 스크롤 저장
    if (personId) {
      sessionStorage.setItem(scrollKeyRef.current, String(window.scrollY))
      return
    }
    // 리스트(personId 없음)로 돌아왔을 때: 저장된 위치 복원
    const saved = sessionStorage.getItem(scrollKeyRef.current)
    if (saved != null) {
      const y = Number(saved)
      if (Number.isFinite(y)) {
        // 렌더 완료 후 복원
        requestAnimationFrame(() => window.scrollTo(0, y))
      }
    }
  }, [personId])

  return (
    <>
      <HistoryShell
        listCollapsedConfig={{
          storageKey: 'persons-filter-collapsed',
          defaultCollapsed: true,
        }}
        left={({ listCollapsed, toggleListCollapsed }) => (
          <LeftFilterSlot
            view="person"
            collapsed={listCollapsed}
            onToggleCollapse={toggleListCollapsed}
          />
        )}
        right={
          personId ? (
            <DetailWrap>
              <PersonDetailPanel
                key={personId}
                personId={personId}
                onClose={() =>
                  navigate(pathKeys.history.dashboardPersons())
                }
                onEdit={(id) => {
                  setEditingPersonId(id)
                  setEditModalOpen(true)
                }}
                onLinkedPersonClick={(id) =>
                  navigate(pathKeys.history.dashboardPersonDetail(id))
                }
                closeLabel="뒤로"
              />
            </DetailWrap>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', minHeight: '100%' }}
            >
              <PersonInfographicPane
                initialCountryId={countryIdParam}
                onClearPreset={countryIdParam ? handleClearPreset : undefined}
                onPersonClick={(id) =>
                  navigate(pathKeys.history.dashboardPersonDetail(id))
                }
              />
            </motion.div>
          )
        }
      />

      {/* 모바일(<1024px) 전용 필터 트리거 + sheet — 데스크톱에서는 좌측 패널 사용 */}
      {!personId && (
        <>
          <SidebarSheetTrigger
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            aria-label="필터 열기"
          >
            <FiFilter size={20} />
          </SidebarSheetTrigger>
          <SidebarSheet
            open={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            title="인물 필터"
          >
            <PersonFilterPanel />
          </SidebarSheet>
        </>
      )}

      <PersonRegisterViewModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editPersonId={editingPersonId}
        onSuccess={() => setEditModalOpen(false)}
      />
    </>
  )
}

const DetailWrap = styled.div`
  padding: 36px 32px 48px;
  background: ${({ theme }) => theme.colors.background.primary};
`
