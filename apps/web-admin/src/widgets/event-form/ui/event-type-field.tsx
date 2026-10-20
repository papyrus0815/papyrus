/**
 * 등록 모달 — **사건 유형** 칸. 사건명 바로 아래, 기간보다 앞.
 *
 * 유형(형식)이 '무엇을 기록할지'를 정한다(entities/event/model/event-type-registry.ts). 그래서 등록의
 * 두 번째 결정이다 — 고르면 분야·묶음 여부의 기본값이 따라오고, 아래 '기록' 묶음에 그 유형의 핵심
 * 기록 칸이 선다. 26종을 한 줄에 늘어놓으면 고를 수 없으니 계열(무력 충돌·외교·국가·권력…)로 줄을 나눈다.
 */
import styled from 'styled-components'

import {
  EVENT_TYPE_FAMILIES,
  EVENT_TYPES,
  type EventTypeKey,
  FACET_LABEL,
} from '@/entities/event/model/event-type-registry'
import {
  KitChipGroup,
  KitChoiceChip,
  KitGroupLabel,
} from '@/shared/ui/register-form-kit/register-form-kit'

interface EventTypeFieldProps {
  value: EventTypeKey | null
  onChange: (next: EventTypeKey) => void
  /** 제출을 눌렀는데 아직 안 골랐을 때 */
  error?: string
}

export function EventTypeField({ value, onChange, error }: EventTypeFieldProps) {
  const selected = value ? EVENT_TYPES[value] : null
  return (
    <Wrap>
      <Families role="radiogroup" aria-label="사건 유형" aria-invalid={Boolean(error) || undefined}>
        {EVENT_TYPE_FAMILIES.map((family) => (
          <FamilyRow key={family.key}>
            <FamilyLabel as="span">{family.label}</FamilyLabel>
            <KitChipGroup>
              {family.types.map((type) => (
                <KitChoiceChip
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={value === type}
                  $selected={value === type}
                  $error={Boolean(error)}
                  title={EVENT_TYPES[type].examples}
                  onClick={() => onChange(type)}
                >
                  {EVENT_TYPES[type].label}
                </KitChoiceChip>
              ))}
            </KitChipGroup>
          </FamilyRow>
        ))}
      </Families>
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {selected ? (
        <Summary>
          <span>예: {selected.examples}</span>
          {selected.core.length > 0 && (
            <span>
              핵심 기록 <b>{selected.core.map((facet) => FACET_LABEL[facet]).join(' · ')}</b> — 아래 &lsquo;기록&rsquo;에서 바로
              적습니다
            </span>
          )}
        </Summary>
      ) : (
        <Summary>무엇을 기록할지가 유형에 따라 달라집니다 — 전투면 교전 양측, 조약 체결이면 맺어진 조약.</Summary>
      )}
    </Wrap>
  )
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Families = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FamilyRow = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: start;
  gap: 10px;

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
`

const FamilyLabel = styled(KitGroupLabel)`
  padding-top: 9px;
  margin: 0;

  @media (max-width: 560px) {
    padding-top: 0;
  }
`

const Summary = styled.p`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const ErrorText = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.alert.danger.fg};
`
