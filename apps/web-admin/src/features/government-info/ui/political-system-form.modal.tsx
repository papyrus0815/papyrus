import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import type {
  PoliticalSystem,
  UpdatePoliticalSystemInput,
} from '@/entities/political-system/api'
import {
  GOVERNMENT_FORM_LABEL,
  GOVERNMENT_FORM_ORDER,
  LEGISLATURE_TYPE_LABEL,
  LEGISLATURE_TYPE_ORDER,
  PARTY_SYSTEM_LABEL,
  PARTY_SYSTEM_ORDER,
  primaryHouseLabel,
  STATE_STRUCTURE_LABEL,
  STATE_STRUCTURE_ORDER,
  type LegislatureType,
} from '@/entities/political-system/model/political-system'
import { personCareerApi } from '@/shared/api/person-career'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

interface Props {
  open: boolean
  onClose: () => void
  /** null이면 새로 만들기 */
  editing: PoliticalSystem | null
  countryId?: string
  historicalCountryId?: string
  countryName?: string
  onSubmit: (dto: UpdatePoliticalSystemInput) => Promise<void>
}

type FormState = {
  name: string
  startEra: 'BC' | 'AD'
  startYear: string
  endEra: 'BC' | 'AD'
  endYear: string
  isCurrent: boolean
  governmentForm: string
  legislatureType: string
  lowerHouseName: string
  lowerHouseSeats: string
  upperHouseName: string
  upperHouseSeats: string
  /**
   * 직함 선택 — 관직 정의 id, 또는 '카탈로그에 없음'을 뜻하는 센티널(CUSTOM_TITLE),
   * 또는 빈 값(지정 안 함). 자유입력 칸은 센티널일 때만 열린다.
   */
  headOfStateChoice: string
  headOfStateTitle: string
  headOfStateHasPower: boolean
  headOfGovernmentChoice: string
  headOfGovernmentTitle: string
  headOfGovernmentHasPower: boolean
  stateStructure: string
  partySystem: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  startEra: 'AD',
  startYear: '',
  endEra: 'AD',
  endYear: '',
  isCurrent: false,
  governmentForm: '',
  legislatureType: '',
  lowerHouseName: '',
  lowerHouseSeats: '',
  upperHouseName: '',
  upperHouseSeats: '',
  headOfStateChoice: '',
  headOfStateTitle: '',
  headOfStateHasPower: true,
  headOfGovernmentChoice: '',
  headOfGovernmentTitle: '',
  headOfGovernmentHasPower: true,
  stateStructure: '',
  partySystem: '',
  notes: '',
}

const toText = (value: unknown) => (value == null ? '' : String(value))

/**
 * '카탈로그에 없음' 센티널.
 *
 * 직함의 정본은 관직 정의 카탈로그(재임·재위가 참조하는 그 테이블)다. 그래도 자유입력을
 * 남겨 두는 이유 — '연합회의 의장'·'임시정부 수반'처럼 한 정체에서만 쓰인 칭호까지
 * 카탈로그에 올리면 다른 나라 직책 피커가 그만큼 지저분해진다.
 */
const CUSTOM_TITLE = '__custom__'

/** 카탈로그에서 이 축에 쓸 수 있는 유형 */
type HeadAxis = 'HEAD_OF_STATE' | 'HEAD_OF_GOVERNMENT'

interface DefinitionOption {
  id: string
  title: string
  positionType: string
  titleLocal?: string | null
}

function hydrate(system: PoliticalSystem): FormState {
  return {
    name: toText(system.name),
    startEra: system.startEra ?? 'AD',
    startYear: toText(system.startYear),
    endEra: system.endEra ?? 'AD',
    endYear: toText(system.endYear),
    isCurrent: system.isCurrent,
    governmentForm: system.governmentForm ?? '',
    legislatureType: system.legislatureType ?? '',
    lowerHouseName: toText(system.lowerHouseName),
    lowerHouseSeats: toText(system.lowerHouseSeats),
    upperHouseName: toText(system.upperHouseName),
    upperHouseSeats: toText(system.upperHouseSeats),
    headOfStateChoice: system.headOfStatePositionId
      ? system.headOfStatePositionId
      : system.headOfStateTitle
        ? CUSTOM_TITLE
        : '',
    headOfStateTitle: toText(system.headOfStateTitle),
    headOfStateHasPower: system.headOfStateHasPower ?? true,
    headOfGovernmentChoice: system.headOfGovernmentPositionId
      ? system.headOfGovernmentPositionId
      : system.headOfGovernmentTitle
        ? CUSTOM_TITLE
        : '',
    headOfGovernmentTitle: toText(system.headOfGovernmentTitle),
    headOfGovernmentHasPower: system.headOfGovernmentHasPower ?? true,
    stateStructure: system.stateStructure ?? '',
    partySystem: system.partySystem ?? '',
    notes: toText(system.notes),
  }
}

const numberOrNull = (raw: string) => {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

const textOrNull = (raw: string) => (raw.trim() === '' ? null : raw.trim())

/**
 * 국가원수·정부수반 한 축을 DTO 조각으로 옮긴다.
 * 지정 안 함이면 세 칸 모두 null — 감춘 값이 뒤에 남아 되살아나지 않게.
 */
function headAxisPayload(
  axis: 'headOfState' | 'headOfGovernment',
  form: FormState,
): Partial<UpdatePoliticalSystemInput> {
  const choice = axis === 'headOfState' ? form.headOfStateChoice : form.headOfGovernmentChoice
  const title = axis === 'headOfState' ? form.headOfStateTitle : form.headOfGovernmentTitle
  const hasPower =
    axis === 'headOfState' ? form.headOfStateHasPower : form.headOfGovernmentHasPower

  if (choice === CUSTOM_TITLE) {
    const text = textOrNull(title)
    return {
      [`${axis}PositionId`]: null,
      [`${axis}Title`]: text,
      [`${axis}HasPower`]: text ? hasPower : null,
    } as Partial<UpdatePoliticalSystemInput>
  }
  if (choice) {
    return {
      [`${axis}PositionId`]: choice,
      [`${axis}Title`]: null,
      [`${axis}HasPower`]: hasPower,
    } as Partial<UpdatePoliticalSystemInput>
  }
  return {
    [`${axis}PositionId`]: null,
    [`${axis}Title`]: null,
    [`${axis}HasPower`]: null,
  } as Partial<UpdatePoliticalSystemInput>
}

/**
 * 정체 등록·수정 폼.
 *
 * 입법부 상세는 **양원제를 고를 때만** 상원 칸을 연다. 단원제인데 상원 칸이 떠 있으면
 * 채워야 할 것처럼 보이고, 실제로 채우면 조용히 무의미한 값이 남는다.
 */
export function PoliticalSystemFormModal({
  open,
  onClose,
  editing,
  countryId,
  historicalCountryId,
  countryName,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)

  /*
   * 직함 후보 = 관직 정의 카탈로그. 재임·재위가 쓰는 것과 **같은 목록·같은 쿼리키**를
   * 쓴다 — 여기만 자유 문자열로 두면 같은 '대통령'이 두 어휘로 갈라진다.
   * 국가를 주면 서버가 적용 범위(스코프)로 하드컷해 그 나라 것만 내려준다.
   */
  const { data: definitions = [] } = useQuery<DefinitionOption[]>({
    queryKey: [
      'position-definitions',
      'list',
      countryId ?? null,
      historicalCountryId ?? null,
    ],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId,
        historicalCountryId,
      }) as Promise<DefinitionOption[]>,
    enabled: open,
    staleTime: 60_000,
  })

  /**
   * 수정 중인 정체가 이미 참조하는 정의는 목록에서 빠져도 되살린다.
   * 스코프 하드컷(예: 다른 나라 전용으로 스코프된 '국가주석')에 걸려 사라지면
   * select 값이 매칭되지 않아 선택이 조용히 '지정 안 함'으로 떨어진다.
   */
  const optionsFor = useMemo(() => {
    const pinned: DefinitionOption[] = [
      editing?.headOfStatePosition as DefinitionOption | null,
      editing?.headOfGovernmentPosition as DefinitionOption | null,
    ].filter((def): def is DefinitionOption => !!def?.id)

    return (axis: HeadAxis) => {
      const pool = [...definitions]
      for (const def of pinned) {
        if (!pool.some((row) => row.id === def.id)) pool.push(def)
      }
      return pool
        .filter((def) => def.positionType === axis)
        .sort((left, right) => left.title.localeCompare(right.title, 'ko-KR'))
    }
  }, [definitions, editing])

  // 열릴 때마다 대상에 맞춰 채운다 — 직전에 열었던 값이 남지 않도록
  useEffect(() => {
    if (!open) return
    setForm(editing ? hydrate(editing) : EMPTY)
  }, [open, editing])

  const set = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const legislature = (form.legislatureType || null) as LegislatureType | null
  const isBicameral = legislature === 'BICAMERAL'
  const hasLegislature = legislature !== 'NONE'

  const handleSubmit = async () => {
    const startYear = numberOrNull(form.startYear)
    const endYear = numberOrNull(form.endYear)
    if (startYear != null && endYear != null) {
      const signedStart = form.startEra === 'BC' ? -startYear : startYear
      const signedEnd = form.endEra === 'BC' ? -endYear : endYear
      if (signedStart > signedEnd) {
        notify.error('시작 연도가 종료 연도보다 뒤일 수 없습니다')
        return
      }
    }

    const dto: UpdatePoliticalSystemInput = {
      name: textOrNull(form.name),
      startEra: startYear == null ? null : form.startEra,
      startYear,
      endEra: endYear == null ? null : form.endEra,
      endYear,
      isCurrent: form.isCurrent,
      governmentForm: (form.governmentForm ||
        null) as UpdatePoliticalSystemInput['governmentForm'],
      legislatureType: (form.legislatureType ||
        null) as UpdatePoliticalSystemInput['legislatureType'],
      // 의회가 없거나 단원제면 상원 값은 저장하지 않는다 — 폼에서 감춘 값이
      // 뒤에 남아 조용히 되살아나는 일을 막는다
      lowerHouseName: hasLegislature ? textOrNull(form.lowerHouseName) : null,
      lowerHouseSeats: hasLegislature ? numberOrNull(form.lowerHouseSeats) : null,
      upperHouseName: isBicameral ? textOrNull(form.upperHouseName) : null,
      upperHouseSeats: isBicameral ? numberOrNull(form.upperHouseSeats) : null,
      /*
       * 한 축에 값은 한 벌만 간다. 카탈로그를 골랐으면 id만, '카탈로그에 없음'이면
       * 자유입력만 — 둘을 함께 보내면 나중에 어느 쪽이 진실인지 알 수 없어진다.
       * (서버도 같은 규칙으로 한 번 더 정리한다.)
       */
      ...headAxisPayload('headOfState', form),
      ...headAxisPayload('headOfGovernment', form),
      stateStructure: (form.stateStructure ||
        null) as UpdatePoliticalSystemInput['stateStructure'],
      partySystem: (form.partySystem ||
        null) as UpdatePoliticalSystemInput['partySystem'],
      notes: textOrNull(form.notes),
    }

    setSaving(true)
    try {
      await onSubmit(dto)
    } catch {
      notify.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editing ? '정체 수정' : '정체 추가'}
      subtitle={
        countryName
          ? `${countryName} · 정부 형태와 입법부 구성`
          : '정부 형태와 입법부 구성'
      }
      size="wide"
    >
      <ModalBody>
        <SectionLabel>기간</SectionLabel>
        <Grid>
          <Field style={{ gridColumn: 'span 2' }}>
            이름
            <Input
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="제5공화국 · 바이마르 공화국 (선택)"
            />
          </Field>
          <Field>
            시작
            <Inline>
              <Select
                value={form.startEra}
                onChange={(event) =>
                  set('startEra', event.target.value as 'BC' | 'AD')
                }
                aria-label="시작 시대"
              >
                <option value="AD">서기</option>
                <option value="BC">기원전</option>
              </Select>
              <Input
                type="number"
                value={form.startYear}
                onChange={(event) => set('startYear', event.target.value)}
                placeholder="1958"
                aria-label="시작 연도"
              />
            </Inline>
          </Field>
          <Field>
            종료
            <Inline>
              <Select
                value={form.endEra}
                onChange={(event) =>
                  set('endEra', event.target.value as 'BC' | 'AD')
                }
                aria-label="종료 시대"
                disabled={form.isCurrent}
              >
                <option value="AD">서기</option>
                <option value="BC">기원전</option>
              </Select>
              <Input
                type="number"
                value={form.endYear}
                onChange={(event) => set('endYear', event.target.value)}
                placeholder={form.isCurrent ? '현행' : '1940'}
                aria-label="종료 연도"
                disabled={form.isCurrent}
              />
            </Inline>
          </Field>
          <Field style={{ justifyContent: 'flex-end' }}>
            <CheckLabel>
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(event) => {
                  set('isCurrent', event.target.checked)
                  if (event.target.checked) set('endYear', '')
                }}
              />
              지금도 이 정체
            </CheckLabel>
          </Field>
        </Grid>

        <SectionLabel>정부 형태 · 입법부</SectionLabel>
        <Grid>
          <Field>
            정부 형태
            <Select
              value={form.governmentForm}
              onChange={(event) => set('governmentForm', event.target.value)}
            >
              <option value="">선택 안 함</option>
              {GOVERNMENT_FORM_ORDER.map((key) => (
                <option key={key} value={key}>
                  {GOVERNMENT_FORM_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            입법부 구성
            <Select
              value={form.legislatureType}
              onChange={(event) => set('legislatureType', event.target.value)}
            >
              <option value="">선택 안 함</option>
              {LEGISLATURE_TYPE_ORDER.map((key) => (
                <option key={key} value={key}>
                  {LEGISLATURE_TYPE_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </Grid>

        {hasLegislature && (
          <Grid>
            <Field>
              {primaryHouseLabel(legislature)} 이름
              <Input
                value={form.lowerHouseName}
                onChange={(event) => set('lowerHouseName', event.target.value)}
                placeholder={isBicameral ? '국민의회 · 하원' : '국회'}
              />
            </Field>
            <Field>
              {primaryHouseLabel(legislature)} 의석
              <Input
                type="number"
                value={form.lowerHouseSeats}
                onChange={(event) => set('lowerHouseSeats', event.target.value)}
                placeholder="300"
              />
            </Field>
            {isBicameral && (
              <>
                <Field>
                  상원 이름
                  <Input
                    value={form.upperHouseName}
                    onChange={(event) =>
                      set('upperHouseName', event.target.value)
                    }
                    placeholder="참의원 · 상원 · 귀족원"
                  />
                </Field>
                <Field>
                  상원 의석
                  <Input
                    type="number"
                    value={form.upperHouseSeats}
                    onChange={(event) =>
                      set('upperHouseSeats', event.target.value)
                    }
                    placeholder="100"
                  />
                </Field>
              </>
            )}
          </Grid>
        )}

        <SectionLabel>국가원수 · 정부수반</SectionLabel>
        {/*
          직함은 관직 정의 카탈로그에서 고른다 — 재임·재위가 참조하는 그 목록이다.
          여기만 자유 문자열이면 같은 '대통령'이 두 어휘로 갈라져 직책으로 잇지 못한다.
          카탈로그에 없는 칭호만 '직접 입력'으로 떨어진다.
        */}
        <Grid>
          <Field>
            국가원수 직함
            <Select
              value={form.headOfStateChoice}
              onChange={(event) => set('headOfStateChoice', event.target.value)}
            >
              <option value="">지정 안 함</option>
              {optionsFor('HEAD_OF_STATE').map((def) => (
                <option key={def.id} value={def.id}>
                  {def.title}
                </option>
              ))}
              <option value={CUSTOM_TITLE}>직접 입력…</option>
            </Select>
            {form.headOfStateChoice === CUSTOM_TITLE && (
              <Input
                value={form.headOfStateTitle}
                onChange={(event) => set('headOfStateTitle', event.target.value)}
                placeholder="연합회의 의장 · 국가주석"
                aria-label="국가원수 직함 직접 입력"
              />
            )}
            {form.headOfStateChoice && (
              <CheckLabel>
                <input
                  type="checkbox"
                  checked={form.headOfStateHasPower}
                  onChange={(event) =>
                    set('headOfStateHasPower', event.target.checked)
                  }
                />
                실권이 있다
              </CheckLabel>
            )}
          </Field>
          <Field>
            정부수반 직함
            <Select
              value={form.headOfGovernmentChoice}
              onChange={(event) =>
                set('headOfGovernmentChoice', event.target.value)
              }
            >
              <option value="">지정 안 함 (대통령제면 비움)</option>
              {optionsFor('HEAD_OF_GOVERNMENT').map((def) => (
                <option key={def.id} value={def.id}>
                  {def.title}
                </option>
              ))}
              <option value={CUSTOM_TITLE}>직접 입력…</option>
            </Select>
            {form.headOfGovernmentChoice === CUSTOM_TITLE && (
              <Input
                value={form.headOfGovernmentTitle}
                onChange={(event) =>
                  set('headOfGovernmentTitle', event.target.value)
                }
                placeholder="임시정부 수반"
                aria-label="정부수반 직함 직접 입력"
              />
            )}
            {form.headOfGovernmentChoice && (
              <CheckLabel>
                <input
                  type="checkbox"
                  checked={form.headOfGovernmentHasPower}
                  onChange={(event) =>
                    set('headOfGovernmentHasPower', event.target.checked)
                  }
                />
                실권이 있다
              </CheckLabel>
            )}
          </Field>
        </Grid>
        <FieldHint>
          목록에 없는 직함은 「직위 정의」 탭에서 먼저 만들면 재임·재위 기록과 같은
          직책으로 이어집니다.
        </FieldHint>

        <SectionLabel>국가 구조 · 정당제</SectionLabel>
        <Grid>
          <Field>
            국가 구조
            <Select
              value={form.stateStructure}
              onChange={(event) => set('stateStructure', event.target.value)}
            >
              <option value="">선택 안 함</option>
              {STATE_STRUCTURE_ORDER.map((key) => (
                <option key={key} value={key}>
                  {STATE_STRUCTURE_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            정당제
            <Select
              value={form.partySystem}
              onChange={(event) => set('partySystem', event.target.value)}
            >
              <option value="">선택 안 함</option>
              {PARTY_SYSTEM_ORDER.map((key) => (
                <option key={key} value={key}>
                  {PARTY_SYSTEM_LABEL[key]}
                </option>
              ))}
            </Select>
          </Field>
        </Grid>

        <Field style={{ marginTop: 14 }}>
          설명
          <TextArea
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="헌법 개정 배경, 정체 전환의 계기 등"
          />
        </Field>
      </ModalBody>

      <ModalFooter>
        <GhostButton type="button" onClick={onClose}>
          취소
        </GhostButton>
        <PrimaryButton type="button" onClick={handleSubmit} disabled={saving}>
          {editing ? '수정 저장' : '추가'}
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  )
}

const SectionLabel = styled.h3`
  margin: 18px 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};

  &:first-child {
    margin-top: 0;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px 14px;
`

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 0;
`

const Inline = styled.div`
  display: flex;
  gap: 6px;

  select {
    flex: 0 0 84px;
  }

  input {
    flex: 1;
    min-width: 0;
  }
`

const controlBase = `
  height: 34px;
  padding: 0 9px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  width: 100%;
  box-sizing: border-box;
`

/* 카탈로그로 유도하는 한 줄 — 폼 아래 회색 각주 톤 */
const FieldHint = styled.p`
  margin: 8px 2px 0;
  font-size: 12px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Input = styled.input`
  ${controlBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }

  &:disabled {
    opacity: 0.5;
  }
`

const Select = styled.select`
  ${controlBase}
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }

  &:disabled {
    opacity: 0.5;
  }
`

const TextArea = styled.textarea`
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 13px;
  font-family: inherit;
  font-weight: 400;
  min-height: 70px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.active};
  }
`

const CheckLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  input {
    cursor: pointer;
  }
`

const PrimaryButton = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const GhostButton = styled.button`
  padding: 9px 16px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 13px;
  cursor: pointer;
`
