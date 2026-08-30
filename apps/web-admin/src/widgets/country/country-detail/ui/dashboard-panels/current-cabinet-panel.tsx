import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { getAllPersons } from '@/shared/api/persons'
import { getUploadImageUrl } from '@/shared/api/upload'
import { PersonSelectModal } from '@/shared/ui/person-select-modal/person-select-modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel/tenure-register-panel'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface Props {
  countryId: string
  /** 행정부 이름 — '트럼프 2기 행정부' */
  cabinetName: string | null
  /** 정부 출범일(수반 취임일) */
  startDate: string | null
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
  cabinetName,
  startDate,
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

  const personsQuery = useQuery({
    queryKey: ['persons', 'all'],
    queryFn: getAllPersons,
    enabled: pickerOpen,
    staleTime: 5 * 60_000,
  })

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
    const rows = (query.data ?? []) as TenureRow[]
    const governmentStart = startDate ? new Date(startDate).getTime() : null

    /** 이 정부에 속한 재임인가 — 출범일 이후 시작했으면 이번 정부 */
    const inThisGovernment = (row: TenureRow) => {
      if (governmentStart == null) return true
      const rowStart = row.startDate ? new Date(row.startDate).getTime() : null
      return rowStart != null && rowStart >= governmentStart
    }

    const scoped = rows.filter(inThisGovernment)

    // 자리별로 모아 앞사람을 찾는다 (교체 표시용)
    const byTitle = new Map<string, TenureRow[]>()
    for (const row of scoped) {
      const title = (row.title ?? row.positionDefinition?.title ?? '').trim()
      if (!title) continue
      const list = byTitle.get(title) ?? []
      list.push(row)
      byTitle.set(title, list)
    }

    const mapped: Member[] = []
    for (const [title, list] of byTitle) {
      const current = list.find((row) => !row.endDate)
      if (!current) continue
      const earlier = list
        .filter((row) => row.endDate && row.id !== current.id)
        .sort((left, right) =>
          (right.endDate ?? '').localeCompare(left.endDate ?? ''),
        )[0]
      mapped.push({
        id: String(current.id),
        personId: current.personId ?? null,
        name: current.person ? getPersonDisplayName(current.person) : '이름 미상',
        imageUrl: current.person?.profileImageUrl ?? null,
        title,
        startDate: current.startDate ?? null,
        isHead: HEAD_TYPES.has(
          current.positionType ?? current.positionDefinition?.positionType ?? '',
        ),
        termNumber:
          typeof current.termNumber === 'number' ? current.termNumber : null,
        replaced: !!earlier,
        predecessor: earlier?.person
          ? getPersonDisplayName(earlier.person)
          : null,
      })
    }

    // 수반이 맨 앞, 나머지는 취임 순(먼저 임명된 자리가 위)
    mapped.sort((left, right) => {
      if (left.isHead !== right.isHead) return left.isHead ? -1 : 1
      return (left.startDate ?? '').localeCompare(right.startDate ?? '')
    })

    return {
      members: mapped.filter((member) => !member.isHead),
      // 국가원수와 정부수반이 따로인 나라(대통령+총리)가 있어 배열로 받는다
      heads: mapped.filter((member) => member.isHead),
    }
  }, [query.data, startDate])

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
        <S.SectionTitleText>지금</S.SectionTitleText>
        {!isEmpty && <CabinetName>{cabinetName ?? '현 정부'}</CabinetName>}
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

      {query.isLoading ? (
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
                  <EmptySlot
                    key={department.id}
                    type="button"
                    onClick={() =>
                      openRegister(department.id, department.name)
                    }
                  >
                    <SlotTitle>{department.name}</SlotTitle>
                    <SlotEmptyName>아직 없음</SlotEmptyName>
                    <SlotAdd>+ 등록</SlotAdd>
                  </EmptySlot>
                ))}
              </SlotGrid>
            </>
          ) : (
            <GhostCaption as="div">
              <IconBriefcase />
              등록된 부처가 없습니다 — 「행정조직 → 중앙부처」에서 부처를 먼저 만들면
              여기에 자리별 등록 칸이 생깁니다
            </GhostCaption>
          )}
        </>
      ) : (
        <>
      <MetaRow>
        {startDate && <Meta>{shortDate(startDate)} 출범</Meta>}
        <Meta>각료 {members.length}명</Meta>
        {replacedCount > 0 && (
          <MetaWarn title="이 정부 임기 중에 사람이 바뀐 자리">
            {replacedCount}자리 교체
          </MetaWarn>
        )}
      </MetaRow>

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
                    {elapsedText(head.startDate) &&
                      ` · ${elapsedText(head.startDate)}`}
                  </HeadMeta>
                )}
              </HeadText>
            </HeadRow>
          ))}
        </HeadRowGroup>
      )}

      {members.length > 0 && (
        <>
          <Roster>
            {visible.map((member) => (
              <MemberCell
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
                <Face member={member} size={26} muted />
                <CellTitle>{member.title}</CellTitle>
                <CellName>
                  {member.name}
                  {member.replaced && <Swap aria-label="임기 중 교체">↻</Swap>}
                </CellName>
              </MemberCell>
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

const EmptySlot = styled.button`
  ${slotBase}
  padding: 10px 12px;
  border-color: ${({ theme }) => theme.colors.border.light};

  &:hover {
    border-color: rgba(190, 18, 60, 0.4);
    background: ${({ theme }) => theme.colors.hover};
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0 20px;
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
const MemberCell = styled.button<{ $replaced?: boolean }>`
  display: grid;
  grid-template-columns: 26px 96px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border: none;
  border-left: 2px solid
    ${({ $replaced }) => ($replaced ? 'rgba(180,83,9,0.55)' : 'transparent')};
  border-radius: 0 8px 8px 0;
  background: none;
  text-align: left;
  cursor: pointer;
  min-width: 0;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

/** 자리가 스캔의 축 — 이름보다 먼저 읽힌다 */
const CellTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CellName = styled.span`
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
