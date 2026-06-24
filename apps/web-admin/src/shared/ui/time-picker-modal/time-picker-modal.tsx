import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { FiClock, FiX, FiCheck } from 'react-icons/fi'
import { glassCardMixin } from '@/shared/styles/mixins'

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (time: string) => void
  initialTime?: string
  title?: string
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialTime = '',
  title = '시간 선택',
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(0)
  const [selectedMinute, setSelectedMinute] = useState<number>(0)

  useEffect(() => {
    if (isOpen && initialTime) {
      const [hour, minute] = initialTime.split(':').map(Number)
      if (!isNaN(hour) && !isNaN(minute)) {
        setSelectedHour(hour)
        setSelectedMinute(minute)
      }
    } else if (isOpen && !initialTime) {
      // 현재 시간으로 초기화
      const now = new Date()
      setSelectedHour(now.getHours())
      setSelectedMinute(now.getMinutes())
    }
  }, [isOpen, initialTime])

  if (!isOpen) return null

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const handleConfirm = () => {
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
    onSelect(timeString)
    onClose()
  }

  const handleClear = () => {
    onSelect('')
    onClose()
  }

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <ClockIcon>
              <FiClock size={20} />
            </ClockIcon>
            <ModalTitle>{title}</ModalTitle>
          </HeaderLeft>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <TimeDisplay>
            <TimeValue>
              {selectedHour.toString().padStart(2, '0')}
            </TimeValue>
            <TimeSeparator>:</TimeSeparator>
            <TimeValue>
              {selectedMinute.toString().padStart(2, '0')}
            </TimeValue>
          </TimeDisplay>

          <PickersContainer>
            <PickerColumn>
              <PickerLabel>시</PickerLabel>
              <ScrollContainer>
                {hours.map((hour) => (
                  <TimeItem
                    key={hour}
                    $selected={hour === selectedHour}
                    onClick={() => setSelectedHour(hour)}
                  >
                    {hour.toString().padStart(2, '0')}
                  </TimeItem>
                ))}
              </ScrollContainer>
            </PickerColumn>

            <PickerColumn>
              <PickerLabel>분</PickerLabel>
              <ScrollContainer>
                {minutes.map((minute) => (
                  <TimeItem
                    key={minute}
                    $selected={minute === selectedMinute}
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </TimeItem>
                ))}
              </ScrollContainer>
            </PickerColumn>
          </PickersContainer>

          <QuickSelectSection>
            <QuickSelectLabel>빠른 선택</QuickSelectLabel>
            <QuickSelectButtons>
              {[
                { label: '00:00', hour: 0, minute: 0 },
                { label: '06:00', hour: 6, minute: 0 },
                { label: '09:00', hour: 9, minute: 0 },
                { label: '12:00', hour: 12, minute: 0 },
                { label: '18:00', hour: 18, minute: 0 },
                { label: '현재', hour: new Date().getHours(), minute: new Date().getMinutes() },
              ].map((preset) => (
                <QuickButton
                  key={preset.label}
                  onClick={() => {
                    setSelectedHour(preset.hour)
                    setSelectedMinute(preset.minute)
                  }}
                >
                  {preset.label}
                </QuickButton>
              ))}
            </QuickSelectButtons>
          </QuickSelectSection>
        </ModalBody>

        <ModalFooter>
          <ClearButton onClick={handleClear}>시간 제거</ClearButton>
          <ButtonGroup>
            <CancelButton onClick={onClose}>취소</CancelButton>
            <ConfirmButton onClick={handleConfirm}>
              <FiCheck size={16} />
              확인
            </ConfirmButton>
          </ButtonGroup>
        </ModalFooter>
      </ModalContainer>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

const ModalContainer = styled.div`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  width: 420px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ClockIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
`

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f5f5f5' : '#0f172a')};
  }
`

const ModalBody = styled.div`
  padding: 24px;
`

const TimeDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? '#212121'
      : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'};
  border-radius: 12px;
  border: 2px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0')};
`

const TimeValue = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: #6366f1;
  font-family: 'Courier New', monospace;
  min-width: 80px;
  text-align: center;
`

const TimeSeparator = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
`

const PickersContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
`

const PickerColumn = styled.div`
  display: flex;
  flex-direction: column;
`

const PickerLabel = styled.div`
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  margin-bottom: 8px;
`

const ScrollContainer = styled.div`
  height: 200px;
  overflow-y: auto;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0')};
  border-radius: 8px;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1')};
    border-radius: 3px;

    &:hover {
      background: ${({ theme }) => (theme.mode === 'dark' ? '#71717a' : '#94a3b8')};
    }
  }
`

const TimeItem = styled.button<{ $selected: boolean }>`
  width: 100%;
  padding: 10px;
  border: none;
  background: ${(props) =>
    props.$selected
      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
      : 'transparent'};
  color: ${(props) =>
    props.$selected
      ? 'white'
      : props.theme.mode === 'dark'
        ? '#d1d5db'
        : '#475569'};
  font-size: 16px;
  font-weight: ${(props) => (props.$selected ? '600' : '400')};
  font-family: 'Courier New', monospace;
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.$selected
        ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
        : props.theme.mode === 'dark'
          ? '#2a2a2a'
          : '#f1f5f9'};
  }
`

const QuickSelectSection = styled.div`
  padding: 16px;
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#f8fafc')};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e2e8f0')};
`

const QuickSelectLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  margin-bottom: 10px;
`

const QuickSelectButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const QuickButton = styled.button`
  padding: 6px 12px;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'white')};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#475569')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.12)' : '#f0f1ff')};
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#1d1d1d' : '#f8fafc')};
`

const ClearButton = styled.button`
  padding: 10px 16px;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#e5e7eb')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'white')};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a1a1aa' : '#64748b')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: #fef2f2;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`

const CancelButton = styled.button`
  padding: 10px 20px;
  border: 1.5px solid ${({ theme }) => (theme.mode === 'dark' ? '#3f3f46' : '#cbd5e1')};
  background: ${({ theme }) => (theme.mode === 'dark' ? '#212121' : 'white')};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#d1d5db' : '#475569')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#2a2a2a' : '#f1f5f9')};
  }
`

const ConfirmButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }
`

