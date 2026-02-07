import styled from 'styled-components'

export const CountryTypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
`

export const CountryTypeButton = styled.button<{ $active: boolean }>`
  padding: 12px 16px;
  background: ${(props) => (props.$active ? '#8b5cf6' : '#ffffff')};
  border: 2px solid ${(props) => (props.$active ? '#8b5cf6' : '#e2e8f0')};
  border-radius: 10px;
  color: ${(props) => (props.$active ? '#ffffff' : '#64748b')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #8b5cf6;
    background: ${(props) => (props.$active ? '#7c3aed' : '#faf5ff')};
  }
`

export const CountryItemContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`

export const CountryFlag = styled.span`
  font-size: 20px;
  flex-shrink: 0;
`

export const CountryName = styled.span`
  font-weight: 600;
`

export const CountryPeriod = styled.span`
  font-size: 12px;
  color: #94a3b8;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
`

// 👑 왕/군주 섹션 스타일
export const MonarchSection = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  position: relative;
  overflow: hidden;

  &::before {
    content: '👑';
    position: absolute;
    top: -10px;
    right: -10px;
    font-size: 120px;
    opacity: 0.1;
    transform: rotate(15deg);
  }
`

export const MonarchSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
`

export const MonarchIcon = styled.div`
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
`

export const MonarchTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #92400e;
`

export const MonarchHint = styled.div`
  font-size: 13px;
  color: #78350f;
  background: rgba(255, 255, 255, 0.6);
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
`

export const MonarchFieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  z-index: 1;
`

export const MonarchField = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #fbbf24;
`

export const MonarchFieldLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const MonarchFieldBadge = styled.span`
  font-size: 11px;
  background: #fbbf24;
  color: #78350f;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
`
