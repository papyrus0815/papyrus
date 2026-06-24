/**
 * 매트릭스 막대 클릭 시 뜨는 인물 프리뷰 — "상세 보기"로 이동.
 * ESC·backdrop·X 로 닫힘. 초기 포커스는 '상세 보기'(Enter로 이동), 포커스 트랩 적용.
 */
import { useRef } from 'react'
import { createPortal } from 'react-dom'

import { FiArrowRight, FiX } from 'react-icons/fi'
import styled, { useTheme } from 'styled-components'

import { Z_INDEX } from '@/shared/styles/z-index'
import { useModalBehavior } from '@/shared/ui/modal'

import type { AdaptedPerson } from '../../model/types'
import { formatYear } from '../../model/century'

interface Props {
  person: AdaptedPerson | null
  onClose: () => void
  onOpenDetail: (id: string) => void
}

export function PersonPreviewModal({ person, onClose, onOpenDetail }: Props) {
  const theme = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  // Esc 닫기 + 포커스 트랩 + 초기 포커스(PrimaryBtn autoFocus 존중) + 닫을 때 트리거로 복원 + 스크롤 락.
  // (이전엔 전역 Enter 핸들러가 '닫기' 버튼 포커스 시에도 항상 상세 이동을 트리거)
  useModalBehavior({ isOpen: !!person, onClose, containerRef: cardRef })

  if (!person) return null
  const era = person.era
  const born = person.born == null ? '?' : formatYear(person.born)
  const died = person.died == null ? '?' : formatYear(person.died)
  const age = person.age != null ? `${person.age}세` : null

  return createPortal(
    <Overlay
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${person.name} 인물 정보`}
    >
      <Card ref={cardRef} onClick={(e) => e.stopPropagation()}>
        <Close type="button" onClick={onClose} aria-label="닫기">
          <FiX size={18} />
        </Close>
        <Header>
          {person.profileImageUrl ? (
            <Avatar src={person.profileImageUrl} alt={person.name} />
          ) : (
            <AvatarPh $color={era.color}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width={32}
                height={32}
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </AvatarPh>
          )}
          <HeaderText>
            <Name>{person.name}</Name>
            {person.primaryTitle && <Title>{person.primaryTitle}</Title>}
            <Era $color={era.color}>
              <span />
              {era.lbl}
            </Era>
          </HeaderText>
        </Header>

        <MetaGrid>
          <MetaRow>
            <MetaKey>생몰</MetaKey>
            <MetaVal>
              {born} – {died}
              {age ? ` · ${age}` : ''}
            </MetaVal>
          </MetaRow>
          <MetaRow>
            <MetaKey>국가 / 파벌</MetaKey>
            <MetaVal>
              {person.country}
              {person.faction ? ` · ${person.faction}` : ''}
            </MetaVal>
          </MetaRow>
          <MetaRow>
            <MetaKey>지역 / 분야</MetaKey>
            <MetaVal>
              {person.region} · {person.field}
            </MetaVal>
          </MetaRow>
          <MetaRow>
            <MetaKey>영향력</MetaKey>
            <MetaVal>
              <InfluenceBar>
                <InfluenceFill
                  style={{
                    width: `${Math.min(100, Math.max(0, person.influence))}%`,
                    background: era.color,
                  }}
                />
              </InfluenceBar>
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: theme.colors.text.secondary,
                  marginLeft: 8,
                }}
              >
                {person.influence}
              </span>
            </MetaVal>
          </MetaRow>
        </MetaGrid>

        {person.biography && <Bio>{person.biography}</Bio>}

        <Actions>
          <SecondaryBtn type="button" onClick={onClose}>
            닫기
          </SecondaryBtn>
          <PrimaryBtn
            type="button"
            onClick={() => onOpenDetail(person.id)}
            autoFocus
          >
            상세 보기
            <FiArrowRight size={16} />
          </PrimaryBtn>
        </Actions>
      </Card>
    </Overlay>,
    document.body,
  )
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  animation: previewOverlayIn 0.16s ease;
  @keyframes previewOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const Card = styled.div`
  position: relative;
  width: 100%;
  max-width: 420px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: previewCardIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  @keyframes previewCardIn {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) { animation: none; }
`

const Close = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Header = styled.div`
  display: flex;
  gap: 14px;
  align-items: center;
`

const Avatar = styled.img`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  object-position: top center;
  flex-shrink: 0;
`

const AvatarPh = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $color }) => $color}22;
  color: ${({ $color }) => $color};
`

const HeaderText = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
`

const Name = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Title = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Era = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => $color}1f;
  align-self: flex-start;
  margin-top: 2px;
  > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

const MetaGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 10px;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
`

const MetaKey = styled.span`
  width: 76px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11px;
  font-weight: 500;
`

const MetaVal = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const InfluenceBar = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
  max-width: 180px;
`

const InfluenceFill = styled.div`
  height: 100%;
  border-radius: 3px;
  transition: width 0.18s ease;
`

const Bio = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const SecondaryBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PrimaryBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.active};
  color: #fff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  &:hover {
    filter: brightness(1.08);
  }
`
