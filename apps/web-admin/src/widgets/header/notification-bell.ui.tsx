/**
 * 알림 벨 위젯 — 트리거 버튼 + 데스크톱 드롭다운 + 모바일 모달.
 * 서버 알림과 게이미피케이션 개인 알림(등급/뱃지)을 합쳐 최신순으로 보여준다.
 * (현재 계정 소유 항목만 — 공유 브라우저 격리)
 */
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { FiBell } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  formatGamiTime,
  useGamiNotificationStore,
  useGamificationToasts,
} from '@/entities/gamification'
import {
  getNotificationTargetPath,
  type NotificationMessage,
  useNotificationStore,
} from '@/entities/notification'
import { sessionQueryOptions } from '@/entities/session'
import { useOnClickOutside } from '@/shared/hooks/use-on-click-outside.hook'
import { pathKeys } from '@/shared/router'

import {
  Badge,
  DROPDOWN_MOTION,
  DropdownPanel,
  IconButton,
  MobileModalShell,
} from './header-shared.ui'
import { NotificationPanelBody } from './notification-panel.ui'

interface NotificationBellProps {
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  playClickSound: () => void
}

const isGamiId = (id: string) =>
  id.startsWith('grade:') || id.startsWith('badge:')

export function NotificationBell({
  isOpen,
  onToggle,
  onClose,
  playClickSound,
}: NotificationBellProps) {
  const navigate = useNavigate()
  const { data: account } = useQuery(sessionQueryOptions)
  const accountId = account?.id ?? null

  const gamiItems = useGamiNotificationStore((state) => state.items)
  const gamiMarkAllRead = useGamiNotificationStore((state) => state.markAllRead)
  const gamiMarkRead = useGamiNotificationStore((state) => state.markRead)
  useGamificationToasts()
  const { messages, markAllRead, markOneRead, fetchNotifications, isLoading } =
    useNotificationStore()

  const containerRef = useRef<HTMLDivElement | null>(null)

  useOnClickOutside(containerRef, () => {
    if (isOpen) onClose()
  })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  // 마운트 시 1회 로드 + 탭이 다시 보이거나 포커스될 때 갱신 —
  // 벨을 열기 전에도 읽지 않음 배지가 최신으로 유지되도록.
  useEffect(() => {
    fetchNotifications()
    const refetchIfVisible = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    window.addEventListener('focus', refetchIfVisible)
    document.addEventListener('visibilitychange', refetchIfVisible)
    return () => {
      window.removeEventListener('focus', refetchIfVisible)
      document.removeEventListener('visibilitychange', refetchIfVisible)
    }
  }, [fetchNotifications])

  // 드롭다운을 열 때마다 최신 상태로 갱신.
  useEffect(() => {
    if (isOpen) fetchNotifications()
  }, [isOpen, fetchNotifications])

  const gamiMessages = useMemo<NotificationMessage[]>(
    () =>
      gamiItems
        .filter((notification) => notification.accountId === accountId)
        .map((notification) => ({
          id: notification.id,
          title: notification.title,
          time: formatGamiTime(notification.createdAt),
          unread: !notification.read,
        })),
    [gamiItems, accountId],
  )
  const mergedMessages = useMemo<NotificationMessage[]>(
    () => [...gamiMessages, ...messages],
    [gamiMessages, messages],
  )

  const handleSelectNotification = useCallback(
    (msg: NotificationMessage) => {
      playClickSound()
      if (isGamiId(msg.id)) {
        if (accountId) gamiMarkRead(accountId, msg.id)
        navigate(pathKeys.leaderboard())
        onClose()
        return
      }
      markOneRead(msg.id)
      const targetPath = getNotificationTargetPath(msg.ownerType, msg.recordId)
      if (targetPath) navigate(targetPath)
      onClose()
    },
    [playClickSound, markOneRead, gamiMarkRead, accountId, navigate, onClose],
  )

  const handleMarkAllRead = useCallback(() => {
    playClickSound()
    markAllRead()
    if (accountId) gamiMarkAllRead(accountId)
  }, [playClickSound, markAllRead, gamiMarkAllRead, accountId])

  const unreadCount = mergedMessages.filter((item) => item.unread).length

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <IconButton
        aria-label={
          unreadCount > 0 ? `알림, 읽지 않음 ${unreadCount}개` : '알림'
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          playClickSound()
          onToggle()
        }}
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
        )}
      </IconButton>

      <AnimatePresence>
        {isOpen && (
          <BellPanel role="menu" {...DROPDOWN_MOTION}>
            <NotificationPanelBody
              messages={mergedMessages}
              showTitle
              isLoading={isLoading}
              onMarkAllRead={handleMarkAllRead}
              onSelect={handleSelectNotification}
            />
          </BellPanel>
        )}
      </AnimatePresence>

      <MobileModalShell
        isOpen={isOpen}
        title="메시지"
        onClose={onClose}
        playClickSound={playClickSound}
      >
        <NotificationPanelBody
          messages={mergedMessages}
          isLoading={isLoading}
          onMarkAllRead={handleMarkAllRead}
          onSelect={handleSelectNotification}
        />
      </MobileModalShell>
    </div>
  )
}

const BellPanel = styled(DropdownPanel)`
  width: 320px;
`
