/**
 * 인물 상세 정보 컴포넌트
 * - 심플하고 트렌디한 디자인
 * - Person 스키마의 모든 정보 표시
 */

import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { usePersonDetail } from './use-person-detail.hook'

interface PersonDetailProps {
  personId: string | null
  onClose?: () => void
}

export function PersonDetail({ personId, onClose }: PersonDetailProps) {
  const data = usePersonDetail(personId)

  if (!personId) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>👤</EmptyIcon>
          <EmptyText>인물을 선택해주세요</EmptyText>
        </EmptyState>
      </Container>
    )
  }

  if (!data) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>😕</EmptyIcon>
          <EmptyText>인물 정보를 찾을 수 없습니다</EmptyText>
        </EmptyState>
      </Container>
    )
  }

  const {
    person,
    fullName,
    lifespan,
    birthDate,
    deathDate,
    country,
    dynasty,
    religion,
    job,
    father,
    mother,
    displayImage,
  } = data

  return (
    <Container
      as={motion.div}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Close 버튼 (모바일 전용) */}
      {onClose && (
        <CloseButton onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              fill="currentColor"
            />
          </svg>
        </CloseButton>
      )}

      {/* 프로필 헤더 */}
      <Header>
        {displayImage ? (
          <ProfileImage src={displayImage} alt={fullName} />
        ) : (
          <ProfilePlaceholder>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </ProfilePlaceholder>
        )}
        <ProfileInfo>
          <Name>{fullName}</Name>
          <Lifespan>{lifespan}</Lifespan>
          {country && <CountryBadge>{country.name}</CountryBadge>}
        </ProfileInfo>
      </Header>

      {/* 상세 정보 */}
      <Content>
        {/* 기본 정보 */}
        <Section>
          <SectionTitle>기본 정보</SectionTitle>
          <InfoGrid>
            {person.surname && (
              <InfoItem>
                <InfoLabel>성(姓)</InfoLabel>
                <InfoValue>{person.surname}</InfoValue>
              </InfoItem>
            )}
            <InfoItem>
              <InfoLabel>이름</InfoLabel>
              <InfoValue>{person.name}</InfoValue>
            </InfoItem>
            {person.gender && (
              <InfoItem>
                <InfoLabel>성별</InfoLabel>
                <InfoValue>
                  {person.gender === 'MALE'
                    ? '남성'
                    : person.gender === 'FEMALE'
                      ? '여성'
                      : '기타'}
                </InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </Section>

        {/* 생애 정보 */}
        {(birthDate || deathDate) && (
          <Section>
            <SectionTitle>생애 정보</SectionTitle>
            <InfoGrid>
              {birthDate && (
                <InfoItem>
                  <InfoLabel>출생</InfoLabel>
                  <InfoValue>{birthDate}</InfoValue>
                </InfoItem>
              )}
              {deathDate && (
                <InfoItem>
                  <InfoLabel>사망</InfoLabel>
                  <InfoValue>{deathDate}</InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        )}

        {/* 소속 정보 */}
        {(country || dynasty || religion || job) && (
          <Section>
            <SectionTitle>소속 정보</SectionTitle>
            <InfoGrid>
              {country && (
                <InfoItem>
                  <InfoLabel>국가</InfoLabel>
                  <InfoValue>{country.name}</InfoValue>
                </InfoItem>
              )}
              {dynasty && (
                <InfoItem>
                  <InfoLabel>가문</InfoLabel>
                  <InfoValue>{dynasty.name}</InfoValue>
                </InfoItem>
              )}
              {religion && (
                <InfoItem>
                  <InfoLabel>종교</InfoLabel>
                  <InfoValue>{religion.name}</InfoValue>
                </InfoItem>
              )}
              {job && (
                <InfoItem>
                  <InfoLabel>직업</InfoLabel>
                  <InfoValue>{job.title}</InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        )}

        {/* 가족 관계 */}
        {(father || mother) && (
          <Section>
            <SectionTitle>가족 관계</SectionTitle>
            <InfoGrid>
              {father && (
                <InfoItem>
                  <InfoLabel>부친</InfoLabel>
                  <InfoValue>
                    {father.surname
                      ? `${father.surname} ${father.name}`
                      : father.name}
                  </InfoValue>
                </InfoItem>
              )}
              {mother && (
                <InfoItem>
                  <InfoLabel>모친</InfoLabel>
                  <InfoValue>
                    {mother.surname
                      ? `${mother.surname} ${mother.name}`
                      : mother.name}
                  </InfoValue>
                </InfoItem>
              )}
            </InfoGrid>
          </Section>
        )}

        {/* 약력 */}
        {person.biography && (
          <Section>
            <SectionTitle>약력</SectionTitle>
            <Biography>{person.biography}</Biography>
          </Section>
        )}
      </Content>
    </Container>
  )
}

// ==================== 스타일 컴포넌트 ====================

const Container = styled.div`
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: #e5e7eb;
    color: #111827;
  }

  @media (min-width: 1025px) {
    display: none;
  }
`

const Header = styled.div`
  padding: 32px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%);
`

const ProfileImage = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
`

const ProfilePlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border: 4px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
`

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const Name = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  text-align: center;
  letter-spacing: -0.5px;
`

const Lifespan = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  letter-spacing: 0.3px;
`

const CountryBadge = styled.div`
  padding: 6px 16px;
  background: linear-gradient(135deg, #f3e8ff 0%, #e9d1ff 100%);
  color: #ad46ff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
  border: 1px solid rgba(173, 70, 255, 0.2);
`

const Content = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #ad46ff;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f3e8ff;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
`

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #e5e7eb;
  }
`

const InfoLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  min-width: 80px;
`

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  text-align: right;
  flex: 1;
`

const Biography = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: #374151;
  line-height: 1.7;
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  white-space: pre-wrap;
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 60px 24px;
  text-align: center;
`

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
`

const EmptyText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: #9ca3af;
  margin: 0;
`
