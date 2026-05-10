/**
 * 빈 상태 추천 프리셋 — 첫 사용자가 "어디서부터 시작하지?"에 막히지 않게
 * 한 번의 클릭으로 자주 비교되는 조합을 핀으로 채워준다.
 *
 * 옵션 fetch가 끝나야 실제 segment를 만들 수 있으므로, 프리셋 정의는 국가 이름·ISO를 키로 두고
 * 모달과 동일한 useCountryOptions 결과에서 매칭한다.
 */
import styled from 'styled-components'

import { useToast } from '@/shared/ui/toast'

import {
  optionToSegment,
  useCountryOptions,
  type CountryOption,
} from '../model/use-country-options'
import type { PinnedSegment } from '../model/types'

interface PresetSpec {
  id: string
  label: string
  description: string
  /** 매칭은 name 정확 일치 → ISO 일치 → name 부분 일치 순 */
  matchers: { name?: string; iso?: string }[]
}

const PRESETS: PresetSpec[] = [
  {
    id: 'modern-3',
    label: '한국 · 미국 · 영국',
    description: '현대 3대국 동시대 비교',
    matchers: [
      { name: '대한민국', iso: 'KR' },
      { name: '미국', iso: 'US' },
      { name: '영국', iso: 'GB' },
    ],
  },
  {
    id: 'modern-east-asia',
    label: '한국 · 중국 · 일본',
    description: '동아시아 현대 3국',
    matchers: [
      { name: '대한민국', iso: 'KR' },
      { name: '중국', iso: 'CN' },
      { name: '일본', iso: 'JP' },
    ],
  },
  {
    id: 'european-monarchies',
    label: '영국 · 프랑스 · 러시아',
    description: '유럽 군주제 비교',
    matchers: [
      { name: '영국', iso: 'GB' },
      { name: '프랑스', iso: 'FR' },
      { name: '러시아', iso: 'RU' },
    ],
  },
]

interface Props {
  onPickMany: (segments: Omit<PinnedSegment, 'segmentId'>[]) => void
}

function findOption(
  options: CountryOption[],
  matcher: { name?: string; iso?: string },
): CountryOption | null {
  // 1) 한글명 정확 일치
  if (matcher.name) {
    const exact = options.find((o) => o.kind === 'COUNTRY' && o.name === matcher.name)
    if (exact) return exact
  }
  // 2) ISO 코드 일치 — 한글명이 바뀌어도 안정
  if (matcher.iso) {
    const byIso = options.find(
      (o) => o.kind === 'COUNTRY' && o.isoCode?.toUpperCase() === matcher.iso!.toUpperCase(),
    )
    if (byIso) return byIso
  }
  // 3) 한글명 부분 일치 — fragility를 낮추는 마지막 fallback
  if (matcher.name) {
    const partial = options.find(
      (o) => o.kind === 'COUNTRY' && o.name.includes(matcher.name!),
    )
    if (partial) return partial
  }
  return null
}

export function EmptyPresets({ onPickMany }: Props) {
  const { options, isLoading } = useCountryOptions(true)
  const { showToast } = useToast()

  const handlePick = (preset: PresetSpec) => {
    if (isLoading) return
    const expected = preset.matchers.length
    const matched = preset.matchers
      .map((m) => findOption(options, m))
      .filter((opt): opt is CountryOption => opt != null)
    if (matched.length === 0) {
      showToast('error', `${preset.label} — 매칭되는 국가가 없습니다`)
      return
    }
    if (matched.length < expected) {
      showToast(
        'warning',
        `${preset.label} — ${expected}개 중 ${matched.length}개만 매칭`,
      )
    }
    onPickMany(matched.map(optionToSegment))
  }

  return (
    <Wrap>
      <PresetTitle>또는, 추천 조합으로 시작하기</PresetTitle>
      <PresetGrid>
        {PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            type="button"
            onClick={() => handlePick(preset)}
            disabled={isLoading}
          >
            <PresetLabel>{preset.label}</PresetLabel>
            <PresetDesc>{preset.description}</PresetDesc>
          </PresetCard>
        ))}
      </PresetGrid>
    </Wrap>
  )
}

const Wrap = styled.div`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 560px;
`

const PresetTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
`

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
`

const PresetCard = styled.button`
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s, background 0.15s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.activeLight};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PresetLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PresetDesc = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
