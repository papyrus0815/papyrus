import { IconCheck } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

export interface CompletenessPanelProps {
  filled: number
  total: number
  missing: { key: string; label: string }[]
  onEditMissing: (() => void) | null
}

export function CompletenessPanel({
  filled,
  total,
  missing,
  onEditMissing,
}: CompletenessPanelProps) {
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0
  const isFull = total > 0 && filled === total

  // SVG 도넛
  const r = 42
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - (total > 0 ? filled / total : 0))

  return (
    <S.CardPanel $accent={isFull ? 'emerald' : 'indigo'}>
      <S.CardPanelTitleRow>
        <S.CardPanelTitle>데이터 완성도</S.CardPanelTitle>
        <S.CardPanelHint>
          {filled}/{total}
        </S.CardPanelHint>
      </S.CardPanelTitleRow>

      <S.CompletenessRow>
        <S.DonutWrap>
          <S.DonutSvg viewBox="0 0 100 100">
            <S.DonutTrackCircle cx="50" cy="50" r={r} />
            <S.DonutFillCircle
              cx="50"
              cy="50"
              r={r}
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
              모든 항목 등록 완료
            </S.CompletionFullState>
          ) : (
            <>
              <S.CompletenessLine>
                <S.CompletenessLineStrong>
                  {missing.length}개
                </S.CompletenessLineStrong>
                항목이 비어 있습니다
              </S.CompletenessLine>
              {missing.length > 0 && (
                <S.MissingChips>
                  {missing.slice(0, 6).map((m) =>
                    onEditMissing ? (
                      <S.MissingChipButton
                        key={m.key}
                        type="button"
                        onClick={onEditMissing}
                        aria-label={`${m.label} 편집`}
                      >
                        {m.label}
                      </S.MissingChipButton>
                    ) : (
                      <S.MissingChip key={m.key}>{m.label}</S.MissingChip>
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
