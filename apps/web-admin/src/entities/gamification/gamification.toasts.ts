import { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { sessionQueryOptions } from '@/entities/session'

import {
  gamificationBadgesQueryOptions,
  gamificationSummaryQueryOptions,
} from './gamification.api'
import { useGamiNotificationStore } from './gamification-notifications.store'
import { gradeMeta } from './grade.model'

const GRADE_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
// 공유 브라우저에서 계정 간 섞임 방지를 위해 accountId로 네임스페이스
const lsGradeKey = (accountId: string) => `gamification:lastGrade:${accountId}`
const lsBadgesKey = (accountId: string) => `gamification:earnedBadges:${accountId}`

/**
 * 등급 상승 / 새 뱃지 획득 시 토스트 알림.
 * 백엔드 Notification은 브로드캐스트 전용(개인 타깃 불가)이라, 개인 축하는
 * localStorage 스냅샷과 비교해 프론트에서 토스트로 처리한다.
 * 최초 1회는 스냅샷만 저장(중복 축하 방지). 헤더 등 상시 마운트되는 곳에서 1회 호출.
 */
export function useGamificationToasts(): void {
  const { data: summary } = useQuery(gamificationSummaryQueryOptions)
  const { data: badges } = useQuery(gamificationBadgesQueryOptions)
  const { data: account } = useQuery(sessionQueryOptions)
  const accountId = account?.id ?? null
  const addGamiNotification = useGamiNotificationStore((s) => s.add)

  // 등급 상승
  useEffect(() => {
    const grade = summary?.gradeCode
    if (!grade || !accountId) return
    const key = lsGradeKey(accountId)
    const prev = localStorage.getItem(key)
    if (prev == null) {
      localStorage.setItem(key, grade)
      return
    }
    if (prev !== grade) {
      const up = GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(prev)
      if (up) {
        const msg = `🎉 등급 상승! ${gradeMeta(grade).label} 달성`
        toast.success(msg, { duration: 5000 })
        addGamiNotification({ id: `grade:${grade}`, accountId, title: msg, createdAt: Date.now() })
      }
      localStorage.setItem(key, grade)
    }
  }, [summary?.gradeCode, accountId, addGamiNotification])

  // 새 뱃지
  useEffect(() => {
    if (!badges || !accountId) return
    const key = lsBadgesKey(accountId)
    const earnedCodes = badges.filter((b) => b.earned).map((b) => b.code)
    const prevRaw = localStorage.getItem(key)
    if (prevRaw == null) {
      localStorage.setItem(key, JSON.stringify(earnedCodes))
      return
    }
    let prev: string[] = []
    try {
      prev = JSON.parse(prevRaw)
    } catch {
      prev = []
    }
    const prevSet = new Set(prev)
    const fresh = badges.filter((b) => b.earned && !prevSet.has(b.code))
    for (const b of fresh) {
      const msg = `🏅 새 뱃지 획득: ${b.label}`
      toast.success(msg, { duration: 5000 })
      addGamiNotification({ id: `badge:${b.code}`, accountId, title: msg, createdAt: Date.now() })
    }
    if (fresh.length > 0) {
      localStorage.setItem(key, JSON.stringify(earnedCodes))
    }
  }, [badges, accountId, addGamiNotification])
}
