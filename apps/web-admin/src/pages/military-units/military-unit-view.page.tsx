/**
 * 군부대 상세 페이지
 */

import React, { useEffect, useState } from 'react'
import { FiArrowLeft, FiEdit2, FiShield, FiTrash2 } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import type { MilitaryUnit } from '@/shared/api/military-unit'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

const UNIT_TYPE_LABELS: Record<string, string> = {
  FIELD_ARMY: '야전군',
  CORPS: '군단',
  DIVISION: '사단',
  BRIGADE: '여단',
  REGIMENT: '연대',
  BATTALION: '대대',
  COMPANY: '중대',
  PLATOON: '소대',
  SQUAD: '분대',
  FLEET: '함대',
  SQUADRON: '전대',
  WING: '비행단',
  SPECIAL_FORCES: '특수부대',
  DETACHMENT: '파견대',
  OTHER: '기타',
}

export const MilitaryUnitViewPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const playClickSound = useClickSound()

  const [unit, setUnit] = useState<MilitaryUnit | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadUnit(id)
    }
  }, [id])

  const loadUnit = async (unitId: string) => {
    try {
      setLoading(true)
      const data = await militaryUnitApi.getById(unitId)
      setUnit(data)
    } catch (error) {
      alert('군부대 정보를 불러오는데 실패했습니다.')
      navigate('/military-units')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!unit || !confirm(`'${unit.name}' 군부대를 삭제하시겠습니까?`)) {
      return
    }

    try {
      await militaryUnitApi.delete(unit.id)
      alert('군부대가 삭제되었습니다.')
      navigate('/military-units')
    } catch (error) {
      alert('군부대 삭제에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <LoadingMessage>로딩 중...</LoadingMessage>
      </PageWrapper>
    )
  }

  if (!unit) {
    return (
      <PageWrapper>
        <EmptyMessage>군부대 정보를 찾을 수 없습니다.</EmptyMessage>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <PageHeader>
        <BackButton
          onClick={() => {
            playClickSound()
            navigate('/military-units')
          }}
        >
          <FiArrowLeft size={20} />
          목록으로
        </BackButton>
        <HeaderActions>
          <EditButton
            onClick={() => {
              playClickSound()
              navigate(`/military-units/edit/${unit.id}`)
            }}
          >
            <FiEdit2 size={18} />
            수정
          </EditButton>
          <DeleteButton
            onClick={() => {
              playClickSound()
              handleDelete()
            }}
          >
            <FiTrash2 size={18} />
            삭제
          </DeleteButton>
        </HeaderActions>
      </PageHeader>

      <ContentWrapper>
        <MainSection>
          <UnitHeader>
            <UnitIcon>
              <FiShield size={48} />
            </UnitIcon>
            <UnitTitleArea>
              <UnitTitle>{unit.name}</UnitTitle>
              {unit.country && (
                <UnitSubtitle>
                  {unit.country.flagEmoji} {unit.country.name}
                </UnitSubtitle>
              )}
              {!unit.isActive && <InactiveBadge>해산됨</InactiveBadge>}
            </UnitTitleArea>
          </UnitHeader>

          {unit.thumbnail && (
            <ThumbnailSection>
              <ThumbnailImage src={unit.thumbnail} alt={unit.name} />
            </ThumbnailSection>
          )}

          <InfoSection>
            <SectionTitle>기본 정보</SectionTitle>
            <InfoGrid>
              {unit.unitType && (
                <InfoItem>
                  <InfoLabel>부대 유형</InfoLabel>
                  <InfoValue>{UNIT_TYPE_LABELS[unit.unitType] || unit.unitType}</InfoValue>
                </InfoItem>
              )}
              {unit.establishedDate && (
                <InfoItem>
                  <InfoLabel>창설일</InfoLabel>
                  <InfoValue>{unit.establishedDate}</InfoValue>
                </InfoItem>
              )}
              {unit.disbandedDate && (
                <InfoItem>
                  <InfoLabel>해산일</InfoLabel>
                  <InfoValue>{unit.disbandedDate}</InfoValue>
                </InfoItem>
              )}
              <InfoItem>
                <InfoLabel>상태</InfoLabel>
                <InfoValue>
                  <StatusBadge $active={unit.isActive}>
                    {unit.isActive ? '활동 중' : '해산됨'}
                  </StatusBadge>
                </InfoValue>
              </InfoItem>
            </InfoGrid>
          </InfoSection>

          {unit.description && (
            <InfoSection>
              <SectionTitle>부대 설명</SectionTitle>
              <Description>{unit.description}</Description>
            </InfoSection>
          )}
        </MainSection>
      </ContentWrapper>
    </PageWrapper>
  )
}

const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f8fafc;
  padding: calc(var(--header-height, 64px) + 24px) 24px 24px;
`

const PageHeader = styled.div`
  max-width: 900px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #6366f1;
  background: #ffffff;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.05);
    border-color: #6366f1;
  }
`

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`

const EditButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);

  &:hover {
    background: linear-gradient(135deg, #4f46e5, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1.5px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: #ef4444;
  }
`

const ContentWrapper = styled.div`
  max-width: 900px;
  margin: 0 auto;
`

const MainSection = styled.div`
  background: #ffffff;
  border: 1.5px solid rgba(226, 232, 240, 1);
  border-radius: 16px;
  padding: 32px;
`

const UnitHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid rgba(226, 232, 240, 0.8);
`

const UnitIcon = styled.div`
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.05));
  border-radius: 16px;
  color: #6366f1;
`

const UnitTitleArea = styled.div`
  flex: 1;
  min-width: 0;
`

const UnitTitle = styled.h1`
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
`

const UnitSubtitle = styled.div`
  font-size: 16px;
  color: #64748b;
  margin-bottom: 8px;
`

const InactiveBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: rgba(148, 163, 184, 0.1);
  border-radius: 6px;
`

const ThumbnailSection = styled.div`
  margin-bottom: 32px;
  border-radius: 12px;
  overflow: hidden;
  border: 1.5px solid rgba(226, 232, 240, 1);
`

const ThumbnailImage = styled.img`
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  display: block;
`

const InfoSection = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(99, 102, 241, 0.1);
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const InfoLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const InfoValue = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
`

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? '#10b981' : '#64748b')};
  background: ${({ $active }) => ($active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)')};
  border-radius: 6px;
`

const Description = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap;
`

const LoadingMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #64748b;
`

const EmptyMessage = styled.div`
  text-align: center;
  padding: 60px 20px;
  font-size: 16px;
  color: #64748b;
`

