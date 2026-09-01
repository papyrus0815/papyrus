import React, { useEffect, useMemo, useRef, useState } from 'react'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { Modal, ModalBody } from '@/shared/ui/modal'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'

import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface Props {
  countryId: string
  onOpen: () => void
  /** 모달의 '전체 보기'에서 인물 지면으로 나갈 때 */
  onSelectPerson: (personId: string) => void
  /** 같은 '지금' 묶음에 함께 놓을 것(선거 카드 등) */
  children?: React.ReactNode
}

interface Member {
  id: string
  personId: string | null
  name: string
  imageUrl: string | null
  title: string
  startDate: string | null
  isHead: boolean
  /** 종료일. 있으면 지난 정권이라 '몇 년째'가 아니라 기간으로 적는다 */
  endDate: string | null
  /** 제47대 — 없으면 null */
  termNumber: number | null
  /** 이 정부 임기 중에 앞사람을 이어받았는가 */
  replaced: boolean
  /** 그 자리를 앞서 맡았던 사람 */
  predecessor: string | null
}

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

/**
 * 기본 행정부처 틀.
 *
 * 근대 국가라면 대개 갖는 자리들이다. 나라마다 이름과 구성이 다르지만(내무부가 없는
 * 나라, 식민부가 있던 시대) **처음 한 칸도 없이 시작하는 것보다 골라 담는 편이 빠르다**.
 * 그래서 통째로 넣지 않고 칩으로 늘어놓아 필요한 것만 고르게 한다.
 */
const DEFAULT_DEPARTMENTS = [
  '외무부',
  '국방부',
  '재무부',
  '법무부',
  '내무부',
  '교육부',
  '보건부',
  '노동부',
  '산업부',
  '농업부',
  '교통부',
  '문화부',
  '환경부',
]

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
  onSelectPerson,
  children,
}: Props) {
  const [expanded, setExpanded] = useState(false)
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
  const stripRef = useRef<HTMLDivElement>(null)
  /** 좌우 끝에 닿았는지 — 갈 곳 없는 화살표는 숨긴다 */
  const [edges, setEdges] = useState({ start: true, end: true })

  const syncEdges = () => {
    const node = stripRef.current
    if (!node) return
    const maxScroll = node.scrollWidth - node.clientWidth
    setEdges({
      start: node.scrollLeft <= 1,
      end: node.scrollLeft >= maxScroll - 1,
    })
  }

  /** 카드 한 장 + 간격만큼 민다 — 반 장이 걸치지 않도록 스냅과 보폭을 맞춘다 */
  const slide = (direction: -1 | 1) => {
    const node = stripRef.current
    if (!node) return
    const card = node.querySelector('[role="tab"]') as HTMLElement | null
    const step = (card?.offsetWidth ?? 132) + 8
    node.scrollBy({ left: direction * step * 2, behavior: 'smooth' })
  }

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

  useEffect(() => {
    syncEdges()
    // 카드 수가 바뀌면 스크롤 폭도 바뀐다
  }, [cabinets.length])

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
  const [newDepartmentName, setNewDepartmentName] = useState('')
  const [creatingDepartment, setCreatingDepartment] = useState(false)

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

  /** 기본 틀에서 아직 없는 것만 — 이미 만든 부처를 또 권하지 않는다 */
  const presetSuggestions = useMemo(() => {
    const existing = new Set(
      (departmentsQuery.data ?? []).map((department) =>
        department.name.replace(/\s/g, ''),
      ),
    )
    return DEFAULT_DEPARTMENTS.filter(
      (preset) =>
        ![...existing].some((name) => name.includes(preset.replace(/\s/g, ''))),
    )
  }, [departmentsQuery.data])

  const addPresets = async (names: string[]) => {
    setCreatingDepartment(true)
    try {
      // 순차 생성 — 서버가 이름 중복을 막을 수 있어 한 건씩 결과를 본다
      for (const name of names) {
        await administrationDepartmentApi.create({ name, countryId })
      }
      await invalidateDepartments()
      notify.success(`부처 ${names.length}개가 만들어졌습니다`)
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
  const isIncumbentCabinet = (cabinet: (typeof cabinets)[number]) =>
    !cabinet.headTenure?.endDate

  const departments = departmentsQuery.data ?? []
  const replacedCount = members.filter((member) => member.replaced).length
  // 16명까지는 접지 않는다. 각료 15명짜리 정부를 9명에서 끊으면 '한눈에'가 아니다
  const visible = expanded ? members : members.slice(0, 16)

  /*
   * 현직이 없어도 섹션을 지우지 않는다. null을 돌려주던 시절엔 프랑스·독일처럼 재임이
   * 전부 종료된 나라에서 선거 카드와 '수반 등록' 진입점까지 함께 사라졌다.
   */
  const isEmpty = heads.length === 0 && members.length === 0

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="rose">
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
          <HeaderAction
            type="button"
            onClick={() => openRegister(null, '수반·각료')}
          >
            + 수반·각료 등록
          </HeaderAction>
          <HeaderGhost type="button" onClick={onOpen}>
            행정부 관리
          </HeaderGhost>
        </HeaderActions>
      </S.SectionTitleRow>

      {/*
       * 행정부 카드 슬라이더. 대시보드가 '현 정부' 하나만 보여주면 그 나라의 정권 교체가
       * 화면에 없다. 카드를 옆으로 밀어 고르면 아래 명단이 그 정권 것으로 바뀐다.
       * 최신이 왼쪽 — 첫 질문은 늘 '지금'이다.
       */}
      {cabinets.length > 0 && (
        <Carousel>
          {!edges.start && (
            <CarouselArrow
              type="button"
              $side="left"
              aria-label="이전 행정부 보기"
              onClick={() => slide(-1)}
            >
              <FiChevronLeft size={18} />
            </CarouselArrow>
          )}
          <CabinetStrip
            ref={stripRef}
            role="tablist"
            aria-label="행정부 선택"
            onScroll={syncEdges}
          >
          {cabinets.map((cabinet) => {
            const active = cabinet.id === selectedCabinetId
            return (
              <CabinetCard
                key={cabinet.id}
                type="button"
                role="tab"
                aria-selected={active}
                $active={active}
                onClick={() => setSelectedCabinetId(cabinet.id)}
                title={`${cabinetLabel(cabinet)} · ${cabinetPeriod(cabinet)}`}
              >
                <CabinetCardFace>
                  {cabinet.headTenure?.person?.profileImageUrl ? (
                    <FaceImage
                      src={getUploadImageUrl(
                        cabinet.headTenure.person.profileImageUrl,
                      )}
                      alt=""
                      loading="lazy"
                      style={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <FallbackFace
                      style={{ width: 40, height: 40, fontSize: 14 }}
                      aria-hidden
                    >
                      {cabinetLabel(cabinet).slice(0, 1)}
                    </FallbackFace>
                  )}
                  {isIncumbentCabinet(cabinet) && <CabinetNow>현</CabinetNow>}
                </CabinetCardFace>
                <CabinetCardName>{cabinetLabel(cabinet)}</CabinetCardName>
                <CabinetCardPeriod>{cabinetPeriod(cabinet)}</CabinetCardPeriod>
              </CabinetCard>
            )
          })}
          </CabinetStrip>
          {!edges.end && (
            <CarouselArrow
              type="button"
              $side="right"
              aria-label="다음 행정부 보기"
              onClick={() => slide(1)}
            >
              <FiChevronRight size={18} />
            </CarouselArrow>
          )}
        </Carousel>
      )}

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
                    onRegister={() =>
                      openRegister(department.id, department.name)
                    }
                    onDelete={() =>
                      void removeDepartment(department.id, department.name)
                    }
                  />
                ))}
              </SlotGrid>
            </>
          ) : (
<SetupCta type="button" onClick={() => setSetupOpen(true)}>
            <IconBriefcase />
            각료 등록
          </SetupCta>
          )}
        </>
      ) : (
        <>
      {heads.length > 0 && (
        <HeadRowGroup $single={heads.length === 1}>
          {heads.map((head) => (
            <HeadRow
              key={head.id}
              type="button"
              onClick={() => head.personId && setModalPersonId(head.personId)}
            >
              <HeadFaceRing>
                <Face member={head} size={heads.length === 1 ? 104 : 80} />
              </HeadFaceRing>
              <HeadText>
                <HeadRole>
                  {head.termNumber != null && `제${head.termNumber}대 `}
                  {head.title}
                </HeadRole>
                <HeadName>{head.name}</HeadName>
                {head.startDate && (
                  <HeadMeta>
                    {shortDate(head.startDate)} 취임
                    {head.endDate
                      ? ` · ${shortDate(head.endDate)} 퇴임`
                      : elapsedText(head.startDate) &&
                        ` · ${elapsedText(head.startDate)}`}
                  </HeadMeta>
                )}
              </HeadText>
            </HeadRow>
          ))}
        </HeadRowGroup>
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
                  onRegister={() => openRegister(department.id, department.name)}
                  onDelete={() =>
                    void removeDepartment(department.id, department.name)
                  }
                />
              ))}
            </SlotGrid>
          </>
        ) : (
<SetupCta type="button" onClick={() => setSetupOpen(true)}>
            <IconBriefcase />
            각료 등록
          </SetupCta>
        )
      ) : (
        <>
          {/*
            * 교체 수는 각료에 대한 사실이라 각료 줄에 붙인다. 수반 블록 우측에 띄웠더니
            * 수반 옆 빈 공간에 홀로 떠 어느 대상의 수치인지 흐릿했다.
            */}
          <RosterLabel>
            <SlotGroupLabel as="span">각료 {members.length}명</SlotGroupLabel>
            {replacedCount > 0 && (
              <MetaWarn title="이 정권 임기 중에 사람이 바뀐 자리">
                {replacedCount}자리 교체
              </MetaWarn>
            )}
          </RosterLabel>
          <Roster>
            {visible.map((member) => (
              <MemberCard
                key={member.id}
                type="button"
                $replaced={member.replaced}
                onClick={() =>
                  member.personId && setModalPersonId(member.personId)
                }
                title={
                  member.replaced && member.predecessor
                    ? `${member.predecessor} 후임 · ${shortDate(member.startDate)} 취임`
                    : `${shortDate(member.startDate)} 취임`
                }
              >
                <Face member={member} size={34} muted />
                <CardText>
                  <CellTitle>{member.title}</CellTitle>
                  <CellName>
                    {member.name}
                    {member.replaced && <Swap aria-label="임기 중 교체">↻</Swap>}
                  </CellName>
                </CardText>
              </MemberCard>
            ))}
          </Roster>
          {members.length > visible.length && (
            <MoreLink type="button" onClick={() => setExpanded(true)}>
              나머지 {members.length - visible.length}명 더 보기
            </MoreLink>
          )}
        </>
      )}
        </>
      )}

      {children && <Extra>{children}</Extra>}

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
                placeholder="새 부처 이름 (예: 외무부)"
                aria-label="새 부처 이름"
              />
              <NewDeptSubmit
                type="submit"
                disabled={!newDepartmentName.trim() || creatingDepartment}
              >
                만들기
              </NewDeptSubmit>
            </NewDeptForm>

            {presetSuggestions.length > 0 && (
              <PresetBlock>
                <PresetLabel>
                  기본 틀에서 고르기
                  <PresetAll
                    type="button"
                    disabled={creatingDepartment}
                    onClick={() => void addPresets(presetSuggestions)}
                  >
                    {presetSuggestions.length}개 모두 추가
                  </PresetAll>
                </PresetLabel>
                <PresetChips>
                  {presetSuggestions.map((preset) => (
                    <PresetChip
                      key={preset}
                      type="button"
                      disabled={creatingDepartment}
                      onClick={() => void addPresets([preset])}
                    >
                      + {preset}
                    </PresetChip>
                  ))}
                </PresetChips>
              </PresetBlock>
            )}

            {departments.length > 0 && (
              <PresetBlock>
                <PresetLabel>만들어 둔 부처 {departments.length}개</PresetLabel>
                <PresetChips>
                  {departments.map((department) => (
                    <MadeChip key={department.id}>
                      {department.name}
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
                  ))}
                </PresetChips>
              </PresetBlock>
            )}
          </SetupSection>
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
 * 빈 부처 자리 한 칸. 등록(주 동작)과 삭제(✕)를 **형제 버튼**으로 둔다 —
 * 칸 전체를 버튼으로 만들고 그 안에 ✕를 넣으면 버튼 안 버튼이라 HTML이 깨진다.
 */
function DepartmentSlot({
  name,
  onRegister,
  onDelete,
}: {
  name: string
  onRegister: () => void
  onDelete: () => void
}) {
  return (
    <SlotShell>
      <SlotMain type="button" onClick={onRegister}>
        <SlotTitle>{name}</SlotTitle>
        <SlotEmptyName>아직 없음</SlotEmptyName>
        <SlotAdd>+ 등록</SlotAdd>
      </SlotMain>
      <SlotDelete
        type="button"
        onClick={onDelete}
        aria-label={`${name} 삭제`}
        title="부처 삭제"
      >
        <FiX size={13} />
      </SlotDelete>
    </SlotShell>
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

/** 캐러셀 — 좌우 화살표가 띠 위에 겹쳐 떠 있다 */
const Carousel = styled.div`
  position: relative;
  margin-bottom: 16px;
`

const CarouselArrow = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: calc(50% - 6px);
  ${({ $side }) => ($side === 'left' ? 'left: -6px;' : 'right: -6px;')}
  transform: translateY(-50%);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.14);
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/*
 * 가로로 미는 정권 카드 띠. 스냅을 걸어 카드가 반쯤 걸친 채 멈추지 않게 한다 —
 * 화살표 보폭도 카드+간격의 배수라 스냅과 어긋나지 않는다.
 */
const CabinetStrip = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

const CabinetCard = styled.button<{ $active: boolean }>`
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  width: 132px;
  padding: 12px 10px;
  border-radius: 12px;
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? 'rgba(190,18,60,0.5)' : theme.colors.border.light};
  background: ${({ $active, theme }) =>
    $active ? 'rgba(190,18,60,0.07)' : theme.colors.background.primary};
  cursor: pointer;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? 'rgba(190,18,60,0.1)' : theme.colors.hover};
  }
`

const CabinetCardFace = styled.span`
  position: relative;
  display: inline-flex;
`

/** 현직 표시 — 카드 띠에서 '지금'이 어느 것인지 즉시 보이게 */
const CabinetNow = styled.span`
  position: absolute;
  right: -4px;
  bottom: -2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #15803d;
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  border: 2px solid ${({ theme }) => theme.colors.background.primary};
`

const CabinetCardName = styled.span`
  max-width: 100%;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: keep-all;
`

const CabinetCardPeriod = styled.span`
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

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
  color: #be123c;
`

const SlotGroupLabel = styled.div`
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
`

const SlotShell = styled.div`
  position: relative;
  display: flex;
  min-width: 0;

  /* 삭제는 평소엔 숨긴다 — 등록이 주 동작이고 삭제가 늘 보이면 실수를 부른다 */
  &:hover button:last-child,
  &:focus-within button:last-child {
    opacity: 1;
  }
`

const SlotMain = styled.button`
  ${slotBase}
  padding: 10px 30px 10px 12px;
  border-color: ${({ theme }) => theme.colors.border.light};

  &:hover {
    border-color: rgba(190, 18, 60, 0.4);
    background: ${({ theme }) => theme.colors.hover};
  }
`

const SlotDelete = styled.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 6px;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: 0;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }
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

const MadeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 6px 5px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  font-size: 11.5px;
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
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PresetLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PresetAll = styled.button`
  border: none;
  background: none;
  padding: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #be123c;
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
  font-size: 11.5px;
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

const SlotTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SlotEmptyName = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SlotAdd = styled.span`
  margin-left: auto;
  flex-shrink: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #be123c;
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
  color: #be123c;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(225, 29, 72, 0.14);
  }
`

/** 관리(지면 이동)는 보조 — 주 동작은 바로 등록이다 */
const HeaderGhost = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-bottom: 12px;
`

const Meta = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MetaWarn = styled(Meta)`
  font-weight: 700;
  color: #b45309;
`

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

/** 국가원수·정부수반이 따로인 나라는 나란히. 하나뿐이면 폭을 다 쓴다 */
const HeadRowGroup = styled.div<{ $single: boolean }>`
  display: grid;
  grid-template-columns: ${({ $single }) =>
    $single ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))'};
  gap: 10px;
  margin-bottom: 16px;
`

/*
 * 이 지면의 주어는 수장이다. 각료 15명이 조밀한 격자로 깔리는 만큼 수장이 그 위에서
 * 확실히 커야 "지금 이 나라는 누구"가 먼저 읽힌다. 초상 76px · 이름 26px.
 */
const HeadRow = styled.button`
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-left: 4px solid #be123c;
  background: ${({ theme }) => theme.colors.hover};
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: rgba(190, 18, 60, 0.4);
  }
`

/*
 * 얼굴을 띄운다. 76px 원이 옅은 회색 블록 위에 평평하게 얹혀 있어 26px 이름에 밀렸다.
 * 104px로 키우고 흰 테 + 크림슨 링 + 그림자를 줘 지면에서 한 겹 떠오르게 한다.
 * 링 색은 좌측 4px 띠·직함 색과 같은 계열이라 블록이 하나의 덩어리로 읽힌다.
 */
const HeadFaceRing = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  border-radius: 50%;
  padding: 3px;
  background: ${({ theme }) => theme.colors.background.primary};
  box-shadow:
    0 0 0 2px rgba(190, 18, 60, 0.55),
    0 6px 18px rgba(15, 23, 42, 0.16);

  img,
  span {
    border: none;
  }
`

/** 직함이 이름 위에 온다 — '제47대 대통령'이 먼저, 사람 이름이 그 다음 */
const HeadRole = styled.span`
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #be123c;
`

const HeadText = styled.span`
  min-width: 0;
`

const RosterLabel = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
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

/* 얼굴 26 + 자리 96 + 이름 — 3열이 유지되도록 최소폭을 계산해 둔다(3×280+40 < 960) */
const Roster = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 10px;
`

/*
 * 한 줄에 자리와 사람. 예전엔 30px 아바타 + 두 줄(자리 위, 이름 아래)이었는데,
 * **각료 초상은 실측 15명 전원이 없어** 회색 원에 첫 글자만 뜨는 자리 낭비였고
 * (가로 39px × 15개), 두 줄 조판은 세로로 훑을 때 한 항목마다 두 줄을 건너뛰게 했다.
 *
 * 자리 열을 고정폭으로 세우면 '국무장관·국방장관·재무장관'이 세로로 정렬돼 스캔축이 선다.
 * 행 높이는 절반이 되고 같은 폭에 더 많이 들어간다. 수반 줄의 초상은 그대로 둔다 —
 * 거긴 실제로 사진이 있고, 한 명뿐이라 정렬을 깨지 않는다.
 */
/*
 * 각료 한 명 = 카드 한 장. 직전엔 테두리 없는 줄이라 명단이 정보 밀도는 높아도
 * 행정부 카드 슬라이더와 재질이 달라 한 지면으로 안 읽혔다. 카드로 맞춘다.
 *
 * 다만 카드 안에서도 **직위가 이름 위**다. 스캔의 축은 '누구'가 아니라 '어느 자리'이고,
 * 그건 줄이든 카드든 바뀌지 않는다.
 */
const MemberCard = styled.button<{ $replaced?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  /* 임기 중 교체된 자리는 좌측 띠로 — 카드에서도 한 줄로 훑어 찾을 수 있게 */
  border-left: 3px solid
    ${({ $replaced, theme }) =>
      $replaced ? 'rgba(180,83,9,0.6)' : theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  text-align: left;
  cursor: pointer;
  min-width: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    border-color: rgba(190, 18, 60, 0.35);
  }
`

const CardText = styled.span`
  min-width: 0;
`

/** 자리가 스캔의 축 — 이름보다 먼저 읽힌다 */
const CellTitle = styled.span`
  display: block;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CellName = styled.span`
  display: block;
  margin-top: 1px;
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Swap = styled.span`
  margin-left: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #b45309;
`

/* 카드가 하나(선거)뿐일 때 전폭으로 늘어나지 않게 — 빈 줄이면 자연폭으로 접힌다 */
const Extra = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;

  > * {
    max-width: 320px;
  }
`

const MoreLink = styled.button`
  margin-top: 8px;
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
