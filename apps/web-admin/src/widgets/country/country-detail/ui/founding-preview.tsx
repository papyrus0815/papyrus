/**
 * 건국·멸망 카드의 미리보기 층 — 카드 안의 인물·나라·사건을 누르면 페이지를 옮기지 않고
 * 먼저 모달을 띄운다. 상세 이동은 각 모달의 '상세' 버튼으로만.
 *
 * 두 카드와 그 안의 주체 목록이 모달 셋을 나눠 쓰도록 컨텍스트로 연다(카드마다 모달을 두면
 * 같은 인물 모달이 둘 겹쳐 뜰 수 있다).
 */
import { type MouseEvent, type ReactNode, createContext, useContext, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { pathKeys } from '@/shared/router'
import {
  CountryInlineModal,
  type CountryInlineModalTarget,
  shouldInterceptEntityClick,
} from '@/widgets/country/country-inline-modal/country-inline-modal'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'
import { PersonInlineModal } from '@/widgets/person/person-inline-modal/person-inline-modal'

type Preview =
  | { kind: 'person'; personId: string }
  | { kind: 'country'; target: CountryInlineModalTarget }
  | { kind: 'event'; eventId: string; role: string; note: string | null }

interface FoundingPreviewApi {
  openPerson: (personId: string) => void
  openCountry: (target: CountryInlineModalTarget) => void
  openEvent: (eventId: string, role: string, note: string | null) => void
}

const FoundingPreviewContext = createContext<FoundingPreviewApi | null>(null)

export function FoundingPreviewProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState<Preview | null>(null)
  const close = () => setPreview(null)

  const api = useMemo<FoundingPreviewApi>(
    () => ({
      openPerson: (personId) => setPreview({ kind: 'person', personId }),
      openCountry: (target) => setPreview({ kind: 'country', target }),
      openEvent: (eventId, role, note) => setPreview({ kind: 'event', eventId, role, note }),
    }),
    [],
  )

  return (
    <FoundingPreviewContext.Provider value={api}>
      {children}
      <PersonInlineModal
        personId={preview?.kind === 'person' ? preview.personId : null}
        onClose={close}
        onOpenDetail={(personId) => {
          close()
          navigate(pathKeys.personsTimelineDetail(personId))
        }}
      />
      <CountryInlineModal
        target={preview?.kind === 'country' ? preview.target : null}
        onClose={close}
        onSwitch={(target) => setPreview({ kind: 'country', target })}
      />
      <EventInlineModal
        eventId={preview?.kind === 'event' ? preview.eventId : null}
        onClose={close}
        onNavigate={(eventId) => {
          close()
          navigate(pathKeys.events.detail(eventId))
        }}
        personContext={
          preview?.kind === 'event'
            ? { label: '이 나라에서', role: preview.role, note: preview.note }
            : null
        }
      />
    </FoundingPreviewContext.Provider>
  )
}

export function useFoundingPreview(): FoundingPreviewApi {
  const api = useContext(FoundingPreviewContext)
  if (!api) throw new Error('useFoundingPreview는 FoundingPreviewProvider 안에서만 쓴다')
  return api
}

/**
 * 링크 클릭을 미리보기로 바꾸는 핸들러 — 수식 키 없는 왼쪽 클릭만 가로챈다.
 * ⌘/Ctrl·가운데 클릭은 링크 그대로(상세를 새 탭으로).
 */
export function previewOnClick(open: () => void) {
  return (clickEvent: MouseEvent<HTMLElement>) => {
    if (!shouldInterceptEntityClick(clickEvent)) return
    clickEvent.preventDefault()
    open()
  }
}
