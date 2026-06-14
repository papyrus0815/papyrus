/**
 * 인물 상세 — 인간관계
 * 친밀도(일반)와 멘토·스승–제자를 목록·추가 진입에서 분리합니다.
 */
import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { motion } from 'framer-motion'
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
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  AFFINITY_LEVELS,
  AFFINITY_SPECTRUM,
  AFFINITY_UNKNOWN_META,
  type AffinityLevel,
  FORMALITY_SPECTRUM,
  POWER_SPECTRUM,
  type PersonHumanRelationshipItem,
  type PersonHumanRelationshipType,
  type PersonRelationshipTag,
  RELATIONSHIP_TAG_META,
  RELATIONSHIP_TAG_ORDER,
  type RelationshipPhase,
  TRUST_SPECTRUM,
  createHumanRelationship,
  createRelationshipPhase,
  deleteHumanRelationship,
  deleteRelationshipPhase,
  detectAffinityTagConflict,
  getMentorLineage,
  updateHumanRelationship,
  updateRelationshipPhase,
} from '@/shared/api/person-human-relationships'
import {
  type PersonLifeEvent,
  listPersonLifeEvents,
} from '@/shared/api/person-life-events'
import { type PersonResponseDto, getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { FormTextarea } from '@/shared/ui/form-input/form-input'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalStickyFooter,
  PersonRegisterModalTitle,
} from '@/shared/ui/register-modal-shell/register-modal-shell'
import { notify } from '@/shared/ui/toast'

type Props = {
  personId: string
  relationships: PersonHumanRelationshipItem[] | undefined
  /**
   * 인물명 링크 클릭 시 호출. 지정되면 일반 좌클릭을 가로채 부모(상세 패널)가
   * 컨텍스트(좌측 필터·목록)를 유지한 채 인물을 전환하게 한다.
   * (가족트리·계보 등 다른 인물 클릭과 동일한 동작.)
   * 미지정 시 기존처럼 `/persons/:id` 단독 페이지로 이동.
   */
  onPersonClick?: (personId: string) => void
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
  onPersonClick,
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

  /**
   * 인물 링크 좌클릭 가로채기. onPersonClick이 있으면 SPA 내비게이션 대신
   * 부모 콜백으로 인물 전환(필터/목록 컨텍스트 유지). ⌘/Ctrl/Shift+클릭이나
   * 중클릭은 그대로 둬서 "새 탭으로 단독 페이지 열기"는 유지한다.
   */
  const handlePersonLinkClick = useCallback(
    (e: MouseEvent, targetId: string) => {
      if (!onPersonClick) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      e.preventDefault()
      onPersonClick(targetId)
    },
    [onPersonClick],
  )

  // 관계 추가/수정 폼이 열릴 때만 인물 선택용 전체 목록이 필요하므로
  // 두 상태를 먼저 선언해 쿼리 enabled 게이팅에 사용한다.
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    data: persons = [],
    isLoading: personsLoading,
    isError: personsError,
  } = useQuery({
    // 동일 키로 통일해 다른 화면과 React Query 캐시 공유 (5분 fresh)
    queryKey: ['all-persons'],
    queryFn: () => getAllPersons(),
    staleTime: 5 * 60 * 1000,
    // 폼(추가/수정)이 열려 인물 선택이 필요할 때만 페칭 — 초기 마운트 시 대량 로드 방지
    enabled: createModalOpen || editingId != null,
  })

  const personsExcludingSelf = useMemo(
    () => persons.filter((person) => person.id !== personId),
    [persons, personId],
  )

  const [personModalOpen, setPersonModalOpen] = useState(false)
  // 등록/수정 폼이 공유하는 RelationshipFormFields 내부 날짜 피커의 오픈 여부.
  // (한 번에 하나의 폼만 열리므로 단일 플래그로 ESC 게이팅을 처리한다.)
  const [fieldDateModalOpen, setFieldDateModalOpen] = useState(false)

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

  // 추가 차원 (신뢰·권력·격식) — 모두 -2..+2 또는 null. 고급 토글 안에서만 노출.
  const [newTrust, setNewTrust] = useState<number | null>(null)
  const [newPower, setNewPower] = useState<number | null>(null)
  const [newFormality, setNewFormality] = useState<number | null>(null)
  const [newAdvancedOpen, setNewAdvancedOpen] = useState(false)
  const [editTrust, setEditTrust] = useState<number | null>(null)
  const [editPower, setEditPower] = useState<number | null>(null)
  const [editFormality, setEditFormality] = useState<number | null>(null)
  const [editAdvancedOpen, setEditAdvancedOpen] = useState(false)

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
      newSourceIds.length > 0 ||
      newTrust !== null ||
      newPower !== null ||
      newFormality !== null,
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
      newTrust,
      newPower,
      newFormality,
    ],
  )

  const editingRel = useMemo(
    () => (editingId ? list.find((row) => row.id === editingId) : undefined),
    [editingId, list],
  )

  const toIsoDateInput = (iso: string | null): string => {
    if (!iso) return ''
    // BC는 선행 '-'가 붙은 `-YYYY-MM-DD`(11자)라 slice(0,10)이면 끝자리가 잘린다.
    return iso.startsWith('-') ? iso.slice(0, 11) : iso.slice(0, 10)
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
    const origSources = [
      ...(editingRel.sources ?? []).map((s) => s.lifeEventId),
    ]
      .sort()
      .join(',')
    const curSources = [...editSourceIds].sort().join(',')
    if (origSources !== curSources) return true
    if ((editTrust ?? null) !== (editingRel.trustLevel ?? null)) return true
    if ((editPower ?? null) !== (editingRel.powerDynamic ?? null)) return true
    if ((editFormality ?? null) !== (editingRel.formality ?? null)) return true
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
    editTrust,
    editPower,
    editFormality,
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
    setNewTrust(null)
    setNewPower(null)
    setNewFormality(null)
    setNewAdvancedOpen(false)
  }, [])

  const createMut = useMutation({
    mutationFn: async () => {
      if (!newRelatedId) throw new Error('상대 인물을 선택하세요.')
      return createHumanRelationship(personId, {
        relatedPersonId: newRelatedId,
        relationshipType: newType,
        affinityLevel: newAffinity,
        trustLevel: newTrust,
        powerDynamic: newPower,
        formality: newFormality,
        startDate: newStartDate ? newStartDate : undefined,
        endDate: newEndDate ? newEndDate : undefined,
        note: newNote.trim() || undefined,
        subjectIsMentor: newType === 'MENTOR' ? newSubjectIsMentor : undefined,
        tags: newTags.length > 0 ? newTags : undefined,
        isMutual: newType === 'GENERAL' ? newIsMutual : undefined,
        sourceLifeEventIds: newSourceIds.length > 0 ? newSourceIds : undefined,
      })
    },
    onSuccess: () => {
      notify.success('저장했습니다.')
      setCreateModalOpen(false)
      resetNewForm()
      invalidateDetail()
    },
    onError: (error: unknown) => {
      notify.error(formatRelationshipApiError(error))
    },
  })

  const updateMut = useMutation({
    mutationFn: async (rel: RelRowModel) =>
      updateHumanRelationship(personId, rel.id, {
        relationshipType: editType,
        affinityLevel: editAffinity,
        trustLevel: editTrust,
        powerDynamic: editPower,
        formality: editFormality,
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
      notify.success('저장했습니다.')
      setEditingId(null)
      invalidateDetail()
    },
    onError: (error: unknown) => {
      notify.error(formatRelationshipApiError(error))
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (relId: string) =>
      deleteHumanRelationship(personId, relId),
    /**
     * 낙관적 삭제 — 부모 person-detail 캐시의 humanRelationships에서 즉시 제거.
     * 이 컴포넌트는 목록을 자체 쿼리가 아닌 person-detail 응답의
     * humanRelationships prop으로 받으므로 그 캐시를 직접 갱신한다.
     */
    onMutate: async (relId: string) => {
      const detailKey = ['person-detail', personId]
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData(detailKey)
      queryClient.setQueryData(detailKey, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const o = old as { humanRelationships?: PersonHumanRelationshipItem[] }
        if (!Array.isArray(o.humanRelationships)) return old
        return {
          ...o,
          humanRelationships: o.humanRelationships.filter(
            (r) => r.id !== relId,
          ),
        }
      })
      return { previous, detailKey }
    },
    onError: (error: unknown, _relId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previous)
      }
      notify.error(formatRelationshipApiError(error))
    },
    onSuccess: () => {
      notify.success('삭제했습니다.')
    },
    onSettled: () => {
      // 서버 확정 상태로 최종 동기화 (목록 화면 등 포함)
      invalidateDetail()
    },
  })

  // ── phase(시기별 스냅샷) 추가/편집 모달 상태 ──
  const [phaseModal, setPhaseModal] = useState<null | {
    relationshipId: string
    /** 편집 대상 phase id — null이면 신규 추가 */
    phaseId: string | null
    label: string
    startDate: string
    endDate: string
    affinityLevel: AffinityLevel | null
    trustLevel: number | null
    powerDynamic: number | null
    formality: number | null
    note: string
  }>(null)

  /** phase 모달 내부 날짜 피커(BC 지원) 오픈 상태 */
  const [phaseDatePicker, setPhaseDatePicker] = useState<
    'start' | 'end' | null
  >(null)

  const openPhaseModal = (
    relationshipId: string,
    existing: RelationshipPhase | null,
  ) => {
    setPhaseModal({
      relationshipId,
      phaseId: existing?.id ?? null,
      label: existing?.label ?? '',
      startDate: toIsoDateInput(existing?.startDate ?? null),
      endDate: toIsoDateInput(existing?.endDate ?? null),
      affinityLevel:
        (existing?.affinityLevel as AffinityLevel | null | undefined) ?? null,
      trustLevel: existing?.trustLevel ?? null,
      powerDynamic: existing?.powerDynamic ?? null,
      formality: existing?.formality ?? null,
      note: existing?.note ?? '',
    })
  }

  const closePhaseModal = () => {
    setPhaseModal(null)
    setPhaseDatePicker(null)
  }

  // 포커스 온 오픈은 RelModal이 자체 처리(모달 박스로 포커스 이동).

  // ESC로 phase 모달 닫기 (전역 ESC effect는 create/edit/confirm일 때만 동작하므로 별도 처리).
  useEffect(() => {
    if (!phaseModal) return
    const handler = (event: globalThis.KeyboardEvent) => {
      // 날짜 피커가 열려 있으면 ESC는 그 피커만 닫고 phase 모달은 유지.
      if (phaseDatePicker) return
      if (event.key === 'Escape') closePhaseModal()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [phaseModal, phaseDatePicker])

  const phaseSaveMut = useMutation({
    mutationFn: async () => {
      if (!phaseModal) throw new Error('phase 모달 상태 없음')
      // 날짜 유효성 — 시작 > 종료면 거부
      if (
        phaseModal.startDate &&
        phaseModal.endDate &&
        phaseModal.startDate > phaseModal.endDate
      ) {
        throw new Error('시작일이 종료일보다 늦을 수 없습니다.')
      }
      const body = {
        label: phaseModal.label.trim() || null,
        startDate: phaseModal.startDate || null,
        endDate: phaseModal.endDate || null,
        affinityLevel: phaseModal.affinityLevel,
        trustLevel: phaseModal.trustLevel,
        powerDynamic: phaseModal.powerDynamic,
        formality: phaseModal.formality,
        note: phaseModal.note.trim() || null,
      }
      if (phaseModal.phaseId) {
        return updateRelationshipPhase(
          personId,
          phaseModal.relationshipId,
          phaseModal.phaseId,
          body,
        )
      }
      return createRelationshipPhase(personId, phaseModal.relationshipId, body)
    },
    onSuccess: () => {
      notify.success('시기를 저장했습니다.')
      closePhaseModal()
      invalidateDetail()
    },
    onError: (error: unknown) => {
      notify.error(formatRelationshipApiError(error))
    },
  })

  const phaseDeleteMut = useMutation({
    mutationFn: async (args: { relationshipId: string; phaseId: string }) =>
      deleteRelationshipPhase(personId, args.relationshipId, args.phaseId),
    /**
     * 낙관적 삭제 — person-detail 캐시의 해당 관계 phases 배열에서 즉시 제거.
     * 타임라인 칩이 refetch 왕복 없이 바로 사라진다.
     */
    onMutate: async (args: { relationshipId: string; phaseId: string }) => {
      const detailKey = ['person-detail', personId]
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData(detailKey)
      queryClient.setQueryData(detailKey, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const o = old as { humanRelationships?: PersonHumanRelationshipItem[] }
        if (!Array.isArray(o.humanRelationships)) return old
        return {
          ...o,
          humanRelationships: o.humanRelationships.map((r) =>
            r.id === args.relationshipId
              ? {
                  ...r,
                  phases: (r.phases ?? []).filter((p) => p.id !== args.phaseId),
                }
              : r,
          ),
        }
      })
      return { previous, detailKey }
    },
    onError: (error: unknown, _args, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.detailKey, context.previous)
      }
      notify.error(formatRelationshipApiError(error))
    },
    onSuccess: () => {
      notify.success('시기를 삭제했습니다.')
    },
    onSettled: () => {
      invalidateDetail()
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
  const childModalOpen = personModalOpen || fieldDateModalOpen

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
    // isNewFormDirty/isEditFormDirty를 포함해야 폼 입력 후에도 effect가 재구독되어
    // 최신 closeNewPanel/cancelEdit(=최신 더티 상태 반영)를 ESC가 호출한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    createModalOpen,
    editingId,
    confirmDialog,
    childModalOpen,
    isNewFormDirty,
    isEditFormDirty,
  ])

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
    setEditTrust(rel.trustLevel ?? null)
    setEditPower(rel.powerDynamic ?? null)
    setEditFormality(rel.formality ?? null)
    // 추가 차원이 하나라도 있으면 고급 섹션 자동 펼침
    setEditAdvancedOpen(
      rel.trustLevel != null ||
        rel.powerDynamic != null ||
        rel.formality != null,
    )
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

  // ── 공유 폼(RelationshipFormFields)용 values/patch 어댑터 ──
  // 개별 useState는 그대로 두고, 단일 객체 + patch로 묶어 등록/수정이 같은 입력 UI를
  // 공유한다. type 변경은 등록=직접 set, 수정=의미변화 확인을 거치므로 patch가 아닌
  // onTypeChange로 분리한다.
  const newValues: RelationshipFormValues = {
    type: newType,
    affinity: newAffinity,
    subjectIsMentor: newSubjectIsMentor,
    isMutual: newIsMutual,
    note: newNote,
    startDate: newStartDate,
    endDate: newEndDate,
    tags: newTags,
    sourceIds: newSourceIds,
    trust: newTrust,
    power: newPower,
    formality: newFormality,
    advancedOpen: newAdvancedOpen,
  }
  const patchNew = useCallback((partial: Partial<RelationshipFormValues>) => {
    if ('affinity' in partial)
      setNewAffinity(partial.affinity as AffinityLevel | null)
    if ('subjectIsMentor' in partial)
      setNewSubjectIsMentor(!!partial.subjectIsMentor)
    if ('isMutual' in partial) setNewIsMutual(!!partial.isMutual)
    if ('note' in partial) setNewNote(partial.note ?? '')
    if ('startDate' in partial) setNewStartDate(partial.startDate ?? '')
    if ('endDate' in partial) setNewEndDate(partial.endDate ?? '')
    if ('tags' in partial) setNewTags(partial.tags ?? [])
    if ('sourceIds' in partial) setNewSourceIds(partial.sourceIds ?? [])
    if ('trust' in partial) setNewTrust(partial.trust ?? null)
    if ('power' in partial) setNewPower(partial.power ?? null)
    if ('formality' in partial) setNewFormality(partial.formality ?? null)
    if ('advancedOpen' in partial) setNewAdvancedOpen(!!partial.advancedOpen)
  }, [])

  const editValues: RelationshipFormValues = {
    type: editType,
    affinity: editAffinity,
    subjectIsMentor: editSubjectIsMentor,
    isMutual: editIsMutual,
    note: editNote,
    startDate: editStartDate,
    endDate: editEndDate,
    tags: editTags,
    sourceIds: editSourceIds,
    trust: editTrust,
    power: editPower,
    formality: editFormality,
    advancedOpen: editAdvancedOpen,
  }
  const patchEdit = useCallback((partial: Partial<RelationshipFormValues>) => {
    if ('affinity' in partial)
      setEditAffinity(partial.affinity as AffinityLevel | null)
    if ('subjectIsMentor' in partial)
      setEditSubjectIsMentor(!!partial.subjectIsMentor)
    if ('isMutual' in partial) setEditIsMutual(!!partial.isMutual)
    if ('note' in partial) setEditNote(partial.note ?? '')
    if ('startDate' in partial) setEditStartDate(partial.startDate ?? '')
    if ('endDate' in partial) setEditEndDate(partial.endDate ?? '')
    if ('tags' in partial) setEditTags(partial.tags ?? [])
    if ('sourceIds' in partial) setEditSourceIds(partial.sourceIds ?? [])
    if ('trust' in partial) setEditTrust(partial.trust ?? null)
    if ('power' in partial) setEditPower(partial.power ?? null)
    if ('formality' in partial) setEditFormality(partial.formality ?? null)
    if ('advancedOpen' in partial) setEditAdvancedOpen(!!partial.advancedOpen)
  }, [])

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
        {/* 카드 본문 — 수정 중에도 카드는 유지되고 수정 모달이 위에 뜬다 */}
        <RelCardTop>
          <RelPerson>
            <RelAvatar $tone={avatarTone}>
              {rel.otherPerson.profileImageUrl ? (
                <img
                  src={
                    getUploadImageUrl(rel.otherPerson.profileImageUrl) ||
                    rel.otherPerson.profileImageUrl
                  }
                  alt={getPersonDisplayName(rel.otherPerson)}
                />
              ) : (
                <FiUser size={20} strokeWidth={2} />
              )}
            </RelAvatar>
            <RelNameLink
              to={`/persons/${rel.otherPerson.id}`}
              onClick={(e) => handlePersonLinkClick(e, rel.otherPerson.id)}
              title="해당 인물 보기"
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
          <AffinityUnsetLine title="친밀도가 사료에서 확인되지 않거나 의도적으로 입력하지 않음. 0(중립)과는 다름.">
            <UnknownDot aria-hidden="true" /> 친밀도 기록 없음
          </AffinityUnsetLine>
        )}
        {(rel.trustLevel != null ||
          rel.powerDynamic != null ||
          rel.formality != null) && (
          <ExtraDimRow>
            {rel.trustLevel != null && (
              <ExtraDimChip
                title={`신뢰도: ${TRUST_SPECTRUM[rel.trustLevel].label}`}
              >
                신뢰 {TRUST_SPECTRUM[rel.trustLevel].short}
              </ExtraDimChip>
            )}
            {rel.powerDynamic != null && (
              <ExtraDimChip
                title={`권력 비대칭: ${POWER_SPECTRUM[rel.powerDynamic].label} (이 인물 기준)`}
              >
                권력 {POWER_SPECTRUM[rel.powerDynamic].short}
              </ExtraDimChip>
            )}
            {rel.formality != null && (
              <ExtraDimChip
                title={`격식: ${FORMALITY_SPECTRUM[rel.formality].label}`}
              >
                격식 {FORMALITY_SPECTRUM[rel.formality].short}
              </ExtraDimChip>
            )}
          </ExtraDimRow>
        )}
        {(rel.phases ?? []).length > 0 && (
          <PhaseTimeline
            phases={rel.phases ?? []}
            onEditPhase={(phase) => openPhaseModal(rel.id, phase)}
            onDeletePhase={(phase) =>
              setConfirmDialog({
                message: `"${phase.label || '시기'}"를 삭제할까요?`,
                onConfirm: () => {
                  phaseDeleteMut.mutate({
                    relationshipId: rel.id,
                    phaseId: phase.id,
                  })
                  setConfirmDialog(null)
                },
              })
            }
          />
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
        {(rel.sources ?? []).length > 0 && (
          <SourceChipRow aria-label="근거 사건">
            <SourceChipLabel>근거</SourceChipLabel>
            {(rel.sources ?? []).map((s) => (
              <SourceChipLink
                key={s.id}
                to={`/persons/${s.lifeEvent.personId}`}
                onClick={(e) => handlePersonLinkClick(e, s.lifeEvent.personId)}
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
            onClick={() => openPhaseModal(rel.id, null)}
            title="이 관계의 시기별 변화 추가"
          >
            <FiPlus size={14} />
            시기 추가
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
      </RelCard>
    )
  }

  return (
    <>
      {/* 수정 모달 — 최상위에서 editingRel로 단일 렌더 */}
      <RelModal
        open={!!editingRel}
        title="관계 수정"
        subtitle={
          editingRel ? getPersonDisplayName(editingRel.otherPerson) : undefined
        }
        onClose={cancelEdit}
        footer={
          editingRel ? (
            <>
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
                onClick={() => updateMut.mutate(editingRel)}
              >
                {updateMut.isPending ? '저장 중…' : '저장'}
              </PrimaryButton>
            </>
          ) : null
        }
      >
        {editingRel && (
          <CleanForm>
            <RelationshipFormFields
              values={editValues}
              patch={patchEdit}
              onTypeChange={requestEditTypeChange}
              subjectPersonId={personId}
              relatedPersonId={editingRel.otherPerson.id}
              disabled={updateMut.isPending}
              affinityAllowClear
              onDateModalOpenChange={setFieldDateModalOpen}
              radioName="edit-mentor-role"
              mentorLabel="스승"
              notePlaceholder="기억해둘 메모"
              noteRows={2}
            />
          </CleanForm>
        )}
      </RelModal>

      {/* 등록 모달 */}
      <RelModal
        open={createModalOpen}
        title="인간관계 등록"
        subtitle={
          selectedNewPerson
            ? getPersonDisplayName(selectedNewPerson)
            : undefined
        }
        onClose={closeNewPanel}
        labelledById="human-rel-create-title"
        footer={
          <>
            <GhostButton
              type="button"
              onClick={closeNewPanel}
              disabled={createMut.isPending}
            >
              취소
            </GhostButton>
            <PrimaryButton
              type="submit"
              form="human-rel-create-form"
              disabled={createMut.isPending || !newRelatedId}
            >
              {createMut.isPending ? '등록 중…' : '등록'}
            </PrimaryButton>
          </>
        }
      >
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
                인물 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
              </CreateModalFormAlert>
            )}
            <RelationshipFormFields
              values={newValues}
              patch={patchNew}
              onTypeChange={setNewType}
              subjectPersonId={personId}
              relatedPersonId={newRelatedId || null}
              disabled={createMut.isPending}
              affinityAllowClear={newType === 'MENTOR'}
              onDateModalOpenChange={setFieldDateModalOpen}
              radioName="new-mentor-role"
              mentorLabel="스승(멘토)"
              noteId="human-rel-new-note"
              relatedPersonSlot={
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
                          src={
                            getUploadImageUrl(
                              selectedNewPerson.profileImageUrl,
                            ) || selectedNewPerson.profileImageUrl
                          }
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
                            {/* 목록 DTO 타입에는 생몰일이 없으나 런타임 응답에는 포함될 수 있음 */}
                            {formatLifespan(
                              selectedNewPerson as {
                                birthDate?: string | null
                                deathDate?: string | null
                              },
                            ) || '생몰년 미상'}
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
              }
            />
          </CleanForm>
        </form>
      </RelModal>

      {/* 시기별 스냅샷(phase) 추가/편집 모달 */}
      <RelModal
        open={!!phaseModal}
        title={phaseModal?.phaseId ? '시기 편집' : '시기 추가'}
        subtitle={
          phaseModal
            ? (() => {
                const phaseRel = list.find(
                  (row) => row.id === phaseModal.relationshipId,
                )
                return phaseRel
                  ? getPersonDisplayName(phaseRel.otherPerson)
                  : undefined
              })()
            : undefined
        }
        onClose={closePhaseModal}
        maxWidth="min(480px, 94vw)"
        footer={
          phaseModal ? (
            <>
              <GhostButton type="button" onClick={closePhaseModal}>
                취소
              </GhostButton>
              <PrimaryButton
                type="button"
                disabled={phaseSaveMut.isPending}
                onClick={() => phaseSaveMut.mutate()}
              >
                {phaseSaveMut.isPending
                  ? '저장 중…'
                  : phaseModal.phaseId
                    ? '저장'
                    : '추가'}
              </PrimaryButton>
            </>
          ) : null
        }
      >
        {phaseModal && (
          <CleanForm>
            <FormField>
              <FormFieldLabel>
                라벨 <FormFieldHint>예: 황태자 시절</FormFieldHint>
              </FormFieldLabel>
              <PhaseTextInput
                type="text"
                value={phaseModal.label}
                onChange={(e) =>
                  setPhaseModal({ ...phaseModal, label: e.target.value })
                }
                placeholder="시기 이름"
                maxLength={120}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>기간</FormFieldLabel>
              <DateRangeRow>
                <DateFieldTrigger
                  type="button"
                  $hasValue={!!phaseModal.startDate}
                  onClick={() => setPhaseDatePicker('start')}
                  aria-label="시작일 선택"
                >
                  <FiCalendar size={14} aria-hidden />
                  <span>
                    {phaseModal.startDate
                      ? formatDateDisplay(phaseModal.startDate)
                      : '시작일'}
                  </span>
                  {phaseModal.startDate && (
                    <DateClearBtn
                      as="span"
                      role="button"
                      tabIndex={0}
                      aria-label="시작일 지우기"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPhaseModal({ ...phaseModal, startDate: '' })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setPhaseModal({ ...phaseModal, startDate: '' })
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
                  $hasValue={!!phaseModal.endDate}
                  onClick={() => setPhaseDatePicker('end')}
                  aria-label="종료일 선택"
                >
                  <FiCalendar size={14} aria-hidden />
                  <span>
                    {phaseModal.endDate
                      ? formatDateDisplay(phaseModal.endDate)
                      : '종료일'}
                  </span>
                  {phaseModal.endDate && (
                    <DateClearBtn
                      as="span"
                      role="button"
                      tabIndex={0}
                      aria-label="종료일 지우기"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPhaseModal({ ...phaseModal, endDate: '' })
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          setPhaseModal({ ...phaseModal, endDate: '' })
                        }
                      }}
                    >
                      <FiX size={12} />
                    </DateClearBtn>
                  )}
                </DateFieldTrigger>
              </DateRangeRow>
              <DatePickerModal
                isOpen={phaseDatePicker === 'start'}
                onClose={() => setPhaseDatePicker(null)}
                onSelect={(date) => {
                  setPhaseModal({ ...phaseModal, startDate: date })
                  setPhaseDatePicker(null)
                }}
                initialDate={phaseModal.startDate || undefined}
                maxDate={phaseModal.endDate || undefined}
                title="시작일 선택"
              />
              <DatePickerModal
                isOpen={phaseDatePicker === 'end'}
                onClose={() => setPhaseDatePicker(null)}
                onSelect={(date) => {
                  setPhaseModal({ ...phaseModal, endDate: date })
                  setPhaseDatePicker(null)
                }}
                initialDate={phaseModal.endDate || undefined}
                minDate={phaseModal.startDate || undefined}
                title="종료일 선택"
              />
            </FormField>
            <FormField>
              <FormFieldLabel>
                친밀도 <FormFieldHint>이 시기 동안의 친밀도</FormFieldHint>
              </FormFieldLabel>
              <AffinityBipolarPicker
                value={phaseModal.affinityLevel}
                onChange={(v) =>
                  setPhaseModal({ ...phaseModal, affinityLevel: v })
                }
                allowClear
              />
            </FormField>
            <FormField>
              <FormFieldLabel>
                신뢰도 <FormFieldHint>이 시기의 신뢰</FormFieldHint>
              </FormFieldLabel>
              <DimensionBipolarPicker
                value={phaseModal.trustLevel}
                spectrum={TRUST_SPECTRUM}
                unsetLabel="신뢰도 미설정"
                onChange={(v) =>
                  setPhaseModal({ ...phaseModal, trustLevel: v })
                }
              />
            </FormField>
            <FormField>
              <FormFieldLabel>
                권력 관계 <FormFieldHint>이 인물 기준 우위/종속</FormFieldHint>
              </FormFieldLabel>
              <DimensionBipolarPicker
                value={phaseModal.powerDynamic}
                spectrum={POWER_SPECTRUM}
                unsetLabel="권력 관계 미설정"
                onChange={(v) =>
                  setPhaseModal({ ...phaseModal, powerDynamic: v })
                }
              />
            </FormField>
            <FormField>
              <FormFieldLabel>
                격식 <FormFieldHint>격의없음/예의·의전</FormFieldHint>
              </FormFieldLabel>
              <DimensionBipolarPicker
                value={phaseModal.formality}
                spectrum={FORMALITY_SPECTRUM}
                unsetLabel="격식 미설정"
                onChange={(v) => setPhaseModal({ ...phaseModal, formality: v })}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>메모</FormFieldLabel>
              <PhaseTextarea
                rows={3}
                value={phaseModal.note}
                onChange={(e) =>
                  setPhaseModal({ ...phaseModal, note: e.target.value })
                }
                placeholder="이 시기에 대한 추가 설명 (선택)"
              />
            </FormField>
          </CleanForm>
        )}
      </RelModal>

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
            <EmptyCta type="button" onClick={() => openCreateModal('GENERAL')}>
              <FiPlus size={14} />첫 일반 관계 추가
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
            <EmptyCta type="button" onClick={() => openCreateModal('MENTOR')}>
              <FiPlus size={14} />첫 멘토 관계 추가
            </EmptyCta>
          ) : (
            <RelList>
              {mentorRelationships.map((rel) => renderRelationshipCard(rel))}
            </RelList>
          )}
        </RelListStack>
      </Root>

      {/* 인라인 확인 다이얼로그 — 등록/수정 모달과 동일 스킨(컴팩트) */}
      <RegisterModal
        isOpen={!!confirmDialog}
        onClose={() => setConfirmDialog(null)}
        closeOnEsc={false}
        trapFocus={false}
        maxWidth="min(360px, 92vw)"
        minHeight="auto"
      >
        <ConfirmBody>
          <ConfirmMessage>{confirmDialog?.message}</ConfirmMessage>
          <ConfirmActions>
            <GhostButton type="button" onClick={() => setConfirmDialog(null)}>
              취소
            </GhostButton>
            <PrimaryButton type="button" onClick={confirmDialog?.onConfirm}>
              확인
            </PrimaryButton>
          </ConfirmActions>
        </ConfirmBody>
      </RegisterModal>

      {lineageOpen && (
        <MentorLineageModal
          personId={personId}
          onClose={() => setLineageOpen(false)}
          onPersonClick={onPersonClick}
        />
      )}
    </>
  )
}

/**
 * 인간관계 섹션 공용 모달 셸 — 등록/수정/시기 모달이 동일한 오버레이·라운드·그림자·
 * 등장 모션·헤더 타이포·스티키 푸터를 공유한다(register-modal-shell 위에 구축).
 * 액션 버튼은 스크롤 밖 하단 고정(footer)이라 긴 폼에서도 항상 보인다.
 */
function RelModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'min(560px, 94vw)',
  labelledById,
}: {
  open: boolean
  title: string
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
  labelledById?: string
}) {
  return (
    <RegisterModal
      isOpen={open}
      onClose={onClose}
      closeOnEsc={false}
      trapFocus={false}
      maxWidth={maxWidth}
      minHeight="auto"
      ariaLabelledBy={labelledById}
      header={
        <PersonRegisterModalHeader>
          <RelModalTitleCol>
            <PersonRegisterModalTitle id={labelledById}>
              {title}
            </PersonRegisterModalTitle>
            {subtitle ? <RelModalSubtitle>{subtitle}</RelModalSubtitle> : null}
          </RelModalTitleCol>
          <PersonRegisterModalCloseBtn
            type="button"
            aria-label="닫기"
            onClick={onClose}
          >
            <FiX size={20} />
          </PersonRegisterModalCloseBtn>
        </PersonRegisterModalHeader>
      }
    >
      <PersonRegisterModalFormScroll>{children}</PersonRegisterModalFormScroll>
      {footer ? (
        <PersonRegisterModalStickyFooter style={{ justifyContent: 'flex-end' }}>
          {footer}
        </PersonRegisterModalStickyFooter>
      ) : null}
    </RegisterModal>
  )
}

/** 등록·수정 폼이 공유하는 관계 입력값 묶음 */
type RelationshipFormValues = {
  type: PersonHumanRelationshipType
  affinity: AffinityLevel | null
  subjectIsMentor: boolean
  isMutual: boolean
  note: string
  startDate: string
  endDate: string
  tags: PersonRelationshipTag[]
  sourceIds: string[]
  trust: number | null
  power: number | null
  formality: number | null
  advancedOpen: boolean
}

/**
 * 등록·수정 공유 폼 본문.
 * 관계 종류 토글 → (상대 인물 슬롯) → 역할/시점 → 친밀도 → 기간 → 태그 →
 * 고급 차원 → 근거 사건 → 메모. 값은 단일 `values` + `patch`로 주고받아 두 폼이
 * 동일 입력 UI를 공유한다(필드 추가/수정 시 한쪽만 고쳐지는 불일치 방지).
 *
 * 종류 변경은 등록=직접 set, 수정=의미변화 확인을 거치므로 `patch`가 아닌
 * `onTypeChange`로 분리한다. 내부 날짜 피커 오픈 상태는 자체 관리하되 부모 ESC
 * 게이팅을 위해 `onDateModalOpenChange`로 통지한다.
 */
function RelationshipFormFields({
  values,
  patch,
  onTypeChange,
  subjectPersonId,
  relatedPersonId,
  disabled = false,
  affinityAllowClear,
  relatedPersonSlot,
  onDateModalOpenChange,
  radioName,
  mentorLabel,
  noteId,
  noteRows = 3,
  notePlaceholder = '기억해둘 메모를 입력하세요',
}: {
  values: RelationshipFormValues
  patch: (partial: Partial<RelationshipFormValues>) => void
  onTypeChange: (next: PersonHumanRelationshipType) => void
  subjectPersonId: string
  relatedPersonId: string | null
  disabled?: boolean
  affinityAllowClear: boolean
  relatedPersonSlot?: ReactNode
  onDateModalOpenChange?: (open: boolean) => void
  radioName: string
  mentorLabel: string
  noteId?: string
  noteRows?: number
  notePlaceholder?: string
}) {
  const [dateModal, setDateModal] = useState<'start' | 'end' | null>(null)
  useEffect(() => {
    onDateModalOpenChange?.(dateModal !== null)
  }, [dateModal, onDateModalOpenChange])
  // 폼 언마운트(닫힘) 시 부모의 날짜 모달 플래그가 true로 고착되지 않도록 정리.
  useEffect(() => () => onDateModalOpenChange?.(false), [onDateModalOpenChange])

  const conflict = detectAffinityTagConflict(values.affinity, values.tags)

  return (
    <>
      <TopTypeToggle
        role="radiogroup"
        aria-label="관계 종류"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            event.preventDefault()
            onTypeChange('MENTOR')
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            event.preventDefault()
            onTypeChange('GENERAL')
          }
        }}
      >
        <TopTypeOption
          type="button"
          role="radio"
          aria-checked={values.type === 'GENERAL'}
          tabIndex={values.type === 'GENERAL' ? 0 : -1}
          $active={values.type === 'GENERAL'}
          onClick={() => onTypeChange('GENERAL')}
        >
          일반 관계
        </TopTypeOption>
        <TopTypeOption
          type="button"
          role="radio"
          aria-checked={values.type === 'MENTOR'}
          tabIndex={values.type === 'MENTOR' ? 0 : -1}
          $active={values.type === 'MENTOR'}
          onClick={() => onTypeChange('MENTOR')}
        >
          멘토 · 스승–제자
        </TopTypeOption>
      </TopTypeToggle>

      {relatedPersonSlot}

      {values.type === 'MENTOR' && (
        <FormField>
          <FormFieldLabel>이 인물의 역할</FormFieldLabel>
          <CompactRolePillRow>
            <CompactRolePill $active={values.subjectIsMentor}>
              <HiddenRadio
                name={radioName}
                checked={values.subjectIsMentor}
                onChange={() => patch({ subjectIsMentor: true })}
              />
              {mentorLabel}
            </CompactRolePill>
            <CompactRolePill $active={!values.subjectIsMentor}>
              <HiddenRadio
                name={radioName}
                checked={!values.subjectIsMentor}
                onChange={() => patch({ subjectIsMentor: false })}
              />
              제자
            </CompactRolePill>
          </CompactRolePillRow>
        </FormField>
      )}

      {values.type === 'GENERAL' && (
        <FormField>
          <FormFieldLabel>시점</FormFieldLabel>
          <PerspectiveToggle>
            <UnsetToggleLabel>
              <UnsetToggleCheckbox
                type="checkbox"
                checked={values.isMutual}
                onChange={(event) => patch({ isMutual: event.target.checked })}
                disabled={disabled}
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
            {values.type === 'MENTOR'
              ? '선택 — 미설정 가능'
              : '−2 적대 ~ +2 우호'}
          </FormFieldHint>
        </FormFieldLabel>
        <AffinityBipolarPicker
          value={values.affinity}
          onChange={(level) => patch({ affinity: level })}
          allowClear={affinityAllowClear}
          disabled={disabled}
        />
      </FormField>

      <FormField>
        <FormFieldLabel>
          관계 기간 <FormFieldHint>선택</FormFieldHint>
        </FormFieldLabel>
        <DateRangeRow>
          <DateFieldTrigger
            type="button"
            $hasValue={!!values.startDate}
            onClick={() => setDateModal('start')}
            aria-label="시작일 선택"
          >
            <FiCalendar size={14} aria-hidden />
            <span>
              {values.startDate
                ? formatDateDisplay(values.startDate)
                : '시작일'}
            </span>
            {values.startDate && (
              <DateClearBtn
                as="span"
                role="button"
                tabIndex={0}
                aria-label="시작일 지우기"
                onClick={(event) => {
                  event.stopPropagation()
                  patch({ startDate: '' })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    patch({ startDate: '' })
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
            $hasValue={!!values.endDate}
            onClick={() => setDateModal('end')}
            aria-label="종료일 선택"
          >
            <FiCalendar size={14} aria-hidden />
            <span>
              {values.endDate ? formatDateDisplay(values.endDate) : '종료일'}
            </span>
            {values.endDate && (
              <DateClearBtn
                as="span"
                role="button"
                tabIndex={0}
                aria-label="종료일 지우기"
                onClick={(event) => {
                  event.stopPropagation()
                  patch({ endDate: '' })
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    patch({ endDate: '' })
                  }
                }}
              >
                <FiX size={12} />
              </DateClearBtn>
            )}
          </DateFieldTrigger>
        </DateRangeRow>
        <DatePickerModal
          isOpen={dateModal === 'start'}
          onClose={() => setDateModal(null)}
          onSelect={(date) => {
            patch({ startDate: date })
            setDateModal(null)
          }}
          initialDate={values.startDate || undefined}
          maxDate={values.endDate || undefined}
          title="시작일 선택"
        />
        <DatePickerModal
          isOpen={dateModal === 'end'}
          onClose={() => setDateModal(null)}
          onSelect={(date) => {
            patch({ endDate: date })
            setDateModal(null)
          }}
          initialDate={values.endDate || undefined}
          minDate={values.startDate || undefined}
          title="종료일 선택"
        />
      </FormField>

      <FormField>
        <FormFieldLabel>
          태그 <FormFieldHint>다중 선택, 선택</FormFieldHint>
        </FormFieldLabel>
        <TagSelector
          value={values.tags}
          onChange={(tags) => patch({ tags })}
          disabled={disabled}
        />
        {conflict ? (
          <ConflictWarning role="status" aria-live="polite">
            ⚠ {conflict}
          </ConflictWarning>
        ) : null}
      </FormField>

      {/* 고급 — 추가 차원 (신뢰·권력·격식) */}
      <AdvancedToggleBtn
        type="button"
        onClick={() => patch({ advancedOpen: !values.advancedOpen })}
        aria-expanded={values.advancedOpen}
      >
        {values.advancedOpen
          ? '− 고급 차원 접기'
          : '+ 고급 차원 (신뢰·권력·격식)'}
      </AdvancedToggleBtn>
      {values.advancedOpen && (
        <AdvancedGroup>
          <FormField>
            <FormFieldLabel>
              신뢰도 <FormFieldHint>친밀도와 분리. 미설정 가능</FormFieldHint>
            </FormFieldLabel>
            <DimensionBipolarPicker
              value={values.trust}
              onChange={(trust) => patch({ trust })}
              spectrum={TRUST_SPECTRUM}
              unsetLabel="신뢰도 미설정"
              disabled={disabled}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>
              권력 비대칭{' '}
              <FormFieldHint>
                이 인물 기준 — 음수: 종속, 0: 대등, 양수: 우위
              </FormFieldHint>
            </FormFieldLabel>
            <DimensionBipolarPicker
              value={values.power}
              onChange={(power) => patch({ power })}
              spectrum={POWER_SPECTRUM}
              unsetLabel="권력 비대칭 미설정"
              disabled={disabled}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>
              격식{' '}
              <FormFieldHint>음수: 격의없음, 양수: 격식·예의</FormFieldHint>
            </FormFieldLabel>
            <DimensionBipolarPicker
              value={values.formality}
              onChange={(formality) => patch({ formality })}
              spectrum={FORMALITY_SPECTRUM}
              unsetLabel="격식 미설정"
              disabled={disabled}
            />
          </FormField>
        </AdvancedGroup>
      )}

      <FormField>
        <FormFieldLabel>
          근거 사건 <FormFieldHint>두 인물의 연보에서 선택</FormFieldHint>
        </FormFieldLabel>
        <SourceSelector
          subjectPersonId={subjectPersonId}
          relatedPersonId={relatedPersonId}
          value={values.sourceIds}
          onChange={(sourceIds) => patch({ sourceIds })}
          disabled={disabled}
        />
      </FormField>

      <FormField>
        <FormFieldLabel>
          메모 <FormFieldHint>선택</FormFieldHint>
        </FormFieldLabel>
        <NoteInput
          id={noteId}
          value={values.note}
          onChange={(event) => patch({ note: event.target.value })}
          placeholder={notePlaceholder}
          rows={noteRows}
        />
      </FormField>
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
      } else if (
        allowClear &&
        (event.key === 'Backspace' || event.key === 'Delete')
      ) {
        event.preventDefault()
        onChange(null)
      }
    },
    [disabled, onChange, value, allowClear],
  )

  const renderIcon = (step: AffinityLevel, active: boolean) => {
    if (step < 0) {
      return (
        <FaHeartBroken
          size={26}
          aria-hidden
          style={{ opacity: active ? 1 : 0.55 }}
        />
      )
    }
    if (step > 0) {
      return (
        <FaHeart size={26} aria-hidden style={{ opacity: active ? 1 : 0.55 }} />
      )
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
                $polarity={
                  step < 0 ? 'negative' : step > 0 ? 'positive' : 'neutral'
                }
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
    return (
      <SourceSelectorEmpty>상대 인물을 먼저 선택하세요.</SourceSelectorEmpty>
    )
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
  if (start && end)
    return `${formatDateDisplay(start)} ~ ${formatDateDisplay(end)}`
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
  onPersonClick,
}: {
  personId: string
  onClose: () => void
  onPersonClick?: (personId: string) => void
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
  // 포커스 온 오픈은 RelModal이 자체 처리.

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

  return (
    <RelModal
      open
      onClose={onClose}
      title="멘토 계보"
      maxWidth="min(640px, 94vw)"
    >
      <CleanForm>
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
                      onPersonClick={onPersonClick}
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
                      onPersonClick={onPersonClick}
                    />
                  ))}
                </LineageList>
              )}
            </LineageColumn>
          </>
        )}
      </CleanForm>
    </RelModal>
  )
}

function LineageNode({
  depth,
  person,
  tone,
  onPersonClick,
}: {
  depth: number
  person: {
    id: string
    name: string
    surname: string | null
    nameDisplayOrder: string | null
    birthDate: string | null
    deathDate: string | null
  }
  tone: 'ancestor' | 'descendant'
  onPersonClick?: (personId: string) => void
}) {
  return (
    <LineageNodeRow
      $tone={tone}
      style={{ marginLeft: `${(depth - 1) * 16}px` }}
    >
      <LineageNodeBullet $tone={tone}>·</LineageNodeBullet>
      <LineageNodeLink
        to={`/persons/${person.id}`}
        onClick={(e) => {
          // onPersonClick이 있으면 일반 좌클릭을 가로채 컨텍스트(필터·패널) 유지.
          // ⌘/Ctrl/Shift+클릭·중클릭은 그대로 둬서 새 탭 열기는 유지.
          if (!onPersonClick) return
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          onPersonClick(person.id)
        }}
      >
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
      return theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
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
      return theme.mode === 'dark' ? 'rgba(248, 250, 252, 0.18)' : '#e2e8f0'
    return polarityColor($polarity).active
  }};
  box-shadow: ${({ $filled, $polarity }) =>
    $filled ? `0 0 0 1px ${polarityColor($polarity).active}33` : 'none'};
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
    $hasValue ? theme.colors.text.primary : theme.colors.text.tertiary};
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
  transition:
    background 0.12s ease,
    color 0.12s ease;
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
      theme.mode === 'dark' ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.5)'};
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
    $placeholder ? theme.colors.text.tertiary : theme.colors.text.primary};
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
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

/** 평면 톤 강조 버튼 — 그라데이션·글로우 없이 토큰 색만 사용해 모달 전반과 정합 */
const PrimaryButton = styled.button`
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  background: ${({ theme }) => theme.colors.button.primary};
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.button.hover};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
  &:hover {
    box-shadow: ${({ theme }) =>
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
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
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
  transition:
    color 0.12s ease,
    border-color 0.12s ease;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

/** "+ 고급 차원" 토글 버튼 — 인라인 텍스트 스타일 */
const AdvancedToggleBtn = styled.button`
  align-self: flex-start;
  background: transparent;
  border: none;
  padding: 4px 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

/** 고급 차원(신뢰·권력·격식) — 토글 아래 들여쓴 서브 패널로 묶어 위계 표현 */
const AdvancedGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 0 4px 14px;
  border-left: 2px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.22)'};
`

/** 태그-친밀도 충돌 시 비차단 노란 박스 경고 */
const ConflictWarning = styled.div`
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11.5px;
  font-weight: 500;
  line-height: 1.45;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  letter-spacing: -0.005em;
`

/** NULL(미설정) 전용 점선 도트 — 0(중립)의 회색 fill 도트와 시각적으로 구분 */
const UnknownDot = styled.span`
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.35)' : '#cbd5e1'};
  background: transparent;
`

/** 추가 차원 (신뢰·권력·격식) 표시 row */
const ExtraDimRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 8px;
`

const ExtraDimChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(199,210,254,0.85)' : '#475569'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.06)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(99,102,241,0.15)'};
`

/** 추가 차원(신뢰·권력·격식) 5단계 picker — 친밀도와 같은 -2..+2이지만 별도 라벨/심볼 */
function DimensionBipolarPicker({
  value,
  onChange,
  spectrum,
  unsetLabel,
  disabled,
}: {
  value: number | null
  onChange: (v: number | null) => void
  spectrum: Record<number, { short: string; label: string }>
  unsetLabel: string
  disabled?: boolean
}) {
  const isUnset = value == null
  return (
    <DimPickerWrap>
      <DimUnsetRow>
        <DimUnsetLabel>
          <input
            type="checkbox"
            checked={isUnset}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? null : 0)}
          />
          <span>{unsetLabel}</span>
        </DimUnsetLabel>
      </DimUnsetRow>
      {!isUnset && (
        <DimSegmented role="radiogroup">
          {[-2, -1, 0, 1, 2].map((s) => {
            const active = value === s
            return (
              <DimSegmentedBtn
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                $active={active}
                disabled={disabled}
                title={spectrum[s].label}
                onClick={() => onChange(s)}
              >
                <DimShort>{spectrum[s].short}</DimShort>
                <DimLabel>{spectrum[s].label}</DimLabel>
              </DimSegmentedBtn>
            )
          })}
        </DimSegmented>
      )}
    </DimPickerWrap>
  )
}

const DimPickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const DimUnsetRow = styled.div`
  display: flex;
`

const DimUnsetLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

const DimSegmented = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`

const DimSegmentedBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active
        ? 'rgba(99,102,241,0.55)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'};
  background: ${({ theme, $active }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.16)'
        : 'rgba(99,102,241,0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.03)'
        : '#fff'};
  color: ${({ theme, $active }) =>
    $active ? '#4f46e5' : theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  &:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.4);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const DimShort = styled.span`
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
`

const DimLabel = styled.span`
  font-size: 10.5px;
  font-weight: 500;
`

/** phase 미니 타임라인 — 시기별 친밀도 변화 가로형. 칩 클릭=편집, X=삭제. */
function PhaseTimeline({
  phases,
  onEditPhase,
  onDeletePhase,
}: {
  phases: RelationshipPhase[]
  onEditPhase?: (phase: RelationshipPhase) => void
  onDeletePhase?: (phase: RelationshipPhase) => void
}) {
  if (phases.length === 0) return null
  // 시간순 — startDate 오름차순(없으면 뒤로). 동률은 endDate로 보조 정렬.
  const sortedPhases = [...phases].sort((a, b) => {
    const sa = a.startDate ? new Date(a.startDate).getTime() : Infinity
    const sb = b.startDate ? new Date(b.startDate).getTime() : Infinity
    if (sa !== sb) return sa - sb
    const ea = a.endDate ? new Date(a.endDate).getTime() : Infinity
    const eb = b.endDate ? new Date(b.endDate).getTime() : Infinity
    return ea - eb
  })
  return (
    <PhaseTimelineRoot>
      <PhaseTimelineLabel>시기별 변화</PhaseTimelineLabel>
      <PhaseTimelineRow>
        {sortedPhases.map((p) => {
          const aff = p.affinityLevel
          const tone =
            aff == null
              ? 'unknown'
              : aff > 0
                ? 'positive'
                : aff < 0
                  ? 'negative'
                  : 'neutral'
          const period =
            p.startDate || p.endDate
              ? `${p.startDate ? new Date(p.startDate).getFullYear() : '?'}–${p.endDate ? new Date(p.endDate).getFullYear() : '현재'}`
              : ''
          return (
            <PhasePill
              key={p.id}
              $tone={tone}
              title={[
                p.label,
                period,
                `친밀 ${aff != null ? AFFINITY_SPECTRUM[aff].label : '기록 없음'}`,
                p.trustLevel != null
                  ? `신뢰 ${TRUST_SPECTRUM[p.trustLevel].label}`
                  : null,
                p.powerDynamic != null
                  ? `권력 ${POWER_SPECTRUM[p.powerDynamic].label}`
                  : null,
                p.formality != null
                  ? `격식 ${FORMALITY_SPECTRUM[p.formality].label}`
                  : null,
                p.note,
              ]
                .filter(Boolean)
                .join(' · ')}
              as={onEditPhase ? 'button' : 'span'}
              type={onEditPhase ? 'button' : undefined}
              onClick={onEditPhase ? () => onEditPhase(p) : undefined}
              $clickable={!!onEditPhase}
            >
              <PhaseAffShort>
                {aff != null
                  ? AFFINITY_SPECTRUM[aff].short
                  : AFFINITY_UNKNOWN_META.short}
              </PhaseAffShort>
              {(p.trustLevel != null ||
                p.powerDynamic != null ||
                p.formality != null) && (
                <PhaseDimShort>
                  {p.trustLevel != null && (
                    <span>신{TRUST_SPECTRUM[p.trustLevel].short}</span>
                  )}
                  {p.powerDynamic != null && (
                    <span>권{POWER_SPECTRUM[p.powerDynamic].short}</span>
                  )}
                  {p.formality != null && (
                    <span>격{FORMALITY_SPECTRUM[p.formality].short}</span>
                  )}
                </PhaseDimShort>
              )}
              <PhaseLabel>{p.label || period || '시기'}</PhaseLabel>
              {onDeletePhase && (
                <PhaseDeleteX
                  as="span"
                  role="button"
                  tabIndex={0}
                  aria-label="시기 삭제"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeletePhase(p)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onDeletePhase(p)
                    }
                  }}
                >
                  ×
                </PhaseDeleteX>
              )}
            </PhasePill>
          )
        })}
      </PhaseTimelineRow>
    </PhaseTimelineRoot>
  )
}

const PhaseTimelineRoot = styled.div`
  margin: 4px 0 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.025)'};
`

const PhaseTimelineLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: 6px;
`

const PhaseTimelineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PhasePill = styled.span<{
  $tone: 'positive' | 'negative' | 'neutral' | 'unknown'
  $clickable?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: -0.005em;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.1s;
  ${({ $clickable }) =>
    $clickable &&
    css`
      &:hover {
        filter: brightness(0.96);
      }
      &:active {
        transform: translateY(1px);
      }
    `}
  ${({ $tone, theme }) => {
    if ($tone === 'positive') {
      return css`
        background: rgba(99, 102, 241, 0.1);
        color: #4f46e5;
        border: 1px solid rgba(99, 102, 241, 0.3);
      `
    }
    if ($tone === 'negative') {
      return css`
        background: rgba(239, 68, 68, 0.08);
        color: #b91c1c;
        border: 1px solid rgba(239, 68, 68, 0.32);
      `
    }
    if ($tone === 'unknown') {
      return css`
        background: transparent;
        color: ${theme.colors.text.tertiary};
        border: 1px dashed
          ${theme.mode === 'dark'
            ? 'rgba(255,255,255,0.18)'
            : 'rgba(15,23,42,0.18)'};
      `
    }
    return css`
      background: ${theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(15,23,42,0.04)'};
      color: ${theme.colors.text.secondary};
      border: 1px solid
        ${theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(15,23,42,0.08)'};
    `
  }}
`

const PhaseAffShort = styled.span`
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
`

/** 칩 본문의 신뢰·권력·격식 보조 표시 — affinity와 구분되게 옅게. */
const PhaseDimShort = styled.span`
  display: inline-flex;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.65;
  font-variant-numeric: tabular-nums;
`

const PhaseLabel = styled.span`
  font-size: 11px;
`

const PhaseDeleteX = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
  margin-left: 2px;
  opacity: 0.5;
  cursor: pointer;
  transition:
    opacity 0.15s,
    background 0.15s;
  &:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.18);
    color: #b91c1c;
  }
`

/* 인간관계 수정 모달 — 카드의 인라인 편집을 모달로 승격 */
const PhaseTextInput = styled.input`
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13.5px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`

const PhaseTextarea = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
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

const ConfirmBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px 22px 18px;
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

/* ── 공용 모달 셸(RelModal) 헤더 ─────────────────────────────────── */

const RelModalTitleCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const RelModalSubtitle = styled.span`
  font-size: 12px;
  letter-spacing: -0.005em;
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
