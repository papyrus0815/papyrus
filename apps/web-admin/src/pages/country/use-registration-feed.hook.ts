/**
 * 대시보드 통계 뷰의 "최근 등록" 피드 3종을 계산한다.
 *
 * - 인물 등록: 일주일 내 등록된 인물 (소속 국가 매핑 포함)
 * - 국가 등록: 일주일 내 등록된 현대·역사 국가
 * - 사건 등록: 일주일 내 등록된 사건 (서버에서 createdSinceDays로 필터)
 *
 * 기존 `country.page.tsx`에 흩어져 있던 useMemo 2개 + useEffect 1개 + useState 1개를 한 곳에 모음.
 */
import { useEffect, useMemo, useState } from 'react'

import { usePersons } from '@/entities/person/api'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country'
import { getAllEvents } from '@/shared/api/events'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

export interface RegistrationPersonItem {
  date: string
  type: 'person'
  primaryLabel: string
  countryName?: string | null
  profileImageUrl?: string | null
  /** 인물 클릭 시 해당 국가 인물 리스트로 이동용 (역사 국가 소속이어도 소속 현대 국가 id) */
  personId?: string
  countryId?: string | null
}

export interface RegistrationCountryItem {
  date: string
  name: string
  type: 'modern' | 'historical'
  thumbnailUrl?: string | null
  flagEmoji?: string | null
}

export interface RegistrationEventItem {
  id: string
  title: string
  date: string
  countryNames: string[]
  startDate?: string | null
  endDate?: string | null
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const EVENT_LIMIT = 25

interface Result {
  personFeed: RegistrationPersonItem[]
  countryFeed: RegistrationCountryItem[]
  eventFeed: RegistrationEventItem[]
}

export function useRegistrationFeed(): Result {
  const { data: apiCountries } = useCountries()
  const { data: apiHistoricalCountries } = useHistoricalCountries()
  const { data: apiPersons } = usePersons()

  const personFeed = useMemo<RegistrationPersonItem[]>(() => {
    const items: RegistrationPersonItem[] = []
    const now = Date.now()
    const rawCountries = apiCountries ?? []
    const rawPersons = apiPersons ?? []

    const modernIds = new Set(
      (rawCountries as { id?: string }[]).map((c) => c.id).filter(Boolean),
    )
    const historicalToModern = new Map<string, string>()
    ;(
      rawCountries as {
        id?: string
        historicalCountries?: { id: string }[]
      }[]
    ).forEach((c) => {
      ;(c.historicalCountries ?? []).forEach((h) => {
        if (c.id && h.id) historicalToModern.set(h.id, c.id)
      })
    })
    const effectiveModernCountryId = (
      countryId: string | null | undefined,
    ): string | null => {
      if (!countryId) return null
      if (modernIds.has(countryId)) return countryId
      return historicalToModern.get(countryId) ?? null
    }

    rawPersons.forEach(
      (p: {
        id?: string
        name?: string | null
        surname?: string | null
        middleName?: string | null
        nameDisplayOrder?: string | null
        createdAt?: string
        profileImageUrl?: string | null
        country?: {
          name?: string
          defaultNameDisplayOrder?: string | null
        } | null
        countryId?: string | null
      }) => {
        const date = p.createdAt
        if (!date || now - new Date(date).getTime() > WEEK_MS) return
        const countryRow = p.countryId
          ? (
              rawCountries as {
                id?: string
                name?: string
                defaultNameDisplayOrder?: string | null
              }[]
            ).find((c) => c.id === p.countryId)
          : undefined
        const defaultOrder =
          p.country?.defaultNameDisplayOrder ??
          countryRow?.defaultNameDisplayOrder ??
          null
        const displayName =
          getPersonDisplayName(
            {
              name: p.name ?? '',
              surname: p.surname,
              middleName: p.middleName,
              nameDisplayOrder: p.nameDisplayOrder ?? null,
              country: p.country ?? undefined,
            },
            defaultOrder != null
              ? { countryDefaultNameDisplayOrder: defaultOrder }
              : undefined,
          ) ||
          p.name ||
          p.surname ||
          '이름 없음'
        const countryName =
          p.country?.name ??
          (p.countryId
            ? (rawCountries as { id?: string; name?: string }[]).find(
                (c) => c.id === p.countryId,
              )?.name
            : undefined)
        items.push({
          date,
          type: 'person',
          primaryLabel: displayName,
          countryName: countryName ?? undefined,
          profileImageUrl: p.profileImageUrl,
          personId: p.id,
          countryId:
            effectiveModernCountryId(p.countryId ?? undefined) ?? undefined,
        })
      },
    )
    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    return items.slice(0, 50)
  }, [apiCountries, apiPersons])

  const countryFeed = useMemo<RegistrationCountryItem[]>(() => {
    const items: RegistrationCountryItem[] = []
    const now = Date.now()
    const rawModern = apiCountries ?? []
    const rawHistorical = apiHistoricalCountries ?? []

    rawModern.forEach(
      (c: {
        name?: string
        createdAt?: string
        thumbnailUrl?: string | null
        flagEmoji?: string | null
      }) => {
        const date = c.createdAt
        if (!date || now - new Date(date).getTime() > WEEK_MS) return
        items.push({
          date,
          name: c.name ?? '국가',
          type: 'modern',
          thumbnailUrl: c.thumbnailUrl ?? null,
          flagEmoji: c.flagEmoji ?? null,
        })
      },
    )
    rawHistorical.forEach(
      (c: {
        name?: string
        createdAt?: string
        thumbnailUrl?: string | null
      }) => {
        const date = c.createdAt
        if (!date || now - new Date(date).getTime() > WEEK_MS) return
        items.push({
          date,
          name: c.name ?? '역사적 국가',
          type: 'historical',
          thumbnailUrl: c.thumbnailUrl ?? null,
        })
      },
    )
    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
    return items.slice(0, 50)
  }, [apiCountries, apiHistoricalCountries])

  const [eventFeed, setEventFeed] = useState<RegistrationEventItem[]>([])
  useEffect(() => {
    let cancelled = false
    getAllEvents({ limit: 100, createdSinceDays: 7 })
      .then((raw) => {
        if (cancelled) return
        const list = Array.isArray(raw)
          ? raw
          : ((raw as { data?: unknown[] })?.data ?? [])
        type Evt = {
          id: string
          title?: string
          createdAt?: string
          startDate?: string | null
          endDate?: string | null
          relatedCountries?: { name?: string }[]
          relatedHistoricalCountries?: { name?: string }[]
        }
        const oneWeekAgo = Date.now() - WEEK_MS
        const filtered = (list as Evt[])
          .map((evt) => {
            const countryNames = [
              ...(evt.relatedCountries ?? [])
                .map((c) => c.name)
                .filter(Boolean),
              ...(evt.relatedHistoricalCountries ?? [])
                .map((c) => c.name)
                .filter(Boolean),
            ] as string[]
            return {
              id: evt.id,
              title: evt.title || '제목 없음',
              _date: evt.createdAt || evt.startDate,
              countryNames,
              startDate: evt.startDate ?? null,
              endDate: evt.endDate ?? null,
            }
          })
          .filter((e) => e._date && new Date(e._date).getTime() >= oneWeekAgo)
          .sort(
            (a, b) =>
              new Date(b._date!).getTime() - new Date(a._date!).getTime(),
          )
          .slice(0, EVENT_LIMIT)
          .map<RegistrationEventItem>((e) => ({
            id: e.id,
            title: e.title,
            date: e._date!,
            countryNames: e.countryNames ?? [],
            startDate: e.startDate ?? undefined,
            endDate: e.endDate ?? undefined,
          }))
        setEventFeed(filtered)
      })
      .catch(() => {
        if (!cancelled) setEventFeed([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { personFeed, countryFeed, eventFeed }
}
