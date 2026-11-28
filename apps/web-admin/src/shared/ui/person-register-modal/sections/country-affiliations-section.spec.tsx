import React, { useState } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { buildCountrySearchOptions } from '../country-search-options'
import { type CountryAffiliationRow, CountryAffiliationsSection, makeAffiliationRow } from './country-affiliations-section'

jest.mock('@/shared/hooks/use-click-sound.hook', () => ({ useClickSound: () => jest.fn() }))
jest.mock('@/shared/api/client', () => ({ getApiConnection: () => ({}) }))
jest.mock('@/shared/api/api.service', () => ({}))

/* jsdom에는 scrollIntoView가 없다 */
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

const MODERN = [
  { id: 'fr', name: '프랑스', flagEmoji: '🇫🇷', enName: 'France', isoCode: 'FRA' },
  { id: 'de', name: '독일', flagEmoji: '🇩🇪', enName: 'Germany', isoCode: 'DEU' },
]
const HISTORICAL = [
  { id: 'prussia', name: '프로이센 왕국', enName: 'Kingdom of Prussia', startYear: 1701, endYear: 1918 },
  { id: 'rome', name: '로마 제국', enName: 'Roman Empire', startEra: 'BC', startYear: 27, endYear: 476 },
]

describe('buildCountrySearchOptions', () => {
  it('힌트 없음 → 현대 묶음 먼저, 역사국가는 존속기간 표기', () => {
    const options = buildCountrySearchOptions(MODERN, HISTORICAL, null)
    expect(options.map((option) => option.value)).toEqual(['m:de', 'm:fr', 'h:rome', 'h:prussia'])
    expect(options[3]).toMatchObject({ meta: '1701–1918', group: '역사 국가' })
    expect(options[1]).toMatchObject({ label: '프랑스', leading: '🇫🇷', group: '현대 국가' })
  })

  it('1945년 이전 시기 힌트 → 역사 묶음 먼저, 겹치는 나라를 앞으로(제외 없음)', () => {
    const options = buildCountrySearchOptions(MODERN, HISTORICAL, { startYear: 1815, endYear: 1898 })
    expect(options.map((option) => option.value)).toEqual(['h:prussia', 'h:rome', 'm:de', 'm:fr'])
    expect(options[0].group).toBe('1815–1898 존속 역사 국가')
    expect(options[1].group).toBe('역사 국가')
  })

  it('주 국적에 표지', () => {
    const options = buildCountrySearchOptions(MODERN, HISTORICAL, null, { primaryValue: 'm:fr' })
    expect(options.find((option) => option.value === 'm:fr')?.meta).toBe('주 국적')
  })
})

function Harness({ initial = [] as CountryAffiliationRow[], primary = '' }) {
  const [rows, setRows] = useState<CountryAffiliationRow[]>(initial)
  return (
    <>
      <CountryAffiliationsSection
        fid={(key) => `test-${key}`}
        rows={rows}
        setRows={setRows}
        modernCountries={MODERN}
        historicalCountries={HISTORICAL}
        lifespanHint={null}
        primaryCountryValue={primary}
        markDirty={jest.fn()}
      />
      <output data-testid="rows">{JSON.stringify(rows.map(({ key: _key, ...rest }) => rest))}</output>
    </>
  )
}

describe('CountryAffiliationsSection — 국가 드롭다운', () => {
  it('빈 상태 안내, 아래 검색 칸에서 국가를 고르면 그 국가로 행이 생긴다', () => {
    renderWithTheme(<Harness />)
    expect(screen.getByText(/주 국적 밖의 소속/)).toBeInTheDocument()
    const addInput = screen.getByRole('combobox', { name: '소속 추가 — 국가 검색' })
    fireEvent.focus(addInput)
    fireEvent.change(addInput, { target: { value: 'prussia' } })
    fireEvent.keyDown(addInput, { key: 'Enter' })
    const saved = JSON.parse(screen.getByTestId('rows').textContent ?? '[]')
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      historicalCountryId: 'prussia',
      countryLabel: '프로이센 왕국',
      affiliationType: 'CITIZENSHIP',
    })
    expect(saved[0].countryId).toBeUndefined()
    // 행의 국가 칸에 고른 나라가 서고, 추가 칸은 다음 국가를 받도록 비어 있다
    expect(screen.getByRole('combobox', { name: '소속 1 국가' })).toHaveValue('프로이센 왕국')
    expect(screen.getByRole('combobox', { name: '소속 추가 — 국가 검색' })).toHaveValue('')
  })

  it('주 국적과 같은 국가를 국적/시민권으로 또 적으면 안내한다', () => {
    renderWithTheme(
      <Harness initial={[makeAffiliationRow({ countryId: 'fr', countryLabel: '프랑스' })]} primary="m:fr" />,
    )
    expect(screen.getByText(/주 국적과 같은 국가입니다/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '소속 1 국가' })).toHaveValue('프랑스')
  })

  it('유형도 같은 콤보박스로 바꾼다', () => {
    renderWithTheme(<Harness initial={[makeAffiliationRow()]} />)
    const typeInput = screen.getByRole('combobox', { name: '소속 유형 1' })
    expect(typeInput).toHaveValue('국적/시민권')
    fireEvent.focus(typeInput)
    fireEvent.click(screen.getByRole('option', { name: /망명/ }))
    expect(JSON.parse(screen.getByTestId('rows').textContent ?? '[]')[0].affiliationType).toBe('EXILE')
  })
})
