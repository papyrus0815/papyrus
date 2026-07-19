/**
 * 피커 안에서 역사국가를 바로 등록하는 공용 조각 (국가-역사 연결 리뷰 F20).
 *
 * 기존에는 HistoricalCountryFormModal 마운트가 country-detail-shell 한 곳뿐이라,
 * 인물·재임·사건 저작 중 필요한 역사국가가 없으면 폼을 떠나 /country로 가야 했다.
 * tenure·sovereign·사건 폼은 draft가 없어 그 순간 입력값이 통째로 유실된다.
 * → 피커(빈 상태·목록 하단)에서 등록 모달을 띄우고, 성공하면 그 국가를 즉시 선택한다.
 *
 * 중첩 주의:
 * - 등록 폼(HistoricalCountryForm)은 내부에서 다시 CountrySearchModal(연결 현대국가)을 쓴다.
 *   정적 import면 shared ↔ widgets 순환이 생기므로 **React.lazy 동적 import**로 끊는다.
 * - 같은 이유로 피커 → 등록 폼 → 피커 무한 중첩이 가능하다. 컨텍스트로 한 단계만 허용한다.
 * - 등록 모달은 피커 오버레이의 **형제**로 렌더해야 한다(포털이라도 React 트리를 타고
 *   클릭 이벤트가 부모 오버레이의 onClick={onClose}까지 버블링되기 때문).
 */
import { Suspense, createContext, lazy, useCallback, useContext } from 'react'

import { FiPlus } from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { useCreateHistoricalCountry } from '@/features/historical-country'
import { notify } from '@/shared/ui/toast'

/** 타입 전용 참조 — 런타임 import가 아니라 순환이 생기지 않는다. */
type HistoricalCountryFormModalProps =
  import('@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal').HistoricalCountryFormModalProps

type HistoricalCountrySavePayload = Parameters<
  HistoricalCountryFormModalProps['onSave']
>[0]

const LazyHistoricalCountryFormModal = lazy(async () => {
  const loaded = await import(
    '@/widgets/historical-country/historical-country-form/ui/historical-country-form-modal'
  )
  return { default: loaded.HistoricalCountryFormModal }
})

/** true면 "이미 등록 폼 안"이라는 뜻 — 그 안의 피커는 CTA를 숨긴다. */
const InsideHistoricalCreateFormContext = createContext(false)

/** 이 피커가 '새 역사국가 등록' CTA를 노출해도 되는지(중첩 방지). */
export function useCanCreateHistoricalCountry(): boolean {
  return !useContext(InsideHistoricalCreateFormContext)
}

export interface HistoricalCountryCreateHostProps {
  isOpen: boolean
  onClose: () => void
  /** 등록 폼의 '연결 현대 국가' 선택지 */
  modernCountries: Array<{ id: string; name: string }>
  /** 등록 폼의 '전임/후임 역사국가' 선택지 */
  historicalCountries?: Array<{ id: string; name: string }>
  /** 등록 성공 → 생성된 국가를 피커가 즉시 선택 */
  onCreated: (country: { id: string; name: string }) => void
}

/**
 * 등록 모달 마운트 지점. 피커의 오버레이 **밖**(형제 위치)에 두어야 한다.
 * 저장 로직은 useHistoricalCountryFormModal의 save와 같은 규약이되,
 * 생성 결과를 호출부에 돌려주기 위해 여기서 직접 mutateAsync를 호출한다.
 */
export function HistoricalCountryCreateHost({
  isOpen,
  onClose,
  modernCountries,
  historicalCountries = [],
  onCreated,
}: HistoricalCountryCreateHostProps) {
  const createMutation = useCreateHistoricalCountry()

  const handleSave = useCallback(
    async (data: HistoricalCountrySavePayload) => {
      const loadingToast = notify.loading('등록하는 중...')
      try {
        // CreateHistoricalCountryDto는 일부 필드 null 미허용 — undefined로 생략
        const created = await createMutation.mutateAsync({
          name: data.name,
          enName: data.enName ?? undefined,
          nameOrigin: data.nameOrigin ?? undefined,
          description: data.description ?? undefined,
          history: data.history ?? undefined,
          thumbnailUrl: data.thumbnailUrl ?? undefined,
          startEra: data.startEra ?? undefined,
          startYear: data.startYear ?? undefined,
          startMonth: data.startMonth ?? undefined,
          startDay: data.startDay ?? undefined,
          endEra: data.endEra ?? undefined,
          endYear: data.endYear ?? undefined,
          endMonth: data.endMonth ?? undefined,
          endDay: data.endDay ?? undefined,
          stateType: data.stateType,
          entityKind: data.entityKind ?? null,
          parentModernCountryIds: data.parentModernCountryIds,
          parentHistoricalCountryIds: data.parentHistoricalCountryIds,
          transitionEventType: data.transitionEventType,
          transitionScope: data.transitionScope ?? null,
        })
        notify.success('등록되었습니다', { id: loadingToast })
        if (created?.id) {
          onCreated({ id: created.id, name: created.name ?? data.name })
        }
      } catch (error) {
        notify.error('등록 실패: ' + (error as Error).message, {
          id: loadingToast,
        })
        // 폼을 닫지 않도록 다시 던진다 (모달이 catch해 열린 상태를 유지)
        throw error
      }
    },
    [createMutation, onCreated],
  )

  if (!isOpen) return null

  return (
    <InsideHistoricalCreateFormContext.Provider value>
      <Suspense fallback={null}>
        <LazyHistoricalCountryFormModal
          isOpen={isOpen}
          onClose={onClose}
          editing={{}}
          modernCountries={modernCountries}
          historicalCountries={historicalCountries}
          onSave={handleSave}
        />
      </Suspense>
    </InsideHistoricalCreateFormContext.Provider>
  )
}

/**
 * '새 역사국가 등록' CTA. 빈 상태와 목록 하단 양쪽에서 쓰므로
 * `$variant`로 크기만 달리한다(빈 상태 = 강조, 하단 = 잔잔한 행).
 */
export const HistoricalCountryCreateButton = styled.button<{
  $variant?: 'block' | 'inline'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: -0.01em;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? theme.colors.background.secondary
      : theme.colors.background.primary};
  ${({ $variant = 'block' }) =>
    $variant === 'block'
      ? css`
          padding: 11px 18px;
          font-size: 13px;
        `
      : css`
          padding: 9px 14px;
          font-size: 12px;
        `}

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.dark};
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? theme.colors.background.tertiary
        : theme.colors.background.secondary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

/** CTA 아이콘 — 호출부가 매번 react-icons를 import하지 않도록 함께 제공. */
export function HistoricalCountryCreateIcon() {
  return <FiPlus size={15} strokeWidth={2.4} aria-hidden />
}
