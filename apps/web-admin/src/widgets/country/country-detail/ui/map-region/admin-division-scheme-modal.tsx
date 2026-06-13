/**
 * 행정구역 체계 등록·수정 모달.
 * 체계 = 시기별 편제 (예: 팔도제 1413–1895). 이름 + 시행 기간 + 설명.
 * 수정 모드에서는 삭제도 가능 (소속 구역이 있으면 서버가 거부).
 */
import { useEffect, useState } from 'react'

import { FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import {
  type AdminDivisionScheme,
  type DivisionOwner,
  useCreateAdminDivisionScheme,
  useDeleteAdminDivisionScheme,
  useUpdateAdminDivisionScheme,
} from '@/entities/country/api.administrative-divisions'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'
import { confirm } from '@/shared/ui/confirm-dialog'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal'

import {
  Field,
  FieldFull,
  FooterBtn,
  FormGrid,
  HintText,
  Input,
  Label,
  Required,
} from './form-fields'

interface SchemeModalProps {
  isOpen: boolean
  owner: DivisionOwner
  /** 수정 시 대상, 등록 시 null */
  editing: AdminDivisionScheme | null
  onClose: () => void
  /** 등록 직후 그 체계를 활성화할 수 있게 ID 전달 */
  onCreated?: (schemeId: string) => void
}

/**
 * ISO 날짜를 한국어 라벨로 — BC 안전 파싱(date-picker-modal과 동일한 기원전 표기).
 * 네이티브 Date는 "-0412-…"(4자리 음수 연도)를 NaN으로 떨궈서 못 쓴다.
 */
function isoToYearLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  const p = parseIsoDateParts(iso)
  if (!p) return iso
  const prefix = p.year < 0 ? '기원전 ' : ''
  return `${prefix}${Math.abs(p.year)}년 ${p.month}월 ${p.day}일`
}

/** 백엔드 DATETIME이 기원전을 저장하지 못함 — 연도 1 미만이면 BCE 취급 */
function isBceDate(iso: string): boolean {
  const p = parseIsoDateParts(iso)
  return p != null && p.year < 1
}

export function AdminDivisionSchemeModal({
  isOpen,
  owner,
  editing,
  onClose,
  onCreated,
}: SchemeModalProps) {
  const createMut = useCreateAdminDivisionScheme(owner)
  const updateMut = useUpdateAdminDivisionScheme(owner)
  const deleteMut = useDeleteAdminDivisionScheme(owner)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [startPickerOpen, setStartPickerOpen] = useState(false)
  const [endPickerOpen, setEndPickerOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setName(editing?.name ?? '')
    setDescription(editing?.description ?? '')
    setStartDate(editing?.startDate ?? '')
    setEndDate(editing?.endDate ?? '')
    setError('')
  }, [isOpen, editing])

  if (!isOpen) return null

  const submitting =
    createMut.isPending || updateMut.isPending || deleteMut.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('체계 이름은 필수입니다')
      return
    }
    // 백엔드가 기원전 날짜를 저장하지 못함(DATETIME) — 400 나기 전에 막는다
    if ((startDate && isBceDate(startDate)) || (endDate && isBceDate(endDate))) {
      setError('기원전 날짜는 체계 시행일로 저장할 수 없습니다')
      return
    }
    if (startDate && endDate) {
      // dateSortKey는 BC(음수 연도)까지 부호 그대로 비교 가능한 정수 키
      const s = dateSortKey(startDate)
      const en = dateSortKey(endDate)
      if (s != null && en != null && s > en) {
        setError('종료일은 시작일 이후여야 합니다')
        return
      }
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          input: {
            name: name.trim(),
            description: description.trim() || null,
            startDate: startDate || null,
            endDate: endDate || null,
          },
        })
        toast.success('체계를 수정했습니다')
      } else {
        const created = await createMut.mutateAsync({
          ...owner,
          name: name.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
        })
        toast.success('체계를 등록했습니다')
        onCreated?.(created.id)
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장에 실패했습니다'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDelete = async () => {
    if (!editing) return
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${editing.name}" 체계를 삭제할까요?`,
        danger: true,
      }))
    )
      return
    try {
      await deleteMut.mutateAsync(editing.id)
      toast.success('체계를 삭제했습니다')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : '삭제에 실패했습니다'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox
        $maxWidth="480px"
        onClick={(e) => e.stopPropagation()}
        as="form"
        onSubmit={handleSubmit}
      >
        <ModalHeader>
          <ModalTitle>{editing ? '체계 수정' : '행정구역 체계 등록'}</ModalTitle>
          <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
            <FiX />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          {error && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: 12,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                color: '#b91c1c',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}
          <FormGrid>
            <FieldFull>
              <Label htmlFor="sch-name">
                체계 이름<Required>*</Required>
              </Label>
              <Input
                id="sch-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="예: 팔도제, 13도제, 50주 체제"
                autoFocus
              />
              <HintText>
                같은 국가의 시기별 편제를 구분합니다. 시기별로 등록해 두면 다른
                국가의 체계와 비교할 수 있습니다.
              </HintText>
            </FieldFull>

            <Field>
              <Label>시행 시작</Label>
              <SchemeDateButton
                value={startDate}
                placeholder="시작일 선택"
                onClick={() => setStartPickerOpen(true)}
                onClear={() => setStartDate('')}
              />
            </Field>
            <Field>
              <Label>시행 종료</Label>
              <SchemeDateButton
                value={endDate}
                placeholder="종료일 선택 (비우면 현행)"
                onClick={() => setEndPickerOpen(true)}
                onClear={() => setEndDate('')}
              />
            </Field>

            <FieldFull>
              <Label htmlFor="sch-desc">설명</Label>
              <Input
                id="sch-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 태종 13년 확립된 조선의 광역 행정 편제"
              />
            </FieldFull>
          </FormGrid>
        </ModalBody>
        <ModalFooter>
          {editing && (
            <FooterBtn
              type="button"
              onClick={handleDelete}
              disabled={submitting}
              style={{ marginRight: 'auto', color: '#dc2626' }}
            >
              삭제
            </FooterBtn>
          )}
          <FooterBtn type="button" onClick={onClose} disabled={submitting}>
            취소
          </FooterBtn>
          <FooterBtn type="submit" $primary disabled={submitting}>
            {submitting ? '저장 중…' : editing ? '수정' : '등록'}
          </FooterBtn>
        </ModalFooter>
      </ModalBox>

      <DatePickerModal
        isOpen={startPickerOpen}
        onClose={() => setStartPickerOpen(false)}
        onSelect={(date) => {
          setStartDate(date)
          setStartPickerOpen(false)
        }}
        initialDate={startDate || undefined}
        title="시행 시작일 선택"
      />
      <DatePickerModal
        isOpen={endPickerOpen}
        onClose={() => setEndPickerOpen(false)}
        onSelect={(date) => {
          setEndDate(date)
          setEndPickerOpen(false)
        }}
        initialDate={endDate || undefined}
        title="시행 종료일 선택"
      />
    </ModalOverlay>
  )
}

function SchemeDateButton({
  value,
  placeholder,
  onClick,
  onClear,
}: {
  value: string
  placeholder: string
  onClick: () => void
  onClear: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          padding: '9px 12px',
          fontSize: 13,
          fontWeight: value ? 600 : 400,
          textAlign: 'left',
          border: '1px solid #cbd5e1',
          borderRadius: 10,
          background: '#ffffff',
          color: value ? '#0f172a' : '#94a3b8',
          cursor: 'pointer',
        }}
      >
        {value ? isoToYearLabel(value) : placeholder}
      </button>
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="지우기"
          style={{
            padding: '0 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            background: '#ffffff',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
