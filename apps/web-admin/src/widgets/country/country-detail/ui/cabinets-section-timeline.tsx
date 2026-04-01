import { FiUser } from 'react-icons/fi'

import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'

import * as CabS from './cabinets-section.styled'
import { TL_MONARCH_BADGE_VISUAL, TL_THUMB } from './cabinets-section.constants'

/** 행정부 표기: 「제N대 [M기] 직위 이름」 — TlItem보다 위에 두어 스코프 명확히 */
export function formatCabinetTermBadge(
  termNum: number | null | undefined,
  subTermNumber: number | null | undefined,
): string | null {
  if (termNum == null) return null
  return subTermNumber != null
    ? `제${termNum}대 ${subTermNumber}기`
    : `제${termNum}대`
}

/** 스크린리더용 타임라인 셀 설명 (화면에는 대수·직위를 뱃지/별도로 표시) */
export function cabinetTimelineCellAriaLabel(
  termNum: number | null | undefined,
  subTermNumber: number | null | undefined,
  posTitle: string,
  personName: string,
  opts?: {
    territoryPrefix?: string | null
    monarchEraLine?: string | null
    monarchPersonName?: string | null
  },
): string {
  const territoryPrefix = opts?.territoryPrefix
  const monarchEraLine = opts?.monarchEraLine
  const monarchPersonName = opts?.monarchPersonName
  const term =
    termNum != null
      ? `제${termNum}대${subTermNumber != null ? ` ${subTermNumber}기` : ''}`
      : ''
  const mid = [term, posTitle].filter(Boolean).join(', ')
  const era = monarchEraLine?.trim()
    ? monarchPersonName?.trim()
      ? `, 재위 군주 ${monarchPersonName.trim()}, ${monarchEraLine.trim()}`
      : `, 재위 시대: ${monarchEraLine.trim()}`
    : ''
  const core = `${mid ? `${mid}, ` : ''}${personName}${era}, 상세 정보 보기`
  if (territoryPrefix?.trim()) return `${territoryPrefix.trim()}, ${core}`
  return core
}

export function TlItem({
  thumbUrl,
  personName,
  posTitle,
  range,
  ageAtStart,
  birthPlace,
  lineColor,
  territoryLabel,
  monarchThumbUrl,
  monarchBadgeTitle,
  monarchPersonId,
  monarchEraAccentColor,
  onMonarchPersonClick,
  isDark,
  /** true면 썸네일을 오른쪽(축 반대편)에 둠 — 세로 타임라인 우측 열 */
  thumbOnEnd = false,
  /** 세로 타임라인 등에서 군주 썸네일 배지 숨김 */
  hideMonarchBadge = false,
}: {
  thumbUrl: string | null
  personName: string
  posTitle: string
  range: string
  ageAtStart: number | null
  birthPlace: string | null
  lineColor: string
  thumbOnEnd?: boolean
  hideMonarchBadge?: boolean
  /** 전체 보기 등에서 소속 역사국가·현대국가 구분용 한 줄 */
  territoryLabel?: string | null
  /** 재위 군주 프로필(없으면 아이콘) — 수반 썸네일 11시 방향 배지 */
  monarchThumbUrl?: string | null
  /** 군주 배지 툴팁·접근성 */
  monarchBadgeTitle?: string | null
  monarchPersonId?: string | null
  /** 상단 재위 띠와 맞추는 테두리 색 */
  monarchEraAccentColor?: string | null
  onMonarchPersonClick?: (personId: string) => void
  isDark: boolean
}) {
  const C = getCabinetsSectionPalette(isDark)
  const showMonarchBadge =
    Boolean(monarchEraAccentColor) && !hideMonarchBadge
  const R = TL_THUMB / 2
  /** 11시 방향: 12시(위)에서 반시계 30° → 표준각 -120° (x 오른쪽, y 아래) */
  const rad = (-120 * Math.PI) / 180
  const cxBase = R + R * Math.cos(rad)
  const cy = R + R * Math.sin(rad)
  /** 우측 열: 배지를 가로로 뒤집어 바깥(화면 끝) 쪽에 두기 */
  const cx = thumbOnEnd ? TL_THUMB - cxBase : cxBase
  const badgeHalf = TL_MONARCH_BADGE_VISUAL / 2
  const badgeLeft = cx - badgeHalf
  const badgeTop = cy - badgeHalf

  const monarchBadgeFace = (
    <CabS.TlItemMonarchBadgeVisual
      $lineColor={lineColor}
      $accentColor={monarchEraAccentColor ?? null}
      $panelBg={C.bg}
    >
      {monarchThumbUrl ? (
        <CabS.TlItemMonarchBadgeImg src={monarchThumbUrl} alt="" />
      ) : (
        <FiUser
          size={28}
          color={monarchEraAccentColor ?? lineColor}
          style={{ opacity: 0.55 }}
        />
      )}
    </CabS.TlItemMonarchBadgeVisual>
  )

  return (
    <CabS.TlItemRoot $thumbOnEnd={thumbOnEnd}>
      <CabS.TlItemAvatarCol>
        <CabS.TlItemAvatarRing $lineColor={lineColor}>
          {thumbUrl ? (
            <CabS.TlItemAvatarImg src={thumbUrl} alt={personName} />
          ) : (
            <FiUser size={62} color={lineColor} style={{ opacity: 0.3 }} />
          )}
        </CabS.TlItemAvatarRing>
        {showMonarchBadge ? (
          <CabS.TlItemMonarchAnchor
            $left={badgeLeft}
            $top={badgeTop}
            $pointerEvents={
              monarchPersonId && onMonarchPersonClick ? 'auto' : 'none'
            }
          >
            {monarchPersonId && onMonarchPersonClick ? (
              <CabS.TlItemMonarchHitBtn
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onMonarchPersonClick(monarchPersonId)
                }}
                title={monarchBadgeTitle ?? undefined}
                aria-label={
                  monarchBadgeTitle
                    ? `재위 군주: ${monarchBadgeTitle}, 인물 정보`
                    : '재위 군주, 인물 정보'
                }
              >
                {monarchBadgeFace}
              </CabS.TlItemMonarchHitBtn>
            ) : (
              <div title={monarchBadgeTitle ?? undefined} aria-hidden>
                {monarchBadgeFace}
              </div>
            )}
          </CabS.TlItemMonarchAnchor>
        ) : null}
      </CabS.TlItemAvatarCol>
      <CabS.TlItemTextCol $thumbOnEnd={thumbOnEnd}>
        {territoryLabel ? (
          <CabS.TlItemTerritoryLine
            $color={C.textMuted}
            $thumbOnEnd={thumbOnEnd}
            title={territoryLabel}
          >
            {territoryLabel}
          </CabS.TlItemTerritoryLine>
        ) : null}
        <CabS.TlItemTitleRow $thumbOnEnd={thumbOnEnd}>
          <CabS.TlItemPosPill
            $lineColor={lineColor}
            $thumbOnEnd={thumbOnEnd}
            title={posTitle}
          >
            {posTitle}
          </CabS.TlItemPosPill>
          <CabS.TlItemPersonName $color={C.text} $thumbOnEnd={thumbOnEnd}>
            {personName}
          </CabS.TlItemPersonName>
        </CabS.TlItemTitleRow>
        <CabS.TlItemMetaRow $thumbOnEnd={thumbOnEnd}>
          <CabS.TlItemRangeChip $lineColor={lineColor}>{range}</CabS.TlItemRangeChip>
          {ageAtStart != null && (
            <CabS.TlItemAgeNote $color={C.iconColor}>
              취임 {ageAtStart}세
            </CabS.TlItemAgeNote>
          )}
        </CabS.TlItemMetaRow>
        {birthPlace && (
          <CabS.TlItemBirthRow
            $color={C.placeholderText}
            $thumbOnEnd={thumbOnEnd}
          >
            <CabS.TlItemBirthLabel $color={C.textFaint}>출신</CabS.TlItemBirthLabel>
            {birthPlace}
          </CabS.TlItemBirthRow>
        )}
      </CabS.TlItemTextCol>
    </CabS.TlItemRoot>
  )
}
