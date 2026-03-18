import React from 'react'
import { motion } from 'framer-motion'
import styled from 'styled-components'
import { type PersonResponseDto as Person } from '@/shared/api/persons'

interface PersonCardProps {
  person: Person
  index: number
  onClick: () => void
  /** 가문명 (dynastyId로 조회한 값, 있으면 표시) */
  dynastyName?: string | null
}

export function PersonCard({ person, index, onClick, dynastyName }: PersonCardProps) {
  const fullName = person.surname
    ? `${person.surname} ${person.name}`
    : person.name

  const birthYear = person.birthYear
  const deathYear = person.deathYear

  const lifespan =
    birthYear && deathYear
      ? `${birthYear} - ${deathYear}`
      : birthYear
        ? `${birthYear} - `
        : '미상'

  const displayImage = person.profileImageUrl

  return (
    <Card onClick={onClick}>
      <ImageWrapper>
        {displayImage ? (
          <Image src={displayImage} alt={fullName} />
        ) : (
          <ImagePlaceholder>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </ImagePlaceholder>
        )}
      </ImageWrapper>

      <Content>
        <Info>
          <Name>{fullName}</Name>
          <Meta>
            <MetaBadge>{lifespan}</MetaBadge>
          </Meta>
          {dynastyName && (
            <DynastyBadge title="가문">가문: {dynastyName}</DynastyBadge>
          )}
        </Info>
      </Content>
    </Card>
  )
}

// Styled Components
const Card = styled.div`
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
`

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
  background: #2d3748;
`

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
`

const Content = styled.div`
  padding: 16px 16px 20px;
  position: relative;
`

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Name = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
`

const MetaBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`

const DynastyBadge = styled.span`
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #7c3aed;
`
