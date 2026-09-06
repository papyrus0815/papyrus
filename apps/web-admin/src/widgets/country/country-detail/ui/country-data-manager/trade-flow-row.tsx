import { useMemo, useState } from 'react'

import {
  CHANNEL_OPTIONS,
  GRAIN_OPTIONS,
  PRICE_BASIS_OPTIONS,
  RESTRICTION_OPTIONS,
  TRANSPORT_OPTIONS,
} from '@/entities/trade/vocab'
import type {
  TradeCommodity,
  TradeCommodityCategory,
} from '@/entities/trade/api'

import * as S from './styles'
import * as T from './trade-panel.styles'
import {
  TradeLinkPicker,
  type TradeLinkKind,
  type TradeLinkSelection,
} from './trade-link-picker'

/** 편집 중인 흐름 한 줄 — 서버 id는 들고 다니지 않는다(배열 통째 교체) */
export interface FlowDraft {
  key: string
  direction: 'EXPORT' | 'IMPORT'
  grain: 'COMMODITY' | 'PARTNER' | 'PARTNER_COMMODITY' | ''
  commodityId: string
  name: string
  categoryId: string
  hsCode: string
  partnerKind: 'COUNTRY' | 'HISTORICAL_COUNTRY' | 'ORGANIZATION' | 'LABEL' | ''
  partnerCountryId: string
  partnerHistoricalCountryId: string
  partnerOrganizationId: string
  partnerLabel: string
  value: string
  sharePct: string
  quantity: string
  quantityUnit: string
  unitPrice: string
  priceBasis: string
  rankInDirection: string
  yoyPct: string
  channel: string
  restriction: string
  tariffRatePct: string
  isReExport: boolean
  transportMode: string
  routeName: string
  portName: string
  relatedEventId: string
  relatedEventTitle: string
  relatedTreatyId: string
  relatedTreatyName: string
  relatedCompanyId: string
  relatedCompanyName: string
  isEstimate: boolean
  sourceNote: string
  notes: string
}

interface PartnerOption {
  id: string
  name: string
}

interface TradeFlowRowProps {
  flow: FlowDraft
  open: boolean
  commodities: TradeCommodity[]
  categories: TradeCommodityCategory[]
  countries: PartnerOption[]
  historicalCountries: PartnerOption[]
  organizations: PartnerOption[]
  onPatch: (patch: Partial<FlowDraft>) => void
  onToggleDetail: () => void
  onRemove: () => void
}

/**
 * 흐름 한 줄의 편집기.
 *
 * 칸이 25개 가까이 되지만 자료에 다 있는 경우는 드물다. 그래서 **늘 보이는 6칸**
 * (방향·품목·상대·금액·비중)과 **접이식 상세**로 가른다 — 평소에는 표처럼 읽히고,
 * 필요할 때만 깊이 들어간다.
 */
export function TradeFlowRow({
  flow,
  open,
  commodities,
  categories,
  countries,
  historicalCountries,
  organizations,
  onPatch,
  onToggleDetail,
  onRemove,
}: TradeFlowRowProps) {
  /* 어느 종류를 고르는 중인지 — null이면 닫힘 */
  const [pickerKind, setPickerKind] = useState<TradeLinkKind | null>(null)

  const commodityByName = useMemo(() => {
    const map = new Map<string, TradeCommodity>()
    for (const commodity of commodities) map.set(commodity.name, commodity)
    return map
  }, [commodities])

  const linkedCommodity = flow.commodityId
    ? commodities.find((commodity) => commodity.id === flow.commodityId)
    : undefined

  /*
   * 품목은 카탈로그 이름과 정확히 맞으면 그 품목으로 연결하고, 아니면 자유 입력으로 둔다.
   * 자유 입력도 버리지 않는 이유: 사료의 표기(生絲·白木)가 카탈로그에 없는 일이 흔하다.
   */
  const handleNameChange = (value: string) => {
    const matched = commodityByName.get(value.trim())
    onPatch({
      name: value,
      commodityId: matched?.id ?? '',
      /* 카탈로그를 물면 분류·단위를 물려받는다 — 손으로 다시 고를 이유가 없다 */
      ...(matched
        ? {
            categoryId: flow.categoryId || matched.categoryId,
            quantityUnit: flow.quantityUnit || (matched.defaultUnit ?? ''),
          }
        : {}),
    })
  }

  const partnerControl = () => {
    switch (flow.partnerKind) {
      case 'COUNTRY':
        return (
          <S.ItemSelect
            value={flow.partnerCountryId}
            aria-label="교역 상대 (현대 국가)"
            onChange={(event) =>
              onPatch({ partnerCountryId: event.target.value })
            }
          >
            <option value="">국가 선택</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </S.ItemSelect>
        )
      case 'HISTORICAL_COUNTRY':
        return (
          <S.ItemSelect
            value={flow.partnerHistoricalCountryId}
            aria-label="교역 상대 (역사 국가)"
            onChange={(event) =>
              onPatch({ partnerHistoricalCountryId: event.target.value })
            }
          >
            <option value="">역사 국가 선택</option>
            {historicalCountries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </S.ItemSelect>
        )
      case 'ORGANIZATION':
        return (
          <S.ItemSelect
            value={flow.partnerOrganizationId}
            aria-label="교역 상대 (조직)"
            onChange={(event) =>
              onPatch({ partnerOrganizationId: event.target.value })
            }
          >
            <option value="">조직 선택</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </S.ItemSelect>
        )
      case 'LABEL':
        return (
          <S.Input
            value={flow.partnerLabel}
            placeholder="기타 유럽 / 세계 전체"
            aria-label="교역 상대 (직접 입력)"
            onChange={(event) => onPatch({ partnerLabel: event.target.value })}
          />
        )
      default:
        return (
          <S.ItemSelect
            value=""
            aria-label="교역 상대 종류"
            onChange={(event) =>
              onPatch({
                partnerKind: event.target.value as FlowDraft['partnerKind'],
              })
            }
          >
            <option value="">상대 없음</option>
            <option value="COUNTRY">현대 국가…</option>
            <option value="HISTORICAL_COUNTRY">역사 국가…</option>
            <option value="ORGANIZATION">조직…</option>
            <option value="LABEL">직접 입력…</option>
          </S.ItemSelect>
        )
    }
  }

  return (
    <T.FlowCard $direction={flow.direction}>
      <T.FlowMainRow>
        <S.ItemSelect
          value={flow.direction}
          aria-label="교역 방향"
          onChange={(event) =>
            onPatch({ direction: event.target.value as 'EXPORT' | 'IMPORT' })
          }
        >
          <option value="EXPORT">수출</option>
          <option value="IMPORT">수입</option>
        </S.ItemSelect>

        <div>
          <S.Input
            list="trade-commodity-options"
            value={flow.name}
            placeholder="품목 (예: 원유)"
            aria-label="품목"
            onChange={(event) => handleNameChange(event.target.value)}
            style={{ width: '100%' }}
          />
          {linkedCommodity ? (
            <T.MutedTag title={linkedCommodity.categoryPath}>
              {linkedCommodity.categoryPath}
            </T.MutedTag>
          ) : flow.name.trim() ? (
            <T.MutedTag>자유 입력 · 아래에서 분류 지정</T.MutedTag>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          {flow.partnerKind !== '' && (
            <S.IconBtn
              type="button"
              aria-label="교역 상대 지우기"
              title="상대 지우기"
              onClick={() =>
                onPatch({
                  partnerKind: '',
                  partnerCountryId: '',
                  partnerHistoricalCountryId: '',
                  partnerOrganizationId: '',
                  partnerLabel: '',
                })
              }
            >
              ↺
            </S.IconBtn>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>{partnerControl()}</div>
        </div>

        <S.Input
          type="number"
          value={flow.value}
          placeholder="금액"
          aria-label="금액"
          onChange={(event) => onPatch({ value: event.target.value })}
        />
        <S.Input
          type="number"
          value={flow.sharePct}
          placeholder="%"
          aria-label="비중(%)"
          onChange={(event) => onPatch({ sharePct: event.target.value })}
        />
        <T.DisclosureButton
          type="button"
          $open={open}
          aria-expanded={open}
          aria-label={`${flow.name || '이'} 품목 상세 ${open ? '접기' : '펼치기'}`}
          onClick={onToggleDetail}
        >
          {open ? '▾' : '▸'}
        </T.DisclosureButton>
        <S.IconBtn
          type="button"
          $danger
          aria-label={`${flow.name || '빈'} 품목 삭제`}
          onClick={onRemove}
        >
          ✕
        </S.IconBtn>
      </T.FlowMainRow>

      {open && (
        <T.DetailGrid>
          <T.DetailGroupLabel>분류·단면</T.DetailGroupLabel>
          <S.Field>
            단면
            <S.ItemSelect
              value={flow.grain}
              onChange={(event) =>
                onPatch({ grain: event.target.value as FlowDraft['grain'] })
              }
            >
              <option value="">자동 판정</option>
              {GRAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            분류
            <S.ItemSelect
              value={flow.categoryId}
              onChange={(event) => onPatch({ categoryId: event.target.value })}
            >
              <option value="">분류 없음</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parentName
                    ? `${category.parentName} › ${category.name}`
                    : category.name}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            HS 코드
            <S.Input
              value={flow.hsCode}
              placeholder="8542"
              onChange={(event) => onPatch({ hsCode: event.target.value })}
            />
          </S.Field>

          <T.DetailGroupLabel>수량·단가</T.DetailGroupLabel>
          <S.Field>
            수량
            <S.Input
              type="number"
              value={flow.quantity}
              onChange={(event) => onPatch({ quantity: event.target.value })}
            />
          </S.Field>
          <S.Field>
            수량 단위
            <S.Input
              value={flow.quantityUnit}
              placeholder="톤 · 배럴 · 척"
              onChange={(event) => onPatch({ quantityUnit: event.target.value })}
            />
          </S.Field>
          <S.Field>
            단가
            <S.Input
              type="number"
              value={flow.unitPrice}
              onChange={(event) => onPatch({ unitPrice: event.target.value })}
            />
          </S.Field>
          <S.Field>
            가격 기준
            <S.ItemSelect
              value={flow.priceBasis}
              onChange={(event) => onPatch({ priceBasis: event.target.value })}
            >
              <option value="">헤더 기준 따름</option>
              {PRICE_BASIS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            순위
            <S.Input
              type="number"
              value={flow.rankInDirection}
              placeholder="1"
              onChange={(event) =>
                onPatch({ rankInDirection: event.target.value })
              }
            />
          </S.Field>
          <S.Field>
            전년비 %
            <S.Input
              type="number"
              value={flow.yoyPct}
              onChange={(event) => onPatch({ yoyPct: event.target.value })}
            />
          </S.Field>

          <T.DetailGroupLabel>제도·제약</T.DetailGroupLabel>
          <S.Field>
            교역 형태
            <S.ItemSelect
              value={flow.channel}
              onChange={(event) => onPatch({ channel: event.target.value })}
            >
              <option value="">지정 안 함</option>
              {CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            제약
            <S.ItemSelect
              value={flow.restriction}
              onChange={(event) => onPatch({ restriction: event.target.value })}
            >
              <option value="">지정 안 함</option>
              {RESTRICTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            관세율 %
            <S.Input
              type="number"
              value={flow.tariffRatePct}
              onChange={(event) =>
                onPatch({ tariffRatePct: event.target.value })
              }
            />
          </S.Field>
          <T.InlineCheck>
            <input
              type="checkbox"
              checked={flow.isReExport}
              onChange={(event) => onPatch({ isReExport: event.target.checked })}
            />
            재수출·중계무역
          </T.InlineCheck>

          <T.DetailGroupLabel>경로</T.DetailGroupLabel>
          <S.Field>
            운송수단
            <S.ItemSelect
              value={flow.transportMode}
              onChange={(event) =>
                onPatch({ transportMode: event.target.value })
              }
            >
              <option value="">지정 안 함</option>
              {TRANSPORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </S.ItemSelect>
          </S.Field>
          <S.Field>
            교역로
            <S.Input
              value={flow.routeName}
              placeholder="실크로드 · 희망봉 항로"
              onChange={(event) => onPatch({ routeName: event.target.value })}
            />
          </S.Field>
          <S.Field>
            교역항·관문
            <S.Input
              value={flow.portName}
              placeholder="광저우 · 부산 왜관"
              onChange={(event) => onPatch({ portName: event.target.value })}
            />
          </S.Field>

          <T.DetailGroupLabel>왜 — 이 교역을 만든 것</T.DetailGroupLabel>
          <LinkField
            label="관련 사건"
            hint="아편전쟁"
            name={flow.relatedEventTitle}
            onPick={() => setPickerKind('event')}
            onClear={() => onPatch({ relatedEventId: '', relatedEventTitle: '' })}
          />
          <LinkField
            label="관련 조약"
            hint="강화도조약"
            name={flow.relatedTreatyName}
            onPick={() => setPickerKind('treaty')}
            onClear={() =>
              onPatch({ relatedTreatyId: '', relatedTreatyName: '' })
            }
          />
          <LinkField
            label="관련 기업"
            hint="동인도회사"
            name={flow.relatedCompanyName}
            onPick={() => setPickerKind('company')}
            onClear={() =>
              onPatch({ relatedCompanyId: '', relatedCompanyName: '' })
            }
          />

          <T.DetailGroupLabel>자료</T.DetailGroupLabel>
          <T.InlineCheck>
            <input
              type="checkbox"
              checked={flow.isEstimate}
              onChange={(event) => onPatch({ isEstimate: event.target.checked })}
            />
            추정치
          </T.InlineCheck>
          <S.Field>
            출처 단서
            <S.Input
              value={flow.sourceNote}
              placeholder="해관 통계 p.32"
              onChange={(event) => onPatch({ sourceNote: event.target.value })}
            />
          </S.Field>
          <S.Field style={{ gridColumn: '1 / -1' }}>
            메모
            <S.Input
              value={flow.notes}
              onChange={(event) => onPatch({ notes: event.target.value })}
            />
          </S.Field>
        </T.DetailGrid>
      )}

      <TradeLinkPicker
        kind={pickerKind}
        onClose={() => setPickerKind(null)}
        onSelect={(picked: TradeLinkSelection) => {
          if (pickerKind === 'event') {
            onPatch({ relatedEventId: picked.id, relatedEventTitle: picked.name })
          } else if (pickerKind === 'treaty') {
            onPatch({ relatedTreatyId: picked.id, relatedTreatyName: picked.name })
          } else if (pickerKind === 'company') {
            onPatch({
              relatedCompanyId: picked.id,
              relatedCompanyName: picked.name,
            })
          }
        }}
      />
    </T.FlowCard>
  )
}

interface LinkFieldProps {
  label: string
  hint: string
  name: string
  onPick: () => void
  onClear: () => void
}

/**
 * 연결 한 칸 — 고르기 전에는 버튼, 고른 뒤에는 이름 + 해제.
 * 자유 입력을 막는 이유: 이 칸의 값어치는 실제 엔티티로 이어지는 데 있다.
 */
function LinkField({ label, hint, name, onPick, onClear }: LinkFieldProps) {
  return (
    <S.Field>
      {label}
      {name ? (
        <T.LinkChip>
          <span title={name}>{name}</span>
          <button type="button" aria-label={`${label} 해제`} onClick={onClear}>
            ✕
          </button>
        </T.LinkChip>
      ) : (
        <S.GhostButton type="button" onClick={onPick}>
          + {hint} …
        </S.GhostButton>
      )}
    </S.Field>
  )
}
