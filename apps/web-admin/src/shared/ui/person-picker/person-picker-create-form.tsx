/**
 * 인물 고르기 안의 '새 인물' 빠른 등록 — 검색해도 없을 때 그 자리에서 뼈대만 만든다.
 * 상세(생몰지·가족·약력)는 인물 페이지에서 보강한다.
 */
import { useState } from 'react'

import { createPerson, type PersonResponseDto } from '@/shared/api/persons'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { notify } from '@/shared/ui/toast'

import * as S from './person-picker.styles'

export function PersonPickerCreateForm({
  initialName,
  defaultCountryId,
  onCancel,
  onCreated,
}: {
  /** 검색어 — 이름 칸에 미리 채운다('찾다가 없음 → 등록'을 빠르게) */
  initialName: string
  defaultCountryId?: string
  onCancel: () => void
  onCreated: (person: PersonResponseDto, displayName: string) => void
}) {
  const [surname, setSurname] = useState('')
  const [name, setName] = useState(initialName)
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE'>('')
  const [birthYear, setBirthYear] = useState('')
  const [deathYear, setDeathYear] = useState('')
  const [era, setEra] = useState<'AD' | 'BC'>('AD')
  const [creating, setCreating] = useState(false)

  const toYear = (raw: string) => {
    const year = parseInt(raw, 10)
    return Number.isNaN(year) || year < 1 || year > 9999 ? null : year
  }

  const submit = async () => {
    if (!name.trim()) return notify.error('이름을 입력해 주세요.')
    if (!gender) return notify.error('성별을 골라 주세요.')
    setCreating(true)
    try {
      const birth = toYear(birthYear)
      const death = toYear(deathYear)
      const created = await createPerson({
        name: name.trim(),
        // 성 없는 인물(고대·외자 이름)도 있다 — 비우면 보내지 않는다
        ...(surname.trim() ? { surname: surname.trim() } : {}),
        gender,
        ...(defaultCountryId ? { countryId: defaultCountryId } : {}),
        ...(birth ? { birth: { era, year: birth } } : {}),
        ...(death ? { death: { era, year: death } } : {}),
      } as Parameters<typeof createPerson>[0])
      notify.success('인물을 등록했습니다.')
      onCreated(created, getPersonDisplayName(created))
    } catch (error) {
      notify.error((error as Error)?.message ?? '등록하지 못했습니다.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <S.CreateBody
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        void submit()
      }}
    >
      <S.CreateHint>
        필요한 것만 적어 바로 등록합니다. 생몰지·가족·약력은 인물 페이지에서 보강할 수 있습니다.
      </S.CreateHint>
      <S.CreateGrid>
        <S.CreateField>
          <S.CreateLabel htmlFor="person-picker-surname">성 (선택)</S.CreateLabel>
          <S.CreateInput
            id="person-picker-surname"
            value={surname}
            onChange={(changeEvent) => setSurname(changeEvent.target.value)}
            placeholder="예: 보나파르트"
            disabled={creating}
          />
        </S.CreateField>
        <S.CreateField>
          <S.CreateLabel htmlFor="person-picker-name">이름</S.CreateLabel>
          <S.CreateInput
            id="person-picker-name"
            value={name}
            onChange={(changeEvent) => setName(changeEvent.target.value)}
            placeholder="예: 나폴레옹"
            disabled={creating}
            autoFocus
          />
        </S.CreateField>
        <S.CreateField $span={2}>
          <S.CreateLabel as="span">성별</S.CreateLabel>
          <S.Segment role="radiogroup" aria-label="성별">
            {(['MALE', 'FEMALE'] as const).map((value) => (
              <S.SegmentItem
                key={value}
                type="button"
                role="radio"
                aria-checked={gender === value}
                $active={gender === value}
                onClick={() => setGender(value)}
                disabled={creating}
              >
                {value === 'MALE' ? '남성' : '여성'}
              </S.SegmentItem>
            ))}
          </S.Segment>
        </S.CreateField>
        <S.CreateField $span={2}>
          <S.CreateLabel as="span">생몰 연도 (선택)</S.CreateLabel>
          <S.CreateYears>
            <S.Segment role="radiogroup" aria-label="기원">
              {(['AD', 'BC'] as const).map((value) => (
                <S.SegmentItem
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={era === value}
                  $active={era === value}
                  onClick={() => setEra(value)}
                  disabled={creating}
                >
                  {value === 'AD' ? '서기' : '기원전'}
                </S.SegmentItem>
              ))}
            </S.Segment>
            <S.CreateInput
              aria-label="출생 연도"
              inputMode="numeric"
              value={birthYear}
              onChange={(changeEvent) => setBirthYear(changeEvent.target.value.replace(/\D/g, ''))}
              placeholder="출생 예: 1769"
              disabled={creating}
            />
            <span aria-hidden>~</span>
            <S.CreateInput
              aria-label="사망 연도"
              inputMode="numeric"
              value={deathYear}
              onChange={(changeEvent) => setDeathYear(changeEvent.target.value.replace(/\D/g, ''))}
              placeholder="사망 예: 1821"
              disabled={creating}
            />
          </S.CreateYears>
        </S.CreateField>
      </S.CreateGrid>
      <S.CreateActions>
        <S.GhostButton type="button" onClick={onCancel} disabled={creating}>
          검색으로 돌아가기
        </S.GhostButton>
        <S.PrimaryButton type="submit" disabled={creating}>
          {creating ? '등록 중…' : '등록하고 고르기'}
        </S.PrimaryButton>
      </S.CreateActions>
    </S.CreateBody>
  )
}
