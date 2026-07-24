/**
 * 가문 통치기록 모달 — 시드에 쌓인 통치기록(역사/현대 국가)을 처음으로 화면에 노출.
 * 역사국가·현대국가 rule을 탭 분할 없이 연대순 단일 리스트 + 배지로 통합(전형 건수 <5).
 * 편집은 종료 사유(endReason)·비고(notes)만(좁은 인라인) — 통치 국가·기간 저작은 별건(제품 게이트).
 *
 * 지면 결정 근거: 가문 상세 페이지가 부재하고, 목록 행 확장은 rules 페이로드가 없어 지연페치를 강요.
 * 구성원 인포그래픽 모달 셸(glassCardMixin+OVERLAY_STYLES)을 포크.
 */
import { useEffect, useMemo, useState } from 'react'

import { FiGlobe, FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  useDeleteDynastyRule,
  useDynastyDetail,
} from '@/features/dynasty/use-dynasties.hook'
import type {
  DynastyHistoricalRule,
  DynastyModernRule,
} from '@/shared/api/dynasty'
import {
  formatCountryYearShort,
  getCountryYearRange,
  toSignedYear,
} from '@/shared/lib/country-period'
import { glassCardMixin } from '@/shared/styles/mixins'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { OVERLAY_STYLES, Z_INDEX } from '@/shared/styles/z-index'

import { DynastyRuleForm } from './dynasty-rule-form'

export type DynastyRulesModalProps = {
  dynastyId: string
  dynastyName: string
  isOpen: boolean
  onClose: () => void
}

export type RuleKind = 'historical' | 'modern'

/** 역사/현대 rule을 한 리스트로 다루기 위한 통합 형태. */
export type UnifiedRule = {
  id: string
  kind: RuleKind
  countryName: string
  startEra: string | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: string | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  startReason: string | null
  endReason: string | null
  notes: string | null
}

function unifyHistorical(rule: DynastyHistoricalRule): UnifiedRule {
  return {
    id: rule.id,
    kind: 'historical',
    countryName: rule.historicalCountryName,
    startEra: rule.startEra,
    startYear: rule.startYear,
    startMonth: rule.startMonth,
    startDay: rule.startDay,
    endEra: rule.endEra,
    endYear: rule.endYear,
    endMonth: rule.endMonth,
    endDay: rule.endDay,
    startReason: rule.startReason,
    endReason: rule.endReason,
    notes: rule.notes,
  }
}

function unifyModern(rule: DynastyModernRule): UnifiedRule {
  return {
    id: rule.id,
    kind: 'modern',
    countryName: rule.countryName,
    startEra: rule.startEra,
    startYear: rule.startYear,
    startMonth: rule.startMonth,
    startDay: rule.startDay,
    endEra: rule.endEra,
    endYear: rule.endYear,
    endMonth: rule.endMonth,
    endDay: rule.endDay,
    startReason: rule.startReason,
    endReason: rule.endReason,
    notes: rule.notes,
  }
}

/** 통치 기간 라벨 — 부호연도 기준. 종료 미상이면 '현재'(진행 통치), 시작·종료 모두 없으면 '연도 미상'. */
function rulePeriodLabel(rule: UnifiedRule): string {
  const range = getCountryYearRange(rule)
  if (range.start == null && range.end == null) return '연도 미상'
  const left = formatCountryYearShort(range.start) ?? '?'
  const right = range.end != null ? formatCountryYearShort(range.end) : '현재'
  return `${left} – ${right}`
}

export function DynastyRulesModal({
  dynastyId,
  dynastyName,
  isOpen,
  onClose,
}: DynastyRulesModalProps) {
  const { data: detail, isLoading, isError } = useDynastyDetail(
    dynastyId,
    isOpen,
  )
  const deleteRule = useDeleteDynastyRule()

  // 인라인 폼 상태 — 신규 등록 or 특정 rule 수정(한 번에 하나).
  const [formMode, setFormMode] = useState<
    { type: 'create' } | { type: 'edit'; rule: UnifiedRule } | null
  >(null)

  // ESC 닫기 + 배경 스크롤 잠금 (구성원 모달과 동일).
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  const rules = useMemo(() => {
    if (!detail) return []
    const merged: UnifiedRule[] = [
      ...detail.historicalRules.map(unifyHistorical),
      ...detail.modernRules.map(unifyModern),
    ]
    // 연대순(부호연도 asc). 시작연도 미상은 항상 뒤로 + 국가명 2차정렬(안정적 버킷).
    return merged.sort((left, right) => {
      const leftStart = toSignedYear(left.startEra, left.startYear)
      const rightStart = toSignedYear(right.startEra, right.startYear)
      if (leftStart == null && rightStart == null) {
        return left.countryName.localeCompare(right.countryName, 'ko')
      }
      if (leftStart == null) return 1
      if (rightStart == null) return -1
      if (leftStart !== rightStart) return leftStart - rightStart
      return left.countryName.localeCompare(right.countryName, 'ko')
    })
  }, [detail])

  if (!isOpen) return null

  const closeForm = () => setFormMode(null)
  const handleDelete = async (rule: UnifiedRule) => {
    if (
      !(await confirm({
        title: '통치기록 삭제',
        message: `${rule.countryName} 통치기록을 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    try {
      await deleteRule.mutateAsync({
        dynastyId,
        ruleId: rule.id,
        kind: rule.kind,
      })
      notify.success('통치기록을 삭제했습니다.')
    } catch {
      notify.error('삭제에 실패했습니다.')
    }
  }

  const total = rules.length
  const creating = formMode?.type === 'create'
  const editingId = formMode?.type === 'edit' ? formMode.rule.id : null

  return (
    <Overlay
      role="dialog"
      aria-modal
      aria-labelledby="dynasty-rules-title"
      onClick={onClose}
    >
      <Panel onClick={(event) => event.stopPropagation()}>
        <PanelHeader>
          <HeaderLead>
            <HeaderIcon aria-hidden>
              <FiGlobe size={20} strokeWidth={1.75} />
            </HeaderIcon>
            <div>
              <PanelTitle id="dynasty-rules-title">통치 기록</PanelTitle>
              <PanelSubtitle>{dynastyName}</PanelSubtitle>
            </div>
          </HeaderLead>
          <HeaderActions>
            {!isLoading && !isError && !formMode && (
              <AddBtn type="button" onClick={() => setFormMode({ type: 'create' })}>
                <FiPlus size={15} />
                통치 기록 추가
              </AddBtn>
            )}
            <CloseBtn type="button" aria-label="닫기" onClick={onClose}>
              <FiX size={22} />
            </CloseBtn>
          </HeaderActions>
        </PanelHeader>

        <Body>
          {isLoading && <StatusMsg>불러오는 중…</StatusMsg>}
          {isError && (
            <StatusMsg $err>통치 기록을 불러오지 못했습니다.</StatusMsg>
          )}

          {!isLoading && !isError && creating && (
            <CreateSlot>
              <DynastyRuleForm
                dynastyId={dynastyId}
                editing={null}
                onDone={closeForm}
                onCancel={closeForm}
              />
            </CreateSlot>
          )}

          {!isLoading && !isError && total === 0 && !creating && (
            <EmptyWrap>
              <EmptyIcon aria-hidden>
                <FiGlobe size={28} strokeWidth={1.5} />
              </EmptyIcon>
              <EmptyTitle>등록된 통치 기록이 없습니다</EmptyTitle>
              <EmptyDesc>
                이 가문이 통치한 국가·기간을 &apos;통치 기록 추가&apos;로
                등록하세요.
              </EmptyDesc>
            </EmptyWrap>
          )}

          {!isLoading && !isError && total > 0 && (
            <RuleList>
              {rules.map((rule) => {
                const isEditing = editingId === rule.id
                if (isEditing) {
                  return (
                    <DynastyRuleForm
                      key={rule.id}
                      dynastyId={dynastyId}
                      editing={rule}
                      onDone={closeForm}
                      onCancel={closeForm}
                    />
                  )
                }
                return (
                  <RuleCard key={rule.id}>
                    <RuleTop>
                      <RuleHead>
                        <KindBadge $modern={rule.kind === 'modern'}>
                          {rule.kind === 'modern' ? '현대국가' : '역사국가'}
                        </KindBadge>
                        <CountryName>{rule.countryName}</CountryName>
                        <Period>{rulePeriodLabel(rule)}</Period>
                      </RuleHead>
                      <CardActions>
                        <EditBtn
                          type="button"
                          onClick={() => setFormMode({ type: 'edit', rule })}
                          disabled={Boolean(formMode) || deleteRule.isPending}
                        >
                          수정
                        </EditBtn>
                        <DeleteBtn
                          type="button"
                          onClick={() => handleDelete(rule)}
                          disabled={Boolean(formMode) || deleteRule.isPending}
                        >
                          삭제
                        </DeleteBtn>
                      </CardActions>
                    </RuleTop>

                    <RuleMeta>
                      {rule.startReason && (
                        <MetaRow>
                          <MetaLabel>통치 시작 사유</MetaLabel>
                          <MetaValue>{rule.startReason}</MetaValue>
                        </MetaRow>
                      )}
                      {rule.endReason ? (
                        <MetaRow>
                          <MetaLabel>통치 종료 사유</MetaLabel>
                          <MetaValue>{rule.endReason}</MetaValue>
                        </MetaRow>
                      ) : (
                        <MetaRowMuted>통치 종료 사유 미기록</MetaRowMuted>
                      )}
                      {rule.notes && (
                        <MetaRow>
                          <MetaLabel>비고</MetaLabel>
                          <MetaValue>{rule.notes}</MetaValue>
                        </MetaRow>
                      )}
                    </RuleMeta>
                  </RuleCard>
                )
              })}
            </RuleList>
          )}
        </Body>
      </Panel>
    </Overlay>
  )
}

/* ─── shell (구성원 모달과 동형) ─────────────────────────────────────────── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: ${OVERLAY_STYLES.BACKGROUND};
  backdrop-filter: ${OVERLAY_STYLES.BACKDROP_FILTER};
`

const Panel = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  width: 100%;
  max-width: 680px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  z-index: ${Z_INDEX.MODAL_CONTENT};
`

const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderLead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
`

const PanelTitle = styled.h2`
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PanelSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CloseBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  border-radius: 999px;
  color: ${({ theme }) => theme.colors.button.text};
  background: ${({ theme }) => theme.colors.primary};
  transition: background 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.button.hover};
  }
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px 22px;
`

/* ─── rule list / card ──────────────────────────────────────────────────── */

const RuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RuleCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const RuleTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
`

const RuleHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
`

const KindBadge = styled.span<{ $modern: boolean }>`
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: ${({ theme, $modern }) =>
    $modern ? theme.colors.text.secondary : theme.colors.primary};
  background: ${({ theme, $modern }) =>
    $modern ? theme.colors.background.tertiary : theme.colors.activeLight};
`

const CountryName = styled.span`
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Period = styled.span`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CardActions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

const EditBtn = styled.button`
  flex-shrink: 0;
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  transition:
    border-color 0.12s,
    color 0.12s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const DeleteBtn = styled(EditBtn)`
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.error};
    color: ${({ theme }) => theme.colors.error};
  }
`

const RuleMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
`

const MetaRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
`

const MetaRowMuted = styled.div`
  margin-top: 10px;
  font-size: 12.5px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaLabel = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaValue = styled.span`
  min-width: 0;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: break-word;
`

const CreateSlot = styled.div`
  margin-bottom: 12px;
`

/* ─── status / empty ────────────────────────────────────────────────────── */

const StatusMsg = styled.div<{ $err?: boolean }>`
  padding: 40px 12px;
  text-align: center;
  font-size: 13.5px;
  color: ${({ theme, $err }) =>
    $err ? theme.colors.error : theme.colors.text.secondary};
`

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 20px;
  text-align: center;
`

const EmptyIcon = styled.div`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyTitle = styled.div`
  font-size: 14.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyDesc = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 320px;
`
