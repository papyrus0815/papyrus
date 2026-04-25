/**
 * 인물 상세 — 인간관계
 * 친밀도(일반)와 멘토·스승–제자를 목록·추가 진입에서 분리합니다.
 */
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FaHeart, FaHeartBroken } from 'react-icons/fa'
import {
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiUser,
  FiX,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  AFFINITY_LEVELS,
  AFFINITY_SPECTRUM,
  type AffinityLevel,
  type PersonHumanRelationshipItem,
  type PersonHumanRelationshipType,
  type PersonRelationshipTag,
  RELATIONSHIP_TAG_META,
  RELATIONSHIP_TAG_ORDER,
  createHumanRelationship,
  deleteHumanRelationship,
  getMentorLineage,
  updateHumanRelationship,
} from '@/shared/api/person-human-relationships'
import {
  type PersonLifeEvent,
  listPersonLifeEvents,
} from '@/shared/api/person-life-events'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormTextarea } from '@/shared/ui/form-input/form-input'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'


type Props = {
  personId: string
  relationships: PersonHumanRelationshipItem[] | undefined
}

function normalizeRelationshipType(
  relationshipType: string,
): PersonHumanRelationshipType {
  if (relationshipType === 'MENTOR' || relationshipType === 'GENERAL') {
    return relationshipType
  }
  return 'GENERAL'
}

type RelRowModel = PersonHumanRelationshipItem

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
    // 동일 키로 통일해 다른 화면과 React Query 캐시 공유 (5분 fresh)
    queryKey: ['all-persons'],
    queryFn: () => getAllPersons(),
    staleTime: 5 * 60 * 1000,
  })

  const personsExcludingSelf = useMemo(
    () => persons.filter((person) => person.id !== personId),
    [persons, personId],
  )

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [newStartDateModalOpen, setNewStartDateModalOpen] = useState(false)
  const [newEndDateModalOpen, setNewEndDateModalOpen] = useState(false)
  const [editStartDateModalOpen, setEditStartDateModalOpen] = useState(false)
  const [editEndDateModalOpen, setEditEndDateModalOpen] = useState(false)

  /** 인라인 확인 다이얼로그 상태 */
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  const [newRelatedId, setNewRelatedId] = useState('')
  const [newType, setNewType] = useState<PersonHumanRelationshipType>('GENERAL')
  const [newAffinity, setNewAffinity] = useState<AffinityLevel | null>(0)
  const [newSubjectIsMentor, setNewSubjectIsMentor] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAffinity, setEditAffinity] = useState<AffinityLevel | null>(0)
  const [editType, setEditType] =
    useState<PersonHumanRelationshipType>('GENERAL')
  const [editSubjectIsMentor, setEditSubjectIsMentor] = useState(true)
  const [editNote, setEditNote] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [newTags, setNewTags] = useState<PersonRelationshipTag[]>([])
  const [editTags, setEditTags] = useState<PersonRelationshipTag[]>([])
  const [newIsMutual, setNewIsMutual] = useState(false)
  const [editIsMutual, setEditIsMutual] = useState(false)
  const [newSourceIds, setNewSourceIds] = useState<string[]>([])
  const [editSourceIds, setEditSourceIds] = useState<string[]>([])
  const [lineageOpen, setLineageOpen] = useState(false)

  /** 새 관계 폼: 기본값에서 바뀐 항목이 있으면 닫기 시 경고 */
  const isNewFormDirty = useMemo(
    () =>
      newRelatedId !== '' ||
      newNote.trim() !== '' ||
      newAffinity !== 0 ||
      newType !== 'GENERAL' ||
      newSubjectIsMentor === false ||
      newStartDate !== '' ||
      newEndDate !== '' ||
      newTags.length > 0 ||
      newIsMutual !== false ||
      newSourceIds.length > 0,
    [
      newRelatedId,
      newNote,
      newAffinity,
      newType,
      newSubjectIsMentor,
      newStartDate,
      newEndDate,
      newTags,
      newIsMutual,
      newSourceIds,
    ],
  )

  const editingRel = useMemo(
    () => (editingId ? list.find((row) => row.id === editingId) : undefined),
    [editingId, list],
  )

  const toIsoDateInput = (iso: string | null): string => {
    if (!iso) return ''
    return iso.slice(0, 10)
  }

  const isEditFormDirty = useMemo(() => {
    if (!editingRel) return false
    if (editType !== editingRel.relationshipType) return true
    if (editAffinity !== (editingRel.affinityLevel as AffinityLevel | null))
      return true
    if (editType === 'MENTOR') {
      const wasMentor = editingRel.mentorPerspective === 'MENTOR'
      if (editSubjectIsMentor !== wasMentor) return true
    }
    if ((editNote.trim() || '') !== (editingRel.note ?? '').trim()) return true
    if (editStartDate !== toIsoDateInput(editingRel.startDate)) return true
    if (editEndDate !== toIsoDateInput(editingRel.endDate)) return true
    const origTags = [...(editingRel.tags ?? [])].sort().join(',')
    const curTags = [...editTags].sort().join(',')
    if (origTags !== curTags) return true
    if (editIsMutual !== editingRel.isMutual) return true
    const origSources = [...(editingRel.sources ?? []).map((s) => s.lifeEventId)]
      .sort()
      .join(',')
    const curSources = [...editSourceIds].sort().join(',')
    if (origSources !== curSources) return true
    return false
  }, [
    editingRel,
    editType,
    editAffinity,
    editSubjectIsMentor,
    editNote,
    editStartDate,
    editEndDate,
    editTags,
    editIsMutual,
    editSourceIds,
  ])

  const selectedNewPerson =
    personsExcludingSelf.find((person) => person.id === newRelatedId) ?? null

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
    queryClient.invalidateQueries({ queryKey: ['all-persons'] })
  }

  const resetNewForm = useCallback(() => {
    setNewRelatedId('')
    setNewNote('')
    setNewType('GENERAL')
    setNewAffinity(0)
    setNewSubjectIsMentor(true)
    setNewStartDate('')
    setNewEndDate('')
    setNewTags([])
    setNewIsMutual(false)
    setNewSourceIds([])
  }, [])

  const createMut = useMutation({
    mutationFn: async () => {
      if (!newRelatedId) throw new Error('상대 인물을 선택하세요.')
      return createHumanRelationship(personId, {
        relatedPersonId: newRelatedId,
        relationshipType: newType,
        affinityLevel: newAffinity,
        startDate: newStartDate ? newStartDate : undefined,
        endDate: newEndDate ? newEndDate : undefined,
        note: newNote.trim() || undefined,
        subjectIsMentor: newType === 'MENTOR' ? newSubjectIsMentor : undefined,
        tags: newTags.length > 0 ? newTags : undefined,
        isMutual: newType === 'GENERAL' ? newIsMutual : undefined,
        sourceLifeEventIds:
          newSourceIds.length > 0 ? newSourceIds : undefined,
      })
    },
    onSuccess: () => {
      toast.success('저장했습니다.')
      setCreateModalOpen(false)
      resetNewForm()
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
        affinityLevel: editAffinity,
        startDate: editStartDate ? editStartDate : null,
        endDate: editEndDate ? editEndDate : null,
        note: editNote.trim() || null,
        subjectIsMentor:
          editType === 'MENTOR' ? editSubjectIsMentor : undefined,
        tags: editTags,
        isMutual: editType === 'GENERAL' ? editIsMutual : undefined,
        sourceLifeEventIds: editSourceIds,
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
    if (isNewFormDirty) {
      setConfirmDialog({
        message: '입력한 내용이 저장되지 않습니다. 창을 닫을까요?',
        onConfirm: () => {
          setCreateModalOpen(false)
          setPersonModalOpen(false)
          resetNewForm()
          setConfirmDialog(null)
        },
      })
      return
    }
    setCreateModalOpen(false)
    setPersonModalOpen(false)
    resetNewForm()
  }

  const cancelEdit = () => {
    if (isEditFormDirty) {
      setConfirmDialog({
        message: '수정한 내용이 저장되지 않습니다. 취소할까요?',
        onConfirm: () => {
          setEditingId(null)
          setConfirmDialog(null)
        },
      })
      return
    }
    setEditingId(null)
  }

  /** 자식(인물 선택·날짜 피커) 모달이 열려 있으면 부모 ESC 무시 */
  const childModalOpen =
    personModalOpen ||
    newStartDateModalOpen ||
    newEndDateModalOpen ||
    editStartDateModalOpen ||
    editEndDateModalOpen

  /** ESC: 자식 모달 → 확인 다이얼로그 → 등록 모달 → 인라인 편집 순서 */
  useEffect(() => {
    if (!createModalOpen && editingId == null && !confirmDialog) return
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (childModalOpen) return
      if (confirmDialog) {
        setConfirmDialog(null)
        return
      }
      if (createModalOpen) {
        closeNewPanel()
        return
      }
      if (editingId != null) {
        cancelEdit()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createModalOpen, editingId, confirmDialog, childModalOpen])

  const startEdit = (rel: RelRowModel) => {
    setEditingId(rel.id)
    setEditAffinity(rel.affinityLevel as AffinityLevel | null)
    setEditType(rel.relationshipType)
    setEditSubjectIsMentor(rel.mentorPerspective !== 'STUDENT')
    setEditNote(rel.note ?? '')
    setEditStartDate(toIsoDateInput(rel.startDate))
    setEditEndDate(toIsoDateInput(rel.endDate))
    setEditTags([...(rel.tags ?? [])])
    setEditIsMutual(rel.isMutual)
    setEditSourceIds((rel.sources ?? []).map((s) => s.lifeEventId))
  }

  /** 타입 전환이 친밀도를 의미 변화시킬 수 있을 때 사용자 확인 */
  const requestEditTypeChange = (next: PersonHumanRelationshipType) => {
    if (next === editType) return
    if (editAffinity != null && editAffinity !== 0) {
      setConfirmDialog({
        message:
          '관계 종류를 바꾸면 친밀도 입력값이 의미가 달라질 수 있습니다. 그래도 바꿀까요?',
        onConfirm: () => {
          setEditType(next)
          setConfirmDialog(null)
        },
      })
      return
    }
    setEditType(next)
  }

  const openCreateModal = (presetType: PersonHumanRelationshipType) => {
    resetNewForm()
    setNewType(presetType)
    setCreateModalOpen(true)
  }

  function renderRelationshipCard(rel: RelRowModel) {
    const rt = rel.relationshipType
    const cardVariant = rt === 'MENTOR' ? 'mentor' : 'general'
    const affinityValue = rel.affinityLevel as AffinityLevel | null
    const tags = sortTags(rel.tags ?? [])
    const avatarTone: 'mentor' | 'positive' | 'negative' | 'general' =
      rt === 'MENTOR'
        ? 'mentor'
        : affinityValue == null
          ? 'general'
          : affinityValue >= 1
            ? 'positive'
            : affinityValue <= -1
              ? 'negative'
              : 'general'
    return (
      <RelCard
        key={rel.id}
        $variant={cardVariant}
        layout
        transition={{ layout: { duration: 0.18, ease: 'easeOut' } }}
      >
        {editingId === rel.id ? (
          <CleanForm>
            <TopTypeToggle
              role="radiogroup"
              aria-label="관계 종류"
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                  event.preventDefault()
                  requestEditTypeChange('MENTOR')
                } else if (
                  event.key === 'ArrowLeft' ||
                  event.key === 'ArrowUp'
                ) {
                  event.preventDefault()
                  requestEditTypeChange('GENERAL')
                }
              }}
            >
              <TopTypeOption
                type="button"
                role="radio"
                aria-checked={editType === 'GENERAL'}
                tabIndex={editType === 'GENERAL' ? 0 : -1}
                $active={editType === 'GENERAL'}
                onClick={() => requestEditTypeChange('GENERAL')}
              >
                일반 관계
              </TopTypeOption>
              <TopTypeOption
                type="button"
                role="radio"
                aria-checked={editType === 'MENTOR'}
                tabIndex={editType === 'MENTOR' ? 0 : -1}
                $active={editType === 'MENTOR'}
                onClick={() => requestEditTypeChange('MENTOR')}
              >
                멘토 · 스승–제자
              </TopTypeOption>
            </TopTypeToggle>

            {editType === 'MENTOR' && (
              <FormField>
                <FormFieldLabel>이 인물의 역할</FormFieldLabel>
                <CompactRolePillRow>
                  <CompactRolePill $active={editSubjectIsMentor}>
                    <HiddenRadio
                      name="edit-mentor-role"
                      checked={editSubjectIsMentor}
                      onChange={() => setEditSubjectIsMentor(true)}
                    />
                    스승
                  </CompactRolePill>
                  <CompactRolePill $active={!editSubjectIsMentor}>
                    <HiddenRadio
                      name="edit-mentor-role"
                      checked={!editSubjectIsMentor}
                      onChange={() => setEditSubjectIsMentor(false)}
                    />
                    제자
                  </CompactRolePill>
                </CompactRolePillRow>
              </FormField>
            )}

            {editType === 'GENERAL' && (
              <FormField>
                <FormFieldLabel>시점</FormFieldLabel>
                <PerspectiveToggle>
                  <UnsetToggleLabel>
                    <UnsetToggleCheckbox
                      type="checkbox"
                      checked={editIsMutual}
                      onChange={(event) => setEditIsMutual(event.target.checked)}
                      disabled={updateMut.isPending}
                    />
                    <span>
                      양쪽 합의된 대칭 관계
                      <PerspectiveHint>
                        체크 해제 시 이 인물의 시점만 표현
                      </PerspectiveHint>
                    </span>
                  </UnsetToggleLabel>
                </PerspectiveToggle>
              </FormField>
            )}

            <FormField>
              <FormFieldLabel>
                친밀도
                <FormFieldHint>
                  {editType === 'MENTOR'
                    ? '선택 — 미설정 가능'
                    : '−2 적대 ~ +2 우호'}
                </FormFieldHint>
              </FormFieldLabel>
              <AffinityBipolarPicker
                value={editAffinity}
                onChange={setEditAffinity}
                allowClear
                disabled={updateMut.isPending}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>
                관계 기간 <FormFieldHint>선택</FormFieldHint>
              </FormFieldLabel>
              <DateRangeRow>
                <DateFieldTrigger
                  type="button"
                  $hasValue={!!editStartDate}
                  onClick={() => setEditStartDateModalOpen(true)}
                  aria-label="시작일 선택"
                >
                  <FiCalendar size={14} aria-hidden />
                  <span>
                    {editStartDate
                      ? formatDateDisplay(editStartDate)
                      : '시작일'}
                  </span>
                  {editStartDate && (
                    <DateClearBtn
                      as="span"
                      role="button"
                      tabIndex={0}
                      aria-label="시작일 지우기"
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditStartDate('')
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setEditStartDate('')
                        }
                      }}
                    >
                      <FiX size={12} />
                    </DateClearBtn>
                  )}
                </DateFieldTrigger>
                <DateRangeSep>~</DateRangeSep>
                <DateFieldTrigger
                  type="button"
                  $hasValue={!!editEndDate}
                  onClick={() => setEditEndDateModalOpen(true)}
                  aria-label="종료일 선택"
                >
                  <FiCalendar size={14} aria-hidden />
                  <span>
                    {editEndDate ? formatDateDisplay(editEndDate) : '종료일'}
                  </span>
                  {editEndDate && (
                    <DateClearBtn
                      as="span"
                      role="button"
                      tabIndex={0}
                      aria-label="종료일 지우기"
                      onClick={(event) => {
                        event.stopPropagation()
                        setEditEndDate('')
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setEditEndDate('')
                        }
                      }}
                    >
                      <FiX size={12} />
                    </DateClearBtn>
                  )}
                </DateFieldTrigger>
              </DateRangeRow>
              <DatePickerModal
                isOpen={editStartDateModalOpen}
                onClose={() => setEditStartDateModalOpen(false)}
                onSelect={(date) => {
                  setEditStartDate(date)
                  setEditStartDateModalOpen(false)
                }}
                initialDate={editStartDate || undefined}
                maxDate={editEndDate || undefined}
                title="시작일 선택"
              />
              <DatePickerModal
                isOpen={editEndDateModalOpen}
                onClose={() => setEditEndDateModalOpen(false)}
                onSelect={(date) => {
                  setEditEndDate(date)
                  setEditEndDateModalOpen(false)
                }}
                initialDate={editEndDate || undefined}
                minDate={editStartDate || undefined}
                title="종료일 선택"
              />
            </FormField>

            <FormField>
              <FormFieldLabel>
                태그 <FormFieldHint>다중 선택, 선택</FormFieldHint>
              </FormFieldLabel>
              <TagSelector
                value={editTags}
                onChange={setEditTags}
                disabled={updateMut.isPending}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>
                근거 사건 <FormFieldHint>두 인물의 연보에서 선택</FormFieldHint>
              </FormFieldLabel>
              <SourceSelector
                subjectPersonId={personId}
                relatedPersonId={rel.otherPerson.id}
                value={editSourceIds}
                onChange={setEditSourceIds}
                disabled={updateMut.isPending}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>
                메모 <FormFieldHint>선택</FormFieldHint>
              </FormFieldLabel>
              <NoteInput
                value={editNote}
                onChange={(event) => setEditNote(event.target.value)}
                placeholder="기억해둘 메모"
                rows={2}
              />
            </FormField>
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
          </CleanForm>
        ) : (
          <>
            <RelCardTop>
              <RelPerson>
                <RelAvatar $tone={avatarTone}>
                  <FiUser size={20} strokeWidth={2} />
                </RelAvatar>
                <RelNameLink
                  to={`/persons/${rel.otherPerson.id}`}
                  title="해당 인물 페이지로 이동"
                >
                  {getPersonDisplayName(rel.otherPerson)}
                </RelNameLink>
              </RelPerson>
              <RelBadgeGroup>
                {rt === 'MENTOR' ? (
                  <RelBadge $variant="mentor">
                    {rel.mentorPerspective === 'MENTOR' ? '스승' : '제자'}
                  </RelBadge>
                ) : (
                  <RelBadge $variant="general">일반 관계</RelBadge>
                )}
                {rel.subjectivePerspective === 'OTHER' && (
                  <RelBadge $variant="perspective">
                    {getPersonDisplayName(rel.otherPerson)}의 시점
                  </RelBadge>
                )}
                {rel.subjectivePerspective === 'MUTUAL' && (
                  <RelBadge $variant="mutual">양쪽 합의</RelBadge>
                )}
              </RelBadgeGroup>
            </RelCardTop>
            {affinityValue != null ? (
              <AffinityInline
                role="group"
                aria-label={`친밀도 ${AFFINITY_SPECTRUM[affinityValue]?.label ?? '—'}`}
                title={AFFINITY_SPECTRUM[affinityValue]?.detail ?? ''}
              >
                <AffinityLevelReadDots level={affinityValue} />
                <AffinityInlineLabel>
                  {AFFINITY_SPECTRUM[affinityValue]?.label ?? '—'}
                </AffinityInlineLabel>
                <AffinitySign>
                  {AFFINITY_SPECTRUM[affinityValue]?.short ?? ''}
                </AffinitySign>
              </AffinityInline>
            ) : (
              <AffinityUnsetLine>친밀도 미설정</AffinityUnsetLine>
            )}
            {(rel.startDate || rel.endDate) && (
              <RelMeta>
                {formatRelationshipPeriod(rel.startDate, rel.endDate)}
              </RelMeta>
            )}
            {tags.length > 0 && (
              <TagChipRow aria-label="관계 태그">
                {tags.map((tag) => (
                  <TagChip key={tag} $tone={RELATIONSHIP_TAG_META[tag].tone}>
                    {RELATIONSHIP_TAG_META[tag].label}
                  </TagChip>
                ))}
              </TagChipRow>
            )}
            {rel.sources.length > 0 && (
              <SourceChipRow aria-label="근거 사건">
                <SourceChipLabel>근거</SourceChipLabel>
                {rel.sources.map((s) => (
                  <SourceChipLink
                    key={s.id}
                    to={`/persons/${s.lifeEvent.personId}`}
                    title={`${s.lifeEvent.title} — ${formatDateDisplay(s.lifeEvent.startDate ?? '')}`}
                  >
                    <FiCalendar size={11} aria-hidden />
                    {s.lifeEvent.title}
                  </SourceChipLink>
                ))}
              </SourceChipRow>
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
                  setConfirmDialog({
                    message: `「${name}」와(과)의 관계를 삭제할까요?`,
                    onConfirm: () => {
                      deleteMut.mutate(rel.id)
                      setConfirmDialog(null)
                    },
                  })
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
                $maxWidth="min(560px, 94vw)"
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
                  <form
                    id="human-rel-create-form"
                    onSubmit={(event) => {
                      event.preventDefault()
                      createMut.mutate()
                    }}
                  >
                    <CleanForm>
                        {personsError && (
                          <CreateModalFormAlert role="alert">
                            인물 목록을 불러오지 못했습니다. 새로고침 후 다시
                            시도해 주세요.
                          </CreateModalFormAlert>
                        )}

                        {/* 관계 종류 — 작은 토글 */}
                        <TopTypeToggle
                          role="radiogroup"
                          aria-label="관계 종류 선택"
                          onKeyDown={(event) => {
                            if (
                              event.key === 'ArrowRight' ||
                              event.key === 'ArrowDown'
                            ) {
                              event.preventDefault()
                              setNewType('MENTOR')
                            } else if (
                              event.key === 'ArrowLeft' ||
                              event.key === 'ArrowUp'
                            ) {
                              event.preventDefault()
                              setNewType('GENERAL')
                            }
                          }}
                        >
                          <TopTypeOption
                            type="button"
                            role="radio"
                            aria-checked={newType === 'GENERAL'}
                            tabIndex={newType === 'GENERAL' ? 0 : -1}
                            $active={newType === 'GENERAL'}
                            onClick={() => setNewType('GENERAL')}
                          >
                            일반 관계
                          </TopTypeOption>
                          <TopTypeOption
                            type="button"
                            role="radio"
                            aria-checked={newType === 'MENTOR'}
                            tabIndex={newType === 'MENTOR' ? 0 : -1}
                            $active={newType === 'MENTOR'}
                            onClick={() => setNewType('MENTOR')}
                          >
                            멘토 · 스승–제자
                          </TopTypeOption>
                        </TopTypeToggle>

                        <FormField>
                          <FormFieldLabel>
                            상대 인물 <span aria-hidden>*</span>
                          </FormFieldLabel>
                          <RelatedPersonTrigger
                            type="button"
                            $hasValue={!!selectedNewPerson}
                            disabled={personsLoading || !!personsError}
                            onClick={() => setPersonModalOpen(true)}
                            aria-label={
                              selectedNewPerson
                                ? `${getPersonDisplayName(selectedNewPerson)} 선택됨, 변경하려면 누르기`
                                : '인물 선택'
                            }
                          >
                            <RelatedPersonAvatar
                              $hasImage={!!selectedNewPerson?.profileImageUrl}
                            >
                              {selectedNewPerson?.profileImageUrl ? (
                                <img
                                  src={selectedNewPerson.profileImageUrl}
                                  alt=""
                                />
                              ) : (
                                <FiUser size={28} strokeWidth={1.6} />
                              )}
                            </RelatedPersonAvatar>
                            <RelatedPersonText>
                              {selectedNewPerson ? (
                                <>
                                  <RelatedPersonName>
                                    {getPersonDisplayName(selectedNewPerson)}
                                  </RelatedPersonName>
                                  <RelatedPersonMeta>
                                    {formatLifespan(selectedNewPerson) ||
                                      '생몰년 미상'}
                                  </RelatedPersonMeta>
                                </>
                              ) : (
                                <>
                                  <RelatedPersonName $placeholder>
                                    {personsLoading
                                      ? '인물 목록 불러오는 중…'
                                      : '인물 선택'}
                                  </RelatedPersonName>
                                  <RelatedPersonMeta>
                                    클릭해 검색·선택
                                  </RelatedPersonMeta>
                                </>
                              )}
                            </RelatedPersonText>
                            <RelatedPersonCaret aria-hidden>
                              <FiChevronRight size={20} strokeWidth={2} />
                            </RelatedPersonCaret>
                          </RelatedPersonTrigger>
                          {personModalOpen && (
                            <PersonSelectModal
                              persons={personsExcludingSelf}
                              selectedPersonId={newRelatedId}
                              onSelect={(id) => {
                                setNewRelatedId(id)
                                setPersonModalOpen(false)
                              }}
                              onClose={() => setPersonModalOpen(false)}
                            />
                          )}
                        </FormField>

                        {newType === 'MENTOR' && (
                          <FormField>
                            <FormFieldLabel>이 인물의 역할</FormFieldLabel>
                            <CompactRolePillRow>
                              <CompactRolePill $active={newSubjectIsMentor}>
                                <HiddenRadio
                                  name="new-mentor-role"
                                  checked={newSubjectIsMentor}
                                  onChange={() => setNewSubjectIsMentor(true)}
                                />
                                스승(멘토)
                              </CompactRolePill>
                              <CompactRolePill $active={!newSubjectIsMentor}>
                                <HiddenRadio
                                  name="new-mentor-role"
                                  checked={!newSubjectIsMentor}
                                  onChange={() => setNewSubjectIsMentor(false)}
                                />
                                제자
                              </CompactRolePill>
                            </CompactRolePillRow>
                          </FormField>
                        )}

                        {newType === 'GENERAL' && (
                          <FormField>
                            <FormFieldLabel>시점</FormFieldLabel>
                            <PerspectiveToggle>
                              <UnsetToggleLabel>
                                <UnsetToggleCheckbox
                                  type="checkbox"
                                  checked={newIsMutual}
                                  onChange={(event) =>
                                    setNewIsMutual(event.target.checked)
                                  }
                                  disabled={createMut.isPending}
                                />
                                <span>
                                  양쪽 합의된 대칭 관계
                                  <PerspectiveHint>
                                    체크 해제 시 이 인물의 시점만 표현
                                  </PerspectiveHint>
                                </span>
                              </UnsetToggleLabel>
                            </PerspectiveToggle>
                          </FormField>
                        )}

                        <FormField>
                          <FormFieldLabel>
                            친밀도
                            <FormFieldHint>
                              {newType === 'MENTOR'
                                ? '선택 — 미설정 가능'
                                : '−2 적대 ~ +2 우호'}
                            </FormFieldHint>
                          </FormFieldLabel>
                          <AffinityBipolarPicker
                            value={newAffinity}
                            onChange={setNewAffinity}
                            allowClear={newType === 'MENTOR'}
                            disabled={createMut.isPending}
                          />
                        </FormField>

                        <FormField>
                          <FormFieldLabel>
                            관계 기간 <FormFieldHint>선택</FormFieldHint>
                          </FormFieldLabel>
                          <DateRangeRow>
                            <DateFieldTrigger
                              type="button"
                              $hasValue={!!newStartDate}
                              onClick={() => setNewStartDateModalOpen(true)}
                              aria-label="시작일 선택"
                            >
                              <FiCalendar size={14} aria-hidden />
                              <span>
                                {newStartDate
                                  ? formatDateDisplay(newStartDate)
                                  : '시작일'}
                              </span>
                              {newStartDate && (
                                <DateClearBtn
                                  as="span"
                                  role="button"
                                  tabIndex={0}
                                  aria-label="시작일 지우기"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setNewStartDate('')
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      setNewStartDate('')
                                    }
                                  }}
                                >
                                  <FiX size={12} />
                                </DateClearBtn>
                              )}
                            </DateFieldTrigger>
                            <DateRangeSep>~</DateRangeSep>
                            <DateFieldTrigger
                              type="button"
                              $hasValue={!!newEndDate}
                              onClick={() => setNewEndDateModalOpen(true)}
                              aria-label="종료일 선택"
                            >
                              <FiCalendar size={14} aria-hidden />
                              <span>
                                {newEndDate
                                  ? formatDateDisplay(newEndDate)
                                  : '종료일'}
                              </span>
                              {newEndDate && (
                                <DateClearBtn
                                  as="span"
                                  role="button"
                                  tabIndex={0}
                                  aria-label="종료일 지우기"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setNewEndDate('')
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      setNewEndDate('')
                                    }
                                  }}
                                >
                                  <FiX size={12} />
                                </DateClearBtn>
                              )}
                            </DateFieldTrigger>
                          </DateRangeRow>
                          <DatePickerModal
                            isOpen={newStartDateModalOpen}
                            onClose={() => setNewStartDateModalOpen(false)}
                            onSelect={(date) => {
                              setNewStartDate(date)
                              setNewStartDateModalOpen(false)
                            }}
                            initialDate={newStartDate || undefined}
                            maxDate={newEndDate || undefined}
                            title="시작일 선택"
                          />
                          <DatePickerModal
                            isOpen={newEndDateModalOpen}
                            onClose={() => setNewEndDateModalOpen(false)}
                            onSelect={(date) => {
                              setNewEndDate(date)
                              setNewEndDateModalOpen(false)
                            }}
                            initialDate={newEndDate || undefined}
                            minDate={newStartDate || undefined}
                            title="종료일 선택"
                          />
                        </FormField>

                        <FormField>
                          <FormFieldLabel>
                            태그 <FormFieldHint>다중 선택, 선택</FormFieldHint>
                          </FormFieldLabel>
                          <TagSelector
                            value={newTags}
                            onChange={setNewTags}
                            disabled={createMut.isPending}
                          />
                        </FormField>

                        <FormField>
                          <FormFieldLabel>
                            근거 사건{' '}
                            <FormFieldHint>
                              두 인물의 연보에서 선택, 선택
                            </FormFieldHint>
                          </FormFieldLabel>
                          <SourceSelector
                            subjectPersonId={personId}
                            relatedPersonId={newRelatedId || null}
                            value={newSourceIds}
                            onChange={setNewSourceIds}
                            disabled={createMut.isPending}
                          />
                        </FormField>

                        <FormField>
                          <FormFieldLabel>
                            메모 <FormFieldHint>선택</FormFieldHint>
                          </FormFieldLabel>
                          <NoteInput
                            id="human-rel-new-note"
                            value={newNote}
                            onChange={(event) => setNewNote(event.target.value)}
                            placeholder="기억해둘 메모를 입력하세요"
                            rows={3}
                          />
                        </FormField>

                        <CleanFormFooter>
                          <GhostButton
                            type="button"
                            onClick={closeNewPanel}
                            disabled={createMut.isPending}
                          >
                            취소
                          </GhostButton>
                          <PrimaryButton
                            type="submit"
                            disabled={createMut.isPending || !newRelatedId}
                          >
                            {createMut.isPending ? '등록 중…' : '등록'}
                          </PrimaryButton>
                      </CleanFormFooter>
                    </CleanForm>
                  </form>
                </PersonRegisterModalFormScroll>
              </PersonRegisterModalBox>
            </PersonRegisterModalOverlay>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <Root>
        <HeaderRow>
          <SectionTitle>인간관계</SectionTitle>
          <HeaderActionGroup>
            <HeaderBtn
              type="button"
              $tone="violet"
              onClick={() => setLineageOpen(true)}
              aria-label="멘토 계보 보기"
            >
              <FiBookOpen size={14} />
              계보 보기
            </HeaderBtn>
            <HeaderBtn
              type="button"
              onClick={() => openCreateModal('GENERAL')}
              aria-label="인간관계 추가"
            >
              <FiPlus size={14} />
              관계 추가
            </HeaderBtn>
          </HeaderActionGroup>
        </HeaderRow>

        <RelListStack>
          <RelGroupHead>
            <RelGroupTitle>친밀도</RelGroupTitle>
            <RelGroupCount>{generalRelationships.length}</RelGroupCount>
          </RelGroupHead>
          {generalRelationships.length === 0 ? (
            <EmptyCta
              type="button"
              onClick={() => openCreateModal('GENERAL')}
            >
              <FiPlus size={14} />
              첫 일반 관계 추가
            </EmptyCta>
          ) : (
            <RelList>
              {generalRelationships.map((rel) => renderRelationshipCard(rel))}
            </RelList>
          )}

          <RelGroupHead>
            <RelGroupTitle>멘토 · 스승–제자</RelGroupTitle>
            <RelGroupCount>{mentorRelationships.length}</RelGroupCount>
          </RelGroupHead>
          {mentorRelationships.length === 0 ? (
            <EmptyCta
              type="button"
              onClick={() => openCreateModal('MENTOR')}
            >
              <FiPlus size={14} />첫 멘토 관계 추가
            </EmptyCta>
          ) : (
            <RelList>
              {mentorRelationships.map((rel) => renderRelationshipCard(rel))}
            </RelList>
          )}
        </RelListStack>
      </Root>

      {/* 인라인 확인 다이얼로그 */}
      {confirmDialog &&
        createPortal(
          <ConfirmOverlay
            role="presentation"
            onClick={() => setConfirmDialog(null)}
          >
            <ConfirmDialog
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmMessage>{confirmDialog.message}</ConfirmMessage>
              <ConfirmActions>
                <ConfirmCancelBtn
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                >
                  취소
                </ConfirmCancelBtn>
                <ConfirmOkBtn type="button" onClick={confirmDialog.onConfirm}>
                  확인
                </ConfirmOkBtn>
              </ConfirmActions>
            </ConfirmDialog>
          </ConfirmOverlay>,
          document.body,
        )}

      {lineageOpen && (
        <MentorLineageModal
          personId={personId}
          onClose={() => setLineageOpen(false)}
        />
      )}
    </>
  )
}

/** 양극(-2..+2) 친밀도 선택기. allowClear=true면 같은 셀 재클릭으로 미설정(null). */
function AffinityBipolarPicker({
  value,
  onChange,
  allowClear,
  disabled,
}: {
  value: AffinityLevel | null
  onChange: (level: AffinityLevel | null) => void
  allowClear?: boolean
  disabled?: boolean
}) {
  const spec = value != null ? AFFINITY_SPECTRUM[value] : null

  const handleGroupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      const current = value ?? 0
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        event.preventDefault()
        onChange(Math.min(2, current + 1) as AffinityLevel)
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        event.preventDefault()
        onChange(Math.max(-2, current - 1) as AffinityLevel)
      } else if (event.key === 'Home') {
        event.preventDefault()
        onChange(-2)
      } else if (event.key === 'End') {
        event.preventDefault()
        onChange(2)
      } else if (allowClear && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault()
        onChange(null)
      }
    },
    [disabled, onChange, value, allowClear],
  )

  const renderIcon = (step: AffinityLevel, active: boolean) => {
    if (step < 0) {
      return <FaHeartBroken size={26} aria-hidden style={{ opacity: active ? 1 : 0.55 }} />
    }
    if (step > 0) {
      return <FaHeart size={26} aria-hidden style={{ opacity: active ? 1 : 0.55 }} />
    }
    return (
      <NeutralDotIcon $active={active} aria-hidden>
        ·
      </NeutralDotIcon>
    )
  }

  const isUnset = value == null
  const pickerDisabled = disabled || (allowClear && isUnset)

  return (
    <AffinityWrap>
      {allowClear && (
        <UnsetToggleRow>
          <UnsetToggleLabel>
            <UnsetToggleCheckbox
              type="checkbox"
              checked={isUnset}
              onChange={(event) => {
                if (event.target.checked) onChange(null)
                else onChange(0)
              }}
              disabled={disabled}
            />
            <span>친밀도 미설정</span>
          </UnsetToggleLabel>
        </UnsetToggleRow>
      )}
      <BipolarPanel $dimmed={pickerDisabled}>
        <HeartRow
          role="radiogroup"
          aria-disabled={pickerDisabled}
          aria-label={`친밀도 ${spec?.label ?? '미설정'}`}
          tabIndex={pickerDisabled ? -1 : 0}
          onKeyDown={handleGroupKeyDown}
        >
          {AFFINITY_LEVELS.map((step) => {
            const active = value === step
            return (
              <BipolarCell
                key={step}
                type="button"
                disabled={pickerDisabled}
                tabIndex={-1}
                $active={active}
                $polarity={step < 0 ? 'negative' : step > 0 ? 'positive' : 'neutral'}
                onClick={() => {
                  if (allowClear && active) {
                    onChange(null)
                    return
                  }
                  onChange(step)
                }}
                aria-checked={active}
                role="radio"
                aria-label={`${AFFINITY_SPECTRUM[step]?.label ?? ''} ${AFFINITY_SPECTRUM[step]?.short ?? ''}`}
              >
                {renderIcon(step, active)}
                <BipolarCellLabel>
                  {AFFINITY_SPECTRUM[step]?.short ?? ''}
                </BipolarCellLabel>
              </BipolarCell>
            )
          })}
        </HeartRow>
      </BipolarPanel>
      <AffinityCaption>
        {spec ? (
          <>
            <strong>
              {spec.label} {spec.short}
            </strong>{' '}
            {spec.detail}
          </>
        ) : (
          '친밀도 미설정 — 관계 사실만 기록됩니다.'
        )}
      </AffinityCaption>
    </AffinityWrap>
  )
}

/** 목록 카드용: 양극 5칸 점 표시. 활성 칸 하나만 강조. */
function AffinityLevelReadDots({ level }: { level: AffinityLevel }) {
  return (
    <AffinityReadDotsRow aria-hidden>
      {AFFINITY_LEVELS.map((step) => (
        <AffinityReadDot
          key={step}
          $filled={step === level}
          $polarity={step < 0 ? 'negative' : step > 0 ? 'positive' : 'neutral'}
        />
      ))}
    </AffinityReadDotsRow>
  )
}

/** 태그 다중선택 칩 */
function TagSelector({
  value,
  onChange,
  disabled,
}: {
  value: PersonRelationshipTag[]
  onChange: (next: PersonRelationshipTag[]) => void
  disabled?: boolean
}) {
  const set = useMemo(() => new Set(value), [value])
  const toggle = (tag: PersonRelationshipTag) => {
    if (set.has(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }
  return (
    <TagChipRow role="group" aria-label="관계 태그 다중 선택">
      {RELATIONSHIP_TAG_ORDER.map((tag) => {
        const meta = RELATIONSHIP_TAG_META[tag]
        const active = set.has(tag)
        return (
          <TagToggle
            key={tag}
            type="button"
            disabled={disabled}
            $active={active}
            $tone={meta.tone}
            aria-pressed={active}
            onClick={() => toggle(tag)}
          >
            {meta.label}
          </TagToggle>
        )
      })}
    </TagChipRow>
  )
}

/** 두 인물의 연보를 합쳐 다중 선택하는 근거 사건 picker */
function SourceSelector({
  subjectPersonId,
  relatedPersonId,
  value,
  onChange,
  disabled,
}: {
  subjectPersonId: string
  relatedPersonId: string | null
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}) {
  const { data: subjectEvents = [], isLoading: subjectLoading } = useQuery({
    queryKey: ['person-life-events', subjectPersonId],
    queryFn: () => listPersonLifeEvents(subjectPersonId),
    enabled: !!subjectPersonId,
    staleTime: 60_000,
  })
  const { data: relatedEvents = [], isLoading: relatedLoading } = useQuery({
    queryKey: ['person-life-events', relatedPersonId],
    queryFn: () => listPersonLifeEvents(relatedPersonId!),
    enabled: !!relatedPersonId,
    staleTime: 60_000,
  })

  const allEvents = useMemo(() => {
    const merged: Array<{
      id: string
      title: string
      personId: string
      ownerLabel: string
      startDate: string | null
    }> = []
    for (const e of subjectEvents) {
      merged.push({
        id: e.id,
        title: e.title,
        personId: e.personId,
        ownerLabel: '이 인물',
        startDate: e.startDate,
      })
    }
    for (const e of relatedEvents) {
      merged.push({
        id: e.id,
        title: e.title,
        personId: e.personId,
        ownerLabel: '상대 인물',
        startDate: e.startDate,
      })
    }
    return merged.sort((a, b) => {
      const aDate = a.startDate ?? '9999'
      const bDate = b.startDate ?? '9999'
      return aDate.localeCompare(bDate)
    })
  }, [subjectEvents, relatedEvents])

  const selected = useMemo(() => new Set(value), [value])
  const toggle = (id: string) => {
    if (selected.has(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  if (!relatedPersonId) {
    return <SourceSelectorEmpty>상대 인물을 먼저 선택하세요.</SourceSelectorEmpty>
  }
  if (subjectLoading || relatedLoading) {
    return <SourceSelectorEmpty>연보 불러오는 중…</SourceSelectorEmpty>
  }
  if (allEvents.length === 0) {
    return (
      <SourceSelectorEmpty>
        두 인물의 연보(PersonLifeEvent)에 등록된 사건이 없습니다.
      </SourceSelectorEmpty>
    )
  }
  return (
    <SourceList role="group" aria-label="근거 사건 선택">
      {allEvents.map((event) => {
        const active = selected.has(event.id)
        return (
          <SourceItem key={event.id} $active={active}>
            <SourceItemCheckbox
              type="checkbox"
              checked={active}
              disabled={disabled}
              onChange={() => toggle(event.id)}
            />
            <SourceItemBody>
              <SourceItemTitle>{event.title}</SourceItemTitle>
              <SourceItemMeta>
                <SourceItemOwner>{event.ownerLabel}</SourceItemOwner>
                {event.startDate && (
                  <SourceItemDate>
                    {formatDateDisplay(event.startDate)}
                  </SourceItemDate>
                )}
              </SourceItemMeta>
            </SourceItemBody>
          </SourceItem>
        )
      })}
    </SourceList>
  )
}

/** 카드 표시용 정렬된 태그 (긍정 → 중립 → 부정) */
function sortTags(tags: PersonRelationshipTag[]): PersonRelationshipTag[] {
  const orderIndex = new Map<PersonRelationshipTag, number>(
    RELATIONSHIP_TAG_ORDER.map((t, i) => [t, i]),
  )
  return [...tags].sort(
    (a, b) => (orderIndex.get(a) ?? 999) - (orderIndex.get(b) ?? 999),
  )
}

/** ISO 일자 → 표시 (BC는 음수 ISO 형식 `-yyyy-MM-DD`) */
function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  const isBce = iso.startsWith('-')
  const body = isBce ? iso.slice(1) : iso
  const ymd = body.slice(0, 10)
  return isBce ? `BC ${ymd}` : ymd
}

/** 두 날짜 사이 기간을 카드용 한 줄로 */
function formatRelationshipPeriod(
  start: string | null,
  end: string | null,
): string {
  if (start && end) return `${formatDateDisplay(start)} ~ ${formatDateDisplay(end)}`
  if (start) return `${formatDateDisplay(start)} ~`
  if (end) return `~ ${formatDateDisplay(end)}`
  return ''
}

/** 인물 brief → 생몰년 표시. 예: "1452 – 1519", "BC 384 – BC 322", "1888 –" */
function formatLifespan(p: {
  birthDate?: string | null
  deathDate?: string | null
}): string {
  const yearOf = (iso: string | null | undefined): string | null => {
    if (!iso) return null
    const isBce = iso.startsWith('-')
    const body = isBce ? iso.slice(1) : iso
    const year = body.slice(0, 4).replace(/^0+/, '') || '0'
    return isBce ? `BC ${year}` : year
  }
  const b = yearOf(p.birthDate ?? null)
  const d = yearOf(p.deathDate ?? null)
  if (!b && !d) return ''
  return `${b ?? '?'} – ${d ?? ''}`.trim()
}

/** 인물 중심 멘토 계보 — 위로 스승, 아래로 제자 */
function MentorLineageModal({
  personId,
  onClose,
}: {
  personId: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['mentor-lineage', personId],
    queryFn: () => getMentorLineage(personId),
    staleTime: 30_000,
  })

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const ancestors = useMemo(
    () =>
      (data?.nodes ?? [])
        .filter((n) => n.direction === 'ANCESTOR')
        .sort((a, b) => a.depth - b.depth),
    [data],
  )
  const descendants = useMemo(
    () =>
      (data?.nodes ?? [])
        .filter((n) => n.direction === 'DESCENDANT')
        .sort((a, b) => a.depth - b.depth),
    [data],
  )
  const self = data?.nodes.find((n) => n.direction === 'SELF')

  return createPortal(
    <LineageOverlay role="presentation" onClick={onClose}>
      <LineageBox
        role="dialog"
        aria-modal="true"
        aria-label="멘토 계보"
        onClick={(event) => event.stopPropagation()}
      >
        <LineageHeader>
          <LineageTitle>멘토 계보</LineageTitle>
          <PersonRegisterModalCloseBtn
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            <FiX size={20} />
          </PersonRegisterModalCloseBtn>
        </LineageHeader>
        <LineageBody>
          {isLoading && <LineageEmpty>불러오는 중…</LineageEmpty>}
          {isError && <LineageEmpty>계보를 불러오지 못했습니다.</LineageEmpty>}
          {data && (
            <>
              <LineageColumn>
                <LineageColumnTitle>
                  ↑ 스승 ({ancestors.length})
                </LineageColumnTitle>
                {ancestors.length === 0 ? (
                  <LineageEmpty>등록된 스승이 없습니다.</LineageEmpty>
                ) : (
                  <LineageList>
                    {ancestors.map((node) => (
                      <LineageNode
                        key={node.person.id}
                        depth={Math.abs(node.depth)}
                        person={node.person}
                        tone="ancestor"
                      />
                    ))}
                  </LineageList>
                )}
              </LineageColumn>
              {self && (
                <LineageSelfRow>
                  <LineageSelfBadge>이 인물</LineageSelfBadge>
                  <LineageSelfName>
                    {getPersonDisplayName(self.person)}
                  </LineageSelfName>
                  {formatLifespan(self.person) && (
                    <LineageSelfMeta>
                      {formatLifespan(self.person)}
                    </LineageSelfMeta>
                  )}
                </LineageSelfRow>
              )}
              <LineageColumn>
                <LineageColumnTitle>
                  ↓ 제자 ({descendants.length})
                </LineageColumnTitle>
                {descendants.length === 0 ? (
                  <LineageEmpty>등록된 제자가 없습니다.</LineageEmpty>
                ) : (
                  <LineageList>
                    {descendants.map((node) => (
                      <LineageNode
                        key={node.person.id}
                        depth={node.depth}
                        person={node.person}
                        tone="descendant"
                      />
                    ))}
                  </LineageList>
                )}
              </LineageColumn>
            </>
          )}
        </LineageBody>
      </LineageBox>
    </LineageOverlay>,
    document.body,
  )
}

function LineageNode({
  depth,
  person,
  tone,
}: {
  depth: number
  person: { id: string; name: string; surname: string | null; nameDisplayOrder: string | null; birthDate: string | null; deathDate: string | null }
  tone: 'ancestor' | 'descendant'
}) {
  return (
    <LineageNodeRow $tone={tone} style={{ marginLeft: `${(depth - 1) * 16}px` }}>
      <LineageNodeBullet $tone={tone}>·</LineageNodeBullet>
      <LineageNodeLink to={`/persons/${person.id}`}>
        {getPersonDisplayName(person)}
      </LineageNodeLink>
      {formatLifespan(person) && (
        <LineageNodeMeta>{formatLifespan(person)}</LineageNodeMeta>
      )}
    </LineageNodeRow>
  )
}

const Root = styled.section`
  margin-top: 0;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

/** 부모 패널의 SectionLabel과 동일 톤(11px upper, indigo) */
const SectionTitle = styled.h3`
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6366f1;
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
    border-color: ${({ theme, $ghost, $tone }) => {
      if ($ghost)
        return theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#cbd5e1'
      if ($tone === 'rose')
        return theme.mode === 'dark'
          ? 'rgba(251, 113, 133, 0.55)'
          : 'rgba(244, 63, 94, 0.5)'
      if ($tone === 'violet')
        return theme.mode === 'dark'
          ? 'rgba(167, 139, 250, 0.55)'
          : 'rgba(139, 92, 246, 0.5)'
      return theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.45)'
        : 'rgba(99, 102, 241, 0.4)'
    }};
    background: ${({ theme, $ghost, $tone }) => {
      if ($ghost)
        return theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc'
      if ($tone === 'rose')
        return theme.mode === 'dark'
          ? 'rgba(244, 63, 94, 0.14)'
          : 'rgba(255, 228, 230, 0.85)'
      if ($tone === 'violet')
        return theme.mode === 'dark'
          ? 'rgba(139, 92, 246, 0.16)'
          : 'rgba(237, 233, 254, 0.9)'
      return theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.1)'
    }};
    transform: translateY(-1px);
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


const AffinityWrap = styled.div``

const BipolarPanel = styled.div<{ $dimmed?: boolean }>`
  padding: 14px 16px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: ${({ $dimmed }) => ($dimmed ? 0.4 : 1)};
  pointer-events: ${({ $dimmed }) => ($dimmed ? 'none' : 'auto')};
  transition: opacity 0.15s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: linear-gradient(
            180deg,
            rgba(241, 245, 249, 0.7) 0%,
            rgba(255, 255, 255, 0.4) 100%
          );
          border: 1px solid rgba(148, 163, 184, 0.25);
        `}
`

const UnsetToggleRow = styled.div`
  margin-bottom: 10px;
`

const UnsetToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  user-select: none;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const UnsetToggleCheckbox = styled.input`
  width: 14px;
  height: 14px;
  accent-color: #6366f1;
  cursor: pointer;
`

const HeartRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 8px;
  border-radius: 12px;
  outline: none;
  &:focus-visible {
    box-shadow:
      0 0 0 2px #fff,
      0 0 0 4px #6366f1;
  }
`

const polarityColor = (
  polarity: 'negative' | 'neutral' | 'positive',
): { active: string; idle: string } => {
  if (polarity === 'negative') return { active: '#475569', idle: '#94a3b8' }
  if (polarity === 'positive') return { active: '#e11d48', idle: '#f9a8b9' }
  return { active: '#6366f1', idle: '#cbd5e1' }
}

const BipolarCell = styled.button<{
  $active: boolean
  $polarity: 'negative' | 'neutral' | 'positive'
}>`
  flex: 1;
  min-width: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.02em;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
  border: 1.5px solid
    ${({ $active, $polarity, theme }) => {
      if ($active) return polarityColor($polarity).active
      return theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : '#e2e8f0'
    }};
  background: ${({ $active, $polarity, theme }) => {
    if (!$active) {
      return theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff'
    }
    if ($polarity === 'negative')
      return theme.mode === 'dark'
        ? 'rgba(71,85,105,0.18)'
        : 'rgba(226,232,240,0.85)'
    if ($polarity === 'positive')
      return theme.mode === 'dark'
        ? 'rgba(244,63,94,0.16)'
        : 'rgba(255,228,230,0.85)'
    return theme.mode === 'dark'
      ? 'rgba(99,102,241,0.16)'
      : 'rgba(238,242,255,0.9)'
  }};
  color: ${({ $active, $polarity, theme }) => {
    const p = polarityColor($polarity)
    if ($active) return p.active
    return theme.mode === 'dark' ? 'rgba(248,250,252,0.55)' : p.idle
  }};
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ $polarity }) => polarityColor($polarity).active};
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`

const BipolarCellLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
`

const NeutralDotIcon = styled.span<{ $active: boolean }>`
  font-size: 26px;
  font-weight: 900;
  line-height: 0.5;
  opacity: ${({ $active }) => ($active ? 1 : 0.55)};
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`


const AffinityReadDotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`

const AffinityReadDot = styled.span<{
  $filled: boolean
  $polarity: 'negative' | 'neutral' | 'positive'
}>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $filled, $polarity, theme }) => {
    if (!$filled)
      return theme.mode === 'dark'
        ? 'rgba(248, 250, 252, 0.18)'
        : '#e2e8f0'
    return polarityColor($polarity).active
  }};
  box-shadow: ${({ $filled, $polarity }) =>
    $filled
      ? `0 0 0 1px ${polarityColor($polarity).active}33`
      : 'none'};
`

const AffinitySign = styled.span`
  display: inline-block;
  margin-left: 6px;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelMeta = styled.p`
  margin: 0 0 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DateRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const DateRangeSep = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 13px;
`

const DateFieldTrigger = styled.button<{ $hasValue: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  border-radius: 9px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.2)' : '#fff'};
  color: ${({ $hasValue, theme }) =>
    $hasValue
      ? theme.colors.text.primary
      : theme.colors.text.tertiary};
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
  > svg:first-child {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  > span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover:not(:disabled) {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.22)' : '#cbd5e1'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(238, 242, 255, 0.6)'};
  }
  &:focus-visible {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
  }
`

const DateClearBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: none;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#e2e8f0'};
  }
  &:focus-visible {
    outline: 2px solid #4f46e5;
    outline-offset: 1px;
  }
`

/* ── 상대 인물 carded trigger ───────────────────────────────────── */

const RelatedPersonTrigger = styled.button<{ $hasValue: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  border: 1px solid
    ${({ $hasValue, theme }) =>
      $hasValue
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.42)'
          : 'rgba(99,102,241,0.4)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  background: ${({ $hasValue, theme }) =>
    $hasValue
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(238, 242, 255, 0.55)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fafbfc'};
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.1s ease;
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.55)'
        : 'rgba(99,102,241,0.5)'};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.12)'
        : 'rgba(238, 242, 255, 0.85)'};
  }
  &:focus-visible {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const RelatedPersonAvatar = styled.div<{ $hasImage: boolean }>`
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $hasImage, theme }) =>
    $hasImage
      ? 'transparent'
      : theme.mode === 'dark'
        ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)'
        : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const RelatedPersonText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RelatedPersonName = styled.span<{ $placeholder?: boolean }>`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ $placeholder, theme }) =>
    $placeholder
      ? theme.colors.text.tertiary
      : theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RelatedPersonMeta = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelatedPersonCaret = styled.span`
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: inline-flex;
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
  gap: 8px;
`

/** 카드 안 카드 패턴 제거: 단순 그룹 헤더 한 줄 */
const RelGroupHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 18px 0 8px;
  &:first-child {
    margin-top: 0;
  }
`

const RelGroupTitle = styled.h4`
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RelGroupCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EmptyCta = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px;
  margin: 4px 0 8px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#d1d5db'};
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease;
  &:hover {
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.45);
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99,102,241,0.06)'
        : 'rgba(238, 242, 255, 0.6)'};
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

const RelCard = styled(motion.li)<{ $variant: 'mentor' | 'general' }>`
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

const RelAvatar = styled.div<{
  $tone: 'mentor' | 'positive' | 'negative' | 'general'
}>`
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => {
    if ($tone === 'mentor') return '#7c3aed'
    if ($tone === 'positive') return '#e11d48'
    if ($tone === 'negative') return '#475569'
    return '#64748b'
  }};
  background: ${({ $tone, theme }) => {
    const dark = theme.mode === 'dark'
    if ($tone === 'mentor')
      return dark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(237, 233, 254, 0.95)'
    if ($tone === 'positive')
      return dark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(255, 241, 242, 0.95)'
    if ($tone === 'negative')
      return dark ? 'rgba(71, 85, 105, 0.22)' : 'rgba(241, 245, 249, 0.95)'
    return dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
  }};
`

const RelName = styled.div`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const RelNameLink = styled(Link)`
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.12s ease, border-color 0.12s ease;
  &:hover {
    color: #4f46e5;
    border-bottom-color: rgba(79, 70, 229, 0.4);
  }
  &:focus-visible {
    outline: none;
    color: #4f46e5;
    border-bottom-color: #4f46e5;
  }
`

const RelBadgeGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RelBadge = styled.span<{
  $variant: 'mentor' | 'general' | 'perspective' | 'mutual'
}>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  letter-spacing: 0.01em;
  ${({ $variant, theme }) => {
    const dark = theme.mode === 'dark'
    if ($variant === 'mentor') {
      return dark
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
    }
    if ($variant === 'perspective') {
      return dark
        ? css`
            color: #fcd34d;
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.2);
          `
        : css`
            color: #b45309;
            background: rgba(255, 251, 235, 0.95);
            border: 1px solid rgba(252, 211, 77, 0.55);
          `
    }
    if ($variant === 'mutual') {
      return dark
        ? css`
            color: #86efac;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
          `
        : css`
            color: #047857;
            background: rgba(236, 253, 245, 0.95);
            border: 1px solid rgba(110, 231, 183, 0.5);
          `
    }
    return dark
      ? css`
          color: #bae6fd;
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.18);
        `
      : css`
          color: #0369a1;
          background: #f0f9ff;
          border: 1px solid rgba(125, 211, 252, 0.5);
        `
  }}
`

const TagChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
`

const tagToneColor = (
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

const TagChip = styled.span<{ $tone: 'positive' | 'negative' | 'neutral' }>`
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.01em;
  color: ${({ $tone }) => tagToneColor($tone).fg};
  background: ${({ $tone }) => tagToneColor($tone).bg};
  border: 1px solid ${({ $tone }) => tagToneColor($tone).border};
`

const TagToggle = styled.button<{
  $active: boolean
  $tone: 'positive' | 'negative' | 'neutral'
}>`
  min-width: 72px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  letter-spacing: 0.01em;
  text-align: center;
  color: ${({ $active, $tone, theme }) =>
    $active
      ? tagToneColor($tone).fg
      : theme.mode === 'dark'
        ? 'rgba(248,250,252,0.55)'
        : '#64748b'};
  background: ${({ $active, $tone, theme }) =>
    $active
      ? tagToneColor($tone).bg
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#fff'};
  border: 1px solid
    ${({ $active, $tone, theme }) =>
      $active
        ? tagToneColor($tone).border
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
  &:hover:not(:disabled) {
    border-color: ${({ $tone }) => tagToneColor($tone).border};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

/** 카드 안 친밀도: dot row + 라벨 + 부호 한 줄 */
const AffinityInline = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12.5px;
  cursor: help;
`

const AffinityInlineLabel = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const AffinityUnsetLine = styled.div`
  margin-bottom: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
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

/* ── 인라인 확인 다이얼로그 ─────────────────────────────────────── */

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const ConfirmDialog = styled.div`
  width: 100%;
  max-width: 340px;
  border-radius: 16px;
  padding: 24px 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(28, 28, 32, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.55);
        `
      : css`
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.14);
        `}
`

const ConfirmMessage = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ConfirmActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const ConfirmCancelBtn = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: ${theme.colors.text.secondary};
          &:hover { background: rgba(255, 255, 255, 0.12); }
        `
      : css`
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          &:hover { background: #e9eef5; }
        `}
`

const ConfirmOkBtn = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: #6366f1;
  color: #ffffff;
  transition: background 0.15s;
  &:hover { background: #4f46e5; }
`

/* ── 모달 폼 레이아웃 (정리된 평면형) ────────────────────────────── */

const CleanForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

/** 상단 토글: 작고 깔끔한 segmented control */
const TopTypeToggle = styled.div`
  display: inline-flex;
  align-self: stretch;
  padding: 4px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
`

const TopTypeOption = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.18)'
        : '#fff'
      : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active, theme }) =>
    $active && theme.mode !== 'dark'
      ? '0 1px 3px rgba(15,23,42,0.08)'
      : 'none'};
  transition:
    background 0.15s ease,
    color 0.15s ease;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

/** 폼 한 행: 라벨 → 컨트롤. 카드/배경 없음. */
const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FormFieldLabel = styled.label`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.secondary};
  span[aria-hidden] {
    color: #ef4444;
    font-weight: 700;
  }
`

const FormFieldHint = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CleanFormFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.07)' : '#eef2f7'};
`

/** 멘토 역할 토글 — 컴팩트 버전 */
const CompactRolePillRow = styled.div`
  display: inline-flex;
  gap: 8px;
`

const CompactRolePill = styled.label<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? 'rgba(124, 58, 237, 0.55)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  color: ${({ $active, theme }) =>
    $active ? '#5b21b6' : theme.colors.text.secondary};
  background: ${({ $active, theme }) =>
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

/* ── 시점(isMutual) 토글 ──────────────────────────────────────── */

const PerspectiveToggle = styled.div`
  display: flex;
  align-items: center;
`

const PerspectiveHint = styled.span`
  display: block;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
  font-weight: 400;
`

/* ── 근거 사건 selector ──────────────────────────────────────── */

const SourceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0,0,0,0.18)' : '#fafbfc'};
`

const SourceItem = styled.label<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.14)'
        : 'rgba(238, 242, 255, 0.85)'
      : 'transparent'};
  transition: background 0.12s ease;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.mode === 'dark'
          ? 'rgba(99,102,241,0.2)'
          : 'rgba(224, 231, 255, 0.9)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.04)'
          : '#f1f5f9'};
  }
`

const SourceItemCheckbox = styled.input`
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  accent-color: #6366f1;
  cursor: pointer;
`

const SourceItemBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const SourceItemTitle = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SourceItemMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SourceItemOwner = styled.span`
  padding: 1px 6px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  font-size: 10.5px;
  font-weight: 600;
`

const SourceItemDate = styled.span`
  font-variant-numeric: tabular-nums;
`

const SourceSelectorEmpty = styled.p`
  margin: 0;
  padding: 14px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 10px;
`

/* ── 카드: 근거 사건 chips ──────────────────────────────────── */

const SourceChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`

const SourceChipLabel = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 2px;
`

const SourceChipLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 999px;
  color: #4338ca;
  background: rgba(238, 242, 255, 0.7);
  border: 1px solid rgba(99, 102, 241, 0.25);
  text-decoration: none;
  letter-spacing: -0.01em;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    background: rgba(224, 231, 255, 0.85);
    border-color: rgba(99, 102, 241, 0.45);
  }
`

/* ── 멘토 계보 모달 ───────────────────────────────────────── */

const LineageOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const LineageBox = styled.div`
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#1c1c20' : '#ffffff'};
  border: 1px solid ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.18);
  overflow: hidden;
`

const LineageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#eef2f7'};
`

const LineageTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LineageBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const LineageColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LineageColumnTitle = styled.h4`
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const LineageEmpty = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const LineageSelfRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(99,102,241,0.14)'
      : 'rgba(238, 242, 255, 0.85)'};
  border: 1px solid rgba(99, 102, 241, 0.35);
`

const LineageSelfBadge = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 999px;
  background: #6366f1;
  color: #fff;
`

const LineageSelfName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const LineageSelfMeta = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const LineageNodeRow = styled.div<{ $tone: 'ancestor' | 'descendant' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  }
`

const LineageNodeBullet = styled.span<{ $tone: 'ancestor' | 'descendant' }>`
  font-weight: 900;
  color: ${({ $tone }) => ($tone === 'ancestor' ? '#7c3aed' : '#0d9488')};
`

const LineageNodeLink = styled(Link)`
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  &:hover {
    color: #4f46e5;
    text-decoration: underline;
  }
`

const LineageNodeMeta = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
