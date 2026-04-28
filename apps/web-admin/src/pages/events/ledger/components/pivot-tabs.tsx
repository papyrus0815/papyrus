/**
 * Pivot Tabs — 같은 데이터를 다른 *축*으로 재구성.
 *
 * 1~5 단축키로 빠른 전환. 활성 피벗엔 하단 ===== 라인.
 */
import React from 'react'

import {
  FiAlertTriangle,
  FiCalendar,
  FiGlobe,
  FiLayers,
  FiUsers,
} from 'react-icons/fi'
import styled from 'styled-components'

import { PIVOT, type Pivot } from '../hooks/use-ledger-state'
import { ledgerHairline } from '../styles/ledger-tokens'

interface Props {
  pivot: Pivot
  setPivot: (part: Pivot) => void
}

const TABS: Array<{
  id: Pivot
  label: string
  icon: React.ReactNode
  hint: string
}> = [
  { id: PIVOT.TIME, label: '시간', icon: <FiCalendar size={12} />, hint: '1' },
  { id: PIVOT.COUNTRY, label: '국가', icon: <FiGlobe size={12} />, hint: '2' },
  { id: PIVOT.CATEGORY, label: '카테고리', icon: <FiLayers size={12} />, hint: '3' },
  { id: PIVOT.PERSON, label: '인물', icon: <FiUsers size={12} />, hint: '4' },
  { id: PIVOT.QUALITY, label: '데이터 품질', icon: <FiAlertTriangle size={12} />, hint: '5' },
]

export const PivotTabs: React.FC<Props> = ({ pivot, setPivot }) => {
  return (
    <>
      <Lead>축</Lead>
      <TabGroup role="tablist" aria-label="피벗 축">
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            type="button"
            role="tab"
            $active={pivot === tab.id}
            onClick={() => setPivot(tab.id)}
            aria-selected={pivot === tab.id}
            tabIndex={pivot === tab.id ? 0 : -1}
            title={`${tab.label} (${tab.hint})`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <Hint aria-hidden="true">{tab.hint}</Hint>
          </Tab>
        ))}
      </TabGroup>
    </>
  )
}

const Lead = styled.div`
  display: inline-flex;
  align-items: center;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-right: 12px;
  flex-shrink: 0;

  @media (max-width: 480px) {
    display: none;
  }
`

const TabGroup = styled.div`
  display: inline-flex;
  align-items: stretch;
  gap: 0;
`

const Tab = styled.button<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-size: 12.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: color 0.12s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px 2px 0 0;
    background: ${({ $active }) =>
      $active ? 'linear-gradient(90deg, #4338ca, #8b5cf6)' : 'transparent'};
    transition: background 0.18s;
  }

  @media (max-width: 480px) {
    padding: 0 10px;
  }
`

const Hint = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 3px;
  background: ${({ theme }) => ledgerHairline(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 9.5px;
  font-weight: 700;
  margin-left: 2px;

  @media (max-width: 600px) {
    display: none;
  }
`
