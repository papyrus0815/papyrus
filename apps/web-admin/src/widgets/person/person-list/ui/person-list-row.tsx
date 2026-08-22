/**
 * 인물 목록 한 행 — 국가 목록 행(CountryListRow)과 같은 조판.
 *
 * - 행 클릭 → onSelect (우측 인물 상세)
 * - 핀 버튼은 stopPropagation으로 행 선택과 분리
 * - 좌측: 프로필 썸네일, 없으면 이름 첫 글자 배지(시대 색 옅은 톤)
 * - 두 줄: 이름(+군주/국가원수 표식) / 국가 · 생몰 · 직함
 * - 우측: 핀 + 영향력 수치
 */
import React from 'react'

import { FaChessKing, FaRegStar, FaStar } from 'react-icons/fa'
import { useTheme } from 'styled-components'

import * as S from '@/shared/ui/sidebar-list'
import { formatYear, type AdaptedPerson } from '@/widgets/person-infographic'

import * as PersonStyles from './person-list.styles'

interface PersonListRowProps {
  person: AdaptedPerson
  /** 빠른 접근(고정·최근) 그룹의 행인지 — 통상 그룹과 id 충돌을 피한다 */
  isQuickAccess: boolean
  selectedId: string | null
  pinned: boolean
  /** 행 좌측 strip 색 — 시대 색. 미지정 시 transparent */
  accentColor?: string
  /** 키보드 nav를 위한 행 인덱스 */
  rowIndex: number
  /** roving tabindex — 목록의 단일 Tab 진입점이면 true */
  isTabStop?: boolean
  onSelect: (id: string) => void
  onTogglePin: (id: string) => void
}

/** 생몰 표기 — BC는 formatYear가 '44BC'로 처리. 생존자는 '현재'. */
function lifespanText(person: AdaptedPerson): string {
  const bornText = person.born == null ? '?' : formatYear(person.born)
  const diedText = person.isAlive
    ? '현재'
    : person.died == null
      ? '?'
      : formatYear(person.died)
  if (bornText === '?' && diedText === '?') return ''
  return `${bornText}–${diedText}`
}

export function PersonListRow({
  person,
  isQuickAccess,
  selectedId,
  pinned,
  accentColor,
  rowIndex,
  isTabStop = false,
  onSelect,
  onTogglePin,
}: PersonListRowProps) {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'
  const lifespan = lifespanText(person)
  const countryText = person.country && person.country !== '미상' ? person.country : ''

  return (
    <S.ListRow
      id={isQuickAccess ? undefined : `person-${person.id}`}
      role="option"
      tabIndex={isTabStop ? 0 : -1}
      data-row-index={rowIndex}
      aria-selected={person.id === selectedId}
      $active={person.id === selectedId}
      $accentColor={accentColor}
      onClick={() => onSelect(person.id)}
    >
      <S.RowTop>
        <S.RowLeft>
          {person.profileImageUrl ? (
            <S.ThumbnailAvatar>
              <img src={person.profileImageUrl} alt={person.name} loading="lazy" />
            </S.ThumbnailAvatar>
          ) : (
            <S.AvatarBadge
              style={
                accentColor
                  ? {
                      background: S.withAlpha(accentColor, 0.14),
                      color: S.getBadgeTextColor(accentColor, isDark),
                    }
                  : undefined
              }
              aria-hidden
            >
              {person.name.slice(0, 1)}
            </S.AvatarBadge>
          )}
          <S.TextStack>
            <S.CodeText $unread={false} title={person.name}>
              {person.name}
              {(person.isMonarch || person.isHeadOfState) && (
                <PersonStyles.RoleMark
                  aria-hidden
                  title={person.isMonarch ? '군주' : '국가원수'}
                  style={{ color: person.isMonarch ? '#b45309' : '#1d4ed8' }}
                >
                  {person.isMonarch ? (
                    <FaChessKing size={9} />
                  ) : (
                    <FaStar size={9} />
                  )}
                </PersonStyles.RoleMark>
              )}
            </S.CodeText>
            <S.SubMeta>
              {countryText && <span>{countryText}</span>}
              {countryText && lifespan && <span className="dot" />}
              {lifespan && <span>{lifespan}</span>}
              {(countryText || lifespan) && person.primaryTitle && (
                <span className="dot" />
              )}
              {person.primaryTitle && <span>{person.primaryTitle}</span>}
            </S.SubMeta>
          </S.TextStack>
        </S.RowLeft>
        <S.RowRight>
          <S.PinButton
            type="button"
            $pinned={pinned}
            aria-label={pinned ? '고정 해제' : '고정'}
            title={pinned ? '고정 해제' : '고정'}
            onClick={(event) => {
              event.stopPropagation()
              onTogglePin(person.id)
            }}
          >
            {pinned ? <FaStar size={11} /> : <FaRegStar size={11} />}
          </S.PinButton>
          {/* 영향력 0은 '미상'이라 배지를 그리지 않는다 — 대부분의 행에 0이 붙어
              읽을 값이 있는 행을 오히려 가린다 (국가 행의 자식 수 배지와 같은 규약) */}
          {person.influence > 0 && (
            <PersonStyles.InfluenceBadge title={`영향력 ${person.influence}`}>
              {person.influence}
            </PersonStyles.InfluenceBadge>
          )}
        </S.RowRight>
      </S.RowTop>
    </S.ListRow>
  )
}
