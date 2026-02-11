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
  const [monthInputValue, setMonthInputValue] = useState('1')
  const [dayInputValue, setDayInputValue] = useState('1')

  const getDaysInMonth = (y: number, m: number) =>
    new Date(y, m + 1, 0).getDate()

  // initialDate 변경 시 상태 업데이트
  useEffect(() => {
    if (isOpen) {
      const date = initialDate ? new Date(initialDate) : new Date()
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
        const year = date.getFullYear()
        const absYear = Math.abs(year)
        setViewYear(absYear)
        setYearInputValue(absYear.toString())
        setIsBCE(year < 0)
        setViewMonth(date.getMonth())
        setMonthInputValue(String(date.getMonth() + 1))
        setDayInputValue(String(date.getDate()))
      }
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  // 년도 입력 변경
  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setYearInputValue(value)
    const year = parseInt(value, 10)
    if (!isNaN(year) && year >= 1 && year <= 9999) {
      setViewYear(year)
      const lastDay = getDaysInMonth(year, viewMonth)
      const d = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(d))
      setSelectedDate(new Date(isBCE ? -year : year, viewMonth, d))
    }
  }

  // 년도 입력 포커스 아웃 (유효성 복구)
  const handleYearInputBlur = () => {
    const year = parseInt(yearInputValue, 10)
    if (isNaN(year) || year < 1 || year > 9999) {
      setYearInputValue(viewYear.toString())
    } else {
      setYearInputValue(year.toString())
    }
  }

  // 년도 증감
  const handleYearChange = (delta: number) => {
    playClickSound()
    const newYear = viewYear + delta
    if (newYear >= 1 && newYear <= 9999) {
      setViewYear(newYear)
      setYearInputValue(newYear.toString())
      const lastDay = getDaysInMonth(newYear, viewMonth)
      const d = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(d))
      setSelectedDate(new Date(isBCE ? -newYear : newYear, viewMonth, d))
    }
  }

  // 기원전/기원후 토글
  const toggleEra = () => {
    playClickSound()
    setIsBCE(!isBCE)
  }

  // 월 입력 변경 (직접 입력)
  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setMonthInputValue(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setViewMonth(num - 1)
      const lastDay = getDaysInMonth(viewYear, num - 1)
      const d = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(d))
      setSelectedDate(new Date(isBCE ? -viewYear : viewYear, num - 1, d))
    }
  }
  const handleMonthInputBlur = () => {
    const num = parseInt(monthInputValue, 10)
    if (isNaN(num) || num < 1 || num > 12) {
      setMonthInputValue(String(viewMonth + 1))
    } else {
      setMonthInputValue(String(num))
    }
  }

  // 일 입력 변경 (직접 입력)
  const handleDayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setDayInputValue(value)
    const num = parseInt(value, 10)
    const lastDay = getDaysInMonth(viewYear, viewMonth)
    if (!isNaN(num) && num >= 1 && num <= lastDay) {
      setSelectedDate(new Date(isBCE ? -viewYear : viewYear, viewMonth, num))
    }
  }
  const handleDayInputBlur = () => {
    const num = parseInt(dayInputValue, 10)
    const lastDay = getDaysInMonth(viewYear, viewMonth)
    if (isNaN(num) || num < 1 || num > lastDay) {
      setDayInputValue(String(Math.min(selectedDate.getDate(), lastDay)))
    } else {
      setDayInputValue(String(num))
    }
  }

  // 월 변경 (화살표)
  const handleMonthChange = (delta: number) => {
    playClickSound()
    const newMonth = viewMonth + delta
    if (newMonth < 0) {
      setViewMonth(11)
      setMonthInputValue('12')
      handleYearChange(-1)
    } else if (newMonth > 11) {
      setViewMonth(0)
      setMonthInputValue('1')
      handleYearChange(1)
    } else {
      setViewMonth(newMonth)
      setMonthInputValue(String(newMonth + 1))
    }
  }

  // 날짜 선택 (달력에서 클릭)
  const handleDateSelect = (day: number) => {
    playClickSound()
    setSelectedDate(new Date(isBCE ? -viewYear : viewYear, viewMonth, day))
    setDayInputValue(String(day))

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

  // 입력된 년/월/일로 날짜 확정 (적용 버튼 또는 Enter 시 사용)
  const applyTypedDate = () => {
    const y = parseInt(yearInputValue, 10)
    const m = parseInt(monthInputValue, 10)
    const d = parseInt(dayInputValue, 10)
    if (isNaN(y) || y < 1 || y > 9999) return
    if (isNaN(m) || m < 1 || m > 12) return
    const lastDay = getDaysInMonth(y, m - 1)
    if (isNaN(d) || d < 1 || d > lastDay) return
    const actualYear = isBCE ? -y : y
    const yearStr = y.toString().padStart(4, '0')
    const monthStr = String(m).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    const formatted =
      actualYear < 0
        ? `-${yearStr}-${monthStr}-${dayStr}`
        : `${yearStr}-${monthStr}-${dayStr}`
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
          {/* 좌측: 설정 영역 - 년 월 일 가로 배치 */}
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

            {/* 년 · 월 · 일 가로 한 줄 */}
            <SettingSection>
              <SettingLabel>날짜 입력</SettingLabel>
              <YearMonthDayRow>
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={yearInputValue}
                  onChange={handleYearInputChange}
                  onBlur={handleYearInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="년도"
                  style={{ flex: 1.2 }}
                />
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={monthInputValue}
                  onChange={handleMonthInputChange}
                  onBlur={handleMonthInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="월"
                  maxLength={2}
                  style={{ width: 48 }}
                />
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={dayInputValue}
                  onChange={handleDayInputChange}
                  onBlur={handleDayInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="일"
                  maxLength={2}
                  style={{ width: 48 }}
                />
              </YearMonthDayRow>
            </SettingSection>

            <ApplyDateButton
              type="button"
              onClick={() => {
                playClickSound()
                applyTypedDate()
              }}
            >
              입력한 날짜로 선택
            </ApplyDateButton>
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
                  onClick={() =>
                    day && isDateValid(day) && handleDateSelect(day)
                  }
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
  background: ${({ $isSelected }) => ($isSelected ? '#f3f4f6' : '#ffffff')};
  border: 1.5px solid
    ${({ $isSelected }) => ($isSelected ? '#d1d5db' : '#e5e7eb')};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $isSelected }) => ($isSelected ? '#e5e7eb' : '#f9fafb')};
    border-color: #d1d5db;
  }
`

const YearMonthDayRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
`

const ShortInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 16px;
  font-weight: 600;
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

const ApplyDateButton = styled.button`
  margin-top: 16px;
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #8b5cf6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #7c3aed;
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
  background: ${({ $isSelected }) => ($isSelected ? '#f3f4f6' : 'transparent')};
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
