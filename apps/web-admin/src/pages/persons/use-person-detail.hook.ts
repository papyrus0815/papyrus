/**
 * 인물 상세 정보 표시 훅
 */

import { useMemo } from 'react'
import { usePersons } from '@/entities/person/api'
import { useCountries } from '@/features/country/api'
import { useReligions } from '@/shared/api/religion'
import { useDynasties } from '@/shared/api/dynasty'
import { useJobs } from '@/shared/api/job'
import type { PersonResponseDto } from '@/entities/person/api'

export function usePersonDetail(personId: string | null) {
  const { data: persons } = usePersons()
  const { data: countries } = useCountries()
  const { data: religions } = useReligions()
  const { data: dynasties } = useDynasties()
  const { data: jobs } = useJobs()

  const person = useMemo(
    () => persons?.find((p) => p.id === personId) || null,
    [persons, personId],
  )

  const enrichedData = useMemo(() => {
    if (!person) return null

    // 국가 정보
    const country = person.countryId
      ? countries?.find((c) => c.id === person.countryId)
      : null

    // 가문 정보
    const dynasty = person.dynastyId
      ? dynasties?.find((d) => d.id === person.dynastyId)
      : null

    // 종교 정보
    const religion = person.religionId
      ? religions?.find((r) => r.id === person.religionId)
      : null

    // 직업 정보
    const job = person.jobId ? jobs?.find((j) => j.id === person.jobId) : null

    // 부모 정보
    const father = person.fatherId
      ? persons?.find((p) => p.id === person.fatherId)
      : null
    const mother = person.motherId
      ? persons?.find((p) => p.id === person.motherId)
      : null

    // 이름 표시
    const fullName = person.surname
      ? `${person.surname} ${person.name}`
      : person.name

    // 생애 기간
    const formatDate = (
      era: string | null | undefined,
      year: number | null | undefined,
      month: number | null | undefined,
      day: number | null | undefined,
    ) => {
      if (!year) return null
      const eraText = era === 'BC' ? '기원전 ' : ''
      const monthText = month ? `.${month.toString().padStart(2, '0')}` : ''
      const dayText = day ? `.${day.toString().padStart(2, '0')}` : ''
      return `${eraText}${year}${monthText}${dayText}`
    }

    const birthDate = formatDate(
      person.birthEra,
      person.birthYear,
      person.birthMonth,
      person.birthDay,
    )
    const deathDate = formatDate(
      person.deathEra,
      person.deathYear,
      person.deathMonth,
      person.deathDay,
    )

    const lifespan =
      birthDate && deathDate
        ? `${birthDate} ~ ${deathDate}`
        : birthDate
          ? `${birthDate} ~`
          : '생몰년 미상'

    // 이미지
    const displayImage = person.profileImageUrl || country?.thumbnailUrl

    return {
      person,
      fullName,
      lifespan,
      birthDate,
      deathDate,
      country,
      dynasty,
      religion,
      job,
      father,
      mother,
      displayImage,
    }
  }, [person, countries, dynasties, religions, jobs, persons])

  return enrichedData
}
