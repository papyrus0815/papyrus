/**
 * 사건 인라인 상세 모달 — 연보(인물 상세 페이지)에서 사건 카드 클릭 시 띄우는 공용 모달.
 *
 * 동작: 카드 클릭 → 모달 오픈 → 사용자가 내용 확인 → "사건 상세로 이동" 버튼으로 페이지 진입.
 * 페이지로 바로 이동하지 않는 이유: 연보는 *훑어보기* 컨텍스트이므로 작은 사건은 빠르게 보고
 * 다음으로 넘어가고, 진짜로 깊게 들어갈 사건만 상세 페이지에 진입하는 흐름이 자연스럽다.
 *
 * 사건 데이터는 `getEventById`로 별도 fetch — 연보 데이터(`PersonEventInput`)는 카드 표시용
 * 최소 필드만 들고 있어서 카테고리/장소/설명 등 모달에 필요한 풍부한 정보가 없다.
 */
import { useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { FiArrowRight, FiCalendar, FiMapPin, FiUsers, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { getEventById } from '@/shared/api/events'
import { Z_INDEX } from '@/shared/styles/z-index'
import { glassCardMixin } from '@/shared/styles/mixins'
import {
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import { resolveCategory } from '@/pages/events/ledger/styles/ledger-tokens'

export interface EventInlineModalProps {
  /** 열려 있는 사건 id. null이면 모달 닫힘. */
  eventId: string | null
  /** 모달 닫기 (오버레이/X/ESC) */
  onClose: () => void
  /** "사건 상세로 이동" 클릭 시. 부모가 navigate 수행. */
  onNavigate: (eventId: string) => void
  /**
   * 연보 화면 컨텍스트 — 이 사건에서 해당 인물이 맡았던 역할과 인물 시점 서술.
   * 있으면 모달 상단에 "이 인물의 역할 — {role}" 줄로 노출. 없으면 표시하지 않음.
   */
  personContext?: {
    role?: string | null
    note?: string | null
  } | null
}

export function EventInlineModal({
  eventId,
  onClose,
  onNavigate,
  personContext,
}: EventInlineModalProps) {
  // ESC 닫기
  useEffect(() => {
    if (!eventId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [eventId, onClose])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => getEventById(eventId!),
    enabled: !!eventId,
  })

  const category = resolveCategory(event?.category?.name ?? null)
  const dateLabel = event
    ? formatRange(
        event.startDate,
        event.endDate,
        event.startDatePrecision,
        event.endDatePrecision,
      )
    : ''
  const relatedPersonCount = event?.relatedPersons?.length ?? 0

  return (
    <AnimatePresence>
      {eventId && (
        <Overlay
          key="event-inline-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={onClose}
          role="presentation"
        >
          <Box
            key="event-inline-modal-panel"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="사건 상세 미리보기"
          >
            <ModalHeader>
              <HeaderInner>
                {event?.category?.name && (
                  <CategoryChip $color={category.color}>
                    <span aria-hidden>{category.icon}</span>
                    {event.category.name}
                  </CategoryChip>
                )}
                <ModalTitle title={event?.title ?? ''}>
                  {event?.title ?? (isLoading ? '불러오는 중…' : '사건')}
                </ModalTitle>
              </HeaderInner>
              <ModalCloseButton type="button" onClick={onClose} aria-label="닫기">
                <FiX size={20} strokeWidth={2.5} />
              </ModalCloseButton>
            </ModalHeader>

            <Body>
              {isLoading && !event && <Skeleton aria-label="사건 정보 불러오는 중" />}
              {event && (
                <>
                  <MetaRow>
                    {dateLabel && (
                      <MetaItem>
                        <FiCalendar size={14} strokeWidth={2} aria-hidden />
                        <span>{dateLabel}</span>
                      </MetaItem>
                    )}
                    {event.location && (
                      <MetaItem>
                        <FiMapPin size={14} strokeWidth={2} aria-hidden />
                        <span>{event.location}</span>
                      </MetaItem>
                    )}
                    {relatedPersonCount > 0 && (
                      <MetaItem>
                        <FiUsers size={14} strokeWidth={2} aria-hidden />
                        <span>참여 인물 {relatedPersonCount}명</span>
                      </MetaItem>
                    )}
                  </MetaRow>

                  {personContext && (personContext.role || personContext.note) && (
                    <PersonContextBlock>
                      <PersonContextLabel>이 인물의 사건 기록</PersonContextLabel>
                      {personContext.role && (
                        <PersonContextRole>역할 — {personContext.role}</PersonContextRole>
                      )}
                      {personContext.note && (
                        <PersonContextNote>{personContext.note}</PersonContextNote>
                      )}
                    </PersonContextBlock>
                  )}

                  {event.description ? (
                    <Description>{event.description}</Description>
                  ) : (
                    <EmptyDescription>
                      이 사건의 본문 설명이 아직 작성되지 않았습니다.
                    </EmptyDescription>
                  )}
                </>
              )}
            </Body>

            <ModalFooter>
              <SecondaryButton type="button" onClick={onClose}>
                닫기
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => {
                  if (!eventId) return
                  onClose()
                  onNavigate(eventId)
                }}
                disabled={!eventId}
              >
                사건 상세로 이동
                <FiArrowRight size={14} strokeWidth={2.4} aria-hidden />
              </PrimaryButton>
            </ModalFooter>
          </Box>
        </Overlay>
      )}
    </AnimatePresence>
  )
}

// ─── date helpers ─────────────────────────────────────────────────────
function formatWithPrecision(iso: string | null | undefined, precision?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  if (precision === 'year') return `${y}년`
  if (precision === 'month') return `${y}년 ${m}월`
  return `${y}년 ${m}월 ${day}일`
}

function formatRange(
  start: string | null | undefined,
  end: string | null | undefined,
  startPrecision?: string | null,
  endPrecision?: string | null,
): string {
  const s = formatWithPrecision(start, startPrecision)
  const e = formatWithPrecision(end, endPrecision)
  if (!s && !e) return ''
  if (s && !e) return s
  if (!s && e) return `~ ${e}`
  if (s === e) return s
  return `${s} ~ ${e}`
}

// ─── styled ──────────────────────────────────────────────────────────
const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  overflow-y: auto;
`

const Box = styled(motion.div)`
  ${({ theme }) => glassCardMixin(theme)}
  max-width: 640px;
  width: 100%;
  max-height: 88vh;
  border-radius: 20px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Body = styled(ModalBody)`
  overflow-y: auto;
  flex: 1;
  gap: 14px;
`

const HeaderInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
`

const CategoryChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: ${({ $color }) => $color}1f;
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $color }) => $color}40;
  & > span {
    font-size: 12px;
    line-height: 1;
  }
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  & > svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PersonContextBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.10)' : 'rgba(99, 102, 241, 0.06)'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.18)'};
`

const PersonContextLabel = styled.div`
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #6366f1;
  text-transform: uppercase;
`

const PersonContextRole = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PersonContextNote = styled.div`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
`

const Description = styled.div`
  font-size: 14px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-break: keep-all;
  overflow-wrap: anywhere;
`

const EmptyDescription = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-style: italic;
`

const Skeleton = styled.div`
  height: 160px;
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};
  animation: pulse 1.4s ease-in-out infinite;
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
`

const SecondaryButton = styled.button`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    background: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: #6366f1;
  color: #fff;
  border: 1px solid #6366f1;
  transition: background 0.15s ease, transform 0.15s ease;
  &:hover {
    background: #4f46e5;
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    background: ${({ theme }) => theme.colors.text.tertiary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
    cursor: not-allowed;
  }
`
