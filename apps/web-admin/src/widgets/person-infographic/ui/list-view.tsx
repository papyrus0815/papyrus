/**
 * VIEW: 목록 — 사건 연대표(/events 목록)와 같은 문법의 인물 연대 원장(ledger).
 *
 * 좌측 시간 레일 위에 세기 도트(sticky 헤더)가 앉고, 각 인물 행은 분야색 도트로 레일에 매달린다.
 * 행은 **고정 px 트랙 + 단일 minmax** 격자라 세기 그룹이 달라도 생몰·이름·분야·국가·영향력
 * 열의 x가 전 목록에서 하나로 맞는다(사건 목록 4차 검토 RC-1 교훈 — 그룹마다 별도 DOM이라
 * auto/max-content 트랙은 그룹마다 다른 폭이 된다).
 *
 * - 세기 = 출생연도 기준(시대 스토리 뷰와 같은 분류). 출생 미상은 맨 끝 '연도 미상'.
 * - 세기 나열·세기 안 행 순서 모두 eraGroupOrder(최신순/오래된순)를 따른다 — 연대표이므로
 *   영향력 정렬은 카드 뷰가 담당한다.
 * - 세기 사이가 비면 '기록 없음' 점선 표지 — 1세기 간격과 5세기 공백이 같아 보이지 않게.
 * - 핀 고정 인물은 상단 '고정' 섹션에서만(세기 그룹 중복 제외).
 */
import { memo, useCallback, useMemo, useState } from 'react'
import type React from 'react'

import { FiBookmark, FiChevronDown } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import {
  centuryOf,
  compareCenturyMeta,
  formatYear,
  type CenturyMeta,
} from '../model/century'
import { colorForField } from '../model/constants'
import { usePersonInfographicFilterStore } from '../model/filter.store'
import type { AdaptedPerson } from '../model/types'

import { BRAND, hairline, metaText, MOTION_FAST, srOnly, surface } from './_shared/catalog.styles'
import { highlight } from './_shared/highlight'

/** 세기당 최초 표시 행 수 — 넘치면 '+N명 더 보기' */
const CENTURY_PAGE = 40

const UNKNOWN_CENTURY: CenturyMeta = {
  key: 'unknown',
  label: '연도 미상',
  from: 0,
  to: 0,
  sortKey: Number.POSITIVE_INFINITY,
}

/** 세기 연속 인덱스 — 기원전 1세기(-1)와 1세기(1)는 인접(0, 1). */
const centuryIndex = (meta: CenturyMeta) =>
  meta.sortKey < 0 ? meta.sortKey + 1 : meta.sortKey

interface Group {
  meta: CenturyMeta
  people: AdaptedPerson[]
}

interface Props {
  people: AdaptedPerson[]
  onOpen: (id: string) => void
  query: string
  pinned: Set<string>
  togglePin: (id: string, event: React.MouseEvent) => void
}

export function ListView({ people, onOpen, query, pinned, togglePin }: Props) {
  const order = usePersonInfographicFilterStore((state) => state.eraGroupOrder)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const byLife = useCallback(
    (personA: AdaptedPerson, personB: AdaptedPerson) => {
      const dir = order === 'desc' ? -1 : 1
      if (personA.born != null && personB.born != null && personA.born !== personB.born)
        return (personA.born - personB.born) * dir
      return personA.name.localeCompare(personB.name, 'ko')
    },
    [order],
  )

  const pinnedPeople = useMemo(
    () => people.filter((person) => pinned.has(person.id)).sort(byLife),
    [people, pinned, byLife],
  )

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, Group>()
    for (const person of people) {
      if (pinned.has(person.id)) continue
      const meta = person.born == null ? UNKNOWN_CENTURY : centuryOf(person.born)
      const group = map.get(meta.key)
      if (group) group.people.push(person)
      else map.set(meta.key, { meta, people: [person] })
    }
    return Array.from(map.values())
      .sort((groupA, groupB) => compareCenturyMeta(groupA.meta, groupB.meta, order))
      .map((group) => ({ meta: group.meta, people: group.people.sort(byLife) }))
  }, [people, pinned, order, byLife])

  const toggleCollapsed = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <Ledger>
      {pinnedPeople.length > 0 && (
        <Section aria-labelledby="person-ledger-pinned">
          <SectionHeading id="person-ledger-pinned">고정한 인물</SectionHeading>
          <CenturyHeader as="div" $pinned>
            <CenturyLabel>
              <FiBookmark size={14} aria-hidden />
              고정
            </CenturyLabel>
            <CenturyCount>{pinnedPeople.length}명</CenturyCount>
          </CenturyHeader>
          <RowList role="list" aria-labelledby="person-ledger-pinned">
            {pinnedPeople.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                query={query}
                pinned
                onOpen={onOpen}
                onTogglePin={togglePin}
              />
            ))}
          </RowList>
        </Section>
      )}

      {groups.map((group, index) => {
        const { meta } = group
        const headingId = `person-ledger-${meta.key}`
        const isCollapsed = !!collapsed[meta.key]
        const isExpanded = !!expanded[meta.key]
        const shown = isExpanded ? group.people : group.people.slice(0, CENTURY_PAGE)
        const remaining = group.people.length - shown.length

        // 직전 세기와의 공백(세기 수). 미상 그룹은 시간축 밖이라 계산하지 않는다.
        const prev = groups[index - 1]?.meta
        const gap =
          prev && prev.key !== 'unknown' && meta.key !== 'unknown'
            ? Math.abs(centuryIndex(meta) - centuryIndex(prev)) - 1
            : 0

        const monarchs = group.people.filter((person) => person.isMonarch).length

        return (
          <Section key={meta.key} aria-labelledby={headingId}>
            {gap > 0 && (
              <GapMarker>
                {gap === 1 ? '1개 세기' : `${gap}개 세기`} 기록 없음
              </GapMarker>
            )}
            <SectionHeading id={headingId}>
              {meta.label} {group.people.length}명
            </SectionHeading>
            <CenturyHeader
              type="button"
              $unknown={meta.key === 'unknown'}
              aria-expanded={!isCollapsed}
              aria-controls={`${headingId}-rows`}
              onClick={() => toggleCollapsed(meta.key)}
            >
              <CenturyLabel>
                <Chevron size={16} aria-hidden $collapsed={isCollapsed} />
                {meta.label}
                {meta.key !== 'unknown' && (
                  <CenturyYears>
                    ({formatYear(meta.from)}–{formatYear(meta.to)})
                  </CenturyYears>
                )}
              </CenturyLabel>
              <CenturyCount>
                {monarchs > 0 && <CenturySub>군주 {monarchs} ·</CenturySub>}
                {group.people.length}명
              </CenturyCount>
            </CenturyHeader>
            {!isCollapsed && (
              <RowList role="list" id={`${headingId}-rows`} aria-labelledby={headingId}>
                {shown.map((person) => (
                  <PersonRow
                    key={person.id}
                    person={person}
                    query={query}
                    pinned={false}
                    onOpen={onOpen}
                    onTogglePin={togglePin}
                  />
                ))}
                {remaining > 0 && (
                  <MoreRow role="listitem">
                    <MoreBtn
                      type="button"
                      onClick={() =>
                        setExpanded((prevState) => ({ ...prevState, [meta.key]: true }))
                      }
                    >
                      + {remaining}명 더 보기
                    </MoreBtn>
                  </MoreRow>
                )}
              </RowList>
            )}
          </Section>
        )
      })}
    </Ledger>
  )
}

/* ─── 행 ─────────────────────────────────────────────────────────────── */

interface RowProps {
  person: AdaptedPerson
  query: string
  pinned: boolean
  onOpen: (id: string) => void
  onTogglePin: (id: string, event: React.MouseEvent) => void
}

const PersonRow = memo(function PersonRow({
  person,
  query,
  pinned,
  onOpen,
  onTogglePin,
}: RowProps) {
  const fieldColor = colorForField(person.field)
  const born = person.born == null ? '?' : formatYear(person.born)
  const died = person.isAlive ? '현재' : person.died == null ? '?' : formatYear(person.died)
  const country = person.country && person.country !== '미상' ? person.country : null
  const role = person.isMonarch ? '군주' : person.isHeadOfState ? '국가원수' : null

  const ariaLabel = [
    person.name,
    role,
    person.primaryTitle,
    country,
    person.field,
    `생몰 ${born}–${died}`,
    `영향력 ${person.influence}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Row role="listitem" style={{ ['--field' as string]: fieldColor }}>
      <RowMain
        role="button"
        tabIndex={0}
        aria-label={`${ariaLabel}, 상세 보기`}
        onClick={() => onOpen(person.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen(person.id)
          }
        }}
      >
        <Life aria-hidden>
          <span>{born}</span>
          <LifeDash>–</LifeDash>
          <span>{died}</span>
        </Life>
        <Avatar aria-hidden>
          {person.profileImageUrl ? (
            <img src={person.profileImageUrl} alt="" loading="lazy" />
          ) : (
            <span>{person.name.slice(0, 1)}</span>
          )}
        </Avatar>
        <NameCell aria-hidden>
          <Name title={person.name}>{highlight(person.name, query)}</Name>
          {role && <RoleBadge $monarch={person.isMonarch}>{role}</RoleBadge>}
          <MobileMeta>
            {born}–{died}
            {country && ` · ${country}`}
          </MobileMeta>
        </NameCell>
        <Title aria-hidden title={person.primaryTitle ?? undefined}>
          {person.primaryTitle ? highlight(person.primaryTitle, query) : null}
        </Title>
        <FieldChip aria-hidden>{person.field}</FieldChip>
        <Country aria-hidden title={country ?? undefined}>
          {country ? highlight(country, query) : <Muted>—</Muted>}
        </Country>
        <Influence aria-hidden>
          <Bar>
            <BarFill style={{ width: `${Math.max(0, Math.min(100, person.influence))}%` }} />
          </Bar>
          <InfluenceNum>{person.influence}</InfluenceNum>
        </Influence>
      </RowMain>
      <PinBtn
        type="button"
        $active={pinned}
        aria-pressed={pinned}
        aria-label={pinned ? `${person.name} 고정 해제` : `${person.name} 고정`}
        title={pinned ? '고정 해제' : '상단에 고정'}
        onClick={(event) => onTogglePin(person.id, event)}
      >
        <FiBookmark size={14} fill={pinned ? 'currentColor' : 'none'} />
      </PinBtn>
    </Row>
  )
})

/* ─── 스타일 ─────────────────────────────────────────────────────────── */

const Ledger = styled.div`
  --rail-inset: 36px;
  --col-life: 104px;
  --col-avatar: 30px;
  --col-name: 220px;
  --col-field: 56px;
  --col-country: 150px;
  --col-influence: 112px;
  --col-act: 34px;
  --pad-right: 12px;

  position: relative;
  padding: 4px var(--pad-right) 12px var(--rail-inset);
  border-radius: 12px;
  border: 1px solid ${hairline};
  background: ${surface};

  /* 시간 레일 — 세기·행 도트가 이 선 위에 앉는다 */
  &::before {
    content: '';
    position: absolute;
    left: calc(var(--rail-inset) / 2);
    top: 20px;
    bottom: 20px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(147, 197, 253, 0.16)' : 'rgba(37, 99, 235, 0.14)'};
  }

  @media (max-width: 1100px) {
    --col-name: 180px;
    --col-country: 120px;
    --col-influence: 84px;
  }
  @media (max-width: 640px) {
    --rail-inset: 22px;
    --pad-right: 6px;
  }
`

const Section = styled.section`
  position: relative;
  & + & {
    margin-top: 12px;
  }
`

const SectionHeading = styled.h2`
  ${srOnly}
`

const CenturyHeader = styled.button<{ $unknown?: boolean; $pinned?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: calc(100% + var(--rail-inset) + var(--pad-right));
  min-height: 48px;
  margin: 0 calc(-1 * var(--pad-right)) 2px calc(-1 * var(--rail-inset));
  padding: 8px 16px 8px var(--rail-inset);
  border: none;
  border-radius: 0;
  background: ${surface};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: left;
  cursor: pointer;

  /* 레일 위 세기 도트 — 행 도트(8px)의 2배 */
  &::before {
    content: '';
    position: absolute;
    left: calc(var(--rail-inset) / 2 + 1px);
    top: 50%;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: ${BRAND.primary};
    box-shadow: 0 0 0 3px ${surface};
    ${({ $unknown, theme }) =>
      $unknown &&
      css`
        width: 12px;
        height: 12px;
        background: ${surface({ theme })};
        border: 2px solid ${theme.colors.text.tertiary};
      `}
    ${({ $pinned }) =>
      $pinned &&
      css`
        background: #f59e0b;
      `}
  }

  &:hover {
    background: ${({ theme, as }) =>
      as === 'div' ? surface({ theme }) : theme.mode === 'dark' ? '#1a1a1a' : '#f8fafc'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: inset ${BRAND.focusRing};
  }
  ${({ $pinned }) =>
    $pinned &&
    css`
      cursor: default;
    `}
`

const CenturyLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;

  & > svg {
    color: ${({ theme }) => theme.colors.text.tertiary};
    flex-shrink: 0;
  }
`

const Chevron = styled(FiChevronDown)<{ $collapsed: boolean }>`
  transition: transform ${MOTION_FAST};
  transform: rotate(${({ $collapsed }) => ($collapsed ? '-90deg' : '0deg')});
`

const CenturyYears = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturyCount = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CenturySub = styled.span`
  font-weight: 500;
  @media (max-width: 640px) {
    display: none;
  }
`

const GapMarker = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 12px;
  font-size: 12px;
  font-weight: 500;
  color: ${metaText};
  user-select: none;

  &::after {
    content: '';
    flex: 1;
    border-top: 1px dashed
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.14)'};
  }
`

const RowList = styled.div`
  display: flex;
  flex-direction: column;
`

const Row = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  border-bottom: 1px solid ${hairline};

  &:last-child {
    border-bottom: none;
  }

  /* 레일 도트(분야색) + 도트→행 눈금 */
  &::before {
    content: '';
    position: absolute;
    left: calc(-1 * var(--rail-inset) / 2 + 1px);
    top: 50%;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background: var(--field);
    box-shadow: 0 0 0 2px ${surface};
    z-index: 1;
  }
  &::after {
    content: '';
    position: absolute;
    left: calc(-1 * var(--rail-inset) / 2 + 6px);
    width: calc(var(--rail-inset) / 2 - 4px);
    top: 50%;
    height: 1px;
    background: ${hairline};
  }
`

const RowMain = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns:
    var(--col-life) var(--col-avatar) var(--col-name) minmax(0, 1fr)
    var(--col-field) var(--col-country) var(--col-influence);
  align-items: center;
  column-gap: 12px;
  min-height: 48px;
  padding: 6px 8px 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background ${MOTION_FAST};

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }

  /* 자식 순서: 1 생몰 · 2 아바타 · 3 이름 · 4 직함 · 5 분야 · 6 국가 · 7 영향력 */
  @media (max-width: 900px) {
    grid-template-columns:
      var(--col-life) var(--col-avatar) minmax(0, 1fr) var(--col-field) var(--col-influence);
    & > :nth-child(4),
    & > :nth-child(6) {
      display: none;
    }
  }
  @media (max-width: 640px) {
    grid-template-columns: var(--col-avatar) minmax(0, 1fr) auto;
    column-gap: 10px;
    padding-left: 6px;
    & > :nth-child(1),
    & > :nth-child(4),
    & > :nth-child(5),
    & > :nth-child(6) {
      display: none;
    }
  }
`

const Life = styled.span`
  display: inline-flex;
  justify-content: flex-end;
  gap: 3px;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`

const LifeDash = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Avatar = styled.span`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--field);
  background: color-mix(in srgb, var(--field) 14%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--field) 28%, transparent);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const NameCell = styled.span`
  display: flex;
  align-items: center;
  column-gap: 6px;
  min-width: 0;

  @media (max-width: 640px) {
    flex-wrap: wrap;
    row-gap: 2px;
  }
`

const Name = styled.span`
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const RoleBadge = styled.span<{ $monarch: boolean }>`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $monarch, theme }) =>
    $monarch
      ? theme.mode === 'dark'
        ? '#fcd34d'
        : '#92400e'
      : theme.mode === 'dark'
        ? BRAND.primaryTextOnDark
        : BRAND.primaryHover};
  background: ${({ $monarch }) =>
    $monarch ? 'rgba(245, 158, 11, 0.14)' : BRAND.primarySoftHover};
`

const Title = styled.span`
  min-width: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const MobileMeta = styled.span`
  display: none;
  @media (max-width: 640px) {
    display: block;
    flex-basis: 100%;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${metaText};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const FieldChip = styled.span`
  justify-self: start;
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  color: var(--field);
  background: color-mix(in srgb, var(--field) 12%, transparent);
`

const Country = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Influence = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  @media (max-width: 640px) {
    gap: 0;
    & > :first-child {
      display: none;
    }
  }
`

const Bar = styled.span`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.07)'};
`

const BarFill = styled.span`
  display: block;
  height: 100%;
  border-radius: 2px;
  background: ${BRAND.primary};
`

const InfluenceNum = styled.span`
  min-width: 22px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PinBtn = styled.button<{ $active: boolean }>`
  width: var(--col-act);
  height: 30px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: ${({ $active, theme }) => ($active ? '#f59e0b' : theme.colors.text.tertiary)};
  opacity: ${({ $active }) => ($active ? 1 : 0.55)};
  transition: opacity ${MOTION_FAST}, color ${MOTION_FAST}, background ${MOTION_FAST};

  ${Row}:hover & {
    opacity: 1;
  }
  &:hover {
    color: ${({ $active, theme }) => ($active ? '#d97706' : theme.colors.text.primary)};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'};
  }
  &:focus-visible {
    outline: none;
    opacity: 1;
    box-shadow: ${BRAND.focusRing};
  }
`

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 10px 0 4px;
`

const MoreBtn = styled.button`
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid ${hairline};
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    color: ${BRAND.primary};
    border-color: ${BRAND.primaryBorder};
    background: ${BRAND.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${BRAND.focusRing};
  }
`
