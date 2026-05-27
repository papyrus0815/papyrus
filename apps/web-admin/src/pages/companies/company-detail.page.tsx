import React, { useEffect, useState } from 'react'

import { FiArrowLeft, FiEdit2, FiExternalLink } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyDetail, CompanyStatus, FacilityType } from '@/shared/api/company'
import { companyApi } from '@/shared/api/company'

const STATUS_LABEL: Record<CompanyStatus, string> = {
  ACTIVE: '활동 중',
  DISSOLVED: '해산',
  MERGED: '합병',
  SUSPENDED: '중단',
  OTHER: '기타',
}

const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  HEADQUARTERS: '본사',
  FACTORY: '공장',
  RND: '연구소',
  OFFICE: '사무소',
  OTHER: '기타',
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : null)

const Page = styled.div`
  padding: 1.5rem 2rem;
  max-width: 820px;
  margin: 0 auto;
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: #64748b;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
  }
`

const EditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  background: #6366f1;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 1.5rem;
`

const Logo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const NameWrap = styled.div`
  min-width: 0;
`

const Name = styled.h1`
  font-size: 1.5rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`

const SubName = styled.div`
  font-size: 0.875rem;
  margin-top: 2px;
  color: #94a3b8;
`

const StatusChip = styled.span<{ $status: CompanyStatus | null }>`
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 999px;
  ${({ $status }) =>
    $status === 'ACTIVE'
      ? css`
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        `
      : css`
          background: rgba(148, 163, 184, 0.2);
          color: #64748b;
        `}
`

const Section = styled.section`
  margin-bottom: 1.75rem;
`

const SectionTitle = styled.h2`
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.75rem;
  color: #94a3b8;
`

const Card = styled.div`
  border-radius: 12px;
  padding: 1rem 1.25rem;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        `
      : css`
          background: white;
          border: 1px solid #e5e7eb;
        `}
`

const InfoGrid = styled.dl`
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.6rem 1rem;
  margin: 0;

  dt {
    font-size: 0.8125rem;
    color: #94a3b8;
  }
  dd {
    margin: 0;
    font-size: 0.875rem;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
    a {
      color: #6366f1;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
`

const Description = styled.p`
  font-size: 0.9rem;
  line-height: 1.65;
  margin: 0;
  white-space: pre-wrap;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#334155')};
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`

const Chip = styled.span`
  font-size: 0.8125rem;
  padding: 4px 12px;
  border-radius: 999px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(99, 102, 241, 0.15);
          color: #c7d2fe;
        `
      : css`
          background: #eef2ff;
          color: #4338ca;
        `}
`

const Timeline = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`

const TimelineItem = styled.li`
  display: flex;
  gap: 0.85rem;

  .date {
    flex-shrink: 0;
    width: 92px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #6366f1;
    padding-top: 1px;
  }
  .body {
    min-width: 0;
  }
  .title {
    font-size: 0.9rem;
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
  .content {
    font-size: 0.85rem;
    margin-top: 2px;
    line-height: 1.55;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#cbd5e1' : '#475569')};
  }
`

const FacilityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const FacilityRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.875rem;

  .type {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 6px;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};
    color: #64748b;
  }
  .fname {
    font-weight: 600;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
  .meta {
    color: #94a3b8;
    font-size: 0.8125rem;
  }
`

const Muted = styled.p`
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
`

const LoadingText = styled.p`
  font-size: 14px;
  color: #64748b;
`

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    companyApi
      .getById(id)
      .then((c) => {
        if (c) setCompany(c)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <Page>
        <LoadingText>불러오는 중...</LoadingText>
      </Page>
    )

  if (notFound || !company)
    return (
      <Page>
        <BackBtn onClick={() => navigate('/companies')}>
          <FiArrowLeft size={16} /> 목록으로
        </BackBtn>
        <Muted style={{ marginTop: '1.5rem' }}>기업을 찾을 수 없습니다.</Muted>
      </Page>
    )

  const c = company
  const countryName = c.country?.name ?? c.historicalCountry?.name ?? null
  // 구버전 API 응답(배열 누락)에도 안전하도록 방어
  const facilities = c.facilities ?? []
  const histories = c.histories ?? []
  const categories = c.categories ?? []

  const info: Array<{ label: string; value: React.ReactNode }> = []
  if (countryName)
    info.push({
      label: c.country ? '소속 국가' : '역사 국가',
      value: countryName,
    })
  if (c.founder) info.push({ label: '창립자', value: c.founder.name })
  if (c.headquartersCity)
    info.push({ label: '본사 도시', value: c.headquartersCity.name })
  if (c.organization)
    info.push({ label: '연결 조직', value: c.organization.name })
  if (c.foundedAt) info.push({ label: '설립일', value: fmtDate(c.foundedAt) })
  if (c.dissolvedAt)
    info.push({ label: '해산일', value: fmtDate(c.dissolvedAt) })
  if (c.websiteUrl)
    info.push({
      label: '웹사이트',
      value: (
        <a href={c.websiteUrl} target="_blank" rel="noreferrer">
          {c.websiteUrl} <FiExternalLink size={13} />
        </a>
      ),
    })

  return (
    <Page>
      <TopBar>
        <BackBtn onClick={() => navigate('/companies')}>
          <FiArrowLeft size={16} /> 목록으로
        </BackBtn>
        <EditBtn onClick={() => navigate(`/companies/${c.id}/edit`)}>
          <FiEdit2 size={15} /> 수정
        </EditBtn>
      </TopBar>

      <Header>
        <Logo>{c.logoUrl ? <img src={c.logoUrl} alt="" /> : '🏢'}</Logo>
        <NameWrap>
          <Name>
            {c.name}
            {c.status && (
              <StatusChip $status={c.status}>{STATUS_LABEL[c.status]}</StatusChip>
            )}
          </Name>
          <SubName>
            {[c.shortName, c.localName].filter(Boolean).join(' · ') || '—'}
          </SubName>
        </NameWrap>
      </Header>

      <Section>
        <SectionTitle>기본 정보</SectionTitle>
        <Card>
          {info.length > 0 ? (
            <InfoGrid>
              {info.map((row) => (
                <React.Fragment key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </React.Fragment>
              ))}
            </InfoGrid>
          ) : (
            <Muted>등록된 기본 정보가 없습니다.</Muted>
          )}
        </Card>
      </Section>

      {c.description && (
        <Section>
          <SectionTitle>설명</SectionTitle>
          <Card>
            <Description>{c.description}</Description>
          </Card>
        </Section>
      )}

      {categories.length > 0 && (
        <Section>
          <SectionTitle>분류</SectionTitle>
          <Chips>
            {categories.map((cat) => (
              <Chip key={cat.id}>{cat.categoryName}</Chip>
            ))}
          </Chips>
        </Section>
      )}

      <Section>
        <SectionTitle>연혁 ({histories.length})</SectionTitle>
        <Card>
          {histories.length > 0 ? (
            <Timeline>
              {histories.map((h) => (
                <TimelineItem key={h.id}>
                  <span className="date">{fmtDate(h.occurredAt) ?? '—'}</span>
                  <div className="body">
                    <div className="title">{h.title}</div>
                    {h.content && <div className="content">{h.content}</div>}
                  </div>
                </TimelineItem>
              ))}
            </Timeline>
          ) : (
            <Muted>등록된 연혁이 없습니다.</Muted>
          )}
        </Card>
      </Section>

      <Section>
        <SectionTitle>시설 ({facilities.length})</SectionTitle>
        <Card>
          {facilities.length > 0 ? (
            <FacilityList>
              {facilities.map((f) => {
                const period = [fmtDate(f.openedAt), fmtDate(f.closedAt)]
                if (!period[0] && !period[1]) period.length = 0
                return (
                  <FacilityRow key={f.id}>
                    {f.facilityType && (
                      <span className="type">
                        {FACILITY_TYPE_LABEL[f.facilityType]}
                      </span>
                    )}
                    <span className="fname">{f.name ?? '(이름 없음)'}</span>
                    <span className="meta">
                      {[
                        f.city?.name,
                        period.length
                          ? `${period[0] ?? ''}${period[1] ? ` ~ ${period[1]}` : ''}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </FacilityRow>
                )
              })}
            </FacilityList>
          ) : (
            <Muted>등록된 시설이 없습니다.</Muted>
          )}
        </Card>
      </Section>
    </Page>
  )
}
