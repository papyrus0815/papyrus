import React, { useCallback, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'react-hot-toast'
import {
  FiChevronLeft,
  FiFileText,
  FiImage,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import styled, {
  keyframes,
  ThemeProvider,
  useTheme,
} from 'styled-components'

import { getTreatySectionPalette } from '@/shared/styles/country-detail-palette'
import { useThemeStore } from '@/shared/styles/theme.store'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import {
  type AddTreatyImageDto,
  type CreateTreatyDto,
  type CreateTreatySignatoryDto,
  type CreateTreatyTermDto,
  TREATY_PARTICIPATION_LABELS,
  TREATY_TYPE_LABELS,
  type TreatyDto,
  type TreatyParticipationType,
  type TreatyType,
  treatyApi,
} from '@/shared/api/treaty'
import { uploadImage } from '@/shared/api/upload'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`

// ──────────────────────────────────────────────
// Styled Components
// ──────────────────────────────────────────────

const Wrap = styled.div`
  padding: 20px 24px;
  min-height: 400px;
  animation: ${fadeIn} 0.18s ease;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`

const Title = styled.h2`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin: 0;
`

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.ts!.main};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.ts!.mainHover};
  }
`

const Empty = styled.div`
  text-align: center;
  padding: 60px 24px;
  color: ${({ theme }) => theme.ts!.textMuted};
  font-size: 14px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
`

const Card = styled.div`
  background: ${({ theme }) => theme.ts!.card};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow: ${({ theme }) => theme.ts!.cardHoverShadow};
    transform: translateY(-2px);
  }
`

const CardThumb = styled.div<{ $url?: string | null }>`
  width: 100%;
  height: 140px;
  background: ${({ $url }) =>
    $url
      ? `url(${$url}) center/cover no-repeat`
      : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`};
  position: relative;
`

const CardTypeBadge = styled.span`
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
`

const CardBody = styled.div`
  padding: 14px 16px;
`

const CardName = styled.h3`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardAlias = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.ts!.textMuted};
  margin: 0 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`

const MetaChip = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.ts!.textSub};
  background: ${({ theme }) => theme.ts!.bg};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 6px;
  padding: 2px 7px;
`

const SignatoryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const SignatoryChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.ts!.mainLight};
  border: 1px solid ${({ theme }) => theme.ts!.signatoryChipBorder};
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.ts!.main};
`

// ─── 상세 뷰 ───

const DetailWrap = styled.div`
  animation: ${fadeIn} 0.18s ease;
`

const BackBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: ${({ theme }) => theme.ts!.textSub};
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  &:hover {
    color: ${({ theme }) => theme.ts!.main};
  }
`

const DetailCard = styled.div`
  background: ${({ theme }) => theme.ts!.card};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 16px;
  overflow: hidden;
`

const DetailHero = styled.div<{ $url?: string | null }>`
  width: 100%;
  height: 200px;
  background: ${({ $url }) =>
    $url
      ? `url(${$url}) center/cover no-repeat`
      : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`};
  position: relative;
  display: flex;
  align-items: flex-end;
`

const DetailHeroOverlay = styled.div`
  width: 100%;
  padding: 16px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
`

const DetailHeroTitle = styled.h1`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 2px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
`

const DetailHeroAlias = styled.p`
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
`

const DetailBody = styled.div`
  padding: 20px;
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
`

const InfoItem = styled.div`
  background: ${({ theme }) => theme.ts!.bg};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 10px;
  padding: 10px 12px;
`

const InfoLabel = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ts!.textMuted};
  margin-bottom: 3px;
`
const InfoValue = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.ts!.text};
`

const TextBlock = styled.p`
  font-size: 13px;
  line-height: 1.7;
  color: ${({ theme }) => theme.ts!.textSub};
  margin: 0;
  white-space: pre-wrap;
`

const SignatoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const SignatoryCard = styled.div`
  background: ${({ theme }) => theme.ts!.bg};
  border: 1px solid ${({ theme }) => theme.ts!.border};
  border-radius: 12px;
  padding: 12px 14px;
  min-width: 180px;
  flex: 1;
  max-width: 260px;
`

const SignatoryCountry = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin-bottom: 4px;
`

const SignatoryPerson = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.ts!.textSub};
  margin-bottom: 2px;
`
const SignatoryRole = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.ts!.textMuted};
`
const SignatoryBadge = styled.span<{ $type: TreatyParticipationType }>`
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 4px;
  background: ${({ theme, $type }) => {
    const p = theme.ts!
    if ($type === 'SIGNATORY') return p.mainLight
    if ($type === 'GUARANTOR') return p.badgeGuarantorBg
    if ($type === 'MEDIATOR') return p.badgeMediatorBg
    return p.badgeObserverBg
  }};
  color: ${({ theme, $type }) => {
    const p = theme.ts!
    if ($type === 'SIGNATORY') return p.main
    if ($type === 'GUARANTOR') return p.badgeGuarantorText
    if ($type === 'MEDIATOR') return p.badgeMediatorText
    return p.badgeObserverText
  }};
`

const TermList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const TermItem = styled.div<{ $secret?: boolean }>`
  background: ${({ theme, $secret }) =>
    $secret ? theme.ts!.termSecretBg : theme.ts!.bg};
  border: 1px solid
    ${({ theme, $secret }) =>
      $secret ? theme.ts!.termSecretBorder : theme.ts!.border};
  border-left: 3px solid
    ${({ theme, $secret }) =>
      $secret ? theme.ts!.danger : theme.ts!.main};
  border-radius: 0 10px 10px 0;
  padding: 10px 14px;
`

const TermTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin-bottom: 4px;
`
const TermContent = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.textSub};
  line-height: 1.6;
`
const SecretBadge = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.ts!.danger};
  font-weight: 600;
  margin-left: 6px;
`

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
`

const ImgThumb = styled.div<{ $url: string }>`
  aspect-ratio: 4/3;
  background: url(${({ $url }) => $url}) center/cover no-repeat;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.ts!.border};
  position: relative;
  cursor: pointer;
  &:hover > div {
    opacity: 1;
  }
`

const ImgOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 10px;
  opacity: 0;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ActionBar = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
`

const ActionBtn = styled.button<{ $variant?: 'danger' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid
    ${({ theme, $variant }) => {
      const p = theme.ts!
      return $variant === 'danger'
        ? p.danger
        : $variant === 'ghost'
          ? p.border
          : p.main
    }};
  background: ${({ theme, $variant }) => {
    const p = theme.ts!
    return $variant === 'danger'
      ? p.dangerLight
      : $variant === 'ghost'
        ? p.card
        : p.mainLight
  }};
  color: ${({ theme, $variant }) => {
    const p = theme.ts!
    return $variant === 'danger'
      ? p.danger
      : $variant === 'ghost'
        ? p.textSub
        : p.main
  }};
  &:hover {
    background: ${({ theme, $variant }) => {
      const p = theme.ts!
      return $variant === 'danger'
        ? p.danger
        : $variant === 'ghost'
          ? p.bg
          : p.main
    }};
    color: ${({ theme, $variant }) => {
      const p = theme.ts!
      return $variant === 'ghost' ? p.text : '#fff'
    }};
  }
`

// ─── 모달 ───

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const Modal = styled.div`
  background: ${({ theme }) => theme.ts!.card};
  border-radius: 18px;
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.ts!.modalShadow};
`

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 0;
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.ts!.card};
  z-index: 1;
`

const ModalTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.ts!.text};
  margin: 0;
`

const CloseBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.ts!.textMuted};
  padding: 4px;
  &:hover {
    color: ${({ theme }) => theme.ts!.text};
  }
`

const ModalBody = styled.div`
  padding: 16px 20px 20px;
`

const FormRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Field = styled.div``
const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.ts!.textSub};
  margin-bottom: 5px;
`

const Input = styled.input`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ts!.mainLight};
  }
`

const Textarea = styled.textarea`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  resize: vertical;
  min-height: 80px;
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.ts!.mainLight};
  }
`

const Select = styled.select`
  width: 100%;
  padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.ts!.borderMid};
  border-radius: 9px;
  font-size: 13px;
  color: ${({ theme }) => theme.ts!.text};
  background: ${({ theme }) => theme.ts!.inputBg};
  box-sizing: border-box;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.ts!.main};
  }
`

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
`

const CancelBtn = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  border: 1px solid ${({ theme }) => theme.ts!.border};
  background: ${({ theme }) => theme.ts!.card};
  color: ${({ theme }) => theme.ts!.textSub};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const SubmitBtn = styled.button`
  padding: 9px 18px;
  border-radius: 9px;
  border: none;
  background: ${({ theme }) => theme.ts!.main};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.ts!.mainHover};
  }
`

const Row2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const Required = styled.span`
  color: ${({ theme }) => theme.ts!.danger};
`

// ──────────────────────────────────────────────
// 날짜 포맷 헬퍼
// ──────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return d
  }
}

function toInputDate(d: string | null | undefined) {
  if (!d) return ''
  try {
    return new Date(d).toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────

interface TreatySectionProps {
  country: UnifiedCountry
}

// ──────────────────────────────────────────────
// Main Widget
// ──────────────────────────────────────────────

export const TreatySectionWidget: React.FC<TreatySectionProps> = ({
  country,
}) => {
  const qc = useQueryClient()
  const countryId = country.type === 'modern' ? country.id : undefined
  const historicalCountryId =
    country.type === 'historical' ? country.id : undefined

  const { data: treaties = [], isLoading } = useQuery({
    queryKey: ['treaties', countryId, historicalCountryId],
    queryFn: async () => {
      const r = await treatyApi.getAll({ countryId, historicalCountryId })
      return r.items
    },
    enabled: !!(countryId || historicalCountryId),
  })

  const [detailId, setDetailId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const invalidate = useCallback(() => {
    qc.invalidateQueries({
      queryKey: ['treaties', countryId, historicalCountryId],
    })
    if (detailId) qc.invalidateQueries({ queryKey: ['treaty', detailId] })
  }, [qc, countryId, historicalCountryId, detailId])

  const parentTheme = useTheme()
  const { mode } = useThemeStore()
  const treatyPalette = getTreatySectionPalette(mode === 'dark')
  const treatyTheme = useMemo(
    () => ({ ...parentTheme, ts: treatyPalette }),
    [parentTheme, treatyPalette],
  )

  const inner =
    detailId ? (
      <TreatyDetail
        treatyId={detailId}
        country={country}
        onBack={() => setDetailId(null)}
        onInvalidate={invalidate}
      />
    ) : (
      <Wrap>
      <Header>
        <Title>조약 · 협정 ({treaties.length})</Title>
        <AddBtn onClick={() => setCreateOpen(true)}>
          <FiPlus size={14} /> 조약 등록
        </AddBtn>
      </Header>

      {isLoading ? (
        <Empty>불러오는 중…</Empty>
      ) : treaties.length === 0 ? (
        <Empty>
          등록된 조약이 없습니다.
          <br />
          <span style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
            독소 불가침 조약, 베르사유 조약 등 이 국가가 참여한 조약을
            등록하세요.
          </span>
        </Empty>
      ) : (
        <Grid>
          {treaties.map((t) => {
            const thumb =
              t.images.find((i) => i.isPrimary)?.imageUrl ??
              t.images[0]?.imageUrl
            return (
              <Card key={t.id} onClick={() => setDetailId(t.id)}>
                <CardThumb $url={thumb}>
                  <CardTypeBadge>{TREATY_TYPE_LABELS[t.type]}</CardTypeBadge>
                </CardThumb>
                <CardBody>
                  <CardName>{t.name}</CardName>
                  {t.alias && <CardAlias>{t.alias}</CardAlias>}
                  <CardMeta>
                    <MetaChip>서명 {fmtDate(t.signDate)}</MetaChip>
                    {t.violationDate && (
                      <MetaChip style={{ color: treatyPalette.danger }}>
                        파기 {fmtDate(t.violationDate)}
                      </MetaChip>
                    )}
                    {t.location && <MetaChip>{t.location}</MetaChip>}
                  </CardMeta>
                  <SignatoryList>
                    {t.signatories.map((s) => {
                      const name =
                        s.country?.name ?? s.historicalCountry?.name ?? '?'
                      const flag = s.country?.flagEmoji ?? ''
                      return (
                        <SignatoryChip key={s.id}>
                          {flag && <span>{flag}</span>}
                          {name}
                        </SignatoryChip>
                      )
                    })}
                  </SignatoryList>
                </CardBody>
              </Card>
            )
          })}
        </Grid>
      )}

      {createOpen && (
        <TreatyCreateModal
          country={country}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false)
            invalidate()
            setDetailId(id)
          }}
        />
      )}
    </Wrap>
    )

  return <ThemeProvider theme={treatyTheme}>{inner}</ThemeProvider>
}

// ──────────────────────────────────────────────
// 조약 생성 모달
// ──────────────────────────────────────────────

const TreatyCreateModal: React.FC<{
  country: UnifiedCountry
  onClose: () => void
  onCreated: (id: string) => void
}> = ({ country, onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [alias, setAlias] = useState('')
  const [type, setType] = useState<TreatyType>('NON_AGGRESSION')
  const [signDate, setSignDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [violationDate, setViolationDate] = useState('')
  const [violationReason, setViolationReason] = useState('')
  const [location, setLocation] = useState('')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim() || !signDate.trim()) {
      toast.error('조약명과 서명일은 필수입니다.')
      return
    }
    setSubmitting(true)
    try {
      const dto: CreateTreatyDto = {
        name: name.trim(),
        alias: alias.trim() || null,
        type,
        signDate,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        violationDate: violationDate || null,
        violationReason: violationReason.trim() || null,
        location: location.trim() || null,
        summary: summary.trim() || null,
        signatories: [
          {
            countryId: country.type === 'modern' ? country.id : null,
            historicalCountryId:
              country.type === 'historical' ? country.id : null,
            participationType: 'SIGNATORY',
          },
        ],
      }
      const created = await treatyApi.create(dto)
      toast.success('조약이 등록되었습니다.')
      onCreated(created.id)
    } catch (e) {
      toast.error(getApiErrorMessage(e, '등록 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>조약 등록</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>
                조약명 <Required>*</Required>
              </FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 독소 불가침 조약"
              />
            </Field>
            <Field>
              <FieldLabel>별칭 (선택)</FieldLabel>
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="예: 몰로토프-리벤트로프 조약"
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>
                  조약 유형 <Required>*</Required>
                </FieldLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as TreatyType)}
                >
                  {(
                    Object.entries(TREATY_TYPE_LABELS) as [TreatyType, string][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field>
                <FieldLabel>서명 장소 (선택)</FieldLabel>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 모스크바"
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>
                  서명일 <Required>*</Required>
                </FieldLabel>
                <Input
                  type="date"
                  value={signDate}
                  onChange={(e) => setSignDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>발효일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </Field>
            </Row2>
            <Row2>
              <Field>
                <FieldLabel>만료일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>파기일 (선택)</FieldLabel>
                <Input
                  type="date"
                  value={violationDate}
                  onChange={(e) => setViolationDate(e.target.value)}
                />
              </Field>
            </Row2>
            {violationDate && (
              <Field>
                <FieldLabel>파기 사유 (선택)</FieldLabel>
                <Input
                  value={violationReason}
                  onChange={(e) => setViolationReason(e.target.value)}
                  placeholder="파기 이유를 간략히 입력하세요"
                />
              </Field>
            )}
            <Field>
              <FieldLabel>개요 (선택)</FieldLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="조약의 핵심 내용을 간략히 설명하세요"
                rows={3}
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '등록 중…' : '등록'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
    </Overlay>
  )
}

// ──────────────────────────────────────────────
// 조약 상세 뷰
// ──────────────────────────────────────────────

const TreatyDetail: React.FC<{
  treatyId: string
  country: UnifiedCountry
  onBack: () => void
  onInvalidate: () => void
}> = ({ treatyId, country, onBack, onInvalidate }) => {
  const qc = useQueryClient()
  const ts = useTheme().ts!

  const { data: treaty, isLoading } = useQuery({
    queryKey: ['treaty', treatyId],
    queryFn: () => treatyApi.getById(treatyId),
  })

  const [addSignatoryOpen, setAddSignatoryOpen] = useState(false)
  const [addTermOpen, setAddTermOpen] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const invalidateTreaty = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['treaty', treatyId] })
    onInvalidate()
  }, [qc, treatyId, onInvalidate])

  const handleDeleteTreaty = async () => {
    if (
      !confirm(
        '이 조약을 삭제하시겠습니까? 모든 서명국, 조항, 이미지가 함께 삭제됩니다.',
      )
    )
      return
    try {
      await treatyApi.remove(treatyId)
      toast.success('조약이 삭제되었습니다.')
      onInvalidate()
      onBack()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteSignatory = async (id: string) => {
    if (!confirm('이 서명국 정보를 삭제하시겠습니까?')) return
    try {
      await treatyApi.removeSignatory(id)
      invalidateTreaty()
      toast.success('서명국이 삭제되었습니다.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('이 조항을 삭제하시겠습니까?')) return
    try {
      await treatyApi.removeTerm(id)
      invalidateTreaty()
      toast.success('조항이 삭제되었습니다.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !treaty) return
    setUploadingImage(true)
    try {
      const { url } = await uploadImage(file)
      const isFirst = treaty.images.length === 0
      const dto: AddTreatyImageDto = {
        treatyId: treaty.id,
        imageUrl: url,
        isPrimary: isFirst,
      }
      await treatyApi.addImage(dto)
      invalidateTreaty()
      toast.success('이미지가 추가되었습니다.')
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, '이미지 업로드 중 오류가 발생했습니다.'),
      )
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (id: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return
    try {
      await treatyApi.removeImage(id)
      invalidateTreaty()
      toast.success('이미지가 삭제되었습니다.')
    } catch (e) {
      toast.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'))
    }
  }

  if (isLoading || !treaty)
    return (
      <Wrap>
        <Empty>불러오는 중…</Empty>
      </Wrap>
    )

  const thumb =
    treaty.images.find((i) => i.isPrimary)?.imageUrl ??
    treaty.images[0]?.imageUrl

  return (
    <Wrap>
      <BackBtn onClick={onBack}>
        <FiChevronLeft size={14} /> 목록으로
      </BackBtn>

      <DetailWrap>
        <DetailCard>
          <DetailHero $url={thumb}>
            <DetailHeroOverlay>
              <DetailHeroTitle>{treaty.name}</DetailHeroTitle>
              {treaty.alias && (
                <DetailHeroAlias>{treaty.alias}</DetailHeroAlias>
              )}
            </DetailHeroOverlay>
          </DetailHero>

          <DetailBody>
            {/* 기본 정보 */}
            <Section>
              <SectionTitle>기본 정보</SectionTitle>
              <InfoGrid>
                <InfoItem>
                  <InfoLabel>유형</InfoLabel>
                  <InfoValue>{TREATY_TYPE_LABELS[treaty.type]}</InfoValue>
                </InfoItem>
                <InfoItem>
                  <InfoLabel>서명일</InfoLabel>
                  <InfoValue>{fmtDate(treaty.signDate)}</InfoValue>
                </InfoItem>
                {treaty.effectiveDate && (
                  <InfoItem>
                    <InfoLabel>발효일</InfoLabel>
                    <InfoValue>{fmtDate(treaty.effectiveDate)}</InfoValue>
                  </InfoItem>
                )}
                {treaty.expiryDate && (
                  <InfoItem>
                    <InfoLabel>만료일</InfoLabel>
                    <InfoValue>{fmtDate(treaty.expiryDate)}</InfoValue>
                  </InfoItem>
                )}
                {treaty.violationDate && (
                  <InfoItem>
                    <InfoLabel>파기일</InfoLabel>
                    <InfoValue style={{ color: ts.danger }}>
                      {fmtDate(treaty.violationDate)}
                    </InfoValue>
                  </InfoItem>
                )}
                {treaty.location && (
                  <InfoItem>
                    <InfoLabel>서명 장소</InfoLabel>
                    <InfoValue>{treaty.location}</InfoValue>
                  </InfoItem>
                )}
              </InfoGrid>
              {treaty.violationReason && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    background: ts.dangerLight,
                    borderRadius: 10,
                    fontSize: 13,
                    color: ts.danger,
                  }}
                >
                  파기 사유: {treaty.violationReason}
                </div>
              )}
            </Section>

            {/* 개요 */}
            {treaty.summary && (
              <Section>
                <SectionTitle>개요</SectionTitle>
                <TextBlock>{treaty.summary}</TextBlock>
              </Section>
            )}

            {/* 배경 */}
            {treaty.background && (
              <Section>
                <SectionTitle>배경</SectionTitle>
                <TextBlock>{treaty.background}</TextBlock>
              </Section>
            )}

            {/* 여파 */}
            {treaty.aftermath && (
              <Section>
                <SectionTitle>결과 · 여파</SectionTitle>
                <TextBlock>{treaty.aftermath}</TextBlock>
              </Section>
            )}

            {/* 서명국 */}
            <Section>
              <SectionTitle>
                <FiUsers size={13} />
                서명국 · 참여국 ({treaty.signatories.length})
              </SectionTitle>
              <SignatoryRow>
                {treaty.signatories.map((s) => {
                  const countryName =
                    s.country?.name ?? s.historicalCountry?.name ?? '알 수 없음'
                  const flag = s.country?.flagEmoji ?? ''
                  const personName = s.person
                    ? getPersonDisplayName({
                        name: s.person.name ?? '',
                        surname: s.person.surname,
                        middleName: (s.person as { middleName?: string | null }).middleName,
                        country: (s.person as { country?: { defaultNameDisplayOrder?: string | null } | null })
                          .country,
                      })
                    : null
                  const cabinetLabel = s.cabinet
                    ? (s.cabinet.name ??
                      (() => {
                        const ht = s.cabinet.headTenure
                        const pName = ht?.person
                          ? getPersonDisplayName({
                              name: ht.person.name ?? '',
                              surname: ht.person.surname,
                              middleName: (ht.person as { middleName?: string | null }).middleName,
                              country: (
                                ht.person as {
                                  country?: { defaultNameDisplayOrder?: string | null } | null
                                }
                              ).country,
                            })
                          : ''
                        const term = ht?.termNumber ?? ht?.subTermNumber
                        return term
                          ? `제${term}대 ${pName} 행정부`
                          : `${pName} 행정부`
                      })())
                    : null
                  return (
                    <SignatoryCard key={s.id}>
                      <SignatoryCountry>
                        {flag} {countryName}
                      </SignatoryCountry>
                      {personName && (
                        <SignatoryPerson>서명자: {personName}</SignatoryPerson>
                      )}
                      {s.role && <SignatoryRole>직책: {s.role}</SignatoryRole>}
                      {cabinetLabel && (
                        <SignatoryRole>행정부: {cabinetLabel}</SignatoryRole>
                      )}
                      {s.signedAt && (
                        <SignatoryRole>
                          {fmtDate(s.signedAt)} 서명
                        </SignatoryRole>
                      )}
                      <SignatoryBadge $type={s.participationType}>
                        {TREATY_PARTICIPATION_LABELS[s.participationType]}
                      </SignatoryBadge>
                      <button
                        onClick={() => handleDeleteSignatory(s.id)}
                        style={{
                          float: 'right',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: ts.textMuted,
                          padding: 0,
                        }}
                        title="삭제"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </SignatoryCard>
                  )
                })}
              </SignatoryRow>
              <ActionBar>
                <ActionBtn
                  $variant="ghost"
                  onClick={() => setAddSignatoryOpen(true)}
                >
                  <FiPlus size={12} /> 서명국 추가
                </ActionBtn>
              </ActionBar>
            </Section>

            {/* 조항 */}
            <Section>
              <SectionTitle>
                <FiFileText size={13} />
                조약 조항 ({treaty.terms.length})
              </SectionTitle>
              <TermList>
                {treaty.terms.map((term, idx) => (
                  <TermItem key={term.id} $secret={term.isSecret}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <TermTitle>
                        제{idx + 1}조{term.title ? ` — ${term.title}` : ''}
                        {term.isSecret && <SecretBadge>비밀</SecretBadge>}
                      </TermTitle>
                      <button
                        onClick={() => handleDeleteTerm(term.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: ts.textMuted,
                          padding: 0,
                        }}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                    <TermContent>{term.content}</TermContent>
                  </TermItem>
                ))}
              </TermList>
              <ActionBar>
                <ActionBtn
                  $variant="ghost"
                  onClick={() => setAddTermOpen(true)}
                >
                  <FiPlus size={12} /> 조항 추가
                </ActionBtn>
              </ActionBar>
            </Section>

            {/* 이미지 */}
            <Section>
              <SectionTitle>
                <FiImage size={13} />
                이미지 ({treaty.images.length})
              </SectionTitle>
              {treaty.images.length > 0 && (
                <ImageGrid>
                  {treaty.images.map((img) => (
                    <ImgThumb key={img.id} $url={img.imageUrl}>
                      {img.isPrimary && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 5,
                            left: 5,
                            background: ts.gold,
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}
                        >
                          대표
                        </span>
                      )}
                      <ImgOverlay>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          style={{
                            background: 'rgba(239,68,68,0.9)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          삭제
                        </button>
                      </ImgOverlay>
                    </ImgThumb>
                  ))}
                </ImageGrid>
              )}
              <ActionBar>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: `1px solid ${ts.border}`,
                    background: ts.card,
                    color: ts.textSub,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: uploadingImage ? 'not-allowed' : 'pointer',
                    opacity: uploadingImage ? 0.5 : 1,
                  }}
                >
                  <FiImage size={12} />
                  {uploadingImage ? '업로드 중…' : '이미지 추가'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                </label>
              </ActionBar>
            </Section>

            {/* 액션 */}
            <ActionBar>
              <ActionBtn $variant="danger" onClick={handleDeleteTreaty}>
                <FiTrash2 size={12} /> 조약 삭제
              </ActionBtn>
            </ActionBar>
          </DetailBody>
        </DetailCard>
      </DetailWrap>

      {/* 서명국 추가 모달 */}
      {addSignatoryOpen && (
        <AddSignatoryModal
          treatyId={treatyId}
          onClose={() => setAddSignatoryOpen(false)}
          onAdded={() => {
            setAddSignatoryOpen(false)
            invalidateTreaty()
          }}
        />
      )}

      {/* 조항 추가 모달 */}
      {addTermOpen && (
        <AddTermModal
          treatyId={treatyId}
          nextOrder={treaty.terms.length}
          onClose={() => setAddTermOpen(false)}
          onAdded={() => {
            setAddTermOpen(false)
            invalidateTreaty()
          }}
        />
      )}
    </Wrap>
  )
}

// ──────────────────────────────────────────────
// 서명국 추가 모달
// ──────────────────────────────────────────────

const AddSignatoryModal: React.FC<{
  treatyId: string
  onClose: () => void
  onAdded: () => void
}> = ({ treatyId, onClose, onAdded }) => {
  const [countryId, setCountryId] = useState('')
  const [historicalCountryId, setHistoricalCountryId] = useState('')
  const [personId, setPersonId] = useState('')
  const [cabinetId, setCabinetId] = useState('')
  const [role, setRole] = useState('')
  const [participationType, setParticipationType] =
    useState<TreatyParticipationType>('SIGNATORY')
  const [signedAt, setSignedAt] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 국가/인물 검색을 위한 간단 텍스트 입력 (실제 구현에서는 SelectModal 사용)
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await treatyApi.addSignatory({
        treatyId,
        countryId: countryId || null,
        historicalCountryId: historicalCountryId || null,
        personId: personId || null,
        cabinetId: cabinetId || null,
        role: role || null,
        participationType,
        signedAt: signedAt || null,
        note: note || null,
      })
      toast.success('서명국이 추가되었습니다.')
      onAdded()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '추가 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>서명국 · 참여국 추가</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>현대 국가 ID (선택)</FieldLabel>
              <Input
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                placeholder="국가 ID를 입력하세요"
              />
            </Field>
            <Field>
              <FieldLabel>역사적 국가 ID (선택)</FieldLabel>
              <Input
                value={historicalCountryId}
                onChange={(e) => setHistoricalCountryId(e.target.value)}
                placeholder="역사적 국가 ID를 입력하세요"
              />
            </Field>
            <Field>
              <FieldLabel>서명 인물 ID (선택)</FieldLabel>
              <Input
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                placeholder="예: 몰로토프, 리벤트로프의 인물 ID"
              />
            </Field>
            <Field>
              <FieldLabel>소속 행정부 ID (선택)</FieldLabel>
              <Input
                value={cabinetId}
                onChange={(e) => setCabinetId(e.target.value)}
                placeholder="예: 스탈린 행정부 ID"
              />
            </Field>
            <Row2>
              <Field>
                <FieldLabel>역할/직책 (선택)</FieldLabel>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="예: 외무인민위원"
                />
              </Field>
              <Field>
                <FieldLabel>참여 유형</FieldLabel>
                <Select
                  value={participationType}
                  onChange={(e) =>
                    setParticipationType(
                      e.target.value as TreatyParticipationType,
                    )
                  }
                >
                  {(
                    Object.entries(TREATY_PARTICIPATION_LABELS) as [
                      TreatyParticipationType,
                      string,
                    ][]
                  ).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
            </Row2>
            <Field>
              <FieldLabel>서명일 (선택)</FieldLabel>
              <Input
                type="date"
                value={signedAt}
                onChange={(e) => setSignedAt(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>비고 (선택)</FieldLabel>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="추가 메모"
              />
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '추가 중…' : '추가'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
    </Overlay>
  )
}

// ──────────────────────────────────────────────
// 조항 추가 모달
// ──────────────────────────────────────────────

const AddTermModal: React.FC<{
  treatyId: string
  nextOrder: number
  onClose: () => void
  onAdded: () => void
}> = ({ treatyId, nextOrder, onClose, onAdded }) => {
  const ts = useTheme().ts!
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSecret, setIsSecret] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('조항 내용을 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      await treatyApi.addTerm({
        treatyId,
        order: nextOrder,
        title: title.trim() || null,
        content: content.trim(),
        isSecret,
      })
      toast.success('조항이 추가되었습니다.')
      onAdded()
    } catch (e) {
      toast.error(getApiErrorMessage(e, '추가 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>조항 추가</ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX size={18} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          <FormRows>
            <Field>
              <FieldLabel>조항 제목 (선택)</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 상호 불가침"
              />
            </Field>
            <Field>
              <FieldLabel>
                조항 내용 <Required>*</Required>
              </FieldLabel>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="조항 내용을 입력하세요"
              />
            </Field>
            <Field>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: ts.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSecret}
                  onChange={(e) => setIsSecret(e.target.checked)}
                />
                비밀 조항 (비밀의정서 등)
              </label>
            </Field>
          </FormRows>
        </ModalBody>
        <ModalFooter>
          <CancelBtn onClick={onClose}>취소</CancelBtn>
          <SubmitBtn onClick={handleSubmit} disabled={submitting}>
            {submitting ? '추가 중…' : '추가'}
          </SubmitBtn>
        </ModalFooter>
      </Modal>
    </Overlay>
  )
}
