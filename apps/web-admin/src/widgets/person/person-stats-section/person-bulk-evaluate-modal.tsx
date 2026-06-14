/**
 * 다중 인물 일괄 평가 모달.
 *
 * - 능력치 + 트레이트 폼은 PersonStatsEditModal과 동일 UX
 * - 저장 시 선택된 모든 personId에 동일 평가를 병렬로 upsert
 * - 부분 실패 보고
 *
 * 주의: 빈 슬라이더(미평가)는 N으로 보내지 않고 NULL 유지.
 *       즉, 선택된 인물의 기존 점수를 *덮어쓰지 않음*. 명시적으로 점수를 매긴 축만 적용.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { FiSlash } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  PERSON_STAT_KEYS,
  PERSON_STAT_META,
  PERSON_TRAIT_META,
  PERSON_TRAIT_ORDER,
  type PersonStatKey,
  type PersonTrait,
  upsertMyEvaluation,
} from '@/shared/api/person-stats'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

type Props = {
  open: boolean
  personIds: string[]
  onClose: () => void
}

type StatDraft = { [K in PersonStatKey]: number | null }
type TraitDraft = Map<PersonTrait, number | null>

const TRAIT_TONE_LABEL: Record<'positive' | 'neutral' | 'negative', string> = {
  positive: '긍정',
  neutral: '중립',
  negative: '부정',
}

const EMPTY_STATS: StatDraft = {
  politics: null,
  military: null,
  diplomacy: null,
  intellect: null,
  charisma: null,
  administration: null,
}

export function PersonBulkEvaluateModal({ open, personIds, onClose }: Props) {
  const queryClient = useQueryClient()
  const [draftStats, setDraftStats] = useState<StatDraft>(EMPTY_STATS)
  const [draftTraits, setDraftTraits] = useState<TraitDraft>(new Map())
  const [draftNotes, setDraftNotes] = useState('')
  const [overrideExisting, setOverrideExisting] = useState(false)

  // open 토글 시 초기화
  useEffect(() => {
    if (!open) return
    setDraftStats(EMPTY_STATS)
    setDraftTraits(new Map())
    setDraftNotes('')
    setOverrideExisting(false)
  }, [open])

  const isDirty = useMemo(() => {
    if (PERSON_STAT_KEYS.some((k) => draftStats[k] !== null)) return true
    if (draftTraits.size > 0) return true
    if (draftNotes.trim()) return true
    return false
  }, [draftStats, draftTraits, draftNotes])

  const saveMut = useMutation({
    mutationFn: async () => {
      // null 차원은 보내지 않음 (override 켜지지 않은 경우) — 기존 점수 보존
      const statsBody: Record<string, number | null | string> = {}
      for (const k of PERSON_STAT_KEYS) {
        if (draftStats[k] !== null) statsBody[k] = draftStats[k]
        else if (overrideExisting) statsBody[k] = null // override = 명시적 null로 초기화
      }
      if (draftNotes.trim()) statsBody.notes = draftNotes.trim()

      const traitsBody = {
        items: Array.from(draftTraits.entries()).map(([trait, intensity]) => ({
          trait,
          intensity: intensity ?? null,
        })),
      }

      // override가 false이고 trait도 비어있으면 trait 변경 안 함
      const sendTraits = overrideExisting || draftTraits.size > 0

      const results = await Promise.allSettled(
        personIds.map((id) =>
          upsertMyEvaluation(id, {
            stats: Object.keys(statsBody).length > 0 ? statsBody : undefined,
            traits: sendTraits ? traitsBody : undefined,
          } as Parameters<typeof upsertMyEvaluation>[1]),
        ),
      )
      return {
        success: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      }
    },
  })

  const requestClose = useCallback(async () => {
    if (saveMut.isPending) return
    if (
      isDirty &&
      !(await confirm({
        title: '확인',
        message: '변경 사항이 저장되지 않았습니다. 닫을까요?',
      }))
    )
      return
    onClose()
  }, [isDirty, saveMut.isPending, onClose])

  const handleSave = async () => {
    try {
      const { success, failed } = await saveMut.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: ['my-evaluations'] })
      // person-stats / person-traits 개별 쿼리도 무효화
      personIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ['person-stats', id] })
        queryClient.invalidateQueries({ queryKey: ['person-traits', id] })
      })
      if (failed === 0) notify.success(`${success}명에게 평가를 적용했습니다.`)
      else notify.error(`${success}명 성공, ${failed}명 실패`)
      onClose()
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '저장 실패')
    }
  }

  const traitsByTone: Record<
    'positive' | 'neutral' | 'negative',
    PersonTrait[]
  > = {
    positive: [],
    neutral: [],
    negative: [],
  }
  PERSON_TRAIT_ORDER.forEach((trait) => {
    traitsByTone[PERSON_TRAIT_META[trait].tone].push(trait)
  })

  return (
    <Modal
      isOpen={open}
      onClose={requestClose}
      title={`선택된 ${personIds.length}명에 일괄 평가 적용`}
      subtitle="점수를 매긴 축만 적용됩니다. 비워둔 축은 기존 값 유지."
      maxWidth="640px"
    >
      <ModalBody>
        <SectionLabel>능력치 (선택적)</SectionLabel>
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
                    setDraftStats((d) => ({
                      ...d,
                      [key]: Number(e.target.value),
                    }))
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
                  title={isNull ? '점수 부여' : '비활성화 (기존 점수 유지)'}
                >
                  <FiSlash size={12} />
                </NullToggle>
              </StatRow>
            )
          })}
        </StatGrid>

        <SectionLabel>
          성격 태그 (선택적)
          <SectionLabelHint>{draftTraits.size}개 선택됨</SectionLabelHint>
        </SectionLabel>
        <TraitGroups>
          {(['positive', 'neutral', 'negative'] as const).map((tone) => (
            <TraitGroup key={tone}>
              <TraitGroupTitle $tone={tone}>
                {TRAIT_TONE_LABEL[tone]}
              </TraitGroupTitle>
              <TraitChipRow>
                {traitsByTone[tone].map((trait) => {
                  const meta = PERSON_TRAIT_META[trait]
                  const active = draftTraits.has(trait)
                  return (
                    <TraitToggle
                      key={trait}
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
                    </TraitToggle>
                  )
                })}
              </TraitChipRow>
            </TraitGroup>
          ))}
        </TraitGroups>

        <SectionLabel>메모 (선택적)</SectionLabel>
        <NotesArea
          rows={2}
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          placeholder="공통 평가 메모"
        />

        <OverrideRow>
          <input
            id="bulk-override"
            type="checkbox"
            checked={overrideExisting}
            onChange={(e) => setOverrideExisting(e.target.checked)}
          />
          <label htmlFor="bulk-override">
            <strong>강제 덮어쓰기</strong> — 비워둔 축도 NULL로, 태그도 빈
            set으로 적용 (선택 인물의 기존 평가가 *완전히* 본 폼 내용으로
            교체됨)
          </label>
        </OverrideRow>
      </ModalBody>

      <ModalFooter>
        <DirtyHint>
          {isDirty ? '변경 사항 있음' : '비어 있음 — 적용할 내용 없음'}
        </DirtyHint>
        <GhostBtn
          type="button"
          onClick={requestClose}
          disabled={saveMut.isPending}
        >
          취소
        </GhostBtn>
        <PrimaryBtn
          type="button"
          onClick={handleSave}
          disabled={saveMut.isPending || !isDirty}
        >
          {saveMut.isPending ? '저장 중…' : `${personIds.length}명에 적용`}
        </PrimaryBtn>
      </ModalFooter>
    </Modal>
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
  color: ${({ theme }) =>
    theme.colors.text.tertiary ?? theme.colors.text.secondary};
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
        ? 'rgba(99,102,241,0.45)'
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
const traitToneBg = (tone: 'positive' | 'negative' | 'neutral') => {
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

const TraitGroupTitle = styled.div<{
  $tone: 'positive' | 'neutral' | 'negative'
}>`
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: ${({ $tone }) => traitToneFg[$tone]};
`

const TraitChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TraitToggle = styled.button<{
  $active: boolean
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  min-width: 56px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
  text-align: center;
  color: ${({ $active, $tone, theme }) =>
    $active
      ? traitToneBg($tone).fg
      : theme.mode === 'dark'
        ? 'rgba(248,250,252,0.55)'
        : '#64748b'};
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
  min-height: 50px;
  font-family: inherit;
`

const OverrideRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.05);
  border: 1px solid rgba(220, 38, 38, 0.2);
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  label {
    line-height: 1.5;
  }
  strong {
    color: #dc2626;
  }
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
`

const PrimaryBtn = styled.button`
  ${buttonBase}
  font-weight: 700;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
`
