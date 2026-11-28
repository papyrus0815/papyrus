import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithTheme } from '@/shared/test/render-with-theme'

import { InlineSearchSelect } from './inline-search-select'

const OPTIONS = [
  { value: 'm:fr', label: '🇫🇷 프랑스', meta: '현대', keywords: 'France FRA' },
  { value: 'h:fr1', label: '프랑스 제1공화국', meta: '역사 · 1792–1804', keywords: 'French First Republic' },
  { value: 'h:prussia', label: '프로이센 왕국', meta: '역사 · 1701–1918', keywords: 'Kingdom of Prussia' },
]

/* jsdom에는 scrollIntoView가 없다(활성 항목을 보이게 굴리는 호출) */
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
})

describe('InlineSearchSelect — 국적 드롭다운', () => {
  it('영문명·ISO 키워드로 찾고 고르면 값이 넘어간다', () => {
    const onChange = jest.fn()
    renderWithTheme(<InlineSearchSelect ariaLabel="국적" options={OPTIONS} value="" onChange={onChange} />)
    const input = screen.getByRole('combobox', { name: '국적' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'prussia' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('h:prussia')
  })

  it('목록이 오기 전에는 저장된 이름을 보인다', () => {
    renderWithTheme(
      <InlineSearchSelect ariaLabel="국적" options={[]} value="m:fr" selectedLabelFallback="프랑스" onChange={jest.fn()} />,
    )
    expect(screen.getByRole('combobox', { name: '국적' })).toHaveValue('프랑스')
  })

  it("캡에 걸린 수는 말없이 자르지 않고 '외 N개'로 알린다", () => {
    renderWithTheme(<InlineSearchSelect ariaLabel="국적" options={OPTIONS} value="" onChange={jest.fn()} limit={1} />)
    fireEvent.focus(screen.getByRole('combobox', { name: '국적' }))
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByText(/외 2개/)).toBeInTheDocument()
  })
})

describe('InlineSearchSelect — 검색어로 새로 만들기(가문)', () => {
  const DYNASTIES = [{ value: 'd1', label: '로마노프 가' }]
  const renderCreate = (onCreateNew: jest.Mock) =>
    renderWithTheme(
      <InlineSearchSelect
        ariaLabel="가문"
        options={DYNASTIES}
        value=""
        onChange={jest.fn()}
        onCreateNew={onCreateNew}
        createRequiresQuery
        createLabel={(name) => `'${name}' 가문 새로 등록`}
      />,
    )

  it('검색어가 없으면 만들기 행을 숨기고, 있으면 검색어를 넘긴다', () => {
    const onCreateNew = jest.fn()
    renderCreate(onCreateNew)
    const input = screen.getByRole('combobox', { name: '가문' })
    fireEvent.focus(input)
    expect(screen.queryByText(/새로 등록/)).not.toBeInTheDocument()
    fireEvent.change(input, { target: { value: '호엔촐레른 가' } })
    fireEvent.click(screen.getByText("'호엔촐레른 가' 가문 새로 등록"))
    expect(onCreateNew).toHaveBeenCalledWith('호엔촐레른 가')
  })

  it('이름이 똑같은 항목이 있으면 만들기 행을 숨긴다(중복 등록 방지)', () => {
    renderCreate(jest.fn())
    const input = screen.getByRole('combobox', { name: '가문' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '로마노프 가' } })
    expect(screen.queryByText(/새로 등록/)).not.toBeInTheDocument()
  })
})
