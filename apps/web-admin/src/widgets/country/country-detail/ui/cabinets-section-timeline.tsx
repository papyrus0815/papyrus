import { FiUser } from 'react-icons/fi'

import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'

import { TL_THUMB } from './cabinets-section.constants'

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
  territoryPrefix?: string | null,
): string {
  const term =
    termNum != null
      ? `제${termNum}대${subTermNumber != null ? ` ${subTermNumber}기` : ''}`
      : ''
  const mid = [term, posTitle].filter(Boolean).join(', ')
  const core = `${mid ? `${mid}, ` : ''}${personName}, 상세 정보 보기`
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
  isDark,
}: {
  thumbUrl: string | null
  personName: string
  posTitle: string
  range: string
  ageAtStart: number | null
  birthPlace: string | null
  lineColor: string
  /** 전체 보기 등에서 소속 역사국가·현대국가 구분용 한 줄 */
  territoryLabel?: string | null
  isDark: boolean
}) {
  const C = getCabinetsSectionPalette(isDark)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        width: '100%',
        minWidth: 0,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: TL_THUMB,
          height: TL_THUMB,
          borderRadius: '50%',
          overflow: 'hidden',
          background: `${lineColor}18`,
          border: `3px solid ${lineColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 16px ${lineColor}44`,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={personName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top',
            }}
          />
        ) : (
          <FiUser size={48} color={lineColor} style={{ opacity: 0.3 }} />
        )}
      </div>
      <div
        style={{
          minWidth: 0,
          flex: 1,
          textAlign: 'left',
        }}
      >
        {territoryLabel ? (
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.textMuted,
              letterSpacing: '0.02em',
              marginBottom: 6,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={territoryLabel}
          >
            {territoryLabel}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: lineColor,
              background: `${lineColor}14`,
              border: `1px solid ${lineColor}55`,
              borderRadius: 999,
              padding: '3px 10px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              maxWidth: '42%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={posTitle}
          >
            {posTitle}
          </span>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.02em',
              lineHeight: 1.45,
              wordBreak: 'keep-all',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {personName}
          </div>
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '6px 8px',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: lineColor,
              background: `${lineColor}12`,
              borderRadius: 5,
              padding: '2px 9px',
              whiteSpace: 'normal',
              wordBreak: 'keep-all',
              lineHeight: 1.35,
            }}
          >
            {range}
          </span>
          {ageAtStart != null && (
            <span
              style={{ fontSize: 10.5, color: C.iconColor }}
            >
              취임 {ageAtStart}세
            </span>
          )}
        </div>
        {birthPlace && (
          <div
            style={{
              marginTop: 6,
              fontSize: 10.5,
              color: C.placeholderText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 9.5, color: C.textFaint }}>출신</span>
            {birthPlace}
          </div>
        )}
      </div>
    </div>
  )
}
