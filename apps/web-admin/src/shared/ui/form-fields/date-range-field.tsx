/**
 * 취임일·퇴임일 등 기간 날짜 필드 - 달력(캘린더) input 공통
 * 라벨 + 취임일 버튼 + 퇴임일 버튼 + DatePickerModal 두 개
 */
import React, { useState } from 'react'
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
  /** 취임일 선택 후 퇴임일 모달 자동 오픈 (기본 true) */
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
  openEndAfterStart = true,
  renderControlOnly = false,
  startPickerTitle = '취임일 선택',
  endPickerTitle = '퇴임일 선택',
  blockBc = false,
  clearableEnd = false,
}) => {
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)

  /** blockBc 켜진 폼에서 BC 선택 차단 — 통과시키면 서버가 AD 미래 날짜로 잘못 저장한다 */
  const isBlockedBc = (date: string) => {
    if (blockBc && date.startsWith('-')) {
      notify.error('기원전(BC) 날짜는 이 기록에 사용할 수 없습니다.')
      return true
    }
    return false
  }

  const handleStartSelect = (date: string) => {
    if (isBlockedBc(date)) return
    onStartChange(date)
    setStartModalOpen(false)
    // 퇴임일이 아직 비어 있을 때만 자동 오픈 — 이미 선택했으면 취임일 재수정 시 다시 띄우지 않음
    if (openEndAfterStart && !endValue) setEndModalOpen(true)
  }

  const handleEndSelect = (date: string) => {
    if (isBlockedBc(date)) return
    onEndChange(date)
    setEndModalOpen(false)
  }

  const endDateBtn = (
    <DateFieldBtn
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
        onClose={() => setStartModalOpen(false)}
        title={startPickerTitle}
        initialDate={startValue || undefined}
        onSelect={handleStartSelect}
      />
      <DatePickerModal
        isOpen={endModalOpen}
        onClose={() => setEndModalOpen(false)}
        title={endPickerTitle}
        initialDate={endValue || undefined}
        onSelect={handleEndSelect}
      />
    </>
  )
}
