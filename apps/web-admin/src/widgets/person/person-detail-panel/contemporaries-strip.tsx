import { useEffect, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FiChevronDown, FiChevronUp, FiGlobe } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { CATEGORY_TOKENS } from '@/entities/government-position/model/category-tokens'
import {
  getPersonContemporaries,
  personContemporariesKeys,
} from '@/shared/api/person-contemporaries'
import { getUploadImageUrl } from '@/shared/api/upload'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import type { PositionCategory } from '@/entities/government-position/model/types'
import {
  groupRulersByCountry,
  windowCaptionOf,
} from './contemporaries-strip.lib'

type ContemporariesScope = 'all' | 'sameCountry'

const INITIAL_VISIBLE_GROUPS = 4

interface ContemporariesStripProps {
  personId: string
  /** 수장급(재임·재위) 기록이 있을 때만 true — CTA 딥링크와 동일 게이트 */
  enabled: boolean
  /** 칩 클릭 → 인물 모달 스택 (페이지 이탈 없음) */
  onPersonClick: (personId: string) => void
  /** 수장비교 딥링크 — 모달 임베드에선 미전달(숨김) */
  onOpenCompare?: () => void
}

/**
 * 「동시대 수장」 인라인 스트립 — 개요/이력 탭 재임·재위 카드 아래에 클릭 0회로 노출.
 * 발견은 GET /persons/:id/contemporaries(창은 서버가 재위 구간에서 유도),
 * 탐색 확장은 수장비교 딥링크로 위임한다 (검토서 §3 2단계).
 */
export function ContemporariesStrip({
  personId,
  enabled,
  onPersonClick,
  onOpenCompare,
}: ContemporariesStripProps) {
  // 서버는 scope=all|sameCountry를 이미 지원 — 유도 창은 그대로 두고 후보만 대상 국가로 좁힌다.
  // (창을 안 넘기므로 meta.window는 scope와 무관하게 동일 = "같은 시기, 같은 나라로 필터".)
  const [scope, setScope] = useState<ContemporariesScope>('all')
  const [showAllGroups, setShowAllGroups] = useState(false)

  useEffect(() => {
    setShowAllGroups(false)
  }, [personId, scope])

  const contemporariesQuery = useQuery({
    queryKey: personContemporariesKeys.byPerson(personId, { scope }),
    queryFn: () => getPersonContemporaries(personId, { scope }),
    enabled,
    // scope 전환 시 이전 데이터를 유지해 스켈레톤 깜빡임을 없앤다.
    placeholderData: keepPreviousData,
  })

  if (!enabled) return null

  const data = contemporariesQuery.data
  const groups = data ? groupRulersByCountry(data.rulers, data.meta.window) : []
  const hasCollapsibleGroups = groups.length > INITIAL_VISIBLE_GROUPS
  const visibleGroups =
    hasCollapsibleGroups && !showAllGroups
      ? groups.slice(0, INITIAL_VISIBLE_GROUPS)
      : groups
  const hiddenGroups = hasCollapsibleGroups
    ? groups.slice(INITIAL_VISIBLE_GROUPS)
    : []
  const hiddenRulerCount = hiddenGroups.reduce(
    (sum, g) => sum + g.chips.length,
    0,
  )

  return (
    <StripSection aria-label="동시대 수장">
      <StripHeaderRow>
        <StripTitleGroup>
          <StripIconTile aria-hidden>
            <FiGlobe size={13} strokeWidth={2.2} />
          </StripIconTile>
          <StripTitle>
            <span>동시대 수장</span>
            {data && data.rulers.length > 0 && (
              <StripCountBadge>{data.rulers.length}</StripCountBadge>
            )}
            {data && (
              <StripWindowCaption>
                <StripWindowBadge>
                  {windowCaptionOf(data.meta.window)}
                </StripWindowBadge>
                {data.rulers.length > 1 && ' · 겹친 기간 긴 순'}
              </StripWindowCaption>
            )}
          </StripTitle>
        </StripTitleGroup>
        <StripControls>
          <ScopeToggleWrap>
            <SegmentControl<ContemporariesScope>
              value={scope}
              onChange={setScope}
              ariaLabel="동시대 수장 범위"
              options={[
                { value: 'all', label: '전체' },
                { value: 'sameCountry', label: '같은 나라' },
              ]}
            />
          </ScopeToggleWrap>
          {onOpenCompare && (
            <CompareLinkButton type="button" onClick={onOpenCompare}>
              수장 비교에서 보기 →
            </CompareLinkButton>
          )}
        </StripControls>
      </StripHeaderRow>

      {contemporariesQuery.isLoading && (
        <SkeletonRow aria-hidden>
          <SkeletonChip />
          <SkeletonChip />
          <SkeletonChip />
        </SkeletonRow>
      )}
      {contemporariesQuery.isError && (
        <MutedNote role="status">동시대 수장을 불러오지 못했습니다</MutedNote>
      )}
      {data && data.rulers.length === 0 && (
        <MutedNote>
          {scope === 'sameCountry'
            ? '같은 나라의 동시대 수장 기록이 없습니다'
            : '같은 시기의 다른 수장 기록이 없습니다'}
        </MutedNote>
      )}

      {data && data.rulers.length > 0 && (
        <>
          <GroupTable role="group" aria-label="동시대 수장 목록">
            {visibleGroups.map((group) => (
              /* role=group + aria-label — 칩만 탭으로 만나도 어느 나라 수장인지 전달 */
              <GroupRow key={group.key} role="group" aria-label={group.label}>
                <GroupLabelCell aria-hidden>
                  <GroupCountryName>
                    {group.flagEmoji ? `${group.flagEmoji} ` : ''}
                    {group.label}
                  </GroupCountryName>
                  <GroupCountryCount>{group.chips.length}</GroupCountryCount>
                </GroupLabelCell>
                <ChipRow>
                  {group.chips.map((chip) => {
                    const chipBody = (
                      <>
                        <ChipAvatarOrGlyph
                          profileImageUrl={chip.profileImageUrl}
                          category={chip.category}
                        />
                        <ChipBodyCol>
                          <ChipTopLine>
                            <ChipName>{chip.label}</ChipName>
                            {chip.realName && (
                              <ChipRealName>({chip.realName})</ChipRealName>
                            )}
                            <ChipRole $category={chip.category}>
                              {chip.positionText}
                            </ChipRole>
                          </ChipTopLine>
                          <ChipBottomLine>
                            <ChipSpan>{chip.spanText}</ChipSpan>
                            {chip.overlapYears > 0 && (
                              <ChipOverlap>
                                · {chip.overlapYears}년 겹침
                              </ChipOverlap>
                            )}
                          </ChipBottomLine>
                          <ChipOverlapTrack aria-hidden>
                            <ChipOverlapFill
                              $category={chip.category}
                              $start={chip.overlapStartPct}
                              $width={chip.overlapWidthPct}
                            />
                          </ChipOverlapTrack>
                        </ChipBodyCol>
                      </>
                    )
                    // 정보밀도 보강 — 칩 본문에 안 담기는 본명·겹침 기간·복수 재위
                    // 스팬을 aria-label(키보드/SR)·title(hover)에 실어 노출한다.
                    const chipAria = `${chip.label} — ${group.label} ${chip.positionText} ${chip.spanText} · ${chip.detailText}`
                    // 타계정 소유 인물은 상세(:id)가 소유자 게이트라 열 수 없음 —
                    // 클릭 데드엔드 대신 비활성 칩 (가계도 비소유 노드 선례)
                    if (!chip.isOwned) {
                      return (
                        <RulerChipStatic
                          key={chip.personId}
                          role="img"
                          title={`${chip.detailText} · 다른 계정 소유 인물 — 상세를 열 수 없습니다`}
                          aria-label={`${chipAria} (다른 계정 소유 — 상세를 열 수 없음)`}
                        >
                          {chipBody}
                        </RulerChipStatic>
                      )
                    }
                    return (
                      <RulerChip
                        key={chip.personId}
                        type="button"
                        title={chip.detailText}
                        aria-label={chipAria}
                        onClick={() => onPersonClick(chip.personId)}
                      >
                        {chipBody}
                      </RulerChip>
                    )
                  })}
                </ChipRow>
              </GroupRow>
            ))}
          </GroupTable>

          {hasCollapsibleGroups && (
            <ExpandGroupsButton
              type="button"
              onClick={() => setShowAllGroups((prev) => !prev)}
              aria-expanded={showAllGroups}
            >
              {showAllGroups ? (
                <>
                  <FiChevronUp size={13} />
                  국가 목록 접기
                </>
              ) : (
                <>
                  <FiChevronDown size={13} />+ {hiddenGroups.length}개국 (
                  {hiddenRulerCount}명) 더 보기
                </>
              )}
            </ExpandGroupsButton>
          )}
        </>
      )}

      {/* 절단 안내는 스크롤 밖(항상 노출). 모달 임베드(onOpenCompare 없음)에선 수장비교로
          갈 경로가 없으므로 죽은 포인터 대신 중립 문구로 분기한다. */}
      {data && data.rulers.length > 0 && data.meta.omittedCount > 0 && (
        <FooterMetaRow>
          {onOpenCompare ? (
            <OmittedLinkButton type="button" onClick={onOpenCompare}>
              외 {data.meta.omittedCount}명 더 — 수장 비교에서 보기 →
            </OmittedLinkButton>
          ) : (
            <OmittedCaption>
              외 {data.meta.omittedCount}명 더 있음 (겹친 기간 긴 순 상위만 표시)
            </OmittedCaption>
          )}
        </FooterMetaRow>
      )}

      {/* 후보 스캔이 안전 상한에 걸린 경우 — 결과가 불완전할 수 있음을 알린다(무성 절단 금지) */}
      {data?.meta.candidatesTruncated && (
        <OmittedCaption role="status">
          범위가 넓어 일부 수장이 생략됐을 수 있습니다
        </OmittedCaption>
      )}
    </StripSection>
  )
}

/**
 * 칩 아바타 — 업로드 상대경로를 getUploadImageUrl로 절대화(분리 오리진 안전)하고,
 * 로드 실패 시 카테고리 글리프로 강등해 깨진 이미지가 정본 UI로 남지 않게 한다.
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
  // src가 바뀌면(다른 인물 데이터로 재사용 등) 실패 상태 리셋
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

const StripSection = styled.section`
  margin-top: 20px;
  padding: 18px 0 4px;
  background: transparent;
  border: none;
  border-top: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.09)'
        : 'rgba(15, 23, 42, 0.1)'};
`

const StripHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 10px;
`

const StripTitleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
`

const StripIconTile = styled.span`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(20, 184, 166, 0.16)'
      : 'rgba(13, 148, 136, 0.1)'};
`

const StripControls = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

/** 컴팩트 스트립 톤에 맞춰 canon 세그먼트를 살짝 축소(패딩·폰트만) */
const ScopeToggleWrap = styled.div`
  button {
    padding: 4px 10px;
    font-size: 11.5px;
  }
`

const StripTitle = styled.h4`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const StripCountBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 1px 7px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.07)'
      : 'rgba(15, 23, 42, 0.06)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StripWindowCaption = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const StripWindowBadge = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const CompareLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;

  &:hover {
    background: transparent;
    border-color: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.16)'
        : 'rgba(15, 23, 42, 0.16)'};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

const GroupTable = styled.div`
  display: flex;
  flex-direction: column;
`

/* 국가 구획 한 행 — 2단 에디토리얼 도시에 행(좌측 국가 열 144px | 우측 수장 그리드) */
const GroupRow = styled.div`
  display: grid;
  grid-template-columns: 144px minmax(0, 1fr);
  column-gap: 16px;
  row-gap: 6px;
  align-items: start;
  padding: 9px 0;

  & + & {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255, 255, 255, 0.06)'
          : 'rgba(15, 23, 42, 0.07)'};
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    padding: 8px 0;
  }
`

const GroupLabelCell = styled.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 6px 4px 4px 0;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.secondary};
  word-break: keep-all;

  @media (max-width: 560px) {
    padding: 0 0 2px;
  }
`

const GroupCountryName = styled.span`
  min-width: 0;
`

const GroupCountryCount = styled.span`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  column-gap: 12px;
  row-gap: 4px;
  align-items: stretch;
`

const SkeletonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
  padding: 6px 0;
`

/* 무박스(no-box) 에디토리얼 미니 프로필 — 평상시 배경·테두리를 비워 컨테이너 중첩을 없애고,
   hover/focus 시에만 부드러운 워시를 띄운다(UnifiedCard·SuccessionBox와 동일 방언). */
const chipSurfaceCss = css`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  padding: 6px 8px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  color: ${({ theme }) =>
    theme.mode === 'dark' ? '#e2e8f0' : theme.colors.text.primary};
`

const RulerChip = styled.button`
  ${chipSurfaceCss}
  cursor: pointer;
  transition: background 0.14s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(15, 23, 42, 0.04)'};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

/** 타계정 소유 — 상세 진입 불가라 비클릭. 시각적으로도 살짝 가라앉힘 */
const RulerChipStatic = styled.span`
  ${chipSurfaceCss}
  cursor: default;
  opacity: 0.68;
`

const ChipAvatar = styled.img`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const ChipGlyph = styled.span<{ $category: PositionCategory }>`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 12px;
  line-height: 1;
  background: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.bg
      : CATEGORY_TOKENS[$category].chip.light.bg};
  color: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
`

const ChipBodyCol = styled.span`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  min-width: 0;
`

const ChipTopLine = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
`

const ChipBottomLine = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
`

const ChipName = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: -0.01em;
  /* 장문 왕호('카를로스 1세 (후아나 1세 jure matris 공동 군주)') 괴물 칩 방지 —
     전문은 title(hover)·aria-label에 이미 실려 있다 */
  max-width: 176px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const ChipRealName = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-width: 84px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/** 어떤 재임인지 상시 노출 — 카테고리 배지 톤으로 종류 신호를 잇는다 */
const ChipRole = styled.span<{ $category: PositionCategory }>`
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.3;
  background: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.bg
      : CATEGORY_TOKENS[$category].chip.light.bg};
  color: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
`

const ChipSpan = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ChipOverlap = styled.span`
  font-size: 10.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ChipOverlapTrack = styled.span`
  position: relative;
  display: block;
  width: 100%;
  max-width: 176px;
  height: 2.5px;
  margin-top: 2px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(15, 23, 42, 0.07)'};
  overflow: hidden;
`

const ChipOverlapFill = styled.span<{
  $category: PositionCategory
  $start: number
  $width: number
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $start }) => $start}%;
  width: ${({ $width }) => $width}%;
  border-radius: 999px;
  background: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
  opacity: 0.78;
`

const ExpandGroupsButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding: 4px 6px;
  border-radius: 6px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  cursor: pointer;
  transition: color 0.14s ease;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

const FooterMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.07)'
        : 'rgba(15, 23, 42, 0.08)'};
`

const SkeletonChip = styled.span`
  display: inline-block;
  width: 156px;
  height: 42px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
`

const MutedNote = styled.p`
  margin: 4px 0 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OmittedCaption = styled.p`
  margin: 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OmittedLinkButton = styled.button`
  border: none;
  background: none;
  padding: 2px 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  cursor: pointer;
  border-radius: 6px;
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`
