import { useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { FiX } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import type { FamilyTreePerson } from '@/shared/api/persons-family-tree'
import { getUploadImageUrl } from '@/shared/api/upload'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { NODE_H, NODE_W } from './constants'
import {
  FamilyTreeLookupContext,
  KinshipLookupContext,
  SpouseNamesLookupContext,
  useNodeOpenable,
} from './context'
import type { AvatarRole, FlagSource, NodePerson, PersonMetaSource } from './types'
import {
  birthYearOf,
  buildPersonTooltip,
  buildPersonTooltipLines,
  displayInitial,
  formatYear,
  isDeceasedOf,
  lifeSpan,
  resolvePersonThumbnailSrc,
} from './utils'

// ─── 카드 hover 부가 정보 버블 (React Portal) ─────────────────────
/**
 * 카드 hover/포커스 시 부가 정보(원어명·출생/사망지)를 노출.
 *
 * 구현 — **document.body 로 portal 렌더링**:
 *  1. CardHoverInfo 자체는 카드 안에 숨겨진 anchor(<span>)만 두고, 실제 버블은 body로 portal.
 *  2. anchor의 parentElement(= 카드 = GeoNode)에 mouseenter/leave/focusin/focusout을 붙여
 *     hover 상태를 추적, getBoundingClientRect()로 화면 좌표를 매번 계산.
 *  3. 버블은 position: fixed; z-index: 9999. → TreeCanvas의 overflow clip, 다른 카드의
 *     stacking context, 인접 칩의 z 등 모든 부모 컨텍스트에 영향받지 않음.
 *
 * 이전 CSS-only(absolute) 방식의 두 문제를 동시에 해소:
 *  - 다른 카드의 `형제 N` 칩이 더 높은 z를 갖던 시각적 충돌
 *  - TreeCanvas overflow-x:auto + overflow-y:clip 조합에서 clip-margin 미동작으로
 *    최하단 카드 버블이 잘리던 문제
 */
export function CardHoverInfo({ person }: { person: PersonMetaSource }) {
  const lookup = useContext(FamilyTreeLookupContext)
  const kinshipLookup = useContext(KinshipLookupContext)
  const spouseNamesLookup = useContext(SpouseNamesLookupContext)
  const lines = useMemo(() => {
    const ftNode = person.id ? lookup.get(person.id) : undefined
    const fId = person.fatherId ?? ftNode?.fatherId ?? null
    const mId = person.motherId ?? ftNode?.motherId ?? null
    const afId = person.adoptiveFatherId ?? ftNode?.adoptiveFatherId ?? null
    const amId = person.adoptiveMotherId ?? ftNode?.adoptiveMotherId ?? null
    // withParentNames(..., { omitParentId: egoId })가 의도적으로 null을 주입한 경우(자명한 본인 부모 생략)
    // null을 그대로 보존하고, undefined(미주입)일 때만 lookup에서 해소한다.
    const resolvedFatherName =
      person.fatherName !== undefined
        ? person.fatherName
        : fId && lookup.has(fId)
          ? getPersonDisplayName(lookup.get(fId)!, true)
          : null
    const resolvedMotherName =
      person.motherName !== undefined
        ? person.motherName
        : mId && lookup.has(mId)
          ? getPersonDisplayName(lookup.get(mId)!, true)
          : null
    const resolvedAdoptiveFatherName =
      person.adoptiveFatherName !== undefined
        ? person.adoptiveFatherName
        : afId && lookup.has(afId)
          ? getPersonDisplayName(lookup.get(afId)!, true)
          : null
    const resolvedAdoptiveMotherName =
      person.adoptiveMotherName !== undefined
        ? person.adoptiveMotherName
        : amId && lookup.has(amId)
          ? getPersonDisplayName(lookup.get(amId)!, true)
          : null

    const baseLines = buildPersonTooltipLines({
      ...person,
      fatherName: resolvedFatherName,
      motherName: resolvedMotherName,
      adoptiveFatherName: resolvedAdoptiveFatherName,
      adoptiveMotherName: resolvedAdoptiveMotherName,
    })
    const spouseNames = person.id ? spouseNamesLookup.get(person.id) : undefined
    const withSpouses =
      spouseNames && spouseNames.length > 0 && !baseLines.some((l) => l.label === '배우자')
        ? [...baseLines, { label: '배우자', value: spouseNames.join(', ') }]
        : baseLines

    const kinship = person.id ? kinshipLookup.get(person.id) : undefined
    if (kinship && kinship.chon !== 0) {
      const prefixLines: Array<{ label: string; value: string }> = [
        { label: '기준 관계', value: kinship.summary },
      ]
      if (kinship.pathSummary && (kinship.pathNodeIds?.length ?? 0) >= 3) {
        prefixLines.push({ label: '계보 경로', value: kinship.pathSummary })
      }
      return [...prefixLines, ...withSpouses]
    }
    return withSpouses
  }, [person, lookup, kinshipLookup, spouseNamesLookup])

  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number; above?: boolean } | null>(null)

  useEffect(() => {
    if (lines.length === 0) return
    const anchor = anchorRef.current
    if (!anchor) return
    const card = anchor.parentElement
    if (!card) return

    // 클로저로 가시 상태 추적 — scroll/resize 핸들러가 hover 중일 때만 좌표 갱신하도록.
    // 이 플래그 없이 compute()를 무조건 호출하면 페이지 로드 직후 첫 스크롤·리사이즈에
    // pos가 채워져 모든 카드의 버블이 한꺼번에 떠버린다.
    let visible = false

    const compute = () => {
      const rect = card.getBoundingClientRect()
      const vw = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1024
      const vh = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 768
      const halfBubble = 128 // width 240px/2 + 8px 여백
      const rawLeft = rect.left + rect.width / 2
      const clampedLeft = Math.min(Math.max(rawLeft, halfBubble), Math.max(halfBubble, vw - halfBubble))
      const placeAbove = rect.bottom + 180 > vh && rect.top > 180
      setPos({
        top: placeAbove ? rect.top - 8 : rect.bottom + 8,
        left: clampedLeft,
        above: placeAbove,
      })
    }
    const show = () => {
      visible = true
      compute()
    }
    const hide = () => {
      visible = false
      setPos(null)
    }
    const reposition = () => {
      if (visible) compute()
    }

    card.addEventListener('mouseenter', show)
    card.addEventListener('mouseleave', hide)
    card.addEventListener('focusin', show)
    card.addEventListener('focusout', hide)
    // hover 중 스크롤/리사이즈로 카드가 움직이면 좌표 갱신. capture로 모든 부모 스크롤 캐치.
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)

    return () => {
      card.removeEventListener('mouseenter', show)
      card.removeEventListener('mouseleave', hide)
      card.removeEventListener('focusin', show)
      card.removeEventListener('focusout', hide)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [lines.length])

  if (lines.length === 0) return null

  return (
    <>
      <HoverInfoAnchor ref={anchorRef} aria-hidden />
      {pos && typeof document !== 'undefined' &&
        createPortal(
          <HoverInfoBubble
            role="tooltip"
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.above ? 'translate(-50%, -100%)' : 'translateX(-50%)',
            }}
          >
            {lines.map((l) => (
              <HoverInfoLine key={l.label}>
                <HoverInfoLabel>{l.label}</HoverInfoLabel>
                <HoverInfoValue>{l.value}</HoverInfoValue>
              </HoverInfoLine>
            ))}
          </HoverInfoBubble>,
          document.body,
        )}
    </>
  )
}

/** 카드 안에 숨겨진 anchor — parentElement(=GeoNode)에 이벤트를 붙이기 위한 기준점 */
const HoverInfoAnchor = styled.span`
  display: none;
`

// ─── 카드 본문(이름·생몰년·왕조·재위) ─────────────────────────────
export function NodeNameBlock({
  person,
  sovereignCountry,
}: {
  person: NodePerson
  sovereignCountry?: { name?: string | null; ordinal?: number | null } | null
}) {
  // person.sovereignCountry(BFS 응답) → sovereignCountry prop(직접 전달) 폴백
  const sov = sovereignCountry ?? person.sovereignCountry ?? null
  const span = lifeSpan(person)
  const isDeceased = isDeceasedOf(person)
  const baseName = getPersonDisplayName(person, true)
  const displayName = baseName
  return (
    <NodeNameWrap>
      {person.regnalName && (
        <NodeRegnalName>
          ♛ {person.regnalName}
          {sov?.ordinal != null && <RegnalNumber>{sov.ordinal}대</RegnalNumber>}
          {sov?.name && <RegnalCountry>· {sov.name}</RegnalCountry>}
        </NodeRegnalName>
      )}
      <NodeName title={displayName}>
        {displayName}
        {person.illegitimate && <IllegitimateMark aria-label="사생아·서출">*</IllegitimateMark>}
        {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
      </NodeName>
      {span && <NodeMeta>{span}</NodeMeta>}
      {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
    </NodeNameWrap>
  )
}

// ─── 썸네일 + 국기 ──────────────────────────────────────────────────
export function GeoThumbnail({
  person,
  role,
  flagOverride,
}: {
  person: NodePerson
  role: AvatarRole
  flagOverride?: { flag: FlagSource; countryName?: string | null }
}) {
  const displayName = getPersonDisplayName(person, true)
  const src = resolvePersonThumbnailSrc(person)
  const [imageBroken, setImageBroken] = useState(false)
  useEffect(() => {
    setImageBroken(false)
  }, [src])
  const nodeFlag = useNodePersonFlag(person)
  const { flag, countryName } = flagOverride ?? nodeFlag
  const showImage = Boolean(src) && !imageBroken
  return (
    <AvatarFrame>
      <NodeAvatar $role={role} $hasImage={showImage}>
        {showImage && src ? (
          <AvatarImage
            src={src}
            alt={`${displayName} 프로필 사진`}
            loading="lazy"
            decoding="async"
            onError={() => setImageBroken(true)}
          />
        ) : (
          displayInitial(person)
        )}
      </NodeAvatar>
      <CountryFlag flag={flag} countryName={countryName} size={24} />
    </AvatarFrame>
  )
}

/**
 * 카드 아바타 우하단에 작은 국기 뱃지를 그린다.
 * 우선순위: emoji > 업로드 thumbnailUrl > flagcdn.com(isoCode 기반 PNG)
 * 모두 없으면 null 반환 → 컴포넌트 자체 미렌더.
 */
export function CountryFlag({
  flag,
  countryName,
  size = 18,
}: {
  flag: FlagSource
  countryName?: string | null
  size?: number
}) {
  const emoji = flag?.flagEmoji ?? null
  const thumb = flag?.thumbnailUrl
    ? getUploadImageUrl(flag.thumbnailUrl) || flag.thumbnailUrl
    : null
  const flagcdn = flag?.isoCode
    ? `https://flagcdn.com/w40/${flag.isoCode.toLowerCase()}.png`
    : null
  const [thumbBroken, setThumbBroken] = useState(false)
  const [cdnBroken, setCdnBroken] = useState(false)
  useEffect(() => {
    setThumbBroken(false)
  }, [thumb])
  useEffect(() => {
    setCdnBroken(false)
  }, [flagcdn])

  if (!flag) return null
  const title = countryName ?? undefined
  if (emoji) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <span aria-hidden style={{ fontSize: `${Math.round(size * 0.85)}px`, lineHeight: 1 }}>{emoji}</span>
      </CountryFlagBadge>
    )
  }
  const activeThumb = thumb && !thumbBroken ? thumb : null
  const activeCdn = flagcdn && !cdnBroken ? flagcdn : null
  const imgSrc = activeThumb ?? activeCdn
  if (imgSrc) {
    return (
      <CountryFlagBadge $size={size} title={title} aria-label={countryName ? `${countryName} 국기` : '국기'}>
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            if (activeThumb) setThumbBroken(true)
            else setCdnBroken(true)
          }}
        />
      </CountryFlagBadge>
    )
  }
  return null
}

/**
 * NodePerson에서 카드 국기 source 도출 (sovereignCountry > country 우선 —
 * FamilyTreeLookupContext의 통합 flag 또는 sovereignCountry를 먼저 확인해
 * 조상·후손 카드와 군주 국기 우선순위를 일치시킨다).
 */
export function useNodePersonFlag(p: NodePerson): {
  flag: FlagSource
  countryName?: string | null
} {
  const lookup = useContext(FamilyTreeLookupContext)
  if (p.id) {
    const fallback = lookup.get(p.id)
    if (fallback) return familyTreePersonFlag(fallback)
  }
  if (p.sovereignCountry) {
    return { flag: p.sovereignCountry, countryName: p.sovereignCountry.name ?? null }
  }
  if (p.country) {
    return { flag: p.country, countryName: p.country.name ?? null }
  }
  return { flag: null, countryName: null }
}

/**
 * FamilyTreePerson에서 카드 국기 source 도출 (sovereignCountry > country 우선).
 * 응답에 통합 `flag` 필드가 있으면 그걸 우선 사용.
 */
export function familyTreePersonFlag(p: FamilyTreePerson): {
  flag: FlagSource
  countryName?: string | null
} {
  if (p.flag) {
    return { flag: p.flag, countryName: p.flag.countryName }
  }
  if (p.sovereignCountry) {
    return { flag: p.sovereignCountry, countryName: p.sovereignCountry.name }
  }
  if (p.country) {
    return { flag: p.country, countryName: p.country.name }
  }
  return { flag: null, countryName: null }
}

// ─── 공용 카드 — NodePerson 기반 ────────────────────────────────────
/**
 * NodePerson 카드 — 모든 카드 NODE_W 통일.
 * 자녀의 배우자, 형제, 기타 NodePerson 입력에 공통 사용.
 */
export function NodePersonCompactCard({
  person,
  role,
  badge,
  onPersonClick,
}: {
  person: NodePerson
  role: AvatarRole
  badge: string
  onPersonClick?: (id: string) => void
}) {
  const tooltip = buildPersonTooltip(person)
  const openable = useNodeOpenable(person.id)
  const clickable = Boolean(onPersonClick && person.id) && openable
  const handle = () => person.id && onPersonClick?.(person.id)
  return (
    <GeoNode
      $role={role}
      $monarch={Boolean(person.regnalName)}
      $clickable={clickable}
      $dimmed={!openable}
      title={openable ? tooltip : '다른 계정이 등록한 인물이라 상세를 열 수 없습니다'}
      {...(clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: handle,
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handle()
              }
            },
          }
        : {})}
    >
      <GeoThumbnail person={person} role={role} />
      <NodeNameBlock person={person} />
      <NodeBadge $role={role}>{badge}</NodeBadge>
      <CardHoverInfo person={person} />
    </GeoNode>
  )
}

// ─── 형제자매 카드 ─────────────────────────────────────────────────
/**
 * 형제자매 카드 — 본인 카드와 동일한 NODE_W·NODE_H로 렌더.
 * badge: classifySiblingKinship 판별 결과 라벨('형제'|'이복형제'|'이부형제') —
 * 판별불가·친형제는 무수식 '형제'(기본값). 색은 전 분류 amber sibling 단일 유지(텍스트만 분화).
 */
export function CardUnlinkButton({
  label = '가족 연결 해제',
  onUnlink,
}: {
  label?: string
  onUnlink: () => void
}) {
  return (
    <CardUnlinkBtn
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onUnlink()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation()
        }
      }}
    >
      <FiX size={12} strokeWidth={2.5} />
    </CardUnlinkBtn>
  )
}

export function SiblingCompactNode({
  person,
  onPersonClick,
  onUnlink,
  badge = '형제',
  badgeAriaLabel,
}: {
  person: NodePerson
  onPersonClick?: (id: string) => void
  onUnlink?: () => void
  badge?: string
  badgeAriaLabel?: string
}) {
  const openable = useNodeOpenable(person.id)
  const clickable = Boolean(onPersonClick && person.id) && openable
  const handle = () => person.id && onPersonClick?.(person.id)
  const tooltip = buildPersonTooltip(person)
  const interactiveProps = clickable
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: handle,
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handle()
          }
        },
      }
    : {}
  return (
    <GeoNode
      $role="sibling"
      $monarch={Boolean(person.regnalName)}
      $clickable={clickable}
      $dimmed={!openable}
      title={openable ? tooltip : '다른 계정이 등록한 인물이라 상세를 열 수 없습니다'}
      {...interactiveProps}
    >
      {onUnlink && <CardUnlinkButton label="형제 연결 해제" onUnlink={onUnlink} />}
      <GeoThumbnail person={person} role="sibling" />
      <NodeNameBlock person={person} />
      <NodeBadge $role="sibling" aria-label={badgeAriaLabel}>{badge}</NodeBadge>
      <CardHoverInfo person={person} />
    </GeoNode>
  )
}

// ─── 후손 카드 — FamilyTreePerson 입력 ─────────────────────────────
/**
 * 손자녀 카드 — 본인/부모/자녀 카드와 동일하게 NODE_W 통일.
 * AncestorColumn처럼 위로 부모(여기서는 자녀=손자녀의 부모)와 fork로 연결되는 ::before은
 * 상위 GrandchildPair에서 처리.
 */
export function DescendantNode({
  person,
  badge = '손자녀',
  badgeAriaLabel,
  /** 사촌결혼 — 가계도 안 다른 후손/자녀와 결혼한 경우 상대 인물들 (다중 결혼 가능) */
  inMarriagesWith,
  onPersonClick,
}: {
  person: FamilyTreePerson
  badge?: string
  badgeAriaLabel?: string
  inMarriagesWith?: FamilyTreePerson[]
  onPersonClick?: (id: string) => void
}) {
  // 생몰 한 줄 — 정본 formatLifespan에 위임하는 lifeSpan util 재사용(BC-safe·표기 통일).
  const lifespan = lifeSpan(person)
  const baseName = getPersonDisplayName(person, true)
  const displayName = baseName
  const openable = useNodeOpenable(person.id)
  const clickable = Boolean(onPersonClick && person.id) && openable
  const handle = () => person.id && onPersonClick?.(person.id)
  const tooltip = buildPersonTooltip(person)
  const isDeceased = isDeceasedOf(person)
  // G29 배지 색상 언어 정리 — 조상 형제 모달의 형제 계열 카드는 amber(sibling),
  // 손자녀 등 후손 카드는 sky(descendant). 'ancestor' 회색 재사용으로 증조부와
  // 같은 색이 되던 붕괴 해소(배지·아바타·카드 프레임을 같은 role로 통일).
  const cardRole: AvatarRole = badge.endsWith('형제') ? 'sibling' : 'descendant'
  return (
    <GeoNode
      $role={cardRole}
      $monarch={Boolean(person.regnalName)}
      $clickable={clickable}
      $dimmed={!openable}
      title={openable ? tooltip : '다른 계정이 등록한 인물이라 상세를 열 수 없습니다'}
      {...(clickable
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: handle,
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handle()
              }
            },
          }
        : {})}
    >
      <GeoThumbnail
        person={person}
        role={cardRole}
        flagOverride={familyTreePersonFlag(person)}
      />
      <NodeNameWrap>
        {person.regnalName && (
          <NodeRegnalName>
            ♛ {person.regnalName}
            {person.sovereignCountry?.ordinal != null && (
              <RegnalNumber>{person.sovereignCountry.ordinal}대</RegnalNumber>
            )}
            {person.sovereignCountry?.name && (
              <RegnalCountry>· {person.sovereignCountry.name}</RegnalCountry>
            )}
          </NodeRegnalName>
        )}
        <NodeName title={displayName}>
          {displayName}
          {person.illegitimate && <IllegitimateMark aria-label="사생아·서출">*</IllegitimateMark>}
          {isDeceased && <DeceasedMark aria-label="사망"> †</DeceasedMark>}
        </NodeName>
        {lifespan && <NodeMeta>{lifespan}</NodeMeta>}
        {person.dynasty?.name && <NodeDynasty>{person.dynasty.name}</NodeDynasty>}
      </NodeNameWrap>
      {/* 후손은 sky(descendant), 조상 형제 모달의 형제 계열 배지는 amber(sibling) — 방향성 색 유지.
          '이복형제'/'이부형제'도 amber를 유지해야 하므로 등호가 아닌 접미 판정(cardRole과 동일 기준). */}
      <NodeBadge $role={cardRole} aria-label={badgeAriaLabel}>{badge}</NodeBadge>
      <CardHoverInfo person={person} />
      {inMarriagesWith && inMarriagesWith.length > 0 && (() => {
        // 자기 자신은 절대 partner가 될 수 없음 — 데이터 이상 방어
        const partners = inMarriagesWith.filter((p) => p.id !== person.id)
        if (partners.length === 0) return null
        // 합스부르크 가계처럼 동명이인이 흔한 도메인 — 출생연도로 디스앰비
        const formatPartner = (p: FamilyTreePerson) => {
          const name = getPersonDisplayName(p, true)
          const py = birthYearOf(p)
          return py != null ? `${name} (${formatYear(py)})` : name
        }
        const labels = partners.map(formatPartner)
        const joined = labels.join(', ')
        const display =
          labels.length === 1 ? labels[0] : `${labels[0]} 외 ${labels.length - 1}명`
        return (
          <InMarriageMark
            aria-label={`사촌결혼 — ${joined}와 혼인`}
            title={`사촌결혼 → ${joined}`}
          >
            ♥ {display}
          </InMarriageMark>
        )
      })()}
    </GeoNode>
  )
}

// ─── Styled Components ─────────────────────────────────────────────

/**
 * 부가 정보 버블 — `position: fixed` + Portal로 document.body에 렌더.
 * CardHoverInfo가 inline style로 top/left를 카드 bounding rect 기준으로 매번 설정.
 * z-index: 9999 — TreeCanvas overflow clip, 인접 카드/칩 stacking 모두 무시.
 */
export const HoverInfoBubble = styled.div`
  position: fixed;
  z-index: 9999;
  width: 240px;
  padding: 10px 12px;
  border-radius: 10px;
  text-align: left;
  font-size: 11.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  pointer-events: none;
  transform: translateX(-50%);
  white-space: normal;
`

const HoverInfoLine = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  & + & {
    margin-top: 4px;
  }
`

const HoverInfoLabel = styled.span`
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HoverInfoValue = styled.span`
  font-weight: 500;
  word-break: keep-all;
  overflow-wrap: anywhere;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const GeoNode = styled.div<{
  $role: string
  $emphasis?: boolean
  $monarch?: boolean
  $clickable?: boolean
  /** 비소유 노드 — 현재 계정이 상세를 열 수 없음(다른 계정 등록). 살짝 흐리게 + 클릭 불가. */
  $dimmed?: boolean
}>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  flex: 0 0 ${NODE_W}px;
  width: ${NODE_W}px;
  min-width: ${NODE_W}px;
  max-width: ${NODE_W}px;
  height: auto;
  min-height: ${NODE_H}px;
  padding: 16px 12px 18px;
  border-radius: 16px;
  justify-content: flex-start;
  box-sizing: border-box;
  z-index: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  /* hover/focus 시 카드 자체를 위로 끌어올린다 — 시각 lift + 내부 칩이 인접 카드 위로
     올라오도록. HoverInfoBubble은 portal로 document.body에 렌더하므로 이 z-index의
     영향을 받지 않음. 공용 ModalOverlay(Z_INDEX.MODAL_OVERLAY=9999)보다 낮아 모달은 정상 가림. */
  &:hover,
  &:focus-within {
    z-index: 60;
  }

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
      }
      &:focus-visible {
        outline: 2px solid #6366f1;
        outline-offset: 2px;
      }
    `}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      opacity: 0.5;
      cursor: default;
      /* 왜 흐린지(다른 계정 등록 → 열 수 없음) 상시 시각 단서 — hover title에만 의존하지
         않도록 코너에 자물쇠. 터치·비hover 사용자도 인지 가능(G32). 상세 사유는 title. */
      &::after {
        content: '🔒';
        position: absolute;
        top: 5px;
        left: 6px;
        font-size: 11px;
        line-height: 1;
        pointer-events: none;
      }
    `}

  ${({ $emphasis, theme }) =>
    $emphasis
      ? css`
          ${theme.mode === 'dark'
            ? css`
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.35);
              `
            : css`
                background: ${theme.colors.background.primary};
                border: 1px solid ${theme.colors.border.default};
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04),
                  0 0 0 1px rgba(99, 102, 241, 0.2);
              `}
        `
      : css`
          ${theme.mode === 'dark'
            ? css`
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
              `
            : css`
                background: ${theme.colors.background.primary};
                border: 1px solid ${theme.colors.border.light};
              `}
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
          &:hover {
            transform: translateY(-1px);
            ${theme.mode === 'dark'
              ? css`
                  border-color: rgba(255, 255, 255, 0.1);
                `
              : css`
                  border-color: ${theme.colors.border.medium};
                  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
                `}
          }
        `}

  ${({ $dimmed }) =>
    $dimmed &&
    css`
      /* 클릭 불가(비소유) 카드가 hover에 떠오르지 않게 — clickable처럼 보이는 어포던스 제거(G27).
         emphasis 블록 뒤에 둬 소스 순서로 base hover transform을 덮어쓴다. */
      &:hover {
        transform: none;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
      }
    `}

  ${({ $monarch, $emphasis, theme }) =>
    $monarch &&
    !$emphasis &&
    css`
      border-color: ${theme.mode === 'dark'
        ? 'rgba(251, 191, 36, 0.45)'
        : 'rgba(217, 119, 6, 0.42)'};
      box-shadow: ${theme.mode === 'dark'
        ? '0 0 0 1px rgba(251, 191, 36, 0.14), 0 4px 12px rgba(217, 119, 6, 0.10)'
        : '0 0 0 1px rgba(217, 119, 6, 0.12), 0 4px 12px rgba(217, 119, 6, 0.07)'};
    `}
`

export const AvatarImage = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  /* 인물 상세 페이지(AvatarButton)와 동일한 크롭 — 초상화 얼굴이 상단에 있는 경우가
     많아 top center로 잘라 표정·왕관 등 핵심 요소 보존. */
  object-fit: cover;
  object-position: top center;
`

/** 카드 아바타 우하단에 absolute 배치되는 작은 국기 뱃지. */
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

/** NodeAvatar 컨테이너에 position: relative를 부여해 그 안 CountryFlag를 absolute로 위치시킨다. */
export const AvatarFrame = styled.div`
  position: relative;
  display: inline-flex;
`

export const NodeAvatar = styled.div<{ $role: string; $hasImage?: boolean }>`
  width: 88px;
  height: 88px;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.03em;
  flex-shrink: 0;
  overflow: hidden;
  color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.55)' : '#94a3b8')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  border: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0')};
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
  /* 군주 라벨 — ♛ regnalName + 대수 + 즉위국명. 카드 폭(140~192px)에서 잘리지 않도록
     최대 2줄까지 줄바꿈 허용 후 말줄임 처리해 카드 세로 오버플로를 방지한다. */
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.warning};
  word-break: keep-all;
  white-space: normal;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  padding: 0 4px;
  text-align: center;
`

const RegnalNumber = styled.span`
  margin-left: 3px;
  font-size: 10px;
  font-weight: 600;
  opacity: 0.85;
  white-space: nowrap;
`

const RegnalCountry = styled.span`
  margin-left: 4px;
  font-size: 10px;
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
`

const DeceasedMark = styled.span`
  font-size: 0.85em;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0;
`

/** 사생아·서출 마커(*) — 이름 문자열 연결 대신 aria-label 있는 별도 마크(스크린리더 인지). */
const IllegitimateMark = styled.span`
  font-size: 0.9em;
  font-weight: 700;
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

export const NodeBadge = styled.span<{ $role: string }>`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.25;
  padding: 3px 9px;
  border-radius: 8px;
  margin-top: auto;
  max-width: 100%;
  word-break: keep-all;
  overflow-wrap: anywhere;

  ${({ $role, theme }) => {
    const dark = theme.mode === 'dark'
    const pill = (bg: string, fg: string) => css`
      background: ${bg};
      color: ${fg};
    `
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
      case 'descendant':
        // 후손(손자녀+)은 자녀(child)와 같은 하향 계열 sky — 상향 조상(회색 default)과 구분.
        return pill(dark ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.12)', dark ? '#7dd3fc' : '#0284c7')
      case 'sibling':
        return pill(dark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)', dark ? '#fcd34d' : '#b45309')
      default:
        return pill(dark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.15)', theme.colors.text.secondary)
    }
  }}
`

/**
 * 사촌결혼 — 가계도 안 다른 후손과 결혼했음을 카드 하단에 표시.
 * dedupe로 한쪽에만 그려진 자녀의 또 다른 부모를 명시.
 */
/**
 * 다중 혼인 자녀의 생모(반대편 부모) 귀속 칩 — «○○○ 소생».
 * ego의 자녀들이 서로 다른 반대편 부모를 가질 때만 노출(1차 리뷰 #1 최소안 — consort
 * 인디케이터). InMarriageMark와 동일한 하단 모서리 칩 문법, 색은 배우자 rose 계열과
 * 구분되는 중립 slate(새 색상 언어 도입 회피 — 범례 항목 동반).
 */
export const ConsortMark = styled.span`
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  max-width: ${NODE_W - 12}px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  /* 카드 경계 밖으로 걸치는 칩 — 반투명이면 아래 커넥터 선이 비치므로 배경색 위 틴트로 불투명 합성 */
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(0deg, rgba(148, 163, 184, 0.16), rgba(148, 163, 184, 0.16)), ${theme.colors.background.primary}`
      : `linear-gradient(0deg, rgba(148, 163, 184, 0.12), rgba(148, 163, 184, 0.12)), ${theme.colors.background.primary}`};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.38)' : 'rgba(148, 163, 184, 0.30)'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
`

const InMarriageMark = styled.span`
  position: absolute;
  bottom: -7px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  max-width: ${NODE_W - 12}px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border-radius: 999px;
  /* ConsortMark와 동일 — 카드 밖으로 걸치는 칩은 커넥터 선 비침 방지 위해 불투명 합성 */
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(0deg, rgba(244, 114, 182, 0.18), rgba(244, 114, 182, 0.18)), ${theme.colors.background.primary}`
      : `linear-gradient(0deg, rgba(244, 114, 182, 0.10), rgba(244, 114, 182, 0.10)), ${theme.colors.background.primary}`};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f9a8d4' : '#be185d')};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(244, 114, 182, 0.42)' : 'rgba(244, 114, 182, 0.28)'};
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
`

const CardUnlinkBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(248, 113, 113, 0.35)' : 'rgba(239, 68, 68, 0.25)'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.92)' : 'rgba(255, 255, 255, 0.95)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fca5a5' : '#dc2626')};
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.15s ease, background 0.15s ease;

  ${GeoNode}:hover &,
  ${GeoNode}:focus-within & {
    opacity: 1;
    pointer-events: auto;
  }

  &:hover {
    transform: scale(1.08);
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(254, 226, 226, 0.95)'};
  }
`
