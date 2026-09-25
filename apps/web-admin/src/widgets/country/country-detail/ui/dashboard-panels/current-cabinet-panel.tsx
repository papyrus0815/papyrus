import React, { useEffect, useMemo, useRef, useState } from 'react'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import styled, { css } from 'styled-components'

import { administrationDepartmentApi } from '@/shared/api/administration-department'
import {
  createElectionCandidacy,
  getElection,
  getElections,
} from '@/shared/api/election'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { Modal, ModalBody } from '@/shared/ui/modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import type {
  DepartmentFrameItem,
  DepartmentNameFrame,
} from '@/shared/lib/ministry-department/department-name-frames'
import {
  DEPARTMENT_NAME_FRAMES,
  getDepartmentNameFrame,
  inferDepartmentFrameId,
  suggestFrameItems,
} from '@/shared/lib/ministry-department/department-name-frames'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiX,
} from 'react-icons/fi'

import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import type { CabinetMember } from './cabinet-member.types'
import { CabinetMindMap } from './cabinet-mind-map'

interface Props {
  countryId: string
  onOpen: () => void
  /** 선거 지면으로 — 모달의 '자세히'에서 쓴다 */
  onOpenElections: () => void
  /** 모달의 '전체 보기'에서 인물 지면으로 나갈 때 */
  onSelectPerson: (personId: string) => void
  /**
   * 같은 묶음에 함께 놓을 것(선거 카드 등). 연결된 선거 id를 넘겨 주므로 자식이
   * 중복 표시를 스스로 걸러낼 수 있다.
   */
  children?: React.ReactNode | ((linkedElectionId: string | null) => React.ReactNode)
}

/** 마인드맵과 공유하는 자리 타입 — 정의는 cabinet-member.types.ts */
type Member = CabinetMember

interface TenureRow {
  id: string
  personId?: string | null
  positionType?: string | null
  positionDefinition?: { positionType?: string | null; title?: string | null } | null
  title?: string | null
  termNumber?: number | null
  startDate?: string | null
  endDate?: string | null
  person?: {
    name: string
    surname?: string | null
    middleName?: string | null
    nameDisplayOrder?: string | null
    profileImageUrl?: string | null
    country?: { defaultNameDisplayOrder?: string | null; isoCode?: string | null } | null
  } | null
}

const ELECTION_TYPE_LABEL: Record<string, string> = {
  PRESIDENTIAL_OR_HEAD: '대통령·수반 직선',
  PARLIAMENTARY_CONSTITUENCY: '의회 지역구',
  PARLIAMENTARY_PROPORTIONAL: '의회 비례대표',
  LOCAL: '지방선거',
  BY_ELECTION: '보궐·중간선거',
  PRIMARY: '경선·예비선거',
  REFERENDUM_OR_PLEBISCITE: '국민투표',
  OTHER: '기타',
}

const ELECTION_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '예정',
  IN_PROGRESS: '진행 중',
  FINALIZED: '확정',
  CANCELLED: '취소',
}

const HEAD_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

const shortDate = (iso: string | null) => {
  if (!iso) return ''
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!matched) return ''
  return `${matched[1]}.${Number(matched[2])}.${Number(matched[3])}`
}

/** '1년 7개월째' — 취임 이후 얼마나 됐는지 */
function elapsedText(iso: string | null): string | null {
  if (!iso) return null
  const start = new Date(iso)
  if (Number.isNaN(start.getTime())) return null
  const now = new Date()
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  if (months < 1) return '취임'
  const years = Math.floor(months / 12)
  const rest = months % 12
  if (years === 0) return `${rest}개월째`
  return rest === 0 ? `${years}년째` : `${years}년 ${rest}개월째`
}

/**
 * 현 정부 명단 — 지금 이 나라를 누가 어느 자리에서 맡고 있는지.
 *
 * 예전 '현 정부' 카드는 '18명 각료'라는 **숫자와 정당 막대**만 보여줬다. 정작 누가 국무장관
 * 인지는 행정조직 탭까지 들어가야 알 수 있었다. "한눈에"의 뜻은 사람과 자리다.
 *
 * 임기 중 교체된 자리는 표시한다. 실측(트럼프 2기)만 해도 법무·노동·국토안보 세 자리가
 * 이미 바뀌었는데, 현재 명단만 보면 그 사실이 통째로 사라진다.
 */
export function CurrentCabinetPanel({
  countryId,
  onOpen,
  onOpenElections,
  onSelectPerson,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  /* 빈 국가에서 부처 프리셋 칩은 접어 둔다 — 펼침은 이 자리에서만 쓴다 */
  /*
   * 이름을 누르면 인물 지면으로 나가 버리면 지금 보던 정부 명단을 잃는다. 대시보드는
   * 훑는 지면이라 자리를 지킨 채 확인할 수 있어야 한다 — 사건 상세·행정부 상세가 쓰는
   * 공용 PersonInlineModal 그대로.
   */
  const [modalPersonId, setModalPersonId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  /*
   * 등록은 여기서 끝난다. 예전엔 '역대 수반에서 등록'이라며 행정조직 탭으로 내보냈는데,
   * 비어 있는 걸 보고 채우려던 사람을 다른 지면으로 보내면 방금 보던 문맥(어느 나라의
   * 어느 정부)을 스스로 다시 세워야 한다. 인물 선택 → 재임 폼을 그 자리에서 띄운다.
   */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [registerPersonId, setRegisterPersonId] = useState<string | null>(null)
  /** 어느 부처의 우두머리를 등록하는가. null이면 부처 없이(수반 등) */
  const [registerTarget, setRegisterTarget] = useState<{
    departmentId: string | null
    label: string
  }>({ departmentId: null, label: '수반·각료' })

  /*
   * 빈 상태에서 부처 목록을 받아 **부처마다 등록 슬롯**을 세운다. 골격만 그려 두면
   * "여기에 정부가 온다"까지는 알지만 무엇을 채워야 하는지는 여전히 모른다. 이 나라에
   * 이미 등록된 부처(외무부·국방부…)를 그대로 줄 세우면 그게 곧 할 일 목록이다.
   */
  const departmentsQuery = useQuery({
    queryKey: ['administration-departments', 'by-country', countryId],
    queryFn: () => administrationDepartmentApi.getByCountryId(countryId),
    enabled: !!countryId,
    staleTime: 5 * 60_000,
  })

  /** 이 나라의 행정부 목록 — 카드 슬라이더의 모수 */
  const cabinetsQuery = useQuery({
    queryKey: ['cabinets', 'by-country', countryId],
    queryFn: () => personCareerApi.getCabinets({ countryId }),
    enabled: !!countryId,
    staleTime: 60_000,
  })

  const cabinets = useMemo(() => {
    const rows = cabinetsQuery.data ?? []
    return [...rows].sort((left, right) => {
      const leftStart = left.headTenure?.startDate ?? ''
      const rightStart = right.headTenure?.startDate ?? ''
      // 최신 정권이 먼저 — 첫 질문은 늘 '지금'이다
      return rightStart.localeCompare(leftStart)
    })
  }, [cabinetsQuery.data])

  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null)

  // 기본 선택은 현직(종료일 없는) 행정부, 없으면 가장 최근
  useEffect(() => {
    if (cabinets.length === 0) {
      setSelectedCabinetId(null)
      return
    }
    setSelectedCabinetId((prev) =>
      prev && cabinets.some((cabinet) => cabinet.id === prev)
        ? prev
        : (cabinets.find((cabinet) => !cabinet.headTenure?.endDate) ??
            cabinets[0]).id,
    )
  }, [cabinets])

  const selectedIndex = cabinets.findIndex(
    (cabinet) => cabinet.id === selectedCabinetId,
  )
  /*
   * 카드는 최신이 왼쪽이다. 그래서 **오른쪽이 과거**다 — '이전 정부'는 index+1.
   * 화살표 라벨·툴팁에 대상 정권 이름을 그대로 실어 방향 혼동을 없앤다.
   */
  const newerCabinet = selectedIndex > 0 ? cabinets[selectedIndex - 1] : null
  const olderCabinet =
    selectedIndex >= 0 && selectedIndex < cabinets.length - 1
      ? cabinets[selectedIndex + 1]
      : null

  const selectCabinet = (cabinetId: string) => {
    setSelectedCabinetId(cabinetId)
  }

  const overviewQuery = useQuery({
    queryKey: ['cabinet-overview', selectedCabinetId],
    queryFn: () => personCareerApi.getCabinetOverview(selectedCabinetId as string),
    enabled: !!selectedCabinetId,
    staleTime: 60_000,
    /*
     * 정권을 바꿀 때마다 골격이 번쩍이던 것을 없앤다. 카드를 누르면 아래가 통째로
     * 스켈레톤이 됐다가 다시 채워져, 고르는 동작마다 화면이 무너졌다 서는 것처럼 보였다.
     * 이전 정권 내용을 그대로 둔 채 새 데이터로 갈아끼운다 — 골격은 **첫 진입에만**.
     */
    placeholderData: keepPreviousData,
  })

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

  /*
   * 부처가 하나도 없을 때 '「행정조직 → 중앙부처」에서 만드세요'라고 길만 알려 줬다.
   * 채우려는 사람을 다른 지면으로 보내는 안내문은 등록이 아니다. 부처 생성은 name 하나만
   * 필수라 여기서 끝낼 수 있다.
   */
  const [setupOpen, setSetupOpen] = useState(false)
  const [electionPickerOpen, setElectionPickerOpen] = useState(false)
  /*
   * 연결된 선거의 상세는 **항상** 받아 온다. 모달을 열 때만 받던 시절엔 선거 내용을
   * 보려면 한 번 더 눌러야 했다 — 정권을 고르면 그 선거도 함께 펼쳐져야 한다.
   */
  const linkedElectionId =
    overviewQuery.data?.headTenure?.electionCandidacy?.election?.id ?? null

  const electionDetailQuery = useQuery({
    queryKey: ['election-detail', linkedElectionId],
    queryFn: () => getElection(linkedElectionId as string),
    enabled: !!linkedElectionId,
    staleTime: 60_000,
  })
  const [linkingElection, setLinkingElection] = useState(false)

  /*
   * 이 나라의 선거 목록. 서버가 브리지를 풀어 주므로 현대 국가로 물으면 연결된 과거
   * 국가(독일 → 독일 제국)의 선거까지 온다.
   */
  const electionsQuery = useQuery({
    queryKey: ['elections', 'by-country', countryId],
    queryFn: () => getElections({ countryId }),
    enabled: !!countryId,
    staleTime: 5 * 60_000,
  })
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [creatingDepartment, setCreatingDepartment] = useState(false)

  /*
   * 부처 이름의 틀. 나라마다 같은 자리를 다르게 부른다 — 일본 제국은 외무성·내무성이고
   * 우두머리는 장관이 아니라 대신, 조선은 이조·호조다. 한국식 '부'만 권하면 다른 나라
   * 지면을 만드는 사람은 권유를 전부 지우고 손으로 다시 쳐야 한다.
   *
   * 사용자가 아직 고르지 않았다면(null) 이미 만들어 둔 부처 이름에서 짐작한다.
   * 외무성이 있는 나라의 다음 권유가 '외무부'일 이유가 없다.
   */
  const [frameIdOverride, setFrameIdOverride] = useState<string | null>(null)

  /** 전역 부처 카테고리 — 틀에서 만든 부처를 중앙부처 탭에 제대로 걸기 위해 */
  const categoriesQuery = useQuery({
    queryKey: ['administration-department-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    staleTime: 30 * 60_000,
  })

  /** 이름만 고치는 편집 — 틀에서 담은 이름은 출발점일 뿐이다 */
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  const startRename = (departmentId: string, name: string) => {
    setRenamingId(departmentId)
    setRenameValue(name)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const commitRename = async (departmentId: string, previousName: string) => {
    const name = renameValue.trim()
    if (!name || name === previousName) {
      cancelRename()
      return
    }
    setRenaming(true)
    try {
      await administrationDepartmentApi.update(departmentId, { name })
      await invalidateDepartments()
      notify.success(`「${name}」으로 바꿨습니다`)
      cancelRename()
    } catch {
      notify.error('부처 이름 변경 실패')
    } finally {
      setRenaming(false)
    }
  }

  const invalidateDepartments = () =>
    queryClient.invalidateQueries({
      queryKey: ['administration-departments', 'by-country', countryId],
    })

  const removeDepartment = async (departmentId: string, name: string) => {
    if (
      !(await confirm({
        title: '부처 삭제',
        message: `「${name}」 부처를 삭제할까요? 이 부처에 연결된 재임 기록은 남고 부처 연결만 끊깁니다.`,
        danger: true,
      }))
    )
      return
    try {
      await administrationDepartmentApi.delete(departmentId)
      await invalidateDepartments()
      notify.success('부처가 삭제되었습니다')
    } catch {
      notify.error('부처 삭제 실패')
    }
  }

  const existingDepartmentNames = useMemo(
    () => (departmentsQuery.data ?? []).map((department) => department.name),
    [departmentsQuery.data],
  )

  const frameId =
    frameIdOverride ?? inferDepartmentFrameId(existingDepartmentNames)
  const frame = getDepartmentNameFrame(frameId)

  /** 고른 틀에서 아직 없는 자리만 — 이미 만든 부처를 또 권하지 않는다 */
  const presetSuggestions = useMemo(
    () => suggestFrameItems(frame, existingDepartmentNames),
    [frame, existingDepartmentNames],
  )

  /** 틀의 카테고리 이름 → 전역 카테고리 id */
  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.name, category.id)
    }
    return map
  }, [categoriesQuery.data])

  const addPresets = async (items: DepartmentFrameItem[]) => {
    setCreatingDepartment(true)
    try {
      // 순차 생성 — 서버가 이름 중복을 막을 수 있어 한 건씩 결과를 본다
      for (const item of items) {
        await administrationDepartmentApi.create({
          name: item.name,
          countryId,
          // 카테고리를 함께 걸어야 「행정조직 → 중앙부처」의 해당 탭에 나타난다
          categoryId: categoryIdByName.get(item.categoryName) ?? null,
        })
      }
      await invalidateDepartments()
      notify.success(`부처 ${items.length}개가 만들어졌습니다`)
    } catch {
      notify.error('기본 부처 생성 실패')
    } finally {
      setCreatingDepartment(false)
    }
  }

  const createDepartment = async () => {
    const name = newDepartmentName.trim()
    if (!name) return
    setCreatingDepartment(true)
    try {
      await administrationDepartmentApi.create({ name, countryId })
      setNewDepartmentName('')
      await invalidateDepartments()
      notify.success(`${name} 부처가 만들어졌습니다`)
    } catch {
      notify.error('부처 생성 실패')
    } finally {
      setCreatingDepartment(false)
    }
  }

  /**
   * 정권을 선거에 잇는다. 재임↔선거는 **후보(candidacy)를 경유**하는 스키마라,
   * 그 선거에 수반의 후보 기록이 없으면 먼저 만든 뒤 재임에 건다.
   */
  const linkElection = async (electionId: string) => {
    const head = heads[0]
    if (!head?.personId) return
    setLinkingElection(true)
    try {
      const detail = await getElection(electionId)
      const existing = (detail.candidacies ?? []).find(
        (candidacy) => candidacy.personId === head.personId,
      )
      const candidacy =
        existing ??
        (await createElectionCandidacy(electionId, {
          personId: head.personId,
          /*
           * 연결만을 위해 만드는 후보 기록이라 공천 형태는 단정하지 않는다.
           * PARTY_NOMINATION은 정당 공천을, INDEPENDENT는 무소속을 주장하는데
           * 여기서는 둘 다 알지 못한다. 선거 지면에서 나중에 정확히 고칠 수 있다.
           */
          nominationType: 'OTHER',
        }))
      await personCareerApi.updateGovernmentPositionTenure(head.id, {
        electionCandidacyId: candidacy.id,
      } as never)
      await queryClient.invalidateQueries({
        queryKey: ['cabinet-overview', selectedCabinetId],
      })
      setElectionPickerOpen(false)
      notify.success('선거가 연결되었습니다')
    } catch {
      notify.error('선거 연결 실패')
    } finally {
      setLinkingElection(false)
    }
  }

  const unlinkElection = async () => {
    const head = heads[0]
    if (!head) return
    if (
      !(await confirm({
        title: '선거 연결 해제',
        message: '이 정권과 선거의 연결을 끊을까요? 선거 기록 자체는 남습니다.',
        danger: true,
      }))
    )
      return
    try {
      await personCareerApi.updateGovernmentPositionTenure(head.id, {
        electionCandidacyId: null,
      } as never)
      await queryClient.invalidateQueries({
        queryKey: ['cabinet-overview', selectedCabinetId],
      })
      notify.success('연결이 해제되었습니다')
    } catch {
      notify.error('연결 해제 실패')
    }
  }

  const closeRegister = () => {
    setRegisterPersonId(null)
    setPickerOpen(false)
    setRegisterTarget({ departmentId: null, label: '수반·각료' })
  }

  const openRegister = (departmentId: string | null, label: string) => {
    setRegisterTarget({ departmentId, label })
    setPickerOpen(true)
  }

  // 정부 변천 패널과 같은 키 — react-query가 한 번만 받아온다
  const query = useQuery({
    queryKey: ['tenures-by-country', countryId, undefined],
    queryFn: () => personCareerApi.getTenuresByCountry({ countryId }),
    enabled: !!countryId,
    staleTime: 60_000,
  })

  /*
   * 부처에 등록된 재임 — 슬롯이 '아직 없음'만 말하던 자리를 실제 사람으로 채운다.
   *
   * 부처 슬롯에서 사람을 등록하면 재임의 administrationDepartmentId에 그 부처가 박히는데,
   * 정작 슬롯은 그 재임을 조회하지 않아 등록한 사람이 화면 어디에도 안 나왔다
   * (마인드맵은 cabinetId 기준이라, 행정부 행이 없는 나라에서는 영원히 보이지 않는다).
   * 국가 재임 목록 한 번으로 부처별 점유자를 세운다 — 서버가 현대↔역사 브리지를 풀어 주므로
   * 역사국가 소속 재임(일본 제국 외무대신)도 현대 국가 지면에서 함께 온다.
   */
  const departmentOccupants = useMemo(() => {
    const byDepartment = new Map<
      string,
      { personId: string | null; name: string; period: string; count: number }
    >()
    const rows = (query.data ?? []) as Array<{
      administrationDepartmentId?: string | null
      startDate?: string | null
      endDate?: string | null
      person?: {
        id?: string
        name?: string
        surname?: string | null
        middleName?: string | null
        nameDisplayOrder?: string | null
        country?: { defaultNameDisplayOrder?: string | null } | null
      } | null
    }>
    // 서버가 startDate 내림차순으로 주므로 첫 행이 가장 최근 — 그 사람을 대표로 세운다
    for (const row of rows) {
      const departmentId = row.administrationDepartmentId
      if (!departmentId || !row.person) continue
      const existing = byDepartment.get(departmentId)
      if (existing) {
        existing.count += 1
        continue
      }
      const startYear = row.startDate?.slice(0, 4) ?? ''
      const endYear = row.endDate?.slice(0, 4) ?? ''
      byDepartment.set(departmentId, {
        personId: row.person.id ?? null,
        name:
          getPersonDisplayName({
            name: row.person.name ?? '',
            surname: row.person.surname ?? undefined,
            middleName: row.person.middleName ?? undefined,
            nameDisplayOrder: row.person.nameDisplayOrder ?? null,
            country: row.person.country ?? undefined,
          }) ||
          row.person.name ||
          '이름 없음',
        period: startYear ? `${startYear}~${endYear || ''}` : '',
        count: 1,
      })
    }
    return byDepartment
  }, [query.data])

  const { members, heads } = useMemo(() => {
    const overview = overviewQuery.data
    if (!overview) return { members: [] as Member[], heads: [] as Member[] }

    type OverviewTenure = NonNullable<typeof overview.headTenure>
    const toMember = (
      row: OverviewTenure,
      isHead: boolean,
      replaced: boolean,
      predecessor: string | null,
    ): Member => ({
      id: String(row.id),
      personId: row.person?.id ?? null,
      name: row.person ? getPersonDisplayName(row.person) : '이름 미상',
      imageUrl: row.person?.profileImageUrl ?? null,
      title: (row.title ?? row.positionDefinition?.title ?? '직위 미상').trim(),
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      isHead,
      termNumber: typeof row.termNumber === 'number' ? row.termNumber : null,
      replaced,
      predecessor,
    })

    /*
     * 같은 자리를 이 행정부 안에서 이어받았는지 본다. overview는 **종료된 각료까지**
     * 함께 주므로(실측 트럼프 2기 18건 중 3건 종료) 전임을 여기서 바로 찾을 수 있다.
     */
    const byTitle = new Map<string, OverviewTenure[]>()
    for (const row of overview.memberTenures ?? []) {
      const title = (row.title ?? row.positionDefinition?.title ?? '').trim()
      if (!title) continue
      const list = byTitle.get(title) ?? []
      list.push(row)
      byTitle.set(title, list)
    }

    const mapped: Member[] = []
    for (const list of byTitle.values()) {
      // 현직이 없으면(전원 종료된 과거 정권) 마지막 사람을 그 자리의 얼굴로 쓴다
      const current =
        list.find((row) => !row.endDate) ??
        [...list].sort((left, right) =>
          (right.endDate ?? '').localeCompare(left.endDate ?? ''),
        )[0]
      if (!current) continue
      const earlier = list
        .filter((row) => row.id !== current.id && row.endDate)
        .sort((left, right) =>
          (right.endDate ?? '').localeCompare(left.endDate ?? ''),
        )[0]
      mapped.push(
        toMember(
          current,
          false,
          !!earlier,
          earlier?.person ? getPersonDisplayName(earlier.person) : null,
        ),
      )
    }
    mapped.sort((left, right) =>
      (left.startDate ?? '').localeCompare(right.startDate ?? ''),
    )

    return {
      members: mapped,
      heads: overview.headTenure
        ? [toMember(overview.headTenure, true, false, null)]
        : [],
    }
  }, [overviewQuery.data])

  const selectedCabinet =
    cabinets.find((cabinet) => cabinet.id === selectedCabinetId) ?? null
  /** 선택된 행정부의 이름 — 이름이 비면 수반+연도로 짓는다 */
  const cabinetLabel = (cabinet: (typeof cabinets)[number]) => {
    if (cabinet.name?.trim()) return cabinet.name.trim()
    /*
     * 목록 DTO의 person은 name이 optional이고 country가 선언돼 있지 않다. 그런데 응답에는
     * country.defaultNameDisplayOrder가 실제로 들어 있고(실측 'western'), 이걸 빼면 표시
     * 순서가 기본값(동양식)으로 떨어져 '워싱턴 조지'가 된다. DTO 타입이 응답보다 낡은
     * 경우라 읽는 쪽에서 좁힌다.
     */
    const head = cabinet.headTenure?.person as
      | (NonNullable<typeof cabinet.headTenure>['person'] & {
          country?: { defaultNameDisplayOrder?: string | null } | null
        })
      | undefined
    const full = head?.name
      ? getPersonDisplayName({
          name: head.name,
          surname: head.surname ?? null,
          middleName: head.middleName ?? null,
          nameDisplayOrder: head.nameDisplayOrder ?? null,
          // country를 빼면 표시 순서가 기본값(동양식)으로 떨어져 '워싱턴 조지'가 된다
          country: head.country ?? null,
        })
      : '이름 미상'
    /*
     * 긴 이름은 카드에서 두 줄로 잘리게 두고 title로 전체를 보인다.
     * 한때 '길면 성만 쓴다'로 줄여 봤는데, 실데이터에 이름·성이 뒤집혀 들어간 인물이 있어
     * (푸앵카레: name='푸앵카레'(성) / surName='레몽'(이름), order='korean')
     * '레몽 행정부'처럼 더 틀린 이름이 나왔다. 깨진 데이터 위에 추측 규칙을 얹지 않는다.
     */
    return `${full} 행정부`
  }
  const cabinetPeriod = (cabinet: (typeof cabinets)[number]) => {
    const from = (cabinet.headTenure?.startDate ?? '').slice(0, 4)
    const to = cabinet.headTenure?.endDate
      ? cabinet.headTenure.endDate.slice(0, 4)
      : '현재'
    return from ? `${from}–${to}` : ''
  }
  /** 이 정권을 낳은 선거 — 수반 임기의 후보 기록을 거쳐 온다 */
  const linkedElection =
    overviewQuery.data?.headTenure?.electionCandidacy?.election ?? null

  /*
   * 후보 목록의 person에는 country가 없어 표시 순서를 스스로 못 정한다(그대로 두면
   * '트럼프 도널드'처럼 뒤집힌다). 수반 person이 들고 온 국가 기본값을 지면 기본값으로
   * 넘긴다 — 헬퍼의 countryDefaultNameDisplayOrder가 정확히 이 자리를 위한 옵션이다.
   */
  const voteShareRaw =
    overviewQuery.data?.headTenure?.electionCandidacy?.result?.voteSharePercent
  const voteShare =
    voteShareRaw != null && voteShareRaw !== '' ? Number(voteShareRaw) : null

  const countryNameOrder =
    overviewQuery.data?.headTenure?.person?.country?.defaultNameDisplayOrder ??
    null
  const elections = electionsQuery.data ?? []

  const departments = departmentsQuery.data ?? []
  const replacedCount = members.filter((member) => member.replaced).length
  // 16명까지는 접지 않는다. 각료 15명짜리 정부를 9명에서 끊으면 '한눈에'가 아니다

  /*
   * 현직이 없어도 섹션을 지우지 않는다. null을 돌려주던 시절엔 프랑스·독일처럼 재임이
   * 전부 종료된 나라에서 선거 카드와 '수반 등록' 진입점까지 함께 사라졌다.
   */
  /**
   * 마인드맵 가운데 노드 아래 요약 — 취임·재임·각료·교체·득표율.
   * 예전 히어로 카드가 들고 있던 줄을 그대로 옮겼다.
   */
  const mindMapStats = useMemo(() => {
    const head = heads[0]
    if (!head) return []
    const rows: Array<{
      key: string
      label: string
      value: string
      warn?: boolean
    }> = []
    if (head.startDate) {
      rows.push({ key: 'start', label: '취임', value: shortDate(head.startDate) })
      rows.push({
        key: 'span',
        label: head.endDate ? '퇴임' : '재임',
        value: head.endDate
          ? shortDate(head.endDate)
          : (elapsedText(head.startDate) ?? '—'),
      })
    }
    rows.push({ key: 'members', label: '각료', value: `${members.length}명` })
    if (replacedCount > 0) {
      rows.push({
        key: 'replaced',
        label: '교체',
        value: `${replacedCount}자리`,
        warn: true,
      })
    }
    if (voteShare != null) {
      rows.push({
        key: 'vote',
        label: '득표율',
        value: `${voteShare.toFixed(1)}%`,
      })
    }
    return rows
  }, [heads, members.length, replacedCount, voteShare])

  /*
   * 이 정권을 낳은 선거. 스키마엔 재임→후보→선거 경로가 처음부터 있었는데 화면이
   * 없어 실측 재임 217건 중 연결이 0건이었다. 정권을 고른 자리에서 바로 잇는다.
   *
   * 마인드맵 아래 가지로 꽂는다 — 선거가 정권을 낳았으니 같은 지도 안에 있어야 한다.
   */
  /** 등록된 후보들의 득표율 합이 100%에 못 미치는 몫 — 빠진 상대를 가늠하게 한다 */
  const unregisteredShare = useMemo(() => {
    const rows = electionDetailQuery.data?.candidacies ?? []
    if (rows.length === 0) return null
    const sum = rows.reduce(
      (acc, row) => acc + Number(row.result?.voteSharePercent ?? 0),
      0,
    )
    if (sum <= 0 || sum >= 99.5) return null
    return 100 - sum
  }, [electionDetailQuery.data])

  const electionSlot =
    heads.length > 0 ? (
      <ElectionPanel>
        <ElectionHead>
          <ElectionLabel>이 정권을 낳은 선거</ElectionLabel>
          {linkedElection ? (
            <>
              <ElectionName>{linkedElection.name}</ElectionName>
              {electionDetailQuery.data && (
                <ElectionMeta>
                  {[
                    ELECTION_TYPE_LABEL[
                      electionDetailQuery.data.electionType
                    ] ?? electionDetailQuery.data.electionType,
                    ELECTION_STATUS_LABEL[
                      electionDetailQuery.data.status ?? ''
                    ],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </ElectionMeta>
              )}
              <ElectionUnlink type="button" onClick={() => void unlinkElection()}>
                연결 해제
              </ElectionUnlink>
            </>
          ) : elections.length > 0 ? (
            <ElectionLink
              type="button"
              onClick={() => setElectionPickerOpen(true)}
            >
              + 선거 연결
            </ElectionLink>
          ) : (
            <ElectionMuted>등록된 선거가 없습니다</ElectionMuted>
          )}
        </ElectionHead>

        {/*
          * 선거 내용을 지면에 그대로 편다. 모달로 감춰 두던 시절엔 정권을 골라도
          * 선거는 이름 한 줄이라, 한 번 더 눌러야 '얼마로 이겼나'가 나왔다.
          */}
        {linkedElection && electionDetailQuery.data && (
          <ElectionBody>
            <ElectionFacts>
              <ElectionFact>
                <DetailKey>투표일</DetailKey>
                <DetailValue>
                  {shortDate(electionDetailQuery.data.pollDate)}
                </DetailValue>
              </ElectionFact>
              {electionDetailQuery.data.voterTurnoutPercent != null && (
                <ElectionFact>
                  <DetailKey>투표율</DetailKey>
                  <DetailValue>
                    {electionDetailQuery.data.voterTurnoutPercent}%
                  </DetailValue>
                </ElectionFact>
              )}
              {electionDetailQuery.data.totalSeats != null && (
                <ElectionFact>
                  <DetailKey>총 의석</DetailKey>
                  <DetailValue>
                    {electionDetailQuery.data.totalSeats.toLocaleString()}석
                  </DetailValue>
                </ElectionFact>
              )}
              <ElectionMore type="button" onClick={onOpenElections}>
                선거 탭에서 자세히
              </ElectionMore>
            </ElectionFacts>

            {(electionDetailQuery.data.candidacies ?? []).length > 0 && (
              <CandidacyList>
                {[...electionDetailQuery.data.candidacies]
                  .sort(
                    (left, right) =>
                      Number(right.result?.voteSharePercent ?? -1) -
                      Number(left.result?.voteSharePercent ?? -1),
                  )
                  .map((candidacy) => {
                    const share = candidacy.result?.voteSharePercent
                      ? Number(candidacy.result.voteSharePercent)
                      : null
                    return (
                      <CandidacyRow
                        key={candidacy.id}
                        type="button"
                        onClick={() =>
                          candidacy.person?.id &&
                          setModalPersonId(candidacy.person.id)
                        }
                      >
                        <CandidacyTop>
                          {/*
                            * 이 정권을 낳은 그 사람은 지도 한가운데의 얼굴과 같은 얼굴을 쓴다 —
                            * 선거 결과와 정권이 한 사람으로 이어진다. (선거 상세 응답의 후보에는
                            * 프로필 이미지가 없어 수반과 같은 인물일 때만 그릴 수 있다)
                            */}
                          {heads[0]?.personId &&
                            candidacy.person?.id === heads[0].personId && (
                              <CandidacyFace>
                                <Face member={heads[0]} size={30} />
                              </CandidacyFace>
                            )}
                          <CandidacyName>
                            {candidacy.person
                              ? getPersonDisplayName(
                                  {
                                    name: candidacy.person.name,
                                    surname: candidacy.person.surname ?? null,
                                  },
                                  {
                                    countryDefaultNameDisplayOrder:
                                      countryNameOrder,
                                  },
                                )
                              : '후보 미상'}
                          </CandidacyName>
                          {candidacy.party?.name ? (
                            <CandidacyParty>
                              {candidacy.party.name}
                            </CandidacyParty>
                          ) : (
                            /* 정당을 조용히 비워 두면 '무소속'으로 읽힌다 — 모른다고 적는다 */
                            <CandidacyParty $muted>정당 미등록</CandidacyParty>
                          )}
                          {candidacy.result?.elected && <WonChip>당선</WonChip>}
                          {share != null && (
                            <CandidacyShare>
                              {share.toFixed(1)}%
                            </CandidacyShare>
                          )}
                        </CandidacyTop>
                        {share != null && (
                          <ShareTrack>
                            <ShareFill
                              style={{
                                width: `${Math.min(100, Math.max(0, share))}%`,
                                background: candidacy.result?.elected
                                  ? '#15803d'
                                  : '#94a3b8',
                              }}
                            />
                          </ShareTrack>
                        )}
                        {candidacy.result?.votes && (
                          <CandidacyVotes>
                            {Number(candidacy.result.votes).toLocaleString()}표
                          </CandidacyVotes>
                        )}
                      </CandidacyRow>
                    )
                  })}
              </CandidacyList>
            )}

            {/*
              * 후보가 한 명뿐이면 "상대가 없었다"가 아니라 "상대를 아직 안 넣었다"인
              * 경우가 대부분이다. 조용히 한 줄만 그리면 전자로 읽힌다 — 빠진 몫을 적는다.
              */}
            {electionDetailQuery.data &&
              (electionDetailQuery.data.candidacies?.length ?? 0) < 2 && (
                <CandidacyGap>
                  <span>
                    등록된 후보 {electionDetailQuery.data.candidacies?.length ?? 0}명
                    {unregisteredShare != null &&
                      ` · 나머지 ${unregisteredShare.toFixed(1)}% 미등록`}
                  </span>
                  <ElectionLink type="button" onClick={onOpenElections}>
                    상대 후보 추가
                  </ElectionLink>
                </CandidacyGap>
              )}
          </ElectionBody>
        )}
      </ElectionPanel>
    ) : null

  const isEmpty = heads.length === 0 && members.length === 0

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconBriefcase />
        </S.SectionTitleIcon>
        {/*
          * '지금'이 아니다. 카드로 과거 정권을 고를 수 있게 된 순간부터 이 지면은
          * 현재만 말하지 않는다. 선택된 행정부 이름도 헤더에서 뺐다 — 카드가 이미
          * 이름을 크게 들고 선택 표시까지 한다.
          */}
        <S.SectionTitleText>행정부</S.SectionTitleText>
        {cabinets.length > 1 && (
          <S.SectionCountChip>{cabinets.length}대</S.SectionCountChip>
        )}
        <HeaderActions>
          <S.SectionAction
            type="button"
            onClick={() => openRegister(null, '수반·각료')}
          >
            + 수반·각료 등록
          </S.SectionAction>
          <S.SectionAction type="button" onClick={onOpen}>
            행정부 관리
          </S.SectionAction>
        </HeaderActions>
      </S.SectionTitleRow>

      {cabinetsQuery.isLoading || overviewQuery.isLoading ? (
        <GovernmentSkeleton />
      ) : isEmpty ? (
        <>
          {/* 수장 자리 — 부처와 무관한 국가원수·정부수반 */}
          <EmptySlotHead
            type="button"
            onClick={() => openRegister(null, '정부 수반')}
          >
            <SlotFace />
            <SlotHeadText>
              <SlotRole>정부 수반</SlotRole>
              <SlotEmptyName>아직 등록되지 않음</SlotEmptyName>
            </SlotHeadText>
            <SlotAdd>+ 등록</SlotAdd>
          </EmptySlotHead>

          {departments.length > 0 ? (
            <>
              <SlotGroupLabel>부처별 우두머리</SlotGroupLabel>
              <SlotGrid>
                {departments.map((department) => (
                  <DepartmentSlot
                    key={department.id}
                    name={department.name}
                    occupant={departmentOccupants.get(department.id) ?? null}
                    onOpenPerson={(personId) => setModalPersonId(personId)}
                    onRegister={() =>
                      openRegister(department.id, department.name)
                    }
                    onDelete={() =>
                      void removeDepartment(department.id, department.name)
                    }
                    editing={renamingId === department.id}
                    renameValue={renameValue}
                    renaming={renaming}
                    onRenameStart={() =>
                      startRename(department.id, department.name)
                    }
                    onRenameChange={setRenameValue}
                    onRenameCommit={() =>
                      void commitRename(department.id, department.name)
                    }
                    onRenameCancel={cancelRename}
                  />
                ))}
              </SlotGrid>
              <SlotGridFooter>
                <PresetAll type="button" onClick={() => setSetupOpen(true)}>
                  부처 더 담기 · 이름 정리
                </PresetAll>
              </SlotGridFooter>
            </>
          ) : (
<EmptyArea>
            <SetupCta type="button" onClick={() => setSetupOpen(true)}>
              <IconBriefcase />
              각료 등록
            </SetupCta>
            {/*
              * 기본 틀 칩은 지면에 둔다. 한 번에 하나씩 눌러 자리를 세우는 동작이라
              * 모달을 열고 닫는 왕복보다 그 자리에서 톡톡 누르는 편이 빠르다.
              * 모달은 '이름 직접 입력·만든 부처 정리·부처 없이 바로 등록'을 맡는다.
              */}
            <DepartmentFramePicker
              frame={frame}
              suggestions={presetSuggestions}
              disabled={creatingDepartment}
              onChangeFrame={setFrameIdOverride}
              onAdd={(items) => void addPresets(items)}
            />
          </EmptyArea>
          )}
        </>
      ) : (
        <>
      {/*
        * 행정부 마인드맵 — 가운데 수반, 좌·우로 뻗는 각료.
        *
        * 예전엔 수반 히어로 카드 아래에 각료 칩이 격자로 깔렸다. 그러면 "이 정권에 이런
        * 사람들이 있다"는 목록은 되지만 "이 사람 밑에 이 사람들이 있다"는 관계가 안 보인다.
        * 정권은 본디 한 사람을 중심으로 뻗은 구조다. 히어로의 요약(취임·재임·각료·교체·
        * 득표율)은 가운데 노드 아래로 옮겨 같은 자리에서 읽힌다.
        */}
      {(heads.length > 0 || members.length > 0) && (
        <CabinetMindMap
          head={heads[0] ?? null}
          members={members}
          cabinetLabel={selectedCabinet ? cabinetLabel(selectedCabinet) : null}
          stats={mindMapStats}
          renderFace={(member, size) => (
            <Face member={member} size={size} muted={size <= 34} />
          )}
          onSelectPerson={(personId) => setModalPersonId(personId)}
          expanded={expanded}
          onToggleExpand={() => setExpanded((prev) => !prev)}
          electionSlot={electionSlot}
          nav={
            cabinets.length > 0
              ? {
                  onNewer: newerCabinet
                    ? () => selectCabinet(newerCabinet.id)
                    : null,
                  onOlder: olderCabinet
                    ? () => selectCabinet(olderCabinet.id)
                    : null,
                  newerLabel: newerCabinet
                    ? `${cabinetLabel(newerCabinet)} (${cabinetPeriod(newerCabinet)})`
                    : null,
                  olderLabel: olderCabinet
                    ? `${cabinetLabel(olderCabinet)} (${cabinetPeriod(olderCabinet)})`
                    : null,
                  index: Math.max(0, selectedIndex),
                  total: cabinets.length,
                  slideKey: selectedCabinetId,
                }
              : undefined
          }
        />
      )}


      {members.length === 0 ? (
        /*
         * 수반은 있는데 각료가 0명인 정권(독일 베트만홀베크 내각 등). 격자를 비워 두면
         * 이 정권에 각료가 없다는 사실만 남고 채울 길이 없다 — 부처별 슬롯을 그 자리에.
         */
        departments.length > 0 ? (
          <>
            <SlotGroupLabel>부처별 우두머리</SlotGroupLabel>
            <SlotGrid>
              {departments.map((department) => (
                <DepartmentSlot
                  key={department.id}
                  name={department.name}
                  occupant={departmentOccupants.get(department.id) ?? null}
                  onOpenPerson={(personId) => setModalPersonId(personId)}
                  onRegister={() => openRegister(department.id, department.name)}
                  onDelete={() =>
                    void removeDepartment(department.id, department.name)
                  }
                  editing={renamingId === department.id}
                  renameValue={renameValue}
                  renaming={renaming}
                  onRenameStart={() =>
                    startRename(department.id, department.name)
                  }
                  onRenameChange={setRenameValue}
                  onRenameCommit={() =>
                    void commitRename(department.id, department.name)
                  }
                  onRenameCancel={cancelRename}
                />
              ))}
            </SlotGrid>
            <SlotGridFooter>
              <PresetAll type="button" onClick={() => setSetupOpen(true)}>
                부처 더 담기 · 이름 정리
              </PresetAll>
            </SlotGridFooter>
          </>
        ) : (
<EmptyArea>
            <SetupCta type="button" onClick={() => setSetupOpen(true)}>
              <IconBriefcase />
              각료 등록
            </SetupCta>
            {/*
              * 기본 틀 칩은 지면에 둔다. 한 번에 하나씩 눌러 자리를 세우는 동작이라
              * 모달을 열고 닫는 왕복보다 그 자리에서 톡톡 누르는 편이 빠르다.
              * 모달은 '이름 직접 입력·만든 부처 정리·부처 없이 바로 등록'을 맡는다.
              */}
            <DepartmentFramePicker
              frame={frame}
              suggestions={presetSuggestions}
              disabled={creatingDepartment}
              onChangeFrame={setFrameIdOverride}
              onAdd={(items) => void addPresets(items)}
            />
          </EmptyArea>
        )
      ) : null}
        </>
      )}

      {children && (
        <Extra>
          {typeof children === 'function'
            ? children(linkedElection?.id ?? null)
            : children}
        </Extra>
      )}

      {/*
        * 각료 구성은 모달에서 끝낸다. 예전엔 안내문 + 입력칸 + 기본 틀 칩이 대시보드에
        * 통째로 깔려, 정작 보러 온 정권 정보보다 '아직 없다'는 설명이 더 넓었다.
        * 지면에는 버튼 하나만 남기고 채우는 일은 모달로 옮긴다.
        */}
      <Modal
        isOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="각료 등록"
        subtitle={
          selectedCabinet ? cabinetLabel(selectedCabinet) : '이 정권에 각료 넣기'
        }
      >
        <ModalBody>
          <SetupSection>
            <SetupHeading>바로 등록</SetupHeading>
            <SetupHint>
              부처를 지정하지 않고 인물과 직책만으로 넣습니다.
            </SetupHint>
            <HeaderAction
              type="button"
              onClick={() => {
                setSetupOpen(false)
                openRegister(null, '각료')
              }}
            >
              + 인물 선택해서 등록
            </HeaderAction>
          </SetupSection>

          <SetupSection>
            <SetupHeading>부처를 만들어 자리별로</SetupHeading>
            <SetupHint>
              부처를 만들면 자리마다 등록 칸이 생겨, 누가 어느 부처를 맡았는지 남습니다.
            </SetupHint>
            <NewDeptForm
              onSubmit={(event) => {
                event.preventDefault()
                void createDepartment()
              }}
            >
              <NewDeptInput
                value={newDepartmentName}
                onChange={(event) => setNewDepartmentName(event.target.value)}
                placeholder={`새 부처 이름 (예: ${frame.items[0]?.name ?? '외무부'})`}
                aria-label="새 부처 이름"
              />
              <NewDeptSubmit
                type="submit"
                disabled={!newDepartmentName.trim() || creatingDepartment}
              >
                만들기
              </NewDeptSubmit>
            </NewDeptForm>

            {/* 틀은 모달에서도 고를 수 있다 — 여기가 부처를 채우는 자리다 */}
            <DepartmentFramePicker
              frame={frame}
              suggestions={presetSuggestions}
              disabled={creatingDepartment}
              onChangeFrame={setFrameIdOverride}
              onAdd={(items) => void addPresets(items)}
            />

            {departments.length > 0 && (
              <PresetBlock>
                <PresetLabel>
                  만들어 둔 부처 {departments.length}개
                  <PresetHint>이름을 눌러 이 나라에 맞게 고칩니다</PresetHint>
                </PresetLabel>
                <PresetChips>
                  {departments.map((department) =>
                    renamingId === department.id ? (
                      <RenameForm
                        key={department.id}
                        onSubmit={(event) => {
                          event.preventDefault()
                          void commitRename(department.id, department.name)
                        }}
                      >
                        <RenameInput
                          autoFocus
                          value={renameValue}
                          disabled={renaming}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              cancelRename()
                            }
                          }}
                          aria-label={`${department.name} 새 이름`}
                        />
                        <RenameConfirm
                          type="submit"
                          disabled={renaming || !renameValue.trim()}
                          aria-label="이름 저장"
                        >
                          <FiCheck size={12} />
                        </RenameConfirm>
                        <MadeChipDelete
                          type="button"
                          onClick={cancelRename}
                          aria-label="이름 변경 취소"
                        >
                          <FiX size={12} />
                        </MadeChipDelete>
                      </RenameForm>
                    ) : (
                      <MadeChip key={department.id}>
                        <MadeChipName
                          type="button"
                          onClick={() =>
                            startRename(department.id, department.name)
                          }
                          title="이름 바꾸기"
                        >
                          {department.name}
                          <FiEdit2 size={11} />
                        </MadeChipName>
                        <MadeChipDelete
                          type="button"
                          aria-label={`${department.name} 삭제`}
                          onClick={() =>
                            void removeDepartment(department.id, department.name)
                          }
                        >
                          <FiX size={12} />
                        </MadeChipDelete>
                      </MadeChip>
                    ),
                  )}
                </PresetChips>
              </PresetBlock>
            )}
          </SetupSection>
        </ModalBody>
      </Modal>

      <Modal
        isOpen={electionPickerOpen}
        onClose={() => setElectionPickerOpen(false)}
        title="선거 연결"
        subtitle={
          selectedCabinet
            ? `${cabinetLabel(selectedCabinet)}을(를) 낳은 선거 고르기`
            : undefined
        }
      >
        <ModalBody>
          <SetupHint>
            고른 선거에 수반의 후보 기록이 없으면 함께 만들어 잇습니다.
          </SetupHint>
          <ElectionList>
            {elections.map((election) => (
              <ElectionOption
                key={election.id}
                type="button"
                disabled={linkingElection}
                onClick={() => void linkElection(election.id)}
              >
                <ElectionOptionName>{election.name}</ElectionOptionName>
                <ElectionDate>{shortDate(election.pollDate)}</ElectionDate>
              </ElectionOption>
            ))}
          </ElectionList>
        </ModalBody>
      </Modal>

      {pickerOpen && (
        <PersonSelectModal
          persons={personsQuery.data ?? []}
          selectedPersonId={registerPersonId ?? ''}
          loading={personsQuery.isLoading}
          title={`${registerTarget.label} 등록 — 인물 선택`}
          searchPlaceholder="등록할 인물을 검색..."
          defaultCountryId={countryId}
          onSelect={(personId) => {
            setRegisterPersonId(personId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {registerPersonId && (
        <TenureRegisterPanel
          personId={registerPersonId}
          open
          onClose={closeRegister}
          onSuccess={closeRegister}
          initialCountryId={countryId}
          initialAdministrationDepartmentId={registerTarget.departmentId}
        />
      )}

      <PersonInlineModal
        personId={modalPersonId}
        onClose={() => setModalPersonId(null)}
        onEdit={(personId) => {
          setModalPersonId(null)
          onSelectPerson(personId)
        }}
      />
    </S.Section>
  )
}

/**
 * 정부 골격. 로딩 중엔 물결 애니메이션으로, 빈 상태(`ghost`)엔 정지 상태로 그린다.
 *
 * 같은 모양을 두 상태에 쓰되 움직임으로 가른다 — 빈 자리를 계속 일렁이게 두면 영원히
 * 로딩 중인 것처럼 읽힌다.
 */
function GovernmentSkeleton({ ghost = false }: { ghost?: boolean }) {
  const animation = 'wave' as const
  return (
    <SkeletonRoot $ghost={ghost} aria-hidden>
      <SkeletonHead $ghost={ghost}>
        <Skeleton variant="circular" width={104} height={104} animation={animation} />
        <SkeletonHeadText>
          <Skeleton width={92} height={13} animation={animation} />
          <Skeleton width={188} height={26} animation={animation} />
          <Skeleton width={150} height={13} animation={animation} />
        </SkeletonHeadText>
      </SkeletonHead>
      <SkeletonRoster>
        {Array.from({ length: 9 }, (_, index) => (
          <SkeletonCell key={index}>
            <Skeleton variant="circular" width={26} height={26} animation={animation} />
            <Skeleton width={68} height={12} animation={animation} />
            <Skeleton width={96} height={13} animation={animation} />
          </SkeletonCell>
        ))}
      </SkeletonRoster>
    </SkeletonRoot>
  )
}

/**
 * 빈 부처 자리 한 칸. 등록(주 동작)과 이름 바꾸기(✎)·삭제(✕)를 **형제 버튼**으로 둔다 —
 * 칸 전체를 버튼으로 만들고 그 안에 버튼을 넣으면 버튼 안 버튼이라 HTML이 깨진다.
 *
 * 이름 바꾸기가 여기 있는 이유: 틀에서 담은 '외무부'는 출발점이고, 이 나라에서 실제로
 * 쓰던 이름(외무성·예조)으로 고치는 일은 자리를 보고 있는 이 자리에서 일어난다.
 */
function DepartmentSlot({
  name,
  occupant,
  onRegister,
  onOpenPerson,
  onDelete,
  editing,
  renameValue,
  renaming,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
}: {
  name: string
  /** 이 부처에 등록된 사람(가장 최근 재임). 없으면 '아직 없음' */
  occupant?: {
    personId: string | null
    name: string
    period: string
    count: number
  } | null
  onRegister: () => void
  onOpenPerson: (personId: string) => void
  onDelete: () => void
  editing: boolean
  renameValue: string
  renaming: boolean
  onRenameStart: () => void
  onRenameChange: (value: string) => void
  onRenameCommit: () => void
  onRenameCancel: () => void
}) {
  if (editing) {
    return (
      <SlotShell>
        <SlotRenameForm
          onSubmit={(event) => {
            event.preventDefault()
            onRenameCommit()
          }}
        >
          <RenameInput
            autoFocus
            value={renameValue}
            disabled={renaming}
            onChange={(event) => onRenameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                onRenameCancel()
              }
            }}
            aria-label={`${name} 새 이름`}
          />
          <SlotIconButton
            type="submit"
            disabled={renaming || !renameValue.trim()}
            aria-label="이름 저장"
            title="저장"
          >
            <FiCheck size={13} />
          </SlotIconButton>
          <SlotIconButton
            type="button"
            $danger
            onClick={onRenameCancel}
            aria-label="이름 변경 취소"
            title="취소"
          >
            <FiX size={13} />
          </SlotIconButton>
        </SlotRenameForm>
      </SlotShell>
    )
  }
  /*
   * 사람이 있으면 칸을 누르는 뜻이 '등록'에서 '보기'로 바뀐다 — 이미 채워진 자리에서
   * 먼저 하고 싶은 일은 그 사람을 보는 것이다. 한 명 더 넣는 건 우측 + 버튼.
   */
  const filled = !!occupant
  return (
    <SlotShell>
      <SlotMain
        type="button"
        onClick={() =>
          filled && occupant?.personId
            ? onOpenPerson(occupant.personId)
            : onRegister()
        }
      >
        <SlotTitle>{name}</SlotTitle>
        {filled ? (
          <SlotOccupant>
            {occupant?.name}
            {occupant?.period ? ` · ${occupant.period}` : ''}
            {occupant && occupant.count > 1 ? ` 외 ${occupant.count - 1}명` : ''}
          </SlotOccupant>
        ) : (
          <SlotEmptyName>아직 없음</SlotEmptyName>
        )}
        <SlotAdd>{filled ? '보기' : '+ 등록'}</SlotAdd>
      </SlotMain>
      <SlotActions>
        {filled && (
          <SlotIconButton
            type="button"
            onClick={onRegister}
            aria-label={`${name} 인물 추가 등록`}
            title="이 부처에 한 명 더 등록"
          >
            <FiPlus size={13} />
          </SlotIconButton>
        )}
        <SlotIconButton
          type="button"
          onClick={onRenameStart}
          aria-label={`${name} 이름 바꾸기`}
          title="이름 바꾸기"
        >
          <FiEdit2 size={12} />
        </SlotIconButton>
        <SlotIconButton
          type="button"
          $danger
          onClick={onDelete}
          aria-label={`${name} 삭제`}
          title="부처 삭제"
        >
          <FiX size={13} />
        </SlotIconButton>
      </SlotActions>
    </SlotShell>
  )
}

/**
 * 부처 이름의 **틀**을 고르고, 그 틀에서 아직 없는 자리를 칩으로 담는다.
 *
 * 나라마다 같은 자리를 다르게 부른다 — 일본 제국은 외무성·내무성(우두머리는 대신),
 * 조선은 이조·호조(판서). 기본은 '부'이되 다른 틀로 갈아끼울 수 있어야, 일본 지면을
 * 만드는 사람이 권유를 통째로 지우고 손으로 다시 치지 않는다.
 */
function DepartmentFramePicker({
  frame,
  suggestions,
  disabled,
  onChangeFrame,
  onAdd,
}: {
  frame: DepartmentNameFrame
  suggestions: DepartmentFrameItem[]
  disabled: boolean
  onChangeFrame: (frameId: string) => void
  onAdd: (items: DepartmentFrameItem[]) => void
}) {
  return (
    <PresetBlock>
      <PresetLabel>
        기본 틀에서 고르기
        <FrameSelect
          value={frame.id}
          disabled={disabled}
          onChange={(event) => onChangeFrame(event.target.value)}
          aria-label="부처 명칭 틀"
        >
          {DEPARTMENT_NAME_FRAMES.map((row) => (
            <option key={row.id} value={row.id}>
              {row.label}
            </option>
          ))}
        </FrameSelect>
        {suggestions.length > 0 && (
          <PresetAll
            type="button"
            disabled={disabled}
            onClick={() => onAdd(suggestions)}
          >
            {suggestions.length}개 모두 추가
          </PresetAll>
        )}
      </PresetLabel>
      <PresetHint>
        {frame.hint} · 우두머리는 「{frame.headTitle}」 · 담은 뒤 이름은 고칠 수
        있습니다
      </PresetHint>
      {suggestions.length > 0 ? (
        <PresetChips>
          {suggestions.map((item) => (
            <PresetChip
              key={item.slot + item.name}
              type="button"
              disabled={disabled}
              onClick={() => onAdd([item])}
            >
              + {item.name}
            </PresetChip>
          ))}
        </PresetChips>
      ) : (
        <PresetHint>이 틀의 자리는 모두 만들어 두셨습니다.</PresetHint>
      )}
    </PresetBlock>
  )
}

/** 얼굴. 각료는 초상이 거의 없어(실측 15명 전원 없음) 폴백이 기본값에 가깝다. */
function Face({
  member,
  size,
  muted = false,
}: {
  member: Member
  size: number
  /** 각료 줄용 — 폴백이 여러 개 늘어설 때 조용하게 */
  muted?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = member.imageUrl ? getUploadImageUrl(member.imageUrl) : ''
  if (!src || failed) {
    return (
      <FallbackFace
        $muted={muted}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        aria-hidden
      >
        {member.name.slice(0, 1)}
      </FallbackFace>
    )
  }
  return (
    <FaceImage
      src={src}
      alt=""
      loading="lazy"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}

const SkeletonRoot = styled.div<{ $ghost: boolean }>`
  /* 빈 상태에서는 더 옅게 — 데이터인 척하지 않도록 */
  opacity: ${({ $ghost }) => ($ghost ? 0.5 : 1)};
  pointer-events: none;

  /*
   * 빈 상태는 **움직이지 않는다**. 같은 골격이라도 일렁이면 영원히 로딩 중인 화면으로
   * 읽힌다. 움직임 유무가 '불러오는 중'과 '아직 없음'을 가르는 유일한 신호다.
   */
  ${({ $ghost }) =>
    $ghost &&
    `
    *, *::before { animation: none !important; }
  `}
`

const SkeletonHead = styled.div<{ $ghost?: boolean }>`
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 20px;
  margin-bottom: 16px;
  border-radius: 14px;
  /* 점선 = 채워야 할 자리. 실선은 '불러오는 중인 실제 카드'로 읽힌다 */
  border: 1px ${({ $ghost }) => ($ghost ? 'dashed' : 'solid')}
    ${({ theme }) => theme.colors.border.light};
  background: ${({ $ghost, theme }) =>
    $ghost ? 'transparent' : theme.colors.hover};
`

const SkeletonHeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const SkeletonRoster = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0 20px;
`

const SkeletonCell = styled.div`
  display: grid;
  grid-template-columns: 26px 96px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 8px;
`


/*
 * 빈 자리 슬롯. 골격(뼈대)만으로는 "여기에 정부가 온다"까지만 말하고, 무엇을 채워야
 * 하는지는 말하지 못한다. 이미 등록된 부처를 그대로 줄 세우면 그게 곧 할 일 목록이 된다.
 */
const slotBase = `
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border-radius: 10px;
  border: 1px dashed;
  background: none;
  text-align: left;
  cursor: pointer;
`

const EmptySlotHead = styled.button`
  ${slotBase}
  gap: 16px;
  padding: 16px 18px;
  margin-bottom: 18px;
  border-radius: 14px;
  border-color: ${({ theme }) => theme.colors.border.default};

  &:hover {
    border-color: rgba(190, 18, 60, 0.45);
    background: ${({ theme }) => theme.colors.hover};
  }
`

/** 수장 자리의 빈 얼굴 — 실제 얼굴과 같은 지름이라 채워졌을 때와 자리가 어긋나지 않는다 */
const SlotFace = styled.span`
  width: 76px;
  height: 76px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const SlotHeadText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const SlotRole = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#be123c')};
`

const SlotGroupLabel = styled.div`
  width: 100%;
  /* 지도·선거 카드의 바깥 모서리와 같은 축 (가지 560 + 거터 88 + 카드 340) */
  max-width: 1636px;
  margin-inline: auto;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px;
  width: 100%;
  /* 지도·선거 카드의 바깥 모서리와 같은 축 (가지 560 + 거터 88 + 카드 340) */
  max-width: 1636px;
  margin-inline: auto;
`

/* 이름 바꾸기·삭제 — 평소엔 숨긴다. 등록이 주 동작이고, 늘 보이면 실수를 부른다 */
const SlotActions = styled.div`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
`

const SlotShell = styled.div`
  position: relative;
  display: flex;
  min-width: 0;

  &:hover ${SlotActions},
  &:focus-within ${SlotActions} {
    opacity: 1;
  }
`

const SlotMain = styled.button`
  ${slotBase}
  padding: 10px 52px 10px 12px;
  border-color: ${({ theme }) => theme.colors.border.light};

  &:hover {
    border-color: rgba(190, 18, 60, 0.4);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const SlotIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 6px;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ $danger, theme }) =>
      $danger ? '#dc2626' : theme.colors.text.primary};
    background: ${({ $danger, theme }) =>
      $danger ? 'rgba(220, 38, 38, 0.1)' : theme.colors.hover};
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

/* 자리 안에서 이름만 고치는 줄 — 칸 모양을 유지한 채 입력으로 바뀐다 */
const SlotRenameForm = styled.form`
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
`




const DetailKey = styled.dt`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DetailValue = styled.dd`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`


const CandidacyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
`

const CandidacyRow = styled.button`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const CandidacyTop = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
`

const CandidacyFace = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`

const CandidacyShare = styled.span`
  /*
   * 예전엔 margin-left:auto로 행 오른쪽 끝에 붙였다. 카드를 지도 폭에 맞춰 넓히자
   * 이름과 750px 떨어져 서로를 못 찾았다 — 이름 곁에 둔다. 크기는 그대로라 여전히
   * 행에서 가장 큰 숫자다.
   */
  font-size: 13.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ShareTrack = styled.span`
  display: block;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.hover};
  overflow: hidden;
`

const ShareFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 999px;
`

const CandidacyVotes = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CandidacyName = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CandidacyParty = styled.span<{ $muted?: boolean }>`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  ${({ $muted }) =>
    $muted &&
    css`
      font-style: italic;
      opacity: 0.75;
    `}
`

const WonChip = styled.span`
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  background: rgba(22, 163, 74, 0.14);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#4ade80' : '#15803d')};
`


/*
 * 선거를 지면에 편다. 모달로 감췄던 시절엔 정권을 골라도 선거는 이름 한 줄이라,
 * '얼마로 이겼나'를 보려면 한 번 더 눌러야 했다. 정권 옆에 붙어 있어야 할 사실이다.
 */
/**
 * 선거는 지도의 아래 가지다 — 가운데 카드와 같은 곡률·같은 여백을 쓴다.
 * 예전엔 폭 전체를 가로지르는 납작한 띠라 위의 지도와 남남으로 보였다.
 */
const ElectionPanel = styled.section`
  /* 본문 2열 판정은 화면이 아니라 이 카드의 폭으로 한다 */
  container-type: inline-size;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(15,23,42,0.015)'};
`

const ElectionHead = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
`

const ElectionMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 선거 카드 본문 — 좌: 개요(투표일·투표율), 우: 후보 결과.
 *
 * 카드를 지도 폭에 맞춰 넓히자 한 줄짜리 후보 행에서 이름과 득표율이 1,200px 떨어져
 * 서로를 못 찾았다. 개요를 왼쪽에 세우고 결과를 오른쪽에 몰아 거리를 줄인다.
 */
const ElectionBody = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  gap: 14px 36px;
  align-items: start;
  margin-top: 14px;

  > *:first-child {
    grid-column: 1;
  }
  > *:not(:first-child) {
    grid-column: 2;
  }

  @container (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);

    > * {
      grid-column: 1 !important;
    }
  }
`

const ElectionFacts = styled.dl`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px 26px;
  margin: 0;

  @container (min-width: 901px) {
    /* 왼쪽 칸에서는 세로로 쌓인다 — 가로로 늘어놓을 폭이 없다 */
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`

const ElectionFact = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ElectionMore = styled.button`
  margin-left: auto;

  @container (min-width: 901px) {
    /* 세로로 쌓이는 좌측 칸에서는 auto 여백이 글자를 오른쪽으로 밀어낸다 */
    margin-left: 0;
  }
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const ElectionLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ElectionDate = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionMuted = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionLink = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#be123c')};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const ElectionUnlink = styled(ElectionLink)`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CandidacyGap = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ElectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const ElectionOption = styled.button`
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  text-align: left;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
  }

  &:hover:not(:disabled) {
    border-color: rgba(190, 18, 60, 0.4);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const ElectionOptionName = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EmptyArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
`

const SetupCta = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    border-style: solid;
    border-color: rgba(190, 18, 60, 0.4);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const SetupSection = styled.section`
  & + & {
    margin-top: 22px;
    padding-top: 20px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const SetupHeading = styled.h3`
  margin: 0 0 4px;
  font-size: 13.5px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SetupHint = styled.p`
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 틀 선택기 — 칩 줄 위에 붙어 '무엇을 권하는 중인지'를 바꾼다 */
const FrameSelect = styled.select`
  height: 26px;
  max-width: 190px;
  padding: 0 6px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PresetHint = styled.p`
  margin: 0 0 8px;
  font-size: 11.5px;
  line-height: 1.5;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RenameForm = styled.form`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 6px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.active};
  background: ${({ theme }) => theme.colors.background.primary};
`

const RenameInput = styled.input`
  width: 124px;
  min-width: 0;
  flex: 1;
  height: 22px;
  padding: 0 4px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  font-weight: 600;

  &:focus {
    outline: none;
  }
`

const RenameConfirm = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border: none;
  border-radius: 50%;
  background: none;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#4ade80' : '#16a34a')};
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: rgba(22, 163, 74, 0.12);
  }
`

const MadeChipName = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;

  svg {
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &:hover svg,
  &:focus-visible svg {
    opacity: 0.7;
  }
`

const MadeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 6px 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MadeChipDelete = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border: none;
  border-radius: 50%;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.12);
  }
`

const PresetBlock = styled.div`
  margin-top: 10px;
`

const PresetLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PresetAll = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#be123c')};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    text-decoration: underline;
  }
`


const PresetChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PresetChip = styled.button`
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    border-style: solid;
    border-color: rgba(190, 18, 60, 0.4);
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SlotGridFooter = styled.div`
  margin-top: 8px;
`

const SlotTitle = styled.span`
  /* 이름이 길면 이름이 줄어든다 — 옆의 '아직 없음'이 두 글자씩 접히는 것보다 낫다 */
  flex: 1;
  min-width: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 그 자리에 있는 사람 — '아직 없음' 자리를 대신한다 */
const SlotOccupant = styled.span`
  flex-shrink: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SlotEmptyName = styled.span`
  flex-shrink: 0;
  font-size: 12px;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SlotAdd = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#be123c')};
`

const EmptyActions = styled.div`
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`

const EmptyActionsText = styled.p`
  margin: 0 0 12px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`

const NewDeptForm = styled.form`
  display: flex;
  align-items: center;
  gap: 6px;
`

const NewDeptInput = styled.input`
  height: 32px;
  width: 200px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12.5px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const NewDeptSubmit = styled.button`
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const GhostCaption = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 10px;
  padding: 7px 12px;
  border-radius: 9px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 14px;
    height: 14px;
  }
`

const CabinetName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
`

const HeaderAction = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(225, 29, 72, 0.3);
  background: rgba(225, 29, 72, 0.07);
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fb7185' : '#be123c')};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(225, 29, 72, 0.14);
  }
`

/** 관리(지면 이동)는 보조 — 주 동작은 바로 등록이다 */




const faceBase = `
  border-radius: 50%;
  flex-shrink: 0;
`

const FaceImage = styled.img`
  ${faceBase}
  object-fit: cover;
  object-position: center 22%;
  background: ${({ theme }) => theme.colors.hover};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FallbackFace = styled.span<{ $muted?: boolean }>`
  ${faceBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /*
   * 글자 크기는 호출부가 원 지름과 함께 넘긴다. cqw로 잡아 봤더니 컨테이너 쿼리 단위는
   * 자기 자신이 아니라 **조상 컨테이너** 기준이라, 컨테이너가 없으면 뷰포트로 폴백해
   * 글자가 터무니없이 커진다.
   */
  font-weight: 700;
  background: ${({ theme }) => theme.colors.hover};
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeadName = styled.span`
  display: block;
  margin-top: 2px;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeadMeta = styled.span`
  display: block;
  margin-top: 5px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/* 카드가 하나(선거)뿐일 때 전폭으로 늘어나지 않게 — 빈 줄이면 자연폭으로 접힌다 */
/* 지도·선거와 같은 축 — 이 아래 것들이 좌측에 홀로 붙으면 그림이 어긋난다 */
const Extra = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  width: 100%;
  /* 지도·선거 카드의 바깥 모서리와 같은 축 (가지 560 + 거터 88 + 카드 340) */
  max-width: 1636px;
  margin-inline: auto;

  > * {
    max-width: 320px;
  }
`
