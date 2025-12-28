// ==================== Before (기존 코드) ====================

// 4개의 모달이 각각 80~120줄씩 반복

{/* 국가 형태 선택 모달 */}
{showStateTypeModal
  ? createPortal(
      <>
        <S.SelectModalOverlay
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowStateTypeModal(false)}
        />
        <S.SelectModal
          as={motion.div}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* ... 많은 중복 코드 ... */}
        </S.SelectModal>
      </>,
      document.body,
    )
  : null}

// ==================== After (리팩토링) ====================

import { SelectModal, SelectOption } from '@/shared/ui/select-modal'

// 1. 옵션 정의를 SelectOption 타입으로 변환
const stateTypeOptions: SelectOption[] = STATE_TYPE_OPTIONS.map(opt => ({
  value: opt.value,
  label: opt.label,
  icon: opt.icon,
  description: opt.desc,
}))

const eraOptions: SelectOption[] = [
  {
    value: 'BC',
    label: '기원전 (BC)',
    icon: '📜',
    description: 'Before Christ - 서기 이전 시대',
  },
  {
    value: 'AD',
    label: '기원후 (AD)',
    icon: '📅',
    description: 'Anno Domini - 서기 이후 시대',
  },
]

const modernCountryOptions: SelectOption[] = modernCountries.map(country => ({
  value: country.id,
  label: country.name,
  icon: '🌍',
}))

// 2. 모달 렌더링 (각 10줄 정도)
<>
  {/* 국가 형태 선택 모달 */}
  <SelectModal
    isOpen={showStateTypeModal}
    onClose={() => setShowStateTypeModal(false)}
    title="국가 형태 선택"
    options={stateTypeOptions}
    selectedValue={selectedStateType}
    onSelect={(value) => {
      setValue('stateType', value, { shouldValidate: true })
      setShowStateTypeModal(false)
    }}
  />

  {/* 시작 기원 선택 모달 */}
  <SelectModal
    isOpen={showStartEraModal}
    onClose={() => setShowStartEraModal(false)}
    title="시작 기원 선택"
    options={eraOptions}
    selectedValue={selectedStartEra}
    onSelect={(era) => {
      setValue('startEra', era as 'BC' | 'AD', { shouldValidate: true })
      setShowStartEraModal(false)
    }}
  />

  {/* 종료 기원 선택 모달 */}
  <SelectModal
    isOpen={showEndEraModal}
    onClose={() => setShowEndEraModal(false)}
    title="종료 기원 선택"
    options={eraOptions}
    selectedValue={selectedEndEra}
    onSelect={(era) => {
      setValue('endEra', era as 'BC' | 'AD', { shouldValidate: true })
      setShowEndEraModal(false)
    }}
  />

  {/* 현대 국가 선택 모달 (다중) */}
  <SelectModal
    isOpen={showModernCountryModal}
    onClose={() => setShowModernCountryModal(false)}
    title="상위 현대 국가 선택 (여러 개 선택 가능)"
    options={modernCountryOptions}
    multiple
    selectedValues={selectedModernCountries}
    onSelect={handleModernCountryToggle}
    headerExtra={
      selectedModernCountries.length > 0 && (
        <div
          style={{
            padding: '12px',
            background: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '14px', color: '#374151' }}>
            {selectedModernCountries.length}개 선택됨
          </span>
          <button
            type="button"
            onClick={handleClearModernCountries}
            style={{
              padding: '4px 12px',
              fontSize: '13px',
              color: '#dc2626',
              background: 'white',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            전체 해제
          </button>
        </div>
      )
    }
  />
</>

// ==================== 결과 ====================
// - 코드 줄 수: 380줄 → 70줄 (약 80% 감소)
// - 유지보수: 4곳 수정 → 1곳 수정
// - 재사용성: 다른 Form에서도 즉시 사용 가능
// - 타입 안정성: TypeScript Generic으로 타입 보장

