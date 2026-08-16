import { useEffect, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
 * 「동시대 수장」 인라인 스트립 — 개요 탭 재임·재위 카드 아래에 클릭 0회로 노출.
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

  return (
    <StripSection aria-label="동시대 수장">
      <StripHeaderRow>
        <StripTitle>
          동시대 수장
          {data && (
            <StripWindowCaption>
              {windowCaptionOf(data.meta.window)}
              {data.rulers.length > 1 && ' · 겹친 기간 긴 순'}
            </StripWindowCaption>
          )}
        </StripTitle>
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
        // 국가별 구획을 표 행(라벨 열 | 칩 열)으로 — 행 사이 헤어라인 + 라벨 열 세로
        // 괘선으로 어느 나라 구획인지 정확히 떨어지게 한다. 가로 스크롤(대부분
        // 오프스크린 은닉)은 폐기, 전원 상시 노출.
        <GroupTable role="group" aria-label="동시대 수장 목록">
          {groups.map((group) => (
            /* role=group + aria-label — 칩만 탭으로 만나도 어느 나라 수장인지 전달 */
            <GroupRow key={group.key} role="group" aria-label={group.label}>
              <GroupLabelCell aria-hidden>
                {group.flagEmoji ? `${group.flagEmoji} ` : ''}
                {group.label}
              </GroupLabelCell>
              <ChipRow>
                {group.chips.map((chip) => {
                  const chipBody = (
                    <>
                      <ChipAvatarOrGlyph
                        profileImageUrl={chip.profileImageUrl}
                        category={chip.category}
                      />
                      <ChipName>{chip.label}</ChipName>
                      <ChipRole $category={chip.category}>
                        {chip.positionText}
                      </ChipRole>
                      <ChipSpan>{chip.spanText}</ChipSpan>
                    </>
                  )
                  // 정보밀도 보강 — 칩 본문에 안 담기는 본명·겹침 기간·복수 재위
                  // 스팬을 aria-label(키보드/SR)·title(hover)에 실어 노출한다.
                  const chipAria = `${chip.label} — ${group.label} ${chip.positionText} ${chip.spanText} · ${chip.detailText}`
                  // 타계정 소유 인물은 상세(:id)가 소유자 게이트라 열 수 없음 —
                  // 클릭 데드엔드 대신 비활성 칩 (가계도 비소유 노드 선례)
                  if (!chip.isOwned) {
                    // span은 암묵 generic 역할이라 aria-label로 이름을 못 붙인다 —
                    // role="img"로 named leaf를 만들어 카테고리·'다른 계정 소유'가 SR에 낭독되게.
                    // (button 칩과 정보 대칭. title은 hover 전용이라 키보드/SR 미접근이었음)
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
      )}

      {/* 절단 안내는 스크롤 밖(항상 노출). 모달 임베드(onOpenCompare 없음)에선 수장비교로
          갈 경로가 없으므로 죽은 포인터 대신 중립 문구로 분기한다. */}
      {data && data.rulers.length > 0 && data.meta.omittedCount > 0 && (
        onOpenCompare ? (
          <OmittedLinkButton type="button" onClick={onOpenCompare}>
            외 {data.meta.omittedCount}명 더 — 수장 비교에서 보기 →
          </OmittedLinkButton>
        ) : (
          <OmittedCaption>
            외 {data.meta.omittedCount}명 더 있음 (겹친 기간 긴 순 상위만 표시)
          </OmittedCaption>
        )
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
  margin-top: 14px;
`

const StripHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 8px;
`

const StripControls = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
`

/** 컴팩트 스트립 톤에 맞춰 canon 세그먼트를 살짝 축소(패딩·폰트만) */
const ScopeToggleWrap = styled.div`
  button {
    padding: 3px 9px;
    font-size: 11px;
  }
`

const StripTitle = styled.h4`
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const StripWindowCaption = styled.span`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CompareLinkButton = styled.button`
  border: none;
  background: none;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
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

const GroupTable = styled.div`
  display: flex;
  flex-direction: column;
`

/* 국가 구획 한 행 — 라벨 열(고정폭)과 칩 열. 셀은 grid 기본(stretch)으로 늘려
   라벨 열 세로 괘선이 행 전체 높이를 긋게 한다 */
const GroupRow = styled.div`
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr);
  column-gap: 12px;
  padding: 7px 0;
  & + & {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? '#2a2a2a' : theme.colors.border.default};
  }
`

const GroupLabelCell = styled.div`
  padding: 6px 12px 2px 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.secondary};
  /* 장문 국가명('그레이트브리튼 및 아일랜드 연합왕국')은 어절 단위로 줄바꿈 */
  word-break: keep-all;
  border-right: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? '#2a2a2a' : theme.colors.border.default};
`

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
`

const SkeletonRow = styled.div`
  display: flex;
  gap: 6px;
`

const chipSurfaceCss = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid #2a2a2a;
        color: #d1d5db;
      `
      : `
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid ${theme.colors.border.default};
        color: ${theme.colors.text.primary};
      `}
`

const RulerChip = styled.button`
  ${chipSurfaceCss}
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? `&:hover { background: rgba(255, 255, 255, 0.08); border-color: #3f3f46; }`
      : `&:hover { background: rgba(0, 0, 0, 0.05); }`}
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.colors.focusRing.primary};
  }
`

/** 타계정 소유 — 상세 진입 불가라 비클릭. 시각적으로도 살짝 가라앉힘 */
const RulerChipStatic = styled.span`
  ${chipSurfaceCss}
  cursor: default;
  opacity: 0.72;
`

const ChipAvatar = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
`

const ChipGlyph = styled.span<{ $category: PositionCategory }>`
  font-size: 11px;
  line-height: 1;
  color: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
`

const ChipName = styled.span`
  font-weight: 600;
  /* 장문 왕호('카를로스 1세 (후아나 1세 jure matris 공동 군주)') 괴물 칩 방지 —
     전문은 title(hover)·aria-label에 이미 실려 있다 */
  max-width: 176px;
  overflow: hidden;
  text-overflow: ellipsis;
`

/** 어떤 재임인지 상시 노출 — 카테고리 글리프와 같은 색으로 종류 신호를 잇는다 */
const ChipRole = styled.span<{ $category: PositionCategory }>`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme, $category }) =>
    theme.mode === 'dark'
      ? CATEGORY_TOKENS[$category].chip.dark.color
      : CATEGORY_TOKENS[$category].chip.light.color};
`

const ChipSpan = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SkeletonChip = styled.span`
  display: inline-block;
  width: 132px;
  height: 28px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
`

const MutedNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OmittedCaption = styled.p`
  margin: 6px 0 0;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OmittedLinkButton = styled.button`
  margin-top: 6px;
  border: none;
  background: none;
  padding: 2px 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
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
