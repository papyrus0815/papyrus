import React, { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiArrowLeft,
  FiBook,
  FiBriefcase,
  FiCalendar,
  FiEdit2,
  FiFlag,
  FiMapPin,
  FiPlus,
  FiStar,
  FiUser,
  FiX,
  FiZap,
} from 'react-icons/fi'
import styled, { css, keyframes } from 'styled-components'

import { personApi } from '@/shared/api/person'
import { getPersonDetailById } from '@/shared/api/persons-detail'
import { getUploadImageUrl, uploadImage } from '@/shared/api/upload'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { RichTextEditor } from '@/shared/ui/rich-text-editor/RichTextEditor'
import { TenureRegisterPanel } from '@/shared/ui/tenure-register-panel'

function formatDateKo(
  y?: number | null,
  m?: number | null,
  d?: number | null,
  era?: string | null,
) {
  if (y == null) return ''
  const p = era === 'BC' ? '기원전 ' : ''
  if (m != null && d != null) return `${p}${y}년 ${m}월 ${d}일`
  if (m != null) return `${p}${y}년 ${m}월`
  return `${p}${y}년`
}

function formatIsoDateKo(iso?: string | null) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  } catch {
    return ''
  }
}

function biographyToEditor(raw?: string | null) {
  if (!raw) return ''
  return raw.trimStart().startsWith('<') ? raw : raw.replace(/\n/g, '<br>')
}

function getAgeAt(
  by?: number | null,
  bm?: number | null,
  bd?: number | null,
  iso?: string | null,
) {
  if (by == null || !iso) return null
  try {
    const d = new Date(iso)
    let age = d.getFullYear() - by
    if (
      d.getMonth() + 1 < (bm ?? 1) ||
      (d.getMonth() + 1 === (bm ?? 1) && d.getDate() < (bd ?? 1))
    )
      age--
    return age < 0 ? null : age
  } catch {
    return null
  }
}

function toRoman(n: number) {
  const m: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]
  let r = '',
    v = n
  for (const [a, s] of m) {
    while (v >= a) {
      r += s
      v -= a
    }
  }
  return r
}

interface PersonDetailPanelProps {
  personId: string
  onClose: () => void
  onEdit: (id: string) => void
  closeLabel?: string
  hideHeaderActions?: boolean
  embedInModal?: boolean
}

export function PersonDetailPanel({
  personId,
  onClose,
  onEdit,
  closeLabel = '닫기',
  hideHeaderActions = false,
  embedInModal = false,
}: PersonDetailPanelProps) {
  const playClickSound = useClickSound()
  const queryClient = useQueryClient()
  const [tenureModalOpen, setTenureModalOpen] = useState(false)
  const [editingTenureId, setEditingTenureId] = useState<string | null>(null)
  const [bioModalOpen, setBioModalOpen] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [savingBio, setSavingBio] = useState(false)

  const {
    data: person,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['person-detail', personId],
    queryFn: () => getPersonDetailById(personId),
    enabled: !!personId,
  })

  if (isLoading)
    return (
      <Root>
        <StateBox>
          <Spinner />
          <StateMsg>불러오는 중...</StateMsg>
        </StateBox>
      </Root>
    )
  if (isError || !person)
    return (
      <Root>
        <StateBox>
          <StateMsg>인물 정보를 불러올 수 없습니다.</StateMsg>
          <CloseBtn type="button" onClick={onClose}>
            닫기
          </CloseBtn>
        </StateBox>
      </Root>
    )

  const fullName = getPersonDisplayName(person)
  const isDeceased = person.deathYear != null
  const nowYear = new Date().getFullYear()
  const ageAtDeath =
    isDeceased && person.birthYear != null && person.deathYear != null
      ? person.deathYear - person.birthYear
      : null
  const currentAge =
    !isDeceased && person.birthYear != null && person.birthEra !== 'BC'
      ? nowYear - person.birthYear
      : null

  const birthStr = formatDateKo(
    person.birthYear,
    person.birthMonth,
    person.birthDay,
    person.birthEra,
  )
  const deathStr = formatDateKo(
    person.deathYear,
    person.deathMonth,
    person.deathDay,
    person.deathEra,
  )

  const profileSrc = person.profileImageUrl
    ? getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl
    : null

  const flagSrc = (() => {
    const c = person.country as any
    if (!c) return null
    if (c.thumbnailUrl)
      return getUploadImageUrl(c.thumbnailUrl) || c.thumbnailUrl
    if (c.isoCode)
      return `https://flagcdn.com/w80/${c.isoCode.toLowerCase()}.png`
    return null
  })()

  const tenuresList: any[] =
    person.governmentPositions ?? person.governmentTenures ?? []

  type TLItem = {
    year: number | null
    era?: string | null
    label: string
    sub?: string
    type: 'birth' | 'death' | 'event' | 'tenure' | 'book'
    age?: number | null
  }
  const items: TLItem[] = []

  if (person.birthYear != null)
    items.push({
      year: person.birthYear,
      era: person.birthEra,
      label: birthStr || `${person.birthYear}년 출생`,
      type: 'birth',
    })

  person.events?.forEach((e: any) => {
    const iso = e.event?.startDate
    items.push({
      year: iso ? new Date(iso).getFullYear() : null,
      label: e.event?.title ?? '사건',
      sub: e.role ?? undefined,
      type: 'event',
      age: getAgeAt(person.birthYear, person.birthMonth, person.birthDay, iso),
    })
  })

  tenuresList.forEach((t: any) => {
    const iso = t.startDate
    const cn = t.country?.name ?? t.historicalCountry?.name ?? ''
    items.push({
      year: iso ? new Date(iso).getFullYear() : null,
      label: t.positionDefinition?.title ?? t.title ?? '직책',
      sub: [
        cn,
        formatIsoDateKo(iso),
        t.endDate ? `~ ${formatIsoDateKo(t.endDate)}` : '~ 현재',
      ]
        .filter(Boolean)
        .join('  '),
      type: 'tenure',
      age: getAgeAt(person.birthYear, person.birthMonth, person.birthDay, iso),
    })
  })

  person.books?.forEach((b: any) => {
    items.push({
      year: b.publishedYear ?? null,
      label: b.title ?? '저작',
      type: 'book',
      age:
        b.publishedYear && person.birthYear
          ? b.publishedYear - person.birthYear
          : null,
    })
  })

  if (person.deathYear != null)
    items.push({
      year: person.deathYear,
      era: person.deathEra,
      label: deathStr || `${person.deathYear}년 사망`,
      type: 'death',
    })

  items.sort((a, b) => {
    if (a.year == null && b.year == null) return 0
    if (a.year == null) return 1
    if (b.year == null) return -1
    return (
      (a.era === 'BC' ? -a.year : a.year) - (b.era === 'BC' ? -b.year : b.year)
    )
  })

  type RI =
    | { k: 'marker'; roman: string; label: string }
    | { k: 'item'; item: TLItem }
  const ri: RI[] = []
  let lastDec = -1
  items.forEach((item) => {
    const age = item.age
    if (age != null && age > 0) {
      const dec = Math.floor(age / 10) * 10
      if (dec > lastDec) {
        lastDec = dec
        ri.push({ k: 'marker', roman: toRoman(dec), label: `${dec}세` })
      }
    }
    ri.push({ k: 'item', item })
  })

  const TYPE_COLOR: Record<string, string> = {
    birth: '#16a34a',
    death: '#dc2626',
    tenure: '#334155',
    event: '#0369a1',
    book: '#475569',
  }
  const TYPE_LABEL: Record<string, string> = {
    birth: '출생',
    death: '사망',
    tenure: '직책',
    event: '사건',
    book: '저작',
  }

  const bioText = (person.biography || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const bioExcerpt =
    bioText.length > 180 ? `${bioText.slice(0, 180)}…` : bioText

  return (
    <Root
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── 상단 네비 ── */}
      {!hideHeaderActions && (
        <TopBar>
          <NavBtn
            type="button"
            onClick={() => {
              playClickSound()
              onClose()
            }}
          >
            <FiArrowLeft size={14} />
            {closeLabel}
          </NavBtn>
          <NavBtn
            type="button"
            $accent
            onClick={() => {
              playClickSound()
              onEdit(person.id)
            }}
          >
            <FiEdit2 size={13} />
            수정
          </NavBtn>
        </TopBar>
      )}

      <Page>
        {/* ══════════════════════════════════════════════
            HERO — 인포그래픽 헤더
            ══════════════════════════════════════════════ */}
        <HeroSection>
          {/* 배경 이미지 */}
          <HeroBg>
            {profileSrc ? (
              <HeroBgImg src={profileSrc} alt="" />
            ) : (
              <HeroBgPlaceholder />
            )}
            <HeroBgOverlay />
          </HeroBg>

          <HeroContent>
            {/* 좌측: 인물 사진 + 이름 */}
            <HeroLeft>
              <HeroThumbRing>
                {profileSrc ? (
                  <HeroThumbImg src={profileSrc} alt={fullName} />
                ) : (
                  <HeroThumbIcon>
                    <FiUser size={52} />
                  </HeroThumbIcon>
                )}
              </HeroThumbRing>
              <HeroNameBlock>
                {person.dynasty && (
                  <HeroDynastyTag>{person.dynasty.name}</HeroDynastyTag>
                )}
                <HeroName>{fullName}</HeroName>
                {person.originalName && (
                  <HeroOriginalName>{person.originalName}</HeroOriginalName>
                )}
                <HeroSubRow>
                  {person.job && (
                    <HeroJobBadge>
                      <FiBriefcase size={10} />
                      {person.job.title}
                    </HeroJobBadge>
                  )}
                  {person.country && (
                    <HeroCountryBadge>
                      {flagSrc && <FlagImg src={flagSrc} alt="" />}
                      {person.country.name}
                    </HeroCountryBadge>
                  )}
                </HeroSubRow>
              </HeroNameBlock>
            </HeroLeft>

            {/* 우측: 생몰/메타 정보 카드들 */}
            <HeroRight>
              {/* 생몰 카드 */}
              <HeroInfoCard>
                <HeroInfoCardIcon $color="#6366f1">
                  <FiCalendar size={16} />
                </HeroInfoCardIcon>
                <HeroInfoCardBody>
                  {birthStr && (
                    <HeroInfoRow>
                      <HeroInfoKey>출생</HeroInfoKey>
                      <HeroInfoVal>{birthStr}</HeroInfoVal>
                    </HeroInfoRow>
                  )}
                  {isDeceased && deathStr && (
                    <HeroInfoRow>
                      <HeroInfoKey $dead>사망</HeroInfoKey>
                      <HeroInfoVal>{deathStr}</HeroInfoVal>
                    </HeroInfoRow>
                  )}
                  {ageAtDeath != null && (
                    <HeroInfoRow>
                      <HeroInfoKey>향년</HeroInfoKey>
                      <HeroInfoVal $accent>{ageAtDeath}세</HeroInfoVal>
                    </HeroInfoRow>
                  )}
                  {!isDeceased && currentAge != null && (
                    <HeroInfoRow>
                      <HeroInfoKey $alive>현재</HeroInfoKey>
                      <HeroInfoVal $accent>{currentAge}세 생존 중</HeroInfoVal>
                    </HeroInfoRow>
                  )}
                </HeroInfoCardBody>
              </HeroInfoCard>

              {/* 메타 칩들 */}
              {(person.gender ||
                person.religion ||
                person.father ||
                person.mother ||
                person.spouse) && (
                <HeroInfoCard>
                  <HeroInfoCardIcon $color="#f59e0b">
                    <FiUser size={16} />
                  </HeroInfoCardIcon>
                  <HeroInfoCardBody>
                    {person.gender && (
                      <HeroInfoRow>
                        <HeroInfoKey>성별</HeroInfoKey>
                        <HeroInfoVal>
                          {person.gender === 'MALE' ? '남성' : '여성'}
                        </HeroInfoVal>
                      </HeroInfoRow>
                    )}
                    {person.religion && (
                      <HeroInfoRow>
                        <HeroInfoKey>종교</HeroInfoKey>
                        <HeroInfoVal>{person.religion.name}</HeroInfoVal>
                      </HeroInfoRow>
                    )}
                    {person.father && (
                      <HeroInfoRow>
                        <HeroInfoKey>부</HeroInfoKey>
                        <HeroInfoVal>
                          {getPersonDisplayName(person.father)}
                        </HeroInfoVal>
                      </HeroInfoRow>
                    )}
                    {person.mother && (
                      <HeroInfoRow>
                        <HeroInfoKey>모</HeroInfoKey>
                        <HeroInfoVal>
                          {getPersonDisplayName(person.mother)}
                        </HeroInfoVal>
                      </HeroInfoRow>
                    )}
                    {person.spouse && (
                      <HeroInfoRow>
                        <HeroInfoKey>배우자</HeroInfoKey>
                        <HeroInfoVal>
                          {getPersonDisplayName(person.spouse)}
                        </HeroInfoVal>
                      </HeroInfoRow>
                    )}
                    {(person.children?.length ?? 0) > 0 && (
                      <HeroInfoRow>
                        <HeroInfoKey>자녀</HeroInfoKey>
                        <HeroInfoVal>{person.children.length}명</HeroInfoVal>
                      </HeroInfoRow>
                    )}
                  </HeroInfoCardBody>
                </HeroInfoCard>
              )}

              {/* 출신지 */}
              {((person as any).birthPlaceText ||
                (person as any).birthCity?.name ||
                (person as any).birthAdminDivision?.name) && (
                <HeroInfoCard>
                  <HeroInfoCardIcon $color="#10b981">
                    <FiMapPin size={16} />
                  </HeroInfoCardIcon>
                  <HeroInfoCardBody>
                    <HeroInfoRow>
                      <HeroInfoKey>출신</HeroInfoKey>
                      <HeroInfoVal>
                        {(person as any).birthCity?.name ??
                          (person as any).birthAdminDivision?.name ??
                          (person as any).birthPlaceText}
                      </HeroInfoVal>
                    </HeroInfoRow>
                  </HeroInfoCardBody>
                </HeroInfoCard>
              )}

              {/* 전기 발췌 */}
              {bioExcerpt && (
                <HeroBioCard onClick={() => setBioModalOpen(true)}>
                  <HeroBioQuoteIcon>"</HeroBioQuoteIcon>
                  <HeroBioText>{bioExcerpt}</HeroBioText>
                  <HeroBioMore>전기 전체 보기 →</HeroBioMore>
                </HeroBioCard>
              )}
              {!bioExcerpt && !embedInModal && (
                <HeroBioCard
                  $empty
                  onClick={() => {
                    setBioDraft('')
                    setEditingBio(true)
                    setBioModalOpen(true)
                  }}
                >
                  <HeroBioText
                    style={{ color: '#94a3b8', fontStyle: 'italic' }}
                  >
                    전기가 없습니다.
                  </HeroBioText>
                  <HeroBioMore>전기 추가 →</HeroBioMore>
                </HeroBioCard>
              )}
            </HeroRight>
          </HeroContent>
        </HeroSection>

        {/* ══════════════════════════════════════════════
            수평 타임라인
            ══════════════════════════════════════════════ */}
        <TimelineSection>
          <TLSectionHeader>
            <TLSectionTitle>
              <FiZap size={14} />
              생애 타임라인
            </TLSectionTitle>
            <TLItemCount>{items.length}개 항목</TLItemCount>
          </TLSectionHeader>

          {items.length === 0 ? (
            <TLEmpty>등록된 사건·직책이 없습니다.</TLEmpty>
          ) : (
            <HorizTLScroll>
              <HorizTLTrack>
                {/* 수평선 */}
                <HorizTLLine />

                {items.map((item, i) => {
                  const cardOnTop = i % 2 === 0
                  const color = TYPE_COLOR[item.type]
                  return (
                    <HorizTLCol key={i}>
                      {/* 위쪽 */}
                      <HorizTLHalf $top>
                        {cardOnTop ? (
                          <HorizTLCard $color={color}>
                            <HorizTLCardBadge $color={color}>
                              {TYPE_LABEL[item.type]}
                            </HorizTLCardBadge>
                            <HorizTLCardLabel>{item.label}</HorizTLCardLabel>
                            {item.sub && (
                              <HorizTLCardSub>{item.sub}</HorizTLCardSub>
                            )}
                            {item.age != null && (
                              <HorizTLCardAge>{item.age}세</HorizTLCardAge>
                            )}
                          </HorizTLCard>
                        ) : null}
                      </HorizTLHalf>

                      {/* 노드 */}
                      <HorizTLNodeRow>
                        <HorizTLStem />
                        <HorizTLNode
                          $color={color}
                          $filled={
                            item.type === 'birth' || item.type === 'death'
                          }
                        >
                          {item.year != null && (
                            <HorizTLYear $color={color}>
                              {item.era === 'BC'
                                ? `기원전\n${item.year}`
                                : String(item.year)}
                            </HorizTLYear>
                          )}
                        </HorizTLNode>
                        <HorizTLStem />
                      </HorizTLNodeRow>

                      {/* 아래쪽 */}
                      <HorizTLHalf>
                        {!cardOnTop ? (
                          <HorizTLCard $color={color}>
                            <HorizTLCardBadge $color={color}>
                              {TYPE_LABEL[item.type]}
                            </HorizTLCardBadge>
                            <HorizTLCardLabel>{item.label}</HorizTLCardLabel>
                            {item.sub && (
                              <HorizTLCardSub>{item.sub}</HorizTLCardSub>
                            )}
                            {item.age != null && (
                              <HorizTLCardAge>{item.age}세</HorizTLCardAge>
                            )}
                          </HorizTLCard>
                        ) : null}
                      </HorizTLHalf>
                    </HorizTLCol>
                  )
                })}
              </HorizTLTrack>
            </HorizTLScroll>
          )}
        </TimelineSection>

        {/* ══════════════════════════════════════════════
            하단 인포그래픽 그리드 — 직책 / 사건 / 저작 / 조직
            ══════════════════════════════════════════════ */}
        <InfoGridSection>
          {/* 직책 */}
          {tenuresList.length > 0 && (
            <InfoBlock>
              <InfoBlockHeader $color="#6366f1">
                <InfoBlockIcon $color="#6366f1">
                  <FiBriefcase size={15} />
                </InfoBlockIcon>
                <InfoBlockTitle>직책</InfoBlockTitle>
                <InfoBlockCount>{tenuresList.length}</InfoBlockCount>
                {!embedInModal && (
                  <InfoBlockBtn
                    type="button"
                    onClick={() => {
                      setEditingTenureId(null)
                      setTenureModalOpen(true)
                    }}
                  >
                    <FiPlus size={11} />
                    추가
                  </InfoBlockBtn>
                )}
              </InfoBlockHeader>
              <InfoBlockBody>
                {tenuresList.map((t: any) => {
                  const title = t.positionDefinition?.title ?? t.title ?? '직책'
                  const cn = t.country?.name ?? t.historicalCountry?.name ?? ''
                  const sy = t.startDate
                    ? new Date(t.startDate).getFullYear()
                    : null
                  const ey = t.endDate
                    ? new Date(t.endDate).getFullYear()
                    : null
                  const term = t.termNumber ?? t.regnalNumber
                  return (
                    <TenureInfoCard key={t.id}>
                      <TenureInfoCircle>{title.slice(0, 2)}</TenureInfoCircle>
                      <TenureInfoBody>
                        <TenureInfoTitle>{title}</TenureInfoTitle>
                        <TenureInfoMeta>
                          {cn && <TenureInfoTag $country>{cn}</TenureInfoTag>}
                          {term != null && (
                            <TenureInfoTag>제{term}대</TenureInfoTag>
                          )}
                          {sy && (
                            <TenureInfoTag>
                              {sy}
                              {ey ? `–${ey}` : '~'}
                            </TenureInfoTag>
                          )}
                        </TenureInfoMeta>
                      </TenureInfoBody>
                      {!embedInModal && (
                        <TenureEditSmallBtn
                          type="button"
                          onClick={() => {
                            setEditingTenureId(t.id)
                            setTenureModalOpen(true)
                          }}
                        >
                          <FiEdit2 size={11} />
                        </TenureEditSmallBtn>
                      )}
                    </TenureInfoCard>
                  )
                })}
              </InfoBlockBody>
            </InfoBlock>
          )}

          {/* 주요 사건 */}
          {(person.events?.length ?? 0) > 0 && (
            <InfoBlock>
              <InfoBlockHeader $color="#f59e0b">
                <InfoBlockIcon $color="#f59e0b">
                  <FiZap size={15} />
                </InfoBlockIcon>
                <InfoBlockTitle>주요 사건</InfoBlockTitle>
                <InfoBlockCount>{person.events.length}</InfoBlockCount>
              </InfoBlockHeader>
              <InfoBlockBody>
                {person.events.map((e: any) => (
                  <EventInfoCard key={e.id}>
                    {e.event?.startDate && (
                      <EventInfoYear>
                        {new Date(e.event.startDate).getFullYear()}
                      </EventInfoYear>
                    )}
                    <EventInfoLabel>{e.event?.title}</EventInfoLabel>
                    {e.role && <EventInfoRole>{e.role}</EventInfoRole>}
                  </EventInfoCard>
                ))}
              </InfoBlockBody>
            </InfoBlock>
          )}

          {/* 저작 */}
          {(person.books?.length ?? 0) > 0 && (
            <InfoBlock>
              <InfoBlockHeader $color="#10b981">
                <InfoBlockIcon $color="#10b981">
                  <FiBook size={15} />
                </InfoBlockIcon>
                <InfoBlockTitle>저작</InfoBlockTitle>
                <InfoBlockCount>{person.books.length}</InfoBlockCount>
              </InfoBlockHeader>
              <InfoBlockBody>
                {person.books.map((b: any) => (
                  <BookInfoCard key={b.id}>
                    <BookInfoIcon>📖</BookInfoIcon>
                    <BookInfoBody>
                      <BookInfoTitle>{b.title}</BookInfoTitle>
                      {b.publishedYear && (
                        <BookInfoYear>{b.publishedYear}년</BookInfoYear>
                      )}
                    </BookInfoBody>
                  </BookInfoCard>
                ))}
              </InfoBlockBody>
            </InfoBlock>
          )}

          {/* 조직 활동 */}
          {(person.organizationRoles?.length ?? 0) > 0 && (
            <InfoBlock>
              <InfoBlockHeader $color="#e11d48">
                <InfoBlockIcon $color="#e11d48">
                  <FiFlag size={15} />
                </InfoBlockIcon>
                <InfoBlockTitle>조직 활동</InfoBlockTitle>
                <InfoBlockCount>
                  {person.organizationRoles.length}
                </InfoBlockCount>
              </InfoBlockHeader>
              <InfoBlockBody>
                {person.organizationRoles.map((r: any) => (
                  <EventInfoCard key={r.id}>
                    <EventInfoLabel>
                      {r.organization?.name ?? r.organizationName ?? '조직'}
                    </EventInfoLabel>
                    {r.roleTitle && (
                      <EventInfoRole>{r.roleTitle}</EventInfoRole>
                    )}
                  </EventInfoCard>
                ))}
              </InfoBlockBody>
            </InfoBlock>
          )}

          {/* 직책이 없을 때 추가 버튼 */}
          {tenuresList.length === 0 && !embedInModal && (
            <InfoBlock $empty>
              <InfoBlockHeader $color="#6366f1">
                <InfoBlockIcon $color="#6366f1">
                  <FiBriefcase size={15} />
                </InfoBlockIcon>
                <InfoBlockTitle>직책</InfoBlockTitle>
              </InfoBlockHeader>
              <InfoBlockEmptyBody>
                <p
                  style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px' }}
                >
                  직책 정보가 없습니다.
                </p>
                <InfoBlockBtn
                  type="button"
                  onClick={() => {
                    setEditingTenureId(null)
                    setTenureModalOpen(true)
                  }}
                >
                  <FiPlus size={11} />
                  직책 추가
                </InfoBlockBtn>
              </InfoBlockEmptyBody>
            </InfoBlock>
          )}

          {/* 직책이 없고 사건/저작/조직도 없을 때 전체 빈 상태 */}
          {tenuresList.length === 0 &&
            (person.events?.length ?? 0) === 0 &&
            (person.books?.length ?? 0) === 0 &&
            (person.organizationRoles?.length ?? 0) === 0 && (
              <InfoGridEmpty>
                <FiStar size={32} color="#e2e8f0" />
                <p>등록된 직책·사건·저작이 없습니다.</p>
              </InfoGridEmpty>
            )}
        </InfoGridSection>
      </Page>

      {/* ── 전기 모달 ── */}
      <AnimatePresence>
        {bioModalOpen && (
          <ModalOverlay
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setBioModalOpen(false)
              setEditingBio(false)
            }}
          >
            <ModalBox
              as={motion.div}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <ModalHead>
                <ModalHeadTitle>전기</ModalHeadTitle>
                <ModalCloseBtn
                  type="button"
                  onClick={() => {
                    setBioModalOpen(false)
                    setEditingBio(false)
                  }}
                >
                  <FiX size={17} />
                </ModalCloseBtn>
              </ModalHead>
              <ModalBody>
                {!editingBio ? (
                  <>
                    {person.biography ? (
                      <BioProse>
                        {person.biography.trimStart().startsWith('<') ||
                        /<br\s*\/?>/i.test(person.biography) ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: person.biography,
                            }}
                          />
                        ) : (
                          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                            {person.biography}
                          </p>
                        )}
                      </BioProse>
                    ) : (
                      <EmptyBio>전기가 없습니다.</EmptyBio>
                    )}
                    {!embedInModal && (
                      <ModalEditBtn
                        type="button"
                        onClick={() => {
                          setBioDraft(biographyToEditor(person.biography))
                          setEditingBio(true)
                        }}
                      >
                        <FiEdit2 size={13} />
                        {person.biography ? '수정' : '추가'}
                      </ModalEditBtn>
                    )}
                  </>
                ) : (
                  <>
                    <RichTextEditor
                      value={bioDraft}
                      onChange={setBioDraft}
                      showTitle={false}
                      placeholder="전기(약력)를 입력하세요."
                      onImageUpload={async (f) => {
                        const r = await uploadImage(f, 'persons')
                        return r.url
                      }}
                    />
                    <ModalActions>
                      <ModalCancel
                        type="button"
                        onClick={() => {
                          setEditingBio(false)
                          setBioDraft('')
                        }}
                        disabled={savingBio}
                      >
                        취소
                      </ModalCancel>
                      <ModalSave
                        type="button"
                        disabled={savingBio}
                        onClick={async () => {
                          setSavingBio(true)
                          try {
                            await personApi.update(person.id, {
                              biography: bioDraft?.trim() || undefined,
                            })
                            await queryClient.invalidateQueries({
                              queryKey: ['person-detail', personId],
                            })
                            setEditingBio(false)
                            setBioDraft('')
                            toast.success('전기가 저장되었습니다.')
                          } catch (err: any) {
                            toast.error(err?.message ?? '저장에 실패했습니다.')
                          } finally {
                            setSavingBio(false)
                          }
                        }}
                      >
                        {savingBio ? '저장 중…' : '저장'}
                      </ModalSave>
                    </ModalActions>
                  </>
                )}
              </ModalBody>
            </ModalBox>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <TenureRegisterPanel
        personId={person.id}
        open={tenureModalOpen}
        onClose={() => {
          setTenureModalOpen(false)
          setEditingTenureId(null)
        }}
        onSuccess={() => {
          setTenureModalOpen(false)
          setEditingTenureId(null)
        }}
        tenureId={editingTenureId ?? undefined}
      />
    </Root>
  )
}

// ─── Styled ────────────────────────────────────────────────────────────────────

const spinAnim = keyframes`to { transform: rotate(360deg); }`

const Root = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
`
const StateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
`
const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: ${spinAnim} 0.8s linear infinite;
`
const StateMsg = styled.p`
  font-size: 14px;
  color: #64748b;
  margin: 0;
`
const CloseBtn = styled.button`
  padding: 9px 20px;
  background: #334155;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #1e293b;
  }
`

/* ── 네비 ── */
const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  position: sticky;
  top: 0;
  z-index: 40;
`
const NavBtn = styled.button<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => (p.$accent ? '#fff' : '#475569')};
  background: ${(p) => (p.$accent ? '#6366f1' : '#fff')};
  border: 1.5px solid ${(p) => (p.$accent ? '#6366f1' : '#e2e8f0')};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${(p) => (p.$accent ? '#4f46e5' : '#f8fafc')};
  }
`
const Page = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
`

/* ── HERO ── */
const HeroSection = styled.div`
  position: relative;
  overflow: hidden;
  min-height: 320px;
  background: #0f172a;
`
const HeroBg = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
`
const HeroBgImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  filter: blur(3px) brightness(0.3);
  transform: scale(1.06);
`
const HeroBgPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
`
const HeroBgOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    rgba(10, 15, 30, 0.9) 0%,
    rgba(99, 102, 241, 0.3) 60%,
    rgba(10, 15, 30, 0.85) 100%
  );
`
const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 28px;
  padding: 36px 32px 40px;
  @media (max-width: 700px) {
    flex-direction: column;
    gap: 20px;
  }
`
const HeroLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-shrink: 0;
  max-width: 320px;
`
const HeroThumbRing = styled.div`
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.3);
  overflow: hidden;
  background: #1e293b;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
`
const HeroThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
`
const HeroThumbIcon = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
`
const HeroNameBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 2px;
  min-width: 0;
`
const HeroDynastyTag = styled.div`
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a5b4fc;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 6px;
  padding: 3px 10px;
  width: fit-content;
`
const HeroName = styled.h1`
  margin: 0;
  font-size: clamp(22px, 3vw, 44px);
  font-weight: 900;
  color: #fff;
  line-height: 1.05;
  letter-spacing: -0.04em;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  word-break: keep-all;
`
const HeroOriginalName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.02em;
`
const HeroSubRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`
const HeroJobBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 4px 12px;
`
const HeroCountryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 4px 12px;
`
const FlagImg = styled.img`
  width: 18px;
  height: 13px;
  object-fit: cover;
  border-radius: 2px;
`

/* Hero 우측 정보 카드들 */
const HeroRight = styled.div`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
  align-content: start;
`
const HeroInfoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  backdrop-filter: blur(8px);
`
const HeroInfoCardIcon = styled.div<{ $color: string }>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${(p) => p.$color}22;
  border: 1px solid ${(p) => p.$color}44;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => p.$color};
`
const HeroInfoCardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`
const HeroInfoRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`
const HeroInfoKey = styled.span<{ $alive?: boolean; $dead?: boolean }>`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${(p) =>
    p.$alive ? '#34d399' : p.$dead ? '#f87171' : 'rgba(255,255,255,0.4)'};
  min-width: 32px;
  flex-shrink: 0;
`
const HeroInfoVal = styled.span<{ $accent?: boolean }>`
  font-size: 13px;
  font-weight: ${(p) => (p.$accent ? '700' : '500')};
  color: ${(p) => (p.$accent ? '#a5b4fc' : 'rgba(255,255,255,0.85)')};
`
const HeroBioCard = styled.div<{ $empty?: boolean }>`
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-left: 3px solid
    ${(p) => (p.$empty ? 'rgba(255,255,255,0.15)' : '#a5b4fc')};
  border-radius: 0 12px 12px 0;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s;
  grid-column: 1 / -1;
  &:hover {
    background: rgba(255, 255, 255, 0.11);
  }
`
const HeroBioQuoteIcon = styled.span`
  font-size: 24px;
  color: #a5b4fc;
  line-height: 1;
  font-family: Georgia, serif;
  opacity: 0.7;
`
const HeroBioText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const HeroBioMore = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #a5b4fc;
  align-self: flex-start;
`

/* ── 수평 타임라인 ── */
const TimelineSection = styled.div`
  background: #fff;
  border-bottom: 1px solid #e8ecf0;
  padding: 24px 0 0;
`
const TLSectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px 16px;
  border-bottom: 1px solid #f1f5f9;
`
const TLSectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #6366f1;
`
const TLItemCount = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 20px;
  padding: 2px 9px;
`
const TLEmpty = styled.p`
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 32px;
  margin: 0;
`
const HorizTLScroll = styled.div`
  overflow-x: auto;
  padding: 0 28px 24px;
`
const HorizTLTrack = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  min-width: max-content;
  padding: 0;
`
const HorizTLLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 3px;
  background: linear-gradient(90deg, #e2e8f0 0%, #6366f1 50%, #e2e8f0 100%);
  border-radius: 2px;
  z-index: 0;
`
const HorizTLCol = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 156px;
  flex-shrink: 0;
`
const HorizTLHalf = styled.div<{ $top?: boolean }>`
  height: 110px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: ${(p) => (p.$top ? 'flex-end' : 'flex-start')};
  padding: ${(p) => (p.$top ? '0 0 6px' : '6px 0 0')};
`
const HorizTLNodeRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
`
const HorizTLStem = styled.div`
  width: 2px;
  height: 12px;
  background: #cbd5e1;
  flex-shrink: 0;
`
const HorizTLNode = styled.div<{ $color: string; $filled?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${(p) => (p.$filled ? p.$color : '#fff')};
  border: 3px solid ${(p) => p.$color};
  box-shadow:
    0 0 0 4px #fff,
    0 4px 12px ${(p) => p.$color}44;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
  flex-shrink: 0;
`
const HorizTLYear = styled.div<{ $color: string }>`
  font-size: 9px;
  font-weight: 800;
  color: ${(p) => p.$color};
  text-align: center;
  line-height: 1.2;
  white-space: pre-line;
  letter-spacing: -0.02em;
`
const HorizTLCard = styled.div<{ $color: string }>`
  width: 148px;
  padding: 10px 12px;
  background: #fff;
  border: 1.5px solid ${(p) => p.$color}33;
  border-top: 3px solid ${(p) => p.$color};
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`
const HorizTLCardBadge = styled.span<{ $color: string }>`
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.$color};
  background: ${(p) => p.$color}14;
  border-radius: 4px;
  padding: 2px 7px;
  margin-bottom: 5px;
`
const HorizTLCardLabel = styled.div`
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const HorizTLCardSub = styled.div`
  font-size: 10.5px;
  color: #64748b;
  margin-top: 4px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`
const HorizTLCardAge = styled.div`
  margin-top: 6px;
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 1px 6px;
`

/* ── 하단 인포그래픽 그리드 ── */
const InfoGridSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1px;
  background: #e8ecf0;
  flex: 1;
`
const InfoBlock = styled.div<{ $empty?: boolean }>`
  background: #fff;
  display: flex;
  flex-direction: column;
  ${(p) =>
    p.$empty &&
    css`
      opacity: 0.6;
    `}
`
const InfoBlockHeader = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
`
const InfoBlockIcon = styled.div<{ $color: string }>`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
  background: ${(p) => p.$color}14;
  border: 1.5px solid ${(p) => p.$color}33;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(p) => p.$color};
`
const InfoBlockTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #334155;
  flex: 1;
`
const InfoBlockCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 20px;
  padding: 2px 8px;
`
const InfoBlockBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  border: 1.5px solid #c7d2fe;
  border-radius: 7px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.13s;
  &:hover {
    background: #e0e7ff;
  }
`
const InfoBlockBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  max-height: 360px;
`
const InfoBlockEmptyBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  gap: 8px;
`
const InfoGridEmpty = styled.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #94a3b8;
  p {
    margin: 0;
    font-size: 14px;
  }
`

/* 직책 카드 */
const TenureInfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid #f8fafc;
  transition: background 0.12s;
  &:hover {
    background: #f8fafc;
  }
  &:last-child {
    border-bottom: none;
  }
`
const TenureInfoCircle = styled.div`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 1.5px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: #475569;
  letter-spacing: -0.02em;
`
const TenureInfoBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`
const TenureInfoTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const TenureInfoMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
`
const TenureInfoTag = styled.span<{ $country?: boolean }>`
  font-size: 11px;
  font-weight: ${(p) => (p.$country ? '600' : '500')};
  color: ${(p) => (p.$country ? '#475569' : '#64748b')};
  background: ${(p) => (p.$country ? '#f1f5f9' : '#f8fafc')};
  border: 1px solid ${(p) => (p.$country ? '#e2e8f0' : '#e8ecf0')};
  border-radius: 5px;
  padding: 1px 7px;
`
const TenureEditSmallBtn = styled.button`
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: transparent;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.12s;
  &:hover {
    background: #f1f5f9;
    color: #475569;
    border-color: #94a3b8;
  }
`

/* 사건/조직 카드 */
const EventInfoCard = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #f8fafc;
  &:last-child {
    border-bottom: none;
  }
`
const EventInfoYear = styled.div`
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 800;
  color: #6366f1;
  background: #eef2ff;
  border-radius: 6px;
  padding: 3px 8px;
  margin-top: 1px;
`
const EventInfoLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  flex: 1;
  line-height: 1.4;
`
const EventInfoRole = styled.div`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
`

/* 저작 카드 */
const BookInfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid #f8fafc;
  &:last-child {
    border-bottom: none;
  }
`
const BookInfoIcon = styled.div`
  font-size: 22px;
  flex-shrink: 0;
`
const BookInfoBody = styled.div`
  flex: 1;
  min-width: 0;
`
const BookInfoTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
const BookInfoYear = styled.div`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
`

/* ── 전기 모달 ── */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const ModalBox = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 680px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  overflow: hidden;
`
const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid #e8ecf0;
`
const ModalHeadTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
`
const ModalCloseBtn = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  color: #64748b;
  &:hover {
    background: #f1f5f9;
  }
`
const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`
const BioProse = styled.div`
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
  h1,
  h2,
  h3 {
    font-size: 1em;
    font-weight: 700;
    margin: 0 0 6px;
  }
  p {
    margin: 0 0 12px;
  }
`
const EmptyBio = styled.p`
  font-size: 14px;
  color: #94a3b8;
  font-style: italic;
  margin: 0;
`
const ModalEditBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.13s;
  &:hover {
    background: #4f46e5;
  }
`
const ModalActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
`
const ModalCancel = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.13s;
  &:hover {
    background: #f8fafc;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
const ModalSave = styled.button`
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: #6366f1;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.13s;
  &:hover {
    background: #4f46e5;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
