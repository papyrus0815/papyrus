import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Country, type ContinentOption } from '@/entities/country/api'
import { type UnifiedCountry } from '@/entities/country/model/unified-types'
import { getSummaryMetrics } from '@/entities/country/lib/utils'
import * as S from '../../../../pages/history/country/country.styles'

interface CountryDashboardProps {
  countries: Country[]
  filtered: UnifiedCountry[] // Country[] → UnifiedCountry[]로 변경
  continents: ContinentOption[]
  isLoading?: boolean
  onCountryEdit?: (country: Country) => void
}

export function CountryDashboard({
  countries,
  filtered,
  continents,
  isLoading = false,
  onCountryEdit,
}: CountryDashboardProps) {
  const metrics = getSummaryMetrics(countries)

  // Always show Global Dashboard
  return (
    <S.GlobalDashboard>
      {countries.length === 0 ? (
        <S.EmptyGlobalState>
          <S.EmptyGlobalIcon>🌍</S.EmptyGlobalIcon>
          <S.EmptyGlobalTitle>등록된 국가가 없어요</S.EmptyGlobalTitle>
          <S.EmptyGlobalDesc>
            전 세계 통계를 보려면 먼저 국가를 등록해주세요.
            <br />
            왼쪽 목록에서 새 국가를 추가할 수 있습니다.
          </S.EmptyGlobalDesc>
        </S.EmptyGlobalState>
      ) : (
        <>
          <S.GlobalDashboardHero>
            <S.HeroContent>
              <S.HeroIcon>🌍</S.HeroIcon>
              <S.HeroTextGroup>
                <S.HeroTitle>전 세계 국가 통계</S.HeroTitle>
                <S.HeroSubtitle>
                  {countries.length}개 국가의 데이터를 한눈에 확인하세요
                </S.HeroSubtitle>
              </S.HeroTextGroup>
            </S.HeroContent>
          </S.GlobalDashboardHero>

          {/* Global Metrics */}
          <S.GlobalMetricsGrid>
            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    fill="currentColor"
                  />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>총 인구</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {(metrics.totalPopulation / 1_000_000_000).toFixed(2)}B
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>
                  {countries.length}개 국가 합계
                </S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                    fill="currentColor"
                  />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>평균 면적</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {metrics.avgArea.toLocaleString()}km²
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>국가당 평균</S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c1.7 0 3.25.62 4.45 1.64-.53.18-1.12.36-1.45.36-1 0-2-.5-3.5-.5-.86 0-1.6.17-2.22.44C9.73 4.67 10.83 4 12 4z"
                    fill="currentColor"
                  />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>등록 국가</S.GlobalMetricLabel>
                <S.GlobalMetricValue>{countries.length}</S.GlobalMetricValue>
                <S.GlobalMetricSubtext>전체 국가 수</S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>

            <S.GlobalMetricCard>
              <S.GlobalMetricIcon>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"
                    fill="currentColor"
                  />
                </svg>
              </S.GlobalMetricIcon>
              <S.GlobalMetricContent>
                <S.GlobalMetricLabel>평균 인구 밀도</S.GlobalMetricLabel>
                <S.GlobalMetricValue>
                  {metrics.avgDensity.toLocaleString()}
                </S.GlobalMetricValue>
                <S.GlobalMetricSubtext>명/km²</S.GlobalMetricSubtext>
              </S.GlobalMetricContent>
            </S.GlobalMetricCard>
          </S.GlobalMetricsGrid>

          <S.DashboardSectionTitle>
            <S.SectionTitleIcon>📊</S.SectionTitleIcon>
            <S.SectionTitleText>상세 통계</S.SectionTitleText>
          </S.DashboardSectionTitle>

          {/* Continent Distribution & Rankings */}
          <S.GlobalDashboardGrid>
            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      fill="currentColor"
                    />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>대륙별 분포</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
              <S.GlobalWidgetContent>
                <S.LocationList>
                  {continents.map((continent) => {
                    const count = countries.filter(
                      (country) => country.continentId === continent.id,
                    ).length
                    const percent = ((count / countries.length) * 100).toFixed(
                      1,
                    )
                    return (
                      <S.LocationItem key={continent.id}>
                        <S.LocationDot />
                        <S.LocationName>{continent.name}</S.LocationName>
                        <S.LocationValue>
                          {count}개국 ({percent}%)
                        </S.LocationValue>
                      </S.LocationItem>
                    )
                  })}
                </S.LocationList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>

            <S.GlobalWidget>
              <S.GlobalWidgetHeader>
                <S.GlobalWidgetIcon>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                      fill="currentColor"
                    />
                  </svg>
                </S.GlobalWidgetIcon>
                <S.GlobalWidgetTitle>인구 상위 국가</S.GlobalWidgetTitle>
              </S.GlobalWidgetHeader>
              <S.GlobalWidgetContent>
                <S.LocationList>
                  {[...countries]
                    .sort(
                      (countryA, countryB) =>
                        (countryB.population || 0) - (countryA.population || 0),
                    )
                    .slice(0, 5)
                    .map((country) => (
                      <S.LocationItem key={country.id}>
                        <S.LocationDot />
                        <S.LocationName>
                          {country.flagEmoji} {country.name}
                        </S.LocationName>
                        <S.LocationValue>
                          {((country.population || 0) / 1_000_000).toFixed(1)}M
                        </S.LocationValue>
                      </S.LocationItem>
                    ))}
                </S.LocationList>
              </S.GlobalWidgetContent>
            </S.GlobalWidget>
          </S.GlobalDashboardGrid>

          <S.DashboardSectionTitle style={{ marginTop: '48px' }}>
            <S.SectionTitleIcon>📊</S.SectionTitleIcon>
            <S.SectionTitleText>국가 비교 목록</S.SectionTitleText>
          </S.DashboardSectionTitle>

          <S.DashboardTable>
            <S.DashboardTableHead>
              <tr>
                <S.DashboardTh>국가</S.DashboardTh>
                <S.DashboardTh>ISO</S.DashboardTh>
                <S.DashboardTh>수도</S.DashboardTh>
                <S.DashboardTh>대륙</S.DashboardTh>
                <S.DashboardTh align="right">인구</S.DashboardTh>
                <S.DashboardTh align="right">면적 (km²)</S.DashboardTh>
                <S.DashboardTh align="right">인구밀도</S.DashboardTh>
              </tr>
            </S.DashboardTableHead>
            <tbody>
              {filtered.map((country) => {
                const continent = continents.find(
                  (cont) => cont.id === country.continentId,
                )
                const density =
                  country.population && country.areaSqKm
                    ? (country.population / country.areaSqKm).toFixed(1)
                    : '-'

                // 현대 국가만 편집 가능
                const isModernCountry = country.type === 'modern'
                const handleClick = () => {
                  if (isModernCountry && onCountryEdit) {
                    // UnifiedCountry를 Country로 변환
                    const modernCountry: Country = {
                      id: country.id,
                      name: country.name,
                      localName: country.localName,
                      isoCode: country.isoCode,
                      flagEmoji: country.flagEmoji,
                      capital: country.capital,
                      population: country.population,
                      areaSqKm: country.areaSqKm,
                      thumbnailUrl: country.thumbnailUrl || undefined,
                      continentId: country.continentId,
                    }
                    onCountryEdit(modernCountry)
                  }
                }

                return (
                  <S.DashboardTr
                    key={country.id}
                    onClick={handleClick}
                    style={{ cursor: isModernCountry ? 'pointer' : 'default' }}
                  >
                    <S.DashboardTd>
                      <S.CountryCell>
                        <S.CountryFlag>
                          {country.flagEmoji || '🏳️'}
                        </S.CountryFlag>
                        <S.CountryInfo>
                          <S.CountryName>{country.name}</S.CountryName>
                          {country.localName && (
                            <S.CountryLocalName>
                              {country.localName}
                            </S.CountryLocalName>
                          )}
                        </S.CountryInfo>
                      </S.CountryCell>
                    </S.DashboardTd>
                    <S.DashboardTd>
                      <S.IsoCode>{country.isoCode || '-'}</S.IsoCode>
                    </S.DashboardTd>
                    <S.DashboardTd>{country.capital || '-'}</S.DashboardTd>
                    <S.DashboardTd>
                      <S.ContinentBadge>
                        {continent?.name || '-'}
                      </S.ContinentBadge>
                    </S.DashboardTd>
                    <S.DashboardTd align="right">
                      {country.population
                        ? country.population.toLocaleString()
                        : '-'}
                    </S.DashboardTd>
                    <S.DashboardTd align="right">
                      {country.areaSqKm
                        ? country.areaSqKm.toLocaleString()
                        : '-'}
                    </S.DashboardTd>
                    <S.DashboardTd align="right">{density}</S.DashboardTd>
                  </S.DashboardTr>
                )
              })}
            </tbody>
          </S.DashboardTable>
        </>
      )}
    </S.GlobalDashboard>
  )
}
