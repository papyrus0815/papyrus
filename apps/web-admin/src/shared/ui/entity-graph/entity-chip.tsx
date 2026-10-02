/**
 * 엔티티 칩 — 어떤 종류든 같은 모양·같은 동작으로 건너가는 단위.
 *
 * - onOpen이 있으면 버튼(호스트가 미리보기 모달 등으로 가로챔), 없으면 상세 경로 링크,
 *   경로도 없으면 누를 수 없는 표지.
 * - accessible=false(다른 계정의 인물·사건)는 흐리게·비활성 — 눌러도 404인 데드엔드를 막는다.
 */
import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { EntityConnectionTarget, EntityKind } from '@/shared/api/entity-graph'
import { getUploadImageUrl } from '@/shared/api/upload'

import { ENTITY_KIND_META, entityPath } from './entity-kind'

interface EntityChipProps {
  target: EntityConnectionTarget
  /** 호스트가 가로채 여는 핸들러(미리보기 모달 등) — openableKinds에 든 종류에만 쓴다 */
  onOpen?: (target: EntityConnectionTarget) => void
  /** onOpen으로 여는 종류 — 나머지는 상세 경로 링크, 경로가 없으면 표지 */
  openableKinds?: readonly EntityKind[]
}

export function EntityChip({ target, onOpen, openableKinds = [] }: EntityChipProps) {
  const meta = ENTITY_KIND_META[target.kind]
  const path = entityPath(target.kind, target.id)
  const inner = (
    <>
      {target.imageUrl && target.kind === 'person' ? (
        <Avatar src={getUploadImageUrl(target.imageUrl) || target.imageUrl} alt="" loading="lazy" />
      ) : (
        <meta.Icon size={12} aria-hidden />
      )}
      <Label>{target.label}</Label>
    </>
  )
  const title = `${meta.label} · ${target.label}${target.subtitle ? ` (${target.subtitle})` : ''}`

  if (!target.accessible) {
    return (
      <Chip as="span" $disabled title={`${title} — 다른 계정의 기록이라 열 수 없습니다`}>
        {inner}
      </Chip>
    )
  }
  if (onOpen && openableKinds.includes(target.kind)) {
    return (
      <Chip as="button" type="button" title={title} onClick={() => onOpen(target)}>
        {inner}
      </Chip>
    )
  }
  if (path) {
    return (
      <Chip as={Link} to={path} title={title}>
        {inner}
      </Chip>
    )
  }
  return (
    <Chip as="span" $static title={title}>
      {inner}
    </Chip>
  )
}

const Chip = styled.span<{ $disabled?: boolean; $static?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-width: 0;
  padding: 3px 9px 3px 6px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.12s ease, color 0.12s ease;

  > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  ${({ $disabled, $static }) =>
    $disabled || $static
      ? css`
          cursor: default;
          ${$disabled ? 'opacity: 0.55;' : ''}
        `
      : css`
          &:hover,
          &:focus-visible {
            border-color: #6366f1;
            color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#4338ca')};
            outline: none;
          }
        `}
`

const Avatar = styled.img`
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  object-position: top center;
`

const Label = styled.span`
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
