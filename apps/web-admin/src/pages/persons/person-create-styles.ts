import styled from 'styled-components'

export const CountryTypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
`

export const CountryTypeButton = styled.button<{ $active: boolean }>`
  padding: 12px 16px;
  background: ${props => props.$active ? '#8b5cf6' : '#ffffff'};
  border: 2px solid ${props => props.$active ? '#8b5cf6' : '#e2e8f0'};
  border-radius: 10px;
  color: ${props => props.$active ? '#ffffff' : '#64748b'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #8b5cf6;
    background: ${props => props.$active ? '#7c3aed' : '#faf5ff'};
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
