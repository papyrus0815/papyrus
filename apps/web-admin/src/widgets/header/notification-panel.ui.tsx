import styled, { keyframes } from 'styled-components'

import {
  getNotificationEntityTypeLabel,
  type NotificationMessage,
} from '@/entities/notification'

// 메시지 시간 포맷 (ISO 또는 임의 문자열 → 읽기 쉬운 형식)
function formatMessageTime(isoOrText: string): string {
  if (!isoOrText || typeof isoOrText !== 'string') return ''
  const text = isoOrText.trim()
  if (!text) return ''
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime()))
    return text.length > 20 ? text.slice(0, 16) + '…' : text
  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const yesterday = today - 86400000
  const dateOnly = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  ).getTime()
  if (dateOnly === today) {
    const hours = parsed.getHours()
    const minutes = parsed.getMinutes()
    const mm = minutes.toString().padStart(2, '0')
    if (hours < 12) return `오전 ${hours}:${mm}`
    if (hours === 12) return `오후 12:${mm}`
    return `오후 ${hours - 12}:${mm}`
  }
  if (dateOnly === yesterday) return '어제'
  if (parsed.getFullYear() === now.getFullYear()) {
    return `${parsed.getMonth() + 1}월 ${parsed.getDate()}일`
  }
  return `${parsed.getFullYear()}. ${parsed.getMonth() + 1}. ${parsed.getDate()}`
}

interface NotificationPanelBodyProps {
  messages: NotificationMessage[]
  /** 데스크톱 드롭다운은 제목을 함께 표시, 모바일 모달은 헤더에 제목이 따로 있어 숨김 */
  showTitle?: boolean
  /** 첫 로드 중이면 스켈레톤 표시 (기존 목록이 있으면 깜빡임 방지를 위해 표시하지 않음) */
  isLoading?: boolean
  onMarkAllRead: () => void
  onSelect: (msg: NotificationMessage) => void
}

/**
 * 알림 패널 본문 — "모두 읽음" 헤더 + 메시지 리스트.
 * 데스크톱 드롭다운과 모바일 모달이 동일 마크업을 공유하기 위한 단일 컴포넌트.
 */
export function NotificationPanelBody({
  messages,
  showTitle = false,
  isLoading = false,
  onMarkAllRead,
  onSelect,
}: NotificationPanelBodyProps) {
  const isEmpty = messages.length === 0
  const showSkeleton = isLoading && isEmpty

  return (
    <>
      <DropdownHeaderRow>
        {showTitle && <DropdownTitle>메시지</DropdownTitle>}
        <SmallButton type="button" onClick={onMarkAllRead}>
          모두 읽음
        </SmallButton>
      </DropdownHeaderRow>
      <MessageList role="list">
        {showSkeleton &&
          [0, 1, 2].map((i) => (
            <SkeletonRow key={i} aria-hidden="true">
              <SkeletonDot />
              <SkeletonBody>
                <SkeletonLine style={{ width: '45%' }} />
                <SkeletonLine style={{ width: '85%' }} />
                <SkeletonLine style={{ width: '30%' }} />
              </SkeletonBody>
            </SkeletonRow>
          ))}

        {!showSkeleton && isEmpty && (
          <EmptyNotice>
            <EmptyTitle>아직 새 소식이 없도다</EmptyTitle>
            <EmptySubtitle>새 알림이 도착하면 이곳에 표시되느니라</EmptySubtitle>
          </EmptyNotice>
        )}

        {messages.map((msg) => {
          const typeLabel = getNotificationEntityTypeLabel(msg.ownerType)
          return (
            <MessageItem key={msg.id} role="listitem">
              <MessageRow $unread={!!msg.unread} onClick={() => onSelect(msg)}>
                <UnreadDot $visible={!!msg.unread} />
                <MessageBody>
                  <MessageTitleRow>
                    {typeLabel && <EntityTypeChip>{typeLabel}</EntityTypeChip>}
                    <MessageTitle>{String(msg.title ?? '')}</MessageTitle>
                  </MessageTitleRow>
                  {msg.preview && (
                    <MessagePreview>{String(msg.preview)}</MessagePreview>
                  )}
                  <MessageMeta>
                    {formatMessageTime(msg.time)}
                    {msg.actorName ? ` · ${msg.actorName}` : ''}
                  </MessageMeta>
                </MessageBody>
              </MessageRow>
            </MessageItem>
          )
        })}
      </MessageList>
    </>
  )
}

const DropdownHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px 14px;
  margin-bottom: 4px;
`

const DropdownTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SmallButton = styled.button`
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
    color: ${({ theme }) => theme.colors.button.hover};
  }

  &:active {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`

const MessageList = styled.div`
  max-height: 380px;
  overflow-y: auto;
  padding: 8px 4px;
  margin-top: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.primary};
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 6px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.border.medium};
  }
`

const EmptyNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 52px 28px;
  text-align: center;
  gap: 8px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.secondary};

  &::before {
    content: '🔔';
    font-size: 44px;
    opacity: 0.6;
    margin-bottom: 6px;
  }
`

const EmptyTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptySubtitle = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.5;
`

const MessageItem = styled.div`
  list-style: none;
`

const MessageRow = styled.button<{ $unread: boolean }>`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 14px;
  margin-bottom: 8px;
  border: none;
  background: ${({ $unread, theme }) =>
    $unread ? theme.colors.background.secondary : 'transparent'};
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  /* 미읽음 강조는 점(UnreadDot) + 옅은 배경으로만 표현. hover 시에도
     미읽음 배경이 사라지지 않도록 상태별 hover 색을 분리한다. */
  &:hover {
    background: ${({ $unread, theme }) =>
      $unread ? theme.colors.activeLight : theme.colors.hover};
  }

  &:active {
    transform: scale(0.99);
  }
`

// 로딩 스켈레톤
const shimmer = keyframes`
  0% { opacity: 0.55; }
  50% { opacity: 1; }
  100% { opacity: 0.55; }
`

const SkeletonRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 14px;
  margin-bottom: 8px;
`

const SkeletonDot = styled.span`
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background.tertiary};
  flex-shrink: 0;
  animation: ${shimmer} 1.3s ease-in-out infinite;
`

const SkeletonBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SkeletonLine = styled.span`
  height: 12px;
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  animation: ${shimmer} 1.3s ease-in-out infinite;
`

const UnreadDot = styled.span<{ $visible: boolean }>`
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  box-shadow: ${({ $visible, theme }) =>
    $visible ? `0 0 0 2px ${theme.colors.activeLight}` : 'none'};
  transition: all 0.2s ease;
  flex-shrink: 0;
`

const MessageBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MessageTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
`

const EntityTypeChip = styled.span`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.activeLight};
  flex-shrink: 0;
`

const MessageTitle = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
  line-height: 1.45;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MessagePreview = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: 500;
`
