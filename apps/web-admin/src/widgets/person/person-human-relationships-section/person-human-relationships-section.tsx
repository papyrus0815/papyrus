/**
 * 인물 상세 — 인간관계
 * 친밀도(일반)와 멘토·스승–제자를 목록·추가 진입에서 분리합니다.
 */
import { type KeyboardEvent, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FaHeart, FaRegHeart } from 'react-icons/fa'
import {
  FiArrowLeft,
  FiBookOpen,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  AFFINITY_SPECTRUM,
  type PersonHumanRelationshipItem,
  type PersonHumanRelationshipType,
  createHumanRelationship,
  deleteHumanRelationship,
  updateHumanRelationship,
} from '@/shared/api/person-human-relationships'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { FormTextarea } from '@/shared/ui/form-input/form-input'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'
import {
  BackButton,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormHeader,
  FormRows,
  FormSectionInner,
  SubmitButton,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout/register-form-layout.styles'

type Props = {
  personId: string
  relationships: PersonHumanRelationshipItem[] | undefined
}

/** PersonRegisterView `PersonFormLayoutWrap` — 인물 등록 폼과 동일한 컨트롤 열 폭 */
const HumanRelFormLayoutWrap = styled.div`
  ${FieldControl} {
    max-width: 520px;
  }
`

const LEGACY_REL_TYPES = new Set([
  'ALLY',
  'ENEMY',
  'RIVAL',
  'COLLEAGUE',
  'OTHER',
])

function normalizeRelationshipType(
  relationshipType: string,
): PersonHumanRelationshipType {
  if (relationshipType === 'MENTOR' || relationshipType === 'GENERAL') {
    return relationshipType
  }
  return 'GENERAL'
}

type RelRowModel = PersonHumanRelationshipItem & {
  originalRelationshipType: string
}

/** API/네트워크 에러 메시지를 사용자 친화적으로 */
function formatRelationshipApiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const lower = raw.toLowerCase()
  if (
    lower.includes('p2002') ||
    lower.includes('unique') ||
    lower.includes('duplicate') ||
    raw.includes('이미 같은') ||
    raw.includes('같은 쌍')
  ) {
    return '이미 같은 유형의 관계가 있습니다. 목록에서 수정하거나 다른 관계 유형을 선택해 보세요.'
  }
  return raw.length > 200 ? `${raw.slice(0, 200)}…` : raw
}

export function PersonHumanRelationshipsSection({
  personId,
  relationships,
}: Props) {
  const queryClient = useQueryClient()
  const rawList = relationships ?? []
  const list: RelRowModel[] = useMemo(
    () =>
      rawList.map((row) => ({
        ...row,
        originalRelationshipType: String(row.relationshipType),
        relationshipType: normalizeRelationshipType(
          row.relationshipType as string,
        ),
      })),
    [rawList],
  )

  const generalRelationships = useMemo(
    () => list.filter((row) => row.relationshipType === 'GENERAL'),
    [list],
  )
  const mentorRelationships = useMemo(
    () => list.filter((row) => row.relationshipType === 'MENTOR'),
    [list],
  )

  const {
    data: persons = [],
    isLoading: personsLoading,
    isError: personsError,
  } = useQuery({
    queryKey: ['all-persons', 'human-rel'],
    queryFn: () => getAllPersons(),
  })

  const personsExcludingSelf = useMemo(
    () => persons.filter((person) => person.id !== personId),
    [persons, personId],
  )

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [personModalOpen, setPersonModalOpen] = useState(false)

  const [newRelatedId, setNewRelatedId] = useState('')
  const [newType, setNewType] = useState<PersonHumanRelationshipType>('GENERAL')
  const [newAffinity, setNewAffinity] = useState(3)
  const [newSubjectIsMentor, setNewSubjectIsMentor] = useState(true)
  const [newNote, setNewNote] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAffinity, setEditAffinity] = useState(3)
  const [editType, setEditType] =
    useState<PersonHumanRelationshipType>('GENERAL')
  const [editSubjectIsMentor, setEditSubjectIsMentor] = useState(true)
  const [editNote, setEditNote] = useState('')

  /** 새 관계 폼: 기본값에서 바뀐 항목이 있으면 닫기 시 경고 */
  const isNewFormDirty = useMemo(
    () =>
      newRelatedId !== '' ||
      newNote.trim() !== '' ||
      newAffinity !== 3 ||
      newType !== 'GENERAL' ||
      newSubjectIsMentor === false,
    [newRelatedId, newNote, newAffinity, newType, newSubjectIsMentor],
  )

  const editingRel = useMemo(
    () => (editingId ? list.find((row) => row.id === editingId) : undefined),
    [editingId, list],
  )

  const isEditFormDirty = useMemo(() => {
    if (!editingRel) return false
    const origType = normalizeRelationshipType(
      editingRel.originalRelationshipType,
    )
    if (editType !== origType) return true
    if (editType === 'GENERAL' && editAffinity !== editingRel.affinityLevel)
      return true
    if (editType === 'MENTOR') {
      const wasMentor = editingRel.mentorPerspective === 'MENTOR'
      if (editSubjectIsMentor !== wasMentor) return true
    }
    if ((editNote.trim() || '') !== (editingRel.note ?? '').trim()) return true
    return false
  }, [editingRel, editType, editAffinity, editSubjectIsMentor, editNote])

  const selectedNewPerson =
    personsExcludingSelf.find((person) => person.id === newRelatedId) ?? null

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
    queryClient.invalidateQueries({ queryKey: ['all-persons', 'human-rel'] })
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!newRelatedId) throw new Error('상대 인물을 선택하세요.')
      return createHumanRelationship(personId, {
        relatedPersonId: newRelatedId,
        relationshipType: newType,
        // 멘토 관계는 친밀도를 쓰지 않음 — API 필드만 중립(3)으로 맞춤
        affinityLevel: newType === 'MENTOR' ? 3 : newAffinity,
        note: newNote.trim() || undefined,
        subjectIsMentor: newType === 'MENTOR' ? newSubjectIsMentor : undefined,
      })
    },
    onSuccess: () => {
      toast.success('저장했습니다.')
      setCreateModalOpen(false)
      setNewRelatedId('')
      setNewNote('')
      setNewType('GENERAL')
      setNewAffinity(3)
      setNewSubjectIsMentor(true)
      invalidateDetail()
    },
    onError: (error: unknown) => {
      toast.error(formatRelationshipApiError(error))
    },
  })

  const updateMut = useMutation({
    mutationFn: async (rel: RelRowModel) =>
      updateHumanRelationship(personId, rel.id, {
        relationshipType: editType,
        affinityLevel: editType === 'MENTOR' ? 3 : editAffinity,
        note: editNote.trim() || null,
        subjectIsMentor:
          editType === 'MENTOR' ? editSubjectIsMentor : undefined,
      }),
    onSuccess: () => {
      toast.success('저장했습니다.')
      setEditingId(null)
      invalidateDetail()
    },
    onError: (error: unknown) => {
      toast.error(formatRelationshipApiError(error))
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (relId: string) =>
      deleteHumanRelationship(personId, relId),
    onSuccess: () => {
      toast.success('삭제했습니다.')
      invalidateDetail()
    },
    onError: (error: unknown) => {
      toast.error(formatRelationshipApiError(error))
    },
  })

  const closeNewPanel = () => {
    if (
      isNewFormDirty &&
      !window.confirm('입력한 내용이 저장되지 않습니다. 창을 닫을까요?')
    ) {
      return
    }
    setCreateModalOpen(false)
    setPersonModalOpen(false)
    setNewRelatedId('')
    setNewNote('')
    setNewType('GENERAL')
    setNewAffinity(3)
    setNewSubjectIsMentor(true)
  }

  const cancelEdit = () => {
    if (
      isEditFormDirty &&
      !window.confirm('수정한 내용이 저장되지 않습니다. 취소할까요?')
    ) {
      return
    }
    setEditingId(null)
  }

  const startEdit = (rel: RelRowModel) => {
    setEditingId(rel.id)
    setEditAffinity(rel.affinityLevel)
    setEditType(normalizeRelationshipType(rel.originalRelationshipType))
    setEditSubjectIsMentor(rel.mentorPerspective !== 'STUDENT')
    setEditNote(rel.note ?? '')
  }

  const openCreateModal = (presetType: PersonHumanRelationshipType) => {
    setCreateModalOpen(true)
    setNewRelatedId('')
    setNewType(presetType)
    setNewAffinity(3)
    setNewSubjectIsMentor(true)
    setNewNote('')
  }

  function renderRelationshipCard(rel: RelRowModel) {
    const rt = rel.relationshipType
    const legacy = LEGACY_REL_TYPES.has(rel.originalRelationshipType)
    const cardVariant = rt === 'MENTOR' ? 'mentor' : 'general'
    const affinityStep = Math.min(5, Math.max(1, Math.round(rel.affinityLevel)))
    return (
      <RelCard key={rel.id} $variant={cardVariant}>
        {editingId === rel.id ? (
          <EditStack>
            <FieldBlock>
              <MiniLabel id={`edit-rel-type-${rel.id}`}>관계 종류</MiniLabel>
              <SegmentRow
                role="radiogroup"
                aria-labelledby={`edit-rel-type-${rel.id}`}
              >
                <Segment
                  type="button"
                  role="radio"
                  aria-checked={editType === 'GENERAL'}
                  tabIndex={editType === 'GENERAL' ? 0 : -1}
                  $active={editType === 'GENERAL'}
                  $tone="rose"
                  onClick={() => setEditType('GENERAL')}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'ArrowRight' ||
                      event.key === 'ArrowDown'
                    ) {
                      event.preventDefault()
                      setEditType('MENTOR')
                    }
                  }}
                >
                  <SegmentText>
                    <span>일반 관계</span>
                    <small>친밀도</small>
                  </SegmentText>
                </Segment>
                <Segment
                  type="button"
                  role="radio"
                  aria-checked={editType === 'MENTOR'}
                  tabIndex={editType === 'MENTOR' ? 0 : -1}
                  $active={editType === 'MENTOR'}
                  $tone="violet"
                  onClick={() => setEditType('MENTOR')}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                      event.preventDefault()
                      setEditType('GENERAL')
                    }
                  }}
                >
                  <SegmentText>
                    <span>멘토 · 스승–제자</span>
                    <small>역할</small>
                  </SegmentText>
                </Segment>
              </SegmentRow>
            </FieldBlock>
            {editType === 'MENTOR' && (
              <FieldBlock>
                <MiniLabel>이 인물의 역할</MiniLabel>
                <RoleGrid>
                  <RolePill $active={editSubjectIsMentor}>
                    <HiddenRadio
                      name="edit-mentor-role"
                      checked={editSubjectIsMentor}
                      onChange={() => setEditSubjectIsMentor(true)}
                    />
                    스승
                  </RolePill>
                  <RolePill $active={!editSubjectIsMentor}>
                    <HiddenRadio
                      name="edit-mentor-role"
                      checked={!editSubjectIsMentor}
                      onChange={() => setEditSubjectIsMentor(false)}
                    />
                    제자
                  </RolePill>
                </RoleGrid>
              </FieldBlock>
            )}
            {editType === 'GENERAL' && (
              <FieldBlock>
                <MiniLabel>친밀도 (1~5)</MiniLabel>
                <AffinityHeartRating
                  value={editAffinity}
                  onChange={setEditAffinity}
                  disabled={updateMut.isPending}
                />
              </FieldBlock>
            )}
            <FieldBlock>
              <MiniLabel>메모</MiniLabel>
              <NoteInput
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                placeholder="기억해둘 메모 (선택)"
                rows={2}
              />
            </FieldBlock>
            <SaveRow>
              <GhostButton
                type="button"
                onClick={cancelEdit}
                disabled={updateMut.isPending}
              >
                취소
              </GhostButton>
              <PrimaryButton
                type="button"
                disabled={updateMut.isPending}
                onClick={() => updateMut.mutate(rel)}
              >
                {updateMut.isPending ? '저장 중…' : '저장'}
              </PrimaryButton>
            </SaveRow>
          </EditStack>
        ) : (
          <>
            <RelCardTop>
              <RelPerson>
                <RelAvatar $variant={cardVariant}>
                  <FiUser size={20} strokeWidth={2} />
                </RelAvatar>
                <RelName>{getPersonDisplayName(rel.otherPerson)}</RelName>
              </RelPerson>
              <RelBadgeGroup>
                {rt === 'MENTOR' ? (
                  <RelBadge $variant="mentor">
                    {rel.mentorPerspective === 'MENTOR' ? '스승' : '제자'}
                  </RelBadge>
                ) : (
                  <RelBadge $variant="general">일반 관계</RelBadge>
                )}
                {legacy && (
                  <RelBadge $variant="legacy">이전 유형 데이터</RelBadge>
                )}
              </RelBadgeGroup>
            </RelCardTop>
            {rt === 'GENERAL' ? (
              <AffinityReadout
                role="group"
                aria-label={`친밀도 ${affinityStep}단계(5단계 만점), ${AFFINITY_SPECTRUM[affinityStep]?.detail ?? '—'}`}
              >
                <AffinityLevelReadDots level={rel.affinityLevel} />
                <div>
                  <AffinityReadTitle>
                    친밀도 {rel.affinityLevel} / 5
                  </AffinityReadTitle>
                  <AffinityReadDetail>
                    {AFFINITY_SPECTRUM[rel.affinityLevel]?.detail ?? '—'}
                  </AffinityReadDetail>
                </div>
              </AffinityReadout>
            ) : (
              <MentorHint>
                <MentorHintIcon aria-hidden>
                  <FiBookOpen size={16} />
                </MentorHintIcon>
                스승·제자 관계입니다. 친밀도는 사용하지 않습니다.
              </MentorHint>
            )}
            {rel.note ? <RelNote>{rel.note}</RelNote> : null}
            <RelCardActions>
              <IconTextBtn type="button" onClick={() => startEdit(rel)}>
                <FiEdit2 size={14} />
                수정
              </IconTextBtn>
              <IconTextBtn
                type="button"
                $danger
                onClick={() => {
                  const name = getPersonDisplayName(rel.otherPerson)
                  if (
                    window.confirm(`「${name}」와(과)의 관계를 삭제할까요?`)
                  ) {
                    deleteMut.mutate(rel.id)
                  }
                }}
              >
                <FiTrash2 size={14} />
                삭제
              </IconTextBtn>
            </RelCardActions>
          </>
        )}
      </RelCard>
    )
  }

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {createModalOpen && (
            <PersonRegisterModalOverlay
              key="human-rel-create-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="human-rel-create-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeNewPanel}
            >
              <PersonRegisterModalBox
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                $maxWidth="min(1200px, 96vw)"
                $minHeight="auto"
                onClick={(event) => event.stopPropagation()}
              >
                <PersonRegisterModalHeader>
                  <PersonRegisterModalTitle id="human-rel-create-title">
                    인간관계 등록
                  </PersonRegisterModalTitle>
                  <PersonRegisterModalCloseBtn
                    type="button"
                    aria-label="닫기"
                    onClick={closeNewPanel}
                  >
                    <FiX size={20} />
                  </PersonRegisterModalCloseBtn>
                </PersonRegisterModalHeader>
                <PersonRegisterModalFormScroll>
                  <HumanRelFormLayoutWrap>
                    <FormHeader>
                      <BackButton type="button" onClick={closeNewPanel}>
                        <FiArrowLeft size={18} />
                        목록 보기
                      </BackButton>
                      <SubmitButton
                        type="submit"
                        form="human-rel-create-form"
                        disabled={createMut.isPending || !newRelatedId}
                      >
                        {createMut.isPending ? '등록 중…' : '등록'}
                      </SubmitButton>
                    </FormHeader>
                    <form
                      id="human-rel-create-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        createMut.mutate()
                      }}
                    >
                      <FormSectionInner>
                        <TabNavigation>
                          <TabButton
                            type="button"
                            $active={true}
                            aria-current="page"
                            tabIndex={0}
                          >
                            {newType === 'GENERAL'
                              ? '일반 · 친밀도'
                              : '멘토 · 스승–제자'}
                          </TabButton>
                        </TabNavigation>
                        <FormRows>
                          {personsError && (
                            <CreateModalFormAlert role="alert">
                              인물 목록을 불러오지 못했습니다. 새로고침 후 다시
                              시도해 주세요.
                            </CreateModalFormAlert>
                          )}
                          <PersonSelectField
                            label="상대 인물"
                            required
                            hint={
                              personsLoading
                                ? '인물 목록을 불러오는 중…'
                                : '목록에서 검색해 선택합니다.'
                            }
                            disabled={personsLoading || !!personsError}
                            value={newRelatedId}
                            selectedPerson={selectedNewPerson}
                            persons={personsExcludingSelf}
                            isModalOpen={personModalOpen}
                            onModalOpenChange={setPersonModalOpen}
                            onSelect={(id) => setNewRelatedId(id)}
                            placeholder="인물 선택"
                          />

                          {newType === 'MENTOR' && (
                            <FieldRow>
                              <FieldLabel as="div">
                                이 인물(현재 프로필)의 역할
                              </FieldLabel>
                              <FieldControl>
                                <RoleGrid>
                                  <RolePill $active={newSubjectIsMentor}>
                                    <HiddenRadio
                                      name="new-mentor-role"
                                      checked={newSubjectIsMentor}
                                      onChange={() =>
                                        setNewSubjectIsMentor(true)
                                      }
                                    />
                                    스승(멘토)
                                  </RolePill>
                                  <RolePill $active={!newSubjectIsMentor}>
                                    <HiddenRadio
                                      name="new-mentor-role"
                                      checked={!newSubjectIsMentor}
                                      onChange={() =>
                                        setNewSubjectIsMentor(false)
                                      }
                                    />
                                    제자
                                  </RolePill>
                                </RoleGrid>
                              </FieldControl>
                            </FieldRow>
                          )}

                          {newType === 'GENERAL' && (
                            <FieldRow>
                              <FieldLabel as="div">친밀도</FieldLabel>
                              <FieldControl>
                                <AffinityBlock>
                                  <AffinityHeartRating
                                    value={newAffinity}
                                    onChange={setNewAffinity}
                                    disabled={createMut.isPending}
                                  />
                                </AffinityBlock>
                              </FieldControl>
                            </FieldRow>
                          )}

                          <FieldRow>
                            <FieldLabel htmlFor="human-rel-new-note">
                              메모 (선택)
                            </FieldLabel>
                            <FieldControl>
                              <FormTextarea
                                id="human-rel-new-note"
                                value={newNote}
                                onChange={(event) =>
                                  setNewNote(event.target.value)
                                }
                                placeholder="기억해둘 메모 (선택)"
                                rows={3}
                              />
                            </FieldControl>
                          </FieldRow>
                        </FormRows>
                      </FormSectionInner>
                    </form>
                  </HumanRelFormLayoutWrap>
                </PersonRegisterModalFormScroll>
              </PersonRegisterModalBox>
            </PersonRegisterModalOverlay>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <Root>
      <HeaderRow>
        <TitleBlock>
          <HeaderIconBadge aria-hidden>
            <FiUsers size={20} strokeWidth={2} />
          </HeaderIconBadge>
          <TitleText>
            <SectionTitle>인간관계</SectionTitle>
            <SectionDesc>
              <strong>친밀도(일반)</strong>과 <strong>멘토 · 스승–제자</strong>
              는 서로 다른 관계로 구분됩니다. 아래에서도 목록이 나뉩니다.
            </SectionDesc>
          </TitleText>
        </TitleBlock>
        <HeaderActionGroup>
          <HeaderBtn
            type="button"
            onClick={() => openCreateModal('GENERAL')}
            aria-label="친밀도 일반 관계 추가"
          >
            일반 · 친밀도
          </HeaderBtn>
          <HeaderBtn
            type="button"
            $tone="violet"
            onClick={() => openCreateModal('MENTOR')}
            aria-label="멘토 스승 제자 관계 추가"
          >
            멘토
          </HeaderBtn>
        </HeaderActionGroup>
      </HeaderRow>

      <RelListStack>
        <RelSubsection $tone="rose">
          <RelSubsectionHead>
            <RelSubsectionTitle>친밀도 · 일반 관계</RelSubsectionTitle>
            <RelSubsectionCount>
              {generalRelationships.length}
            </RelSubsectionCount>
          </RelSubsectionHead>
          {generalRelationships.length === 0 ? (
            <RelSubsectionEmpty>
              <RelEmptyTitle>등록된 관계가 없습니다</RelEmptyTitle>
              <RelEmptyText>
                상단의 <strong>일반 · 친밀도</strong>로 상대와 친밀도를
                추가할 수 있습니다.
              </RelEmptyText>
            </RelSubsectionEmpty>
          ) : (
            <RelSubsectionBody>
              <RelList>
                {generalRelationships.map((rel) =>
                  renderRelationshipCard(rel),
                )}
              </RelList>
            </RelSubsectionBody>
          )}
        </RelSubsection>

        <RelSubsection $tone="violet">
          <RelSubsectionHead>
            <RelSubsectionTitle>멘토 · 스승–제자</RelSubsectionTitle>
            <RelSubsectionCount>
              {mentorRelationships.length}
            </RelSubsectionCount>
          </RelSubsectionHead>
          {mentorRelationships.length === 0 ? (
            <RelSubsectionEmpty>
              <RelEmptyTitle>등록된 관계가 없습니다</RelEmptyTitle>
              <RelEmptyText>
                상단의 <strong>멘토</strong>로 스승·제자 관계를 추가할 수
                있습니다.
              </RelEmptyText>
            </RelSubsectionEmpty>
          ) : (
            <RelSubsectionBody>
              <RelList>
                {mentorRelationships.map((rel) =>
                  renderRelationshipCard(rel),
                )}
              </RelList>
            </RelSubsectionBody>
          )}
        </RelSubsection>
      </RelListStack>
    </Root>
    </>
  )
}

/** 클릭한 위치까지 채워지는 5단계 친밀도 (하트) */
function AffinityHeartRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (level: number) => void
  disabled?: boolean
}) {
  const clampedLevel = Math.min(5, Math.max(1, value))
  const spec = AFFINITY_SPECTRUM[clampedLevel]

  const handleGroupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault()
        onChange(Math.min(5, clampedLevel + 1))
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault()
        onChange(Math.max(1, clampedLevel - 1))
      } else if (event.key === 'Home') {
        event.preventDefault()
        onChange(1)
      } else if (event.key === 'End') {
        event.preventDefault()
        onChange(5)
      }
    },
    [disabled, onChange, clampedLevel],
  )

  return (
    <AffinityWrap>
      <HeartPanel>
        <HeartRow
          role="radiogroup"
          aria-disabled={disabled}
          aria-label={`친밀도 ${clampedLevel}단계 — ${spec?.short ?? ''}`}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleGroupKeyDown}
        >
          {([1, 2, 3, 4, 5] as const).map((step) => {
            const filled = clampedLevel >= step
            return (
              <HeartHit
                key={step}
                type="button"
                disabled={disabled}
                tabIndex={-1}
                $filled={filled}
                onClick={() => onChange(step)}
                aria-label={`친밀도 ${step}단계로 설정`}
              >
                {filled ? (
                  <FaHeart size={28} aria-hidden />
                ) : (
                  <FaRegHeart size={28} aria-hidden />
                )}
              </HeartHit>
            )
          })}
        </HeartRow>
      </HeartPanel>
      <AffinityCaption>
        <strong>{spec?.short}</strong> {spec?.detail}
      </AffinityCaption>
    </AffinityWrap>
  )
}

/** 목록 카드용: 하트 5개 대신 단계 점만 표시 (편집 폼은 하트 클릭 유지) */
function AffinityLevelReadDots({ level }: { level: number }) {
  const readLevel = Math.min(5, Math.max(0, Math.round(level)))
  return (
    <AffinityReadDotsRow aria-hidden>
      {([1, 2, 3, 4, 5] as const).map((step) => (
        <AffinityReadDot key={step} $filled={readLevel >= step} />
      ))}
    </AffinityReadDotsRow>
  )
}

const Root = styled.section`
  margin-top: 4px;
  padding-top: 22px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(226, 232, 240, 0.9)'};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`

const TitleBlock = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
`

const HeaderIconBadge = styled.div`
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(226, 232, 240, 0.95)'};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.1)'
      : 'rgba(248, 250, 252, 0.95)'};
`

const TitleText = styled.div`
  min-width: 0;
`

const SectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionDesc = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 56ch;
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const HeaderActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
`

const HeaderBtn = styled.button<{
  $ghost?: boolean
  $tone?: 'rose' | 'violet'
}>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  border: 1px solid
    ${({ theme, $ghost, $tone }) => {
      if ($ghost) {
        return theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'
      }
      if ($tone === 'rose') {
        return theme.mode === 'dark'
          ? 'rgba(251, 113, 133, 0.25)'
          : 'rgba(251, 113, 133, 0.35)'
      }
      if ($tone === 'violet') {
        return theme.mode === 'dark'
          ? 'rgba(167, 139, 250, 0.28)'
          : 'rgba(139, 92, 246, 0.3)'
      }
      return theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.22)'
    }};
  color: ${({ $ghost, theme, $tone }) => {
    if ($ghost) return theme.colors.text.secondary
    if ($tone === 'rose') return theme.mode === 'dark' ? '#fda4af' : '#be123c'
    if ($tone === 'violet') return theme.mode === 'dark' ? '#c4b5fd' : '#6d28d9'
    return theme.colors.text.primary
  }};
  background: ${({ $ghost, theme, $tone }) => {
    if ($ghost) {
      return theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#ffffff'
    }
    if ($tone === 'rose') {
      return theme.mode === 'dark'
        ? 'rgba(244, 63, 94, 0.08)'
        : 'rgba(255, 241, 242, 0.65)'
    }
    if ($tone === 'violet') {
      return theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.1)'
        : 'rgba(245, 243, 255, 0.85)'
    }
    return theme.mode === 'dark'
      ? 'rgba(99, 102, 241, 0.08)'
      : 'rgba(99, 102, 241, 0.06)'
  }};
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#cbd5e1'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f8fafc'};
  }
`

const FormAlert = styled.div`
  margin-bottom: 14px;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.45;
  border-radius: 10px;
  color: #b91c1c;
  background: rgba(254, 226, 226, 0.85);
  border: 1px solid rgba(248, 113, 113, 0.45);
  ${({ theme }) =>
    theme.mode === 'dark' &&
    css`
      color: #fca5a5;
      background: rgba(127, 29, 29, 0.35);
      border-color: rgba(248, 113, 113, 0.25);
    `}
`

const CreateModalFormAlert = styled(FormAlert)`
  margin: 0 0 20px;
  border-radius: 8px;
`

const FieldBlock = styled.div`
  margin-top: 18px;
  &:first-child {
    margin-top: 0;
  }
`

const MiniLabel = styled.div`
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 8px;
`

const SegmentRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const Segment = styled.button<{ $active: boolean; $tone: 'rose' | 'violet' }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 14px;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  border: 1.5px solid
    ${({ theme, $active, $tone }) =>
      $active
        ? $tone === 'rose'
          ? 'rgba(244, 63, 94, 0.55)'
          : 'rgba(139, 92, 246, 0.55)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e8ecf1'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ theme, $active, $tone }) =>
    $active
      ? $tone === 'rose'
        ? theme.mode === 'dark'
          ? 'rgba(244, 63, 94, 0.12)'
          : 'linear-gradient(145deg, rgba(255,241,242,0.95), rgba(255,255,255,0.5))'
        : theme.mode === 'dark'
          ? 'rgba(139, 92, 246, 0.14)'
          : 'linear-gradient(145deg, rgba(245,243,255,0.95), rgba(255,255,255,0.5))'
      : theme.mode === 'dark'
        ? 'rgba(0,0,0,0.12)'
        : '#fafbfc'};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 2px 8px rgba(15, 23, 42, 0.04)'
      : 'none'};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.1s ease;
  &:hover {
    border-color: ${({ $tone }) =>
      $tone === 'rose'
        ? 'rgba(244, 63, 94, 0.35)'
        : 'rgba(139, 92, 246, 0.35)'};
    transform: translateY(-1px);
  }
`

const SegmentText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  span {
    font-size: 13.5px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }
  small {
    font-size: 11px;
    font-weight: 500;
    opacity: 0.72;
    line-height: 1.2;
  }
`

const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const RolePill = styled.label<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  border: 1.5px solid
    ${({ theme, $active }) =>
      $active
        ? 'rgba(124, 58, 237, 0.55)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  color: ${({ theme, $active }) =>
    $active ? '#5b21b6' : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(124, 58, 237, 0.14)'
        : 'rgba(237, 233, 254, 0.85)'
      : theme.mode === 'dark'
        ? 'rgba(0,0,0,0.1)'
        : '#fff'};
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
  &:hover {
    border-color: rgba(124, 58, 237, 0.35);
  }
`

const HiddenRadio = styled.input.attrs({ type: 'radio' })`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const AffinityBlock = styled.div``

const AffinityWrap = styled.div``

const HeartPanel = styled.div`
  padding: 14px 16px;
  border-radius: 14px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: linear-gradient(
            180deg,
            rgba(255, 241, 242, 0.65) 0%,
            rgba(255, 255, 255, 0.4) 100%
          );
          border: 1px solid rgba(251, 113, 133, 0.2);
        `}
`

const HeartRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  border-radius: 12px;
  outline: none;
  &:focus-visible {
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 4px #e11d48;
  }
`

const HeartHit = styled.button<{ $filled: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  border: none;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  color: ${({ $filled, theme }) =>
    $filled
      ? '#e11d48'
      : theme.mode === 'dark'
        ? 'rgba(248, 250, 252, 0.35)'
        : '#cbd5e1'};
  transition:
    color 0.15s ease,
    transform 0.12s ease;
  &:hover:not(:disabled) {
    color: ${({ $filled }) => ($filled ? '#be123c' : '#f43f5e')};
    transform: scale(1.06);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`

const AffinityReadDotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
`

const AffinityReadDot = styled.span<{ $filled: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $filled, theme }) =>
    $filled
      ? '#e11d48'
      : theme.mode === 'dark'
        ? 'rgba(248, 250, 252, 0.22)'
        : '#cbd5e1'};
  box-shadow: ${({ $filled }) =>
    $filled ? '0 0 0 1px rgba(225, 29, 72, 0.25)' : 'none'};
`

const AffinityCaption = styled.p`
  margin: 10px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    margin-right: 6px;
  }
`

const NoteInput = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;
  min-height: 56px;
`

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef2ff'};
`

const GhostButton = styled.button`
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const PrimaryButton = styled.button`
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(79, 70, 229, 0.35);
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`

const RelListStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

/** person-detail-panel `SectionCard` / `TenureSectionCard` 계열과 통일 */
const RelSubsection = styled.section<{ $tone: 'rose' | 'violet' }>`
  margin: 0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 2px 8px rgba(0, 0, 0, 0.03);
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
  border-left: 2px solid
    ${({ $tone, theme }) =>
      $tone === 'violet'
        ? theme.mode === 'dark'
          ? 'rgba(167, 139, 250, 0.45)'
          : 'rgba(139, 92, 246, 0.45)'
        : theme.mode === 'dark'
          ? 'rgba(251, 113, 133, 0.45)'
          : 'rgba(244, 63, 94, 0.4)'};
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        `
      : css`
          background: #ffffff;
        `}
`

const RelSubsectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
  background: transparent;
`

const RelSubsectionTitle = styled.h4`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RelSubsectionCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 26px;
  text-align: center;
  padding: 3px 9px;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

const RelSubsectionBody = styled.div`
  padding: 12px 16px 16px;
`

const RelSubsectionEmpty = styled.div`
  margin: 0 16px 16px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  border-radius: 11px;
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(248, 250, 252, 0.5)'};
`

const RelEmptyTitle = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: -0.01em;
`

const RelEmptyText = styled.p`
  margin: 0;
  max-width: 38ch;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.tertiary};
  strong {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const RelList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RelCard = styled.li<{ $variant: 'mentor' | 'general' }>`
  padding: 14px 16px;
  border-radius: 12px;
  transition:
    box-shadow 0.16s ease,
    border-color 0.16s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #fafbfc;
          border: 1px solid ${theme.colors.border.light};
        `}
  box-shadow: inset 3px 0 0 0
    ${({ $variant, theme }) =>
      $variant === 'mentor'
        ? theme.mode === 'dark'
          ? 'rgba(167, 139, 250, 0.45)'
          : 'rgba(139, 92, 246, 0.32)'
        : theme.mode === 'dark'
          ? 'rgba(251, 113, 133, 0.42)'
          : 'rgba(244, 63, 94, 0.3)'};
  &:hover {
    box-shadow:
      inset 3px 0 0 0
        ${({ $variant, theme }) =>
          $variant === 'mentor'
            ? theme.mode === 'dark'
              ? 'rgba(167, 139, 250, 0.55)'
              : 'rgba(139, 92, 246, 0.4)'
            : theme.mode === 'dark'
              ? 'rgba(251, 113, 133, 0.52)'
              : 'rgba(244, 63, 94, 0.38)'},
      ${({ theme }) =>
        theme.mode === 'dark'
          ? '0 1px 8px rgba(0, 0, 0, 0.2)'
          : '0 2px 10px rgba(15, 23, 42, 0.06)'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : theme.colors.border.default};
  }
`

const RelCardTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
`

const RelPerson = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const RelAvatar = styled.div<{ $variant: 'mentor' | 'general' }>`
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $variant }) => ($variant === 'mentor' ? '#7c3aed' : '#e11d48')};
  background: ${({ $variant, theme }) =>
    $variant === 'mentor'
      ? theme.mode === 'dark'
        ? 'rgba(139, 92, 246, 0.18)'
        : 'rgba(237, 233, 254, 0.95)'
      : theme.mode === 'dark'
        ? 'rgba(244, 63, 94, 0.14)'
        : 'rgba(255, 241, 242, 0.95)'};
`

const RelName = styled.div`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RelBadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RelBadge = styled.span<{ $variant: 'mentor' | 'general' | 'legacy' }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  letter-spacing: 0.01em;
  ${({ $variant, theme }) =>
    $variant === 'mentor'
      ? theme.mode === 'dark'
        ? css`
            color: #ddd6fe;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(167, 139, 250, 0.2);
          `
        : css`
            color: #6d28d9;
            background: rgba(245, 243, 255, 0.95);
            border: 1px solid rgba(196, 181, 253, 0.45);
          `
      : $variant === 'legacy'
        ? theme.mode === 'dark'
          ? css`
              color: #fcd34d;
              background: rgba(245, 158, 11, 0.12);
              border: 1px solid rgba(245, 158, 11, 0.18);
            `
          : css`
              color: #b45309;
              background: rgba(255, 251, 235, 0.9);
              border: 1px solid rgba(253, 230, 138, 0.6);
            `
        : theme.mode === 'dark'
          ? css`
              color: #bae6fd;
              background: rgba(14, 165, 233, 0.1);
              border: 1px solid rgba(56, 189, 248, 0.18);
            `
          : css`
              color: #0369a1;
              background: #f0f9ff;
              border: 1px solid rgba(125, 211, 252, 0.5);
            `}
`

const AffinityReadout = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 8px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(0, 0, 0, 0.2);
        `
      : css`
          background: #f1f5f9;
        `}
`

const MentorHint = styled.p`
  margin: 0 0 12px;
  padding: 11px 12px 11px 10px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 11px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
        `
      : css`
          background: rgba(245, 243, 255, 0.9);
          border: 1px solid rgba(196, 181, 253, 0.45);
        `}
`

const MentorHintIcon = styled.span`
  flex-shrink: 0;
  margin-top: 1px;
  color: #7c3aed;
  display: flex;
`

const AffinityReadTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const AffinityReadDetail = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 2px;
  line-height: 1.4;
`

const RelNote = styled.p`
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RelCardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`

const IconTextBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ $danger, theme }) =>
    $danger ? '#dc2626' : theme.colors.text.secondary};
  background: transparent;
  transition:
    background 0.12s ease,
    color 0.12s ease;
  &:hover {
    color: ${({ $danger, theme }) =>
      $danger ? '#b91c1c' : theme.colors.text.primary};
    background: ${({ $danger, theme }) =>
      $danger
        ? 'rgba(220, 38, 38, 0.08)'
        : theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.05)'};
  }
`

const EditStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`
