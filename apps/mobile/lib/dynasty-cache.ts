import { useEffect, useState } from 'react'
import { api } from './api'
import type { PersonListItem } from './dto'

type Entry = {
  data: PersonListItem[] | null
  promise: Promise<PersonListItem[]> | null
}

const cache = new Map<string, Entry>()

function getOrFetch(dynastyId: string): Entry {
  const existing = cache.get(dynastyId)
  if (existing) return existing
  const entry: Entry = { data: null, promise: null }
  entry.promise = api
    .get<PersonListItem[]>(`/persons/by-dynasty/${dynastyId}`)
    .then((res) => {
      const arr = Array.isArray(res.data) ? res.data : []
      entry.data = arr
      return arr
    })
    .catch(() => {
      entry.data = []
      return []
    })
  cache.set(dynastyId, entry)
  return entry
}

export function useDynastyMembers(dynastyId: string | null | undefined): {
  data: PersonListItem[] | null
  loading: boolean
} {
  const [data, setData] = useState<PersonListItem[] | null>(() =>
    dynastyId ? cache.get(dynastyId)?.data ?? null : null,
  )
  const [loading, setLoading] = useState<boolean>(() => {
    if (!dynastyId) return false
    return cache.get(dynastyId)?.data == null
  })

  useEffect(() => {
    if (!dynastyId) {
      setData(null)
      setLoading(false)
      return
    }
    const entry = getOrFetch(dynastyId)
    if (entry.data != null) {
      setData(entry.data)
      setLoading(false)
      return
    }
    let cancel = false
    setLoading(true)
    entry.promise?.then((arr) => {
      if (!cancel) {
        setData(arr)
        setLoading(false)
      }
    })
    return () => {
      cancel = true
    }
  }, [dynastyId])

  return { data, loading }
}
