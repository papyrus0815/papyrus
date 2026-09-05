import type { CompletenessField } from '../../model/use-country-dashboard-stats'
import { IconCheck } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

export interface CompletenessPanelProps {
  filled: number
  total: number
  missing: CompletenessField[]
  /** 비어 있는 축 칩을 누르면 그 축을 채우는 탭으로 보낸다 */
  onFillMissing: ((field: CompletenessField) => void) | null
  /** 집계에 쓰는 쿼리가 아직 로딩 중 — 다 비어 있다고 단정하지 않는다 */
  isLoading?: boolean
}

export function CompletenessPanel({
  filled,
  total,
  missing,
  onFillMissing,
  isLoading = false,
}: CompletenessPanelProps) {
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const isFull = total > 0 && filled === total

  // SVG 도넛
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - (total > 0 ? filled / total : 0))

  if (isLoading) {
    return (
      <S.CardPanel $accent="indigo">
        <S.CardPanelTitleRow>
          <S.CardPanelTitle>기록 완성도</S.CardPanelTitle>
        </S.CardPanelTitleRow>
        <S.CompletenessLine>기록을 세는 중…</S.CompletenessLine>
      </S.CardPanel>
    )
  }

  return (
    <S.CardPanel $accent={isFull ? 'emerald' : 'indigo'}>
      <S.CardPanelTitleRow>
        <S.CardPanelTitle>기록 완성도</S.CardPanelTitle>
        <S.CardPanelHint>
          {filled}/{total}
        </S.CardPanelHint>
      </S.CardPanelTitleRow>

      <S.CompletenessRow>
        <S.DonutWrap>
          <S.DonutSvg viewBox="0 0 100 100">
            <S.DonutTrackCircle cx="50" cy="50" r={radius} />
            <S.DonutFillCircle
              cx="50"
              cy="50"
              r={radius}
              $full={isFull}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </S.DonutSvg>
          <S.DonutCenter>
            <S.DonutPercent>{percent}%</S.DonutPercent>
            <S.DonutSubLabel>완성</S.DonutSubLabel>
          </S.DonutCenter>
        </S.DonutWrap>

        <S.CompletenessTextCol>
          {isFull ? (
            <S.CompletionFullState>
              <S.CompletionCheckIcon aria-hidden>
                <IconCheck />
              </S.CompletionCheckIcon>
              모든 기록 축 등록 완료
            </S.CompletionFullState>
          ) : (
            <>
              <S.CompletenessLine>
                <S.CompletenessLineStrong>
                  {missing.length}개
                </S.CompletenessLineStrong>
                기록이 비어 있습니다
              </S.CompletenessLine>
              {missing.length > 0 && (
                <S.MissingChips>
                  {missing.slice(0, 6).map((field) =>
                    onFillMissing ? (
                      <S.MissingChipButton
                        key={field.key}
                        type="button"
                        onClick={() => onFillMissing(field)}
                        aria-label={`${field.label} 기록하러 가기`}
                      >
                        {field.label}
                      </S.MissingChipButton>
                    ) : (
                      <S.MissingChip key={field.key}>{field.label}</S.MissingChip>
                    ),
                  )}
                  {missing.length > 6 && (
                    <S.MissingChip>+{missing.length - 6}</S.MissingChip>
                  )}
                </S.MissingChips>
              )}
            </>
          )}
        </S.CompletenessTextCol>
      </S.CompletenessRow>
    </S.CardPanel>
  )
}
