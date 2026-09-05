import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'

import { IconLandmark } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'

interface CountryCompaniesSectionProps {
  countryId: string
}

/** 창립 연도만 뽑는다 — 카드에 전체 날짜를 넣으면 이름보다 길어진다 */
function foundedYear(iso: string | null): string | null {
  if (!iso) return null
  const matched = /^(\d{4})/.exec(iso)
  return matched ? matched[1] : null
}

/**
 * 이 나라의 기업.
 *
 * 서버에 국가별 기업 엔드포인트가 없어 전체를 받아 `countryId`로 거른다 — 실DB 5행이라
 * 지금은 이 편이 왕복 한 번으로 끝난다(대시보드의 군대 카드가 쓰는 방식과 같다).
 * 행이 늘면 서버 필터로 옮길 것.
 *
 * 캐시 키는 회사 목록 사이드바와 **같은 키**를 쓴다. 같은 응답을 다른 키로 두 번 받는
 * 구멍(검토서 G1·G2)을 새로 만들지 않기 위해서다.
 *
 * 이 나라에 등록된 기업이 없으면 아무것도 그리지 않는다 — 빈 섹션은 세우지 않는다.
 */
export function CountryCompaniesSection({
  countryId,
}: CountryCompaniesSectionProps) {
  const navigate = useNavigate()
  const { data } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })

  const companies = useMemo(() => {
    return (data ?? [])
      .filter((company) => company.countryId === countryId)
      .sort((left, right) => left.name.localeCompare(right.name, 'ko-KR'))
  }, [data, countryId])

  if (companies.length === 0) return null

  return (
    <S.Section>
      <S.SectionTitleRow>
        <S.SectionTitleIcon $accent="sky">
          <IconLandmark />
        </S.SectionTitleIcon>
        <S.SectionTitleText>기업</S.SectionTitleText>
        <S.SectionCountChip>{companies.length}개</S.SectionCountChip>
        <S.SectionLink
          type="button"
          onClick={() => navigate(pathKeys.companies.root())}
        >
          전체 보기
        </S.SectionLink>
      </S.SectionTitleRow>

      <S.CompanyRow>
        {companies.map((company) => {
          const year = foundedYear(company.foundedAt)
          return (
            <S.CompanyChip
              key={company.id}
              type="button"
              onClick={() => navigate(pathKeys.companies.detail(company.id))}
            >
              <S.CompanyLogo aria-hidden>
                {company.logoUrl ? (
                  <img src={getUploadImageUrl(company.logoUrl)} alt="" />
                ) : (
                  company.name.slice(0, 1)
                )}
              </S.CompanyLogo>
              <S.CompanyText>
                <S.CompanyName>{company.name}</S.CompanyName>
                {(year || company.dissolvedAt) && (
                  <S.CompanyMeta>
                    {year ? `${year}년 설립` : ''}
                    {year && company.dissolvedAt ? ' · ' : ''}
                    {company.dissolvedAt ? '해산' : ''}
                  </S.CompanyMeta>
                )}
              </S.CompanyText>
            </S.CompanyChip>
          )
        })}
      </S.CompanyRow>
    </S.Section>
  )
}
