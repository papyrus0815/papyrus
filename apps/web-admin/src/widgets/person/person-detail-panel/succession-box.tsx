import { useEffect, useState } from 'react'

import styled, { css } from 'styled-components'

import { CATEGORY_TOKENS } from '@/entities/government-position/model/category-tokens'
import type { PositionCategory } from '@/entities/government-position/model/types'
import { getUploadImageUrl } from '@/shared/api/upload'
import type {
  AdjacencyNeighbor,
  ReignAdjacencyEntry,
} from '@/shared/api/person-reign-adjacency'

import {
  neighborCategory,
  neighborLabel,
  neighborPolity,
  neighborSpan,
} from './succession-box.lib'

interface SuccessionBoxProps {
  entry: ReignAdjacencyEntry
  /** 앵커(이 재위) 라벨 — aria용 */
  anchorLabel: string
  /** 앵커가 속한 정체명 — 이웃 정체가 다르면(왕→공화국) 칩에 정체 태그 노출 */
  anchorPolity: string | null
  /** 칩 클릭 → 인물 모달 스택 (페이지 이탈 없음) */
  onPersonClick: (personId: string) => void
}

/**
 * 「같은 국가 전/후 재위(승계)」 박스 — 각 수장급 재위 카드 안에 좌우(← 선대 · 후대 →)
 * 선형으로 붙는다(동시대 수장의 가로 병렬 스트립과 시각언어 분리). 발견은 배치
 * 엔드포인트(GET /persons/:id/reign-adjacency) 응답을 recordId로 조인해 렌더만 한다
 * (검토서 docs/person-reign-neighbors-review.md §3.3).
 */
export function SuccessionBox({
  entry,
  anchorLabel,
  anchorPolity,
  onPersonClick,
}: SuccessionBoxProps) {
  const hasAny =
    entry.predecessors.length > 0 || entry.successors.length > 0
  if (!hasAny) return null

  return (
    <Box aria-label={`${anchorLabel} 승계`}>
      <Column>
        <ColumnHead aria-hidden>← 선대</ColumnHead>
        {entry.predecessors.length > 0 ? (
          entry.predecessors.map((neighbor) => (
            <NeighborChip
              key={neighbor.record.recordId}
              neighbor={neighbor}
              directionLabel="선대"
              anchorPolity={anchorPolity}
              onPersonClick={onPersonClick}
            />
          ))
        ) : (
          <EmptyNote>이전 재위 기록 없음</EmptyNote>
        )}
      </Column>
      <Divider aria-hidden />
      <Column $end>
        <ColumnHead aria-hidden>후대 →</ColumnHead>
        {entry.successors.length > 0 ? (
          entry.successors.map((neighbor) => (
            <NeighborChip
              key={neighbor.record.recordId}
              neighbor={neighbor}
              directionLabel="후대"
              anchorPolity={anchorPolity}
              onPersonClick={onPersonClick}
            />
          ))
        ) : (
          <EmptyNote>다음 재위 기록 없음</EmptyNote>
        )}
      </Column>
    </Box>
  )
}

function NeighborChip({
  neighbor,
  directionLabel,
  anchorPolity,
  onPersonClick,
}: {
  neighbor: AdjacencyNeighbor
  directionLabel: string
  anchorPolity: string | null
  onPersonClick: (personId: string) => void
}) {
  const category = neighborCategory(neighbor.record)
  const label = neighborLabel(neighbor)
  const span = neighborSpan(neighbor)
  const polity = neighborPolity(neighbor.record)
  // 이웃 정체가 앵커와 다르면(왕정→공화정 전환 등) 정체 태그로 명시
  const crossPolity = polity && polity !== anchorPolity ? polity : null

  const ariaBase = `${label} — ${directionLabel} ${CATEGORY_TOKENS[category].label} ${span}`
  const body = (
    <>
      <ChipAvatarOrGlyph
        profileImageUrl={neighbor.person.profileImageUrl}
        category={category}
      />
      <ChipText>
        <ChipNameRow>
          <ChipName>{label}</ChipName>
          {neighbor.isSelf && <SelfTag>본인</SelfTag>}
          {neighbor.overlapsAnchor && <OverlapTag>공동·중첩</OverlapTag>}
        </ChipNameRow>
        <ChipMetaRow>
          {crossPolity && <PolityTag>{crossPolity}</PolityTag>}
          <ChipSpan>{span}</ChipSpan>
        </ChipMetaRow>
      </ChipText>
    </>
  )

  // isSelf: 본인의 다른 재위 단계(복위·공동→단독) — 같은 페이지에 이미 카드로 있으므로
  //   딥링크 비활성(same-route 재클릭 no-op 회피). isOwned=false: 타계정 상세 진입 불가.
  const clickable = !neighbor.isSelf && neighbor.person.isOwned
  if (!clickable) {
    return (
      <ChipStatic
        title={
          neighbor.isSelf
            ? '본인의 다른 재위 — 위 재임·재위 카드를 참조하세요'
            : '다른 계정 소유 인물 — 상세를 열 수 없습니다'
        }
        aria-label={`${ariaBase}${neighbor.isSelf ? ' (본인)' : ' (다른 계정 소유)'}`}
      >
        {body}
      </ChipStatic>
    )
  }
  return (
    <ChipButton
      type="button"
      aria-label={ariaBase}
      onClick={() => onPersonClick(neighbor.person.id)}
    >
      {body}
    </ChipButton>
  )
}

/**
 * 칩 아바타 — 업로드 상대경로를 절대화(분리 오리진 안전)하고, 로드 실패 시 카테고리
 * 글리프로 강등해 깨진 이미지가 정본 UI로 남지 않게 한다 (contemporaries-strip 규약).
 */
function ChipAvatarOrGlyph({
  profileImageUrl,
  category,
}: {
  profileImageUrl: string | null
  category: PositionCategory
}) {
  const resolvedSrc = profileImageUrl
    ? getUploadImageUrl(profileImageUrl) || profileImageUrl
    : null
  const [imageBroken, setImageBroken] = useState(false)
  useEffect(() => {
    setImageBroken(false)
  }, [resolvedSrc])

  if (!resolvedSrc || imageBroken) {
    return (
      <ChipGlyph $category={category} aria-hidden>
        {CATEGORY_TOKENS[category].glyph}
      </ChipGlyph>
    )
  }
  return (
    <ChipAvatar
      src={resolvedSrc}
      alt=""
      aria-hidden
      onError={() => setImageBroken(true)}
    />
  )
}

/* 인셋 박스가 아니라 점선 seam — 항목 행 안의 소섹션(승계)을 AchievementSection과
   동일한 방언으로 구분한다(컨테이너 중첩 금지). 가운데 Divider는 규칙선이라 유지. */
const Box = styled.nav`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)'};
`

const Column = styled.div<{ $end?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  align-items: ${({ $end }) => ($end ? 'flex-end' : 'flex-start')};
`

const ColumnHead = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Divider = styled.div`
  align-self: stretch;
  width: 1px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? 'background: #2a2a2a;'
      : `background: ${theme.colors.border.default};`}
`

/* 보더·배경을 걷어낸 무박스 칩 — 항목 서피스 → (박스 없음) → 아바타+텍스트 행.
   hover 배경 워시 + focus 아웃라인만 어포던스로 남긴다. */
const chipSurfaceCss = css`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 4px 6px;
  border-radius: 8px;
  text-align: left;
  border: none;
  background: transparent;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#d1d5db' : theme.colors.text.primary};
`

const ChipButton = styled.button`
  ${chipSurfaceCss}
  cursor: pointer;
  transition: background 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

/** 본인 다른 재위 / 타계정 소유 — 상세 진입 불가라 비클릭. 시각적으로도 살짝 가라앉힘 */
const ChipStatic = styled.span`
  ${chipSurfaceCss}
  cursor: default;
  opacity: 0.72;
`

const ChipAvatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
`

const ChipGlyph = styled.span<{ $category: PositionCategory }>`
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
  color: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
`

const ChipText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`

const ChipNameRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const ChipName = styled.span`
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ChipMetaRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`

const ChipSpan = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const tagCss = css`
  flex: 0 0 auto;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
`

/** 정체 전환 태그 — 왕정→공화정 등 이웃 정체가 앵커와 다를 때 */
const PolityTag = styled.span`
  ${tagCss}
  ${({ theme }) =>
    theme.mode === 'dark'
      ? 'background: rgba(99, 102, 241, 0.18); color: #a5b4fc;'
      : 'background: rgba(99, 102, 241, 0.1); color: #4f46e5;'}
`

/** 공동·중첩 재위 — 순수 승계가 아님(공동군주·대립왕) */
const OverlapTag = styled.span`
  ${tagCss}
  ${({ theme }) =>
    theme.mode === 'dark'
      ? 'background: rgba(245, 158, 11, 0.18); color: #fbbf24;'
      : 'background: rgba(245, 158, 11, 0.12); color: #b45309;'}
`

/** 대상 본인의 다른 재위 단계(복위·공동→단독) */
const SelfTag = styled.span`
  ${tagCss}
  ${({ theme }) =>
    theme.mode === 'dark'
      ? 'background: rgba(255, 255, 255, 0.1); color: #d1d5db;'
      : 'background: rgba(0, 0, 0, 0.06); color: #4b5563;'}
`

const EmptyNote = styled.p`
  margin: 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
