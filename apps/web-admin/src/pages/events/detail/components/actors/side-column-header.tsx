import { FiExternalLink, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairline,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { type EventSide, type SideOutcome } from '@/shared/api/event-sides'
import { pathKeys } from '@/shared/router'
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'

import { InlineSelect, InlineText } from '../inline'
import { SIDE_OUTCOME_LABEL, SIDE_OUTCOME_OPTIONS } from '../side-outcome'
import {
  GroupCount,
  SideHead,
  SideHeadRight,
  SideHeadTitle,
  SideOutcomeTag,
  SideQuickAddBtn,
  SideSwatch,
} from './actors.styles'

interface SideColumnHeaderProps {
  side: EventSide | null
  label: string
  color?: string
  memberCount: number
  readOnly?: boolean
  busy?: boolean
  quickAddLabel?: string
  onQuickAdd?: () => void
  showOutcomeNote?: boolean
  showDescription?: boolean
  showFaction?: boolean
  groupOptions?: Array<{ value: string; label: string }>
  onOpenExtra?: (extraKey: 'outcomeNote' | 'description' | 'faction') => void
  onRename?: (nextName: string) => void
  onSetOutcome?: (patch: { outcome?: SideOutcome | null; outcomeNote?: string | null }) => void
  onDescribe?: (nextDescription: string) => void
  onLinkGroup?: (groupId: string | null) => void
  onImportGroupMembers?: () => void
  onCreateGroup?: () => void
  onRemoveSide?: () => void
}

export function SideColumnHeader({
  side,
  label,
  color,
  memberCount,
  readOnly = false,
  busy = false,
  quickAddLabel,
  onQuickAdd,
  showOutcomeNote = false,
  showDescription = false,
  showFaction = false,
  groupOptions = [],
  onOpenExtra,
  onRename,
  onSetOutcome,
  onDescribe,
  onLinkGroup,
  onImportGroupMembers,
  onCreateGroup,
  onRemoveSide,
}: SideColumnHeaderProps) {
  if (!side) {
    return (
      <SideHead $color={color}>
        <SideHeadTitle>
          <span>{label}</span>
          <GroupCount>{memberCount}</GroupCount>
        </SideHeadTitle>
      </SideHead>
    )
  }

  const hasOutcomeNote = Boolean(side.outcomeNote?.trim()) || showOutcomeNote
  const hasDescription = Boolean(side.description?.trim()) || showDescription
  const hasFaction = Boolean(side.personGroupId) || showFaction

  const menuItems: PopoverMenuEntry[] = []
  if (!readOnly && onOpenExtra) {
    if (side.outcome && !hasOutcomeNote) {
      menuItems.push({
        id: 'add-outcome-note',
        label: '결과 단서 입력 (예: 전술적 승리)',
        onSelect: () => onOpenExtra('outcomeNote'),
      })
    }
    if (!hasDescription) {
      menuItems.push({
        id: 'add-description',
        label: '진영 설명 추가',
        onSelect: () => onOpenExtra('description'),
      })
    }
    if (!hasFaction) {
      menuItems.push({
        id: 'link-faction',
        label: '영구 계파·집단 연결',
        onSelect: () => onOpenExtra('faction'),
      })
    }
  }
  if (!readOnly && onRemoveSide) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider', id: 'div-remove-side' })
    }
    menuItems.push({
      id: 'remove-side',
      label: '이 진영 삭제',
      danger: true,
      onSelect: () => onRemoveSide(),
    })
  }

  return (
    <HeaderWrap>
      <SideHead $color={color}>
        <SideHeadTitle>
          {color && <SideSwatch $color={color} aria-hidden />}
          {!readOnly && onRename ? (
            <InlineNameWrap>
              <InlineText
                value={side.name}
                onSave={onRename}
                placeholder="진영 이름"
                label={`${side.name} 이름`}
                as="span"
              />
            </InlineNameWrap>
          ) : (
            <span>{side.name}</span>
          )}
          <GroupCount>{memberCount}</GroupCount>
          {readOnly && side.outcome && (
            <SideOutcomeTag title={side.outcomeNote ?? undefined}>
              {SIDE_OUTCOME_LABEL[side.outcome]}
            </SideOutcomeTag>
          )}
        </SideHeadTitle>

        {!readOnly && (
          <SideHeadRight>
            {onSetOutcome && (
              <OutcomeField aria-label={`${side.name} 결과`}>
                <InlineSelect
                  value={side.outcome ?? ''}
                  options={SIDE_OUTCOME_OPTIONS}
                  onSave={(nextValue) =>
                    onSetOutcome({ outcome: (nextValue || null) as SideOutcome | null })
                  }
                  placeholder="결과 미정"
                  label={`${side.name} 결과`}
                />
              </OutcomeField>
            )}
            {onQuickAdd && quickAddLabel && (
              <SideQuickAddBtn type="button" onClick={onQuickAdd} disabled={busy}>
                <FiPlus size={11} aria-hidden />
                {quickAddLabel}
              </SideQuickAddBtn>
            )}
            {menuItems.length > 0 && (
              <PopoverMenu
                size="sm"
                align="right"
                items={menuItems}
                ariaLabel={`${side.name} 관리 메뉴`}
                title="진영 설명 · 계파 연결 · 진영 삭제"
              />
            )}
          </SideHeadRight>
        )}
      </SideHead>

      {side.outcome && (readOnly ? Boolean(side.outcomeNote?.trim()) : hasOutcomeNote) && (
        <MetaSubRow>
          {readOnly || !onSetOutcome ? (
            <span>{side.outcomeNote}</span>
          ) : (
            <InlineText
              value={side.outcomeNote ?? ''}
              onSave={(nextText) => onSetOutcome({ outcomeNote: nextText.trim() || null })}
              placeholder="결과 단서 추가 — 예: 전략적 승리, 전술적 패배"
              label={`${side.name} 결과 단서`}
              as="span"
            />
          )}
        </MetaSubRow>
      )}

      {hasFaction && (
        <FactionRow aria-label={`${side.name} 영구 계파 연결`}>
          {side.personGroupId ? (
            <>
              <FactionLink
                to={pathKeys.personGroupDetail(side.personGroupId)}
                title="영구 등록된 집단·계파 상세 보기"
              >
                계파: {side.personGroup?.name ?? side.name} <FiExternalLink size={11} />
              </FactionLink>
              {!readOnly && onImportGroupMembers && (
                <TinyTextBtn type="button" onClick={onImportGroupMembers}>
                  소속 인물 불러오기
                </TinyTextBtn>
              )}
              {!readOnly && onLinkGroup && (
                <TinyTextBtn type="button" onClick={() => onLinkGroup(null)}>
                  연결 해제
                </TinyTextBtn>
              )}
            </>
          ) : (
            !readOnly && (
              <>
                {groupOptions.length > 0 && onLinkGroup && (
                  <InlineSelect
                    value=""
                    options={groupOptions}
                    onSave={(groupId) => onLinkGroup(groupId || null)}
                    placeholder="기존 계파·집단 선택"
                    label={`${side.name}에 연결할 영구 집단·계파`}
                  />
                )}
                {onCreateGroup && (
                  <TinyTextBtn type="button" onClick={onCreateGroup}>
                    + 새 영구 계파 등록
                  </TinyTextBtn>
                )}
              </>
            )
          )}
        </FactionRow>
      )}

      {(readOnly ? Boolean(side.description?.trim()) : hasDescription) && (
        <MetaSubRow>
          {readOnly || !onDescribe ? (
            <span>{side.description}</span>
          ) : (
            <InlineText
              value={side.description ?? ''}
              onSave={onDescribe}
              placeholder="이 진영의 성격이나 목표를 한두 문장으로 기록"
              label={`${side.name} 설명`}
              multiline
              multilineEnter
            />
          )}
        </MetaSubRow>
      )}
    </HeaderWrap>
  )
}

const HeaderWrap = styled.div`
  display: flex;
  flex-direction: column;
`

const InlineNameWrap = styled.span`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 800;
`

const OutcomeField = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: ${metaText};
`

const MetaSubRow = styled.div`
  padding: 5px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
  line-height: 1.5;
  color: ${metaText};
`

const FactionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding: 5px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  font-size: 12px;
`

const FactionLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 650;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const TinyTextBtn = styled.button`
  padding: 2px 7px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
`
