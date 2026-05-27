/**
 * 역대 수장 통합 비교 타임라인 — 현대 국가·역사적 국가 모두를 한 화면에서 가로 시간축으로 비교.
 *
 * 핵심 인터랙션은 세로 가이드라인(시간축 클릭 → 그 시점 재임자만 하이라이트).
 * 좌측 핀 패널에서 비교 대상 국가를 직접 고르고, 같은 영토 계승국은 한 행으로 묶어
 * "고려 → 조선 → 대한제국 → 대한민국"처럼 한 줄에 이어 그릴 수 있다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import { useNavigate } from 'react-router'

import { AnimatePresence, motion } from 'framer-motion'
import {
  FiDownload,
  FiHelpCircle,
  FiLink,
  FiPrinter,
} from 'react-icons/fi'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'
import { ToastProvider, useToast } from '@/shared/ui/toast'

import { Legend } from './legend'
import { PinSidebar } from './pin-sidebar'
import { RangeControls } from './range-controls'
import { TimelineCanvas } from './timeline-canvas'
import { HeadsTooltipProvider } from './tooltip'
import { ContemporaryPanel } from './contemporary-panel'
import { EventSearchModal } from './event-search-modal'
import { PersonDetailModal } from '@/widgets/person/person-detail-panel/person-detail-modal'
import type { TenureBar } from '../lib/normalize-tenures'
import type { PinnedRow } from '../model/types'
import { useAllRowsTenures } from '../api/use-all-rows-tenures'
import { useEventOverlay } from '../model/use-event-overlay'
import {
  copyShareUrl,
  readCategoriesFromUrl,
  useTimelineUrlSync,
} from '../model/use-url-sync'
import { useHeadsOfStateTimelineState } from '../model/use-heads-of-state-timeline-state'
import { useUserPresets } from '../model/use-user-presets'
import { useCategoryFilter } from '../model/use-category-filter'
import { downloadComparisonJson, printComparison } from '../lib/export'

export function HeadsOfStateTimeline() {
  // 앱 루트 레벨에 ToastProvider가 항상 있는 것은 아니므로(다른 페이지는 자체적으로 사용)
  // 이 위젯이 사용하는 토스트가 깨지지 않게 페이지 단위로 감싼다. 중첩되어도 React Context 가
  // 가까운 Provider를 우선하므로 안전.
  return (
    <ToastProvider>
      <HeadsOfStateTimelineInner />
    </ToastProvider>
  )
}

function HeadsOfStateTimelineInner() {
  const state = useHeadsOfStateTimelineState()
  const rowsTenures = useAllRowsTenures(state.rows)
  const eventOverlay = useEventOverlay()
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [highlightPeriod, setHighlightPeriod] = useState<{
    startYear: number
    endYear: number
  } | null>(null)
  const [modalPersonId, setModalPersonId] = useState<string | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const userPresets = useUserPresets()
  const categoryFilter = useCategoryFilter()

  // URL `?cat=` 진입 시 한 번만 적용 (이후엔 useTimelineUrlSync가 변경분을 URL로 흘림)
  const urlCatAppliedRef = useRef(false)
  useEffect(() => {
    if (urlCatAppliedRef.current) return
    urlCatAppliedRef.current = true
    const fromUrl = readCategoriesFromUrl()
    if (fromUrl != null) categoryFilter.setFromList(fromUrl)
  }, [categoryFilter])

  const openBarModal = useCallback(
    (bar: TenureBar) => {
      if (bar.personId) setModalPersonId(bar.personId)
      else showToast('info', '등록된 인물 정보가 없습니다')
    },
    [showToast],
  )

  // 행 제거 직후 5초간 undo 가능 — stack에 push, 가장 최근 것부터 pop.
  const undoStackRef = useRef<
    Array<{ row: PinnedRow; index: number; expiresAt: number }>
  >([])
  const UNDO_TIMEOUT_MS = 5000

  const purgeExpiredUndo = useCallback(() => {
    const now = Date.now()
    undoStackRef.current = undoStackRef.current.filter(
      (e) => e.expiresAt > now,
    )
  }, [])

  /** stack의 마지막 제거를 원래 인덱스에 복원 (계승국 묶음 보존) — ⌘Z·토스트 버튼 공용 */
  const restoreLastRemoved = useCallback((): boolean => {
    purgeExpiredUndo()
    const last = undoStackRef.current.pop()
    if (!last) return false
    state.restoreRowAt(last.index, last.row)
    showToast('success', '복원되었습니다')
    return true
  }, [state, showToast, purgeExpiredUndo])

  const handleRemoveRowWithUndo = useCallback(
    (rowId: string) => {
      const idx = state.rows.findIndex((r) => r.rowId === rowId)
      if (idx < 0) return
      const removed = state.rows[idx]!
      undoStackRef.current.push({
        row: removed,
        index: idx,
        expiresAt: Date.now() + UNDO_TIMEOUT_MS,
      })
      state.removeRow(rowId)
      const nameLabel =
        removed.segments.map((s) => s.name).join(' → ') || '행'
      showToast(
        'info',
        `"${nameLabel}" 제거됨 (⌘Z)`,
        UNDO_TIMEOUT_MS,
        { label: '복원', onClick: () => restoreLastRemoved() },
      )
      // timeout으로 자동 만료 — ref 정리만, UI는 영향 없음
      window.setTimeout(purgeExpiredUndo, UNDO_TIMEOUT_MS + 100)
    },
    [state, showToast, purgeExpiredUndo, restoreLastRemoved],
  )

  // ⌘Z / Ctrl+Z — 가장 최근 제거 복원
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isUndo =
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === 'z' &&
        !e.shiftKey
      if (!isUndo) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      )
        return
      if (restoreLastRemoved()) e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [restoreLastRemoved])

  /** ContemporaryPanel·TimelineCanvas 공용 — personId로 인물 상세 모달을 연다. */
  const openByPersonId = useCallback((personId: string) => {
    setModalPersonId(personId)
  }, [])

  useTimelineUrlSync({
    range: state.range,
    rows: state.rows,
    highlightYear: state.highlightYear,
    categoryFilter: categoryFilter.asList,
    isAllCategoriesEnabled: categoryFilter.isAllEnabled,
  })

  // 핀 추가 시 토스트로 시각 피드백 — 추가된 row 갯수 차이로 감지
  const prevRowsLen = useRef(state.rows.length)
  useEffect(() => {
    const diff = state.rows.length - prevRowsLen.current
    if (diff > 0 && prevRowsLen.current > 0) {
      // 0→1 첫 핀은 자동 fit 동작 자체가 시각 피드백이라 토스트 생략, 추가 핀만 알림
      showToast('success', `${diff}개 행 추가됨`)
    }
    prevRowsLen.current = state.rows.length
  }, [state.rows.length, showToast])

  const totalCountries = state.rows.reduce((acc, r) => acc + r.segments.length, 0)

  const handleCopyUrl = async () => {
    const r = await copyShareUrl()
    showToast(r.ok ? 'success' : 'error', r.message)
  }

  const handleDownload = () => {
    if (state.rows.length === 0) {
      showToast('warning', '저장할 핀이 없습니다')
      return
    }
    downloadComparisonJson({
      rows: state.rows,
      range: state.range,
      highlightYear: state.highlightYear,
      eventOverlayIds: eventOverlay.ids,
    })
    showToast('success', 'JSON 파일로 저장됨')
  }
  const handlePrint = () => {
    printComparison()
  }

  return (
    <HeadsTooltipProvider>
      <Wrapper
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Header>
          <HeaderRow>
            <TitleGroup>
              <Title>역대 수장 비교</Title>
              {state.rows.length > 0 && (
                <PinBadge>
                  <strong>{state.rows.length}</strong>행 ·{' '}
                  <strong>{totalCountries}</strong>개국
                </PinBadge>
              )}
            </TitleGroup>
            <HeaderActions>
              <IconButton
                type="button"
                onClick={handleCopyUrl}
                title="현재 비교 상태 URL 복사"
                aria-label="현재 비교 상태 URL 복사"
              >
                <FiLink size={14} />
              </IconButton>
              <IconButton
                type="button"
                onClick={handleDownload}
                title="JSON으로 내려받기"
                aria-label="JSON으로 내려받기"
              >
                <FiDownload size={14} />
              </IconButton>
              <IconButton
                type="button"
                onClick={handlePrint}
                title="인쇄·PDF 저장"
                aria-label="인쇄·PDF 저장"
              >
                <FiPrinter size={14} />
              </IconButton>
              <IconButton
                type="button"
                $active={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
                title="단축키 도움말"
                aria-label="단축키 도움말"
                aria-expanded={helpOpen}
              >
                <FiHelpCircle size={14} />
              </IconButton>
            </HeaderActions>
          </HeaderRow>
          <Subtitle>
            한 시점에 세계 각국이 누구의 통치 아래 있었는지 한눈에. 좌측에서
            국가를 고르고, 시간축의 연도를 클릭해 동시대 수장을 비교하세요.
          </Subtitle>
          <AnimatePresence initial={false}>
            {helpOpen && (
              <HelpRow
                key="help"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <HelpItem>
                  <Kbd>드래그</Kbd>
                  <span>시간축 좌우 이동</span>
                </HelpItem>
                <HelpItem>
                  <Kbd>휠</Kbd>
                  <span>가로 pan · </span>
                  <Kbd>Ctrl·⌘ + 휠</Kbd>
                  <span>줌</span>
                </HelpItem>
                <HelpItem>
                  <Kbd>연도 클릭</Kbd>
                  <span>동시대 가이드라인 · </span>
                  <Kbd>ESC</Kbd>
                  <span>해제</span>
                </HelpItem>
              </HelpRow>
            )}
          </AnimatePresence>
        </Header>

        <RangeControls
          range={state.range}
          onRangeChange={state.setRange}
          zoomAnchorYear={state.highlightYear}
          eventOverlayCount={eventOverlay.events.length}
          onOpenEventOverlay={() => setEventModalOpen(true)}
          userPresets={userPresets.list}
          onSaveUserPreset={(label, range) => {
            userPresets.add(label, range)
            showToast('success', `"${label}" 저장됨`)
          }}
          onRemoveUserPreset={userPresets.remove}
        />

        <LegendRow>
          <Legend
            enabled={categoryFilter.enabled}
            onToggle={categoryFilter.toggle}
            isAllEnabled={categoryFilter.isAllEnabled}
            onReset={categoryFilter.reset}
          />
        </LegendRow>

        <Body>
          <PinSidebar
            rows={state.rows}
            onAddRow={state.addRow}
            onAddManyRows={state.addManyRows}
            onRemoveRow={handleRemoveRowWithUndo}
            onMoveRow={state.moveRow}
            onReorderRow={state.reorderRow}
            onAddSegmentToRow={state.addSegmentToRow}
            onRemoveSegmentFromRow={state.removeSegmentFromRow}
            onClearAll={state.clearAll}
          />
          <TimelineCanvas
            rows={state.rows}
            range={state.range}
            onRangeChange={state.setRange}
            highlightYear={state.highlightYear}
            onHighlightYearChange={state.setHighlightYear}
            onPickMany={state.addManyRows}
            rowsTenures={rowsTenures}
            onRemoveRow={handleRemoveRowWithUndo}
            events={eventOverlay.events}
            onSelectBar={openBarModal}
            onJumpToCountry={(kind, countryId) => {
              if (kind === 'COUNTRY') {
                navigate(
                  `${pathKeys.personsTimeline()}?countries=${encodeURIComponent(countryId)}`,
                )
              }
              // 역사적 국가는 별도 진입 경로가 admin에 없을 수 있어 토스트로 안내만
              else {
                showToast('info', '역사적 국가의 인물 등록은 별도 페이지에서 가능합니다')
              }
            }}
            onSelectEvent={(eventId) => {
              navigate(`${pathKeys.events.root()}?selected=${encodeURIComponent(eventId)}`)
            }}
            onHighlightPeriod={setHighlightPeriod}
            highlightPeriod={highlightPeriod}
            isApplyingUrlPins={state.isApplyingUrlPins}
            onRemoveEvent={(id) => {
              eventOverlay.remove(id)
              showToast('info', '사건을 오버레이에서 제거했습니다')
            }}
            categoryFilter={categoryFilter.isEnabled}
          />
          <AnimatePresence initial={false}>
            {state.highlightYear != null && state.rows.length > 0 && (
              <ContemporaryPanel
                key="contemporary"
                highlightYear={state.highlightYear}
                rows={state.rows}
                rowsTenures={rowsTenures}
                onClose={() => state.setHighlightYear(null)}
                onSelectPerson={openByPersonId}
              />
            )}
          </AnimatePresence>
        </Body>

        <EventSearchModal
          isOpen={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          alreadyAddedIds={eventOverlay.ids}
          onAddMany={(ids) => ids.forEach(eventOverlay.add)}
        />
        <PersonDetailModal
          personId={modalPersonId}
          onClose={() => setModalPersonId(null)}
        />
      </Wrapper>
    </HeadsTooltipProvider>
  )
}

const Wrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background.primary};
  font-variant-numeric: tabular-nums;

  @media (prefers-reduced-motion: reduce) {
    /* 페이지 내 모든 트랜지션·애니메이션을 즉시 마무리 — 동작 자체는 보존 */
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }

  @media print {
    /* 인쇄 시엔 사이드바·동시대패널·헤더 액션은 숨기고 timeline + 라벨만 노출 */
    [data-print-hide] {
      display: none !important;
    }
    button[aria-label*="도움말"],
    button[aria-label*="복사"],
    button[aria-label*="저장"],
    button[aria-label*="인쇄"] {
      display: none !important;
    }
    height: auto;
    overflow: visible;
  }
`

const Header = styled.header`
  padding: 18px 32px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  @media (max-width: 760px) {
    padding: 12px 16px 10px;
  }
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`

const TitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const Title = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
  @media (max-width: 760px) {
    font-size: 18px;
  }
`

const PinBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.activeLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  strong {
    font-weight: 800;
  }
`

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button<{ $active?: boolean }>`
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.activeLight : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Subtitle = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 920px;
`

const HelpRow = styled(motion.div)`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  padding: 10px 12px;
  margin-top: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  overflow: hidden;
`

const HelpItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-bottom-width: 2px;
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
`

const LegendRow = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 8px 32px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  @media (max-width: 760px) {
    padding: 6px 16px;
  }
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  position: relative;
`
