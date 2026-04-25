/**
 * 가문 상세 — Hero + 통치 국가 + 구성원 섹션
 */
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import {
  FiArrowLeft,
  FiAward,
  FiEdit2,
  FiMapPin,
  FiUser,
  FiUsers,
} from 'react-icons/fi'

import {
  type DynastyDetail,
  useDynastyDetail,
} from '@/shared/api/dynasty'
import { getUploadImageUrl } from '@/shared/api/upload'

import { DynastyForm } from './components/dynasty-form'

export const DynastyDetailPage = () => {
  const { dynastyId } = useParams<{ dynastyId: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useDynastyDetail(dynastyId)
  const [isFormOpen, setIsFormOpen] = useState(false)

  if (isLoading) {
    return (
      <Container>
        <CenterMessage>가문을 불러오는 중…</CenterMessage>
      </Container>
    )
  }
  if (isError || !data) {
    return (
      <Container>
        <CenterMessage>
          가문 정보를 찾을 수 없습니다.
          <BackLink to="/history/dynasties">목록으로 돌아가기</BackLink>
        </CenterMessage>
      </Container>
    )
  }

  const lifespan = formatYearRange(data.startDate, data.endDate)
  const founderLabel = renderFounderLabel(data)

  return (
    <Container>
      <BackBar>
        <BackBtn type="button" onClick={() => navigate('/history/dynasties')}>
          <FiArrowLeft size={16} />
          가문 목록
        </BackBtn>
      </BackBar>

      <Hero>
        <HeroLeft>
          {data.thumbnailUrl ? (
            <HeroThumb>
              <img src={getUploadImageUrl(data.thumbnailUrl)} alt={data.name} />
            </HeroThumb>
          ) : (
            <HeroThumbPlaceholder>{firstGlyph(data.name)}</HeroThumbPlaceholder>
          )}
          {data.crestImageUrl && (
            <CrestWrap title="가문 상징">
              <img src={getUploadImageUrl(data.crestImageUrl)} alt="가문 상징" />
            </CrestWrap>
          )}
        </HeroLeft>
        <HeroRight>
          <HeroTitleRow>
            <HeroName>{data.name}</HeroName>
            <EditBtn type="button" onClick={() => setIsFormOpen(true)}>
              <FiEdit2 size={14} />
              수정
            </EditBtn>
          </HeroTitleRow>
          {lifespan && <HeroLifespan>{lifespan}</HeroLifespan>}
          <HeroMetaGrid>
            {data.originPlace && (
              <HeroMetaItem>
                <FiMapPin size={13} aria-hidden />
                <HeroMetaLabel>본관</HeroMetaLabel>
                <HeroMetaValue>{data.originPlace}</HeroMetaValue>
              </HeroMetaItem>
            )}
            {founderLabel && (
              <HeroMetaItem>
                <FiUser size={13} aria-hidden />
                <HeroMetaLabel>시조</HeroMetaLabel>
                <HeroMetaValue>{founderLabel}</HeroMetaValue>
              </HeroMetaItem>
            )}
            {data.motto && (
              <HeroMetaItem>
                <FiAward size={13} aria-hidden />
                <HeroMetaLabel>가훈</HeroMetaLabel>
                <HeroMetaValue>{data.motto}</HeroMetaValue>
              </HeroMetaItem>
            )}
            <HeroMetaItem>
              <FiUsers size={13} aria-hidden />
              <HeroMetaLabel>구성원</HeroMetaLabel>
              <HeroMetaValue>{data.memberCount}명</HeroMetaValue>
            </HeroMetaItem>
          </HeroMetaGrid>
          {data.description && <HeroDescription>{data.description}</HeroDescription>}
        </HeroRight>
      </Hero>

      <SectionGrid>
        <Section>
          <SectionTitle>통치 국가</SectionTitle>
          {data.historicalRules.length === 0 && data.modernRules.length === 0 ? (
            <SectionEmpty>등록된 통치 이력이 없습니다.</SectionEmpty>
          ) : (
            <RuleList>
              {data.historicalRules.map((r) => (
                <RuleItem key={r.id}>
                  <RuleCountry>
                    <Link to={`/history/historical-countries/${r.historicalCountryId}`}>
                      {r.historicalCountryName}
                    </Link>
                  </RuleCountry>
                  <RulePeriod>
                    {formatRulePeriod(r.startEra, r.startYear, r.endEra, r.endYear)}
                  </RulePeriod>
                  {r.endReason && <RuleReason>{r.endReason}</RuleReason>}
                </RuleItem>
              ))}
              {data.modernRules.map((r) => (
                <RuleItem key={r.id}>
                  <RuleCountry>
                    <Link to={`/history/country/${r.countryId}`}>
                      {r.countryName}
                    </Link>
                    <ModernBadge>현대</ModernBadge>
                  </RuleCountry>
                  <RulePeriod>
                    {formatRulePeriod(r.startEra, r.startYear, r.endEra, r.endYear)}
                  </RulePeriod>
                  {r.endReason && <RuleReason>{r.endReason}</RuleReason>}
                </RuleItem>
              ))}
            </RuleList>
          )}
        </Section>

        <Section>
          <SectionTitle>
            구성원 <SectionCount>{data.memberCount}</SectionCount>
          </SectionTitle>
          {data.members.length === 0 ? (
            <SectionEmpty>등록된 구성원이 없습니다.</SectionEmpty>
          ) : (
            <MemberGrid>
              {data.members.map((m) => (
                <MemberCard key={m.id} to={`/persons/${m.id}`}>
                  <MemberAvatar>
                    {m.profileImageUrl ? (
                      <img src={getUploadImageUrl(m.profileImageUrl)} alt="" />
                    ) : (
                      <FiUser size={18} />
                    )}
                  </MemberAvatar>
                  <MemberBody>
                    <MemberName>
                      {[m.surname, m.name].filter(Boolean).join(' ')}
                    </MemberName>
                    <MemberLifespan>
                      {formatLifespanShort(m.birthDate, m.deathDate)}
                    </MemberLifespan>
                  </MemberBody>
                </MemberCard>
              ))}
            </MemberGrid>
          )}
        </Section>
      </SectionGrid>

      {isFormOpen && (
        <DynastyForm
          dynasty={{
            id: data.id,
            name: data.name,
            description: data.description,
            startDate: data.startDate,
            endDate: data.endDate,
            thumbnailUrl: data.thumbnailUrl,
          } as never}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </Container>
  )
}

function firstGlyph(name: string): string {
  return name.trim().slice(0, 1) || '·'
}

function renderFounderLabel(d: DynastyDetail): string {
  if (d.founder) {
    return [d.founder.surname, d.founder.name].filter(Boolean).join(' ')
  }
  return d.founderText ?? ''
}

function formatYear(era: string | null, year: number | null): string {
  if (year == null) return '?'
  return era === 'BC' ? `BC ${year}` : `${year}`
}

function formatYearRange(start: string | null, end: string | null): string {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).getFullYear().toString() : null
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return `${s} – ${e}`
  if (s) return `${s} – 현재`
  if (e) return `? – ${e}`
  return ''
}

function formatRulePeriod(
  startEra: string | null,
  startYear: number | null,
  endEra: string | null,
  endYear: number | null,
): string {
  const s = startYear != null ? formatYear(startEra, startYear) : null
  const e = endYear != null ? formatYear(endEra, endYear) : null
  if (s && e) return `${s} – ${e}`
  if (s) return `${s} – 현재`
  if (e) return `? – ${e}`
  return '시기 미상'
}

function formatLifespanShort(start: string | null, end: string | null): string {
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).getFullYear().toString() : null
  const s = fmt(start)
  const e = fmt(end)
  if (s && e) return `${s}–${e}`
  if (s) return `${s}–`
  if (e) return `–${e}`
  return ''
}

const Container = styled.div`
  min-height: 100vh;
  padding: 24px 32px 64px;
  max-width: 1200px;
  margin: 0 auto;
`

const CenterMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const BackLink = styled(Link)`
  font-size: 13px;
  color: #6366f1;
`

const BackBar = styled.div`
  margin-bottom: 16px;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
  }
`

const Hero = styled.section`
  display: flex;
  gap: 28px;
  padding: 28px;
  border-radius: 18px;
  margin-bottom: 28px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        `
      : css`
          background: white;
          border: 1px solid #eef2f7;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        `}
  @media (max-width: 720px) {
    flex-direction: column;
    gap: 20px;
  }
`

const HeroLeft = styled.div`
  position: relative;
  flex-shrink: 0;
`

const HeroThumb = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 16px;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const HeroThumbPlaceholder = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
`

const CrestWrap = styled.div`
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#1c1c20' : '#fff')};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? '#252530' : '#f8fafc'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const HeroRight = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const HeroTitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const HeroName = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  color: ${({ theme }) => theme.colors.text.secondary};
  &:hover {
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const HeroLifespan = styled.div`
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const HeroMetaGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px 18px;
  margin: 4px 0 0;
`

const HeroMetaItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const HeroMetaLabel = styled.dt`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 12px;
`

const HeroMetaValue = styled.dd`
  margin: 0;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`

const HeroDescription = styled.p`
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 24px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Section = styled.section`
  padding: 22px;
  border-radius: 14px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: white;
          border: 1px solid #eef2f7;
        `}
`

const SectionTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #6366f1;
`

const SectionCount = styled.span`
  margin-left: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  letter-spacing: 0;
  text-transform: none;
`

const SectionEmpty = styled.p`
  margin: 0;
  padding: 12px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const RuleList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const RuleItem = styled.li`
  padding: 12px 14px;
  border-radius: 10px;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #fafbfc;
          border: 1px solid #eef2f7;
        `}
`

const RuleCountry = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  a {
    color: inherit;
    text-decoration: none;
    &:hover {
      color: #4f46e5;
    }
  }
`

const ModernBadge = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.25);
`

const RulePeriod = styled.div`
  margin-top: 4px;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RuleReason = styled.div`
  margin-top: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-style: italic;
`

const MemberGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
`

const MemberCard = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  ${({ theme }) =>
    theme.mode === 'dark'
      ? css`
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.07);
        `
      : css`
          background: #fafbfc;
          border: 1px solid #eef2f7;
        `}
  transition: border-color 0.12s ease, transform 0.12s ease;
  &:hover {
    transform: translateY(-1px);
    border-color: rgba(99, 102, 241, 0.4);
  }
`

const MemberAvatar = styled.div`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#eef2f7'};
  color: ${({ theme }) => theme.colors.text.tertiary};
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const MemberBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`

const MemberName = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MemberLifespan = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
