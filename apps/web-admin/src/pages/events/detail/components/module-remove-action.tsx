import { FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerHairlineStrong } from '@/pages/events/ledger/styles/ledger-tokens'

interface ModuleRemoveActionProps {
  /** 모듈 한국어 라벨 — confirm 다이얼로그 안내 문구에 사용. */
  label: string
  /** 제거 액션 — patch에 null 전송 등. */
  onRemove: () => void
}

/**
 * 모듈 비활성화 진입점.
 *
 * `ModuleAdd`로 켜진 모듈은 한 번 활성화되면 빠져나갈 길이 없었다(실수 추가 시
 * 백엔드 직접 개입 필요). 각 모듈 헤더에 작은 제거 액션을 두어 클라이언트에서
 * `onPatch({ moduleKey: null })`로 비활성화할 수 있게 한다.
 *
 * native confirm은 admin 도구의 작은 위험 액션에는 충분 — 별도 dialog 시스템을
 * 끼우지 않는다(이후 디자인 시스템에 confirm 표준이 정해지면 일괄 교체).
 */
export function ModuleRemoveAction({ label, onRemove }: ModuleRemoveActionProps) {
  const handleClick = () => {
    const ok = window.confirm(
      `${label} 모듈을 제거합니다. 안에 있던 입력은 모두 사라집니다. 계속할까요?`,
    )
    if (ok) onRemove()
  }
  return (
    <RemoveBtn
      type="button"
      onClick={handleClick}
      aria-label={`${label} 모듈 제거`}
      title={`${label} 모듈 제거`}
    >
      <FiTrash2 />
      모듈 제거
    </RemoveBtn>
  )
}

const RemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.14s, border-color 0.14s, background 0.14s;

  svg {
    width: 11px;
    height: 11px;
  }

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
