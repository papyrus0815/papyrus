import { useEffect, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { ledgerAccent } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import { TERRITORY_METHODS, type TerritoryTransferInput, type TerritoryTransferMethod } from '@/shared/api/territory-transfers'
import { CountryPicker } from '@/shared/ui/country-picker'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'

import { type TerritoryParty, partyKey } from './territory-transfer.lib'

/**
 * 영토 이전 한 줄 쓰기 — "이 사건으로 [지역]이 [내준 나라]에서 [받은 나라]로 [방식]".
 *
 * 나라는 이 사건의 참여국을 먼저 칩으로(대부분 거기 있다), 없으면 '다른 나라'(공용 국가 피커), 등록되지 않은 주체는
 * '이름으로'(자유시·위임통치령). 면적·인구·근거 조약·발효 시점은 알 때만.
 */

export interface TerritoryDraft {
  id?: string
  from: TerritoryParty
  to: TerritoryParty
  regionName: string
  method: TerritoryTransferMethod
  areaKm2: string
  population: string
  treatyId: string | null
  effectiveEra: 'BC' | 'AD'
  effectiveYear: string
  effectiveMonth: string
  effectiveDay: string
  note: string
}

const EMPTY_PARTY: TerritoryParty = { countryId: null, historicalCountryId: null, name: null }

export function emptyTerritoryDraft(defaults?: Partial<TerritoryDraft>): TerritoryDraft {
  return {
    from: EMPTY_PARTY,
    to: EMPTY_PARTY,
    regionName: '',
    method: 'CESSION',
    areaKm2: '',
    population: '',
    treatyId: null,
    effectiveEra: 'AD',
    effectiveYear: '',
    effectiveMonth: '',
    effectiveDay: '',
    note: '',
    ...defaults,
  }
}

const toInt = (text: string) => {
  const digits = text.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

/** 쓴 줄 → 보낼 입력 */
export function draftToInput(draft: TerritoryDraft): TerritoryTransferInput {
  const year = toInt(draft.effectiveYear)
  const month = year != null ? toInt(draft.effectiveMonth) : null
  return {
    ...(draft.id ? { id: draft.id } : {}),
    fromCountryId: draft.from.countryId,
    fromHistoricalCountryId: draft.from.historicalCountryId,
    fromName: draft.from.countryId || draft.from.historicalCountryId ? null : draft.from.name,
    toCountryId: draft.to.countryId,
    toHistoricalCountryId: draft.to.historicalCountryId,
    toName: draft.to.countryId || draft.to.historicalCountryId ? null : draft.to.name,
    regionName: draft.regionName.trim(),
    method: draft.method,
    areaKm2: toInt(draft.areaKm2),
    population: toInt(draft.population),
    treatyId: draft.treatyId,
    effectiveEra: year != null ? draft.effectiveEra : null,
    effectiveYear: year,
    effectiveMonth: month,
    effectiveDay: month != null ? toInt(draft.effectiveDay) : null,
    note: draft.note.trim() || null,
  }
}

interface TerritoryTransferModalProps {
  isOpen: boolean
  onClose: () => void
  initial: TerritoryDraft
  /** 이 사건의 참여국 — 나라 칩 */
  participants: TerritoryParty[]
  /** 이 사건에 걸린 조약 — 근거 조약 칩 */
  treaties: Array<{ id: string; name: string }>
  saving: boolean
  onSave: (draft: TerritoryDraft) => void
}

export function TerritoryTransferModal({
  isOpen,
  onClose,
  initial,
  participants,
  treaties,
  saving,
  onSave,
}: TerritoryTransferModalProps) {
  const [draft, setDraft] = useState(initial)
  const [pickerSide, setPickerSide] = useState<'from' | 'to' | null>(null)
  const [namingSide, setNamingSide] = useState<'from' | 'to' | null>(null)
  useEffect(() => {
    if (isOpen) {
      setDraft(initial)
      setNamingSide(null)
    }
    // 열릴 때만 처음 상태로
  }, [isOpen])

  const { data: modernCountries = [], isLoading: modernLoading } = useQuery({
    queryKey: ['countries', 'all'],
    queryFn: getAllCountries,
    enabled: pickerSide !== null,
    staleTime: 5 * 60_000,
  })
  const { data: historicalCountries = [], isLoading: historicalLoading } = useQuery({
    queryKey: ['historical-countries', 'all'],
    queryFn: getAllHistoricalCountries,
    enabled: pickerSide !== null,
    staleTime: 5 * 60_000,
  })

  const update = (patch: Partial<TerritoryDraft>) => setDraft((previous) => ({ ...previous, ...patch }))
  const fromKey = partyKey(draft.from)
  const toKey = partyKey(draft.to)
  const sameParty = Boolean(fromKey) && fromKey === toKey
  const missingParty = !fromKey && !toKey
  const canSave = draft.regionName.trim().length > 0 && !sameParty && !missingParty && !saving

  const partyField = (side: 'from' | 'to', label: string) => {
    const current = draft[side]
    const currentKey = partyKey(current)
    const inParticipants = participants.some((party) => partyKey(party) === currentKey)
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <Chips role="group" aria-label={label}>
          {participants.map((party) => {
            const key = partyKey(party)
            return (
              <Chip
                key={key}
                type="button"
                aria-pressed={key === currentKey}
                onClick={() => update({ [side]: key === currentKey ? EMPTY_PARTY : party })}
              >
                {party.name}
              </Chip>
            )
          })}
          {currentKey && !inParticipants && (
            <Chip type="button" aria-pressed onClick={() => update({ [side]: EMPTY_PARTY })}>
              {current.name}
            </Chip>
          )}
          <Chip type="button" data-ghost onClick={() => setPickerSide(side)}>
            다른 나라…
          </Chip>
          <Chip type="button" data-ghost onClick={() => setNamingSide(namingSide === side ? null : side)}>
            이름으로
          </Chip>
        </Chips>
        {namingSide === side && (
          <Input
            autoFocus
            placeholder="등록되지 않은 주체 — 단치히 자유시, 국제연맹 위임통치령"
            maxLength={100}
            defaultValue={current.countryId || current.historicalCountryId ? '' : (current.name ?? '')}
            onBlur={(blurEvent) => {
              const name = blurEvent.target.value.trim()
              update({ [side]: name ? { countryId: null, historicalCountryId: null, name } : current })
            }}
          />
        )}
      </Field>
    )
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={draft.id ? '영토 이전 고치기' : '영토 이전 더하기'}
        subtitle="이 사건으로 어느 땅이 누구에게서 누구에게로 넘어갔나 — 한 줄에 한 덩어리"
        maxWidth="640px"
      >
        <ModalBody>
          <Form
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault()
              if (canSave) onSave(draft)
            }}
          >
            {partyField('from', '내준 나라')}
            {(fromKey || toKey) && (
              <SwapPartyRow>
                <SwapPartyBtn
                  type="button"
                  onClick={() => update({ from: draft.to, to: draft.from })}
                  aria-label="내준 나라와 받은 나라 맞바꾸기"
                >
                  ⇄ 내준 나라 · 받은 나라 맞바꾸기
                </SwapPartyBtn>
              </SwapPartyRow>
            )}
            {partyField('to', '받은 나라')}
            {sameParty && <Warn role="alert">내준 나라와 받은 나라가 같습니다</Warn>}

            <Field>
              <FieldLabel htmlFor="territory-region">지역</FieldLabel>
              <Input
                id="territory-region"
                value={draft.regionName}
                maxLength={200}
                placeholder="왕령 프로이센 · 갈리치아 · 타이완과 펑후 제도"
                onChange={(changeEvent) => update({ regionName: changeEvent.target.value })}
              />
            </Field>

            <Field>
              <FieldLabel>방식</FieldLabel>
              <Chips role="radiogroup" aria-label="방식">
                {TERRITORY_METHODS.map((method) => (
                  <Chip
                    key={method.value}
                    type="button"
                    role="radio"
                    aria-checked={draft.method === method.value}
                    title={method.hint}
                    onClick={() => update({ method: method.value })}
                  >
                    {method.label}
                  </Chip>
                ))}
              </Chips>
              <Hint>{TERRITORY_METHODS.find((method) => method.value === draft.method)?.hint}</Hint>
            </Field>

            <Row>
              <Field>
                <FieldLabel htmlFor="territory-area">면적 (km²)</FieldLabel>
                <Input
                  id="territory-area"
                  inputMode="numeric"
                  value={draft.areaKm2}
                  placeholder="92000"
                  onChange={(changeEvent) => update({ areaKm2: changeEvent.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="territory-population">인구 (명)</FieldLabel>
                <Input
                  id="territory-population"
                  inputMode="numeric"
                  value={draft.population}
                  placeholder="1300000"
                  onChange={(changeEvent) => update({ population: changeEvent.target.value })}
                />
              </Field>
            </Row>

            {treaties.length > 0 && (
              <Field>
                <FieldLabel>근거 조약</FieldLabel>
                <Chips role="group" aria-label="근거 조약">
                  {treaties.map((treaty) => (
                    <Chip
                      key={treaty.id}
                      type="button"
                      aria-pressed={draft.treatyId === treaty.id}
                      onClick={() => update({ treatyId: draft.treatyId === treaty.id ? null : treaty.id })}
                    >
                      {treaty.name}
                    </Chip>
                  ))}
                </Chips>
              </Field>
            )}

            <Field>
              <FieldLabel>발효 시점 (사건 날짜와 다를 때만)</FieldLabel>
              <Row>
                <Chips role="group" aria-label="기원">
                  {(['AD', 'BC'] as const).map((era) => (
                    <Chip key={era} type="button" aria-pressed={draft.effectiveEra === era} onClick={() => update({ effectiveEra: era })}>
                      {era === 'AD' ? '서기' : '기원전'}
                    </Chip>
                  ))}
                </Chips>
                <Input aria-label="연" inputMode="numeric" placeholder="연" value={draft.effectiveYear} onChange={(changeEvent) => update({ effectiveYear: changeEvent.target.value })} />
                <Input aria-label="월" inputMode="numeric" placeholder="월" value={draft.effectiveMonth} onChange={(changeEvent) => update({ effectiveMonth: changeEvent.target.value })} />
                <Input aria-label="일" inputMode="numeric" placeholder="일" value={draft.effectiveDay} onChange={(changeEvent) => update({ effectiveDay: changeEvent.target.value })} />
              </Row>
            </Field>

            <Field>
              <FieldLabel htmlFor="territory-note">메모</FieldLabel>
              <TextArea
                id="territory-note"
                rows={2}
                value={draft.note}
                maxLength={2000}
                placeholder="단치히·토룬 제외 · 1773년 세임 비준"
                onChange={(changeEvent) => update({ note: changeEvent.target.value })}
              />
            </Field>
            <button type="submit" hidden aria-hidden tabIndex={-1} />
          </Form>
        </ModalBody>
        <ModalFooter>
          {missingParty && <Hint>내준 나라나 받은 나라 중 하나는 골라 주세요</Hint>}
          <FooterButton type="button" onClick={onClose}>
            닫기
          </FooterButton>
          <FooterButton type="button" data-primary disabled={!canSave} onClick={() => onSave(draft)}>
            {saving ? '저장 중…' : '저장'}
          </FooterButton>
        </ModalFooter>
      </Modal>
      <CountryPicker
        mode="single"
        isOpen={pickerSide !== null}
        onClose={() => setPickerSide(null)}
        title={pickerSide === 'from' ? '내준 나라' : '받은 나라'}
        modernCountries={modernCountries}
        historicalCountries={historicalCountries}
        isLoading={modernLoading || historicalLoading}
        onSelect={(country) => {
          if (pickerSide) {
            update({
              [pickerSide]: country.isHistorical
                ? { countryId: null, historicalCountryId: country.id, name: country.name }
                : { countryId: country.id, historicalCountryId: null, name: country.name },
            })
          }
          setPickerSide(null)
        }}
      />
    </>
  )
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`

const FieldLabel = styled.label`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-end;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Chip = styled.button`
  min-height: 30px;
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &[aria-pressed='true'],
  &[aria-checked='true'] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 600;
    box-shadow: inset 0 0 0 1px ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-ghost] {
    border-style: dashed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Input = styled.input`
  min-width: 0;
  width: 100%;
  max-width: 100%;
  min-height: 34px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};

  ${Row} > & {
    width: 84px;
    flex: 0 0 84px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const TextArea = styled.textarea`
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  resize: vertical;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const Hint = styled.span`
  font-size: 12px;
  color: ${metaText};
`

const Warn = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};
`

const FooterButton = styled.button`
  min-height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &[data-primary] {
    border-color: transparent;
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    color: #fff;
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const SwapPartyRow = styled.div`
  display: flex;
  align-items: center;
  margin: -4px 0;
`

const SwapPartyBtn = styled.button`
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  background: transparent;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`
