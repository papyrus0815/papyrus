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
                  AD
                </EraButton>
                <EraButton $isSelected={isBCE} onClick={toggleEra}>
                  BC
                </EraButton>
              </EraSelector>
            </SettingSection>

            {/* 년도 선택 */}
            <SettingSection>
              <SettingLabel>년도</SettingLabel>
              <YearControl>
                <YearNavButton onClick={() => handleYearChange(-1)}>
                  <FiChevronLeft size={16} />
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
                  <FiChevronRight size={16} />
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
                <DateDisplayText>
                  {isBCE && <EraTag>BC</EraTag>}
                  {viewYear}년 {viewMonth + 1}월
                </DateDisplayText>
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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
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
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 750px;
  animation: slideUp 0.3s ease;

  @keyframes slideUp {
    from {
      transform: translateY(30px);
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
  border-bottom: 1px solid #e2e8f0;
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #fee2e2;
    color: #ef4444;
  }
`

const ModalContent = styled.div`
  display: flex;
  min-height: 420px;
`

const LeftPanel = styled.div`
  flex: 0 0 260px;
  padding: 24px 20px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  border-radius: 0 0 0 16px;
`

const RightPanel = styled.div`
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
`

const SettingSection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SettingLabel = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const EraSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const EraButton = styled.button<{ $isSelected: boolean }>`
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ $isSelected }) => ($isSelected ? '#111827' : '#6b7280')};
  background: ${({ $isSelected }) =>
    $isSelected ? '#f3f4f6' : '#ffffff'};
  border: 1.5px solid
    ${({ $isSelected }) => ($isSelected ? '#d1d5db' : '#e5e7eb')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isSelected }) =>
      $isSelected ? '#e5e7eb' : '#f9fafb'};
    border-color: #d1d5db;
  }
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
  width: 36px;
  height: 40px;
  border: 1.5px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    border-color: #8b5cf6;
    color: #8b5cf6;
    background: #faf5ff;
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
  padding: 10px 36px 10px 12px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
  text-align: center;

  &:focus {
    border-color: #8b5cf6;
    background: #faf5ff;
  }

  &::placeholder {
    color: #cbd5e1;
  }
`

const YearUnit = styled.div`
  position: absolute;
  right: 12px;
  font-size: 13px;
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
  padding: 10px 6px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $isSelected }) => ($isSelected ? '#111827' : '#6b7280')};
  background: ${({ $isSelected }) =>
    $isSelected ? '#f3f4f6' : '#ffffff'};
  border: 1px solid ${({ $isSelected }) => ($isSelected ? '#d1d5db' : '#e5e7eb')};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isSelected }) =>
      $isSelected ? '#e5e7eb' : '#f9fafb'};
    border-color: #d1d5db;
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
  background: #f1f5f9;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #faf5ff;
    color: #8b5cf6;
  }
`

const CurrentDateDisplay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const DateDisplayText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
`

const EraTag = styled.span`
  padding: 4px 8px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
`

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  flex: 1;
`

const DayNameCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
`

const DayCell = styled.button<{
  $isDisabled: boolean
  $isSelected: boolean
  $isToday: boolean
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: ${({ $isSelected }) => ($isSelected ? '600' : '500')};
  color: ${({ $isDisabled, $isSelected }) =>
    $isDisabled ? '#e5e7eb' : $isSelected ? '#111827' : '#1f2937'};
  background: ${({ $isSelected }) =>
    $isSelected ? '#f3f4f6' : 'transparent'};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition: all 0.15s ease;
  position: relative;

  ${({ $isToday, $isSelected }) =>
    $isToday &&
    !$isSelected &&
    `
    background: #fef3c7;
    color: #f59e0b;
    font-weight: 700;
  `}

  &:hover:not(:disabled) {
    background: ${({ $isSelected, $isDisabled, $isToday }) =>
      $isSelected
        ? '#e5e7eb'
        : $isDisabled
          ? 'transparent'
          : $isToday
            ? '#fef3c7'
            : '#f9fafb'};
    transform: ${({ $isDisabled }) => ($isDisabled ? 'none' : 'none')};
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`
