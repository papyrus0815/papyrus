/**
 * 인물 상세 가계도 — 고조부모까지 n세대 + 부모 → 본인(+배우자+형제자매) → 자녀
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FiHeart, FiUsers } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type { FamilyTreeData, FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getUploadImageUrl } from '@/shared/api/upload'
import {
  type PersonNameFields,
  getPersonDisplayName,
} from '@/shared/lib/person-display-name'

// ─── 상수 ──────────────────────────────────────────────────────────
const NODE_W = 192
const NODE_H = 232
const GP_PAIR_GAP = 12
const GP_PAIR_W = 2 * NODE_W + GP_PAIR_GAP // 396
const CHILD_GAP = 16       // ChildrenGrid gap (px)
const SPOUSE_JOIN_W = 52   // SpouseJoin flex-basis (px)
const ANC_W = 140          // 증조부모 이상 compact 카드 너비
const ANC_H = 192          // compact 카드 높이
const FT_MAX_DEPTH = 4     // 가계도 최대 표시 세대 (1=부모, 2=조부모, 3=증조부모, 4=고조부모)

// ─── 타입 ──────────────────────────────────────────────────────────
type NodePerson = PersonNameFields & {
  id?: string
  gender?: string | null
  profileImageUrl?: string | null
  profileImages?: { url?: string | null }[] | null
  dynasty?: { id?: string; name?: string | null } | null
  birthDate?: string | Date | null
  deathDate?: string | Date | null
  // 카드 hover/뱃지 강화 (Sprint 2)
  originalName?: string | null
  posthumousName?: string | null
  templeName?: string | null
  preEnthronementTitle?: string | null
  birthPlace?: string | null
  deathPlace?: string | null
  illegitimate?: boolean | null
  parentMarriageId?: string | null
  // 카드 국기 — getPersonDetailById가 반환하는 country 객체
  country?: {
    id?: string
    name?: string | null
    flagEmoji?: string | null
    isoCode?: string | null
    thumbnailUrl?: string | null
  } | null
}

/** 국기 표시용 source — emoji > thumbnailUrl > flagcdn(isoCode) 우선순위 */
type FlagSource = {
  flagEmoji?: string | null
  isoCode?: string | null
  thumbnailUrl?: string | null
} | null | undefined

/**
 * familyTreeData.nodes 의 id→FamilyTreePerson 룩업.
 * 주 사용처: NodePerson 카드(부모·형제·배우자·자녀)가 country 필드를 갖지 않을 때
 * 같은 ID로 BFS 응답에서 country/sovereignCountry 정보를 보완.
 */
const FamilyTreeLookupContext = createContext<Map<string, FamilyTreePerson>>(new Map())

type ChildPerson = NodePerson & { spouse?: NodePerson | null }
type AvatarRole = 'grandparent' | 'grandparentAlt' | 'parent' | 'parentAlt' | 'ego' | 'spouse' | 'child' | 'sibling' | 'ancestor'

export interface PersonGenealogyInfographicProps {
  ego: NodePerson
  paternalGrandfather?: NodePerson | null
  paternalGrandmother?: NodePerson | null
  maternalGrandfather?: NodePerson | null
  maternalGrandmother?: NodePerson | null
  father?: NodePerson | null
  mother?: NodePerson | null
  spouses?: NodePerson[] | null
  spouse?: NodePerson | null
  children?: ChildPerson[] | null
  siblings?: NodePerson[] | null
  /** FamilyTreeData를 주면 조부모 이상을 동적으로 표시 (n세대 재귀) */
  familyTreeData?: FamilyTreeData | null
  onPersonClick?: (personId: string) => void
}

// ─── 유틸 ──────────────────────────────────────────────────────────
function yearOf(d?: string | Date | null): number | null {
  if (!d) return null
  const dt = typeof d === 'string' ? new Date(d) : d
  const t = dt.getTime?.()
  return t && !isNaN(t) ? dt.getFullYear() : null
}

function birthYearOf(p: NodePerson): number | null {
  return yearOf(p.birthDate)
}

function lifeSpan(p: NodePerson): string | null {
  const b = yearOf(p.birthDate)
  const d = yearOf(p.deathDate)
  if (b == null && d == null) return null
  if (b != null && d == null) return `${b}–`
  if (b == null && d != null) return `?–${d}`
  return `${b}–${d}`
}

function isLeft(p?: NodePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'MALE' || g === 'M'
}
function isRight(p?: NodePerson | null) {
  const g = (p?.gender ?? '').toUpperCase()
  return g === 'FEMALE' || g === 'F'
}

function resolvePersonThumbnailSrc(p: {
  profileImageUrl?: string | null
  profileImages?: { url?: string | null }[] | null
}): string | null {
  const primary = p.profileImageUrl?.trim()
  if (primary) return getUploadImageUrl(primary) || primary
  const gallery = p.profileImages?.[0]?.url?.trim()
  if (gallery) return getUploadImageUrl(gallery) || gallery
  return null
}

function displayInitial(p: PersonNameFields): string {
  const full = getPersonDisplayName(p, true).trim()
  if (!full) return '?'
  return [...full][0] ?? '?'
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────
/**
 * 카드 hover 시 보여줄 부가 정보(원어명·시호·묘호·작호·출생지·사망지)를
 * 한 줄씩 모은 title 문자열. 비어있으면 undefined.
 */
function buildPersonTooltip(person: {
  originalName?: string | null
  posthumousName?: string | null
  templeName?: string | null
  preEnthronementTitle?: string | null
  birthPlace?: string | null
  deathPlace?: string | null
}): string | undefined {
  const lines: string[] = []
  if (person.originalName) lines.push(`원어 — ${person.originalName}`)
  if (person.preEnthronementTitle) lines.push(`작호 — ${person.preEnthronementTitle}`)
  if (person.templeName) lines.push(`묘호 — ${person.templeName}`)
  if (person.posthumousName) lines.push(`시호 — ${person.posthumousName}`)
  if (person.birthPlace) lines.push(`출생 — ${person.birthPlace}`)
  if (person.deathPlace) lines.push(`사망 — ${person.deathPlace}`)
  return lines.length > 0 ? lines.join('\n') : undefined
}

function NodeNameBlock({
  person,
  sovereignCountry,
}: {
  person: NodePerson
  sovereignCountry?: { name?: string | null; regnalNumber?: number | null } | null
}) {
  const span = lifeSpan(person)
  const isDeceased = Boolean(person.deathDate)
  const baseName = getPersonDisplayName(person, true)
  const displayName = person.illegitimate ? `${baseName}*` : baseName
  return (
    <NodeNameWrap>
      {person.regnalName && (
        <NodeRegnalName>
          ♛ {person.regnalName}
          {sovereignCountry?.regnalNumber != null && (
            <RegnalNumber>{sovereignCountry.regnalNumber}대</RegnalNumber>
          )}
          {sovereignCountry?.name && (
            <RegnalCountry>· {sovereignCountry.name}</RegnalCountry>
          )}
        </NodeRegnalName>
      )}
      <NodeName>
        {displayName}
        {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
      </NodeName>
      {span && <NodeMeta>{span}</NodeMeta>}
      {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
    </NodeNameWrap>
  )
}

function GeoThumbnail({ person, role }: { person: NodePerson; role: AvatarRole }) {
  const displayName = getPersonDisplayName(person, true)
  const src = resolvePersonThumbnailSrc(person)
  const { flag, countryName } = useNodePersonFlag(person)
  return (
    <AvatarFrame>
      <NodeAvatar $role={role} $hasImage={Boolean(src)}>
        {src ? (
          <AvatarImage src={src} alt={`${displayName} 프로필 사진`} loading="lazy" decoding="async" />
        ) : (
          displayInitial(person)
        )}
      </NodeAvatar>
      <CountryFlag flag={flag} countryName={countryName} size={22} />
    </AvatarFrame>
  )
}

/**
 * 카드 아바타 우하단에 작은 국기 뱃지를 그린다.
 * 우선순위: emoji > 업로드 thumbnailUrl > flagcdn.com(isoCode 기반 PNG)
 * 모두 없으면 null 반환 → 컴포넌트 자체 미렌더.
 */
function CountryFlag({
  flag,
  countryName,
  size = 18,
}: {
  flag: FlagSource
  countryName?: string | null
  size?: number
}) {
  if (!flag) return null
  const emoji = flag.flagEmoji ?? null
  const thumb = flag.thumbnailUrl
    ? (getUploadImageUrl(flag.thumbnailUrl) || flag.thumbnailUrl)
    : null
  const flagcdn = flag.isoCode
    ? `https://flagcdn.com/w40/${flag.isoCode.toLowerCase()}.png`
    : null
  const title = countryName ?? undefined
  if (emoji) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <span aria-hidden style={{ fontSize: `${Math.round(size * 0.85)}px`, lineHeight: 1 }}>{emoji}</span>
      </CountryFlagBadge>
    )
  }
  const imgSrc = thumb ?? flagcdn
  if (imgSrc) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <img src={imgSrc} alt="" loading="lazy" decoding="async" />
      </CountryFlagBadge>
    )
  }
  return null
}

/**
 * NodePerson에서 카드 국기 source 도출 (legacy 주 국적만 사용 가능 — sovereignCountry는
 * FamilyTreePerson에만 있음). useFamilyTreeLookup으로 BFS 응답 폴백.
 */
function useNodePersonFlag(p: NodePerson): { flag: FlagSource; countryName?: string | null } {
  const lookup = useContext(FamilyTreeLookupContext)
  if (p.country) {
    return { flag: p.country, countryName: p.country.name ?? null }
  }
  if (p.id) {
    const fallback = lookup.get(p.id)
    if (fallback) return familyTreePersonFlag(fallback)
  }
  return { flag: null, countryName: null }
}

/**
 * FamilyTreePerson에서 카드 국기 source 도출 (sovereignCountry > country 우선).
 * 응답에 통합 `flag` 필드가 있으면 그걸 우선 사용.
 */
function familyTreePersonFlag(p: FamilyTreePerson): { flag: FlagSource; countryName?: string | null } {
  if (p.flag) {
    return {
      flag: p.flag,
      countryName: p.flag.countryName,
    }
  }
  if (p.sovereignCountry) {
    return {
      flag: p.sovereignCountry,
      countryName: p.sovereignCountry.name,
    }
  }
  if (p.country) {
    return {
      flag: p.country,
      countryName: p.country.name,
    }
  }
  return { flag: null, countryName: null }
}

/**
 * 부모 둘 → 두 선이 위에서 내려와 합쳐진 뒤 아래로 수직 하강
 * preserveAspectRatio="none" + vectorEffect="non-scaling-stroke" 로
 * 컨테이너 전체를 꽉 채우면서 선 두께는 유지
 */
function ForkFromTwoParents() {
  return (
    <ForkSvg viewBox="0 0 400 52" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none" aria-hidden>
      <title>부모 두 분에서 이어지는 혈연선</title>
      <path
        d="M 100 0 L 100 18 M 300 0 L 300 18 M 100 18 L 300 18 M 200 18 L 200 52"
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

/** 부모 한 명 → 수직 직선 */
function ForkFromOneParent() {
  return (
    <ForkSvg viewBox="0 0 100 52" xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none" aria-hidden>
      <title>부모에서 이어지는 혈연선</title>
      <path d="M 50 0 L 50 52" fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </ForkSvg>
  )
}

/**
 * 자녀 여러 명 → T자형 분기 (수직선 + 하단 가로 바)
 * childList를 받아 각 ChildPair 실제 너비로 가로 바 양 끝을 정확히 계산
 * - pairW(i) = 배우자 있음: NODE_W + SPOUSE_JOIN_W + NODE_W, 없음: NODE_W
 * - xStart = 첫 ChildPair 중심, xEnd = 마지막 ChildPair 중심
 * - xMid = totalW / 2 (수직선 위치, ForkTrack 50%와 일치)
 */
function ForkToChildren({ childList }: { childList: ChildPerson[] }) {
  const pairWidths = childList.map(c => c.spouse ? NODE_W + SPOUSE_JOIN_W + NODE_W : NODE_W)
  const totalW = pairWidths.reduce((s, w) => s + w, 0) + (childList.length - 1) * CHILD_GAP
  const xStart = pairWidths[0] / 2
  const xEnd = totalW - pairWidths[pairWidths.length - 1] / 2
  const xMid = totalW / 2

  return (
    <svg
      width={totalW}
      height={48}
      viewBox={`0 0 ${totalW} 48`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', color: 'inherit' }}
    >
      <title>자녀 세대로 이어지는 분기선</title>
      <path
        d={`M ${xMid} 0 L ${xMid} 30 M ${xStart} 30 L ${xEnd} 30`}
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * 조부모 2명 → 아래로 수렴
 * viewBox = GP_PAIR_W(396) × 52
 * x=96(왼쪽 카드 중심), x=300(오른쪽 카드 중심), x=198(중앙 하강)
 */
function ForkFromTwoGrandparents() {
  return (
    <ForkSvg
      viewBox={`0 0 ${GP_PAIR_W} 52`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
    >
      <title>조부모 두 분에서 이어지는 혈연선</title>
      <path
        d={`M ${NODE_W / 2} 0 L ${NODE_W / 2} 18 M ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 0 L ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 18 M ${NODE_W / 2} 18 L ${NODE_W + GP_PAIR_GAP + NODE_W / 2} 18 M ${GP_PAIR_W / 2} 18 L ${GP_PAIR_W / 2} 52`}
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </ForkSvg>
  )
}

// ─── 동적 조상 트리 헬퍼 ──────────────────────────────────────────

/** FamilyTreeData의 parentsOf 맵에서 부/모 ID를 추출 */
function ftResolveParentIds(
  personId: string,
  parentsOf: Map<string, string[]>,
  nodeMap: Map<string, FamilyTreePerson>,
): { fatherId?: string; motherId?: string } {
  const parents = parentsOf.get(personId) ?? []
  let fatherId: string | undefined
  let motherId: string | undefined
  for (const pid of parents) {
    const g = (nodeMap.get(pid)?.gender ?? '').toUpperCase()
    if ((g === 'MALE' || g === 'M') && !fatherId) { fatherId = pid }
    else if (!motherId && pid !== fatherId) { motherId = pid }
  }
  // 성별 미지정 fallback
  if (!fatherId && !motherId) {
    if (parents[0]) fatherId = parents[0]
    if (parents[1]) motherId = parents[1]
  } else if (!fatherId && parents.length > 1) {
    fatherId = parents.find(pid => pid !== motherId)
  } else if (!motherId && parents.length > 1) {
    motherId = parents.find(pid => pid !== fatherId)
  }
  return { fatherId, motherId }
}

/** ego에서 조상까지의 경로 문자열('F'=부계, 'M'=모계)로 한국어 촌수 레이블 반환 */
function getAncestorBadgeLabel(path: string, gender: string | null | undefined): string {
  const isMale = ['MALE', 'M'].includes((gender ?? '').toUpperCase())
  const isPaternal = path[0] === 'F'
  switch (path.length) {
    case 1: return isMale ? '아버지' : '어머니'
    case 2: return (isPaternal ? '친' : '외') + (isMale ? '조부' : '조모')
    case 3: return isMale ? '증조부' : '증조모'
    case 4: return isMale ? '고조부' : '고조모'
    default: return isMale ? `${path.length - 1}대조부` : `${path.length - 1}대조모`
  }
}

// ─── AncestorColumn (재귀) ────────────────────────────────────────
/**
 * 한 조상과 그 위 세대를 재귀적으로 렌더링한다.
 * - path: ego 기준 경로 ('F'=아버지, 'FM'=친조모, 'FFF'=증조부 등)
 * - maxDepth: 총 표시 깊이 (FT_MAX_DEPTH = 4)
 * - 내부에서 FamilyTreePerson 타입 사용 (birth/deathYear)
 * - 레이아웃: AncColumnDiv(flex-col, align-center)
 *     └ AncParentsGrid(flex-row) ← 부/모 각각 AncestorColumn
 *     └ AncForkTrack ← ForkFromTwoParents | ForkFromOneParent
 *     └ GeoNode ← 현재 인물 카드
 *
 * 부/모가 AncParentsGrid 안에서 1fr 씩 차지하므로
 * ForkFromTwoParents(viewBox 400×52, 선 x=100/300=25%/75%)가 항상 정확히 맞음.
 */
interface AncestorColumnProps {
  personId: string
  path: string
  nodeMap: Map<string, FamilyTreePerson>
  parentsOf: Map<string, string[]>
  maxDepth: number
  visited: Set<string>
  /** 조상별 형제 노드 — 카드 옆 "형제 N" 칩 표시용 */
  siblingsByPersonId?: Map<string, FamilyTreePerson[]>
  onPersonClick?: (id: string) => void
  onOpenSiblings?: (person: FamilyTreePerson, siblings: FamilyTreePerson[]) => void
}

function AncestorColumn({
  personId, path, nodeMap, parentsOf, maxDepth, visited,
  siblingsByPersonId, onPersonClick, onOpenSiblings,
}: AncestorColumnProps) {
  if (visited.has(personId)) return null
  const person = nodeMap.get(personId)
  if (!person) return null

  // 방문 처리 (사이클 방지)
  const nextVisited = new Set(visited)
  nextVisited.add(personId)

  const depth = path.length
  const { fatherId, motherId } = ftResolveParentIds(personId, parentsOf, nodeMap)
  const canGoDeeper = depth < maxDepth
  const showFather = canGoDeeper && Boolean(fatherId) && fatherId && !visited.has(fatherId)
  const showMother = canGoDeeper && Boolean(motherId) && motherId && !visited.has(motherId)
  const showParents = showFather || showMother
  const hasBothParents = Boolean(showFather && showMother)

  const compact = depth >= 3
  const role: AvatarRole =
    depth === 1
      ? (path === 'F' ? 'parent' : 'parentAlt')
      : depth === 2
        ? (path.endsWith('F') ? 'grandparent' : 'grandparentAlt')
        : 'ancestor'
  const badgeRole = depth <= 2 ? role : 'ancestor'
  const label = getAncestorBadgeLabel(path, person.gender)

  const b = person.birthYear
  const d = person.deathYear
  const lifespan =
    b == null && d == null ? null :
    b != null && d == null ? `${b}–` :
    b == null && d != null ? `?–${d}` :
    `${b}–${d}`

  const src = person.profileImageUrl
    ? (getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl)
    : null
  const displayName = getPersonDisplayName(person, true)
  const initial = [...displayName.trim()][0] ?? '?'

  const clickable = Boolean(onPersonClick && person.id)
  const handleClick = () => person.id && onPersonClick?.(person.id)

  return (
    <AncColumnDiv>
      {showParents && (
        <>
          <AncParentsGrid>
            {showFather && fatherId && (
              <AncestorColumn
                personId={fatherId}
                path={path + 'F'}
                nodeMap={nodeMap}
                parentsOf={parentsOf}
                maxDepth={maxDepth}
                visited={nextVisited}
                siblingsByPersonId={siblingsByPersonId}
                onPersonClick={onPersonClick}
                onOpenSiblings={onOpenSiblings}
              />
            )}
            {showMother && motherId && (
              <AncestorColumn
                personId={motherId}
                path={path + 'M'}
                nodeMap={nodeMap}
                parentsOf={parentsOf}
                maxDepth={maxDepth}
                visited={nextVisited}
                siblingsByPersonId={siblingsByPersonId}
                onPersonClick={onPersonClick}
                onOpenSiblings={onOpenSiblings}
              />
            )}
          </AncParentsGrid>
          <AncForkTrack>
            {hasBothParents ? <ForkFromTwoParents /> : <ForkFromOneParent />}
          </AncForkTrack>
        </>
      )}
      {(() => {
        const tooltip = buildPersonTooltip(person)
        const isDeceased = person.deathYear != null
        const finalDisplayName = person.illegitimate ? `${displayName}*` : displayName
        const siblings = siblingsByPersonId?.get(person.id) ?? []
        return (
          <GeoNodeWithChip>
            <GeoNode
              $role={role}
              $compact={compact}
              $clickable={clickable}
              {...(clickable
                ? {
                    role: 'button' as const,
                    tabIndex: 0,
                    onClick: handleClick,
                    onKeyDown: (e: ReactKeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() }
                    },
                  }
                : {})}
              title={tooltip}
            >
              <AvatarFrame>
                <AncNodeAvatar $hasImage={Boolean(src)} $deceased={isDeceased}>
                  {src
                    ? <AvatarImage src={src} alt={`${displayName} 프로필 사진`} loading="lazy" decoding="async" />
                    : initial}
                </AncNodeAvatar>
                {(() => {
                  const { flag, countryName } = familyTreePersonFlag(person)
                  return <CountryFlag flag={flag} countryName={countryName} size={16} />
                })()}
              </AvatarFrame>
              <NodeNameWrap>
                {person.regnalName && (
                  <NodeRegnalName>
                    ♛ {person.regnalName}
                    {person.sovereignCountry?.regnalNumber != null && (
                      <RegnalNumber>{person.sovereignCountry.regnalNumber}대</RegnalNumber>
                    )}
                    {person.sovereignCountry?.name && (
                      <RegnalCountry>· {person.sovereignCountry.name}</RegnalCountry>
                    )}
                  </NodeRegnalName>
                )}
                <AncNodeName>
                  {finalDisplayName}
                  {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
                </AncNodeName>
                {lifespan && <NodeMeta>{lifespan}</NodeMeta>}
                {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
              </NodeNameWrap>
              <NodeBadge $role={badgeRole}>{label}</NodeBadge>
            </GeoNode>
            {siblings.length > 0 && onOpenSiblings && (
              <AncestorSiblingChip
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onOpenSiblings(person, siblings)
                }}
                aria-label={`${displayName}의 형제 ${siblings.length}명 보기`}
                title={`${displayName}의 형제 ${siblings.length}명`}
              >
                형제 {siblings.length}
              </AncestorSiblingChip>
            )}
          </GeoNodeWithChip>
        )
      })()}
    </AncColumnDiv>
  )
}

// ─── DescendantNode (FamilyTreePerson을 컴팩트 카드로 렌더) ─────────
/**
 * 손자녀 카드 — AncestorColumn의 컴팩트 카드 시각과 동일하게 ANC_W/ANC_H 사용.
 * AncestorColumn처럼 위로 부모(여기서는 자녀=손자녀의 부모)와 fork로 연결되는 ::before은
 * 상위 GrandchildPair에서 처리.
 */
function DescendantNode({
  person,
  badge = '손자녀',
  onPersonClick,
}: {
  person: FamilyTreePerson
  badge?: string
  onPersonClick?: (id: string) => void
}) {
  const b = person.birthYear
  const d = person.deathYear
  const lifespan =
    b == null && d == null ? null :
    b != null && d == null ? `${b}–` :
    b == null && d != null ? `?–${d}` :
    `${b}–${d}`
  const src = person.profileImageUrl
    ? (getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl)
    : null
  const baseName = getPersonDisplayName(person, true)
  const displayName = person.illegitimate ? `${baseName}*` : baseName
  const initial = [...baseName.trim()][0] ?? '?'
  const clickable = Boolean(onPersonClick && person.id)
  const handle = () => person.id && onPersonClick?.(person.id)
  const tooltip = buildPersonTooltip(person)
  const isDeceased = d != null
  return (
    <GeoNode
      $role="ancestor"
      $compact
      $clickable={clickable}
      title={tooltip}
      {...(clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: handle,
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle() }
            },
          }
        : {})}
    >
      <AvatarFrame>
        <AncNodeAvatar $hasImage={Boolean(src)} $deceased={isDeceased}>
          {src
            ? <AvatarImage src={src} alt={`${baseName} 프로필 사진`} loading="lazy" decoding="async" />
            : initial}
        </AncNodeAvatar>
        {(() => {
          const { flag, countryName } = familyTreePersonFlag(person)
          return <CountryFlag flag={flag} countryName={countryName} size={16} />
        })()}
      </AvatarFrame>
      <NodeNameWrap>
        {person.regnalName && (
          <NodeRegnalName>
            ♛ {person.regnalName}
            {person.sovereignCountry?.regnalNumber != null && (
              <RegnalNumber>{person.sovereignCountry.regnalNumber}대</RegnalNumber>
            )}
            {person.sovereignCountry?.name && (
              <RegnalCountry>· {person.sovereignCountry.name}</RegnalCountry>
            )}
          </NodeRegnalName>
        )}
        <AncNodeName>
          {displayName}
          {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
        </AncNodeName>
        {lifespan && <NodeMeta>{lifespan}</NodeMeta>}
        {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
      </NodeNameWrap>
      <NodeBadge $role="ancestor">{badge}</NodeBadge>
    </GeoNode>
  )
}

// ─── SiblingCompactNode (형제자매 컴팩트 카드) ──────────────────────
/**
 * 형제자매 카드 — 본인 카드(NODE_W)보다 작은 ANC_W 컴팩트로 시각 위계 표현.
 * 입력 타입은 NodePerson (PersonDetail에서 내려온 데이터 — birthDate/deathDate Date|string).
 */
function SiblingCompactNode({
  person,
  onPersonClick,
}: {
  person: NodePerson
  onPersonClick?: (id: string) => void
}) {
  const baseName = getPersonDisplayName(person, true)
  const displayName = person.illegitimate ? `${baseName}*` : baseName
  const initial = displayInitial(person)
  const src = resolvePersonThumbnailSrc(person)
  const span = lifeSpan(person)
  const isDeceased = Boolean(person.deathDate)
  const clickable = Boolean(onPersonClick && person.id)
  const handle = () => person.id && onPersonClick?.(person.id)
  const tooltip = buildPersonTooltip(person)
  const { flag: sibFlag, countryName: sibCountryName } = useNodePersonFlag(person)
  return (
    <GeoNode
      $role="sibling"
      $compact
      $clickable={clickable}
      title={tooltip}
      {...(clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: handle,
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handle() }
            },
          }
        : {})}
    >
      <AvatarFrame>
        <AncNodeAvatar $hasImage={Boolean(src)} $deceased={isDeceased}>
          {src
            ? <AvatarImage src={src} alt={`${baseName} 프로필 사진`} loading="lazy" decoding="async" />
            : initial}
        </AncNodeAvatar>
        <CountryFlag flag={sibFlag} countryName={sibCountryName} size={16} />
      </AvatarFrame>
      <NodeNameWrap>
        {person.regnalName && <NodeRegnalName>♛ {person.regnalName}</NodeRegnalName>}
        <AncNodeName>
          {displayName}
          {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
        </AncNodeName>
        {span && <NodeMeta>{span}</NodeMeta>}
        {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
      </NodeNameWrap>
      <NodeBadge $role="sibling">형제</NodeBadge>
    </GeoNode>
  )
}

// ─── SiblingsListModal (전체 형제 보기) ─────────────────────────────
/**
 * "외 N명 더 보기" 칩 클릭 시 전체 형제를 출생연도순 컴팩트 카드 그리드로 표시.
 * 가계도 인포그래픽 위에 오버레이 — 클릭 외부·Esc로 닫음.
 */
function SiblingsListModal({
  siblings,
  onClose,
  onPersonClick,
}: {
  siblings: NodePerson[]
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <SiblingsModalOverlay onClick={onClose} role="dialog" aria-label="형제자매 전체 목록">
      <SiblingsModalPanel onClick={(e) => e.stopPropagation()}>
        <SiblingsModalHeader>
          <SiblingsModalTitle>형제자매 — {siblings.length}명</SiblingsModalTitle>
          <SiblingsModalClose type="button" onClick={onClose} aria-label="닫기">×</SiblingsModalClose>
        </SiblingsModalHeader>
        <SiblingsModalGrid>
          {siblings.map((sib, idx) => (
            <SiblingCompactNode
              key={sib.id ?? `sib-modal-${idx}`}
              person={sib}
              onPersonClick={(id) => {
                onClose()
                onPersonClick?.(id)
              }}
            />
          ))}
        </SiblingsModalGrid>
      </SiblingsModalPanel>
    </SiblingsModalOverlay>
  )
}

// ─── AncestorSiblingsModal (조상 형제 보기) ─────────────────────────
/**
 * 조상 카드 옆 "형제 N" 칩 클릭 시 — 그 인물의 형제 전원을 컴팩트 카드 그리드로.
 * SiblingsListModal과 시각·동작 동일. 차이는 입력 타입(FamilyTreePerson)과
 * 헤더에 "누구의 형제"인지 명시.
 */
function AncestorSiblingsModal({
  person,
  siblings,
  onClose,
  onPersonClick,
}: {
  person: FamilyTreePerson
  siblings: FamilyTreePerson[]
  onClose: () => void
  onPersonClick?: (id: string) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const subjectName = getPersonDisplayName(person, true)
  return (
    <SiblingsModalOverlay onClick={onClose} role="dialog" aria-label={`${subjectName}의 형제자매`}>
      <SiblingsModalPanel onClick={(e) => e.stopPropagation()}>
        <SiblingsModalHeader>
          <SiblingsModalTitle>
            {subjectName}의 형제자매 — {siblings.length}명
          </SiblingsModalTitle>
          <SiblingsModalClose type="button" onClick={onClose} aria-label="닫기">×</SiblingsModalClose>
        </SiblingsModalHeader>
        <SiblingsModalGrid>
          {siblings.map((sib, idx) => (
            <DescendantNode
              key={sib.id ?? `anc-sib-${idx}`}
              person={sib}
              badge="형제"
              onPersonClick={(id) => {
                onClose()
                onPersonClick?.(id)
              }}
            />
          ))}
        </SiblingsModalGrid>
      </SiblingsModalPanel>
    </SiblingsModalOverlay>
  )
}

// ─── DescendantSubtree (자녀 카드 아래 후손 세대 — 재귀) ─────────────
/**
 * 자녀 카드 바로 아래에 후손 세대를 그린다. 윗 세대(조부모/증조부모) 카드와
 * 같은 컴팩트 GeoNode 스타일을 사용한다.
 *  - 1명: 단순 수직선(ForkFromOneParent)
 *  - N명: T-fork (ForkToCompactChildren) + 각 카드 위 수직선(::before)
 *
 * 손자녀(depth=1) → 증손자녀(depth=2)까지 재귀 렌더링.
 * 더 깊이 있을 수 있지만 BFS limit + UI 가독성 위해 maxDepth 제한.
 */
const DESCENDANT_BADGES = ['손자녀', '증손자녀', '고손자녀', '후손']
function DescendantSubtree({
  descendants,
  childrenOf,
  depth,
  maxDepth,
  visited,
  onPersonClick,
}: {
  descendants: FamilyTreePerson[]
  childrenOf: Map<string, FamilyTreePerson[]>
  depth: number
  maxDepth: number
  visited: Set<string>
  onPersonClick?: (id: string) => void
}) {
  if (descendants.length === 0) return null
  const badge = DESCENDANT_BADGES[depth] ?? '후손'
  return (
    <GrandchildrenBlock>
      <GrandchildrenForkTrack>
        {descendants.length > 1
          ? <ForkToCompactChildren count={descendants.length} />
          : <ForkFromOneParent />}
      </GrandchildrenForkTrack>
      <GrandchildrenRow>
        {descendants.map((g) => {
          const next = depth + 1 < maxDepth && g.id
            ? (childrenOf.get(g.id) ?? []).filter((c) => !visited.has(c.id))
            : []
          const nextVisited = new Set(visited)
          if (g.id) nextVisited.add(g.id)
          return (
            <GrandchildPair key={g.id}>
              <DescendantNode person={g} badge={badge} onPersonClick={onPersonClick} />
              {next.length > 0 && (
                <DescendantSubtree
                  descendants={next}
                  childrenOf={childrenOf}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  visited={nextVisited}
                  onPersonClick={onPersonClick}
                />
              )}
            </GrandchildPair>
          )
        })}
      </GrandchildrenRow>
    </GrandchildrenBlock>
  )
}

/** N개의 컴팩트 손자녀 카드 위로 T자형 분기선 — 카드 폭 ANC_W 기준으로 정렬 */
function ForkToCompactChildren({ count }: { count: number }) {
  const GAP = 12 // GrandchildrenRow gap
  const W = ANC_W
  const totalW = count * W + (count - 1) * GAP
  const xStart = W / 2
  const xEnd = totalW - W / 2
  const xMid = totalW / 2
  return (
    <svg
      width={totalW}
      height={28}
      viewBox={`0 0 ${totalW} 28`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', color: 'inherit' }}
    >
      <title>손자녀 세대로 이어지는 분기선</title>
      <path
        d={`M ${xMid} 0 L ${xMid} 14 M ${xStart} 14 L ${xEnd} 14`}
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export function PersonGenealogyInfographic({
  ego,
  paternalGrandfather, paternalGrandmother,
  maternalGrandfather, maternalGrandmother,
  father, mother,
  spouses: spousesProp,
  spouse: spouseLegacy,
  children,
  siblings,
  familyTreeData,
  onPersonClick,
}: PersonGenealogyInfographicProps) {
  // ── FamilyTreeData 기반 동적 조상 렌더링 준비 ──────────────────
  const ftNodeMap = useMemo(() => {
    if (!familyTreeData) return new Map<string, FamilyTreePerson>()
    const m = new Map<string, FamilyTreePerson>()
    for (const n of familyTreeData.nodes) m.set(n.id, n)
    return m
  }, [familyTreeData])

  const ftParentsOf = useMemo(() => {
    if (!familyTreeData) return new Map<string, string[]>()
    const m = new Map<string, string[]>()
    for (const e of familyTreeData.edges) {
      if (e.type === 'parent-child') {
        const arr = m.get(e.target) ?? []
        arr.push(e.source)
        m.set(e.target, arr)
      }
    }
    return m
  }, [familyTreeData])

  const { fatherId: ftFatherId, motherId: ftMotherId } = useMemo(
    () => familyTreeData
      ? ftResolveParentIds(familyTreeData.egoId, ftParentsOf, ftNodeMap)
      : {},
    [familyTreeData, ftParentsOf, ftNodeMap],
  )

  const childList = (children ?? []).filter(Boolean)

  // childrenOf 맵: parentId → grandchild ids (familyTreeData 기반)
  const ftChildrenOf = useMemo(() => {
    const m = new Map<string, string[]>()
    if (!familyTreeData) return m
    for (const e of familyTreeData.edges) {
      if (e.type === 'parent-child') {
        const arr = m.get(e.source) ?? []
        arr.push(e.target)
        m.set(e.source, arr)
      }
    }
    return m
  }, [familyTreeData])

  /**
   * 가계도 안 모든 인물 → 형제자매 노드 배열 (출생연도 오름차순).
   * 부모 한쪽이라도 공유하면 형제로 인정 (이복 형제 포함).
   * ego 본인은 결과에서 제외 (ego의 형제는 별도 SiblingsStack로 표시).
   */
  const siblingsByPersonId = useMemo(() => {
    const out = new Map<string, FamilyTreePerson[]>()
    if (!familyTreeData) return out
    for (const node of familyTreeData.nodes) {
      const parents = ftParentsOf.get(node.id) ?? []
      if (parents.length === 0) continue
      const siblingIds = new Set<string>()
      for (const pid of parents) {
        for (const cid of ftChildrenOf.get(pid) ?? []) {
          if (cid !== node.id && cid !== ego.id) siblingIds.add(cid)
        }
      }
      if (siblingIds.size === 0) continue
      const siblingNodes = [...siblingIds]
        .map((sid) => familyTreeData.nodes.find((n) => n.id === sid))
        .filter((n): n is FamilyTreePerson => Boolean(n))
        .sort((a, b) => {
          const ay = a.birthYear ?? Number.POSITIVE_INFINITY
          const by = b.birthYear ?? Number.POSITIVE_INFINITY
          return ay - by
        })
      if (siblingNodes.length > 0) out.set(node.id, siblingNodes)
    }
    return out
  }, [familyTreeData, ftChildrenOf, ftParentsOf, ego.id])

  // 각 부모(=ego의 자녀, 손자녀, …) → 다음 세대 노드 배열 (출생연도 오름차순).
  // ego·ego의 자녀(=한 깊이 위)는 제외 — 자기 자신이 자기 자손으로 들어가는 건 데이터 오류.
  const descendantsByParentId = useMemo(() => {
    const out = new Map<string, FamilyTreePerson[]>()
    if (!familyTreeData) return out
    const childIds = new Set(childList.map((c) => c.id).filter(Boolean) as string[])
    const excludeIds = new Set<string>([ego.id, ...childIds].filter(Boolean) as string[])
    // BFS로 ego 후손 그래프 전체에 대해 자녀 맵 생성 (재귀 N세대 렌더에 활용)
    const queue: string[] = [...childIds]
    const seen = new Set<string>(childIds)
    while (queue.length > 0) {
      const pid = queue.shift()!
      const childIdsOfP = ftChildrenOf.get(pid) ?? []
      const childNodes = childIdsOfP
        .filter((cid) => !excludeIds.has(cid))
        .map((cid) => ftNodeMap.get(cid))
        .filter((n): n is FamilyTreePerson => Boolean(n))
        .sort((a, b) => {
          const ay = a.birthYear ?? Number.POSITIVE_INFINITY
          const by = b.birthYear ?? Number.POSITIVE_INFINITY
          return ay - by
        })
      if (childNodes.length > 0) out.set(pid, childNodes)
      for (const cn of childNodes) {
        if (cn.id && !seen.has(cn.id)) {
          seen.add(cn.id)
          queue.push(cn.id)
        }
      }
    }
    return out
  }, [familyTreeData, ftChildrenOf, ftNodeMap, childList, ego.id])

  const siblingList = (siblings ?? []).filter(Boolean).slice().sort((a, b) => {
    const ay = birthYearOf(a)
    const by = birthYearOf(b)
    if (ay == null && by == null) return 0
    if (ay == null) return 1
    if (by == null) return -1
    return ay - by
  })
  const spouseList: NodePerson[] =
    spousesProp != null ? (spousesProp.filter(Boolean) as NodePerson[])
    : spouseLegacy ? [spouseLegacy]
    : []

  const handleClick = useCallback((id?: string) => {
    if (!id || !onPersonClick) return
    onPersonClick(id)
  }, [onPersonClick])

  const clickableProps = useCallback((id?: string) =>
    id && onPersonClick
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick: () => handleClick(id),
          onKeyDown: (e: ReactKeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(id) }
          },
          $clickable: true,
        }
      : {},
    [handleClick, onPersonClick],
  )

  const hasPaternalGp = Boolean(paternalGrandfather || paternalGrandmother)
  const hasMaternalGp = Boolean(maternalGrandfather || maternalGrandmother)
  const hasParents = Boolean(father || mother)
  const twoParents = Boolean(father && mother)
  const hasSpouses = spouseList.length > 0
  const hasChildren = childList.length > 0
  const hasSiblings = siblingList.length > 0

  const hasFatherSide = Boolean(father || paternalGrandfather || paternalGrandmother)
  const hasMotherSide = Boolean(mother || maternalGrandfather || maternalGrandmother)
  const twoSides = hasFatherSide && hasMotherSide

  const hasFtAncestors = Boolean(ftFatherId || ftMotherId)
  if (!hasFatherSide && !hasMotherSide && !hasFtAncestors && !hasSpouses && !hasChildren && !hasSiblings) return null

  const firstSpouse = spouseList[0] ?? null
  // 형제자매가 있으면 왼쪽을 차지하므로, 배우자는 항상 오른쪽
  const spouseSide: 'left' | 'right' | null = hasSpouses
    ? hasSiblings || (!isRight(ego) && !isLeft(firstSpouse)) ? 'right' : 'left'
    : null

  // ── 형제자매: 컴팩트 카드 + 인접 출생순 N명만 기본 표시, 나머지는 모달 ─────
  // 사회적·친족적 의미가 큰 "본인 가까이 태어난 형제" 우선 노출.
  // ego 출생연도가 없으면 첫 N명. SiblingList는 이미 birthYear asc 정렬됨.
  const SIBLINGS_DEFAULT_LIMIT = 3
  const [siblingsModalOpen, setSiblingsModalOpen] = useState(false)
  /** 조상 인물의 형제를 보여주는 모달 — 클릭한 조상의 personId */
  const [ancestorSiblingsOf, setAncestorSiblingsOf] = useState<{
    person: FamilyTreePerson
    siblings: FamilyTreePerson[]
  } | null>(null)
  const visibleSiblings = useMemo(() => {
    if (siblingList.length <= SIBLINGS_DEFAULT_LIMIT) return siblingList
    const egoY = birthYearOf(ego)
    if (egoY == null) return siblingList.slice(0, SIBLINGS_DEFAULT_LIMIT)
    // ego와 출생연도 차이 절대값 기준으로 상위 N명을 출생순으로 다시 정렬
    return siblingList
      .map((s, idx) => ({ s, idx, dy: Math.abs((birthYearOf(s) ?? Number.POSITIVE_INFINITY) - egoY) }))
      .sort((a, b) => a.dy - b.dy)
      .slice(0, SIBLINGS_DEFAULT_LIMIT)
      .sort((a, b) => {
        const ay = birthYearOf(a.s)
        const by = birthYearOf(b.s)
        if (ay == null && by == null) return 0
        if (ay == null) return 1
        if (by == null) return -1
        return ay - by
      })
      .map((x) => x.s)
  }, [siblingList, ego])
  const hiddenSiblingCount = siblingList.length - visibleSiblings.length

  return (
   <FamilyTreeLookupContext.Provider value={ftNodeMap}>
    <Root>
      <InfographicHeader>
        <HeaderIcon aria-hidden>
          <FiUsers size={18} strokeWidth={1.75} />
        </HeaderIcon>
        <HeaderText>
          <HeaderTitle>가계도</HeaderTitle>
          <HeaderDesc>
            위·아래가 세대입니다. 가로로 이어진 선은 부부, 아래로 꺾인 선은 자녀·후손 방향입니다.
          </HeaderDesc>
        </HeaderText>
      </InfographicHeader>

      <TreeCanvas
        role="tree"
        aria-label={`${getPersonDisplayName(ego, true)} 가계도`}
      >
        <GenerationsInner>
        {/* ── 조상 세대 (동적 n세대) ── */}
        {familyTreeData && (ftFatherId || ftMotherId) ? (
          // FamilyTreeData가 있으면 AncestorColumn으로 재귀 렌더링 (고조부모까지)
          <GenerationBlock>
            <ParentsRow $twoSides={!!(ftFatherId && ftMotherId)}>
              {ftFatherId && (
                <AncestorColumn
                  personId={ftFatherId}
                  path="F"
                  nodeMap={ftNodeMap}
                  parentsOf={ftParentsOf}
                  maxDepth={FT_MAX_DEPTH}
                  visited={new Set<string>()}
                  siblingsByPersonId={siblingsByPersonId}
                  onPersonClick={onPersonClick}
                  onOpenSiblings={(person, sibs) => setAncestorSiblingsOf({ person, siblings: sibs })}
                />
              )}
              {ftMotherId && (
                <AncestorColumn
                  personId={ftMotherId}
                  path="M"
                  nodeMap={ftNodeMap}
                  parentsOf={ftParentsOf}
                  maxDepth={FT_MAX_DEPTH}
                  visited={new Set<string>()}
                  siblingsByPersonId={siblingsByPersonId}
                  onPersonClick={onPersonClick}
                  onOpenSiblings={(person, sibs) => setAncestorSiblingsOf({ person, siblings: sibs })}
                />
              )}
            </ParentsRow>
            <ForkTrack>
              {ftFatherId && ftMotherId ? <ForkFromTwoParents /> : <ForkFromOneParent />}
            </ForkTrack>
          </GenerationBlock>
        ) : (hasFatherSide || hasMotherSide) ? (
          // fallback: 조부모까지만 표시하는 기존 렌더링
          <GenerationBlock>
            <ParentsRow $twoSides={twoSides}>
              {hasFatherSide && (
                <FamilyColumn $hasParent={Boolean(father)}>
                  {hasPaternalGp && (
                    <>
                      <GrandparentPair>
                        {paternalGrandfather && (
                          <GeoNode $role="grandparent" {...clickableProps(paternalGrandfather.id)}>
                            <GeoThumbnail person={paternalGrandfather} role="grandparent" />
                            <NodeNameBlock person={paternalGrandfather} />
                            <NodeBadge $role="grandparent">친조부</NodeBadge>
                          </GeoNode>
                        )}
                        {paternalGrandmother && (
                          <GeoNode $role="grandparentAlt" {...clickableProps(paternalGrandmother.id)}>
                            <GeoThumbnail person={paternalGrandmother} role="grandparentAlt" />
                            <NodeNameBlock person={paternalGrandmother} />
                            <NodeBadge $role="grandparentAlt">친조모</NodeBadge>
                          </GeoNode>
                        )}
                      </GrandparentPair>
                      {father && (
                        <GrandparentForkTrack $twoGp={Boolean(paternalGrandfather && paternalGrandmother)}>
                          {paternalGrandfather && paternalGrandmother
                            ? <ForkFromTwoGrandparents />
                            : <ForkFromOneParent />
                          }
                        </GrandparentForkTrack>
                      )}
                    </>
                  )}
                  {father && (
                    <GeoNode $role="parent" {...clickableProps(father.id)}>
                      <GeoThumbnail person={father} role="parent" />
                      <NodeNameBlock person={father} />
                      <NodeBadge $role="parent">아버지</NodeBadge>
                    </GeoNode>
                  )}
                </FamilyColumn>
              )}
              {hasMotherSide && (
                <FamilyColumn $hasParent={Boolean(mother)}>
                  {hasMaternalGp && (
                    <>
                      <GrandparentPair>
                        {maternalGrandfather && (
                          <GeoNode $role="grandparent" {...clickableProps(maternalGrandfather.id)}>
                            <GeoThumbnail person={maternalGrandfather} role="grandparent" />
                            <NodeNameBlock person={maternalGrandfather} />
                            <NodeBadge $role="grandparent">외조부</NodeBadge>
                          </GeoNode>
                        )}
                        {maternalGrandmother && (
                          <GeoNode $role="grandparentAlt" {...clickableProps(maternalGrandmother.id)}>
                            <GeoThumbnail person={maternalGrandmother} role="grandparentAlt" />
                            <NodeNameBlock person={maternalGrandmother} />
                            <NodeBadge $role="grandparentAlt">외조모</NodeBadge>
                          </GeoNode>
                        )}
                      </GrandparentPair>
                      {mother && (
                        <GrandparentForkTrack $twoGp={Boolean(maternalGrandfather && maternalGrandmother)}>
                          {maternalGrandfather && maternalGrandmother
                            ? <ForkFromTwoGrandparents />
                            : <ForkFromOneParent />
                          }
                        </GrandparentForkTrack>
                      )}
                    </>
                  )}
                  {mother && (
                    <GeoNode $role="parentAlt" {...clickableProps(mother.id)}>
                      <GeoThumbnail person={mother} role="parentAlt" />
                      <NodeNameBlock person={mother} />
                      <NodeBadge $role="parentAlt">어머니</NodeBadge>
                    </GeoNode>
                  )}
                </FamilyColumn>
              )}
            </ParentsRow>
            {hasParents && (
              <ForkTrack>
                {twoParents ? <ForkFromTwoParents /> : <ForkFromOneParent />}
              </ForkTrack>
            )}
          </GenerationBlock>
        ) : null}

        {/* ── 본인 세대 ── */}
        <GenerationBlock>
          <EgoRow>
            {/* 좌측: 형제자매 (있으면 우선) 또는 배우자 좌측 */}
            {hasSiblings ? (
              <SiblingSlot>
                <SiblingsStack>
                  {visibleSiblings.map((sib, idx) => (
                    <SiblingCompactNode
                      key={sib.id ?? `sib-${idx}`}
                      person={sib}
                      onPersonClick={onPersonClick}
                    />
                  ))}
                  {hiddenSiblingCount > 0 && (
                    <SiblingMoreToggle
                      type="button"
                      onClick={() => setSiblingsModalOpen(true)}
                      aria-label={`형제자매 ${hiddenSiblingCount}명 더 보기 (전체 ${siblingList.length}명)`}
                    >
                      외 {hiddenSiblingCount}명 더 보기
                    </SiblingMoreToggle>
                  )}
                </SiblingsStack>
                <SiblingJoin aria-hidden>
                  <svg width="36" height="20" viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0 10 L 36 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <SiblingIcon><FiUsers size={12} strokeWidth={2.2} /></SiblingIcon>
                </SiblingJoin>
              </SiblingSlot>
            ) : hasSpouses && spouseSide === 'left' ? (
              <SpouseSlot $side="left">
                <SpouseStack>
                  {spouseList.map((sp, i) => (
                    <GeoNode key={sp.id ?? `sp-${i}`} $role="spouse" {...clickableProps(sp.id)}>
                      <GeoThumbnail person={sp} role="spouse" />
                      <NodeNameBlock person={sp} />
                      <NodeBadge $role="spouse">{spouseList.length > 1 ? `배우자 ${i + 1}` : '배우자'}</NodeBadge>
                    </GeoNode>
                  ))}
                </SpouseStack>
                <SpouseJoin aria-hidden>
                  <svg width="36" height="20" viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0 10 L 36 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <SpouseHeart><FiHeart size={13} strokeWidth={2.2} /></SpouseHeart>
                </SpouseJoin>
              </SpouseSlot>
            ) : null}
            <EgoSlot>
              <GeoNode $role="ego" $emphasis>
                <GeoThumbnail person={ego} role="ego" />
                <NodeNameBlock person={ego} />
                <NodeBadge $role="ego">본인</NodeBadge>
              </GeoNode>
            </EgoSlot>
            {/* 배우자 우측 */}
            {hasSpouses && spouseSide === 'right' && (
              <SpouseSlot $side="right">
                <SpouseJoin aria-hidden>
                  <svg width="36" height="20" viewBox="0 0 36 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0 10 L 36 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <SpouseHeart><FiHeart size={13} strokeWidth={2.2} /></SpouseHeart>
                </SpouseJoin>
                <SpouseStack>
                  {spouseList.map((sp, i) => (
                    <GeoNode key={sp.id ?? `sp-${i}`} $role="spouse" {...clickableProps(sp.id)}>
                      <GeoThumbnail person={sp} role="spouse" />
                      <NodeNameBlock person={sp} />
                      <NodeBadge $role="spouse">{spouseList.length > 1 ? `배우자 ${i + 1}` : '배우자'}</NodeBadge>
                    </GeoNode>
                  ))}
                </SpouseStack>
              </SpouseSlot>
            )}
          </EgoRow>
        </GenerationBlock>

        {/* ── 자녀 세대 ── */}
        {hasChildren && (
          <GenerationBlock>
            <ForkTrack $compact $multiChild={childList.length > 1}>
              {childList.length > 1 ? <ForkToChildren childList={childList} /> : <ForkFromOneParent />}
            </ForkTrack>
            {childList.length === 1 ? (
              // 자녀 1명: ego-row 패턴과 동일하게 자녀 카드를 정중앙(auto 컬럼)에 고정
              // → fork 수직선(50%)이 자녀 카드 중심과 정확히 일치
              <SingleChildRow>
                {/* col 1 (1fr) — 왼쪽 배우자 or 빈 균형 공간 */}
                {(() => {
                  const child = childList[0]
                  if (!child.spouse) return <div />
                  const childIsLeft = isLeft(child) || isRight(child.spouse) ? true
                    : isLeft(child.spouse) || isRight(child) ? false : true
                  if (childIsLeft) return <div />
                  const spouseNode = (
                    <GeoNode $role="spouse" {...clickableProps(child.spouse.id)}>
                      <GeoThumbnail person={child.spouse} role="spouse" />
                      <NodeNameBlock person={child.spouse} />
                      <NodeBadge $role="spouse">배우자</NodeBadge>
                    </GeoNode>
                  )
                  const join = (
                    <SpouseJoin aria-hidden>
                      <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                    </SpouseJoin>
                  )
                  return <ChildSpouseSlot $reverse>{spouseNode}{join}</ChildSpouseSlot>
                })()}
                {/* col 2 (auto) — 자녀 카드 + 손자녀 서브트리 */}
                <ChildNodeColumn>
                  <GeoNode $role="child" {...clickableProps(childList[0].id)}>
                    <GeoThumbnail person={childList[0]} role="child" />
                    <NodeNameBlock person={childList[0]} />
                    <NodeBadge $role="child">자녀</NodeBadge>
                  </GeoNode>
                  {childList[0].id && descendantsByParentId.has(childList[0].id) && (
                    <DescendantSubtree
                      descendants={descendantsByParentId.get(childList[0].id) ?? []}
                      childrenOf={descendantsByParentId}
                      depth={0}
                      maxDepth={3}
                      visited={new Set([ego.id, childList[0].id].filter(Boolean) as string[])}
                      onPersonClick={onPersonClick}
                    />
                  )}
                </ChildNodeColumn>
                {/* col 3 (1fr) — 오른쪽 배우자 or 빈 균형 공간 */}
                {(() => {
                  const child = childList[0]
                  if (!child.spouse) return <div />
                  const childIsLeft = isLeft(child) || isRight(child.spouse) ? true
                    : isLeft(child.spouse) || isRight(child) ? false : true
                  if (!childIsLeft) return <div />
                  const spouseNode = (
                    <GeoNode $role="spouse" {...clickableProps(child.spouse.id)}>
                      <GeoThumbnail person={child.spouse} role="spouse" />
                      <NodeNameBlock person={child.spouse} />
                      <NodeBadge $role="spouse">배우자</NodeBadge>
                    </GeoNode>
                  )
                  const join = (
                    <SpouseJoin aria-hidden>
                      <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                    </SpouseJoin>
                  )
                  return <ChildSpouseSlot>{join}{spouseNode}</ChildSpouseSlot>
                })()}
              </SingleChildRow>
            ) : (
              <ChildrenGrid>
                {childList.map((child, idx) => {
                  const pairKey = child.id ?? `child-${idx}`
                  const grands = child.id
                    ? descendantsByParentId.get(child.id)
                    : undefined
                  const grandSubtree = grands && grands.length > 0 ? (
                    <DescendantSubtree
                      descendants={grands}
                      childrenOf={descendantsByParentId}
                      depth={0}
                      maxDepth={3}
                      visited={new Set([ego.id, child.id].filter(Boolean) as string[])}
                      onPersonClick={onPersonClick}
                    />
                  ) : null
                  const childNode = (
                    <GeoNode key={`${pairKey}-self`} $role="child" {...clickableProps(child.id)}>
                      <GeoThumbnail person={child} role="child" />
                      <NodeNameBlock person={child} />
                      <NodeBadge $role="child">자녀</NodeBadge>
                    </GeoNode>
                  )
                  if (!child.spouse) {
                    // 배우자 없음: 자녀 카드 중심이 ChildPair 중심
                    return (
                      <ChildPair key={pairKey} $childOffset={NODE_W / 2}>
                        <ChildNodeColumn>
                          {childNode}
                          {grandSubtree}
                        </ChildNodeColumn>
                      </ChildPair>
                    )
                  }
                  const spouseNode = (
                    <GeoNode key={`${pairKey}-sp-${child.spouse.id ?? 'u'}`} $role="spouse" {...clickableProps(child.spouse.id)}>
                      <GeoThumbnail person={child.spouse} role="spouse" />
                      <NodeNameBlock person={child.spouse} />
                      <NodeBadge $role="spouse">배우자</NodeBadge>
                    </GeoNode>
                  )
                  const join = (
                    <SpouseJoin key={`${pairKey}-join`} aria-hidden>
                      <svg width="28" height="20" viewBox="0 0 28 20" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 0 10 L 28 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <SpouseHeart><FiHeart size={12} strokeWidth={2.2} /></SpouseHeart>
                    </SpouseJoin>
                  )
                  const childIsLeft = isLeft(child) || isRight(child.spouse) ? true
                    : isLeft(child.spouse) || isRight(child) ? false : true
                  // 자녀 카드 중심 offset: 왼쪽이면 NODE_W/2, 오른쪽이면 배우자+join 너비만큼 밀림
                  const childOffset = childIsLeft ? NODE_W / 2 : NODE_W + SPOUSE_JOIN_W + NODE_W / 2
                  // 손자녀 서브트리는 자녀 카드 바로 아래에만 위치 (배우자 옆에 정렬)
                  const childWithGrand = (
                    <ChildNodeColumn>
                      {childNode}
                      {grandSubtree}
                    </ChildNodeColumn>
                  )
                  return (
                    <ChildPair key={pairKey} $childOffset={childOffset}>
                      <ChildPairRow>
                        {childIsLeft
                          ? <>{childWithGrand}{join}{spouseNode}</>
                          : <>{spouseNode}{join}{childWithGrand}</>}
                      </ChildPairRow>
                    </ChildPair>
                  )
                })}
              </ChildrenGrid>
            )}
          </GenerationBlock>
        )}
        </GenerationsInner>
      </TreeCanvas>

      {siblingsModalOpen && (
        <SiblingsListModal
          siblings={siblingList}
          onClose={() => setSiblingsModalOpen(false)}
          onPersonClick={onPersonClick}
        />
      )}
      {ancestorSiblingsOf && (
        <AncestorSiblingsModal
          person={ancestorSiblingsOf.person}
          siblings={ancestorSiblingsOf.siblings}
          onClose={() => setAncestorSiblingsOf(null)}
          onPersonClick={onPersonClick}
        />
      )}
    </Root>
   </FamilyTreeLookupContext.Provider>
  )
}

// ─── Styled Components ─────────────────────────────────────────────
const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* 상단 안전 마진 — 부모 컨테이너의 잠재적 클립이나 sticky 헤더에 가려지지 않도록 */
  padding: 4px 0 0;
`

const InfographicHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
      : css`background: ${theme.colors.background.secondary}; border: 1px solid ${theme.colors.border.light};`}
`

const HeaderIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
`

const HeaderText = styled.div`min-width: 0;`

const HeaderTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeaderDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const TreeCanvas = styled.div`
  /*
   * 외곽 스크롤 컨테이너. 내부 GenerationsInner 가 자연 너비(max-content)를 가지므로
   * 패널 폭이 좁아져도 카드끼리 겹치지 않고 가로 스크롤로만 처리됨.
   * 상단 padding은 ConsanguinityMark·AncestorSiblingChip 등 카드 모서리 마커가
   * 잘리지 않도록 하기 위함.
   */
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 8px 4px 12px;
`

/**
 * 실제 가계도 콘텐츠. width: max-content 로 자연 너비를 가져
 * 외부 패널 폭이 좁을 때 TreeCanvas의 가로 스크롤이 작동.
 * 부모 너비에 맞춰 가운데 정렬은 margin: auto.
 */
const GenerationsInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  min-width: 100%;
  margin: 0 auto;
`

const SiblingMoreToggle = styled.button`
  align-self: center;
  padding: 6px 12px;
  font-size: 11.5px;
  font-weight: 700;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.07)'};
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.26)' : 'rgba(99, 102, 241, 0.18)'};
  transition: background 0.15s ease;
  white-space: nowrap;
  &:hover, &:focus-within, &:active {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

// ─── SiblingsListModal styled ───────────────────────────────────────
const SiblingsModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
`

const SiblingsModalPanel = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: 80vh;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
`

const SiblingsModalHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const SiblingsModalTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SiblingsModalClose = styled.button`
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  border: 0;
  background: transparent;
  font-size: 22px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const SiblingsModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${ANC_W}px, 1fr));
  gap: 12px;
  padding: 18px;
  overflow-y: auto;
  justify-items: center;
`

/**
 * AncestorColumn 카드 우측에 작은 "형제 N" 칩을 표시.
 * GeoNode의 outer wrapper로 카드와 칩을 한 줄에 묶음.
 * 폭은 카드와 동일(ANC_W) — 칩은 카드 폭 안에서 우측 상단에 absolute 배치.
 */
const GeoNodeWithChip = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
`

const AncestorSiblingChip = styled.button`
  /* 카드 안쪽 우측 상단 — 부모 컨테이너 밖으로 튀어나오지 않게 음수 offset 금지.
     TreeCanvas의 overflow-y: hidden이 있어 외부로 튀면 잘림. */
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 3;
  padding: 2px 6px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.10)'};
  color: #6366f1;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.42)' : 'rgba(99, 102, 241, 0.26)'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background 0.15s ease;
  white-space: nowrap;
  &:hover, &:focus-within, &:active {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.30)' : 'rgba(99, 102, 241, 0.18)'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

const GenerationBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

/**
 * ParentsRow: 아버지 쪽 FamilyColumn + 어머니 쪽 FamilyColumn을 나란히 배치
 * twoSides일 때 1fr 1fr grid → 각 FamilyColumn 중심이 25% / 75%
 * ForkFromTwoParents viewBox x=100(25%), x=300(75%)와 정확히 일치
 *
 * align-items: end — 두 컬럼을 아래로 정렬해서 아버지/어머니 카드가 같은 y 좌표에 놓이게.
 * (한쪽 컬럼에만 조부모가 있을 때 반대쪽 부모가 조부모 행에 붙어버리는 문제 방지)
 */
const ParentsRow = styled.div<{ $twoSides: boolean }>`
  width: 100%;
  ${({ $twoSides }) => $twoSides
    ? css`display: grid; grid-template-columns: 1fr 1fr; align-items: end;`
    : css`display: flex; justify-content: center;`}
`

/**
 * FamilyColumn: 조부모 쌍 + fork 선 + 부모 카드를 수직으로 묶음
 * $hasParent=true  → justify-content: flex-end (조부모+fork+부모 순서로 하단 정렬)
 * $hasParent=false → justify-content: center  (조부모만 있는 경우 세로 중앙 정렬)
 */
const FamilyColumn = styled.div<{ $hasParent: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: ${({ $hasParent }) => ($hasParent ? 'flex-end' : 'center')};
`

const GrandparentPair = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: flex-start;
  gap: ${GP_PAIR_GAP}px;
`

/**
 * GrandparentForkTrack: 고정 px 너비를 통해 SVG 내 선 위치를 정확히 유지
 * FamilyColumn align-items center → ForkTrack 중심 = FamilyColumn 중심 = 부모 카드 중심
 */
const GrandparentForkTrack = styled.div<{ $twoGp: boolean }>`
  width: ${({ $twoGp }) => ($twoGp ? GP_PAIR_W : NODE_W)}px;
  height: 52px;
  margin: 4px 0 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const ForkTrack = styled.div<{ $compact?: boolean; $multiChild?: boolean }>`
  /* 다자녀일 때는 ForkToChildren SVG의 명시적 width를 따름 (fit-content) */
  width: ${({ $multiChild }) => ($multiChild ? 'fit-content' : '100%')};
  max-width: 100%;
  height: ${({ $compact }) => ($compact ? '48px' : '52px')};
  /* 다자녀: ChildPair::before(20px)가 ForkTrack 하단부터 위로 올라오므로 margin-bottom 0 */
  margin: 4px 0 ${({ $multiChild }) => ($multiChild ? '0' : '8px')};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

/**
 * ForkSvg: preserveAspectRatio="none" + vectorEffect="non-scaling-stroke"
 * → SVG가 컨테이너를 꽉 채우면서 선 위치가 viewBox 비율 그대로 유지됨
 */
const ForkSvg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
`

/**
 * EgoRow: 1fr auto 1fr grid
 * auto = EgoSlot(본인 카드 192px) → 1fr = (전체 - 192) / 2
 * 본인 중심 = 1fr + 96 = 전체/2 (배우자 유무 무관하게 항상 중앙)
 * grid item이므로 배우자 여러 명이어도 EgoRow 높이가 자동 확장됨
 */
const EgoRow = styled.div`
  /*
   * 형제·ego·배우자 3열 그리드. minmax(0, 1fr)로 좌·우 컬럼이 자식 카드 폭에
   * 맞춰 자연스럽게 확장 — 좁은 화면에서 카드끼리 겹치지 않고 외곽 TreeCanvas가
   * 가로 스크롤로 처리.
   */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
`

const EgoSlot = styled.div`
  grid-column: 2;
  display: flex;
  justify-content: center;
`

const SpouseSlot = styled.div<{ $side: 'left' | 'right' }>`
  grid-column: ${({ $side }) => ($side === 'left' ? 1 : 3)};
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: ${({ $side }) => ($side === 'left' ? 'end' : 'start')};
`

const SpouseStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
`

const SpouseJoin = styled.div`
  position: relative;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: 0 2px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const SpouseHeart = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  padding: 2px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(251,113,133,0.95)' : '#e11d48'};
`

const SiblingSlot = styled.div`
  grid-column: 1;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-self: end;
`

const SiblingsStack = styled.div`
  /*
   * 형제자매 가로 스택. wrap 허용 시 SiblingJoin 선이 어색해지므로 nowrap.
   * 다수일 때는 SiblingMoreToggle로 collapse, 그래도 넘치면 외곽 스크롤.
   */
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
`

const SiblingJoin = styled.div`
  position: relative;
  flex: 0 0 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  margin: 0 2px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const SiblingIcon = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  padding: 2px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.85)' : '#64748b'};
`

/**
 * SingleChildRow: 자녀 1명일 때 ego-row와 동일한 1fr auto 1fr 그리드
 * auto 컬럼(자녀 카드)이 정중앙에 오도록 강제 → fork 수직선과 자녀 중심 일치
 */
const SingleChildRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  /* 손자녀 서브트리가 있으면 중앙 컬럼이 길어지므로 배우자는 카드 윗부분 정렬 */
  align-items: start;
  width: 100%;
`

const ChildSpouseSlot = styled.div<{ $reverse?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: ${({ $reverse }) => ($reverse ? 'flex-end' : 'flex-start')};
`

const ChildrenGrid = styled.div`
  /*
   * 자녀 카드를 한 줄에 나란히 배치. ForkToChildren SVG가 한 줄 가로 바를
   * 가정해 그려지므로 wrap을 허용하면 fork 정렬이 깨짐 → nowrap으로 고정,
   * 외곽 TreeCanvas가 가로 스크롤로 처리.
   */
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: none;
  gap: 16px;
  justify-content: center;
  align-items: flex-start;
`

/**
 * ChildPair: 다자녀 행에서 각 자녀+배우자 묶음
 * $childOffset = 자녀 카드 중심의 x 좌표 (ChildPair 좌측 기준 px)
 *   - 배우자 없음 또는 자녀가 왼쪽: NODE_W / 2 = 96
 *   - 자녀가 오른쪽: NODE_W + SPOUSE_JOIN_W + NODE_W / 2 = 340
 * ::before → ForkToChildren 가로 바에서 자녀 카드 중심으로 내려오는 수직 세그먼트
 */
const ChildPair = styled.div<{ $childOffset: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  flex-shrink: 0;
  flex-grow: 0;
  &::before {
    content: '';
    position: absolute;
    left: ${({ $childOffset }) => $childOffset}px;
    top: -20px;
    width: 1.75px;
    height: 20px;
    transform: translateX(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
  }
`

const ChildPairRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: flex-start;
  justify-content: center;
`

const ChildNodeColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
`

const GrandchildrenBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`

const GrandchildrenForkTrack = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  height: 28px;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

const GrandchildrenRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: fit-content;
  max-width: 100%;
  gap: 12px;
  justify-content: center;
  align-items: flex-start;
`

const GrandchildPair = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  flex-grow: 0;
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -16px;
    width: 1.75px;
    height: 16px;
    transform: translateX(-50%);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
  }
`

const GeoNode = styled.div<{ $role: string; $emphasis?: boolean; $clickable?: boolean; $compact?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ $compact }) => ($compact ? 6 : 10)}px;
  flex: 0 0 ${({ $compact }) => ($compact ? ANC_W : NODE_W)}px;
  width: ${({ $compact }) => ($compact ? ANC_W : NODE_W)}px;
  min-width: ${({ $compact }) => ($compact ? ANC_W : NODE_W)}px;
  max-width: ${({ $compact }) => ($compact ? ANC_W : NODE_W)}px;
  height: ${({ $compact }) => ($compact ? ANC_H : NODE_H)}px;
  min-height: ${({ $compact }) => ($compact ? ANC_H : NODE_H)}px;
  padding: ${({ $compact }) => ($compact ? '12px 10px 10px' : '18px 14px 16px')};
  border-radius: 16px;
  justify-content: flex-start;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(15,23,42,0.08); }
      &:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
    `}

  ${({ $emphasis, theme }) =>
    $emphasis
      ? css`
          ${theme.mode === 'dark'
            ? css`background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 0 0 1px rgba(99,102,241,0.35);`
            : css`background: ${theme.colors.background.primary}; border: 1px solid ${theme.colors.border.default}; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 0 0 1px rgba(99,102,241,0.2);`}
        `
      : css`
          ${theme.mode === 'dark'
            ? css`background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);`
            : css`background: ${theme.colors.background.primary}; border: 1px solid ${theme.colors.border.light};`}
          box-shadow: 0 1px 2px rgba(15,23,42,0.03);
          &:hover {
            transform: translateY(-1px);
            ${theme.mode === 'dark'
              ? css`border-color: rgba(255,255,255,0.1);`
              : css`border-color: ${theme.colors.border.medium}; box-shadow: 0 4px 12px rgba(15,23,42,0.06);`}
          }
        `}
`

const AvatarImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

/**
 * 카드 아바타 우하단에 absolute 배치되는 작은 국기 뱃지.
 * 부모(AvatarFrame)는 position: relative여야 함. emoji와 img 모두 같은 형태로 표시.
 */
const CountryFlagBadge = styled.span<{ $size: number }>`
  position: absolute;
  right: -2px;
  bottom: -2px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1.5px solid ${({ theme }) => theme.colors.background.primary};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  & img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

/**
 * 아바타 컨테이너 (NodeAvatar / AncNodeAvatar)를 감싸 position: relative를 부여하고
 * 그 안에 CountryFlag를 absolute로 위치시킴. 카드 종류 구분 없이 재사용.
 */
const AvatarFrame = styled.div`
  position: relative;
  display: inline-flex;
`

const NodeAvatar = styled.div<{ $role: string; $hasImage?: boolean }>`
  width: 96px;
  height: 96px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
  flex-shrink: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : '#94a3b8'};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
`

const NodeNameWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  width: 100%;
`

const NodeRegnalName = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.warning};
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const RegnalNumber = styled.span`
  margin-left: 3px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.85;
`

const RegnalCountry = styled.span`
  margin-left: 4px;
  font-size: 10px;
  font-weight: 500;
  opacity: 0.75;
`

const DeceasedMark = styled.span`
  font-size: 0.85em;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0;
`

const NodeName = styled.div`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const NodeMeta = styled.div`
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
`

const NodeDynasty = styled.div`
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.tertiary};
  word-break: keep-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

// ─── AncestorColumn 전용 styled components ──────────────────────────

/**
 * AncColumnDiv: 한 조상과 그 위 세대 묶음 컨테이너
 * - flex: 1 1 0 → AncParentsGrid 안에서 균등 분할 (항상 50:50)
 * - min-width: ANC_W → 가장 작은 카드 너비 보장
 * - align-items: center → 하위 카드 + fork가 수직 중앙 정렬
 * → ForkFromTwoParents(25%/75% 연결선)가 항상 정확히 맞음
 */
const AncColumnDiv = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  min-width: ${ANC_W}px;
`

/**
 * AncParentsGrid: 부/모 AncestorColumn을 1:1로 나란히
 * align-items: flex-end — 한쪽 가지에 윗 세대 데이터가 없으면(컬럼이 짧으면)
 * 짧은 쪽 카드가 위로 떠서 형제 가지의 윗 세대와 같은 행에 그려지는 문제를 방지.
 * 두 카드 하단이 항상 같은 y에 정렬돼야 그 아래 fork(상단 y=0에서 시작)가 카드 끝과 정확히 만남.
 */
const AncParentsGrid = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  width: 100%;
`

/** AncForkTrack: AncestorColumn 안에서 부모→자식 연결선 영역 */
const AncForkTrack = styled.div`
  width: 100%;
  height: 52px;
  margin: 4px 0 0;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(148,163,184,0.5)' : 'rgba(120,113,108,0.55)'};
`

/** AncNodeAvatar: AncestorColumn용 작은 아바타 (56px) */
const AncNodeAvatar = styled.div<{ $hasImage?: boolean; $deceased?: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
  flex-shrink: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : '#94a3b8'};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  ${({ $deceased, $hasImage }) =>
    $deceased &&
    $hasImage &&
    css`
      img {
        filter: grayscale(0.6) opacity(0.85);
      }
    `}
`

/** AncNodeName: compact 카드용 작은 이름 텍스트 */
const AncNodeName = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
`

const NodeBadge = styled.span<{ $role: string }>`
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: 4px 10px;
  border-radius: 8px;
  margin-top: auto;

  ${({ $role, theme }) => {
    const dark = theme.mode === 'dark'
    const pill = (bg: string, fg: string) => css`background: ${bg}; color: ${fg};`
    switch ($role) {
      case 'grandparent':
        return pill(dark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.1)', dark ? '#5eead4' : '#0f766e')
      case 'grandparentAlt':
        return pill(dark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)', dark ? '#6ee7b7' : '#065f46')
      case 'parent':
        return pill(dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', dark ? '#a5b4fc' : '#4f46e5')
      case 'parentAlt':
        return pill(dark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', dark ? '#c4b5fd' : '#6d28d9')
      case 'ego':
        return pill(dark ? 'rgba(45,212,191,0.15)' : 'rgba(13,148,136,0.1)', dark ? '#a5b4fc' : '#6366f1')
      case 'spouse':
        return pill(dark ? 'rgba(244,63,94,0.15)' : 'rgba(225,29,72,0.08)', dark ? '#fda4af' : '#be123c')
      case 'child':
        return pill(dark ? 'rgba(14,165,233,0.15)' : 'rgba(2,132,199,0.1)', dark ? '#7dd3fc' : '#0369a1')
      case 'sibling':
        return pill(dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', dark ? '#fcd34d' : '#b45309')
      default:
        return pill(dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.15)', theme.colors.text.secondary)
    }
  }}
`
