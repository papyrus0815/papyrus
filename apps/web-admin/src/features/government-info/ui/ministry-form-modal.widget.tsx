import {
  useMemo,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'

import { motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'

import { useHistoricalCountriesByModernCountry } from '@/features/country/api/use-historical-countries-by-modern-country.hook'
import type { MinistryFormFields } from '@/features/government-info/model/ministry-form-fields'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import {
  type AdministrationDepartment,
  type AdministrationDepartmentCategory,
  type AdministrationDepartmentKind,
  DEPARTMENT_KIND_OPTIONS,
} from '@/shared/api/administration-department'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import type { SelectOption } from '@/shared/ui/select-modal/select-modal'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'
import { isDefenseRelatedCategory } from '@/shared/lib/ministry-department/ministry-department-utils'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import {
  FieldLabel,
  FormFieldRow,
  FormInputField,
  FormSelectBtn,
  FormTextareaField,
  MinistryFormModalBody,
  MinistryFormModalBox,
} from './ministry-form.styles'

export type MinistryFormModalProps = {
  effectiveCountryId: string | undefined
  isHistorical?: boolean
  isOpen: boolean
  isDark: boolean
  editingMinistry: AdministrationDepartment | null
  ministryForm: MinistryFormFields
  setMinistryForm: Dispatch<SetStateAction<MinistryFormFields>>
  ministriesList: AdministrationDepartment[]
  categoriesList: AdministrationDepartmentCategory[]
  closeMinistryFormModal: () => void
  submitMinistryForm: () => void
  thumbnailInputRef: RefObject<HTMLInputElement | null>
  thumbnailUploading: boolean
  setThumbnailUploading: (value: boolean) => void
  establishedDateModalOpen: boolean
  setEstablishedDateModalOpen: (value: boolean) => void
  abolishedDateModalOpen: boolean
  setAbolishedDateModalOpen: (value: boolean) => void
  categorySelectOpen: boolean
  setCategorySelectOpen: (value: boolean) => void
  parentSelectOpen: boolean
  setParentSelectOpen: (value: boolean) => void
  successorSelectOpen: boolean
  setSuccessorSelectOpen: (value: boolean) => void
}

export function MinistryFormModal({
  effectiveCountryId,
  isHistorical = false,
  isOpen,
  isDark,
  editingMinistry,
  ministryForm,
  setMinistryForm,
  ministriesList,
  categoriesList,
  closeMinistryFormModal,
  submitMinistryForm,
  thumbnailInputRef,
  thumbnailUploading,
  setThumbnailUploading,
  establishedDateModalOpen,
  setEstablishedDateModalOpen,
  abolishedDateModalOpen,
  setAbolishedDateModalOpen,
  categorySelectOpen,
  setCategorySelectOpen,
  parentSelectOpen,
  setParentSelectOpen,
  successorSelectOpen,
  setSuccessorSelectOpen,
}: MinistryFormModalProps) {
  const palette = useMemo(() => getCabinetsSectionPalette(isDark), [isDark])
  const [historicalCountrySelectOpen, setHistoricalCountrySelectOpen] =
    useState(false)
  const { data: linkedHistoricalCountries = [] } =
    useHistoricalCountriesByModernCountry(
      isOpen && !isHistorical && effectiveCountryId ? effectiveCountryId : '',
    )

  if (!effectiveCountryId || !isOpen) return null

  return createPortal(
    <>
      <ModalOverlay
        role="dialog"
        aria-modal="true"
        aria-labelledby="ministry-form-modal-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMinistryFormModal()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(event) => event.stopPropagation()}
        >
          <MinistryFormModalBox>
            <ModalHeader>
              <ModalTitle id="ministry-form-modal-title">
                {editingMinistry ? '부처 수정' : '부처 등록'}
              </ModalTitle>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={submitMinistryForm}
                  style={{
                    padding: '10px 20px',
                    background: palette.accent,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                  }}
                >
                  {editingMinistry ? '저장' : '등록'}
                </button>
                <ModalCloseButton
                  type="button"
                  onClick={closeMinistryFormModal}
                  aria-label="닫기"
                >
                  <FiX size={22} strokeWidth={2} />
                </ModalCloseButton>
              </div>
            </ModalHeader>
            <MinistryFormModalBody>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  event.target.value = ''
                  try {
                    validateImageFile(file)
                    setThumbnailUploading(true)
                    const res = await uploadImage(file, 'ministries')
                    setMinistryForm((prev) => ({
                      ...prev,
                      thumbnailUrl: res.url,
                    }))
                  } catch (err) {
                    notify.error(
                      err instanceof Error
                        ? err.message
                        : '이미지 업로드에 실패했습니다.',
                    )
                  } finally {
                    setThumbnailUploading(false)
                  }
                }}
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 24,
                }}
              >
                <FormFieldRow>
                  <FieldLabel>썸네일</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => thumbnailInputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          thumbnailInputRef.current?.click()
                        }
                      }}
                      style={{
                        width: '100%',
                        maxWidth: 280,
                        aspectRatio: '16/10',
                        borderRadius: 14,
                        border: `2px dashed ${palette.borderMid}`,
                        background: ministryForm.thumbnailUrl
                          ? 'transparent'
                          : palette.bgSubtle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: thumbnailUploading ? 'wait' : 'pointer',
                      }}
                    >
                      {thumbnailUploading ? (
                        <span style={{ fontSize: 13, color: palette.textMuted }}>
                          업로드 중…
                        </span>
                      ) : ministryForm.thumbnailUrl ? (
                        <img
                          src={getUploadImageUrl(
                            ministryForm.thumbnailUrl,
                          )}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 13, color: palette.textMuted }}>
                          이미지 선택
                        </span>
                      )}
                    </div>
                    {ministryForm.thumbnailUrl && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setMinistryForm((prev) => ({
                            ...prev,
                            thumbnailUrl: '',
                          }))
                        }}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 4,
                          padding: '6px 12px',
                          fontSize: 12,
                          border: `1px solid ${palette.borderMid}`,
                          borderRadius: 10,
                          background: palette.btnBg,
                          color: palette.textMuted,
                          cursor: 'pointer',
                        }}
                      >
                        제거
                      </button>
                    )}
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>
                    부처명 <span style={{ color: palette.danger }}>*</span>
                  </FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <FormInputField
                      value={ministryForm.name}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="예: 기획재정부"
                    />
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>기관 종류</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {DEPARTMENT_KIND_OPTIONS.map((opt) => {
                      const active = (ministryForm.kind || 'MINISTRY') === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              kind: opt.value as AdministrationDepartmentKind,
                            }))
                          }
                          style={{
                            padding: '7px 13px',
                            borderRadius: 10,
                            border: `1px solid ${active ? palette.accent : palette.borderMid}`,
                            background: active ? palette.accentBg : palette.inputBg,
                            color: active ? palette.accent : palette.text,
                            fontSize: 12.5,
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>원어명 · 영문명 · 약칭</FieldLabel>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 120px',
                      gap: 8,
                    }}
                  >
                    <FormInputField
                      value={ministryForm.nameLocal}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          nameLocal: event.target.value,
                        }))
                      }
                      placeholder="원어명 (예: 吏曹, OKW)"
                    />
                    <FormInputField
                      value={ministryForm.nameEn}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          nameEn: event.target.value,
                        }))
                      }
                      placeholder="영문명 (예: Ministry of Economy)"
                    />
                    <FormInputField
                      value={ministryForm.abbreviation}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          abbreviation: event.target.value,
                        }))
                      }
                      placeholder="약칭 (기재부)"
                    />
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>
                    카테고리 <span style={{ color: palette.danger }}>*</span>
                  </FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <FormSelectBtn
                      type="button"
                      $hasValue={!!ministryForm.categoryId}
                      onClick={() => setCategorySelectOpen(true)}
                    >
                      <span>
                        {ministryForm.categoryId
                          ? (categoriesList.find(
                              (category) =>
                                category.id === ministryForm.categoryId,
                            )?.name ?? '')
                          : '선택'}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          flexShrink: 0,
                          marginLeft: 8,
                          opacity: 0.5,
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </FormSelectBtn>
                    <span style={{ fontSize: 12, color: palette.textMuted }}>
                      같은 카테고리에 여러 부처 등록 가능 (예: 전쟁부·국방부)
                    </span>
                  </div>
                </FormFieldRow>

                {!isHistorical && linkedHistoricalCountries.length > 0 && (
                  <FormFieldRow>
                    <FieldLabel>소속 시대 · 정체</FieldLabel>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <FormSelectBtn
                        type="button"
                        $hasValue={true}
                        onClick={() => setHistoricalCountrySelectOpen(true)}
                      >
                        <span>
                          {ministryForm.historicalCountryId
                            ? (linkedHistoricalCountries.find(
                                (hc) =>
                                  hc.id === ministryForm.historicalCountryId,
                              )?.name ??
                              editingMinistry?.historicalCountry?.name ??
                              '역사적 국가')
                            : '현대 국가 직속 (현재 체제)'}
                        </span>
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            flexShrink: 0,
                            marginLeft: 8,
                            opacity: 0.5,
                          }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </FormSelectBtn>
                      <span style={{ fontSize: 12, color: palette.textMuted }}>
                        과거 왕조·제국 시대의 기관(예: 조선 6조, 일본 제국 성)이면 해당 역사적 국가를 선택하세요
                      </span>
                    </div>
                  </FormFieldRow>
                )}

                <FormFieldRow>
                  <FieldLabel>상위 부처</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <FormSelectBtn
                      type="button"
                      $hasValue={!!ministryForm.parentId}
                      onClick={() => setParentSelectOpen(true)}
                    >
                      <span>
                        {ministryForm.parentId
                          ? (ministriesList.find(
                              (dept) => dept.id === ministryForm.parentId,
                            )?.name ?? '')
                          : '선택'}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          flexShrink: 0,
                          marginLeft: 8,
                          opacity: 0.5,
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </FormSelectBtn>
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>설립일 · 폐지일</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEstablishedDateModalOpen(true)}
                      style={{
                        padding: '10px 18px',
                        border: `1px solid ${palette.borderMid}`,
                        borderRadius: 12,
                        fontSize: 13,
                        color: ministryForm.establishedDate
                          ? palette.text
                          : palette.placeholderText,
                        background: ministryForm.establishedDate
                          ? palette.accentBg
                          : palette.inputBg,
                        cursor: 'pointer',
                        minWidth: 140,
                      }}
                    >
                      {ministryForm.establishedDate
                        ? ministryForm.establishedDate.replace(/-/g, '.')
                        : '설립일 선택'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbolishedDateModalOpen(true)}
                      style={{
                        padding: '10px 18px',
                        border: `1px solid ${palette.borderMid}`,
                        borderRadius: 12,
                        fontSize: 13,
                        color: ministryForm.abolishedDate
                          ? palette.text
                          : palette.placeholderText,
                        background: ministryForm.abolishedDate
                          ? palette.dangerBg
                          : palette.inputBg,
                        cursor: 'pointer',
                        minWidth: 140,
                      }}
                    >
                      {ministryForm.abolishedDate
                        ? ministryForm.abolishedDate.replace(/-/g, '.')
                        : '폐지일 선택'}
                    </button>
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>후신 부처</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <FormSelectBtn
                      type="button"
                      $hasValue={!!ministryForm.successorId}
                      onClick={() => setSuccessorSelectOpen(true)}
                    >
                      <span>
                        {ministryForm.successorId
                          ? (ministriesList.find(
                              (dept) => dept.id === ministryForm.successorId,
                            )?.name ?? '')
                          : '선택'}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                          flexShrink: 0,
                          marginLeft: 8,
                          opacity: 0.5,
                        }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </FormSelectBtn>
                  </div>
                </FormFieldRow>

                <FormFieldRow>
                  <FieldLabel>설명</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <FormTextareaField
                      value={ministryForm.description}
                      onChange={(event) =>
                        setMinistryForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="역할, 담당 업무 등"
                      rows={2}
                    />
                  </div>
                </FormFieldRow>

                {isDefenseRelatedCategory(
                  categoriesList.find(
                    (category) => category.id === ministryForm.categoryId,
                  ) ?? null,
                  ministryForm.kind,
                ) ? (
                  <>
                    <div
                      style={{
                        marginTop: 8,
                        paddingTop: 22,
                        borderTop: `1px solid ${palette.divider}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 18,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: palette.sectionHeading,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          국방·군사 기관 추가 정보
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: isDark ? '#a5b4fc' : palette.accent,
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: palette.accentBg,
                            border: `1px solid ${palette.accentBorder}`,
                          }}
                        >
                          선택
                        </span>
                      </div>
                      <p
                        style={{
                          margin: '0 0 18px',
                          fontSize: 12.5,
                          color: palette.textMuted,
                          lineHeight: 1.55,
                        }}
                      >
                        영문 명칭, 관할, 본부, 지휘체계 등을 나누어 적으면 상세
                        화면에서 카드로 정리되어 보입니다. 저장 시 설명 필드에
                        함께 기록됩니다.
                      </p>
                    </div>

                    <FormFieldRow>
                      <FieldLabel>영문·공식 명칭</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <FormInputField
                          value={ministryForm.defenseOfficialNameEn}
                          onChange={(event) =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              defenseOfficialNameEn: event.target.value,
                            }))
                          }
                          placeholder="e.g. Ministry of National Defense"
                        />
                      </div>
                    </FormFieldRow>

                    <FormFieldRow>
                      <FieldLabel>주요 임무·관할</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <FormTextareaField
                          value={ministryForm.defenseMissionScope}
                          onChange={(event) =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              defenseMissionScope: event.target.value,
                            }))
                          }
                          placeholder="국방 정책 수립, 군 통수, 예산·전력 등"
                          rows={3}
                        />
                      </div>
                    </FormFieldRow>

                    <FormFieldRow>
                      <FieldLabel>본부·주요 거점</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <FormTextareaField
                          value={ministryForm.defenseHeadquarters}
                          onChange={(event) =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              defenseHeadquarters: event.target.value,
                            }))
                          }
                          placeholder="예: 서울 용산, 세종 등"
                          rows={2}
                        />
                      </div>
                    </FormFieldRow>

                    <FormFieldRow>
                      <FieldLabel>지휘·산하 구조</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <FormTextareaField
                          value={ministryForm.defenseOrgStructure}
                          onChange={(event) =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              defenseOrgStructure: event.target.value,
                            }))
                          }
                          placeholder="합참, 육·해·공군 본부, 국직 부대 등 관계"
                          rows={3}
                        />
                      </div>
                    </FormFieldRow>

                    <FormFieldRow>
                      <FieldLabel>국방비·병력·기타 참고</FieldLabel>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <FormTextareaField
                          value={ministryForm.defenseBudgetOrForcesNote}
                          onChange={(event) =>
                            setMinistryForm((prev) => ({
                              ...prev,
                              defenseBudgetOrForcesNote: event.target.value,
                            }))
                          }
                          placeholder="공개 가능한 수준의 참고 수치·비고"
                          rows={2}
                        />
                      </div>
                    </FormFieldRow>
                  </>
                ) : null}
              </div>
            </MinistryFormModalBody>
          </MinistryFormModalBox>
        </motion.div>
      </ModalOverlay>
      <DatePickerModal
        isOpen={establishedDateModalOpen}
        onClose={() => setEstablishedDateModalOpen(false)}
        onSelect={(date) => {
          setMinistryForm((prev) => ({ ...prev, establishedDate: date }))
          setEstablishedDateModalOpen(false)
        }}
        initialDate={ministryForm.establishedDate || undefined}
        title="설립일 선택"
      />
      <DatePickerModal
        isOpen={abolishedDateModalOpen}
        onClose={() => setAbolishedDateModalOpen(false)}
        onSelect={(date) => {
          setMinistryForm((prev) => ({ ...prev, abolishedDate: date }))
          setAbolishedDateModalOpen(false)
        }}
        initialDate={ministryForm.abolishedDate || undefined}
        title="폐지일 선택"
      />
      {!isHistorical && linkedHistoricalCountries.length > 0 && (
        <SelectModal
          isOpen={historicalCountrySelectOpen}
          onClose={() => setHistoricalCountrySelectOpen(false)}
          title="소속 시대 · 정체 선택"
          options={
            [
              { value: '', label: '현대 국가 직속 (현재 체제)' },
              ...linkedHistoricalCountries.map((hc) => ({
                value: hc.id,
                label: hc.name,
              })),
            ] as SelectOption[]
          }
          selectedValue={ministryForm.historicalCountryId}
          onSelect={(selectedId) => {
            setMinistryForm((prev) => ({
              ...prev,
              historicalCountryId: selectedId,
            }))
            setHistoricalCountrySelectOpen(false)
          }}
        />
      )}
      <SelectModal
        isOpen={categorySelectOpen}
        onClose={() => setCategorySelectOpen(false)}
        title="카테고리 선택"
        options={
          categoriesList.map((category) => ({
            value: category.id,
            label: `${category.name}${category.nameEn ? ` (${category.nameEn})` : ''}`,
          })) as SelectOption[]
        }
        selectedValue={ministryForm.categoryId || undefined}
        onSelect={(selectedId) => {
          setMinistryForm((prev) => ({ ...prev, categoryId: selectedId }))
          setCategorySelectOpen(false)
        }}
      />
      <SelectModal
        isOpen={parentSelectOpen}
        onClose={() => setParentSelectOpen(false)}
        title="상위 부처 선택"
        options={
          [
            { value: '', label: '없음' },
            ...ministriesList
              .filter(
                (dept) =>
                  (!editingMinistry || dept.id !== editingMinistry.id) &&
                  (isHistorical ||
                    (dept.historicalCountryId ?? '') ===
                      (ministryForm.historicalCountryId ?? '')),
              )
              .map((dept) => ({
                value: dept.id,
                label: dept.historicalCountry?.name
                  ? `${dept.name} (${dept.historicalCountry.name})`
                  : dept.name,
              })),
          ] as SelectOption[]
        }
        selectedValue={ministryForm.parentId}
        onSelect={(selectedId) => {
          setMinistryForm((prev) => ({ ...prev, parentId: selectedId }))
          setParentSelectOpen(false)
        }}
      />
      <SelectModal
        isOpen={successorSelectOpen}
        onClose={() => setSuccessorSelectOpen(false)}
        title="후신 부처 선택"
        options={
          [
            { value: '', label: '없음' },
            ...ministriesList
              .filter(
                (dept) => !editingMinistry || dept.id !== editingMinistry.id,
              )
              .map((dept) => ({
                value: dept.id,
                label: dept.historicalCountry?.name
                  ? `${dept.name} (${dept.historicalCountry.name})`
                  : dept.name,
              })),
          ] as SelectOption[]
        }
        selectedValue={ministryForm.successorId}
        onSelect={(selectedId) => {
          setMinistryForm((prev) => ({
            ...prev,
            successorId: selectedId,
          }))
          setSuccessorSelectOpen(false)
        }}
      />
    </>,
    document.body,
  )
}
