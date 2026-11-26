import { Suspense, lazy, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  FiBookOpen,
  FiClock,
  FiCompass,
  FiEdit3,
  FiFileText,
  FiGitCommit,
  FiLayers,
  FiPlus,
} from 'react-icons/fi'

import { type EventDetail, eventKeys } from '../use-event-detail'
import {
  type EventEmptyQuietLink,
  EventTabEmptyState,
} from './event-tab-empty-state'

const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

interface CollectionWholeTextNoticeProps {
  event: Pick<EventDetail, 'id' | 'title' | 'domain' | 'kind'>
  readOnly?: boolean
  onWriteSummary?: () => void
  onWriteBackground?: () => void
  onWriteNarrative?: () => void
  onWriteAftermath?: () => void
  onGatherExisting?: () => void
  onAddTreaty?: () => void
}

/**
 * 개요 탭 본문이 통째로 비어 있을 때의 빈 상태(Empty State) —
 * 네 칸짜리 버튼 그리드 대신 고요한 단일 빈 상태 화면을 세우고,
 * 클릭 한 번으로 요약 에디터·첫 하위 사건 등록 모달·전개 단락 작성으로 바로 진입하게 한다.
 */
export function CollectionWholeTextNotice({
  event,
  readOnly = false,
  onWriteSummary,
  onWriteBackground,
  onWriteNarrative,
  onWriteAftermath,
  onGatherExisting,
  onAddTreaty,
}: CollectionWholeTextNoticeProps) {
  const queryClient = useQueryClient()
  const [createChildOpen, setCreateChildOpen] = useState(false)
  const isCollection = event.kind === 'COLLECTION'

  const handleChildCreated = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    void queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  }

  if (isCollection) {
    const quietLinks: EventEmptyQuietLink[] = readOnly
      ? []
      : [
          ...(onGatherExisting ? [{ label: '기존 사건 모으기', onClick: onGatherExisting }] : []),
          ...(onWriteBackground ? [{ label: '배경 쓰기', onClick: onWriteBackground }] : []),
          ...(onWriteAftermath ? [{ label: '여파 쓰기', onClick: onWriteAftermath }] : []),
          ...(onAddTreaty ? [{ label: '조약 연결', onClick: onAddTreaty }] : []),
        ]

    return (
      <>
        <EventTabEmptyState
          Icon={FiBookOpen}
          ariaLabel="묶음 사건 개요 빈 상태"
          title="아직 등록된 하위 사건과 본문이 없습니다"
          description={
            readOnly
              ? '이 묶음 사건에 작성된 요약·배경·여파 본문이나 하위 사건이 없습니다.'
              : '세부 하위 사건을 등록해 전체 연표를 구성하거나, 이 묶음 사건 전체를 아우르는 핵심 요약부터 작성할 수 있습니다.'
          }
          primaryAction={
            !readOnly
              ? {
                  label: '첫 하위 사건 등록',
                  Icon: FiPlus,
                  onClick: () => setCreateChildOpen(true),
                }
              : undefined
          }
          secondaryAction={
            !readOnly && onWriteSummary
              ? {
                  label: '전체 요약 작성',
                  Icon: FiEdit3,
                  onClick: onWriteSummary,
                }
              : undefined
          }
          quietLinks={quietLinks}
          features={
            readOnly
              ? undefined
              : [
                  {
                    Icon: FiLayers,
                    title: '하위 사건 연표 전개',
                    description: '전투·회담·조약 같은 세부 사건이 날짜와 국면 순서로 쌓여 연표와 조망을 이룹니다.',
                  },
                  {
                    Icon: FiFileText,
                    title: '전체 핵심 요약',
                    description: '이 묶음 사건 전체의 성격과 역사적 의의를 한두 문단으로 먼저 개괄합니다.',
                  },
                  {
                    Icon: FiCompass,
                    title: '배경 · 구조적 원인',
                    description: '사건군 전체가 일어나게 된 시대 배경과 직접적인 도화선을 기록합니다.',
                  },
                  {
                    Icon: FiGitCommit,
                    title: '여파 · 역사적 파장',
                    description: '종결 직후의 결과와 제도·국제질서에 남긴 장기적 영향을 정리합니다.',
                  },
                ]
          }
        />
        {createChildOpen && (
          <Suspense fallback={null}>
            <LazyEventRegisterModal
              isOpen
              onClose={() => setCreateChildOpen(false)}
              initialParent={{ id: event.id, title: event.title, domain: event.domain }}
              onSaved={handleChildCreated}
            />
          </Suspense>
        )}
      </>
    )
  }

  const quietLinks: EventEmptyQuietLink[] = readOnly
    ? []
    : [
        ...(onWriteBackground ? [{ label: '배경부터 쓰기', onClick: onWriteBackground }] : []),
        ...(onWriteAftermath ? [{ label: '여파부터 쓰기', onClick: onWriteAftermath }] : []),
        ...(onAddTreaty ? [{ label: '체결 조약 연결', onClick: onAddTreaty }] : []),
      ]

  return (
    <EventTabEmptyState
      Icon={FiBookOpen}
      ariaLabel="사건 본문 빈 상태"
      title="아직 작성된 사건 본문이 없습니다"
      description={
        readOnly
          ? '이 사건에 작성된 요약·배경·전개·여파 본문이 없습니다.'
          : '핵심 요약부터 배경·전개·여파까지 시간 흐름에 따라 기록하면 우측 목차와 연표 흐름이 자동으로 구성됩니다.'
      }
      primaryAction={
        !readOnly && onWriteSummary
          ? {
              label: '핵심 요약 작성',
              Icon: FiEdit3,
              onClick: onWriteSummary,
            }
          : undefined
      }
      secondaryAction={
        !readOnly && onWriteNarrative
          ? {
              label: '전개 단락 쓰기',
              Icon: FiPlus,
              onClick: onWriteNarrative,
            }
          : undefined
      }
      quietLinks={quietLinks}
      features={
        readOnly
          ? undefined
          : [
              {
                Icon: FiFileText,
                title: '사건 핵심 요약',
                description: '언제·누구 사이에서 일어난 어떤 사건인지 핵심 의의를 한두 문단으로 개괄합니다.',
              },
              {
                Icon: FiCompass,
                title: '배경 · 원인',
                description: '사건이 일어나게 된 구조적 원인과 직전 정세, 직접적인 도화선을 기록합니다.',
              },
              {
                Icon: FiClock,
                title: '시간순 전개',
                description: '발단부터 전환점·결말까지 단락으로 나누면 우측 목차가 함께 만들어집니다.',
              },
              {
                Icon: FiGitCommit,
                title: '여파 · 파장',
                description: '사건 직후의 결과와 제도·영토·후속 사건에 미친 파장을 기록합니다.',
              },
            ]
      }
    />
  )
}
