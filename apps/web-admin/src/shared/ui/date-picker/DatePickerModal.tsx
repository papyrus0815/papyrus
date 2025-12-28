import React, { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (date: string) => void
  initialDate?: string
  minDate?: string
  maxDate?: string
  title?: string
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialDate,
  minDate,
  maxDate,
  title = '날짜 선택',
}) => {
  const playClickSound = useClickSound()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [isBCE, setIsBCE] = useState(false)
  const [yearInputValue, setYearInputValue] = useState('2024')

  // initialDate 변경 시 상태 업데이트
  useEffect(() => {
    if (isOpen) {
      const date = initialDate ? new Date(initialDate) : new Date()
      setSelectedDate(date)
      const year = date.getFullYear()
      const absYear = Math.abs(year)
      setViewYear(absYear)
      setYearInputValue(absYear.toString())
      setIsBCE(year < 0)
      setViewMonth(date.getMonth())
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  // 년도 입력 변경
  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setYearInputValue(value)
    
    const year = parseInt(value)
    if (!isNaN(year) && year >= 1 && year <= 9999) {
      setViewYear(year)
    }
  }

  // 년도 입력 포커스 아웃
  const handleYearInputBlur = () => {
    const year = parseInt(yearInputValue)
    if (isNaN(year) || year < 1 || year > 9999) {
      setYearInputValue(viewYear.toString())
    }
  }

  // 년도 증감
  const handleYearChange = (delta: number) => {
    playClickSound()
    const newYear = viewYear + delta
    if (newYear >= 1 && newYear <= 9999) {
      setViewYear(newYear)
      setYearInputValue(newYear.toString())
    }
  }

  // 기원전/기원후 토글
  const toggleEra = () => {
    playClickSound()
    setIsBCE(!isBCE)
  }

  // 월 변경
  const handleMonthChange = (delta: number) => {
    playClickSound()
    const newMonth = viewMonth + delta
    if (newMonth < 0) {
      setViewMonth(11)
      handleYearChange(-1)
    } else if (newMonth > 11) {
      setViewMonth(0)
      handleYearChange(1)
    } else {
      setViewMonth(newMonth)
    }
  }

  // 날짜 선택
  const handleDateSelect = (day: number) => {
    playClickSound()
    
    // ISO 8601 형식으로 포맷
    const actualYear = isBCE ? -viewYear : viewYear
    let formatted: string
    const absYear = Math.abs(actualYear)
    const yearStr = absYear.toString().padStart(4, '0')
    const monthStr = String(viewMonth + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    
    if (actualYear < 0) {
      formatted = `-${yearStr}-${monthStr}-${dayStr}`
    } else {
      formatted = `${yearStr}-${monthStr}-${dayStr}`
    }
    
    onSelect(formatted)
    onClose()
  }

  // 날짜 유효성 검사
  const isDateValid = (day: number | null): boolean => {
    if (day === null) return false
    if (isBCE) return true
    
    const date = new Date(viewYear, viewMonth, day)
    if (minDate && date < new Date(minDate)) return false
    if (maxDate && date > new Date(maxDate)) return false
    return true
  }

  const isDateSelected = (day: number | null): boolean => {
    if (day === null) return false
    const actualYear = isBCE ? -viewYear : viewYear
    return (
      selectedDate.getFullYear() === actualYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    )
  }

  const isToday = (day: number | null): boolean => {
    if (day === null) return false
    if (isBCE) return false
    const today = new Date()
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    )
  }

  // 달력 날짜 배열 생성
  const getCalendarDays = (): (number | null)[] => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDay = new Date(viewYear, viewMonth, 1).getDay()
    const days: (number | null)[] = Array(firstDay).fill(null)
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose}>
            <FiX size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalContent>
          {/* 좌측: 설정 영역 */}
          <LeftPanel>
            {/* 기원 선택 */}
            <SettingSection>
              <SettingLabel>기원</SettingLabel>
              <EraSelector>
                <EraButton $isSelected={!isBCE} onClick={toggleEra}>
                  CE<EraSubtext>기원후</EraSubtext>
                </EraButton>
                <EraButton $isSelected={isBCE} onClick={toggleEra}>
                  BCE<EraSubtext>기원전</EraSubtext>
                </EraButton>
              </EraSelector>
            </SettingSection>

            {/* 년도 선택 */}
            <SettingSection>
              <SettingLabel>년도</SettingLabel>
              <YearControl>
                <YearNavButton onClick={() => handleYearChange(-1)}>
                  <FiChevronLeft size={18} />
                </YearNavButton>
                <YearInputContainer>
                  <YearInput
                    type="text"
                    value={yearInputValue}
                    onChange={handleYearInputChange}
                    onBlur={handleYearInputBlur}
                    placeholder="년도"
                  />
                  <YearUnit>년</YearUnit>
                </YearInputContainer>
                <YearNavButton onClick={() => handleYearChange(1)}>
                  <FiChevronRight size={18} />
                </YearNavButton>
              </YearControl>
            </SettingSection>

            {/* 월 선택 */}
            <SettingSection>
              <SettingLabel>월</SettingLabel>
              <MonthGrid>
                {MONTH_NAMES.map((month, index) => (
                  <MonthButton
                    key={month}
                    $isSelected={viewMonth === index}
                    onClick={() => {
                      playClickSound()
                      setViewMonth(index)
                    }}
                  >
                    {index + 1}
                  </MonthButton>
                ))}
              </MonthGrid>
            </SettingSection>
          </LeftPanel>

          {/* 우측: 달력 영역 */}
          <RightPanel>
            <CalendarHeader>
              <NavButton onClick={() => handleMonthChange(-1)}>
                <FiChevronLeft size={18} />
              </NavButton>
              <CurrentDateDisplay>
                <YearText $isBCE={isBCE}>
                  {isBCE ? `BCE ${viewYear}` : viewYear}
                </YearText>
                <MonthText>{MONTH_NAMES[viewMonth]}</MonthText>
              </CurrentDateDisplay>
              <NavButton onClick={() => handleMonthChange(1)}>
                <FiChevronRight size={18} />
              </NavButton>
            </CalendarHeader>

            <CalendarGrid>
              {DAY_NAMES.map((day) => (
                <DayNameCell key={day}>{day}</DayNameCell>
              ))}
              {getCalendarDays().map((day, index) => (
                <DayCell
                  key={index}
                  $isDisabled={!isDateValid(day)}
                  $isSelected={isDateSelected(day)}
                  $isToday={isToday(day)}
                  onClick={() => day && isDateValid(day) && handleDateSelect(day)}
                >
                  {day}
                </DayCell>
              ))}
            </CalendarGrid>
          </RightPanel>
        </ModalContent>
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;

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
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 720px;
  animation: slideUp 0.3s ease;

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
  padding: 24px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`

const ModalContent = styled.div`
  display: flex;
  min-height: 400px;
`

const LeftPanel = styled.div`
  flex: 0 0 280px;
  padding: 28px 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(168, 85, 247, 0.02));
  border-right: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 0 0 0 20px;
`

const RightPanel = styled.div`
  flex: 1;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
`

const SettingSection = styled.div`
  margin-bottom: 28px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SettingLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const EraSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const EraButton = styled.button<{ $isSelected: boolean }>`
  padding: 14px 12px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ $isSelected }) => ($isSelected ? '#ffffff' : '#64748b')};
  background: ${({ $isSelected }) =>
    $isSelected
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(148, 163, 184, 0.08)'};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &:hover {
    background: ${({ $isSelected }) =>
      $isSelected
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(99, 102, 241, 0.12)'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const EraSubtext = styled.span`
  font-size: 10px;
  font-weight: 500;
  opacity: 0.7;
`

const YearControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const YearNavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 44px;
  border: 1px solid rgba(226, 232, 240, 1);
  background: #ffffff;
  color: #64748b;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: rgba(99, 102, 241, 0.05);
  }

  &:active {
    transform: scale(0.95);
  }
`

const YearInputContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
`

const YearInput = styled.input`
  width: 100%;
  padding: 12px 40px 12px 16px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  border: 2px solid rgba(226, 232, 240, 1);
  border-radius: 10px;
  outline: none;
  transition: all 0.2s ease;
  text-align: center;

  &:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
  }

  &::placeholder {
    color: #cbd5e1;
  }
`

const YearUnit = styled.div`
  position: absolute;
  right: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  pointer-events: none;
`

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
`

const MonthButton = styled.button<{ $isSelected: boolean }>`
  padding: 12px 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $isSelected }) => ($isSelected ? '#ffffff' : '#64748b')};
  background: ${({ $isSelected }) =>
    $isSelected
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'rgba(148, 163, 184, 0.08)'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isSelected }) =>
      $isSelected
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : 'rgba(99, 102, 241, 0.12)'};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  color: #64748b;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
  }

  &:active {
    transform: scale(0.95);
  }
`

const CurrentDateDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`

const YearText = styled.div<{ $isBCE: boolean }>`
  font-size: 15px;
  font-weight: 700;
  color: ${({ $isBCE }) => ($isBCE ? '#dc2626' : '#6366f1')};
`

const MonthText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
`

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  flex: 1;
`

const DayNameCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
`

const DayCell = styled.button<{
  $isDisabled: boolean
  $isSelected: boolean
  $isToday: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: ${({ $isSelected }) => ($isSelected ? '700' : '500')};
  color: ${({ $isDisabled, $isSelected }) =>
    $isDisabled ? '#e2e8f0' : $isSelected ? '#ffffff' : '#0f172a'};
  background: ${({ $isSelected }) =>
    $isSelected
      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
      : 'transparent'};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition: all 0.15s ease;
  position: relative;

  ${({ $isToday, $isSelected }) =>
    $isToday &&
    !$isSelected &&
    `
    border: 2px solid #6366f1;
  `}

  &:hover:not(:disabled) {
    background: ${({ $isSelected, $isDisabled }) =>
      $isSelected
        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
        : $isDisabled
          ? 'transparent'
          : 'rgba(99, 102, 241, 0.1)'};
    transform: ${({ $isDisabled }) => ($isDisabled ? 'none' : 'scale(1.05)')};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }
`
