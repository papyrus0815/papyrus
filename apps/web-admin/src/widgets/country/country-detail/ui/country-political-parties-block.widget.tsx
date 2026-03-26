/**
 * 국가 상세 — 선거·투표 탭 상단: 이 국가 소속 정당(PoliticalParty) 등록·편집
 * 정당 등록/수정은 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸 사용
 */
import React, { useEffect, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'react-hot-toast'
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiImage,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  type CreatePoliticalPartyInput,
  type PoliticalParty,
  type PoliticalPosition,
  politicalPartyApi,
} from '@/shared/api/political-party'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { sanitizeRichTextHtml } from '@/shared/lib/sanitize-rich-text-html'
import { pathKeys } from '@/shared/router'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormActions,
  PersonRegisterModalPrimaryBtn,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input,
} from '@/shared/ui/register-form-layout'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/rich-text-editor'
import { PoliticalPartyRegisterViewModal } from '@/widgets/country/country-list/ui/political-party-register-view-modal'

import {
  EmptyHint,
  FormSelectNative,
  PartyDescriptionEditActions,
  PartyDescriptionEditorWrap,
  PartyDescriptionLabel,
  PartyDescriptionLabelRow,
  PartyDescriptionReadHtml,
  PartyDetailBackBtn,
  PartyDetailBreadcrumbSep,
  PartyDetailChip,
  PartyDetailChipMuted,
  PartyDetailChipRow,
  PartyDetailCrumbTitle,
  PartyDetailDd,
  PartyDetailDescSection,
  PartyDetailDl,
  PartyDetailDt,
  PartyDetailHeaderRow,
  PartyDetailHeading,
  PartyDetailHero,
  PartyDetailLogo,
  PartyDetailLogoImg,
  PartyDetailMetaSection,
  PartyDetailName,
  PartyDetailPanel,
  PartyDetailTopActions,
  PartyDetailTopBar,
  PartyDetailTopLeft,
  PartyListWrap,
  PartyRowAvatar,
  PartyRowAvatarImg,
  PartyRowBody,
  PartyRowCard,
  PartyRowChevron,
  PartyRowMeta,
  PartyRowTitle,
  SectionHeaderRow,
  SectionKicker,
  ToolbarDangerBtn,
  ToolbarGhostBtn,
  ToolbarGhostBtnSm,
  ToolbarPrimaryBtn,
} from './country-politics-tab.styles'

const FullWidthControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

const ModalFieldWide = styled(FieldControl)`
  max-width: min(560px, 100%) !important;
`

const ModalFieldMedium = styled(FieldControl)`
  max-width: min(400px, 100%) !important;
`

const ModalFieldNarrow = styled(FieldControl)`
  max-width: 260px !important;
`

const SelectClearRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
`

const ClearFieldBtn = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: #6366f1;
  }
`

const PartyLogoPreviewBox = styled.div`
  width: 72px;
  height: 72px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartyLogoPreviewImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`

const PartyLogoFieldRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
`

const POSITION_OPTIONS: { value: PoliticalPosition; label: string }[] = [
  { value: 'FAR_LEFT', label: '극좌' },
  { value: 'LEFT', label: '좌파' },
  { value: 'CENTER_LEFT', label: '중도좌파' },
  { value: 'CENTER', label: '중도' },
  { value: 'CENTER_RIGHT', label: '중도우파' },
  { value: 'RIGHT', label: '우파' },
  { value: 'FAR_RIGHT', label: '극우' },
  { value: 'BIG_TENT', label: '빅텐트' },
]

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ko-KR')
  } catch {
    return iso
  }
}

function formatYmdKo(ymd: string) {
  if (!ymd) return ''
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

function labelPoliticalPosition(value: string | null | undefined) {
  if (!value) return '—'
  const o = POSITION_OPTIONS.find((x) => x.value === value)
  return o?.label ?? value
}

function normalizeRichTextForSave(html: string): string | null {
  const trimmed = html?.trim() ?? ''
  if (!trimmed) return null
  const safe = sanitizeRichTextHtml(trimmed)
  if (typeof document !== 'undefined') {
    const div = document.createElement('div')
    div.innerHTML = safe
    if (!(div.textContent || '').trim()) return null
  }
  return safe || null
}

function isRichTextVisuallyEmpty(html: string | null | undefined): boolean {
  const t = html?.trim() ?? ''
  if (!t) return true
  const safe = sanitizeRichTextHtml(t)
  if (typeof document === 'undefined') return false
  const div = document.createElement('div')
  div.innerHTML = safe
  return !(div.textContent || '').trim()
}

export function CountryPoliticalPartiesBlock({
  countryId,
  selectedPartyId,
}: {
  countryId: string
  selectedPartyId: string | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null)
  const [editingPartyDescription, setEditingPartyDescription] = useState(false)
  const [partyDescriptionDraft, setPartyDescriptionDraft] = useState('')

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['political-parties', countryId],
    queryFn: () => politicalPartyApi.getByCountryId(countryId),
    enabled: !!countryId,
  })

  const { data: detailParty, isLoading: detailLoading } = useQuery({
    queryKey: ['political-parties', 'detail', selectedPartyId],
    queryFn: () => politicalPartyApi.getById(selectedPartyId!),
    enabled: !!selectedPartyId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['political-parties', countryId],
    })
    queryClient.invalidateQueries({ queryKey: ['political-parties'] })
  }

  const createMut = useMutation({
    mutationFn: (body: CreatePoliticalPartyInput) =>
      politicalPartyApi.create(body),
    onSuccess: () => {
      toast.success('정당을 등록했습니다.')
      setModal(null)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string
      body: CreatePoliticalPartyInput
    }) => politicalPartyApi.update(id, body),
    onSuccess: (_row, variables) => {
      toast.success('저장했습니다.')
      setModal(null)
      invalidate()
      queryClient.invalidateQueries({
        queryKey: ['political-parties', 'detail', variables.id],
      })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => politicalPartyApi.delete(id),
    onSuccess: () => {
      toast.success('삭제했습니다.')
      invalidate()
      navigate(pathKeys.history.countryElections(countryId))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveDescriptionMut = useMutation({
    mutationFn: ({ id, html }: { id: string; html: string }) =>
      politicalPartyApi.update(id, {
        description: normalizeRichTextForSave(html),
      }),
    onSuccess: () => {
      toast.success('설명을 저장했습니다.')
      invalidate()
      if (selectedPartyId) {
        queryClient.invalidateQueries({
          queryKey: ['political-parties', 'detail', selectedPartyId],
        })
      }
      setEditingPartyDescription(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  useEffect(() => {
    setEditingPartyDescription(false)
    setPartyDescriptionDraft('')
  }, [selectedPartyId, detailParty?.id])

  const goToList = () => navigate(pathKeys.history.countryElections(countryId))

  const wrongCountryDetail =
    !!detailParty &&
    detailParty.countryId != null &&
    detailParty.countryId !== countryId

  return (
    <>
      <div>
        <SectionHeaderRow>
          <div>
            <SectionKicker>이 국가 정당</SectionKicker>
            <EmptyHint style={{ marginTop: 4 }}>
              선거 후보·당원 소속에서 선택할 정당을 여기서 먼저 등록합니다. 행을
              누르면 상세로 이동합니다.
            </EmptyHint>
          </div>
          <ToolbarPrimaryBtn
            type="button"
            onClick={() => setModal({ mode: 'create' })}
          >
            <FiPlus size={15} />
            정당 등록
          </ToolbarPrimaryBtn>
        </SectionHeaderRow>

        {selectedPartyId ? (
          detailLoading || !detailParty ? (
            <PartyDetailPanel>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackBtn type="button" onClick={goToList}>
                    <FiChevronLeft size={16} />
                    정당 목록
                  </PartyDetailBackBtn>
                  <PartyDetailBreadcrumbSep aria-hidden>
                    /
                  </PartyDetailBreadcrumbSep>
                  <PartyDetailCrumbTitle>…</PartyDetailCrumbTitle>
                </PartyDetailTopLeft>
                <span />
              </PartyDetailTopBar>
              <PartyDetailHero>
                <EmptyHint>불러오는 중…</EmptyHint>
              </PartyDetailHero>
            </PartyDetailPanel>
          ) : wrongCountryDetail ? (
            <PartyDetailPanel>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackBtn type="button" onClick={goToList}>
                    <FiChevronLeft size={16} />
                    정당 목록
                  </PartyDetailBackBtn>
                  <PartyDetailBreadcrumbSep aria-hidden>
                    /
                  </PartyDetailBreadcrumbSep>
                  <PartyDetailCrumbTitle>—</PartyDetailCrumbTitle>
                </PartyDetailTopLeft>
                <span />
              </PartyDetailTopBar>
              <PartyDetailHero>
                <EmptyHint>
                  이 정당은 현재 국가에 속하지 않습니다. 목록으로 돌아가세요.
                </EmptyHint>
              </PartyDetailHero>
            </PartyDetailPanel>
          ) : (
            <PartyDetailPanel>
              <PartyDetailTopBar>
                <PartyDetailTopLeft>
                  <PartyDetailBackBtn type="button" onClick={goToList}>
                    <FiChevronLeft size={16} />
                    정당 목록
                  </PartyDetailBackBtn>
                  <PartyDetailBreadcrumbSep aria-hidden>
                    /
                  </PartyDetailBreadcrumbSep>
                  <PartyDetailCrumbTitle title={detailParty.name}>
                    {detailParty.name}
                  </PartyDetailCrumbTitle>
                </PartyDetailTopLeft>
                <PartyDetailTopActions>
                  <ToolbarGhostBtn
                    type="button"
                    onClick={() =>
                      setModal({ mode: 'edit', id: detailParty.id })
                    }
                  >
                    <FiEdit2 size={14} />
                    정보 수정
                  </ToolbarGhostBtn>
                  <ToolbarDangerBtn
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `"${detailParty.name}" 정당을 삭제할까요? (선거·소속 등에서 참조 중이면 실패할 수 있습니다.)`,
                        )
                      )
                        deleteMut.mutate(detailParty.id)
                    }}
                  >
                    <FiTrash2 size={14} />
                    삭제
                  </ToolbarDangerBtn>
                </PartyDetailTopActions>
              </PartyDetailTopBar>
              <PartyDetailHero>
                <PartyDetailHeaderRow>
                  <PartyDetailLogo>
                    {detailParty.logoUrl ? (
                      <PartyDetailLogoImg
                        src={getUploadImageUrl(detailParty.logoUrl)}
                        alt=""
                      />
                    ) : (
                      <FiImage size={30} />
                    )}
                  </PartyDetailLogo>
                  <PartyDetailHeading>
                    <PartyDetailName>{detailParty.name}</PartyDetailName>
                    <PartyDetailChipRow>
                      {detailParty.shortName?.trim() ? (
                        <PartyDetailChip title="약칭">
                          <PartyDetailChipMuted>약칭</PartyDetailChipMuted>
                          {detailParty.shortName.trim()}
                        </PartyDetailChip>
                      ) : (
                        <PartyDetailChip style={{ opacity: 0.75 }}>
                          약칭 없음
                        </PartyDetailChip>
                      )}
                      {detailParty.localName?.trim() ? (
                        <PartyDetailChip title="현지어·별도 표기">
                          <PartyDetailChipMuted>현지어</PartyDetailChipMuted>
                          {detailParty.localName.trim()}
                        </PartyDetailChip>
                      ) : null}
                    </PartyDetailChipRow>
                  </PartyDetailHeading>
                </PartyDetailHeaderRow>
              </PartyDetailHero>
              <PartyDetailMetaSection>
                <PartyDetailDl>
                  <PartyDetailDt>이념·노선</PartyDetailDt>
                  <PartyDetailDd>
                    {detailParty.ideology?.trim() ? detailParty.ideology : '—'}
                  </PartyDetailDd>
                  <PartyDetailDt>스펙트럼</PartyDetailDt>
                  <PartyDetailDd>
                    {labelPoliticalPosition(detailParty.position ?? undefined)}
                  </PartyDetailDd>
                  <PartyDetailDt>설립</PartyDetailDt>
                  <PartyDetailDd>
                    {formatDate(detailParty.foundedDate)}
                  </PartyDetailDd>
                  <PartyDetailDt>해산</PartyDetailDt>
                  <PartyDetailDd>
                    {formatDate(detailParty.dissolvedDate)}
                  </PartyDetailDd>
                </PartyDetailDl>
              </PartyDetailMetaSection>
              <PartyDetailDescSection aria-label="정당 설명">
                <PartyDescriptionLabelRow>
                  <PartyDescriptionLabel>설명</PartyDescriptionLabel>
                  {!editingPartyDescription ? (
                    <ToolbarGhostBtnSm
                      type="button"
                      onClick={() => {
                        setPartyDescriptionDraft(detailParty.description ?? '')
                        setEditingPartyDescription(true)
                      }}
                    >
                      <FiEdit2 size={12} />
                      {isRichTextVisuallyEmpty(detailParty.description)
                        ? '작성'
                        : '편집'}
                    </ToolbarGhostBtnSm>
                  ) : null}
                </PartyDescriptionLabelRow>
                {editingPartyDescription ? (
                  <>
                    <PartyDescriptionEditorWrap>
                      <RichTextEditor
                        value={partyDescriptionDraft}
                        onChange={setPartyDescriptionDraft}
                        showTitle={false}
                        placeholder="정당 소개·강령 요약 등을 입력하세요."
                        entityLinkCountryId={countryId}
                        mentionEntities={{ politicalParties: parties }}
                        mentionEntitiesLoading={isLoading}
                        onImageUpload={async (file) => {
                          const result = await uploadImage(
                            file,
                            'political-parties',
                          )
                          return result.url
                        }}
                      />
                    </PartyDescriptionEditorWrap>
                    <PartyDescriptionEditActions>
                      <ToolbarGhostBtn
                        type="button"
                        disabled={saveDescriptionMut.isPending}
                        onClick={() => {
                          setEditingPartyDescription(false)
                          setPartyDescriptionDraft('')
                        }}
                      >
                        취소
                      </ToolbarGhostBtn>
                      <ToolbarPrimaryBtn
                        type="button"
                        disabled={saveDescriptionMut.isPending}
                        onClick={() =>
                          saveDescriptionMut.mutate({
                            id: detailParty.id,
                            html: partyDescriptionDraft,
                          })
                        }
                      >
                        {saveDescriptionMut.isPending
                          ? '저장 중…'
                          : '설명 저장'}
                      </ToolbarPrimaryBtn>
                    </PartyDescriptionEditActions>
                  </>
                ) : isRichTextVisuallyEmpty(detailParty.description) ? (
                  <EmptyHint style={{ margin: 0 }}>
                    설명이 없습니다.「작성」으로 rich text 설명을 추가할 수
                    있습니다.
                  </EmptyHint>
                ) : (
                  <PartyDescriptionReadHtml
                    html={detailParty.description ?? ''}
                  />
                )}
              </PartyDetailDescSection>
            </PartyDetailPanel>
          )
        ) : isLoading ? (
          <PartyListWrap>
            <EmptyHint>불러오는 중…</EmptyHint>
          </PartyListWrap>
        ) : parties.length === 0 ? (
          <PartyListWrap>
            <EmptyHint>
              등록된 정당이 없습니다.「정당 등록」으로 추가하세요.
            </EmptyHint>
          </PartyListWrap>
        ) : (
          <PartyListWrap>
            {parties.map((p) => (
              <PartyRowCard
                key={p.id}
                type="button"
                $active={false}
                onClick={() =>
                  navigate(
                    pathKeys.history.countryElectionPartyDetail(
                      countryId,
                      p.id,
                    ),
                  )
                }
              >
                <PartyRowAvatar>
                  {p.logoUrl ? (
                    <PartyRowAvatarImg
                      src={getUploadImageUrl(p.logoUrl)}
                      alt=""
                    />
                  ) : (
                    <FiImage size={20} />
                  )}
                </PartyRowAvatar>
                <PartyRowBody>
                  <PartyRowTitle>{p.name}</PartyRowTitle>
                  <PartyRowMeta>
                    {p.shortName ?? '약칭 없음'} · 설립{' '}
                    {formatDate(p.foundedDate)}
                  </PartyRowMeta>
                </PartyRowBody>
                <PartyRowChevron>
                  <FiChevronRight size={18} />
                </PartyRowChevron>
              </PartyRowCard>
            ))}
          </PartyListWrap>
        )}
      </div>
      <PoliticalPartyRegisterViewModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? '정당 수정' : '정당 등록'}
        description="이 국가에 소속된 정당을 등록합니다. 설명은 서식·이미지가 가능한 에디터로 입력합니다."
        modalMinHeight="min(720px, 92vh)"
      >
        {modal ? (
          <PartyFormModal
            key="party-modal"
            countryId={countryId}
            mode={modal.mode}
            partyId={modal.mode === 'edit' ? modal.id : undefined}
            entityMentionParties={parties}
            saving={createMut.isPending || updateMut.isPending}
            onClose={() => setModal(null)}
            onSubmitCreate={(body) => createMut.mutate({ ...body, countryId })}
            onSubmitEdit={(id, body) => updateMut.mutate({ id, body })}
          />
        ) : null}
      </PoliticalPartyRegisterViewModal>
    </>
  )
}

function PartyFormModal({
  countryId,
  mode,
  partyId,
  entityMentionParties,
  saving,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: {
  countryId: string
  mode: 'create' | 'edit'
  partyId?: string
  /** 이 국가 정당 목록 — 엔티티 연결 시 같은 국가 소속 정당만 검색 가능 */
  entityMentionParties: PoliticalParty[]
  saving: boolean
  onClose: () => void
  onSubmitCreate: (body: CreatePoliticalPartyInput) => void
  onSubmitEdit: (id: string, body: CreatePoliticalPartyInput) => void
}) {
  const playClickSound = useClickSound()
  const [loaded, setLoaded] = useState<PoliticalParty | null>(null)
  const [foundedModalOpen, setFoundedModalOpen] = useState(false)
  const [dissolvedModalOpen, setDissolvedModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [localName, setLocalName] = useState('')
  const [ideology, setIdeology] = useState('')
  const [position, setPosition] = useState<PoliticalPosition | ''>('')
  const [description, setDescription] = useState('')
  const [foundedDate, setFoundedDate] = useState('')
  const [dissolvedDate, setDissolvedDate] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const logoFileInputRef = useRef<HTMLInputElement>(null)

  const handleLogoFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      validateImageFile(file)
      setLogoUploading(true)
      const result = await uploadImage(file, 'political-parties')
      setLogoUrl(result.url)
      toast.success('이미지를 올렸습니다.')
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : '업로드 실패'
      toast.error(message)
    } finally {
      setLogoUploading(false)
    }
  }

  React.useEffect(() => {
    if (mode !== 'edit' || !partyId) return
    let cancelled = false
    politicalPartyApi
      .getById(partyId)
      .then((row) => {
        if (cancelled) return
        setLoaded(row)
        setName(row.name)
        setShortName(row.shortName ?? '')
        setLocalName(row.localName ?? '')
        setIdeology(row.ideology ?? '')
        setPosition((row.position as PoliticalPosition) ?? '')
        setDescription(row.description ?? '')
        setFoundedDate(row.foundedDate?.slice(0, 10) ?? '')
        setDissolvedDate(row.dissolvedDate?.slice(0, 10) ?? '')
        setLogoUrl(row.logoUrl ?? '')
      })
      .catch((err: Error) => toast.error(err.message))
    return () => {
      cancelled = true
    }
  }, [mode, partyId])

  const submit = () => {
    const body: CreatePoliticalPartyInput = {
      name: name.trim(),
      shortName: shortName.trim() || null,
      localName: localName.trim() || null,
      ideology: ideology.trim() || null,
      position: position === '' ? null : position,
      description: normalizeRichTextForSave(description),
      foundedDate: foundedDate ? `${foundedDate}T12:00:00.000Z` : null,
      dissolvedDate: dissolvedDate ? `${dissolvedDate}T12:00:00.000Z` : null,
      logoUrl: logoUrl.trim() || null,
      countryId,
    }
    if (!body.name) {
      toast.error('정당 명칭을 입력하세요.')
      return
    }
    if (mode === 'create') onSubmitCreate(body)
    else if (partyId) onSubmitEdit(partyId, body)
  }

  const loadingEdit = mode === 'edit' && !loaded && partyId

  return (
    <>
      {loadingEdit ? (
        <EmptyHint>불러오는 중…</EmptyHint>
      ) : (
        <FormSectionInner>
          <FormRows>
            <FieldRow>
              <FieldLabel>명칭 (필수)</FieldLabel>
              <ModalFieldWide>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </ModalFieldWide>
            </FieldRow>
            <FieldRow>
              <FieldLabel>약칭</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={shortName}
                  onChange={(event) => setShortName(event.target.value)}
                />
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>현지어·별도 표기</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={localName}
                  onChange={(event) => setLocalName(event.target.value)}
                />
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>이념·노선 (요약)</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={ideology}
                  onChange={(event) => setIdeology(event.target.value)}
                />
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>스펙트럼</FieldLabel>
              <ModalFieldNarrow>
                <FormSelectNative
                  value={position}
                  onChange={(event) =>
                    setPosition(
                      (event.target.value || '') as PoliticalPosition | '',
                    )
                  }
                >
                  <option value="">(미지정)</option>
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormSelectNative>
              </ModalFieldNarrow>
            </FieldRow>
            <FieldRow>
              <FieldLabel>로고·이미지</FieldLabel>
              <FullWidthControl>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoFileChange}
                />
                <PartyLogoFieldRow>
                  <PartyLogoPreviewBox>
                    {logoUrl ? (
                      <PartyLogoPreviewImg
                        src={getUploadImageUrl(logoUrl)}
                        alt=""
                      />
                    ) : (
                      <FiImage size={28} />
                    )}
                  </PartyLogoPreviewBox>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <ToolbarGhostBtn
                        type="button"
                        disabled={logoUploading}
                        onClick={() => {
                          playClickSound()
                          logoFileInputRef.current?.click()
                        }}
                      >
                        <FiUpload size={14} />
                        {logoUploading ? '업로드 중…' : '파일 선택'}
                      </ToolbarGhostBtn>
                      {logoUrl ? (
                        <ToolbarGhostBtn
                          type="button"
                          disabled={logoUploading}
                          onClick={() => {
                            playClickSound()
                            setLogoUrl('')
                          }}
                        >
                          <FiX size={14} />
                          제거
                        </ToolbarGhostBtn>
                      ) : null}
                    </div>
                    <EmptyHint style={{ margin: 0 }}>
                      JPG·PNG·WebP 등. 서버 저장 후 URL이 기록됩니다.
                    </EmptyHint>
                  </div>
                </PartyLogoFieldRow>
              </FullWidthControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>설명</FieldLabel>
              <FullWidthControl>
                <PartyDescriptionEditorWrap
                  style={{
                    minHeight: 360,
                    maxHeight: 'min(520px, 55vh)',
                  }}
                >
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    showTitle={false}
                    placeholder="정당 소개·강령 요약 등을 입력하세요."
                    entityLinkCountryId={countryId}
                    mentionEntities={{
                      politicalParties: entityMentionParties,
                    }}
                    onImageUpload={async (file) => {
                      const result = await uploadImage(
                        file,
                        'political-parties',
                      )
                      return result.url
                    }}
                  />
                </PartyDescriptionEditorWrap>
              </FullWidthControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>설립·해산</FieldLabel>
              <FieldControl $variant="datePair">
                <DateFieldsRow style={{ maxWidth: '100%' }}>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!foundedDate}
                      onClick={() => {
                        playClickSound()
                        setFoundedModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {foundedDate
                          ? formatYmdKo(foundedDate)
                          : '설립일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {foundedDate ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setFoundedDate('')
                        }}
                        aria-label="설립일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!dissolvedDate}
                      onClick={() => {
                        playClickSound()
                        setDissolvedModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {dissolvedDate
                          ? formatYmdKo(dissolvedDate)
                          : '해산일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {dissolvedDate ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setDissolvedDate('')
                        }}
                        aria-label="해산일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </DateFieldsRow>
              </FieldControl>
            </FieldRow>
          </FormRows>
          <PersonRegisterModalFormActions>
            <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
              취소
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={saving || logoUploading}
              onClick={submit}
            >
              저장
            </PersonRegisterModalPrimaryBtn>
          </PersonRegisterModalFormActions>
        </FormSectionInner>
      )}
      <DatePickerModal
        isOpen={foundedModalOpen}
        onClose={() => setFoundedModalOpen(false)}
        onSelect={(date) => {
          setFoundedDate(date)
          setFoundedModalOpen(false)
        }}
        initialDate={foundedDate}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={dissolvedModalOpen}
        onClose={() => setDissolvedModalOpen(false)}
        onSelect={(date) => {
          setDissolvedDate(date)
          setDissolvedModalOpen(false)
        }}
        initialDate={dissolvedDate}
        title="해산일 선택"
      />
    </>
  )
}
