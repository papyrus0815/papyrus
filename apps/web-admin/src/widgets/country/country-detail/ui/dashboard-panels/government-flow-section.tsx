import { useEffect, useMemo, useRef, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { usePoliticalSystems } from '@/entities/political-system/api'
import {
  comparePoliticalSystems,
  formatPeriod,
  GOVERNMENT_FORM_LABEL,
  toSignedYear,
  type GovernmentForm,
} from '@/entities/political-system/model/political-system'
import { getUploadImageUrl } from '@/shared/api/upload'
import { personCareerApi } from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'

import { IconGlobe } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface Props {
  countryId: string
  countryName: string
}

/** 정부 형태별 색 — 왕정 계열은 따뜻한 쪽, 공화정 계열은 차가운 쪽 */
const FORM_COLOR: Record<GovernmentForm, string> = {
  ABSOLUTE_MONARCHY: '#b45309',
  CONSTITUTIONAL_MONARCHY: '#d97706',
  MILITARY: '#7f1d1d',
  ONE_PARTY: '#9f1239',
  THEOCRACY: '#7c3aed',
  PROVISIONAL: '#78716c',
  PRESIDENTIAL: '#2563eb',
  SEMI_PRESIDENTIAL: '#0891b2',
  PARLIAMENTARY: '#059669',
  OTHER: '#64748b',
}

/** 이 패널이 실제로 읽는 필드만 — 재임 응답은 40개 키가 넘는다 */
interface TenureRow {
  id: string
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

interface Administration {
  id: string
  /** 현직 줄용 — 전체 이름 */
  personName: string
  /** 칩용 — 96px에 들어가도록 중간이름을 뺀 이름 */
  compactName: string
  imageUrl: string | null
  title: string
  /** 제47대 — 없으면 null */
  termNumber: number | null
  startYear: number | null
  endYear: number | null
  isIncumbent: boolean
  /** 앞 정권과 연도가 끊겼는가 */
  gapBefore: boolean
}

const yearOf = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const matched = /^(-?\d{1,6})-/.exec(iso)
  return matched ? parseInt(matched[1], 10) : null
}

const HEAD_TYPES = new Set(['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'])

/** 96px 칩에 들어갈 만한 길이 */
const COMPACT_NAME_MAX = 9

/**
 * 칩에 쓸 짧은 이름.
 *
 * '앙리 필리프 베노니 오메르 조제프 페탱'은 96px에서 '앙리 필리프 베…'가 되어 누군지
 * 알 수 없다. 이런 이름은 성('페탱')이 오히려 식별력이 높다 — 실제로도 그렇게 불린다.
 *
 * 다만 짧은 이름은 그대로 둔다. 성만 남기면 '이승만'이 '이'가 되어 더 나빠진다.
 * `omitMiddleName` 옵션은 여기서 안 통한다 — 이 이름들은 middleName이 아니라 name
 * 필드에 통째로 들어 있다(실측: 페탱·베트만홀베크 모두).
 */
function toCompactName(person: NonNullable<TenureRow['person']>): string {
  const full = getPersonDisplayName(person)
  if (full.length <= COMPACT_NAME_MAX) return full
  const surname = person.surname?.trim()
  return surname && surname.length > 1 ? surname : full
}

/**
 * 정부 변천 — 이 나라를 **누가 이끌어 왔는지**.
 *
 * 처음엔 정체(대통령제·의원내각제)만 그렸는데, 미국을 열면 "합중국 헌법 체제 1789–현재"
 * 한 칸이라 지금이 트럼프 정권이라는 사실이 어디에도 없었다. 프랑스는 공화국 번호가
 * 정체이자 정권처럼 읽혀 우연히 맞아 보였을 뿐이다.
 *
 * 주축은 **수반 재임**(국가원수·정부수반)이고, 정체는 그 아래 문맥 띠로 내린다.
 * "정부가 어떻게 바뀌어 왔나"의 첫 답은 사람이지 헌법 조문이 아니다.
 */
export function GovernmentFlowSection({ countryId, countryName }: Props) {
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  const tenureQuery = useQuery({
    queryKey: ['tenures-by-country', countryId, undefined],
    queryFn: () => personCareerApi.getTenuresByCountry({ countryId }),
    enabled: !!countryId,
    staleTime: 60_000,
  })
  const systemQuery = usePoliticalSystems({ countryId })

  const administrations = useMemo<Administration[]>(() => {
    // 재임 응답은 SDK 타입이 아니라 apiClient 원시 JSON이라 여기서 최소 형태만 좁힌다
    const rows = (tenureQuery.data ?? []) as TenureRow[]
    const heads = rows.filter((row) =>
      HEAD_TYPES.has(
        row.positionType ?? row.positionDefinition?.positionType ?? '',
      ),
    )

    const mapped = heads
      .map((row) => {
        const startYear = yearOf(row.startDate)
        const endYear = yearOf(row.endDate)
        return {
          id: String(row.id),
          personName: row.person
            ? getPersonDisplayName(row.person)
            : '이름 미상',
          compactName: row.person ? toCompactName(row.person) : '이름 미상',
          imageUrl: row.person?.profileImageUrl ?? null,
          title: (row.title ?? row.positionDefinition?.title ?? '수반').trim(),
          termNumber:
            typeof row.termNumber === 'number' ? row.termNumber : null,
          startYear,
          endYear,
          // 종료일이 없으면 현직 — 다만 시작 연도조차 없으면 판단하지 않는다
          isIncumbent: !row.endDate && startYear != null,
          gapBefore: false,
        }
      })
      .filter((admin) => admin.startYear != null)
      .sort((left, right) => (left.startYear ?? 0) - (right.startYear ?? 0))

    // 같은 사람이 연이어 중임한 구간은 붙여 읽히도록 앞 정권의 종료와 비교만 한다
    return mapped.map((admin, index) => {
      if (index === 0) return admin
      const previousEnd = mapped[index - 1].endYear
      return {
        ...admin,
        gapBefore:
          previousEnd != null &&
          admin.startYear != null &&
          admin.startYear > previousEnd + 1,
      }
    })
  }, [tenureQuery.data])

  /** 정체는 문맥 띠 — 기간이 있는 것만, 오래된 순 */
  const systems = useMemo(() => {
    return [...(systemQuery.data ?? [])]
      .filter((system) => toSignedYear(system.startEra, system.startYear) != null)
      .sort(comparePoliticalSystems)
  }, [systemQuery.data])

  // 첫 질문은 "지금 누가 하고 있나" — 열자마자 최신 쪽이 보이게 끝으로 스크롤한다
  useEffect(() => {
    const node = scrollRef.current
    if (node && administrations.length > 0) {
      node.scrollLeft = node.scrollWidth
    }
  }, [administrations.length])

  const goToHeads = () => navigate(pathKeys.countryGovernment(countryId))

  if (tenureQuery.isLoading) return null

  const title = (
    <S.SectionTitleRow>
      <S.SectionTitleIcon $accent="amber">
        <IconGlobe />
      </S.SectionTitleIcon>
      <S.SectionTitleText>정부 변천</S.SectionTitleText>
      {administrations.length > 0 && (
        <CountChip>{administrations.length}대</CountChip>
      )}
      <HeaderAction type="button" onClick={goToHeads}>
        {administrations.length > 0 ? '수반 관리' : '수반 등록'}
      </HeaderAction>
    </S.SectionTitleRow>
  )

  if (administrations.length === 0 && systems.length === 0) {
    return (
      <S.Section>
        {title}
        <S.EmptyHint>
          등록된 수반이 없습니다. 「행정조직 → 역대 수반」에서 대통령·총리·군주의 임기를
          남기면 {countryName}의 정부가 어떻게 바뀌어 왔는지 한 줄로 보입니다.
        </S.EmptyHint>
      </S.Section>
    )
  }

  const visible = expanded ? administrations : administrations.slice(-12)
  const hiddenCount = administrations.length - visible.length

  return (
    <S.Section>
      {title}

      {/*
       * 현직 강조 블록은 여기 두지 않는다. 바로 위 「지금」이 수반과 각료 명단을 이미
       * 크게 보여주고 있어, 같은 사람이 한 화면에 두 번 나오면 '한눈에'가 흐려진다.
       * 이 지면의 몫은 **역대 흐름**이고, 현직은 트랙 마지막 칩이 초록 테두리로 표시한다.
       */}
      {administrations.length > 0 && (
        <>
          <Track ref={scrollRef} role="list" aria-label="역대 수반">
            {hiddenCount > 0 && (
              <MoreButton type="button" onClick={() => setExpanded(true)}>
                이전 {hiddenCount}대
                <br />
                펼치기
              </MoreButton>
            )}
            {visible.map((admin) => (
              <ChipWrap key={admin.id} role="listitem">
                {admin.gapBefore && <Gap title="기록이 이어지지 않는 구간" />}
                <Chip
                  type="button"
                  onClick={goToHeads}
                  $current={admin.isIncumbent}
                  title={`${admin.personName} · ${admin.title} · ${admin.startYear}–${admin.endYear ?? '현재'}`}
                >
                  <Portrait admin={admin} size={36} />
                  <ChipName>{admin.compactName}</ChipName>
                  <ChipYears>
                    {admin.startYear}–{admin.endYear ?? ''}
                  </ChipYears>
                </Chip>
              </ChipWrap>
            ))}
          </Track>
          <TrackHint>오래된 순 · 가로로 밀어 보세요</TrackHint>
        </>
      )}

      {/* 정체는 문맥 — 정권이 바뀌어도 헌법 체제는 그대로인 경우가 대부분이라 아래로 */}
      {systems.length > 0 && (
        <SystemStrip>
          <SystemLabel>정체</SystemLabel>
          <SystemChips>
            {systems.map((system) => (
              <SystemChip
                key={system.id}
                type="button"
                onClick={goToHeads}
                $color={
                  system.governmentForm
                    ? FORM_COLOR[system.governmentForm]
                    : '#94a3b8'
                }
              >
                <SystemDot />
                {system.name ?? '이름 없음'}
                <SystemMuted>
                  {formatPeriod(system)}
                  {system.governmentForm &&
                    ` · ${GOVERNMENT_FORM_LABEL[system.governmentForm]}`}
                </SystemMuted>
              </SystemChip>
            ))}
          </SystemChips>
        </SystemStrip>
      )}
    </S.Section>
  )
}

/**
 * 동그란 얼굴. 초상이 없으면 이름 첫 글자 — 빈 원은 로딩 실패처럼 보인다.
 * (사건 「시대」 뷰와 같은 규약)
 */
function Portrait({ admin, size }: { admin: Administration; size: number }) {
  const [failed, setFailed] = useState(false)
  const src = admin.imageUrl ? getUploadImageUrl(admin.imageUrl) : ''
  if (!src || failed) {
    return (
      <FallbackFace style={{ width: size, height: size }} aria-hidden>
        {admin.compactName.slice(0, 1)}
      </FallbackFace>
    )
  }
  return (
    <Face
      src={src}
      alt=""
      loading="lazy"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}

const HeaderAction = styled.button`
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(217, 119, 6, 0.35);
  background: rgba(217, 119, 6, 0.08);
  color: #b45309;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(217, 119, 6, 0.16);
  }
`

const CountChip = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const faceBase = `
  border-radius: 50%;
  flex-shrink: 0;
`

const Face = styled.img`
  ${faceBase}
  object-fit: cover;
  /* 초상은 대개 상반신 — 가운데를 자르면 얼굴이 잘린다 */
  object-position: center 22%;
  background: ${({ theme }) => theme.colors.hover};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`

const FallbackFace = styled.span`
  ${faceBase}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: ${({ theme }) => theme.colors.hover};
  color: ${({ theme }) => theme.colors.text.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`







const Track = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
`

const ChipWrap = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`

/** 기록이 이어지지 않는 구간 — 붙여 놓으면 연속인 것처럼 보이는 거짓말이 된다 */
const Gap = styled.span`
  width: 22px;
  height: 2px;
  margin: 0 4px;
  flex-shrink: 0;
  background: repeating-linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.border.default} 0 3px,
    transparent 3px 6px
  );
`

const Chip = styled.button<{ $current: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 96px;
  padding: 10px 6px 8px;
  border-radius: 12px;
  border: 1px solid
    ${({ $current, theme }) =>
      $current ? 'rgba(22,163,74,0.45)' : theme.colors.border.light};
  background: ${({ $current, theme }) =>
    $current ? 'rgba(22,163,74,0.07)' : theme.colors.background.primary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const ChipName = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 100%;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  word-break: keep-all;
`

const ChipYears = styled.span`
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const MoreButton = styled.button`
  flex-shrink: 0;
  width: 76px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const TrackHint = styled.p`
  margin: 6px 0 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SystemStrip = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SystemLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  flex-shrink: 0;
`

const SystemChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
`

const SystemChip = styled.button<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: none;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  span:first-child {
    background: ${({ $color }) => $color};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
`

const SystemDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
`

const SystemMuted = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
