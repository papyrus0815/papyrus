import {
  EstimateRole,
  PersonPlaceCertainty,
  PlaceKind,
} from '@prisma/client'

import { decomposeHistoricalPlaceText } from './place-text-decomposer'

describe('decomposeHistoricalPlaceText', () => {
  it('현대 지명 병기와 "/ 일설" 복수 학설을 PREFERRED + ALTERNATIVE 두 행으로 분해한다', () => {
    const claims = decomposeHistoricalPlaceText(
      '기이국 와카야마성(和歌山城) — 현 와카야마현 와카야마시 / 일설 에도 기이번 저택',
      { fallbackCountryName: '일본' },
    )

    expect(claims).toHaveLength(2)
    expect(claims[0].estimateRole).toBe(EstimateRole.PREFERRED)
    expect(claims[0].historicalLabel).toBe('기이국 와카야마성(和歌山城)')
    expect(claims[0].modernEquivalent).toBe('와카야마현 와카야마시')
    expect(claims[0].inferredKind).toBe(PlaceKind.SITE)
    expect(claims[0].geocodeQueries[0]).toContain('와카야마현 와카야마시')

    expect(claims[1].estimateRole).toBe(EstimateRole.ALTERNATIVE)
    expect(claims[1].historicalLabel).toBe('에도 기이번 저택')
  })

  it('앞쪽 콜론, 원어 괄호, 시대 부연 설명(출생 당시 ...)을 정확히 분리한다', () => {
    const claims = decomposeHistoricalPlaceText(
      ': 무이유롱앙파레(Mouilleron-en-Pareds), 방데현 — 출생 당시 7월 왕정기 프랑스',
      { fallbackCountryName: '프랑스' },
    )

    expect(claims).toHaveLength(1)
    expect(claims[0].historicalLabel).toBe(
      '무이유롱앙파레(Mouilleron-en-Pareds), 방데현',
    )
    expect(claims[0].localNameHint).toBe('Mouilleron-en-Pareds')
    expect(claims[0].note).toBe('출생 당시 7월 왕정기 프랑스')
    expect(claims[0].geocodeQueries).toContain('Mouilleron-en-Pareds, 프랑스')
  })

  it('괄호 속 현대 국가+지명 표기("(독일 노르트라인 베스트팔렌 주 아헨)")를 현대 지명으로 추출한다', () => {
    const claims = decomposeHistoricalPlaceText(
      '프랑크 왕국 엑스라샤펠(독일 노르트라인 베스트팔렌 주 아헨)',
    )

    expect(claims).toHaveLength(1)
    expect(claims[0].historicalLabel).toBe('프랑크 왕국 엑스라샤펠')
    expect(claims[0].modernEquivalent).toBe(
      '독일 노르트라인 베스트팔렌 주 아헨',
    )
    expect(claims[0].geocodeQueries[0]).toBe(
      '독일 노르트라인 베스트팔렌 주 아헨',
    )
  })

  it('"(지명 미상)"과 "(추정)"의 확실성 층위를 각각 UNKNOWN, PROBABLE로 판별한다', () => {
    const unknownClaims = decomposeHistoricalPlaceText('헝가리 왕국(지명 미상)')
    expect(unknownClaims[0].certainty).toBe(PersonPlaceCertainty.UNKNOWN)
    expect(unknownClaims[0].geocodeQueries).toEqual([])

    const probableClaims = decomposeHistoricalPlaceText(
      '성로마제국 바이에른 안데크스(추정)',
    )
    expect(probableClaims[0].certainty).toBe(PersonPlaceCertainty.PROBABLE)
    expect(probableClaims[0].historicalLabel).toBe('성로마제국 바이에른 안데크스')
    expect(probableClaims[0].geocodeQueries).toContain('바이에른 안데크스')
  })
})
