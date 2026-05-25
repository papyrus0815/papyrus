import styled from 'styled-components'

// 연혁 관리
export const ContentLayout = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

export const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.03));
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 12px;
`

export const HistoryCount = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const CountText = styled.span`
  font-size: 18px;
  font-weight: 800;
  color: #6366f1;
`

export const HistoryFormCard = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(139, 92, 246, 0.02));
  border: 2px solid rgba(99, 102, 241, 0.2);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
`

export const HistoryFormHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
  border-bottom: 2px solid rgba(226, 232, 240, 1);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
`

export const HistoryFormBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`

export const HistoryFormActions = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 20px;
  border-top: 2px solid rgba(226, 232, 240, 1);
`

export const HistoryTimeline = styled.div`
  position: relative;
  padding-left: 40px;

  &::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 10px;
    bottom: 10px;
    width: 3px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    opacity: 0.3;
  }

  @media (max-width: 768px) {
    padding-left: 30px;

    &::before {
      left: 14px;
    }
  }
`

export const TimelineItem = styled.div`
  position: relative;
  padding-bottom: 32px;

  &:last-child {
    padding-bottom: 0;
  }
`

export const TimelineDot = styled.div<{ $color: string }>`
  position: absolute;
  left: -32px;
  top: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color};
  border: 4px solid #ffffff;
  border-radius: 50%;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1;

  @media (max-width: 768px) {
    left: -27px;
    width: 32px;
    height: 32px;
    font-size: 14px;
    border-width: 3px;
  }
`

export const TimelineContent = styled.div`
  background: #ffffff;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 14px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: rgba(99, 102, 241, 0.3);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
    transform: translateX(4px);
  }
`

export const TimelineHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`

export const TimelineDate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #6366f1;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.2);

  &::before {
    content: '📅';
    font-size: 14px;
  }
`

export const TimelineType = styled.div<{ $color: string }>`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}40`};
  border-radius: 8px;
`

export const TimelineTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.3px;
`

export const TimelineDescription = styled.p`
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  line-height: 1.7;
  white-space: pre-wrap;
`

export const TimelineActions = styled.div`
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.8);
`

export const HistoryTypeOption = styled.button<{ $color: string }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: transparent;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 10px;
  text-align: left;

  span:last-child {
    flex: 1;
  }

  &:hover {
    background: ${({ $color }) => `${$color}08`};
    border-color: ${({ $color }) => `${$color}40`};
    transform: translateX(4px);
    box-shadow: 0 4px 12px ${({ $color }) => `${$color}20`};
  }

  &:last-child {
    margin-bottom: 0;
  }
`

export const HistoryTypeIcon = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => `${$color}15`};
  border: 2px solid ${({ $color }) => `${$color}30`};
  color: ${({ $color }) => $color};
  border-radius: 12px;
  font-size: 20px;
  flex-shrink: 0;
`


