/**
 * 기본 정보 섹션 — title, description, dates(precision), location, category, keywords.
 */
import { useCallback, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import * as S from '../styles'
import { SectionCard } from '../section-card'
import { DatePrecisionInput } from './date-precision-input'
import type { EventEditorFormValues } from '../../model/schema'
import type { EventCategoryDto } from '@/shared/api/event-categories'

interface Props {
  categories: EventCategoryDto[]
}

export function BasicInfoSection({ categories }: Props) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<EventEditorFormValues>()

  const keywords = watch('keywords') ?? []
  const [keywordDraft, setKeywordDraft] = useState('')

  const addKeyword = useCallback(() => {
    const t = keywordDraft.trim()
    if (!t) return
    if (keywords.includes(t)) {
      setKeywordDraft('')
      return
    }
    setValue('keywords', [...keywords, t], { shouldDirty: true })
    setKeywordDraft('')
  }, [keywordDraft, keywords, setValue])

  const removeKeyword = useCallback(
    (kw: string) => {
      setValue(
        'keywords',
        keywords.filter((k) => k !== kw),
        { shouldDirty: true },
      )
    },
    [keywords, setValue],
  )

  return (
    <SectionCard
      id="basic"
      title="기본 정보"
      description="제목·일시·카테고리·장소처럼 사건을 식별하는 핵심 필드입니다."
    >
      <S.FieldGrid>
        {/* 제목 */}
        <S.FieldLabel>
          <span>
            사건명<S.RequiredMark>*</S.RequiredMark>
          </span>
          <S.TextInput
            {...register('title')}
            placeholder="예) 보불전쟁"
            autoFocus
          />
          {errors.title && <S.ErrorText>{errors.title.message}</S.ErrorText>}
        </S.FieldLabel>

        {/* 설명 */}
        <S.FieldLabel>
          <span>한 줄 설명</span>
          <S.TextArea
            {...register('description')}
            placeholder="이 사건을 한두 문장으로 요약합니다."
            rows={2}
          />
          <S.HelpText>
            목록·검색 결과에 노출되는 짧은 요약입니다. 자세한 본문은 ‘본문’
            섹션에서 작성하세요.
          </S.HelpText>
        </S.FieldLabel>

        {/* 카테고리 */}
        <S.FieldRow $cols={2}>
          <S.FieldLabel>
            <span>카테고리</span>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <S.NativeSelect
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || undefined
                    field.onChange(id)
                    const cat = categories.find((c) => c.id === id)
                    setValue('categoryName', cat?.name ?? undefined, {
                      shouldDirty: true,
                    })
                  }}
                >
                  <option value="">선택 안 함</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </S.NativeSelect>
              )}
            />
            <S.HelpText>
              ‘전쟁/전투/군사’ 또는 ‘회담/외교/조약’ 카테고리를 선택하면 그에
              맞는 상세 섹션이 사이드바에 추가됩니다.
            </S.HelpText>
          </S.FieldLabel>

          <S.FieldLabel>
            <span>장소 (자유 입력)</span>
            <S.TextInput
              {...register('location')}
              placeholder="예) 베르사유 궁전"
            />
            <S.HelpText>도시·행정구역 연결은 ‘위치’ 섹션에서.</S.HelpText>
          </S.FieldLabel>
        </S.FieldRow>

        {/* 일시 */}
        <S.FieldRow $cols={2}>
          <S.FieldLabel>
            <span>시작일</span>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DatePrecisionInput
                  value={field.value ?? { value: '' }}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.startDate && (
              <S.ErrorText>{errors.startDate.message as string}</S.ErrorText>
            )}
          </S.FieldLabel>

          <S.FieldLabel>
            <span>종료일</span>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DatePrecisionInput
                  value={field.value ?? { value: '' }}
                  onChange={field.onChange}
                  hint="시작일과 같은 정밀도로 입력하면 표시가 깔끔합니다."
                />
              )}
            />
            {errors.endDate && (
              <S.ErrorText>{errors.endDate.message as string}</S.ErrorText>
            )}
          </S.FieldLabel>
        </S.FieldRow>

        {/* 키워드 */}
        <S.FieldLabel>
          <span>키워드</span>
          <S.ChipRow>
            {keywords.map((kw) => (
              <S.Chip key={kw}>
                {kw}
                <S.ChipRemoveBtn
                  type="button"
                  aria-label={`${kw} 제거`}
                  onClick={() => removeKeyword(kw)}
                >
                  ×
                </S.ChipRemoveBtn>
              </S.Chip>
            ))}
            <S.TextInput
              style={{ width: 220 }}
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addKeyword()
                }
              }}
              onBlur={addKeyword}
              placeholder="Enter / , 로 추가"
            />
          </S.ChipRow>
          <S.HelpText>
            동일 사건 매핑·검색 보조에 쓰입니다. 짧은 단어 위주로.
          </S.HelpText>
        </S.FieldLabel>
      </S.FieldGrid>
    </SectionCard>
  )
}
