/**
 * 시간 선택 모달.
 *
 * **document.body로 포털**한다 — 다른 모달 안에서 열릴 수 있기 때문이다. 부모 모달 DOM
 * 안에 남으면 (1) 부모 셸의 `backdrop-filter`가 containing block을 만들어 `position: fixed`가
 * 부모 박스에 갇히고(다크 테마에서만 재현), (2) Esc의 native 이벤트가 부모 모달 root까지
 * 버블해 **자식 대신 부모가 닫힌다**. 포털은 두 경로를 동시에 끊는다.
 */
import React, { useState, useEffect, useRef } from 'react'

import { createPortal } from 'react-dom'

import styled from 'styled-components'
import { FiClock, FiX } from 'react-icons/fi'
import { glassCardMixin } from '@/shared/styles/mixins'
import { useDropdownPosition } from '@/shared/hooks/use-dropdown-position.hook'
import { Z_INDEX } from '@/shared/styles/z-index'
import { useModalBehavior } from '@/shared/ui/modal/use-modal-behavior.hook'

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (time: string) => void
  initialTime?: string
  title?: string
  /** 주면 이 칸 아래 **드롭다운**으로(어두운 배경·머리글 없이). 없으면 가운데 모달 */
  anchorEl?: HTMLElement | null
}

const DROPDOWN_WIDTH = 320

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialTime = '',
  title = '시간 선택',
  anchorEl,
}) => {
  const anchored = Boolean(anchorEl)
  const [selectedHour, setSelectedHour] = useState<number>(0)
  const [selectedMinute, setSelectedMinute] = useState<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Esc·포커스 트랩·스크롤락·포커스 복원 일괄. root 바인딩이라 포털과 짝을 이뤄야
  // 부모 모달이 Esc를 가로채지 않는다.
  useModalBehavior({ isOpen, onClose, containerRef })
  const dropdownPos = useDropdownPosition(
    isOpen,
    anchorEl,
    containerRef,
    DROPDOWN_WIDTH,
  )

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

  /* 열리면 고른 시·분이 목록 가운데 오게 — 23시를 골라 둬도 목록은 00부터 보였다.
     scrollIntoView는 바깥 모달까지 스크롤하므로 목록 자신의 scrollTop만 옮긴다. */
  useEffect(() => {
    if (!isOpen) return
    const frame = window.requestAnimationFrame(() => {
      containerRef.current
        ?.querySelectorAll<HTMLElement>('[data-selected="true"]')
        .forEach((item) => {
          const list = item.parentElement
          if (!list) return
          list.scrollTop =
            item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2
        })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, selectedHour, selectedMinute])

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

  const modal = (
    <Overlay onClick={onClose} $anchored={anchored}>
      <ModalContainer
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        $anchored={anchored}
        data-anchored={anchored || undefined}
        style={
          anchored
            ? {
                top: dropdownPos?.top ?? 0,
                left: dropdownPos?.left ?? 0,
                visibility: dropdownPos ? 'visible' : 'hidden',
              }
            : undefined
        }
      >
        <ModalHeader $anchored={anchored}>
          <HeaderLeft>
            <ClockIcon>
              <FiClock size={20} />
            </ClockIcon>
            <ModalTitle>{title}</ModalTitle>
          </HeaderLeft>
          <CloseButton type="button" onClick={onClose} aria-label="닫기">
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
                    type="button"
                    key={hour}
                    $selected={hour === selectedHour}
                    data-selected={hour === selectedHour}
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
                    type="button"
                    key={minute}
                    $selected={minute === selectedMinute}
                    data-selected={minute === selectedMinute}
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </TimeItem>
                ))}
              </ScrollContainer>
            </PickerColumn>
          </PickersContainer>

          {/* 자주 쓰는 시각 — 회색 상자·'빠른 선택' 머리 없이 한 줄 칩(달력 월·연 칸과 같은 면) */}
          <QuickSelectButtons role="group" aria-label="자주 쓰는 시각">
              {[
                { label: '00:00', hour: 0, minute: 0 },
                { label: '06:00', hour: 6, minute: 0 },
                { label: '09:00', hour: 9, minute: 0 },
                { label: '12:00', hour: 12, minute: 0 },
                { label: '18:00', hour: 18, minute: 0 },
                { label: '현재', hour: new Date().getHours(), minute: new Date().getMinutes() },
              ].map((preset) => (
                <QuickButton
                  type="button"
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
        </ModalBody>

        <ModalFooter>
          {/* 드롭다운은 달력과 같은 문법 — 왼쪽 글 버튼(보조) · 오른쪽 '적용'(주). 닫기는 Esc·바깥 클릭 */}
          <ClearButton type="button" onClick={handleClear}>
            시각 지우기
          </ClearButton>
          <ButtonGroup>
            {!anchored && (
              <CancelButton type="button" onClick={onClose}>
                취소
              </CancelButton>
            )}
            <ConfirmButton type="button" onClick={handleConfirm}>
              적용
            </ConfirmButton>
          </ButtonGroup>
        </ModalFooter>
      </ModalContainer>
    </Overlay>
  )

  if (typeof document === 'undefined') return null

  return createPortal(modal, document.body)
}

const Overlay = styled.div<{ $anchored?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* 드롭다운은 화면을 어둡히지 않는다 — 투명한 판은 바깥 클릭 닫기만 맡는다 */
  background: ${({ $anchored }) => ($anchored ? 'transparent' : 'rgba(0, 0, 0, 0.6)')};
  backdrop-filter: ${({ $anchored }) => ($anchored ? 'none' : 'blur(4px)')};
  display: ${({ $anchored }) => ($anchored ? 'block' : 'flex')};
  align-items: center;
  justify-content: center;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
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

const ModalContainer = styled.div<{ $anchored?: boolean }>`
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  width: 420px;
  max-width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;

  ${({ $anchored }) =>
    $anchored &&
    `
    position: fixed;
    width: ${DROPDOWN_WIDTH}px;
    max-width: calc(100vw - 16px);
    border-radius: 12px;
    animation: dropIn 0.16s ease;
  `}

  @keyframes dropIn {
    from {
      transform: translateY(-4px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

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

const ModalHeader = styled.div<{ $anchored?: boolean }>`
  /* 드롭다운엔 머리글이 없다 — 어느 칸의 시간인지는 바로 위 칸이 말한다 */
  display: ${({ $anchored }) => ($anchored ? 'none' : 'flex')};
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ClockIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;

  /* 드롭다운 — 칸 아래 붙어야 하므로 세로를 아낀다 */
  [data-anchored] & {
    padding: 14px 16px 12px;
  }
`

const TimeDisplay = styled.div`
  /* 드롭다운에선 큰 시계 표시를 뺀다 — 목록이 이미 고른 값을 강조하고, 약 100px을 먹었다 */
  [data-anchored] & {
    display: none;
  }
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 12px;
`

const TimeValue = styled.div`
  min-width: 64px;
  font-size: 40px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
`

const TimeSeparator = styled.div`
  font-size: 40px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PickersContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`

const PickerColumn = styled.div`
  display: flex;
  flex-direction: column;
`

const PickerLabel = styled.div`
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const ScrollContainer = styled.div`
  height: 200px;

  [data-anchored] & {
    height: 168px;
  }
  overflow-y: auto;
  padding: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 10px;
  scrollbar-width: thin;
`

/* 달력 날짜 칸과 같은 언어 — 앱 글꼴 tabular 숫자, 선택 = primary 단색 채움 */
const TimeItem = styled.button<{ $selected: boolean }>`
  display: block;
  width: 100%;
  height: 34px;
  margin-bottom: 2px;
  border: none;
  border-radius: 8px;
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
  color: ${({ $selected, theme }) => ($selected ? '#fff' : theme.colors.text.primary)};
  font-family: inherit;
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? 700 : 500)};
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary : theme.colors.background.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const QuickSelectButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
`

const QuickButton = styled.button`
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 20px 18px;

  [data-anchored] & {
    padding: 0 16px 16px;
  }
`

/* 보조 동작 — 달력 '오늘'과 같은 테 없는 글 버튼 */
const ClearButton = styled.button`
  height: 32px;
  padding: 0 10px;
  margin-left: -10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.error};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`

const CancelButton = styled.button`
  height: 32px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }
`

/* 달력 '적용'과 같은 단색 primary — 그라데이션·그림자·뜨는 hover 제거 */
const ConfirmButton = styled.button`
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.18s ease;

  &:hover {
    opacity: 0.9;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

