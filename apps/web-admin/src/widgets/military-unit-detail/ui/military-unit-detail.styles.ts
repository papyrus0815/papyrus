import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  DIGIT_DISPLAY,
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  ledgerSubtleFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'

export const DetailContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $compact }) => ($compact ? '14px' : '16px')};
  width: 100%;
  min-width: 0;
`

export const EmbeddedTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const EmbeddedTopLeft = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

export const EmbeddedBackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const EmbeddedCrumbTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const EmbeddedTopRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const LedgerSection = styled.section<{ $compact?: boolean }>`
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.MD};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  overflow: hidden;
`

export const IdentityHeader = styled.div<{ $compact?: boolean }>`
  padding: ${({ $compact }) => ($compact ? '14px 16px' : '18px 20px 16px')};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
`

export const IdentityMain = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
`

export const InsigniaImg = styled.img<{ $compact?: boolean }>`
  width: ${({ $compact }) => ($compact ? '48px' : '56px')};
  height: ${({ $compact }) => ($compact ? '48px' : '56px')};
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

export const InsigniaFallback = styled.div<{ $compact?: boolean }>`
  width: ${({ $compact }) => ($compact ? '48px' : '56px')};
  height: ${({ $compact }) => ($compact ? '48px' : '56px')};
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const IdentityTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

export const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

export const AccentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

export const NeutralBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const StatusPill = styled.span<{ $disbanded: boolean }>`
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme, $disbanded }) =>
    $disbanded
      ? ledgerSubtleFill(theme.mode)
      : theme.mode === 'dark'
        ? 'rgba(16, 185, 129, 0.14)'
        : 'rgba(16, 185, 129, 0.1)'};
  color: ${({ theme, $disbanded }) =>
    $disbanded
      ? theme.colors.text.tertiary
      : theme.mode === 'dark'
        ? '#6ee7b7'
        : '#047857'};
`

export const UnitTitle = styled.h1<{ $compact?: boolean }>`
  margin: 0;
  font-size: ${({ $compact }) => ($compact ? '17px' : '21px')};
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.text.primary};
`

export const AbbrSpan = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const NickSpan = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ForeignTitle = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const MottoLine = styled.div`
  font-size: 12px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SpecStrip = styled.div<{ $compact?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $compact }) =>
    $compact ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))'};
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const SpecCell = styled.div`
  padding: 10px 14px;
  border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  &:last-child {
    border-right: none;
  }
`

export const SpecLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const SpecValue = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

export const MapPreviewSection = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SectionHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 16px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const SectionHeadLeft = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

export const SectionHeadTitle = styled.h2`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  ${DIGIT_DISPLAY}
`

export const SectionBody = styled.div`
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

export const SectionEmpty = styled.div`
  padding: 24px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ChainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ChainNodeBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

export const ChainDeptLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

export const RootPill = styled.span`
  padding: 5px 9px;
  border-radius: 7px;
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const CurrentNodePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 12px;
`

export const SubBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

export const SubBlockHeadRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const SubBlockLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const MutedLine = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const MutedSpan = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const LineageStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

export const LineageRowCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const LineageRowMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

export const YearPill = styled.span`
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${DIGIT_DISPLAY}
`

export const LineageNote = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

export const InlineFormBox = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

export const InlineFormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
`

export const FormSelect = styled.select`
  height: 31px;
  padding: 0 24px 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  min-width: 128px;
  flex: 1 1 150px;
`

export const FormInput = styled.input`
  height: 31px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  flex: 1 1 150px;
`

export const SubUnitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 8px;
`

export const SubUnitCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const SubUnitTitle = styled.div`
  font-size: 12.5px;
  font-weight: 700;
`

export const VesselCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 9px 11px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12.5px;
`

export const TableWrap = styled.div`
  overflow-x: auto;
`

export const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  th {
    padding: 8px 14px;
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.tertiary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
    white-space: nowrap;
  }

  td {
    padding: 9px 14px;
    font-size: 12.5px;
    color: ${({ theme }) => theme.colors.text.primary};
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    vertical-align: middle;
  }

  td.num {
    ${DIGIT_DISPLAY}
    color: ${({ theme }) => theme.colors.text.secondary};
    white-space: nowrap;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover td {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const InlineLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

export const InlineEntityBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

export const DeploymentEventCell = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

export const SurveyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    opacity: 0.88;
  }
`

export const OutcomeSpan = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ChipStack = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
`

export const InheritedHint = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ContextMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  padding: 14px 16px;
`

export const ContextMetaCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
`

export const ContextMetaLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const ContextMetaBody = styled.div`
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`

export const DescriptionProse = styled.div`
  padding: 13px 16px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

export const SubViewSegment = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 7px;
  overflow: hidden;
`

export const SubViewSegBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 27px;
  padding: 0 9px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? ledgerAccent(theme.mode) : theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;

  &:not(:last-child) {
    border-right: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

export const SubTreeContainer = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: 8px;
  overflow: hidden;
`

export const SubTreeNodeWrap = styled.div`
  display: flex;
  flex-direction: column;
`

export const SubTreeRow = styled.div<{ $depth: number }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px 8px ${({ $depth }) => 12 + $depth * 22}px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12.5px;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
`

export const SubTreeChildren = styled.div`
  display: flex;
  flex-direction: column;
`

export const SubTreeToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => ledgerSubtleFill(theme.mode)};
  }
`

export const SubTreeSpacer = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
`

export const CommanderSearchWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const CommanderSearchInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 12px;
  width: 144px;
`

export const CommanderSearchClear = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
`

export const UnlinkedBarBox = styled.div`
  padding: 10px 16px 0;
`

export const OrdinalBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  ${DIGIT_DISPLAY}
`

export const PartyBadge = styled.span<{ $color?: string | null }>`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid
    ${({ theme, $color }) => $color || ledgerHairlineStrong(theme.mode)};
  color: ${({ theme }) => theme.colors.text.secondary};
`

export const ParentWarHintLink = styled(Link)`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

export const LoadingBox = styled.div`
  padding: 48px 20px;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
`
