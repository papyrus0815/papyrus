/**
 * 정당 상세 — 「표지」(로고·당기·상징·투표 상징·사진·포스터) · 「표어·당가」 · 「당사」(이전 이력).
 * 설계: docs/political-party-model-review.md §4.5 (B4)
 *
 * 대표 로고는 정당 목록·카드의 logoUrl이 되고, 지속 중 당사(없으면 가장 늦은 당사)의 도시가 정당의 당사 도시가 된다 — 서버가 맞춘다.
 */
import React, { useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiExternalLink, FiImage, FiPlus, FiStar, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import { type City, cityApi } from '@/shared/api/city'
import {
  PARTY_EXPRESSION_KIND_OPTIONS,
  PARTY_SYMBOL_KIND_OPTIONS,
  type PartyExpressionDto,
  type PartyExpressionInput,
  type PartyExpressionKind,
  type PartyHeadquartersDto,
  type PartyHeadquartersInput,
  type PartySymbolDto,
  type PartySymbolInput,
  type PartySymbolKind,
  labelPartyExpressionKind,
  labelPartySymbolKind,
  politicalPartyApi,
} from '@/shared/api/political-party'
import { getUploadImageUrl, uploadImage, validateImageFile } from '@/shared/api/upload'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import {
  EMPTY_PERIOD_DATE,
  type PeriodDateFormValue,
  formatPeriodLabel,
  isPeriodFormInverted,
  periodDateFormError,
  periodDateFormValue,
  structuredInputOf,
} from '@/shared/lib/party-dates'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import { PersonRegisterModalFormScroll } from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'
import {
  CheckRow,
  FactActions,
  FactBadge,
  FactGroup,
  FactGroupLabel,
  FactList,
  FactMain,
  FactNote,
  FactRow,
  IconBtn,
  ModalFooter,
  PeriodPair,
} from '@/widgets/political-party/party-sidecar-parts'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import * as FormS from './military-unit-form/styles'
import { PartyCitationButton } from './party-citations'
import { partyKeys } from '@/widgets/political-party/party-query-keys'

const symbolsKey = partyKeys.symbols
const expressionsKey = partyKeys.expressions
const headquartersKey = partyKeys.headquarters

/** 곁가지가 바뀌면 목록·상세의 캐시(로고·당사 도시)도 바뀐다 */
function useInvalidateParty(partyId: string, key: readonly unknown[]) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
    void queryClient.invalidateQueries({ queryKey: ['political-parties', 'detail', partyId] })
  }
}

function usePeriodState(initial?: {
  startEra?: string | null
  startYear?: number | null
  startMonth?: number | null
  startDay?: number | null
  endEra?: string | null
  endYear?: number | null
  endMonth?: number | null
  endDay?: number | null
}) {
  const [start, setStart] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.startEra, initial.startYear, initial.startMonth, initial.startDay) : { ...EMPTY_PERIOD_DATE },
  )
  const [end, setEnd] = useState<PeriodDateFormValue>(() =>
    initial ? periodDateFormValue(initial.endEra, initial.endYear, initial.endMonth, initial.endDay) : { ...EMPTY_PERIOD_DATE },
  )
  const startError = periodDateFormError(start)
  const endError = periodDateFormError(end)
  const inverted = isPeriodFormInverted(start, end)
  const problem = startError ? `시작: ${startError}` : endError ? `끝: ${endError}` : inverted ? '끝이 시작보다 앞설 수 없습니다.' : null
  return { start, end, setStart, setEnd, startError, endError, inverted, problem }
}

// ─── 표지 ─────────────────────────────────────────────────────────────────

export function PartySymbolsBlock({ partyId }: { partyId: string }) {
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartySymbolDto } | null>(null)
  const invalidate = useInvalidateParty(partyId, symbolsKey(partyId))
  const { data = [], isLoading } = useQuery({ queryKey: symbolsKey(partyId), queryFn: () => politicalPartyApi.getSymbols(partyId) })
  const deleteMut = useMutation({
    mutationFn: (symbolId: string) => politicalPartyApi.deleteSymbol(partyId, symbolId),
    onSuccess: () => {
      invalidate()
      notify.success('표지를 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <PartyDetailDescSection aria-label="표지">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>표지</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          표지 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>로고·당기·상징물·투표 상징·사진·포스터를 종류·시기·캡션과 함께 남깁니다. 대표 로고는 목록과 카드에 쓰입니다.</PartyDescEmptyHint>
      ) : (
        <SymbolGrid>
          {data.map((symbol) => {
            const period = formatPeriodLabel(symbol)
            return (
              <SymbolCard key={symbol.id}>
                <SymbolImage>
                  <img src={getUploadImageUrl(symbol.imageUrl)} alt={symbol.caption ?? labelPartySymbolKind(symbol.kind)} />
                </SymbolImage>
                <div className="meta">
                  <span className="kind">
                    {symbol.isPrimary ? <FiStar size={11} aria-label="대표" /> : null}
                    {labelPartySymbolKind(symbol.kind)}
                  </span>
                  {period ? <span className="period">{period}</span> : null}
                </div>
                {symbol.caption ? <p className="caption">{symbol.caption}</p> : null}
                <SymbolActions>
                  <PartyCitationButton partyId={partyId} targetType="PARTY_SYMBOL" targetId={symbol.id} subject={`표지 · ${labelPartySymbolKind(symbol.kind)}${symbol.caption ? ` · ${symbol.caption}` : ''}`} />
                  <IconBtn type="button" aria-label="표지 고치기" onClick={() => setModal({ mode: 'edit', row: symbol })}>
                    <FiEdit2 size={13} />
                  </IconBtn>
                  <IconBtn
                    type="button"
                    aria-label="표지 지우기"
                    disabled={deleteMut.isPending}
                    onClick={async () => {
                      const approved = await confirm({
                        title: '표지 지우기',
                        message: `${labelPartySymbolKind(symbol.kind)} 표지를 지울까요?${symbol.isPrimary && symbol.kind === 'LOGO' ? ' 대표 로고라 목록·카드의 로고도 비워집니다.' : ''}`,
                        confirmLabel: '지우기',
                        danger: true,
                      })
                      if (approved) deleteMut.mutate(symbol.id)
                    }}
                  >
                    <FiTrash2 size={13} />
                  </IconBtn>
                </SymbolActions>
              </SymbolCard>
            )
          })}
        </SymbolGrid>
      )}
      {modal ? (
        <PartySymbolFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          partyId={partyId}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            invalidate()
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartySymbolFormModal({
  partyId,
  initial,
  onClose,
  onSaved,
}: {
  partyId: string
  initial?: PartySymbolDto
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<PartySymbolKind>(initial?.kind ?? 'LOGO')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [caption, setCaption] = useState(initial?.caption ?? '')
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const period = usePeriodState(initial)
  const problem = !imageUrl ? '필수: 이미지' : period.problem
  const kindHint = PARTY_SYMBOL_KIND_OPTIONS.find((option) => option.value === kind)?.hint ?? ''

  const saveMut = useMutation({
    mutationFn: () => {
      const body: PartySymbolInput = {
        kind,
        imageUrl,
        caption: caption.trim() || null,
        isPrimary,
        start: structuredInputOf(period.start),
        end: structuredInputOf(period.end),
      }
      return initial ? politicalPartyApi.updateSymbol(partyId, initial.id, body) : politicalPartyApi.createSymbol(partyId, body)
    },
    onSuccess: () => {
      notify.success(initial ? '표지를 고쳤습니다.' : '표지를 추가했습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      validateImageFile(file)
      setUploading(true)
      const result = await uploadImage(file, 'political-parties')
      setImageUrl(result.url)
    } catch (unknownError) {
      notify.error(unknownError instanceof Error ? unknownError.message : '업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '표지 고치기' : '표지 추가'} maxWidth="min(720px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-symbol-title">
          <FormS.FormGroupTitle id="party-symbol-title">이미지</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-symbol-kind">종류</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-symbol-kind" value={kind} onChange={(event) => setKind(event.target.value as PartySymbolKind)}>
                {PARTY_SYMBOL_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
              {kindHint ? <EventFormS.Hint>{kindHint}</EventFormS.Hint> : null}
              <CheckRow>
                <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
                이 종류의 대표{kind === 'LOGO' ? ' — 목록·카드에 쓰는 로고가 된다' : ''}
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">
              이미지 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <UploadRow>
                <UploadPreview>
                  {imageUrl ? <img src={getUploadImageUrl(imageUrl)} alt="" /> : <FiImage size={22} aria-hidden />}
                </UploadPreview>
                <PartyDescOutlineBtn type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? '올리는 중…' : imageUrl ? '다른 이미지' : '이미지 올리기'}
                </PartyDescOutlineBtn>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} aria-label="이미지 파일" />
              </UploadRow>
              <EventFormS.Input
                aria-label="이미지 주소"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="또는 이미지 주소(https://…)"
                autoComplete="off"
                style={{ marginTop: 8 }}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-symbol-caption">
              캡션<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-symbol-caption"
                rows={2}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="예: 1934년 총선을 앞둔 당사(팔라초 브라스키) 외벽"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair {...periodPairProps(period, '쓰기 시작', '쓰기 끝')} />
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending || uploading} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

function periodPairProps(period: ReturnType<typeof usePeriodState>, startLabel: string, endLabel: string, endDisabled = false) {
  return {
    start: period.start,
    end: period.end,
    onStart: period.setStart,
    onEnd: period.setEnd,
    startError: period.startError,
    endError: endDisabled ? null : period.endError,
    inverted: endDisabled ? false : period.inverted,
    startLabel,
    endLabel,
    endDisabled,
  }
}

// ─── 표어·당가 ────────────────────────────────────────────────────────────

export function PartyExpressionsBlock({ partyId }: { partyId: string }) {
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartyExpressionDto } | null>(null)
  const invalidate = useInvalidateParty(partyId, expressionsKey(partyId))
  const { data = [], isLoading } = useQuery({ queryKey: expressionsKey(partyId), queryFn: () => politicalPartyApi.getExpressions(partyId) })
  const deleteMut = useMutation({
    mutationFn: (expressionId: string) => politicalPartyApi.deleteExpression(partyId, expressionId),
    onSuccess: () => {
      invalidate()
      notify.success('지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  const groups = PARTY_EXPRESSION_KIND_OPTIONS.map((option) => ({
    kind: option.value,
    rows: data.filter((row) => row.kind === option.value),
  })).filter((group) => group.rows.length > 0)

  return (
    <PartyDetailDescSection aria-label="표어·당가">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>표어·당가</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          표어·당가 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : groups.length === 0 ? (
        <PartyDescEmptyHint>표어·구호·당가·인사법을 원문·언어·번역과 함께 남깁니다. 노래는 원문 칸에 제목을, 음원·악보는 링크로.</PartyDescEmptyHint>
      ) : (
        <FactList>
          {groups.map((group) => (
            <FactGroup key={group.kind}>
              <FactGroupLabel>{labelPartyExpressionKind(group.kind)}</FactGroupLabel>
              {group.rows.map((row) => {
                const period = formatPeriodLabel(row)
                return (
                  <FactRow key={row.id}>
                    <FactMain>
                      <span className="title">
                        {row.isPrimary ? <FiStar size={12} aria-label="대표" className="primary" /> : null}
                        <Quote>{row.originalText}</Quote>
                      </span>
                      {row.languageCode ? <FactBadge>{row.languageCode}</FactBadge> : null}
                      {period ? <span className="period">{period}</span> : null}
                      {row.mediaUrl ? (
                        <MediaLink href={row.mediaUrl} target="_blank" rel="noreferrer">
                          <FiExternalLink size={12} aria-hidden /> 듣기·악보
                        </MediaLink>
                      ) : null}
                    </FactMain>
                    {row.translation ? <FactNote>{row.translation}</FactNote> : null}
                    {row.note ? <FactNote>{row.note}</FactNote> : null}
                    <FactActions>
                      <PartyCitationButton partyId={partyId} targetType="PARTY_EXPRESSION" targetId={row.id} subject={`${labelPartyExpressionKind(row.kind)} · ${row.originalText}`} />
                      <IconBtn type="button" aria-label="고치기" onClick={() => setModal({ mode: 'edit', row })}>
                        <FiEdit2 size={13} />
                      </IconBtn>
                      <IconBtn
                        type="button"
                        aria-label="지우기"
                        disabled={deleteMut.isPending}
                        onClick={async () => {
                          const approved = await confirm({
                            title: `${labelPartyExpressionKind(row.kind)} 지우기`,
                            message: `「${row.originalText}」을 지울까요?`,
                            confirmLabel: '지우기',
                            danger: true,
                          })
                          if (approved) deleteMut.mutate(row.id)
                        }}
                      >
                        <FiTrash2 size={13} />
                      </IconBtn>
                    </FactActions>
                  </FactRow>
                )
              })}
            </FactGroup>
          ))}
        </FactList>
      )}
      {modal ? (
        <PartyExpressionFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          partyId={partyId}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            invalidate()
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartyExpressionFormModal({
  partyId,
  initial,
  onClose,
  onSaved,
}: {
  partyId: string
  initial?: PartyExpressionDto
  onClose: () => void
  onSaved: () => void
}) {
  const [kind, setKind] = useState<PartyExpressionKind>(initial?.kind ?? 'MOTTO')
  const [originalText, setOriginalText] = useState(initial?.originalText ?? '')
  const [languageCode, setLanguageCode] = useState(initial?.languageCode ?? '')
  const [translation, setTranslation] = useState(initial?.translation ?? '')
  const [mediaUrl, setMediaUrl] = useState(initial?.mediaUrl ?? '')
  const [isPrimary, setIsPrimary] = useState(initial?.isPrimary ?? false)
  const [note, setNote] = useState(initial?.note ?? '')
  const period = usePeriodState(initial)
  const languageValid = languageCode.trim() === '' || /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(languageCode.trim())
  const problem = !originalText.trim()
    ? '필수: 원문'
    : !languageValid
      ? '언어 코드는 it·de·ko처럼 ISO 639 형식'
      : period.problem
  const isSong = kind === 'ANTHEM' || kind === 'PARTY_SONG'
  const kindHint = PARTY_EXPRESSION_KIND_OPTIONS.find((option) => option.value === kind)?.hint ?? ''

  const saveMut = useMutation({
    mutationFn: () => {
      const body: PartyExpressionInput = {
        kind,
        originalText: originalText.trim(),
        languageCode: languageCode.trim() || null,
        translation: translation.trim() || null,
        mediaUrl: mediaUrl.trim() || null,
        isPrimary,
        start: structuredInputOf(period.start),
        end: structuredInputOf(period.end),
        note: note.trim() || null,
      }
      return initial
        ? politicalPartyApi.updateExpression(partyId, initial.id, body)
        : politicalPartyApi.createExpression(partyId, body)
    },
    onSuccess: () => {
      notify.success(initial ? '고쳤습니다.' : '추가했습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '표어·당가 고치기' : '표어·당가 추가'} maxWidth="min(720px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-expression-title">
          <FormS.FormGroupTitle id="party-expression-title">말·노래</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-expression-kind">종류</EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormSelectNative id="party-expression-kind" value={kind} onChange={(event) => setKind(event.target.value as PartyExpressionKind)}>
                {PARTY_EXPRESSION_KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormSelectNative>
              {kindHint ? <EventFormS.Hint>{kindHint}</EventFormS.Hint> : null}
              <CheckRow>
                <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />이 종류의 대표
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-expression-original">
              {isSong ? '제목(원어)' : '원문'} <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-expression-original"
                rows={2}
                value={originalText}
                onChange={(event) => setOriginalText(event.target.value)}
                placeholder={isSong ? '예: Giovinezza' : '예: Credere, Obbedire, Combattere'}
              />
              <EventFormS.Input
                aria-label="언어"
                value={languageCode}
                onChange={(event) => setLanguageCode(event.target.value)}
                placeholder="언어 — it · de · ko …"
                autoComplete="off"
                aria-invalid={!languageValid || undefined}
                style={{ marginTop: 8, maxWidth: 220 }}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-expression-translation">
              {isSong ? '번역 제목' : '번역'}<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="party-expression-translation"
                rows={2}
                value={translation}
                onChange={(event) => setTranslation(event.target.value)}
                placeholder={isSong ? '예: 청춘이여' : '예: 믿고, 따르고, 싸우라'}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-expression-media">
              음원·악보 링크<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="party-expression-media"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://…"
                autoComplete="off"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair {...periodPairProps(period, '쓰기 시작', '쓰기 끝')} />
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-expression-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea id="party-expression-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

// ─── 당사 ─────────────────────────────────────────────────────────────────

function headquartersTitle(row: PartyHeadquartersDto): string {
  return [row.buildingName, row.city?.name].filter(Boolean).join(' · ') || row.address || '—'
}

export function PartyHeadquartersBlock({ partyId, countryId }: { partyId: string; countryId?: string }) {
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartyHeadquartersDto } | null>(null)
  const invalidate = useInvalidateParty(partyId, headquartersKey(partyId))
  const { data = [], isLoading } = useQuery({ queryKey: headquartersKey(partyId), queryFn: () => politicalPartyApi.getHeadquarters(partyId) })
  const deleteMut = useMutation({
    mutationFn: (hqId: string) => politicalPartyApi.deleteHeadquarters(partyId, hqId),
    onSuccess: () => {
      invalidate()
      notify.success('당사 기록을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <PartyDetailDescSection aria-label="당사">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>당사</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          당사 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={2} />
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>당사가 놓였던 곳(도시·건물·주소)을 기간과 함께 남깁니다. 옮긴 당사는 행을 더합니다.</PartyDescEmptyHint>
      ) : (
        <FactList>
          {data.map((row) => {
            const period = row.isCurrent ? formatPeriodLabel({ ...row, isCurrent: true }) : formatPeriodLabel(row)
            return (
              <FactRow key={row.id}>
                <FactMain>
                  <span className="title">{headquartersTitle(row)}</span>
                  {row.isCurrent ? <FactBadge>현재</FactBadge> : null}
                  {period ? <span className="period strong">{period}</span> : null}
                </FactMain>
                {row.address && (row.buildingName || row.city) ? <FactNote>{row.address}</FactNote> : null}
                {row.note ? <FactNote>{row.note}</FactNote> : null}
                <FactActions>
                  <PartyCitationButton partyId={partyId} targetType="PARTY_HEADQUARTERS" targetId={row.id} subject={`당사 · ${headquartersTitle(row)}`} />
                  <IconBtn type="button" aria-label="당사 고치기" onClick={() => setModal({ mode: 'edit', row })}>
                    <FiEdit2 size={13} />
                  </IconBtn>
                  <IconBtn
                    type="button"
                    aria-label="당사 지우기"
                    disabled={deleteMut.isPending}
                    onClick={async () => {
                      const approved = await confirm({
                        title: '당사 기록 지우기',
                        message: `「${headquartersTitle(row)}」 기록을 지울까요?`,
                        confirmLabel: '지우기',
                        danger: true,
                      })
                      if (approved) deleteMut.mutate(row.id)
                    }}
                  >
                    <FiTrash2 size={13} />
                  </IconBtn>
                </FactActions>
              </FactRow>
            )
          })}
        </FactList>
      )}
      {modal ? (
        <PartyHeadquartersFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          partyId={partyId}
          countryId={countryId}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            invalidate()
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

export function PartyHeadquartersFormModal({
  partyId,
  countryId,
  initial,
  onClose,
  onSaved,
}: {
  partyId: string
  countryId?: string
  initial?: PartyHeadquartersDto
  onClose: () => void
  onSaved: () => void
}) {
  const [city, setCity] = useState<{ id: string; name: string } | null>(initial?.city ?? null)
  const [cityQuery, setCityQuery] = useState('')
  const [buildingName, setBuildingName] = useState(initial?.buildingName ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [isCurrent, setIsCurrent] = useState(initial?.isCurrent ?? false)
  const [note, setNote] = useState(initial?.note ?? '')
  const period = usePeriodState(initial)
  const debounced = useDebouncedValue(cityQuery, 200)
  const { data: cities = [] } = useQuery({
    queryKey: ['cities', 'search', debounced.trim(), countryId ?? ''],
    queryFn: (): Promise<City[]> => cityApi.searchCities(debounced.trim(), countryId),
    enabled: debounced.trim().length > 0,
    staleTime: 30_000,
  })
  const endProblem = isCurrent ? null : period.endError ? `끝: ${period.endError}` : period.inverted ? '끝이 시작보다 앞설 수 없습니다.' : null
  const problem =
    !city && !buildingName.trim() && !address.trim()
      ? '필수: 도시·건물·주소 중 하나'
      : period.startError
        ? `시작: ${period.startError}`
        : endProblem

  const saveMut = useMutation({
    mutationFn: () => {
      const body: PartyHeadquartersInput = {
        cityId: city?.id ?? null,
        buildingName: buildingName.trim() || null,
        address: address.trim() || null,
        start: structuredInputOf(period.start),
        end: isCurrent ? null : structuredInputOf(period.end),
        isCurrent,
        note: note.trim() || null,
      }
      return initial
        ? politicalPartyApi.updateHeadquarters(partyId, initial.id, body)
        : politicalPartyApi.createHeadquarters(partyId, body)
    },
    onSuccess: () => {
      notify.success(initial ? '당사 기록을 고쳤습니다.' : '당사 기록을 추가했습니다.')
      onSaved()
    },
    onError: (err: Error) => notify.error(err.message),
  })

  return (
    <RegisterModal isOpen onClose={onClose} trapFocus={false} title={initial ? '당사 고치기' : '당사 추가'} maxWidth="min(720px, 96vw)">
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="party-hq-title">
          <FormS.FormGroupTitle id="party-hq-title">어디·언제</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">도시</EventFormS.FormLabel>
            <EventFormS.FormField>
              {city ? (
                <CityChosen>
                  <strong>{city.name}</strong>
                  <PartyDescOutlineBtn type="button" onClick={() => setCity(null)}>
                    다시 고르기
                  </PartyDescOutlineBtn>
                </CityChosen>
              ) : (
                <>
                  <EventFormS.Input
                    aria-label="도시 찾기"
                    value={cityQuery}
                    onChange={(event) => setCityQuery(event.target.value)}
                    placeholder="도시 이름 — 예: 로마"
                    autoComplete="off"
                  />
                  {cities.length > 0 ? (
                    <CityList role="listbox" aria-label="도시 후보">
                      {cities.slice(0, 12).map((candidate) => (
                        <div
                          key={candidate.id}
                          role="option"
                          aria-selected={false}
                          className="row"
                          onClick={() => {
                            setCity({ id: candidate.id, name: candidate.name })
                            setCityQuery('')
                          }}
                        >
                          <span className="name">{candidate.name}</span>
                          {candidate.countryName ? <span className="meta">{candidate.countryName}</span> : null}
                        </div>
                      ))}
                    </CityList>
                  ) : null}
                </>
              )}
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-hq-building">
              건물<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="party-hq-building"
                value={buildingName}
                onChange={(event) => setBuildingName(event.target.value)}
                placeholder="예: 팔라초 브라스키(Palazzo Braschi)"
                autoComplete="off"
              />
              <EventFormS.Input
                aria-label="주소"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="주소(선택)"
                autoComplete="off"
                style={{ marginTop: 8 }}
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <PeriodPair {...periodPairProps(period, '쓰기 시작', '옮긴 때', isCurrent)} />
          <EventFormS.FormRow>
            <EventFormS.FormLabel as="div">지속</EventFormS.FormLabel>
            <EventFormS.FormField>
              <CheckRow>
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(event) => {
                    setIsCurrent(event.target.checked)
                    if (event.target.checked) period.setEnd({ ...EMPTY_PERIOD_DATE })
                  }}
                />
                지금의 당사 — 정당의 당사 도시가 된다
              </CheckRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="party-hq-note">
              메모<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea id="party-hq-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <ModalFooter problem={problem} saving={saveMut.isPending} onClose={onClose} onSubmit={() => !problem && saveMut.mutate()} />
    </RegisterModal>
  )
}

const SymbolGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
`

const SymbolCard = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: baseline;
    font-size: 12px;
  }
  .kind {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .period {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  .caption {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const SymbolImage = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  border-radius: 7px;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)')};
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`

const SymbolActions = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  gap: 2px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.primary};
`

const UploadRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const UploadPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`

const Quote = styled.span`
  font-style: italic;
`

const MediaLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.primary};
`

const CityChosen = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CityList = styled.div`
  margin-top: 6px;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;

  .row {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 7px 10px;
    border-radius: 7px;
    cursor: pointer;
  }
  .row:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)')};
  }
  .name {
    font-size: 13.5px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .meta {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
