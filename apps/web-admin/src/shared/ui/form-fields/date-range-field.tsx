/**
 * 취임일·퇴임일 등 기간 날짜 필드 - 달력(캘린더) input 공통
 * 라벨 + 취임일 버튼 + 퇴임일 버튼 + DatePickerModal 두 개
 */
import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import { FiCalendar, FiChevronDown, FiX } from 'react-icons/fi'

import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  Required,
} from '@/shared/ui/register-form-layout'
import { notify } from '@/shared/ui/toast'

/** 퇴임일 버튼 + 클리어(X) 버튼을 한 그리드 셀에 담는 래퍼 — DateFieldsRow의 `> button` 폭 규칙을 대신 적용 */
const EndFieldCell = styled.div`
  display: flex;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
  & > button:first-child {
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }
`

/** 퇴임일 비우기(X) 버튼 — 수정 모드에서 퇴임일을 지워 '현직'으로 전환할 때 사용 */
const ClearEndBtn = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'};
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

function formatDateDisplay(iso: string): string {
  if (!iso) return ''
  // 문자열 직접 파싱(TZ 안전) — new Date(iso)는 UTC 자정 해석이라
  // UTC 서쪽 타임존에서 toLocaleDateString이 하루 빠진 날짜를 보여준다.
  const p = parseIsoDateParts(iso)
  if (!p) return iso
  if (p.year < 0) return `BC ${Math.abs(p.year)}년 ${p.month}월 ${p.day}일`
  return `${p.year}년 ${p.month}월 ${p.day}일`
}

export interface DateRangeFieldProps {
  label?: string
  required?: boolean
  startValue: string
  endValue: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  startPlaceholder?: string
  endPlaceholder?: string
  /**
   * 시작일을 고르면 종료일 달력을 곧바로 이어서 여는 연쇄 오픈 (기본 false).
   *
   * 종료일(퇴임일·폐업일 등)은 대개 선택 항목이라 — 현직/존속 중이면 비운다 —
   * 자동으로 띄우면 등록할 때마다 달력을 한 번 더 닫아야 하는 강제 단계가 된다.
   * 종료일이 사실상 필수인 폼에서만 opt-in.
   */
  openEndAfterStart?: boolean
  /** true면 FieldRow/FieldLabel 없이 컨트롤(날짜 버튼)만 렌더 (모달 등에서 레이블을 직접 쓸 때) */
  renderControlOnly?: boolean
  /** DatePickerModal 제목 (기본: 취임일 선택 / 퇴임일 선택) */
  startPickerTitle?: string
  endPickerTitle?: string
  /**
   * BC("-YYYY-…") 날짜 선택 차단 (opt-in).
   * 재임·재위 모델은 era 컬럼이 없어 BC 문자열이 서버에서 AD 미래 날짜로 둔갑한다 —
   * 해당 폼(tenure/sovereign-reign 패널)에서만 켜고, Event 등 BC 지원 소비처는 끈 상태 유지.
   */
  blockBc?: boolean
  /**
   * 퇴임일 값이 있을 때 클리어(X) 버튼 노출 (opt-in).
   * 비운 값을 null(해제)로 전송하는 폼(tenure 패널 수정 모드 등)에서만 켤 것 —
   * `값 || undefined` 전송 소비처에서 켜면 지워도 저장이 안 되는 silent no-op이 된다.
   */
  clearableEnd?: boolean
}

export const DateRangeField: React.FC<DateRangeFieldProps> = ({
  label = '취임일 · 퇴임일',
  required = false,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startPlaceholder = '취임일',
  endPlaceholder = '퇴임일 (선택)',
  openEndAfterStart = false,
  renderControlOnly = false,
  startPickerTitle = '취임일 선택',
  endPickerTitle = '퇴임일 선택',
  blockBc = false,
  clearableEnd = false,
}) => {
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)
  const startBtnRef = useRef<HTMLButtonElement | null>(null)
  const endBtnRef = useRef<HTMLButtonElement | null>(null)

  /**
   * 피커가 닫힌 뒤 "그 피커를 연 버튼"으로 포커스를 되돌린다.
   *
   * DatePickerModal은 열릴 때의 activeElement로 복귀하는데, 취임일→퇴임일 연쇄 오픈
   * (openEndAfterStart)에서는 그 값이 *취임일* 버튼이다. 그래서 퇴임일까지 고르고 나면
   * 포커스가 취임일 버튼에 남고, 이어서 Enter/Space를 누르면 취임일 달력이 또 열린다.
   * 모달 내부 복귀는 커밋 시점에 동기로 끝나므로 다음 프레임에 올바른 트리거로 덮어쓴다.
   */
  const focusTriggerAfterClose = (
    ref: React.RefObject<HTMLButtonElement | null>,
  ) => {
    requestAnimationFrame(() => ref.current?.focus())
  }

  /** blockBc 켜진 폼에서 BC 선택 차단 — 통과시키면 서버가 AD 미래 날짜로 잘못 저장한다 */
  const isBlockedBc = (date: string) => {
    if (blockBc && date.startsWith('-')) {
      notify.error('기원전(BC) 날짜는 이 기록에 사용할 수 없습니다.')
      return true
    }
    return false
  }

  /**
   * 방금 취임일 선택이 퇴임일 모달을 연쇄로 열었음 — 뒤따라 호출되는 onClose(handleStartClose)가
   * 취임일 버튼으로 포커스를 되돌려 새 모달의 포커스를 빼앗지 않게 하는 1회성 플래그.
   * (DatePickerModal은 onSelect 직후 항상 onClose를 부른다.)
   */
  const chainedToEndRef = useRef(false)

  const handleStartSelect = (date: string) => {
    if (isBlockedBc(date)) return
    onStartChange(date)
    setStartModalOpen(false)
    // 퇴임일이 아직 비어 있을 때만 자동 오픈 — 이미 선택했으면 취임일 재수정 시 다시 띄우지 않음
    if (openEndAfterStart && !endValue) {
      chainedToEndRef.current = true
      setEndModalOpen(true)
    }
    // 포커스 복귀는 뒤따르는 onClose(handleStartClose)가 일괄 담당.
  }

  const handleStartClose = () => {
    setStartModalOpen(false)
    if (chainedToEndRef.current) {
      chainedToEndRef.current = false
      return
    }
    focusTriggerAfterClose(startBtnRef)
  }

  const handleEndSelect = (date: string) => {
    if (isBlockedBc(date)) return
    onEndChange(date)
    setEndModalOpen(false)
    focusTriggerAfterClose(endBtnRef)
  }

  const handleEndClose = () => {
    setEndModalOpen(false)
    focusTriggerAfterClose(endBtnRef)
  }

  const endDateBtn = (
    <DateFieldBtn
      ref={endBtnRef}
      type="button"
      onClick={() => setEndModalOpen(true)}
      $hasValue={!!endValue}
    >
      <FiCalendar size={16} />
      <span>{endValue ? formatDateDisplay(endValue) : endPlaceholder}</span>
      <FiChevronDown size={20} />
    </DateFieldBtn>
  )

  const dateButtons = (
    <DateFieldsRow>
      <DateFieldBtn
        ref={startBtnRef}
        type="button"
        onClick={() => setStartModalOpen(true)}
        $hasValue={!!startValue}
      >
        <FiCalendar size={16} />
        <span>{startValue ? formatDateDisplay(startValue) : startPlaceholder}</span>
        <FiChevronDown size={20} />
      </DateFieldBtn>
      {clearableEnd ? (
        <EndFieldCell>
          {endDateBtn}
          {/* 퇴임일 비우기 → onEndChange('') — 수정 모드에서는 null(해제)로 전송돼 '현직' 전환 */}
          {endValue && (
            <ClearEndBtn
              type="button"
              aria-label="퇴임일 지우기"
              title="퇴임일 지우기"
              onClick={() => onEndChange('')}
            >
              <FiX size={16} />
            </ClearEndBtn>
          )}
        </EndFieldCell>
      ) : (
        endDateBtn
      )}
    </DateFieldsRow>
  )

  return (
    <>
      {renderControlOnly ? (
        <div style={{ width: '100%', minWidth: 0 }}>{dateButtons}</div>
      ) : (
        <FieldRow>
          <FieldLabel>
            {label}
            {required && <Required aria-label="필수" />}
          </FieldLabel>
          <FieldControl $variant="datePair">
            {dateButtons}
          </FieldControl>
        </FieldRow>
      )}

      <DatePickerModal
        isOpen={startModalOpen}
        onClose={handleStartClose}
        title={startPickerTitle}
        initialDate={startValue || undefined}
        onSelect={handleStartSelect}
      />
      <DatePickerModal
        isOpen={endModalOpen}
        onClose={handleEndClose}
        title={endPickerTitle}
        initialDate={endValue || undefined}
        onSelect={handleEndSelect}
      />
    </>
  )
}
