import { useState } from 'react'

import {
  ModalBody,
  ModalBoxWide,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal'

import { INDICATOR_META, type IndicatorType } from './field-configs'
import { IndicatorEditorPanel } from './indicator-editor-panel'
import { RecordsPanel } from './records-panel'
import * as S from './styles'
import { TradePanel } from './trade-panel'

interface Props {
  countryId: string
  countryName: string
  open: boolean
  onClose: () => void
}

type MainTab = 'indicators' | 'trade' | 'records'

const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: 'indicators', label: '지표' },
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
  const [indicatorType, setIndicatorType] =
    useState<IndicatorType>('economic')

  if (!open) return null

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBoxWide onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <ModalTitle>국가 데이터 관리</ModalTitle>
            <ModalSubtitle>{countryName} · 지표 · 교역 · 기록</ModalSubtitle>
          </div>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            ✕
          </ModalCloseButton>
        </ModalHeader>

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

          {tab === 'trade' && <TradePanel countryId={countryId} />}
          {tab === 'records' && <RecordsPanel countryId={countryId} />}
        </ModalBody>
      </ModalBoxWide>
    </ModalOverlay>
  )
}
