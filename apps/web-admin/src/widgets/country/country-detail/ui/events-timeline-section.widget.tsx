/**
 * 연대표(전체 사건) 섹션 — 가문·민족 메뉴와 동일한 헤더·레이아웃
 * 목록 뷰 + 사건 등록(events/create 전체 기능, 카드만 가문·민족 스타일)
 */
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useEvents } from '@/entities/event/model'
import { EventCreateFormDashboard } from './event-create-form-dashboard'
import { pathKeys } from '@/shared/router'
import { formatDateRange } from '@/pages/events/utils/events.utils'

const MAIN = '#6366f1'

const GovTabNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  margin-bottom: 20px;
  width: fit-content;
  background: #f1f5f9;
  border-radius: 20px;
  overflow-x: auto;
  &::-webkit-scrollbar {
    display: none;
  }
`
const GovTabButton = styled.button<{ $active?: boolean }>`
  flex: 0 0 auto;
  padding: 10px 18px;
  border-radius: 14px;
  border: none;
  background: ${(p) => (p.$active ? '#ffffff' : 'transparent')};
  color: ${(p) => (p.$active ? '#4f46e5' : '#64748b')};
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? '600' : '500')};
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  box-shadow: ${(p) => (p.$active ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none')};
  &:hover {
    color: ${(p) => (p.$active ? '#4f46e5' : '#475569')};
    background: ${(p) => (p.$active ? '#ffffff' : 'rgba(255,255,255,0.6)')};
  }
`

const Root = styled(motion.div)<{ $isForm?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => (p.$isForm ? 0 : 32)}px;
  padding: ${(p) => (p.$isForm ? '24px 28px 0' : '36px 32px 48px')};
  background: #ffffff;
  position: relative;
  min-height: ${(p) => (p.$isForm ? 0 : 'calc(100vh - 200px)')};
  height: ${(p) => (p.$isForm ? '100%' : 'auto')};
  overflow: ${(p) => (p.$isForm ? 'hidden' : 'visible')};
  box-sizing: ${(p) => (p.$isForm ? 'border-box' : 'border-box')};
`

const FormSection = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

export interface EventsTimelineSectionProps {
  /** 국가(현대/역사적) ID로 연관 사건만 표시. 미전달 시 전체 */
  countryId?: string | null
  /** URL searchParams form=create 시 true. 사건 등록 폼을 바로 표시 */
  initialFormFromSearchParams?: boolean
  /** 목록↔폼 전환 시 URL 동기화 (form 열기: true, 목록: false) */
  onNavigateToForm?: (toForm: boolean) => void
  /** 수정 모드: 전달 시 목록/헤더 없이 수정 폼만 표시 (dashboard/events/:id/edit) */
  editEventId?: string | null
  /** 수정 폼에서 뒤로가기 시 (상세로 이동) */
  onEditBack?: () => void
  /** 수정 완료 시 (상세로 이동) */
  onEditSuccess?: () => void
}

export function EventsTimelineSection({
  countryId,
  initialFormFromSearchParams,
  onNavigateToForm,
  editEventId,
  onEditBack,
  onEditSuccess,
}: EventsTimelineSectionProps) {
  const navigate = useNavigate()
  const [pageSize] = useState(10000)
  const [view, setView] = useState<'list' | 'form'>(() =>
    initialFormFromSearchParams ? 'form' : 'list',
  )
  const {
    events,
    isLoading,
    hasMore,
    fetchMoreEvents,
    resetAndFetch,
  } = useEvents(pageSize, countryId)

  const list = events ?? []

  useEffect(() => {
    setView(initialFormFromSearchParams ? 'form' : 'list')
  }, [initialFormFromSearchParams])

  const goToList = () => {
    setView('list')
    onNavigateToForm?.(false)
  }

  const openCreate = () => {
    setView('form')
    onNavigateToForm?.(true)
  }

  const handleCreateSuccess = () => {
    resetAndFetch(pageSize)
    goToList()
  }

  if (editEventId && onEditBack && onEditSuccess) {
    return (
      <Root
        $isForm
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <FormSection aria-label="사건 수정">
          <EventCreateFormDashboard
            eventId={editEventId}
            onBack={onEditBack}
            onSuccess={onEditSuccess}
          />
        </FormSection>
      </Root>
    )
  }

  return (
    <Root
      $isForm={view === 'form'}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* 헤더 — 가문·민족과 동일 */}
      <header
        style={{
          paddingBottom: 24,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.04em',
              lineHeight: 1.25,
            }}
          >
            연대표
          </h2>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 15,
              color: '#64748b',
              lineHeight: 1.55,
              maxWidth: 540,
              fontWeight: 500,
            }}
          >
            {countryId
              ? '선택한 국가에 연관된 역사적 사건을 시간순으로 확인할 수 있습니다.'
              : '등록된 역사적 사건을 시간순으로 확인할 수 있습니다. 아래에서 새 사건을 등록하거나 상세는 사건 메뉴에서 편집할 수 있습니다.'}
          </p>
        </div>
        {view === 'list' && (
          <button
            type="button"
            onClick={openCreate}
            aria-label="새 사건 등록"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 사건 등록
          </button>
        )}
      </header>

      {/* 탭 + KPI — 가문·민족과 동일 (목록일 때만) */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <GovTabNav>
            <GovTabButton type="button" $active>
              전체 사건
            </GovTabButton>
          </GovTabNav>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              flexWrap: 'wrap',
              padding: '20px 28px',
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                등록 사건
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {list.length}
                <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginLeft: 2 }}>건</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {view === 'form' ? (
        <FormSection aria-label="사건 등록">
          <EventCreateFormDashboard
            onBack={goToList}
            onSuccess={handleCreateSuccess}
          />
        </FormSection>
      ) : (
      <section aria-label="연대표 현황" style={{ paddingTop: 8 }}>
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
            연대표 현황
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#64748b', fontWeight: 500 }}>
            등록된 사건 목록입니다. 카드를 클릭하면 연대표 상세로 이동합니다.
          </p>
        </div>

        {isLoading && list.length === 0 ? (
          <div
            style={{
              padding: 56,
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14,
              background: '#f9fafb',
              borderRadius: 16,
              border: '1px solid #e5e7eb',
            }}
          >
            불러오는 중…
          </div>
        ) : list.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '64px 40px 72px',
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid #f1f5f9',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '20%',
                width: 280,
                height: 280,
                marginLeft: -140,
                marginTop: -140,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                filter: 'blur(32px)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
                등록된 사건이 없습니다
              </h3>
              <p style={{ margin: '10px 0 0', fontSize: 14, color: '#64748b', maxWidth: 320, lineHeight: 1.55, fontWeight: 500 }}>
                위 <strong style={{ color: '#475569', fontWeight: 600 }}>새 사건 등록</strong> 버튼을 눌러 첫 사건을 등록하거나,{' '}
                <strong style={{ color: '#475569', fontWeight: 600 }}>사건</strong> 메뉴에서 연대표를 이용해 보세요.
              </p>
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 24 }}>
            {list.map((evt: { id: string; title?: string; startDate?: string; endDate?: string; description?: string }) => {
              const start = evt.startDate
              const end = evt.endDate
              const dateLabel = start
                ? end
                  ? formatDateRange(start, end)
                  : formatDateRange(start)
                : '—'
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={() => navigate(pathKeys.history.dashboardEventDetail(evt.id))}
                  style={{
                    textAlign: 'left',
                    background: '#fff',
                    borderRadius: 16,
                    minHeight: 160,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    padding: 24,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#c7d2fe'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.08)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.35, marginBottom: 8 }}>
                    {evt.title || '제목 없음'}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                    {dateLabel}
                  </div>
                  {(evt.description ?? '').trim() && (
                    <div
                      style={{
                        fontSize: 13,
                        color: '#64748b',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}
                    >
                      {evt.description!.trim()}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {hasMore && pageSize <= 100 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => fetchMoreEvents()}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#475569',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? 'wait' : 'pointer',
              }}
            >
              {isLoading ? '불러오는 중…' : '더 보기'}
            </button>
          </div>
        )}
      </section>
      )}
    </Root>
  )
}
