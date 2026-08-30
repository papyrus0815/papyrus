import React, { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { getUploadImageUrl } from '@/shared/api/upload'
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

  const replacedCount = members.filter((member) => member.replaced).length
  // 16명까지는 접지 않는다. 각료 15명짜리 정부를 9명에서 끊으면 '한눈에'가 아니다
  const visible = expanded ? members : members.slice(0, 16)

  if (query.isLoading) return null

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
        <HeaderAction type="button" onClick={onOpen}>
          행정부 관리
        </HeaderAction>
      </S.SectionTitleRow>

      {isEmpty ? (
        <S.EmptyWithCta>
          <S.FeedEmpty>현재 재임 중인 수반·각료가 없습니다.</S.FeedEmpty>
          <S.EmptyCtaButton type="button" onClick={onOpen}>
            <IconBriefcase />
            역대 수반에서 등록
          </S.EmptyCtaButton>
        </S.EmptyWithCta>
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
              <Face member={head} size={heads.length === 1 ? 76 : 60} />
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

/** 얼굴. 각료는 초상이 거의 없어(실측 15명 전원 없음) 폴백이 기본값에 가깝다. */
function Face({ member, size }: { member: Member; size: number }) {
  const [failed, setFailed] = useState(false)
  const src = member.imageUrl ? getUploadImageUrl(member.imageUrl) : ''
  if (!src || failed) {
    return (
      <FallbackFace style={{ width: size, height: size }} aria-hidden>
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

const CabinetName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeaderAction = styled.button`
  margin-left: auto;
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

const FallbackFace = styled.span`
  ${faceBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
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
  font-size: 26px;
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

const Roster = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
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
