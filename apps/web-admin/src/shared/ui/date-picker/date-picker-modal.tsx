import React, { useEffect, useState } from 'react'

import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { Z_INDEX } from '@/shared/styles/z-index'

interface DatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (date: string) => void
  /** 초기 선택 날짜 (ISO 형식). selectedDate도 동일하게 사용 가능 */
  initialDate?: string
  /** @deprecated initialDate를 사용하세요 */
  selectedDate?: string
  minDate?: string
  maxDate?: string
  title?: string
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialDate: initialDateProp,
  selectedDate: selectedDateProp,
  minDate,
  maxDate,
  title = '날짜 선택',
}) => {
  const initialDate = initialDateProp ?? selectedDateProp
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

  const handleYearInputBlur = () => {
    const year = parseInt(yearInputValue, 10)
    if (isNaN(year) || year < 1 || year > 9999) {
      setYearInputValue(viewYear.toString())
    } else {
      setYearInputValue(year.toString())
    }
  }

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

  const toggleEra = () => {
    playClickSound()
    setIsBCE(!isBCE)
  }

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

  const handleDateSelect = (day: number) => {
    playClickSound()
    setSelectedDate(new Date(isBCE ? -viewYear : viewYear, viewMonth, day))
    setDayInputValue(String(day))

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
          <LeftPanel>
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
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
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
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(25,25,25,0.92)' : '#fff'};
  backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  -webkit-backdrop-filter: ${({ theme }) =>
    theme.mode === 'dark' ? 'blur(24px)' : 'none'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'};
  border-radius: 20px;
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.5)'
      : '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)'};
  width: 90%;
  max-width: 750px;
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
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ModalContent = styled.div`
  display: flex;
  min-height: 420px;
`

const LeftPanel = styled.div`
  flex: 0 0 260px;
  padding: 24px 20px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 0 0 0 20px;
`

const RightPanel = styled.div`
  flex: 1;
  padding: 24px 28px;
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
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 10px;
`

const EraSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`

const EraButton = styled.button<{ $isSelected: boolean }>`
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ $isSelected, theme }) =>
    $isSelected
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : '#fff'
      : 'transparent'};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  box-shadow: ${({ $isSelected }) =>
    $isSelected ? '0 2px 8px rgba(79, 70, 229, 0.12)' : 'none'};

  &:hover {
    background: ${({ $isSelected, theme }) =>
      $isSelected
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.15)'
          : '#fff'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(255,255,255,0.6)'};
    border-color: ${({ theme }) => theme.colors.border.medium};
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
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 12px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const ApplyDateButton = styled.button`
  margin-top: 16px;
  width: 100%;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);

  &:hover {
    background: #4f46e5;
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
  background: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 12px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: rgba(79, 70, 229, 0.08);
    color: #4f46e5;
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
  color: ${({ theme }) => theme.colors.text.primary};
`

const EraTag = styled.span`
  padding: 4px 8px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(220,38,38,0.15)' : '#fef2f2'};
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
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
  color: ${({ theme }) => theme.colors.text.tertiary};
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
  border-radius: 12px;
  font-size: 14px;
  font-weight: ${({ $isSelected }) => ($isSelected ? '600' : '500')};
  color: ${({ $isDisabled, $isSelected, theme }) =>
    $isDisabled
      ? theme.colors.border.default
      : $isSelected
        ? '#fff'
        : theme.colors.text.primary};
  background: ${({ $isSelected }) => ($isSelected ? '#4f46e5' : 'transparent')};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition:
    background 0.15s ease,
    color 0.15s ease;
  position: relative;

  ${({ $isToday, $isSelected, theme }) =>
    $isToday &&
    !$isSelected &&
    `
    background: ${theme.mode === 'dark' ? 'rgba(251,191,36,0.15)' : '#fef3c7'};
    color: #d97706;
    font-weight: 600;
  `}

  &:hover:not(:disabled) {
    background: ${({ $isSelected, $isDisabled, $isToday }) =>
      $isSelected
        ? '#4338ca'
        : $isDisabled
          ? 'transparent'
          : $isToday
            ? undefined
            : 'rgba(79, 70, 229, 0.08)'};
    color: ${({ $isSelected, $isDisabled }) =>
      $isSelected && !$isDisabled ? '#fff' : undefined};
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
`
