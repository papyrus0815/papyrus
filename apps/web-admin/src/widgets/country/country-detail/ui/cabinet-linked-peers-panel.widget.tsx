/**
 * 다국 행정부 묶음 — 재임 기록 카드·기사 메타에 동일 축 영토 표시
 */
import React from 'react'

import { Link } from 'react-router-dom'

import type { CabinetListItemDto } from '@/shared/api/person-career'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'

import * as CabS from './cabinets-section.styled'

function territoryName(cab: CabinetListItemDto): string {
  const ht = cab.headTenure
  return ht?.historicalCountry?.name ?? ht?.country?.name ?? '—'
}

function territoryGovernmentUrl(cab: CabinetListItemDto): string | null {
  const ht = cab.headTenure
  const id = ht?.country?.id ?? ht?.historicalCountry?.id
  return id ? pathKeys.countryGovernment(id) : null
}

function PeerVisual({
  cab,
  variant,
}: {
  cab: CabinetListItemDto
  variant: 'card' | 'article'
}) {
  const ht = cab.headTenure
  const co = ht?.country
  const hc = ht?.historicalCountry
  const name = co?.name ?? hc?.name ?? '—'
  const thumbRaw = co?.thumbnailUrl ?? hc?.thumbnailUrl ?? null
  const emoji = co?.flagEmoji?.trim() ?? ''
  const thumb = thumbRaw ? getUploadImageUrl(thumbRaw) || thumbRaw : null

  const Bracket =
    variant === 'card'
      ? CabS.HistoryCardPeerBracket
      : CabS.HistoryArticlePeerBracket
  const Img =
    variant === 'card'
      ? CabS.HistoryCardPeerChipImg
      : CabS.HistoryArticlePeerChipImg
  const Chip =
    variant === 'card' ? CabS.HistoryCardPeerChip : CabS.HistoryArticlePeerChip

  if (thumb) {
    return (
      <Chip>
        <Img src={thumb} alt="" loading="lazy" decoding="async" />
      </Chip>
    )
  }
  if (emoji) {
    return (
      <Chip>
        <span aria-hidden>{emoji}</span>
      </Chip>
    )
  }
  return <Bracket>{`[${name}]`}</Bracket>
}

export type LinkedCabinetPeersRowProps = {
  linkedCabinets: CabinetListItemDto[]
  loading: boolean
  /** 카드 목록 vs 기사형 상세 */
  variant: 'card' | 'article'
}

/**
 * 같은 묶음의 다른 나라 행정부 — 국기 썸네일·이모지·없으면 [국가명]
 */
export function LinkedCabinetPeersRow({
  linkedCabinets,
  loading,
  variant,
}: LinkedCabinetPeersRowProps) {
  const Row =
    variant === 'card' ? CabS.HistoryCardPeersRow : CabS.HistoryArticlePeersRow

  if (loading && linkedCabinets.length === 0) {
    return (
      <Row>
        <CabS.HistoryPeerNameFallback style={{ fontStyle: 'italic' }}>
          묶인 행정부 불러오는 중…
        </CabS.HistoryPeerNameFallback>
      </Row>
    )
  }

  if (linkedCabinets.length === 0) {
    return null
  }

  return (
    <Row>
      {linkedCabinets.map((cab) => {
        const name = territoryName(cab)
        const href = territoryGovernmentUrl(cab)
        const visual = <PeerVisual cab={cab} variant={variant} />
        return (
          <React.Fragment key={cab.id}>
            {href ? (
              <Link
                to={href}
                title={name}
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'inline-flex', textDecoration: 'none' }}
              >
                {visual}
              </Link>
            ) : (
              visual
            )}
          </React.Fragment>
        )
      })}
    </Row>
  )
}
