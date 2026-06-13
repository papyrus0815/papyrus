import { useState } from 'react'
import { toast } from 'react-hot-toast'

import {
  useCountryRecords,
  useCreateCountryRecord,
  useUpdateCountryRecord,
  useDeleteCountryRecord,
} from '@/entities/country/api.records'
import { confirm } from '@/shared/ui/confirm-dialog'

import * as S from './styles'

interface Props {
  countryId: string
}

export function RecordsPanel({ countryId }: Props) {
  const { data: records = [], isLoading } = useCountryRecords(countryId)
  const createMut = useCreateCountryRecord(countryId)
  const updateMut = useUpdateCountryRecord(countryId)
  const deleteMut = useDeleteCountryRecord(countryId)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [recordedAt, setRecordedAt] = useState('')

  const reset = () => {
    setEditingId(null)
    setDescription('')
    setRecordedAt('')
  }

  const startEdit = (id: string, desc: string, at: string) => {
    setEditingId(id)
    setDescription(desc)
    setRecordedAt(at.slice(0, 10))
  }

  const handleSave = async () => {
    if (!description.trim()) {
      toast.error('기록 내용을 입력하세요')
      return
    }
    const recordedAtIso = recordedAt
      ? new Date(recordedAt).toISOString()
      : undefined
    try {
      if (editingId) {
        await updateMut.mutateAsync({
          recordId: editingId,
          dto: { description: description.trim(), recordedAt: recordedAtIso },
        })
      } else {
        await createMut.mutateAsync({
          description: description.trim(),
          recordedAt: recordedAtIso,
        })
      }
      toast.success('저장됨')
      reset()
    } catch {
      toast.error('저장 실패')
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: '이 기록을 삭제할까요?',
        danger: true,
      }))
    )
      return
    try {
      await deleteMut.mutateAsync(id)
      toast.success('삭제됨')
      if (editingId === id) reset()
    } catch {
      toast.error('삭제 실패')
    }
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div>
      <S.TableScroll>
        <S.Table>
          <thead>
            <tr>
              <th>일자</th>
              <th style={{ textAlign: 'left' }}>내용</th>
              <th aria-label="작업" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3}>
                  <S.EmptyHint>불러오는 중…</S.EmptyHint>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <S.EmptyHint>등록된 기록이 없습니다.</S.EmptyHint>
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{r.recordedAt.slice(0, 10)}</td>
                  <td style={{ textAlign: 'left', whiteSpace: 'normal' }}>
                    {r.description}
                  </td>
                  <td>
                    <S.RowActions>
                      <S.IconBtn
                        type="button"
                        onClick={() =>
                          startEdit(r.id, r.description, r.recordedAt)
                        }
                      >
                        수정
                      </S.IconBtn>
                      <S.IconBtn
                        type="button"
                        $danger
                        onClick={() => handleDelete(r.id)}
                      >
                        삭제
                      </S.IconBtn>
                    </S.RowActions>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </S.Table>
      </S.TableScroll>

      <S.FormGrid style={{ gridTemplateColumns: '160px 1fr' }}>
        <S.Field>
          기록 일자
          <S.Input
            type="date"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
          />
        </S.Field>
        <S.Field>
          내용 *
          <S.TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="국가 관련 기록을 입력하세요"
          />
        </S.Field>
      </S.FormGrid>

      <S.FormBar>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {editingId ? '기록 수정 중' : '새 기록 추가'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {editingId && (
            <S.GhostButton type="button" onClick={reset}>
              취소
            </S.GhostButton>
          )}
          <S.PrimaryButton type="button" onClick={handleSave} disabled={isPending}>
            {editingId ? '수정 저장' : '추가'}
          </S.PrimaryButton>
        </div>
      </S.FormBar>
    </div>
  )
}
