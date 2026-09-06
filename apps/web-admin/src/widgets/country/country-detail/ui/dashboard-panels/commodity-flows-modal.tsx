import { useMemo } from 'react'

import styled from 'styled-components'

import { useCommodityFlows } from '@/entities/trade/api'
import {
  CHANNEL_LABEL,
  formatTradeValue,
  formatTradeYear,
} from '@/entities/trade/vocab'
import { Modal } from '@/shared/ui/modal'

/**
 * **이 품목을 누가·언제·누구와 주고받았나** — 카탈로그를 둔 이유가 이 조회다.
 *
 * 품목을 나라·연도마다 문자열로만 적었다면 표기가 갈려("석유"/"원유"/"crude oil")
 * 이 질문 자체가 성립하지 않는다. 카탈로그 품목을 문 흐름만 여기 모인다 —
 * 자유 입력 행이 빠지는 건 한계가 아니라 이 화면이 약속하는 정확도다.
 */
interface CommodityFlowsModalProps {
  commodityId: string | null
  commodityName: string
  onClose: () => void
}

const Intro = styled.p`
  margin: 0;
  padding: 12px 16px 4px;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Scroll = styled.div`
  padding: 8px 12px 14px;
  max-height: min(60vh, 460px);
  overflow-y: auto;
`

const YearGroup = styled.div`
  & + & {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const YearLabel = styled.h3`
  margin: 0 0 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const FlowRow = styled.div<{ $direction: 'EXPORT' | 'IMPORT' }>`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
  padding: 6px 8px;
  border-radius: 8px;
  border-left: 3px solid
    ${({ theme, $direction }) =>
      $direction === 'EXPORT' ? theme.colors.success : theme.colors.accent};
  background: ${({ theme }) => theme.colors.background.secondary};

  & + & {
    margin-top: 4px;
  }
`

const DirectionTag = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Reporter = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Partner = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Amount = styled.span`
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Hint = styled.p`
  margin: 0;
  padding: 28px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export function CommodityFlowsModal({
  commodityId,
  commodityName,
  onClose,
}: CommodityFlowsModalProps) {
  const query = useCommodityFlows(commodityId)

  /* 연도로 묶어 세로로 세운다 — 같은 해에 여러 나라가 잡히는 게 이 조회의 값어치다 */
  const groups = useMemo(() => {
    const bucket = new Map<number, typeof rows>()
    const rows = query.data ?? []
    for (const row of rows) {
      const list = bucket.get(row.signedYear) ?? []
      list.push(row)
      bucket.set(row.signedYear, list)
    }
    return [...bucket.entries()].sort((left, right) => left[0] - right[0])
  }, [query.data])

  if (!commodityId) return null

  return (
    <Modal isOpen onClose={onClose} title={`${commodityName} — 교역 기록`} size="narrow">
      <Intro>
        카탈로그 품목으로 등록된 흐름만 모읍니다. 자유 입력으로 적힌 같은 이름의
        품목은 여기 잡히지 않습니다.
      </Intro>
      {query.isLoading ? (
        <Hint>불러오는 중…</Hint>
      ) : query.isError ? (
        <Hint>기록을 불러오지 못했습니다.</Hint>
      ) : groups.length === 0 ? (
        <Hint>이 품목으로 등록된 교역 기록이 아직 없습니다.</Hint>
      ) : (
        <Scroll>
          {groups.map(([signedYear, rows]) => (
            <YearGroup key={signedYear}>
              <YearLabel>
                {formatTradeYear(rows[0].era, rows[0].year)}
              </YearLabel>
              {rows.map((row) => (
                <FlowRow key={row.flowId} $direction={row.direction}>
                  <DirectionTag>
                    {row.direction === 'EXPORT' ? '수출' : '수입'}
                  </DirectionTag>
                  <span>
                    <Reporter>{row.reporterName ?? '주체 미상'}</Reporter>
                    {row.partnerName && (
                      <Partner>
                        {' '}
                        {row.direction === 'EXPORT' ? '→' : '←'}{' '}
                        {row.partnerName}
                      </Partner>
                    )}
                    {row.channel && (
                      <Partner> · {CHANNEL_LABEL[row.channel]}</Partner>
                    )}
                    {row.isEstimate && <Partner> · 추정</Partner>}
                  </span>
                  <Amount>
                    {row.sharePct != null
                      ? `${row.sharePct}%`
                      : row.value != null
                        ? `${formatTradeValue(row.value)}${row.currencyCode ? ` ${row.currencyCode}` : ''}`
                        : row.quantity != null
                          ? `${row.quantity.toLocaleString('ko-KR')}${row.quantityUnit ?? ''}`
                          : '—'}
                  </Amount>
                </FlowRow>
              ))}
            </YearGroup>
          ))}
        </Scroll>
      )}
    </Modal>
  )
}
