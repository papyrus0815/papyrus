import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useMilitaryUnits,
  useDeleteMilitaryUnit,
} from '@/features/military-unit/use-military-units.hook'
import type { MilitaryUnit } from '@/shared/api/military-unit'
import { MilitaryUnitForm } from './components/MilitaryUnitForm'

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
  DETACHMENT: '분견대',
  OTHER: '기타',
}

export const MilitaryUnitPage = () => {
  const { data: militaryUnits = [], isLoading } = useMilitaryUnits()
  const deleteMilitaryUnit = useDeleteMilitaryUnit()
  const [selectedUnit, setSelectedUnit] = useState<MilitaryUnit | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleCreate = () => {
    setSelectedUnit(null)
    setIsFormOpen(true)
  }

  const handleEdit = (unit: MilitaryUnit) => {
    setSelectedUnit(unit)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('정말 이 군부대를 삭제하시겠습니까?')) {
      try {
        await deleteMilitaryUnit.mutateAsync(id)
      } catch (error) {
        console.error('Failed to delete military unit:', error)
        alert('군부대 삭제에 실패했습니다.')
      }
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setSelectedUnit(null)
  }

  if (isLoading) {
    return (
      <Container>
        <LoadingText>Loading...</LoadingText>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <HeaderContent>
          <TitleSection>
            <Title>군부대 관리</Title>
            <Subtitle>{militaryUnits.length}개의 군부대</Subtitle>
          </TitleSection>
          <CreateButton onClick={handleCreate}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 군부대 추가
          </CreateButton>
        </HeaderContent>
      </Header>

      <Content>
        <UnitGrid>
          <AnimatePresence>
            {Array.isArray(militaryUnits) &&
              militaryUnits.map((unit) => (
                <UnitCard
                  key={unit.id}
                  as={motion.div}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -4 }}
                >
                  <CardHeader>
                    <UnitImagePlaceholder $active={unit.isActive ?? false}>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </UnitImagePlaceholder>
                    <CardBadge $active={unit.isActive ?? false}>
                      {unit.isActive ? '활성' : '해체'}
                    </CardBadge>
                  </CardHeader>

                  <UnitInfo>
                    <UnitName>{unit.name}</UnitName>
                    {unit.description && (
                      <UnitDescription>{unit.description}</UnitDescription>
                    )}
                    <UnitMeta>
                      {unit.unitType && (
                        <MetaItem>
                          <MetaIcon>🎖️</MetaIcon>
                          <MetaText>
                            {UNIT_TYPE_LABELS[unit.unitType] || unit.unitType}
                          </MetaText>
                        </MetaItem>
                      )}
                      {unit.country && (
                        <MetaItem>
                          <MetaIcon>
                            {unit.country.flagEmoji || '🌍'}
                          </MetaIcon>
                          <MetaText>{unit.country.name}</MetaText>
                        </MetaItem>
                      )}
                      {unit.parentUnit && (
                        <MetaItem>
                          <MetaIcon>⬆️</MetaIcon>
                          <MetaText>상위: {unit.parentUnit.name}</MetaText>
                        </MetaItem>
                      )}
                      {unit.subUnits && unit.subUnits.length > 0 && (
                        <MetaItem>
                          <MetaIcon>⬇️</MetaIcon>
                          <MetaText>하위 부대: {unit.subUnits.length}개</MetaText>
                        </MetaItem>
                      )}
                      {unit.commanders && unit.commanders.length > 0 && (
                        <MetaItem>
                          <MetaIcon>👤</MetaIcon>
                          <MetaText>
                            {unit.commanders[0].person
                              ? `${unit.commanders[0].person.surname || ''} ${unit.commanders[0].person.name}`
                              : '지휘관'}
                            {unit.commanders[0].rank && ` (${unit.commanders[0].rank})`}
                          </MetaText>
                        </MetaItem>
                      )}
                      {unit.establishedDate && (
                        <MetaItem>
                          <MetaIcon>📅</MetaIcon>
                          <MetaText>
                            {new Date(unit.establishedDate).toLocaleDateString(
                              'ko-KR',
                              {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              },
                            )}
                            {' 창설'}
                          </MetaText>
                        </MetaItem>
                      )}
                    </UnitMeta>
                  </UnitInfo>

                  <UnitActions>
                    <ActionButton onClick={() => handleEdit(unit)}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      수정
                    </ActionButton>
                    <DeleteButton onClick={() => handleDelete(unit.id)}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      삭제
                    </DeleteButton>
                  </UnitActions>
                </UnitCard>
              ))}
          </AnimatePresence>

          {!militaryUnits ||
          !Array.isArray(militaryUnits) ||
          militaryUnits.length === 0 ? (
            <EmptyState>
              <EmptyIcon>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </EmptyIcon>
              <EmptyTitle>등록된 군부대가 없습니다</EmptyTitle>
              <EmptyDescription>새 군부대를 추가하여 시작하세요</EmptyDescription>
            </EmptyState>
          ) : null}
        </UnitGrid>
      </Content>

      <AnimatePresence>
        {isFormOpen && (
          <MilitaryUnitForm unit={selectedUnit} onClose={handleCloseForm} />
        )}
      </AnimatePresence>
    </Container>
  )
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(to bottom, #f8fafc, #ffffff);
`

const Header = styled.header`
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
`

const TitleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
`

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  svg {
    flex-shrink: 0;
  }
`

const Content = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const UnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const UnitCard = styled.div`
  background: white;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }
`

const CardHeader = styled.div`
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`

const UnitImagePlaceholder = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: ${(props) => (props.$active ? 1 : 0.5)};

  svg {
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
  }
`

const CardBadge = styled.div<{ $active: boolean }>`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  background: ${(props) =>
    props.$active
      ? 'rgba(34, 197, 94, 0.9)'
      : 'rgba(100, 116, 139, 0.9)'};
  color: white;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(8px);
`

const UnitInfo = styled.div`
  padding: 24px;
`

const UnitName = styled.h3`
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const UnitDescription = styled.p`
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const UnitMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
`

const MetaIcon = styled.span`
  font-size: 16px;
`

const MetaText = styled.span`
  font-weight: 500;
`

const UnitActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
`

const ActionButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: white;
  color: #667eea;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #667eea;
    transform: translateY(-1px);
  }
`

const DeleteButton = styled(ActionButton)`
  color: #dc2626;

  &:hover {
    border-color: #dc2626;
    background: #fef2f2;
  }
`

const EmptyState = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  background: white;
  border-radius: 20px;
  border: 2px dashed #e2e8f0;
`

const EmptyIcon = styled.div`
  margin-bottom: 24px;
  color: #cbd5e1;
`

const EmptyTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #475569;
`

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 15px;
  color: #94a3b8;
`

const LoadingText = styled.div`
  padding: 48px;
  text-align: center;
  font-size: 18px;
  color: #64748b;
`

