/**
 * 출생 / 사망 카드 — 개요 탭. 좌우 분리하여 장소·일자·사망정보를 묶어 보여준다.
 * (기존 person-detail-panel.tsx 인라인 IIFE에서 추출 — 순수 표시 컴포넌트)
 */
import { FiAlertTriangle, FiCalendar } from 'react-icons/fi'

import { DEATH_TYPE_LABELS } from './helpers'
import {
  BirthMarkerPill,
  DeathCauseText,
  DeathInfoRow,
  DeathNoteText,
  DeathTypePill,
  LifeCard,
  LifeCardAge,
  LifeCardGrid,
  LifeCardHeader,
  LifeCardIconWrap,
  LifeCardLabel,
  LifeCardRow,
  LifeCardTitle,
  LifeCardValue,
} from './person-detail-panel.styles'
import type { PersonDetailData } from './types'

interface BirthDeathCardsProps {
  person: PersonDetailData
  /** formatDateKo 결과 — 빈 문자열이면 미표시 */
  birthDateStr: string
  deathDateStr: string
  ageAtDeath: number | null
}

export function BirthDeathCards({
  person: p,
  birthDateStr,
  deathDateStr,
  ageAtDeath,
}: BirthDeathCardsProps) {
  const birthPlace =
    p.birthCity?.name ??
    p.birthAdminDivision?.name ??
    p.birthPlaceText ??
    null
  const deathPlace =
    p.deathCity?.name ??
    p.deathAdminDivision?.name ??
    p.deathPlaceText ??
    null
  // 출생 당시 국가 — BIRTH_PLACE 소속(historicalCountry 우선). 장소 필드(도시)와 별개 시스템이라
  // 병기해 두 계통을 한 카드에 수렴한다(예: 아인슈타인 울름[도시] + 독일 제국[출생국]).
  const birthPlaceAff = p.countryAffiliations?.find(
    (aff) => aff.affiliationType === 'BIRTH_PLACE',
  )
  const birthCountry =
    birthPlaceAff?.historicalCountry?.name ?? birthPlaceAff?.country?.name ?? null
  const hasBirth =
    !!birthDateStr ||
    !!birthPlace ||
    !!birthCountry ||
    !!p.isBirthDateUnknown ||
    !!p.illegitimate
  const hasDeath =
    !!deathDateStr ||
    !!deathPlace ||
    !!p.isDeathDateUnknown ||
    !!p.deathType ||
    !!p.deathCause ||
    !!p.deathNote
  if (!hasBirth && !hasDeath) return null

  return (
    <LifeCardGrid>
      {hasBirth && (
        <LifeCard $tone="birth" aria-label="출생 정보">
          <LifeCardHeader>
            <LifeCardIconWrap $tone="birth">
              <FiCalendar size={14} strokeWidth={2.2} />
            </LifeCardIconWrap>
            <LifeCardTitle>출생</LifeCardTitle>
            {p.illegitimate && <BirthMarkerPill>서출</BirthMarkerPill>}
          </LifeCardHeader>
          {birthDateStr ? (
            <LifeCardRow>
              <LifeCardLabel>일자</LifeCardLabel>
              <LifeCardValue>{birthDateStr}</LifeCardValue>
            </LifeCardRow>
          ) : p.isBirthDateUnknown ? (
            <LifeCardRow>
              <LifeCardLabel>일자</LifeCardLabel>
              <LifeCardValue>미상</LifeCardValue>
            </LifeCardRow>
          ) : null}
          {birthPlace && (
            <LifeCardRow>
              <LifeCardLabel>장소</LifeCardLabel>
              <LifeCardValue>{birthPlace}</LifeCardValue>
            </LifeCardRow>
          )}
          {birthCountry && (
            <LifeCardRow>
              <LifeCardLabel>출생국</LifeCardLabel>
              <LifeCardValue>{birthCountry}</LifeCardValue>
            </LifeCardRow>
          )}
        </LifeCard>
      )}
      {hasDeath && (
        <LifeCard $tone="death" aria-label="사망 정보">
          <LifeCardHeader>
            <LifeCardIconWrap $tone="death">
              <FiAlertTriangle size={14} strokeWidth={2.2} />
            </LifeCardIconWrap>
            <LifeCardTitle>사망</LifeCardTitle>
            {ageAtDeath != null && <LifeCardAge>향년 {ageAtDeath}세</LifeCardAge>}
          </LifeCardHeader>
          {deathDateStr ? (
            <LifeCardRow>
              <LifeCardLabel>일자</LifeCardLabel>
              <LifeCardValue>{deathDateStr}</LifeCardValue>
            </LifeCardRow>
          ) : p.isDeathDateUnknown ? (
            <LifeCardRow>
              <LifeCardLabel>일자</LifeCardLabel>
              <LifeCardValue>미상</LifeCardValue>
            </LifeCardRow>
          ) : null}
          {deathPlace && (
            <LifeCardRow>
              <LifeCardLabel>장소</LifeCardLabel>
              <LifeCardValue>{deathPlace}</LifeCardValue>
            </LifeCardRow>
          )}
          {(p.deathType || p.deathCause) && (
            <LifeCardRow>
              <LifeCardLabel>유형</LifeCardLabel>
              <DeathInfoRow>
                {p.deathType && (
                  <DeathTypePill>
                    {DEATH_TYPE_LABELS[p.deathType] ?? p.deathType}
                  </DeathTypePill>
                )}
                {p.deathCause && <DeathCauseText>{p.deathCause}</DeathCauseText>}
              </DeathInfoRow>
            </LifeCardRow>
          )}
          {p.deathNote && <DeathNoteText>{p.deathNote}</DeathNoteText>}
        </LifeCard>
      )}
    </LifeCardGrid>
  )
}
