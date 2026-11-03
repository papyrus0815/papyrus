import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { companyApi } from '@/shared/api/company'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { CompanyRegisterModal } from '@/widgets/company-form'

import { IconBriefcase } from '../country-detail-dashboard.icons'
import * as S from '../country-detail-dashboard.styles'
import { ChartSkeleton } from './chart-skeleton'
import { SectionEmpty } from './section-empty'
import { SectionHelpPopover } from './section-help-popover'

const DASHBOARD_COMPANY_LIMIT = 8

interface CountryCompaniesSectionProps {
  countryId?: string
  historicalCountryId?: string
  /** 국가 상세 내부 '기업' 탭으로 이동 */
  onOpenTab?: () => void
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
  historicalCountryId,
  onOpenTab,
}: CountryCompaniesSectionProps) {
  const navigate = useNavigate()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['companies', 'all'],
    queryFn: () => companyApi.getAll(),
    staleTime: 60_000,
  })

  const companies = useMemo(() => {
    /* 설립순 — 역사 기록이니 오래된 것이 위다. 연도 미상은 끝으로. */
    return (data ?? [])
      .filter((company) => {
        if (countryId && company.countryId === countryId) return true
        if (
          historicalCountryId &&
          company.historicalCountryId === historicalCountryId
        ) {
          return true
        }
        return false
      })
      .sort((left, right) => {
        const leftYear = year(left.foundedAt)
        const rightYear = year(right.foundedAt)
        if (leftYear && rightYear) return Number(leftYear) - Number(rightYear)
        if (leftYear) return -1
        if (rightYear) return 1
        return left.name.localeCompare(right.name, 'ko-KR')
      })
  }, [data, countryId, historicalCountryId])

  const targetId = countryId ?? historicalCountryId ?? ''
  const handleOpenAll = () => {
    if (onOpenTab) {
      onOpenTab()
      return
    }
    if (targetId) {
      navigate(pathKeys.countryCompanies(targetId))
      return
    }
    navigate(pathKeys.companies.root())
  }

  const registerModal = registerOpen ? (
    <CompanyRegisterModal
      isOpen={registerOpen}
      onClose={() => setRegisterOpen(false)}
      defaultCountryId={countryId}
      defaultHistoricalCountryId={historicalCountryId}
    />
  ) : null

  if (isLoading) {
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconBriefcase />
          </S.SectionTitleIcon>
          <S.SectionTitleText>기업</S.SectionTitleText>
        </S.SectionTitleRow>
        <ChartSkeleton variant="bars" rows={2} />
      </S.Section>
    )
  }

  /* 자료가 없어도 자리는 지킨다 — 감추면 이 국가에 기업 축이 없는 것처럼 읽힌다 */
  if (companies.length === 0) {
    return (
      <S.Section>
        <S.SectionTitleRow>
          <S.SectionTitleIcon>
            <IconBriefcase />
          </S.SectionTitleIcon>
          <S.SectionTitleText>기업</S.SectionTitleText>
          <SectionHelpPopover sectionKey="companies" />
          <S.SectionLink type="button" onClick={handleOpenAll}>
            기업 탭 열기
          </S.SectionLink>
        </S.SectionTitleRow>
        <SectionEmpty
          text="이 국가에 등록된 기업이 아직 없습니다. 기업을 등록하면 설립·본사·창업자가 여기 이어 붙습니다."
          hint="본사 소재 기업을 등록하면 산업 분야 분포와 설립 연도순 요약이 생성됩니다"
          actionLabel="기업 등록"
          onAction={() => setRegisterOpen(true)}
        />
        {registerModal}
      </S.Section>
    )
  }

  const visibleCompanies = expanded
    ? companies
    : companies.slice(0, DASHBOARD_COMPANY_LIMIT)
  const hiddenCount = companies.length - visibleCompanies.length
  const activeCount = companies.filter((c) => !c.dissolvedAt).length
  const dissolvedCount = companies.length - activeCount

  return (
    <S.Section $wide>
      <S.SectionTitleRow>
        <S.SectionTitleIcon>
          <IconBriefcase />
        </S.SectionTitleIcon>
        <S.SectionTitleText>기업</S.SectionTitleText>
        <SectionHelpPopover sectionKey="companies" />
        <S.SectionCountChip>{companies.length}개</S.SectionCountChip>
        {dissolvedCount > 0 && (
          <S.SectionCountChip>
            존속 {activeCount} · 해산 {dissolvedCount}
          </S.SectionCountChip>
        )}
        <S.SectionHeaderActions>
          <S.SectionAction
            type="button"
            onClick={() => setRegisterOpen(true)}
          >
            + 기업 등록
          </S.SectionAction>
          <S.SectionLink type="button" onClick={handleOpenAll}>
            기업 탭 열기
          </S.SectionLink>
        </S.SectionHeaderActions>
      </S.SectionTitleRow>

      <LedgerWrap>
        <List>
          {visibleCompanies.map((company) => {
            const anyCompany = company as unknown as Record<string, any>
            const founded = year(company.foundedAt)
            const dissolved = year(company.dissolvedAt)
            const ticker =
              typeof anyCompany.ticker === 'string' && anyCompany.ticker.trim()
                ? anyCompany.ticker.trim()
                : null
            const industry =
              typeof anyCompany.industry === 'string' && anyCompany.industry.trim()
                ? anyCompany.industry.trim()
                : typeof anyCompany.sector === 'string' && anyCompany.sector.trim()
                  ? anyCompany.sector.trim()
                  : null
            /* 있는 사실만 잇는다 — 빈 칸을 만들면 '모른다'가 지면의 절반이 된다 */
            const facts = [
              company.shortName && company.shortName !== company.name
                ? company.shortName
                : null,
              industry,
              founded && (dissolved ? `${founded}–${dissolved}` : `${founded}년 설립`),
              company.headquartersCity?.name,
              company.founder?.name && `창업 ${company.founder.name}`,
            ].filter(Boolean) as string[]

            return (
              <Item key={company.id}>
                <Row
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
                      {ticker && <TickerBadge>{ticker}</TickerBadge>}
                      {dissolved && <Dissolved>해산</Dissolved>}
                    </NameRow>
                    {facts.length > 0 && (
                      <Facts>
                        {facts.map((fact, index) => (
                          <Fact key={`${fact}-${index}`}>
                            {index > 0 && <Sep aria-hidden>·</Sep>}
                            {fact}
                          </Fact>
                        ))}
                      </Facts>
                    )}
                  </Body>
                  <Chevron aria-hidden>›</Chevron>
                </Row>
              </Item>
            )
          })}
        </List>
        {(hiddenCount > 0 ||
          (expanded && companies.length > DASHBOARD_COMPANY_LIMIT)) && (
          <MoreRow>
            <MoreBtn
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? '기업 목록 접기' : `기업 더보기 (+${hiddenCount}개)`}
            </MoreBtn>
          </MoreRow>
        )}
      </LedgerWrap>
      {registerModal}
    </S.Section>
  )
}

/*
 * 무컨테이너 2열 헤어라인 원장 — 외곽 박스 카드를 걷고 위·아래 실선과 열 구분선으로 정돈.
 */
const LedgerWrap = styled.div`
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid ${({ theme }) => theme.colors.border.medium};

  @container (min-width: 740px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Item = styled.li`
  min-width: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  @container (min-width: 740px) {
    &:nth-child(odd) {
      border-right: 1px solid ${({ theme }) => theme.colors.border.light};
      padding-right: 14px;
    }
    &:nth-child(even) {
      padding-left: 14px;
    }
  }
`

const Row = styled.button`
  appearance: none;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.14s ease;

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
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  font-size: 14px;
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

const TickerBadge = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'};
`

const Dissolved = styled.span`
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
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
  color: ${({ theme }) => theme.colors.text.secondary};
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

const MoreRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
`

const MoreBtn = styled.button`
  appearance: none;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.hover};
  }
`
