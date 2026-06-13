/**
 * 인물 능력치·성격 태그 편집 모달.
 *
 * 6축 슬라이더 + 미평가(NULL) 토글 + 성격 태그 다중 선택 + 메모.
 * 더티 상태에서 ESC/오버레이/취소 시 확인 후 닫음.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FiSlash, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled, { css } from 'styled-components'

import {
  type PersonStats,
  type PersonStatKey,
  type PersonTrait,
  type PersonTraitAssignment,
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
  PERSON_TRAIT_META,
  PERSON_TRAIT_ORDER,
  deleteMyEvaluation,
  upsertMyEvaluation,
} from '@/shared/api/person-stats'
import { confirm } from '@/shared/ui/confirm-dialog'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal'

type Props = {
  open: boolean
  personId: string
  personName?: string
  initialStats: PersonStats | null | undefined
  initialTraits: PersonTraitAssignment[]
  /** 삭제 버튼 노출 여부 — 평가가 이미 있을 때만 true */
  canDelete?: boolean
  onClose: () => void
}

type StatDraft = {
  [K in PersonStatKey]: number | null
}

const TRAIT_TONE_LABEL: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정',
}

type TraitDraft = Map<PersonTrait, number | null>

function buildInitialStatDraft(stats: PersonStats | null | undefined): StatDraft {
  return PERSON_STAT_KEYS.reduce((acc, key) => {
    acc[key] = stats?.[key] ?? null
    return acc
  }, {} as StatDraft)
}

function buildInitialTraitDraft(traits: PersonTraitAssignment[]): TraitDraft {
  return new Map(traits.map((t) => [t.trait, t.intensity ?? null]))
}

function statsEqual(a: StatDraft, b: StatDraft): boolean {
  return PERSON_STAT_KEYS.every((k) => (a[k] ?? null) === (b[k] ?? null))
}

function traitsEqual(a: TraitDraft, b: TraitDraft): boolean {
  if (a.size !== b.size) return false
  for (const [trait, intensity] of a) {
    if (!b.has(trait)) return false
    if ((b.get(trait) ?? null) !== (intensity ?? null)) return false
  }
  return true
}

export function PersonStatsEditModal({
  open,
  personId,
  personName,
  initialStats,
  initialTraits,
  canDelete = false,
  onClose,
}: Props) {
  const queryClient = useQueryClient()

  const initialDraftStats = useMemo(
    () => buildInitialStatDraft(initialStats),
    [initialStats],
  )
  const initialDraftTraits = useMemo(
    () => buildInitialTraitDraft(initialTraits),
    [initialTraits],
  )

  const [draftStats, setDraftStats] = useState<StatDraft>(initialDraftStats)
  const [draftTraits, setDraftTraits] = useState<TraitDraft>(initialDraftTraits)
  const [draftNotes, setDraftNotes] = useState(initialStats?.notes ?? '')

  const firstFocusRef = useRef<HTMLButtonElement | null>(null)

  // open 토글 시 초기값 동기화
  useEffect(() => {
    if (!open) return
    setDraftStats(initialDraftStats)
    setDraftTraits(new Map(initialDraftTraits))
    setDraftNotes(initialStats?.notes ?? '')
  }, [open, initialDraftStats, initialDraftTraits, initialStats?.notes])

  const isDirty = useMemo(() => {
    if (!statsEqual(draftStats, initialDraftStats)) return true
    if (!traitsEqual(draftTraits, initialDraftTraits)) return true
    if ((draftNotes ?? '') !== (initialStats?.notes ?? '')) return true
    return false
  }, [draftStats, draftTraits, draftNotes, initialDraftStats, initialDraftTraits, initialStats?.notes])

  const saveMut = useMutation({
    mutationFn: () =>
      upsertMyEvaluation(personId, {
        stats: { ...draftStats, notes: draftNotes.trim() ? draftNotes.trim() : null },
        traits: {
          items: Array.from(draftTraits.entries()).map(([trait, intensity]) => ({
            trait,
            intensity: intensity ?? null,
          })),
        },
      }),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteMyEvaluation(personId),
  })

  const isSaving = saveMut.isPending
  const isDeleting = deleteMut.isPending
  const isBusy = isSaving || isDeleting

  const requestClose = useCallback(async () => {
    if (isBusy) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message: '변경 사항이 저장되지 않았습니다. 닫을까요?',
      }))
    )
      return
    onClose()
  }, [isDirty, isBusy, onClose])

  // ESC 키 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, requestClose])

  // 첫 진입 시 닫기 버튼에 포커스 (스크린리더 사용자 + 키보드 네비)
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => firstFocusRef.current?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['person-stats', personId] }),
      queryClient.invalidateQueries({ queryKey: ['person-traits', personId] }),
      // 리스트의 평가 핀·정렬·필터가 사용하는 bulk 인덱스
      queryClient.invalidateQueries({ queryKey: ['my-evaluations'] }),
    ])

  const handleSave = async () => {
    try {
      await saveMut.mutateAsync()
      await invalidateAll()
      toast.success('평가를 저장했습니다.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '저장 실패')
    }
  }

  const handleDelete = async () => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '나의 능력치 평가와 성격 태그를 모두 제거할까요?',
        danger: true,
      }))
    )
      return
    try {
      await deleteMut.mutateAsync()
      await invalidateAll()
      toast.success('평가를 삭제했습니다.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  if (!open) return null

  const traitsByTone: Record<'positive' | 'neutral' | 'negative', PersonTrait[]> = {
    positive: [],
    neutral: [],
    negative: [],
  }
  PERSON_TRAIT_ORDER.forEach((trait) => {
    traitsByTone[PERSON_TRAIT_META[trait].tone].push(trait)
  })

  return (
    <ModalOverlay onClick={requestClose}>
      <ModalBox
        onClick={(e) => e.stopPropagation()}
        $maxWidth="640px"
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-stats-modal-title"
      >
        <ModalHeader>
          <div>
            <ModalTitle id="person-stats-modal-title">능력치 · 성격 평가</ModalTitle>
            {personName && <ModalSubtitle>{personName}</ModalSubtitle>}
          </div>
          <ModalCloseButton ref={firstFocusRef} type="button" onClick={requestClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <SectionLabel>6축 능력치 (0–100)</SectionLabel>
          <StatGrid>
            {PERSON_STAT_KEYS.map((key) => {
              const value = draftStats[key]
              const isNull = value === null
              const meta = PERSON_STAT_META[key]
              return (
                <StatRow key={key} $disabled={isNull}>
                  <StatLabel>
                    <StatLabelDot style={{ background: meta.color }} />
                    {meta.label}
                  </StatLabel>
                  <StatSlider
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value ?? 0}
                    disabled={isNull}
                    onChange={(e) =>
                      setDraftStats((d) => ({ ...d, [key]: Number(e.target.value) }))
                    }
                    style={{ accentColor: meta.color }}
                  />
                  <StatNumberInput
                    type="number"
                    min={0}
                    max={100}
                    value={value ?? ''}
                    placeholder="—"
                    disabled={isNull}
                    onChange={(e) => {
                      const raw = e.target.value
                      if (raw === '') {
                        setDraftStats((d) => ({ ...d, [key]: null }))
                      } else {
                        const v = Math.max(0, Math.min(100, Number(raw)))
                        setDraftStats((d) => ({ ...d, [key]: v }))
                      }
                    }}
                  />
                  <NullToggle
                    type="button"
                    $active={isNull}
                    onClick={() =>
                      setDraftStats((d) => ({ ...d, [key]: isNull ? 50 : null }))
                    }
                    title={isNull ? '점수 부여' : '미평가로 전환 (NULL)'}
                    aria-label={isNull ? '점수 부여' : '미평가로 전환'}
                  >
                    <FiSlash size={12} />
                  </NullToggle>
                </StatRow>
              )
            })}
          </StatGrid>

          <SectionLabel>
            성격 태그
            <SectionLabelHint>
              {draftTraits.size}개 선택됨 · 활성 칩의 점을 눌러 강도 1~3 설정
            </SectionLabelHint>
          </SectionLabel>
          <TraitGroups>
            {(['positive', 'neutral', 'negative'] as const).map((tone) => (
              <TraitGroup key={tone}>
                <TraitGroupTitle $tone={tone}>{TRAIT_TONE_LABEL[tone]}</TraitGroupTitle>
                <TraitChipRow>
                  {traitsByTone[tone].map((trait) => {
                    const meta = PERSON_TRAIT_META[trait]
                    const active = draftTraits.has(trait)
                    const intensity = draftTraits.get(trait) ?? null
                    return (
                      <TraitChipShell key={trait} $active={active} $tone={meta.tone}>
                        <TraitLabelBtn
                          type="button"
                          $active={active}
                          $tone={meta.tone}
                          onClick={() =>
                            setDraftTraits((prev) => {
                              const next = new Map(prev)
                              if (next.has(trait)) next.delete(trait)
                              else next.set(trait, null)
                              return next
                            })
                          }
                        >
                          {meta.label}
                        </TraitLabelBtn>
                        {active && (
                          <IntensityGroup>
                            {[1, 2, 3].map((lvl) => {
                              const isActive = intensity === lvl
                              return (
                                <IntensityDot
                                  key={lvl}
                                  type="button"
                                  $active={isActive}
                                  $tone={meta.tone}
                                  onClick={() =>
                                    setDraftTraits((prev) => {
                                      const next = new Map(prev)
                                      next.set(trait, isActive ? null : lvl)
                                      return next
                                    })
                                  }
                                  title={`강도 ${lvl}`}
                                  aria-label={`강도 ${lvl}`}
                                >
                                  {lvl}
                                </IntensityDot>
                              )
                            })}
                          </IntensityGroup>
                        )}
                      </TraitChipShell>
                    )
                  })}
                </TraitChipRow>
              </TraitGroup>
            ))}
          </TraitGroups>

          <SectionLabel>메모</SectionLabel>
          <NotesArea
            rows={3}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="평가 근거 또는 자유 메모 (선택)"
          />
        </ModalBody>

        <ModalFooter>
          {/* #4: 위험 액션은 좌측에 분리 — 우측의 저장 버튼과 명확히 구분 */}
          {canDelete && (
            <DangerBtn
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
              title="능력치 + 성격 태그 일괄 삭제"
            >
              <FiTrash2 size={13} /> {isDeleting ? '삭제 중…' : '평가 삭제'}
            </DangerBtn>
          )}
          <DirtyHint>{isDirty ? '변경 사항 있음' : ''}</DirtyHint>
          <GhostBtn type="button" onClick={requestClose} disabled={isBusy}>
            취소
          </GhostBtn>
          <PrimaryBtn type="button" onClick={handleSave} disabled={isBusy || !isDirty}>
            {isSaving ? '저장 중…' : '저장'}
          </PrimaryBtn>
        </ModalFooter>
      </ModalBox>
    </ModalOverlay>
  )
}

// ─── styled ───────────────────────────────────────────────────────────────────

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 4px;
`

const SectionLabelHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary ?? theme.colors.text.secondary};
`

const StatGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const StatRow = styled.div<{ $disabled?: boolean }>`
  display: grid;
  grid-template-columns: 84px 1fr 60px 28px;
  align-items: center;
  gap: 10px;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: opacity 0.15s ease;
`

const StatLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StatLabelDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
`

const StatSlider = styled.input`
  width: 100%;
  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
  }
`

const StatNumberInput = styled.input`
  width: 60px;
  padding: 5px 7px;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    appearance: none;
    margin: 0;
  }
  &:disabled {
    cursor: not-allowed;
  }
`

const NullToggle = styled.button<{ $active: boolean }>`
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? 'rgba(99, 102, 241, 0.45)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : '#e2e8f0'};
  background: ${({ $active, theme }) =>
    $active
      ? 'rgba(99,102,241,0.12)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fff'};
  color: ${({ $active, theme }) =>
    $active ? '#6366f1' : theme.colors.text.secondary};
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
  &:hover {
    color: #6366f1;
    border-color: rgba(99, 102, 241, 0.45);
  }
`

const TraitGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TraitGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const traitToneFg: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '#0e7490',
  neutral: '#475569',
  negative: '#9f1239',
}

const TraitGroupTitle = styled.div<{
  $tone: 'positive' | 'neutral' | 'negative'
}>`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${({ $tone }) => traitToneFg[$tone]};
`

const traitToneBg = (
  tone: 'positive' | 'negative' | 'neutral',
): { fg: string; bg: string; border: string } => {
  if (tone === 'positive')
    return {
      fg: '#0e7490',
      bg: 'rgba(207, 250, 254, 0.7)',
      border: 'rgba(103, 232, 249, 0.5)',
    }
  if (tone === 'negative')
    return {
      fg: '#9f1239',
      bg: 'rgba(255, 228, 230, 0.85)',
      border: 'rgba(251, 113, 133, 0.45)',
    }
  return {
    fg: '#475569',
    bg: 'rgba(241, 245, 249, 0.85)',
    border: 'rgba(148, 163, 184, 0.4)',
  }
}

const TraitChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

/** 활성 시 라벨+강도 점이 한 칩 안에 묶이는 컨테이너 */
const TraitChipShell = styled.span<{
  $active: boolean
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  display: inline-flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ $active, $tone, theme }) =>
    $active
      ? traitToneBg($tone).bg
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fff'};
  border: 1px solid
    ${({ $active, $tone, theme }) =>
      $active
        ? traitToneBg($tone).border
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  transition: background 0.12s ease, border-color 0.12s ease;
`

const TraitLabelBtn = styled.button<{
  $active: boolean
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  min-width: 56px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 10px;
  cursor: pointer;
  text-align: center;
  background: transparent;
  border: none;
  color: ${({ $active, $tone, theme }) =>
    $active
      ? traitToneBg($tone).fg
      : theme.mode === 'dark'
        ? 'rgba(248,250,252,0.55)'
        : '#64748b'};
  transition: color 0.12s ease;
`

const IntensityGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 0 4px 0 0;
`

const IntensityDot = styled.button<{
  $active: boolean
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, $tone }) =>
    $active ? traitToneBg($tone).fg : 'transparent'};
  color: ${({ $active, $tone }) =>
    $active ? '#fff' : traitToneBg($tone).fg};
  opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  transition: opacity 0.12s ease, background 0.12s ease;
  &:hover {
    opacity: 1;
  }
`

const NotesArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  min-height: 70px;
  font-family: inherit;
`

const DirtyHint = styled.span`
  margin-right: auto;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const buttonBase = css`
  padding: 8px 16px;
  border-radius: 9px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const GhostBtn = styled.button`
  ${buttonBase}
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PrimaryBtn = styled.button`
  ${buttonBase}
  font-weight: 700;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
`

/** 위험 액션 — footer 좌측에 분리 배치 */
const DangerBtn = styled.button`
  ${buttonBase}
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.3);
  &:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.06);
    border-color: rgba(220, 38, 38, 0.5);
  }
`
