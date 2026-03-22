/**
 * 국가 상세 — 선거·투표 탭 상단: 이 국가 소속 정당(PoliticalParty) 등록·편집
 * 정당 등록/수정은 인물 등록 모달(PersonRegisterViewModal)과 동일한 셸 사용
 */
import React, { useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  FiCalendar,
  FiChevronDown,
  FiEdit2,
  FiImage,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiX,
} from 'react-icons/fi'
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
  Textarea,
} from '@/shared/ui/register-form-layout'
import { PoliticalPartyRegisterViewModal } from '@/widgets/country/country-list/ui/political-party-register-view-modal'

import {
  DataTable,
  DataTableCard,
  DataTd,
  DataTh,
  DataTr,
  EmptyHint,
  FormSelectNative,
  PartyBlockCard,
  SectionHeaderRow,
  SectionKicker,
  ToolbarDangerBtn,
  ToolbarGhostBtn,
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

const TablePartyThumb = styled.img`
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'};
  display: block;
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

export function CountryPoliticalPartiesBlock({
  countryId,
}: {
  countryId: string
}) {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; id: string } | null
  >(null)

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ['political-parties', countryId],
    queryFn: () => politicalPartyApi.getByCountryId(countryId),
    enabled: !!countryId,
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
    onSuccess: () => {
      toast.success('저장했습니다.')
      setModal(null)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => politicalPartyApi.delete(id),
    onSuccess: () => {
      toast.success('삭제했습니다.')
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <>
      <PartyBlockCard>
        <SectionHeaderRow>
          <div>
            <SectionKicker>이 국가 정당</SectionKicker>
            <EmptyHint style={{ marginTop: 4 }}>
              선거 후보·당원 소속에서 선택할 정당을 여기서 먼저 등록합니다.
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

        <DataTableCard style={{ marginTop: 14 }}>
          <DataTable>
            <thead>
              <tr>
                <DataTh style={{ width: 48 }} />
                <DataTh>명칭</DataTh>
                <DataTh>약칭</DataTh>
                <DataTh>설립</DataTh>
                <DataTh style={{ width: 140 }} />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <DataTr>
                  <DataTd colSpan={5}>
                    <EmptyHint>불러오는 중…</EmptyHint>
                  </DataTd>
                </DataTr>
              ) : parties.length === 0 ? (
                <DataTr>
                  <DataTd colSpan={5}>
                    <EmptyHint>
                      등록된 정당이 없습니다.「정당 등록」으로 추가하세요.
                    </EmptyHint>
                  </DataTd>
                </DataTr>
              ) : (
                parties.map((p) => (
                  <DataTr key={p.id}>
                    <DataTd style={{ verticalAlign: 'middle' }}>
                      {p.logoUrl ? (
                        <TablePartyThumb
                          src={getUploadImageUrl(p.logoUrl)}
                          alt=""
                        />
                      ) : (
                        <span style={{ fontSize: 12, opacity: 0.45 }}>—</span>
                      )}
                    </DataTd>
                    <DataTd>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </DataTd>
                    <DataTd>{p.shortName ?? '—'}</DataTd>
                    <DataTd>{formatDate(p.foundedDate)}</DataTd>
                    <DataTd>
                      <ToolbarGhostBtn
                        type="button"
                        onClick={() => setModal({ mode: 'edit', id: p.id })}
                      >
                        <FiEdit2 size={13} />
                        수정
                      </ToolbarGhostBtn>
                      <ToolbarDangerBtn
                        type="button"
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          if (
                            window.confirm(
                              `"${p.name}" 정당을 삭제할까요? (선거·소속 등에서 참조 중이면 실패할 수 있습니다.)`,
                            )
                          )
                            deleteMut.mutate(p.id)
                        }}
                      >
                        <FiTrash2 size={13} />
                        삭제
                      </ToolbarDangerBtn>
                    </DataTd>
                  </DataTr>
                ))
              )}
            </tbody>
          </DataTable>
        </DataTableCard>
      </PartyBlockCard>
      <PoliticalPartyRegisterViewModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? '정당 수정' : '정당 등록'}
        description="이 국가에 소속된 정당을 등록합니다. 선거 후보·당원 소속에서 선택할 수 있습니다."
      >
        {modal ? (
          <PartyFormModal
            key="party-modal"
            countryId={countryId}
            mode={modal.mode}
            partyId={modal.mode === 'edit' ? modal.id : undefined}
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
  saving,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: {
  countryId: string
  mode: 'create' | 'edit'
  partyId?: string
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
      description: description.trim() || null,
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
                            (event.target.value || '') as
                              | PoliticalPosition
                              | '',
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
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={3}
                      />
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
