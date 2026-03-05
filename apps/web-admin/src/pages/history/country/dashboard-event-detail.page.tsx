/**
 * 대시보드 연대표 전용 사건 상세
 * /history/dashboard/events/:eventId (국가 목록과 함께 오른쪽 패널에서 스크롤)
 */
import React, { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiEdit2, FiX } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { getEventById, type EventResponseDto } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { PersonDetailPanel } from '@/pages/persons/PersonDetailPanel'

import { mapEventResponseToHistoricalEvent } from '@/pages/events/utils/event-detail.mapper'
import { formatDateRange } from '@/pages/events/utils/events.utils'

const ARTICLE_MAX_WIDTH = '680px'

const SansFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"

const Page = styled(motion.article)`
  max-width: ${ARTICLE_MAX_WIDTH};
  margin: 0 auto;
  padding: 40px 28px 64px;
  background: #ffffff;
  min-height: 100%;
  font-family: ${SansFamily};
`

const Kicker = styled.span`
  display: block;
  font-family: ${SansFamily};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 10px;
`

const BackLink = styled.button`
  font-family: ${SansFamily};
  margin-bottom: 20px;
  padding: 0;
  border: none;
  background: none;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`

const EditButton = styled.button`
  font-family: ${SansFamily};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: #111827;
    text-decoration: underline;
  }
`

const Headline = styled.h1`
  font-family: ${SansFamily};
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #121212;
  margin: 0 0 16px;
`

const Byline = styled.p`
  font-family: ${SansFamily};
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebebeb;
`

const Section = styled.section`
  margin-bottom: 40px;

  &:last-of-type {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  font-family: ${SansFamily};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7280;
  margin: 0 0 14px;
`

const Prose = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  line-height: 1.7;
  color: #111827;

  p {
    margin: 0 0 1em;
  }
  p:last-child {
    margin-bottom: 0;
  }
  strong {
    font-weight: 700;
  }

  /* 개행 유지 (textarea/본문에서 입력한 줄바꿈) */
  white-space: pre-wrap;
  word-break: break-word;

  /* 본문 내 인물 멘션 — 밑줄 링크, @ 기호 없음(HTML에서 제거) */
  .mention {
    color: #121212;
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
    transition: color 0.15s ease;
    display: inline;
    background: transparent;
    border: none;
    padding: 0;
  }
  .mention:hover {
    color: #374151;
  }
`

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Tag = styled.span`
  font-family: ${SansFamily};
  font-size: 12px;
  color: #374151;
  padding: 5px 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
`

const CountryChip = styled.span<{ $historical?: boolean }>`
  font-family: ${SansFamily};
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid ${(p) => (p.$historical ? '#fde68a' : '#e5e7eb')};
  color: ${(p) => (p.$historical ? '#92400e' : '#374151')};
`

const SideBlock = styled.div`
  padding: 18px 0;
  border-top: 1px solid #f0f0f0;
  margin-bottom: 0;

  &:last-child {
    border-bottom: 1px solid #f0f0f0;
  }
`

const SideName = styled.div`
  font-family: ${SansFamily};
  font-size: 15px;
  font-weight: 700;
  color: #121212;
  margin-bottom: 6px;
`

const SideDetail = styled.div`
  font-family: ${SansFamily};
  font-size: 14px;
  color: #666;
  line-height: 1.5;
`

const ImageWrap = styled.figure`
  margin: 28px 0;
  max-width: 100%;

  img {
    width: 100%;
    height: auto;
    display: block;
    background: #fafafa;
  }
`

const Figcaption = styled.figcaption`
  font-family: ${SansFamily};
  font-size: 13px;
  color: #666;
  margin-top: 8px;
  line-height: 1.4;
`

const ImageSource = styled.cite`
  display: block;
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  font-style: normal;
`

const SubEventBtn = styled.button`
  display: block;
  width: 100%;
  padding: 12px 0;
  text-align: left;
  border: none;
  border-bottom: 1px solid #f0f0f0;
  background: none;
  font-family: ${SansFamily};
  font-size: 15px;
  color: #111827;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: #374151;
  }
  &:last-child {
    border-bottom: none;
  }
`

const SubEventMeta = styled.span`
  font-family: ${SansFamily};
  font-size: 14px;
  color: #888;
  font-weight: 400;
  margin-left: 8px;
`

const MetaNote = styled.p`
  font-family: ${SansFamily};
  font-size: 11px;
  color: #9ca3af;
  margin: 28px 0 0;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
`

const LoadingWrap = styled.div`
  padding: 80px 32px;
  text-align: center;
  font-family: ${SansFamily};
  font-size: 15px;
  color: #888;
`

const ErrorWrap = styled.div`
  padding: 48px 32px;
  font-family: ${SansFamily};
  font-size: 15px;
  color: #c00;
`

const MentionModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  box-sizing: border-box;
`
const MentionModalPanel = styled(motion.div)`
  position: relative;
  background: #ffffff;
  border-radius: 24px;
  box-shadow:
    0 32px 64px -16px rgba(0, 0, 0, 0.2),
    0 16px 32px -16px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 640px;
  height: 85vh;
  min-height: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const MentionModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 20px 12px;
  background: #fafbfc;
  border-bottom: 1px solid #f1f5f9;
`
const MentionModalClose = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  &:hover {
    color: #0f172a;
    background: #f1f5f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  }
  &:active {
    transform: scale(0.97);
  }
`
const MentionModalBody = styled.div`
  overflow: auto;
  flex: 1;
  min-height: 380px;
  padding: 24px 28px 40px;
  background: #ffffff;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f8fafc;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`

/** 본문 HTML에서 멘션 스팬의 선두 @ 제거 (상세에서는 이름만 표시) */
function stripMentionAt(html: string): string {
  return html.replace(/(<span[^>]*class="[^"]*mention[^"]*"[^>]*>)@/g, '$1')
}

export function DashboardEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const [dto, setDto] = useState<EventResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [mentionPersonId, setMentionPersonId] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getEventById(eventId)
      .then(setDto)
      .catch((err) =>
        setError(err instanceof Error ? err : new Error(String(err))),
      )
      .finally(() => setLoading(false))
  }, [eventId])

  const handleProseClick = useCallback((e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest('.mention[data-type="person"]')
    if (el) {
      const id = el.getAttribute('data-id')
      if (id) {
        e.preventDefault()
        setMentionPersonId(id)
      }
    }
  }, [])

  const goToList = () => navigate(pathKeys.history.dashboardEvents())
  const goToEvent = (id: string) =>
    navigate(pathKeys.history.dashboardEventDetail(id))

  const mapped = dto ? mapEventResponseToHistoricalEvent(dto) : null
  const dateLabel =
    mapped?.startDate &&
    (mapped.endDate
      ? formatDateRange(mapped.startDate, mapped.endDate)
      : formatDateRange(mapped.startDate))
  const heroImage =
    dto?.eventImages?.find((i) => i.isPrimary)?.imageUrl ??
    dto?.thumbnail ??
    dto?.eventImages?.[0]?.imageUrl

  if (loading) {
    return (
      <Page
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <LoadingWrap>사건 정보를 불러오는 중…</LoadingWrap>
      </Page>
    )
  }

  if (error || !dto || !mapped) {
    return (
      <Page
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        <ErrorWrap>
          {error?.message ?? '사건을 찾을 수 없습니다.'}
        </ErrorWrap>
        <BackLink type="button" onClick={goToList}>
          ← 연대표 목록으로
        </BackLink>
      </Page>
    )
  }

  const hasBelligerents =
    dto.belligerents?.sides && dto.belligerents.sides.length > 0
  const casualtiesObj =
    dto.casualties && typeof dto.casualties === 'object'
      ? (dto.casualties as Record<string, unknown>)
      : null
  const eventSections =
    (dto.eventSections ?? []).slice().sort((a, b) => a.order - b.order)
  // 상단 히어로에 이미 쓴 이미지는 갤러리에서 제외 (한 장만 있을 때 중복 표시 방지)
  const galleryWithoutHero =
    heroImage && mapped.visuals.gallery.length > 0
      ? mapped.visuals.gallery.filter((img) => img.url !== heroImage)
      : mapped.visuals.gallery

  const goToEdit = () => navigate(pathKeys.history.dashboardEventEdit(dto.id))

  return (
    <Page
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <TopBar>
        <BackLink type="button" onClick={goToList}>
          ← 연대표 목록
        </BackLink>
        <EditButton type="button" onClick={goToEdit} aria-label="사건 수정">
          <FiEdit2 size={14} />
          수정
        </EditButton>
      </TopBar>

      {mapped.category && <Kicker>{mapped.category}</Kicker>}
      <Headline>{mapped.title}</Headline>
      <Byline>
        {dateLabel && <span>{dateLabel}</span>}
        {mapped.location && (
          <>
            {dateLabel && ' · '}
            <span>{mapped.location}</span>
          </>
        )}
      </Byline>

      {heroImage && (
        <ImageWrap>
          <img src={heroImage} alt="" />
        </ImageWrap>
      )}

      {mapped.description && (
        <Section>
          <SectionTitle>개요</SectionTitle>
          <div onClick={handleProseClick} role="presentation">
            <Prose dangerouslySetInnerHTML={{ __html: stripMentionAt(mapped.description) }} />
          </div>
        </Section>
      )}

      {eventSections.length > 0 &&
        eventSections.map((sec) => (
          <Section key={sec.id}>
            <SectionTitle>{sec.title}</SectionTitle>
            <div onClick={handleProseClick} role="presentation">
              <Prose dangerouslySetInnerHTML={{ __html: stripMentionAt(sec.content) }} />
            </div>
          </Section>
        ))}

      {(mapped.background || mapped.aftermath) && (
        <TwoCol>
          {mapped.background && (
            <Section>
              <SectionTitle>배경</SectionTitle>
              <div onClick={handleProseClick} role="presentation">
                <Prose dangerouslySetInnerHTML={{ __html: stripMentionAt(mapped.background) }} />
              </div>
            </Section>
          )}
          {mapped.aftermath && (
            <Section>
              <SectionTitle>여파</SectionTitle>
              <div onClick={handleProseClick} role="presentation">
                <Prose dangerouslySetInnerHTML={{ __html: stripMentionAt(mapped.aftermath) }} />
              </div>
            </Section>
          )}
        </TwoCol>
      )}

      {hasBelligerents && (
        <Section>
          <SectionTitle>교전 세력</SectionTitle>
          {dto.belligerents!.sides.map((side, i) => (
            <SideBlock key={i}>
              <SideName>{side.name}</SideName>
              {side.commander && (
                <SideDetail>지휘: {side.commander}</SideDetail>
              )}
              {side.forces && <SideDetail>병력: {side.forces}</SideDetail>}
              {side.description && (
                <SideDetail>{side.description}</SideDetail>
              )}
              {side.countries?.length > 0 && (
                <SideDetail>
                  참여:{' '}
                  {[].concat(side.countries).map((c: any) => (typeof c === 'object' && c?.name ? c.name : String(c))).join(', ')}
                </SideDetail>
              )}
            </SideBlock>
          ))}
        </Section>
      )}

      {(casualtiesObj || dto.warCost) && (
        <Section>
          <SectionTitle>피해·비용</SectionTitle>
          <Prose as="div" style={{ fontSize: 15 }}>
            {casualtiesObj &&
              Object.entries(casualtiesObj).map(
                ([key, val]) =>
                  val != null && String(val).trim() !== '' ? (
                    <p key={key} style={{ marginBottom: 6 }}>
                      <strong>
                        {key.replace(/([A-Z])/g, ' $1').trim()}:{' '}
                      </strong>
                      {typeof val === 'object'
                        ? JSON.stringify(val)
                        : String(val)}
                    </p>
                  ) : null,
              )}
            {dto.warCost && (
              <p style={{ marginBottom: 0 }}>
                <strong>전쟁 비용:</strong> {dto.warCost}
              </p>
            )}
          </Prose>
        </Section>
      )}

      {(mapped.relatedCountries?.length ||
        mapped.relatedHistoricalCountries?.length) && (
        <Section>
          <SectionTitle>관련 국가</SectionTitle>
          <TagRow>
            {mapped.relatedCountries?.map((c) => (
              <CountryChip key={c.id}>
                {c.flagEmoji ? `${c.flagEmoji} ` : ''}{c.name}
              </CountryChip>
            ))}
            {mapped.relatedHistoricalCountries?.map((c) => (
              <CountryChip key={c.id} $historical>
                {c.name}
              </CountryChip>
            ))}
          </TagRow>
        </Section>
      )}

      {dto.parentEvent && (
        <Section>
          <SectionTitle>상위 사건</SectionTitle>
          <SubEventBtn
            type="button"
            onClick={() => goToEvent(dto.parentEvent!.id)}
          >
            {dto.parentEvent.title}
            {dto.parentEvent.startDate && (
              <SubEventMeta>
                {formatDateRange(
                  dto.parentEvent.startDate,
                  dto.parentEvent.endDate ?? undefined,
                )}
              </SubEventMeta>
            )}
          </SubEventBtn>
        </Section>
      )}

      {dto.childEvents && dto.childEvents.length > 0 && (
        <Section>
          <SectionTitle>하위 사건</SectionTitle>
          {dto.childEvents.map((child) => (
            <SubEventBtn
              key={child.id}
              type="button"
              onClick={() => goToEvent(child.id)}
            >
              {child.title}
              {child.startDate && (
                <SubEventMeta>
                  {formatDateRange(
                    child.startDate,
                    child.endDate ?? undefined,
                  )}
                </SubEventMeta>
              )}
            </SubEventBtn>
          ))}
        </Section>
      )}

      {mapped.keywords && mapped.keywords.length > 0 && (
        <Section>
          <SectionTitle>키워드</SectionTitle>
          <TagRow>
            {mapped.keywords.map((k) => (
              <Tag key={k}>{k}</Tag>
            ))}
          </TagRow>
        </Section>
      )}

      {galleryWithoutHero.length > 0 && (
        <Section>
          <SectionTitle>이미지</SectionTitle>
          {galleryWithoutHero.map((img) => (
            <ImageWrap key={img.id}>
              <img src={img.url} alt={img.title} />
              <Figcaption>
                {img.caption || img.title}
                {img.source && <ImageSource>{img.source}</ImageSource>}
              </Figcaption>
            </ImageWrap>
          ))}
        </Section>
      )}

      {(dto.updatedAt || dto.createdAt) && (
        <MetaNote>
          {dto.updatedAt &&
            `수정: ${new Date(dto.updatedAt).toLocaleString('ko-KR')}`}
          {dto.createdAt && dto.updatedAt && ' · '}
          {dto.createdAt &&
            `등록: ${new Date(dto.createdAt).toLocaleString('ko-KR')}`}
        </MetaNote>
      )}

      <AnimatePresence>
        {mentionPersonId && (
          <MentionModalOverlay
            key="mention-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setMentionPersonId(null)}
            role="presentation"
          >
            <MentionModalPanel
              key="mention-modal-panel"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <MentionModalHeader>
                <MentionModalClose
                  type="button"
                  onClick={() => setMentionPersonId(null)}
                  aria-label="닫기"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </MentionModalClose>
              </MentionModalHeader>
              <MentionModalBody>
                <PersonDetailPanel
                  personId={mentionPersonId}
                  onClose={() => setMentionPersonId(null)}
                  onEdit={() => setMentionPersonId(null)}
                  hideHeaderActions
                  embedInModal
                />
              </MentionModalBody>
            </MentionModalPanel>
          </MentionModalOverlay>
        )}
      </AnimatePresence>
    </Page>
  )
}
