import { useState } from 'react'

import { Modal, ModalBody } from '@/shared/ui/modal'

import { INDICATOR_META, type IndicatorType } from './field-configs'
import { IndicatorEditorPanel } from './indicator-editor-panel'
import { PopulationPyramidPanel } from './population-pyramid-panel'
import { RecordsPanel } from './records-panel'
import * as S from './styles'
import { TradePanel } from './trade-panel'

interface Props {
  countryId: string
  countryName: string
  open: boolean
  onClose: () => void
}

type MainTab = 'indicators' | 'pyramid' | 'trade' | 'records'

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'indicators', label: '지표' },
  // 연령대별 성별 인구는 18칸이라 '지표'의 평평한 표에 못 들어간다 — 별도 탭.
  { key: 'pyramid', label: '연령·성별 인구' },
  { key: 'trade', label: '교역' },
  { key: 'records', label: '기록' },
]

const INDICATOR_TYPES: IndicatorType[] = [
  'economic',
  'demographic',
  'development',
]

/**
 * 국가 데이터 관리 모달 — 지표(경제·인구·발전) / 교역 / 기록 CRUD.
 * 백엔드 쓰기 엔드포인트를 실제로 연결한다.
 */
export function CountryDataManagerModal({
  countryId,
  countryName,
  open,
  onClose,
}: Props) {
  const [tab, setTab] = useState<MainTab>('indicators')
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('economic')

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="국가 데이터 관리"
      subtitle={`${countryName} · 지표 · 연령·성별 인구 · 교역 · 기록`}
      size="wide"
    >
      <ModalBody>
        <S.TabBar role="tablist">
          {MAIN_TABS.map((t) => (
            <S.TabButton
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              $active={tab === t.key}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </S.TabButton>
          ))}
        </S.TabBar>

        {tab === 'indicators' && (
          <>
            <S.SubTabBar>
              {INDICATOR_TYPES.map((it) => (
                <S.Chip
                  key={it}
                  type="button"
                  $active={indicatorType === it}
                  onClick={() => setIndicatorType(it)}
                >
                  {INDICATOR_META[it].label}
                </S.Chip>
              ))}
            </S.SubTabBar>
            <IndicatorEditorPanel
              key={indicatorType}
              countryId={countryId}
              type={indicatorType}
            />
          </>
        )}

        {tab === 'pyramid' && <PopulationPyramidPanel countryId={countryId} />}
        {tab === 'trade' && <TradePanel countryId={countryId} />}
        {tab === 'records' && <RecordsPanel countryId={countryId} />}
      </ModalBody>
    </Modal>
  )
}
