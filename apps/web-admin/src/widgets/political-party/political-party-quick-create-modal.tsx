import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiFlag, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerOverlay,
  ledgerScrim,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  type CreatePoliticalPartyInput,
  POLITICAL_POSITION_COLOR,
  POLITICAL_POSITION_LABEL,
  type PoliticalParty,
  politicalPartyApi,
  type PoliticalPosition,
} from '@/shared/api/political-party'
import { Z_INDEX } from '@/shared/styles/z-index'
import { notify } from '@/shared/ui/toast'

const POSITION_OPTIONS: PoliticalPosition[] = [
  'FAR_LEFT',
  'LEFT',
  'CENTER_LEFT',
  'CENTER',
  'CENTER_RIGHT',
  'RIGHT',
  'FAR_RIGHT',
  'BIG_TENT',
]

const BRAND_SWATCHES = [
  '#BE0000',
  '#E3000F',
  '#E11D48',
  '#EA580C',
  '#D97706',
  '#16A34A',
  '#0D9488',
  '#0284C7',
  '#1D4ED8',
  '#4338CA',
  '#6D28D9',
  '#334155',
] as const

function normalizeDateInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
  return trimmed
}

function toDateInputValue(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export interface PoliticalPartyQuickCreateModalProps {
  editingParty?: PoliticalParty | null
  defaultCountryId?: string | null
  defaultHistoricalCountryId?: string | null
  defaultName?: string
  onClose: () => void
  onSaved?: (party: PoliticalParty) => void
}

export function PoliticalPartyQuickCreateModal({
  editingParty = null,
  defaultCountryId = null,
  defaultHistoricalCountryId = null,
  defaultName = '',
  onClose,
  onSaved,
}: PoliticalPartyQuickCreateModalProps) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(editingParty)

  const [name, setName] = useState(editingParty?.name ?? defaultName)
  const [shortName, setShortName] = useState(editingParty?.shortName ?? '')
  const [localName, setLocalName] = useState(editingParty?.localName ?? '')
  const [position, setPosition] = useState<PoliticalPosition | ''>(
    editingParty?.position ?? '',
  )
  const [ideology, setIdeology] = useState(editingParty?.ideology ?? '')
  const [brandColor, setBrandColor] = useState(
    editingParty?.brandColor ?? '#2563EB',
  )
  const [useBrandColor, setUseBrandColor] = useState(
    Boolean(editingParty?.brandColor) || !isEdit,
  )
  const [countryId, setCountryId] = useState(
    editingParty?.countryId ?? defaultCountryId ?? '',
  )
  const [historicalCountryId, setHistoricalCountryId] = useState(
    editingParty?.historicalCountryId ?? defaultHistoricalCountryId ?? '',
  )
  const [foundedDate, setFoundedDate] = useState(
    toDateInputValue(editingParty?.foundedDate),
  )
  const [dissolvedDate, setDissolvedDate] = useState(
    toDateInputValue(editingParty?.dissolvedDate),
  )
  const [description, setDescription] = useState(
    editingParty?.description ?? '',
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const countriesQuery = useQuery({
    queryKey: ['countries', 'all-for-party-modal'],
    queryFn: () => getAllCountries(),
    staleTime: 5 * 60_000,
  })

  const historicalCountriesQuery = useQuery({
    queryKey: ['historical-countries', 'all-for-party-modal'],
    queryFn: () => getAllHistoricalCountries(),
    staleTime: 5 * 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        throw new Error('정당명을 입력해 주세요.')
      }
      if (!countryId && !historicalCountryId) {
        throw new Error('소속 현대 국가 또는 역사 국가 중 최소 하나를 선택해 주세요.')
      }
      const normalizedFounded = normalizeDateInput(foundedDate)
      const normalizedDissolved = normalizeDateInput(dissolvedDate)
      const normalizedColor =
        useBrandColor && /^#[0-9A-Fa-f]{6}$/.test(brandColor.trim())
          ? brandColor.trim().toUpperCase()
          : null

      const payload: CreatePoliticalPartyInput = {
        name: trimmedName,
        shortName: shortName.trim() || null,
        localName: localName.trim() || null,
        ideology: ideology.trim() || null,
        position: position || null,
        brandColor: normalizedColor,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        foundedDate: normalizedFounded,
        dissolvedDate: normalizedDissolved,
        description: description.trim() || null,
      }

      if (editingParty) {
        return politicalPartyApi.update(editingParty.id, payload)
      }
      return politicalPartyApi.create(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries?.({ queryKey: ['political-parties'] })
      notify.success(
        isEdit
          ? `「${saved.name}」 정당 정보를 수정했습니다.`
          : `「${saved.name}」 정당을 등록했습니다.`,
      )
      onSaved?.(saved)
      onClose()
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 저장에 실패했습니다.',
      )
    },
  })

  return createPortal(
    <Overlay onClick={onClose}>
      <Modal
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? '정당 수정' : '새 정당 등록'}
        onClick={(e) => e.stopPropagation()}
      >
        <Header>
          <HeaderTitleWrap>
            <FiFlag size={16} />
            <Title>{isEdit ? '정당 정보 수정' : '새 정당 등록'}</Title>
          </HeaderTitleWrap>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={18} />
          </CloseBtn>
        </Header>

        <Body>
          <LeadNote>
            정본 정당 도메인(`PoliticalParty`)에 저장되어 국가 상세 선거·투표, 내각 여당·연정, 인물 당적, 그리고 역사 사건 참여 정당에서 공통으로 참조됩니다.
          </LeadNote>

          <Row>
            <Field style={{ flex: 1, minWidth: 200 }}>
              <FieldLabel>
                현대 국가 <Muted>(현대 정당 또는 계승 국가)</Muted>
              </FieldLabel>
              <BigSelect
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
              >
                <option value="">미지정</option>
                {(countriesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.flagEmoji ? `${c.flagEmoji} ` : ''}
                    {c.name}
                  </option>
                ))}
              </BigSelect>
            </Field>
            <Field style={{ flex: 1, minWidth: 200 }}>
              <FieldLabel>
                역사 국가·시대 체제 <Muted>(예: 바이마르 공화국, 독일 제국)</Muted>
              </FieldLabel>
              <BigSelect
                value={historicalCountryId}
                onChange={(e) => setHistoricalCountryId(e.target.value)}
              >
                <option value="">미지정</option>
                {(historicalCountriesQuery.data ?? []).map((hc) => (
                  <option key={hc.id} value={hc.id}>
                    {hc.name}
                  </option>
                ))}
              </BigSelect>
            </Field>
          </Row>

          <Row>
            <Field style={{ flex: 2, minWidth: 220 }}>
              <FieldLabel>정당명 *</FieldLabel>
              <BigInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 사회민주당, 독일공산당, 자유민주당"
                autoFocus
              />
            </Field>
            <Field style={{ flex: 1, minWidth: 120 }}>
              <FieldLabel>약칭</FieldLabel>
              <BigInput
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="예: SPD, KPD, 자민당"
              />
            </Field>
          </Row>

          <Field>
            <FieldLabel>원어 표기</FieldLabel>
            <BigInput
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="예: Sozialdemokratische Partei Deutschlands"
            />
          </Field>

          <Field>
            <FieldLabel>이념 스펙트럼 위치</FieldLabel>
            <PositionChipRow>
              <PositionChip
                type="button"
                $active={position === ''}
                onClick={() => setPosition('')}
              >
                미지정
              </PositionChip>
              {POSITION_OPTIONS.map((pos) => {
                const active = position === pos
                const dotColor = POLITICAL_POSITION_COLOR[pos]
                return (
                  <PositionChip
                    key={pos}
                    type="button"
                    $active={active}
                    $color={dotColor}
                    onClick={() => {
                      setPosition(pos)
                      if (!editingParty?.brandColor) {
                        setBrandColor(dotColor)
                      }
                    }}
                  >
                    <ColorDot $color={dotColor} />
                    {POLITICAL_POSITION_LABEL[pos]}
                  </PositionChip>
                )
              })}
            </PositionChipRow>
          </Field>

          <Row>
            <Field style={{ flex: 2, minWidth: 220 }}>
              <FieldLabel>핵심 이념·노선</FieldLabel>
              <BigInput
                value={ideology}
                onChange={(e) => setIdeology(e.target.value)}
                placeholder="예: 사회민주주의 · 민주사회주의 · 의회주의"
              />
            </Field>
            <Field style={{ flex: 1.3, minWidth: 210 }}>
              <FieldLabel>
                상징 당색 (`#RRGGBB`)
                <InlineToggle>
                  <input
                    type="checkbox"
                    checked={useBrandColor}
                    onChange={(e) => setUseBrandColor(e.target.checked)}
                  />
                  사용
                </InlineToggle>
              </FieldLabel>
              <ColorControlRow $disabled={!useBrandColor}>
                <ColorNativePicker
                  type="color"
                  disabled={!useBrandColor}
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(brandColor)
                      ? brandColor
                      : '#2563EB'
                  }
                  onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
                />
                <MonoHexInput
                  disabled={!useBrandColor}
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#E3000F"
                  maxLength={7}
                />
              </ColorControlRow>
              {useBrandColor && (
                <SwatchRow>
                  {BRAND_SWATCHES.map((hex) => (
                    <SwatchBtn
                      key={hex}
                      type="button"
                      $hex={hex}
                      $selected={brandColor.toUpperCase() === hex}
                      onClick={() => setBrandColor(hex)}
                      title={hex}
                    >
                      {brandColor.toUpperCase() === hex && <FiCheck size={10} />}
                    </SwatchBtn>
                  ))}
                </SwatchRow>
              )}
            </Field>
          </Row>

          <Row>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                창당일 <Muted>(YYYY 또는 YYYY-MM-DD)</Muted>
              </FieldLabel>
              <BigInput
                value={foundedDate}
                onChange={(e) => setFoundedDate(e.target.value)}
                placeholder="예: 1875-05-22 또는 1875"
              />
            </Field>
            <Field style={{ flex: 1, minWidth: 160 }}>
              <FieldLabel>
                해산·소멸일 <Muted>(현존 정당은 비움)</Muted>
              </FieldLabel>
              <BigInput
                value={dissolvedDate}
                onChange={(e) => setDissolvedDate(e.target.value)}
                placeholder="예: 1933-03-31"
              />
            </Field>
          </Row>

          <Field>
            <FieldLabel>개요·역사적 맥락</FieldLabel>
            <BigTextarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="창당 배경, 주요 지지 기반, 핵심 노선 및 정치사적 의의"
            />
          </Field>
        </Body>

        <Footer>
          <CancelBtn type="button" onClick={onClose}>
            취소
          </CancelBtn>
          <SubmitBtn
            type="button"
            disabled={saveMutation.isPending || !name.trim()}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending
              ? '저장 중…'
              : isEdit
                ? '변경사항 저장'
                : '정당 등록'}
          </SubmitBtn>
        </Footer>
      </Modal>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  background: ${({ theme }) => ledgerScrim(theme.mode)};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const Modal = styled.div`
  width: 100%;
  max-width: 660px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => ledgerOverlay(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.28);
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const HeaderTitleWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const Title = styled.h2`
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: ${RADIUS.SM};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Body = styled.div`
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const LeadNote = styled.p`
  margin: 0;
  padding: 9px 12px;
  font-size: 0.775rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border-left: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  border-radius: ${RADIUS.SM};
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Muted = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const BigInput = styled.input`
  height: 36px;
  padding: 0 11px;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigSelect = styled.select`
  height: 36px;
  padding: 0 10px;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const BigTextarea = styled.textarea`
  padding: 9px 11px;
  font-size: 0.84rem;
  line-height: 1.5;
  font-family: inherit;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const PositionChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PositionChip = styled.button<{ $active: boolean; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  font-size: 0.76rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ $active, theme }) =>
      $active
        ? ledgerAccentBorder(theme.mode)
        : ledgerHairlineStrong(theme.mode)};
  background: ${({ $active, theme }) =>
    $active ? ledgerAccentSubtle(theme.mode) : theme.colors.background.primary};
  color: ${({ $active, theme }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  cursor: pointer;
`

const ColorDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const InlineToggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.73rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const ColorControlRow = styled.div<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
`

const ColorNativePicker = styled.input`
  width: 36px;
  height: 36px;
  padding: 2px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  cursor: pointer;
`

const MonoHexInput = styled(BigInput)`
  ${DIGIT_DISPLAY}
  width: 108px;
  text-transform: uppercase;
`

const SwatchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
`

const SwatchBtn = styled.button<{ $hex: string; $selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.text.primary : 'transparent'};
  background: ${({ $hex }) => $hex};
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 13px 20px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const CancelBtn = styled.button`
  height: 34px;
  padding: 0 14px;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`

const SubmitBtn = styled.button`
  height: 34px;
  padding: 0 16px;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: ${RADIUS.SM};
  border: 1px solid transparent;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: #ffffff;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`
