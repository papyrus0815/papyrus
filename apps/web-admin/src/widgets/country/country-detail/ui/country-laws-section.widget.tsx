import React, { useCallback, useId, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  FiBook,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'
import styled from 'styled-components'

import {
  type LawRow,
  createLaw,
  createLawType,
  deleteLaw,
  getLawTypes,
  getLaws,
  updateLaw,
} from '@/shared/api/election'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import {
  EmptyStateFeatureCard,
  EmptyStateFill,
} from '@/shared/ui/empty-state/empty-state'
import { FormSidePanel } from '@/shared/ui/form-side-panel/form-side-panel'
import {
  FieldLabel,
  FieldRow,
  FormRows,
  Input,
  Required,
  Textarea,
} from '@/shared/ui/register-form-layout'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'

import {
  DataTable,
  DataTableCard,
  DataTd,
  DataTh,
  DataTr,
  EmptyHint,
  PoliticsTabPanel,
  RowIconBtn,
  SectionHeaderRow,
  SectionKicker,
  SectionLead,
  SubsectionAddBtn,
} from './country-politics-tab.styles'

const ModalFieldWide = styled.div`
  grid-column: 2;
  min-width: 0;
  max-width: min(720px, 100%);
`

const FullWidthControl = styled.div`
  grid-column: 2;
  min-width: 0;
  max-width: 100%;
  width: 100%;
`

const ClauseInputWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ClauseSuffix = styled.span`
  font-size: 15px;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
  user-select: none;
`

const HeaderActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

const LawTypeAddStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.background.secondary : '#fafafa'};
`

const LawTypeAddHint = styled.p`
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
`

const LawTypePickerCard = styled.button`
  display: flex;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? theme.colors.background.secondary : '#fafafa'};
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? theme.colors.background.tertiary : '#f4f4f5'};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:active:not(:disabled) {
    transform: scale(0.998);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LawTypePickerValue = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LawTypePickerGo = styled.span`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0.85;
`

const HeaderGhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors?.text?.secondary ?? '#64748b'};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors?.border?.default ?? '#cbd5e1'};
  border-radius: 999px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

/** 탭 패널이 TabContentPane 높이를 꽉 채워 LawPanelBody·EmptyStateFill이 세로 중앙에 오도록 */
const CountryLawsSectionRoot = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-self: stretch;
`

const LawsPoliticsTabPanel = styled(PoliticsTabPanel)`
  flex: 1 1 0%;
  && {
    min-height: 0;
  }
`

const LawPanelBody = styled.div`
  flex: 1 1 0%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`

function lawsScopeKey(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return `h:${input.historicalCountryId}` as const
  if (input.countryId) return `c:${input.countryId}` as const
  return '' as const
}

function listParams(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return { historicalCountryId: input.historicalCountryId }
  if (input.countryId) return { countryId: input.countryId }
  return {}
}

const qkLaws = (scopeKey: string) => ['laws', scopeKey] as const
const qkLawTypes = ['law-types'] as const

/** 숫자만 허용, 비어 있으면 null, 1 이상만 API로 전달 */
function parseClauseDigits(raw: string): number | null {
  const digitsOnly = raw.replace(/\D/g, '').trim()
  if (digitsOnly === '') return null
  const parsed = parseInt(digitsOnly, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return null
  return parsed
}

function formatClauseCell(clauseNumber: number | null | undefined): string {
  if (clauseNumber == null) return '—'
  return String(clauseNumber)
}

export function CountryLawsSection({
  countryId,
  historicalCountryId,
}: {
  countryId?: string
  historicalCountryId?: string
}) {
  const queryClient = useQueryClient()
  const scopeKey = lawsScopeKey({ countryId, historicalCountryId })
  const params = listParams({ countryId, historicalCountryId })

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<LawRow | null>(null)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [articleInput, setArticleInput] = useState('')
  const [paragraphInput, setParagraphInput] = useState('')
  const [lawTypeId, setLawTypeId] = useState('')
  const [newLawTypeName, setNewLawTypeName] = useState('')
  const [lawTypeAddOpen, setLawTypeAddOpen] = useState(false)
  const [lawTypePickerOpen, setLawTypePickerOpen] = useState(false)

  const reactFormId = useId()
  const formId = `country-law-form-${reactFormId.replace(/:/g, '')}`

  const resetEditorForm = useCallback(() => {
    setEditing(null)
    setName('')
    setSummary('')
    setArticleInput('')
    setParagraphInput('')
    setLawTypeId('')
  }, [])

  const { data: lawTypes = [], isLoading: lawTypesLoading } = useQuery({
    queryKey: qkLawTypes,
    queryFn: () => getLawTypes(),
  })

  const { data: rows = [], isLoading } = useQuery({
    queryKey: qkLaws(scopeKey),
    queryFn: () => getLaws(params as Record<string, string>),
    enabled: Boolean(scopeKey),
  })

  const sorted = useMemo(
    () =>
      [...rows].sort((left, right) =>
        left.name.localeCompare(right.name, 'ko'),
      ),
    [rows],
  )

  const lawTypeSelectOptions = useMemo((): SelectOption<string>[] => {
    const fromApi = lawTypes.map((t) => ({ value: t.id, label: t.name }))
    const staleSelection =
      lawTypeId !== '' && !lawTypes.some((t) => t.id === lawTypeId)
    const orphan: SelectOption<string>[] = staleSelection
      ? [{ value: lawTypeId, label: '(목록에 없는 분류)' }]
      : []
    return [{ value: '', label: '(분류 없음)' }, ...orphan, ...fromApi]
  }, [lawTypes, lawTypeId])

  const lawTypeButtonLabel = useMemo(() => {
    if (!lawTypeId) return '(분류 없음)'
    const found = lawTypes.find((t) => t.id === lawTypeId)
    if (found) return found.name
    if (lawTypesLoading) return '…'
    return '(목록에 없는 분류)'
  }, [lawTypeId, lawTypes, lawTypesLoading])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qkLaws(scopeKey) })
  }

  const lawTypeCreateMut = useMutation({
    mutationFn: () => createLawType({ name: newLawTypeName.trim() }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: qkLawTypes })
      setNewLawTypeName('')
      setLawTypeAddOpen(false)
      if (created?.id) setLawTypeId(created.id)
      notify.success('법 분류를 추가했습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const createMut = useMutation({
    mutationFn: (body: Parameters<typeof createLaw>[0]) => createLaw(body),
    onSuccess: () => {
      invalidate()
      setEditorOpen(false)
      resetEditorForm()
      notify.success('법령을 등록했습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (body: Parameters<typeof updateLaw>[1]) =>
      updateLaw(editing!.id, body),
    onSuccess: () => {
      invalidate()
      setEditorOpen(false)
      resetEditorForm()
      notify.success('저장했습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLaw(id),
    onSuccess: () => {
      invalidate()
      notify.success('삭제했습니다.')
    },
    onError: (e: Error) => notify.error(e.message),
  })

  const openCreate = () => {
    resetEditorForm()
    setEditorOpen(true)
  }

  const openEdit = (row: LawRow) => {
    setEditing(row)
    setName(row.name ?? '')
    setSummary(row.summary ?? '')
    setArticleInput(row.articleNumber != null ? String(row.articleNumber) : '')
    setParagraphInput(
      row.paragraphNumber != null ? String(row.paragraphNumber) : '',
    )
    setLawTypeId(row.lawTypeId ?? row.lawType?.id ?? '')
    setEditorOpen(true)
  }

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const submitLawForm = () => {
    if (!name.trim()) {
      notify.error('명칭을 입력하세요.')
      return
    }
    const article = parseClauseDigits(articleInput)
    const paragraph = parseClauseDigits(paragraphInput)
    if (articleInput.trim() !== '' && article == null) {
      notify.error('조 번호는 1 이상의 숫자만 입력할 수 있습니다.')
      return
    }
    if (paragraphInput.trim() !== '' && paragraph == null) {
      notify.error('항 번호는 1 이상의 숫자만 입력할 수 있습니다.')
      return
    }
    if (paragraph != null && article == null) {
      notify.error('항을 입력하려면 조 번호를 먼저 입력하세요.')
      return
    }

    const payload = {
      name: name.trim(),
      summary: summary.trim() || null,
      articleNumber: article,
      paragraphNumber: paragraph,
      lawTypeId: lawTypeId || null,
      countryId: countryId ?? null,
      historicalCountryId: historicalCountryId ?? null,
    }

    if (editing) {
      updateMut.mutate({
        name: payload.name,
        summary: payload.summary,
        articleNumber: payload.articleNumber,
        paragraphNumber: payload.paragraphNumber,
        lawTypeId: payload.lawTypeId,
      })
    } else {
      createMut.mutate(payload)
    }
  }

  return (
    <CountryLawsSectionRoot>
      <LawsPoliticsTabPanel>
        <SectionHeaderRow>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <SectionKicker>법령</SectionKicker>
            <SectionLead>
              이 국가 법령 목록입니다. 조·항은 숫자만 입력합니다.
              선거·정당에서는 여기 등록한 법을 연결합니다.
            </SectionLead>
          </div>
          <HeaderActionGroup>
            <HeaderGhostBtn
              type="button"
              onClick={() => setLawTypeAddOpen((prev) => !prev)}
              aria-expanded={lawTypeAddOpen}
            >
              <FiPlus size={14} strokeWidth={2.25} />법 분류 추가
            </HeaderGhostBtn>
            <SubsectionAddBtn type="button" onClick={openCreate}>
              <FiPlus size={15} strokeWidth={2.25} />
              법령 등록
            </SubsectionAddBtn>
          </HeaderActionGroup>
        </SectionHeaderRow>

        {lawTypeAddOpen ? (
          <LawTypeAddStrip>
            <div style={{ flex: '1 1 100%', minWidth: 0 }}>
              <LawTypeAddHint>
                저장하면 분류 선택 목록에 반영됩니다.
              </LawTypeAddHint>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <Input
                  id="law-type-add-name"
                  value={newLawTypeName}
                  onChange={(e) => setNewLawTypeName(e.target.value)}
                  placeholder="예: 법률, 시행령, 조례"
                  autoComplete="off"
                  style={{ flex: '1 1 200px', minWidth: 160, maxWidth: 400 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (newLawTypeName.trim() && !lawTypeCreateMut.isPending)
                        lawTypeCreateMut.mutate()
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={
                    lawTypeCreateMut.isPending || !newLawTypeName.trim()
                  }
                  onClick={() => lawTypeCreateMut.mutate()}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: '1px solid var(--border-default, #cbd5e1)',
                    background: 'var(--surface-elevated, #fff)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  분류 저장
                </button>
              </div>
            </div>
          </LawTypeAddStrip>
        ) : null}

        <LawPanelBody>
          {isLoading ? (
            <EmptyHint>불러오는 중…</EmptyHint>
          ) : sorted.length === 0 ? (
            <EmptyStateFill>
              <EmptyStateFeatureCard
                flat
                cardBorder={false}
                icon={<FiBook size={28} strokeWidth={1.75} aria-hidden />}
                title="등록된 법령이 없습니다"
                description="법령을 추가하면 선거·정당 화면에서 이 법을 연결할 수 있습니다."
                primaryAction={{
                  label: '법령 등록',
                  onClick: openCreate,
                  icon: <FiPlus size={16} strokeWidth={2.25} aria-hidden />,
                }}
              />
            </EmptyStateFill>
          ) : (
            <DataTableCard>
              <DataTable>
                <thead>
                  <tr>
                    <DataTh>명칭</DataTh>
                    <DataTh>분류</DataTh>
                    <DataTh style={{ width: 56, textAlign: 'center' }}>
                      조
                    </DataTh>
                    <DataTh style={{ width: 56, textAlign: 'center' }}>
                      항
                    </DataTh>
                    <DataTh>요약</DataTh>
                    <DataTh style={{ width: 100, textAlign: 'right' }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <DataTr key={row.id}>
                      <DataTd>
                        <div style={{ fontWeight: 600 }}>{row.name}</div>
                      </DataTd>
                      <DataTd style={{ fontSize: 13 }}>
                        {row.lawType?.name ??
                          (row.lawTypeId ? '(목록에 없는 분류)' : '—')}
                      </DataTd>
                      <DataTd style={{ fontSize: 13, textAlign: 'center' }}>
                        {formatClauseCell(row.articleNumber ?? null)}
                      </DataTd>
                      <DataTd style={{ fontSize: 13, textAlign: 'center' }}>
                        {formatClauseCell(row.paragraphNumber ?? null)}
                      </DataTd>
                      <DataTd>
                        <span
                          style={{
                            fontSize: 12,
                            opacity: 0.85,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {row.summary?.trim() || '—'}
                        </span>
                      </DataTd>
                      <DataTd
                        style={{ textAlign: 'right', whiteSpace: 'nowrap' }}
                      >
                        <RowIconBtn
                          type="button"
                          onClick={() => openEdit(row)}
                          aria-label="수정"
                          title="수정"
                        >
                          <FiEdit2 size={15} strokeWidth={2} />
                        </RowIconBtn>
                        <RowIconBtn
                          type="button"
                          $variant="danger"
                          disabled={deleteMut.isPending}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: '삭제 확인',
                                message: `「${row.name}」을(를) 삭제할까요? 선거·정당에 연결된 경우 연결도 함께 해제됩니다.`,
                                danger: true,
                              })
                            )
                              deleteMut.mutate(row.id)
                          }}
                          aria-label="삭제"
                          title="삭제"
                        >
                          <FiTrash2 size={15} strokeWidth={2} />
                        </RowIconBtn>
                      </DataTd>
                    </DataTr>
                  ))}
                </tbody>
              </DataTable>
            </DataTableCard>
          )}
        </LawPanelBody>

        <FormSidePanel
          isOpen={editorOpen}
          title={editing ? '법령 수정' : '법령 등록'}
          onClose={() => {
            if (!busy) {
              setEditorOpen(false)
              resetEditorForm()
            }
          }}
          submitLabel={editing ? '저장' : '등록'}
          formId={formId}
          submitDisabled={busy || !name.trim()}
          panelWidth={760}
        >
          <form
            id={formId}
            onSubmit={(e) => {
              e.preventDefault()
              submitLawForm()
            }}
          >
            <FormRows>
              <FieldRow>
                <FieldLabel htmlFor="country-law-name">
                  명칭 <Required>*</Required>
                </FieldLabel>
                <ModalFieldWide>
                  <Input
                    id="country-law-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                  />
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel id="country-law-type-label">법 분류</FieldLabel>
                <ModalFieldWide>
                  <LawTypePickerCard
                    type="button"
                    disabled={busy}
                    onClick={() => setLawTypePickerOpen(true)}
                    aria-labelledby="country-law-type-label"
                    aria-haspopup="dialog"
                    aria-expanded={lawTypePickerOpen}
                  >
                    <LawTypePickerValue>
                      {lawTypeButtonLabel}
                    </LawTypePickerValue>
                    <LawTypePickerGo aria-hidden>
                      <FiChevronRight size={20} strokeWidth={2} />
                    </LawTypePickerGo>
                  </LawTypePickerCard>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-article">조</FieldLabel>
                <ModalFieldWide>
                  <ClauseInputWrap>
                    <Input
                      id="country-law-article"
                      inputMode="numeric"
                      value={articleInput}
                      onChange={(e) =>
                        setArticleInput(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder="1"
                      autoComplete="off"
                      style={{ width: 80, textAlign: 'center' }}
                      aria-describedby="country-law-article-hint"
                    />
                    <ClauseSuffix>조</ClauseSuffix>
                  </ClauseInputWrap>
                  <span
                    id="country-law-article-hint"
                    style={{
                      display: 'block',
                      marginTop: 6,
                      fontSize: 12,
                      color: 'var(--text-secondary, #64748b)',
                    }}
                  >
                    1조만 해당하면 숫자 <strong>1</strong>만 입력합니다.
                  </span>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel htmlFor="country-law-paragraph">항</FieldLabel>
                <ModalFieldWide>
                  <ClauseInputWrap>
                    <Input
                      id="country-law-paragraph"
                      inputMode="numeric"
                      value={paragraphInput}
                      onChange={(e) =>
                        setParagraphInput(e.target.value.replace(/\D/g, ''))
                      }
                      placeholder=""
                      autoComplete="off"
                      style={{ width: 80, textAlign: 'center' }}
                    />
                    <ClauseSuffix>항</ClauseSuffix>
                  </ClauseInputWrap>
                </ModalFieldWide>
              </FieldRow>
              <FieldRow>
                <FieldLabel>요약</FieldLabel>
                <FullWidthControl>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={4}
                  />
                </FullWidthControl>
              </FieldRow>
            </FormRows>
          </form>
        </FormSidePanel>

        <SelectModal
          isOpen={lawTypePickerOpen}
          onClose={() => setLawTypePickerOpen(false)}
          title="법 분류 선택"
          options={lawTypeSelectOptions}
          selectedValue={lawTypeId}
          onSelect={(value) => {
            setLawTypeId(typeof value === 'string' ? value : String(value))
            setLawTypePickerOpen(false)
          }}
        />
      </LawsPoliticsTabPanel>
    </CountryLawsSectionRoot>
  )
}
