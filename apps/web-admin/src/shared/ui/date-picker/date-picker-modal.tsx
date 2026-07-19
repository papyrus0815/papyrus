import React, { useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { glassCardMixin } from '@/shared/styles/mixins'
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

/** 일요일=0, 토요일=6 컬럼 구분 — 한국 달력 관습(일 빨강·토 파랑). */
function weekendKind(weekday: number): 'sun' | 'sat' | undefined {
  if (weekday === 0) return 'sun'
  if (weekday === 6) return 'sat'
  return undefined
}

/**
 * year/month/day 정수로 *정확한* Date 생성.
 *
 * `new Date(50, 0, 1)`은 50을 1950으로 해석하는 2자리 연도 함정이 있어, 고대(1~99)·
 * 음수(BC) 연도에서 요일·선택 비교가 틀어진다. setFullYear는 연도를 곧이곧대로 잡으므로
 * 모든 연도(BC 포함)에서 정확하다.
 */
function makeDate(year: number, month: number, day: number): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setFullYear(year, month, day)
  return date
}

/** ISO(음수 BC 포함) 문자열 → Date. 실패 시 null. */
function parseFlexibleDate(value?: string | null): Date | null {
  if (!value) return null
  const neg = value.startsWith('-')
  const body = neg ? value.slice(1) : value
  // 월/일 옵셔널 — 부분 정밀('1526'·'-0044-03') 값이 네이티브 new Date() 폴백으로 새면
  // BC '-0044'가 AD 2044로, '1526'이 TZ에 따라 1525-12-31로 둔갑한다. 미상 월/일은 1월 1일로 초기화.
  const match = body.match(/^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/)
  if (match) {
    const year = parseInt(match[1], 10) * (neg ? -1 : 1)
    return makeDate(
      year,
      (match[2] ? parseInt(match[2], 10) : 1) - 1,
      match[3] ? parseInt(match[3], 10) : 1,
    )
  }
  // ISO datetime 등 숫자-하이픈 패턴 밖 문자열만 네이티브 폴백(부호 없는 완전 형식)
  const full = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  if (full) {
    const year = parseInt(full[1], 10) * (neg ? -1 : 1)
    return makeDate(year, parseInt(full[2], 10) - 1, parseInt(full[3], 10))
  }
  if (neg) return null
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

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
  /** 키보드 로빙 포커스 대상 일(day). */
  const [focusedDay, setFocusedDay] = useState(1)
  /** '선택 적용' 시 범위 밖 입력에 대한 필드별 안내. */
  const [inputError, setInputError] = useState<{
    field: 'year' | 'month' | 'day'
    message: string
  } | null>(null)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const focusedCellRef = useRef<HTMLButtonElement | null>(null)
  /** arrow 키 이동 후에만 day 셀로 포커스를 옮긴다(마우스/타이핑 땐 X). */
  const shouldFocusDayRef = useRef(false)
  /**
   * 호출부가 onClose를 인라인 함수로 넘기면(예: `onClose={() => setOpen(false)}`)
   * 부모 리렌더마다 참조가 바뀐다. 포커스 트랩 effect가 이를 deps로 두면 매 렌더마다
   * cleanup→재실행되어 containerRef.focus()가 입력 중인 input의 포커스를 빼앗는다.
   * ref로 최신 onClose만 들고 effect는 isOpen에만 의존하게 한다.
   */
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const getDaysInMonth = (year: number, month: number) =>
    makeDate(year, month + 1, 0).getDate()

  /*
   * 호출부가 initialDate를 매 렌더 새 Date/문자열로 넘기는 경우가 많아(예:
   * `initialDate={buildInitialDate(...)}`) 객체 정체성으로 deps를 잡으면 부모가
   * 리렌더될 때마다 effect가 재실행되어 입력 중이던 연/월/일 값을 되돌린다.
   * 의미 있는 날짜 값(타임스탬프)으로 정규화해 deps에 둔다.
   */
  const initialDateParsed = parseFlexibleDate(initialDate)
  const initialDateKey = initialDateParsed ? initialDateParsed.getTime() : null

  useEffect(() => {
    if (isOpen) {
      const date = initialDateParsed ?? new Date()
      setSelectedDate(date)
      const year = date.getFullYear()
      const absYear = Math.abs(year)
      setViewYear(absYear)
      setYearInputValue(absYear.toString())
      setIsBCE(year < 0)
      setViewMonth(date.getMonth())
      setMonthInputValue(String(date.getMonth() + 1))
      setDayInputValue(String(date.getDate()))
      setFocusedDay(date.getDate())
      setInputError(null)
    }
    // initialDateParsed는 initialDateKey로 정체성을 안정화 — deps에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialDateKey])

  /* 열림: 포커스를 모달로 이동 + Escape 닫기 + Tab 트랩. 닫힘: 직전 포커스 복귀. */
  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    containerRef.current?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !containerRef.current) return
      const focusables = containerRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), input:not([tabindex="-1"]), [tabindex="0"]',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey, true)
    return () => {
      document.removeEventListener('keydown', handleKey, true)
      previouslyFocused?.focus?.()
    }
    // onClose는 onCloseRef로 참조 — deps에서 제외해 매 렌더마다 포커스를 빼앗지 않게 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  /* arrow 이동 후 해당 day 버튼으로 실제 포커스 이동. */
  useEffect(() => {
    if (shouldFocusDayRef.current && focusedCellRef.current) {
      focusedCellRef.current.focus()
      shouldFocusDayRef.current = false
    }
  }, [focusedDay, viewMonth, viewYear, isBCE])

  if (!isOpen) return null

  const actualYear = isBCE ? -viewYear : viewYear
  const daysInCurrentMonth = getDaysInMonth(actualYear, viewMonth)
  const focusDay = Math.min(focusedDay, daysInCurrentMonth)
  /* min/max는 렌더당 한 번만 파싱 — isDateValid가 날짜 셀마다 재파싱하지 않도록. */
  const minBound = parseFlexibleDate(minDate)
  const maxBound = parseFlexibleDate(maxDate)

  const handleYearInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null)
    const value = e.target.value.replace(/\D/g, '')
    setYearInputValue(value)
    const year = parseInt(value, 10)
    if (!isNaN(year) && year >= 1 && year <= 9999) {
      setViewYear(year)
      const lastDay = getDaysInMonth(isBCE ? -year : year, viewMonth)
      const clampedDay = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(clampedDay))
      setSelectedDate(makeDate(isBCE ? -year : year, viewMonth, clampedDay))
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
      const lastDay = getDaysInMonth(isBCE ? -newYear : newYear, viewMonth)
      const clampedDay = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(clampedDay))
      setSelectedDate(makeDate(isBCE ? -newYear : newYear, viewMonth, clampedDay))
    }
  }

  const toggleEra = () => {
    playClickSound()
    setIsBCE(!isBCE)
  }

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputError(null)
    const value = e.target.value.replace(/\D/g, '')
    setMonthInputValue(value)
    const num = parseInt(value, 10)
    if (!isNaN(num) && num >= 1 && num <= 12) {
      setViewMonth(num - 1)
      const lastDay = getDaysInMonth(actualYear, num - 1)
      const clampedDay = Math.min(selectedDate.getDate(), lastDay)
      setDayInputValue(String(clampedDay))
      setSelectedDate(makeDate(actualYear, num - 1, clampedDay))
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
    setInputError(null)
    const value = e.target.value.replace(/\D/g, '')
    setDayInputValue(value)
    const num = parseInt(value, 10)
    const lastDay = getDaysInMonth(actualYear, viewMonth)
    if (!isNaN(num) && num >= 1 && num <= lastDay) {
      setSelectedDate(makeDate(actualYear, viewMonth, num))
      setFocusedDay(num)
    }
  }

  const handleDayInputBlur = () => {
    const num = parseInt(dayInputValue, 10)
    const lastDay = getDaysInMonth(actualYear, viewMonth)
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
    setSelectedDate(makeDate(actualYear, viewMonth, day))
    setDayInputValue(String(day))
    setFocusedDay(day)

    const absYear = Math.abs(actualYear)
    const yearStr = absYear.toString().padStart(4, '0')
    const monthStr = String(viewMonth + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const formatted =
      actualYear < 0
        ? `-${yearStr}-${monthStr}-${dayStr}`
        : `${yearStr}-${monthStr}-${dayStr}`

    onSelect(formatted)
    onClose()
  }

  const applyTypedDate = () => {
    const year = parseInt(yearInputValue, 10)
    const month = parseInt(monthInputValue, 10)
    const day = parseInt(dayInputValue, 10)
    if (isNaN(year) || year < 1 || year > 9999) {
      setInputError({ field: 'year', message: '년도는 1~9999 사이여야 합니다.' })
      return
    }
    if (isNaN(month) || month < 1 || month > 12) {
      setInputError({ field: 'month', message: '월은 1~12 사이여야 합니다.' })
      return
    }
    const lastDay = getDaysInMonth(isBCE ? -year : year, month - 1)
    if (isNaN(day) || day < 1 || day > lastDay) {
      setInputError({ field: 'day', message: `일은 1~${lastDay} 사이여야 합니다.` })
      return
    }
    setInputError(null)
    const yearStr = year.toString().padStart(4, '0')
    const monthStr = String(month).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    const formatted = isBCE
      ? `-${yearStr}-${monthStr}-${dayStr}`
      : `${yearStr}-${monthStr}-${dayStr}`
    onSelect(formatted)
    onClose()
  }

  const goToToday = () => {
    playClickSound()
    setInputError(null)
    const today = new Date()
    setIsBCE(false)
    setViewYear(today.getFullYear())
    setYearInputValue(String(today.getFullYear()))
    setViewMonth(today.getMonth())
    setMonthInputValue(String(today.getMonth() + 1))
    setDayInputValue(String(today.getDate()))
    setFocusedDay(today.getDate())
  }

  /** 달력의 어떤 날짜로 *뷰·포커스*를 동기화(선택은 X). 음수 연도/월·일 오버플로 정규화. */
  const syncViewToDate = (date: Date) => {
    const year = date.getFullYear()
    setIsBCE(year < 0)
    setViewYear(Math.abs(year))
    setYearInputValue(Math.abs(year).toString())
    setViewMonth(date.getMonth())
    setMonthInputValue(String(date.getMonth() + 1))
    setFocusedDay(date.getDate())
    shouldFocusDayRef.current = true
  }

  const handleGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight':
        syncViewToDate(makeDate(actualYear, viewMonth, focusDay + 1))
        break
      case 'ArrowLeft':
        syncViewToDate(makeDate(actualYear, viewMonth, focusDay - 1))
        break
      case 'ArrowDown':
        syncViewToDate(makeDate(actualYear, viewMonth, focusDay + 7))
        break
      case 'ArrowUp':
        syncViewToDate(makeDate(actualYear, viewMonth, focusDay - 7))
        break
      case 'PageDown': {
        const next = makeDate(actualYear, viewMonth + 1, 1)
        const dim = getDaysInMonth(next.getFullYear(), next.getMonth())
        syncViewToDate(makeDate(next.getFullYear(), next.getMonth(), Math.min(focusDay, dim)))
        break
      }
      case 'PageUp': {
        const prev = makeDate(actualYear, viewMonth - 1, 1)
        const dim = getDaysInMonth(prev.getFullYear(), prev.getMonth())
        syncViewToDate(makeDate(prev.getFullYear(), prev.getMonth(), Math.min(focusDay, dim)))
        break
      }
      case 'Home':
        syncViewToDate(makeDate(actualYear, viewMonth, 1))
        break
      case 'End':
        syncViewToDate(makeDate(actualYear, viewMonth, daysInCurrentMonth))
        break
      case 'Enter':
        if (isDateValid(focusDay)) handleDateSelect(focusDay)
        break
      // Space는 핸들러(keydown)가 아니라 day 셀(<button>)의 네이티브 활성화(keyup)에 맡긴다.
      // keydown에서 선택·닫기하면, 닫힌 뒤 포커스가 트리거 버튼으로 복귀한 상태에서
      // 뒤따르는 Space keyup이 그 버튼을 눌러(출생→사망 자동연쇄 시 트리거=출생일 버튼)
      // 출생일 모달이 의도치 않게 재오픈된다. keyup 선택은 후속 이벤트가 없어 안전.
      case ' ':
        return
      default:
        return
    }
    e.preventDefault()
  }

  const isDateValid = (day: number | null): boolean => {
    if (day === null) return false
    const candidate = makeDate(actualYear, viewMonth, day)
    if (minBound && candidate < minBound) return false
    if (maxBound && candidate > maxBound) return false
    return true
  }

  const isDateSelected = (day: number | null): boolean => {
    if (day === null) return false
    return (
      selectedDate.getFullYear() === actualYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    )
  }

  const isToday = (day: number | null): boolean => {
    if (day === null || isBCE) return false
    const today = new Date()
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    )
  }

  const dayAriaLabel = (day: number): string =>
    `${isBCE ? '기원전 ' : ''}${viewYear}년 ${viewMonth + 1}월 ${day}일`

  const getCalendarDays = (): (number | null)[] => {
    const firstWeekday = makeDate(actualYear, viewMonth, 1).getDay()
    const days: (number | null)[] = Array(firstWeekday).fill(null)
    for (let i = 1; i <= daysInCurrentMonth; i++) days.push(i)
    return days
  }

  const modal = (
    <Overlay onClick={onClose}>
      <ModalContainer
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <CloseButton onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseButton>
        </ModalHeader>

        <Body>
          <TopControls>
            <EraSelector>
              <EraButton
                $isSelected={!isBCE}
                onClick={toggleEra}
                aria-pressed={!isBCE}
              >
                AD
              </EraButton>
              <EraButton
                $isSelected={isBCE}
                onClick={toggleEra}
                aria-pressed={isBCE}
              >
                BC
              </EraButton>
            </EraSelector>
            <InputGroup>
              <UnitField>
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={yearInputValue}
                  onChange={handleYearInputChange}
                  onBlur={handleYearInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="년"
                  aria-label="년도"
                  aria-invalid={inputError?.field === 'year'}
                  $invalid={inputError?.field === 'year'}
                  style={{ width: 58 }}
                />
                <Unit>년</Unit>
              </UnitField>
              <UnitField>
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={monthInputValue}
                  onChange={handleMonthInputChange}
                  onBlur={handleMonthInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="월"
                  aria-label="월"
                  aria-invalid={inputError?.field === 'month'}
                  $invalid={inputError?.field === 'month'}
                  maxLength={2}
                  style={{ width: 36 }}
                />
                <Unit>월</Unit>
              </UnitField>
              <UnitField>
                <ShortInput
                  type="text"
                  inputMode="numeric"
                  value={dayInputValue}
                  onChange={handleDayInputChange}
                  onBlur={handleDayInputBlur}
                  onKeyDown={(e) => e.key === 'Enter' && applyTypedDate()}
                  placeholder="일"
                  aria-label="일"
                  aria-invalid={inputError?.field === 'day'}
                  $invalid={inputError?.field === 'day'}
                  maxLength={2}
                  style={{ width: 36 }}
                />
                <Unit>일</Unit>
              </UnitField>
            </InputGroup>
          </TopControls>

          {inputError && (
            <InputErrorText role="alert">{inputError.message}</InputErrorText>
          )}

          <CalendarHeader>
            <NavButton onClick={() => handleYearChange(-1)} aria-label="이전 해">
              <FiChevronsLeft size={18} />
            </NavButton>
            <NavButton onClick={() => handleMonthChange(-1)} aria-label="이전 달">
              <FiChevronLeft size={18} />
            </NavButton>
            <CurrentDateDisplay>
              <DateDisplayText>
                {isBCE && <EraTag>BC</EraTag>}
                {viewYear}년 {viewMonth + 1}월
              </DateDisplayText>
            </CurrentDateDisplay>
            <NavButton onClick={() => handleMonthChange(1)} aria-label="다음 달">
              <FiChevronRight size={18} />
            </NavButton>
            <NavButton onClick={() => handleYearChange(1)} aria-label="다음 해">
              <FiChevronsRight size={18} />
            </NavButton>
          </CalendarHeader>

          <CalendarGrid
            role="grid"
            aria-label="날짜 선택 달력"
            onKeyDown={handleGridKeyDown}
          >
            {DAY_NAMES.map((day, index) => (
              <DayNameCell key={day} $weekend={weekendKind(index)}>
                {day}
              </DayNameCell>
            ))}
            {getCalendarDays().map((day, index) => {
              if (day === null) return <EmptyCell key={index} aria-hidden />
              const selected = isDateSelected(day)
              const valid = isDateValid(day)
              const today = isToday(day)
              return (
                <DayCell
                  key={index}
                  ref={day === focusDay ? focusedCellRef : undefined}
                  type="button"
                  role="gridcell"
                  tabIndex={day === focusDay ? 0 : -1}
                  $isDisabled={!valid}
                  $isSelected={selected}
                  $isToday={today}
                  $weekend={weekendKind(index % 7)}
                  aria-label={dayAriaLabel(day)}
                  aria-selected={selected}
                  aria-current={today ? 'date' : undefined}
                  aria-disabled={!valid}
                  onClick={() => {
                    if (!valid) return
                    setFocusedDay(day)
                    handleDateSelect(day)
                  }}
                >
                  {day}
                </DayCell>
              )
            })}
          </CalendarGrid>

          <Footer>
            <TodayButton type="button" onClick={goToToday}>
              오늘
            </TodayButton>
            <ApplyButton
              type="button"
              onClick={() => {
                playClickSound()
                applyTypedDate()
              }}
            >
              선택 적용
            </ApplyButton>
          </Footer>
        </Body>
      </ModalContainer>
    </Overlay>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
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

  @media (prefers-reduced-motion: no-preference) {
    animation: fadeIn 0.2s ease;
  }

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
  width: 92%;
  max-width: 440px;
  outline: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: slideUp 0.26s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(16px);
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
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.02em;
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 9px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 18px;
`

const TopControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
`

const EraSelector = styled.div`
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 10px;
`

const EraButton = styled.button<{ $isSelected: boolean }>`
  padding: 6px 13px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.text.primary : theme.colors.text.secondary};
  background: ${({ $isSelected, theme }) =>
    $isSelected
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.12)'
        : '#fff'
      : 'transparent'};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;
  box-shadow: ${({ $isSelected }) =>
    $isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const UnitField = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
`

const Unit = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ShortInput = styled.input<{ $invalid?: boolean }>`
  padding: 8px 6px;
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid
    ${({ $invalid, theme }) =>
      $invalid ? theme.colors.error : theme.colors.border.default};
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  text-align: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};

  &:focus {
    border-color: ${({ $invalid, theme }) =>
      $invalid ? theme.colors.error : theme.colors.primary};
    box-shadow: ${({ theme }) => theme.colors.focusRing?.primary ?? 'none'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InputErrorText = styled.p`
  margin: -4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.error};
`

const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: 9px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const CurrentDateDisplay = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`

const DateDisplayText = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const EraTag = styled.span`
  padding: 3px 7px;
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
  gap: 3px;
`

const DayNameCell = styled.div<{ $weekend?: 'sun' | 'sat' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ $weekend, theme }) =>
    $weekend === 'sun'
      ? '#dc2626'
      : $weekend === 'sat'
        ? '#2563eb'
        : theme.colors.text.tertiary};
`

const EmptyCell = styled.div`
  height: 40px;
`

const DayCell = styled.button<{
  $isDisabled: boolean
  $isSelected: boolean
  $isToday: boolean
  $weekend?: 'sun' | 'sat'
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border: none;
  border-radius: 11px;
  font-size: 14px;
  font-weight: ${({ $isSelected, $isToday }) =>
    $isSelected || $isToday ? '700' : '500'};
  color: ${({ $isDisabled, $isSelected, $isToday, $weekend, theme }) =>
    $isDisabled
      ? theme.colors.border.default
      : $isSelected
        ? '#fff'
        : $isToday
          ? theme.colors.primary
          : $weekend === 'sun'
            ? '#dc2626'
            : $weekend === 'sat'
              ? '#2563eb'
              : theme.colors.text.primary};
  background: ${({ $isSelected, theme }) =>
    $isSelected ? theme.colors.primary : 'transparent'};
  /* 오늘 = 채움 대신 *링*(테두리)으로, 선택(채움)과 위계를 분리. */
  box-shadow: ${({ $isToday, $isSelected, theme }) =>
    $isToday && !$isSelected
      ? `inset 0 0 0 1.5px ${theme.colors.primary}`
      : 'none'};
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ $isSelected, $isDisabled, theme }) =>
      $isSelected
        ? theme.colors.primary
        : $isDisabled
          ? 'transparent'
          : theme.colors.background.tertiary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:active:not(:disabled) {
    transform: scale(0.96);
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 2px;
`

const TodayButton = styled.button`
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.18s ease,
    color 0.18s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ApplyButton = styled.button`
  padding: 9px 20px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: ${({ theme }) => theme.colors.primary};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.18s ease;

  &:hover {
    opacity: 0.9;
  }
`
