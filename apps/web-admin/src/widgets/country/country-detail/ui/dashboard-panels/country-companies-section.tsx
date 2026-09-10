import { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'

import { IconLandmark } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { SectionEmpty } from './section-empty'

interface CountryCompaniesSectionProps {
  countryId: string
}

/** 창립·해산 연도만 뽑는다 — 카드에 전체 날짜를 넣으면 이름보다 길어진다 */
function year(iso: string | null): string | null {
  if (!iso) return null
  const matched = /^(\d{4})/.exec(iso)
  return matched ? matched[1] : null
}

/**
 * 이 나라의 기업.
 *
 * 서버에 국가별 기업 엔드포인트가 없어 전체를 받아 `countryId`로 거른다 — 실DB 5행이라
 * 지금은 이 편이 왕복 한 번으로 끝난다. 캐시 키는 회사 목록 사이드바와 **같은 키**를 쓴다
 * (같은 응답을 다른 키로 두 번 받는 구멍을 새로 만들지 않기 위해).
 *
 * 표시는 **한 줄에 한 기업**. 칩으로 이름만 늘어놓던 시절엔 "이 나라에 기업이 몇 개"까지만
 * 말하고 그게 어떤 기업인지는 눌러야 나왔다. 다만 실DB를 보면 로고 0/5, 설립일 2/5,
 * 본사 2/5, 티커 2/5로 **필드가 듬성듬성하다** — 없는 칸을 만들지 않고 있는 것만 잇는다.
 *
 * 기업이 없어도 섹션 자리는 지킨다 — 감추면 이 국가에 기업 축이 없는 것처럼 읽힌다.
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
    /* 설립순 — 역사 기록이니 오래된 것이 위다. 연도 미상은 끝으로. */
    return (data ?? [])
      .filter((company) => company.countryId === countryId)
      .sort((left, right) => {
        const leftYear = year(left.foundedAt)
        const rightYear = year(right.foundedAt)
        if (leftYear && rightYear) return Number(leftYear) - Number(rightYear)
        if (leftYear) return -1
        if (rightYear) return 1
        return left.name.localeCompare(right.name, 'ko-KR')
      })
  }, [data, countryId])

  /* 자료가 없어도 자리는 지킨다 — 감추면 이 국가에 기업 축이 없는 것처럼 읽힌다 */
  if (companies.length === 0) {
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon $accent="sky">
            <IconLandmark />
          </S.SectionTitleIcon>
          <S.SectionTitleText>기업</S.SectionTitleText>
        </S.SectionTitleRow>
        <SectionEmpty
          text="이 국가에 등록된 기업이 아직 없습니다. 기업을 등록하고 국가를 지정하면 설립·본사·창업자가 여기 이어 붙습니다."
          actionLabel="기업 등록"
          onAction={() => navigate(pathKeys.companies.root())}
          secondaryLabel="기업 전체 보기"
          onSecondary={() => navigate(pathKeys.companies.root())}
        />
      </S.Section>
    )
  }

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

      <List>
        {companies.map((company) => {
          const founded = year(company.foundedAt)
          const dissolved = year(company.dissolvedAt)
          /* 있는 사실만 잇는다 — 빈 칸을 만들면 '모른다'가 지면의 절반이 된다 */
          const facts = [
            company.shortName,
            founded && (dissolved ? `${founded}–${dissolved}` : `${founded}년 설립`),
            company.headquartersCity?.name,
            company.founder?.name && `창업 ${company.founder.name}`,
          ].filter(Boolean) as string[]

          return (
            <Row
              key={company.id}
              type="button"
              onClick={() => navigate(pathKeys.companies.detail(company.id))}
            >
              <Logo aria-hidden>
                {company.logoUrl ? (
                  <img src={getUploadImageUrl(company.logoUrl)} alt="" />
                ) : (
                  company.name.slice(0, 1)
                )}
              </Logo>
              <Body>
                <NameRow>
                  <Name>{company.name}</Name>
                  {dissolved && <Dissolved>해산</Dissolved>}
                </NameRow>
                {facts.length > 0 && (
                  <Facts>
                    {facts.map((fact, index) => (
                      <Fact key={fact}>
                        {index > 0 && <Sep aria-hidden>·</Sep>}
                        {fact}
                      </Fact>
                    ))}
                  </Facts>
                )}
              </Body>
              <Chevron aria-hidden>›</Chevron>
            </Row>
          )
        })}
      </List>
    </S.Section>
  )
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Row = styled.button`
  appearance: none;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 760px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.active};
    outline-offset: -2px;
  }
`

const Logo = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  overflow: hidden;
  font-size: 16px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const Body = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const NameRow = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const Name = styled.span`
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Dissolved = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const Facts = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0 6px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Fact = styled.span`
  display: inline-flex;
  gap: 6px;
  white-space: nowrap;
`

const Sep = styled.span`
  opacity: 0.5;
`

const Chevron = styled.span`
  font-size: 15px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
