/**
 * 임명 모달의 직책(보직) 칸 — DB 직위 정의에서만 고른다. 없는 직책은 그 자리에서 DB에 등록한다.
 *
 * - 위: 이 기관(부대)에 묶인 직책을 한 번에 고르는 칩
 * - 가운데: 검색 콤보박스(이 기관 / 이 나라에서 쓰인 직책 / 관직 카탈로그) — 선택지 규칙은 position-definition-options
 * - 목록에 없으면 '‘X’ 직책을 DB에 등록' → 칸 아래 작은 등록 줄(이름·유형·현지 표기) → 만들고 곧바로 고른다.
 *   기관·부대 맥락이면 그 기관·부대 전용 정의로, 내각처럼 기관이 없으면 이 나라 스코프 정의로 만든다
 *   (스코프 0행 정의는 전역이라 모든 나라 피커에 뜨므로, 스코프를 못 붙이면 방금 만든 정의를 지운다).
 * - 수정 중인 기록이 예전 자유 입력(일반 정의 + 이름 문자열)이면 그 이름으로 바로 등록하는 안내를 띄운다.
 */
import React, { useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiAlertCircle, FiDatabase, FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { personCareerApi } from '@/shared/api/person-career'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { InlineSearchSelect } from '@/shared/ui/person-register-modal/sections/inline-search-select'
import { notify } from '@/shared/ui/toast'

import {
  buildPositionDefinitionOptions,
  CREATABLE_POSITION_TYPES,
  findDefinitionByTitle,
  isAppointableDefinition,
  ownGroupLabel,
  POSITION_TYPE_LABEL,
  type AppointmentContextType,
  type PositionDefinitionLike,
} from './position-definition-options'

export interface SelectedPositionDefinition {
  id: string
  title: string
  positionType: string | null
}

export interface PositionDefinitionFieldProps {
  id?: string
  contextType: AppointmentContextType
  departmentId?: string | null
  departmentName?: string | null
  militaryUnitId?: string | null
  militaryUnitName?: string | null
  countryId?: string | null
  historicalCountryId?: string | null
  /** 고른 정의 id('' = 미선택) */
  value: string
  onSelect: (definition: SelectedPositionDefinition | null) => void
  /** 수정 중인 기록이 DB 직책 없이 이름으로만 저장돼 있을 때 그 이름 */
  legacyTitle?: string | null
  /** 새 직책 등록 시 이름으로 유형을 짐작 */
  inferPositionType?: (title: string) => string
  error?: boolean
  ariaDescribedBy?: string
  disabled?: boolean
}

const QUICK_CHIP_LIMIT = 8

export function PositionDefinitionField({
  id,
  contextType,
  departmentId,
  departmentName,
  militaryUnitId,
  militaryUnitName,
  countryId,
  historicalCountryId,
  value,
  onSelect,
  legacyTitle,
  inferPositionType,
  error,
  ariaDescribedBy,
  disabled,
}: PositionDefinitionFieldProps) {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftType, setDraftType] = useState('CABINET_MINISTER')
  const [draftLocal, setDraftLocal] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data: allDefinitions = [] } = useQuery<PositionDefinitionLike[]>({
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}) as Promise<PositionDefinitionLike[]>,
    staleTime: 60_000,
  })
  const { data: pickerResponse } = useQuery({
    queryKey: ['position-definitions', 'picker', countryId ?? '', historicalCountryId ?? ''],
    queryFn: () =>
      personCareerApi.getPositionDefinitionsForPicker({
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
      }),
    enabled: Boolean(countryId || historicalCountryId),
    staleTime: 60_000,
  })
  const pickerDefinitions = useMemo(
    () => (pickerResponse?.definitions ?? []) as PositionDefinitionLike[],
    [pickerResponse],
  )

  const { options, ownDefinitions, byId } = useMemo(
    () =>
      buildPositionDefinitionOptions({
        all: allDefinitions,
        picker: pickerDefinitions,
        contextType,
        departmentId,
        militaryUnitId,
        selectedId: value || null,
      }),
    [allDefinitions, pickerDefinitions, contextType, departmentId, militaryUnitId, value],
  )

  const ownerName = contextType === 'MILITARY_UNIT' ? militaryUnitName : departmentName
  const hasOwner = contextType === 'MILITARY_UNIT' ? Boolean(militaryUnitId) : Boolean(departmentId)
  const isMilitary = contextType === 'MILITARY_UNIT'

  const select = (definition: PositionDefinitionLike | null) => {
    if (!definition) {
      onSelect(null)
      return
    }
    onSelect({
      id: definition.id,
      title: (definition.title ?? '').trim(),
      positionType: definition.positionType ?? null,
    })
  }

  const openCreator = (initialTitle: string) => {
    const title = initialTitle.trim()
    setDraftTitle(title)
    setDraftType(isMilitary ? 'MILITARY_COMMANDER' : (inferPositionType?.(title) ?? 'CABINET_MINISTER'))
    setDraftLocal('')
    setCreateError(null)
    setCreating(true)
  }

  const handleCreate = async () => {
    const title = draftTitle.trim()
    if (!title) {
      setCreateError('직책 이름을 입력해 주세요.')
      return
    }
    /* 이미 고를 수 있는 같은 이름이 있으면 새로 만들지 않고 그걸 고른다 — 같은 직책이 둘로 갈라지지 않게 */
    const candidates = [
      ...ownDefinitions,
      ...pickerDefinitions.filter((definition) => isAppointableDefinition(definition, contextType)),
    ]
    const existing = findDefinitionByTitle(candidates, title)
    if (existing) {
      select(existing)
      setCreating(false)
      notify.info(`이미 DB에 있는 ‘${existing.title}’ 직책을 골랐습니다.`)
      return
    }
    if (!hasOwner && !countryId && !historicalCountryId) {
      setCreateError('기관이나 국가가 정해져야 그 소속 직책으로 등록할 수 있습니다.')
      return
    }

    setSaving(true)
    setCreateError(null)
    try {
      const created = (await personCareerApi.createPositionDefinition({
        title,
        titleLocal: draftLocal.trim() || null,
        positionType: isMilitary ? 'MILITARY_COMMANDER' : draftType,
        isMonarchical: false,
        administrationDepartmentId: !isMilitary && departmentId ? departmentId : null,
        militaryUnitId: isMilitary && militaryUnitId ? militaryUnitId : null,
      })) as PositionDefinitionLike | null
      if (!created?.id) throw new Error('직책을 만들지 못했습니다.')

      /* 기관·부대에 묶이지 않은 정의는 스코프가 없으면 전역 — 모든 나라 피커에 뜬다. 이 나라에 묶는다. */
      if (!created.administrationDepartmentId && !created.militaryUnitId) {
        try {
          await personCareerApi.addPositionDefinitionScope(created.id, {
            countryId: countryId ?? null,
            historicalCountryId: historicalCountryId ?? null,
            localTitle: draftLocal.trim() || null,
            note: '임명 모달에서 등록',
          })
        } catch (scopeError) {
          await personCareerApi.deletePositionDefinition(created.id).catch(() => undefined)
          throw scopeError
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['position-definitions'] })
      select({ ...created, title })
      setCreating(false)
      notify.success(`‘${title}’ 직책을 DB에 등록했습니다.`)
    } catch (createErr) {
      setCreateError(getApiErrorMessage(createErr, '직책을 등록하지 못했습니다.'))
    } finally {
      setSaving(false)
    }
  }

  const quickChips = ownDefinitions.slice(0, QUICK_CHIP_LIMIT)
  const typedQuery = query.trim()

  return (
    <Stack>
      {quickChips.length > 0 && (
        <QuickChips role="group" aria-label={ownGroupLabel(contextType)}>
          {quickChips.map((definition) => {
            const active = definition.id === value
            return (
              <QuickChip
                key={definition.id}
                type="button"
                $active={active}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => select(active ? null : definition)}
              >
                {(definition.title ?? '').trim()}
              </QuickChip>
            )
          })}
        </QuickChips>
      )}

      <InlineSearchSelect
        id={id}
        options={options}
        value={value}
        onChange={(nextValue) => select(nextValue ? (byId.get(nextValue) ?? null) : null)}
        onQueryChange={setQuery}
        placeholder={
          isMilitary ? '보직 검색 (예: 사령관, 참모장)' : '직책 검색 (예: 외무장관, 의장, 총재)'
        }
        ariaLabel={isMilitary ? '보직' : '직책'}
        limit={80}
        onCreateNew={disabled ? undefined : () => openCreator(typedQuery)}
        createLabel={
          typedQuery
            ? `‘${typedQuery}’ ${isMilitary ? '보직' : '직책'}을 DB에 등록`
            : `새 ${isMilitary ? '보직' : '직책'}을 DB에 등록`
        }
        error={error}
        ariaInvalid={error}
        ariaDescribedBy={ariaDescribedBy}
        selectedLabelFallback={value ? (byId.get(value)?.title ?? undefined) : undefined}
      />

      {legacyTitle && !value && !creating && (
        <LegacyNotice role="note">
          <FiAlertCircle size={13} aria-hidden />
          <span>
            이 기록은 DB 직책 없이 <strong>‘{legacyTitle}’</strong> 이름으로만 저장돼 있습니다.
          </span>
          <LegacyAction type="button" onClick={() => openCreator(legacyTitle)} disabled={disabled}>
            이 이름으로 DB 직책 등록
          </LegacyAction>
        </LegacyNotice>
      )}

      {creating && (
        <Creator aria-label="새 직책 DB 등록">
          <CreatorHead>
            <FiDatabase size={13} aria-hidden />
            <span>
              새 {isMilitary ? '보직' : '직책'} DB 등록
              {hasOwner && ownerName ? (
                <em> · {ownerName} 소속</em>
              ) : (
                <em> · 이 나라 전용</em>
              )}
            </span>
          </CreatorHead>
          <CreatorRow>
            <CreatorInput
              autoFocus
              value={draftTitle}
              onChange={(changeEvent) => setDraftTitle(changeEvent.target.value)}
              placeholder="직책 이름 (예: 공동각료회의 의장)"
              aria-label="새 직책 이름"
              onKeyDown={(keyEvent) => {
                if (keyEvent.key === 'Enter') {
                  keyEvent.preventDefault()
                  void handleCreate()
                }
              }}
            />
            <CreatorInput
              value={draftLocal}
              onChange={(changeEvent) => setDraftLocal(changeEvent.target.value)}
              placeholder="현지 표기 (선택, 예: Vorsitzender)"
              aria-label="현지 표기"
              $narrow
            />
          </CreatorRow>
          {!isMilitary && (
            <TypeChips role="radiogroup" aria-label="직책 유형">
              {CREATABLE_POSITION_TYPES.map((positionType) => (
                <TypeChip
                  key={positionType}
                  type="button"
                  role="radio"
                  aria-checked={draftType === positionType}
                  $active={draftType === positionType}
                  onClick={() => setDraftType(positionType)}
                >
                  {POSITION_TYPE_LABEL[positionType]}
                </TypeChip>
              ))}
            </TypeChips>
          )}
          {createError && (
            <CreatorError role="alert">
              <FiAlertCircle size={12} aria-hidden />
              {createError}
            </CreatorError>
          )}
          <CreatorActions>
            <GhostBtn type="button" onClick={() => setCreating(false)} disabled={saving}>
              취소
            </GhostBtn>
            <PrimaryBtn type="button" onClick={() => void handleCreate()} disabled={saving}>
              <FiPlus size={13} aria-hidden />
              {saving ? '등록 중…' : 'DB에 등록하고 고르기'}
            </PrimaryBtn>
          </CreatorActions>
        </Creator>
      )}
    </Stack>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const QuickChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const chipBase = css`
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const QuickChip = styled.button<{ $active: boolean }>`
  ${chipBase}
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border.default)};
  background: ${({ $active, theme }) =>
    $active ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.16)' : 'rgba(99,102,241,0.08)') : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text.primary)};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`

const LegacyNotice = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.alert.warning.bg};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.alert.warning.fg};
  }
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const LegacyAction = styled.button`
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.alert.warning.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.alert.warning.fg};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(245,158,11,0.12)' : '#fff')};
  }
`

const Creator = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => (theme.mode === 'dark' ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.35)')};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)')};
`

const CreatorHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  em {
    font-style: normal;
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const CreatorRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const CreatorInput = styled.input<{ $narrow?: boolean }>`
  box-sizing: border-box;
  width: 100%;
  height: 36px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff')};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 13px;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const TypeChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const TypeChip = styled.button<{ $active: boolean }>`
  ${chipBase}
  height: 26px;
  padding: 0 10px;
  font-size: 11.5px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : 'rgba(99,102,241,0.1)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(15,23,42,0.05)'};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
`

const CreatorError = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`

const CreatorActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 6px;
`

const GhostBtn = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`
