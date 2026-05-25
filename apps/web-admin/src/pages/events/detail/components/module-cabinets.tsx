import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { MODULE_COLOR } from './module-colors'

interface ModuleCabinetsProps {
  event: EventDetail
}

const ROLE_LABEL: Record<string, string> = {
  ORIGIN: '발단',
  PARTY: '당사자',
  MEDIATOR: '중재',
  AFFECTED: '영향받음',
}

/**
 * 관련 행정부 — read-only 표.
 *
 * 응답의 `cabinet` 필드가 `any`라 다음 형태를 가정:
 *   { id, name?, headTenure?: { person?, country?, historicalCountry? } }
 * 알려진 키만 추출, 그 외는 무시.
 *
 * 편집(추가/제거/role 변경)은 별도 cabinet-events API가 필요해 이번 사이클에서는 read-only.
 */
export function ModuleCabinets({ event }: ModuleCabinetsProps) {
  const entries = event.cabinetEvents ?? []
  if (entries.length === 0) return null

  return (
    <S.Section id="module-cabinets">
      <S.SectionHeader>
        <S.SectionTitle>
          <S.SectionTitleDot $color={MODULE_COLOR.cabinets} />
          관련 행정부
        </S.SectionTitle>
        <S.SectionSubtitle>{entries.length}건</S.SectionSubtitle>
      </S.SectionHeader>

      <Table>
        {entries.map((entry) => {
          const cabinet = (entry.cabinet ?? {}) as Record<string, unknown>
          const headTenure = cabinet.headTenure as
            | {
                person?: { name?: string } | null
                country?: { id?: string; name?: string } | null
                historicalCountry?: { id?: string; name?: string } | null
              }
            | undefined

          const cabinetName =
            typeof cabinet.name === 'string' && cabinet.name.trim()
              ? cabinet.name
              : null

          const personName = headTenure?.person?.name ?? null
          const countryName =
            headTenure?.country?.name ?? headTenure?.historicalCountry?.name ?? null
          const countryId = headTenure?.country?.id ?? null

          const labelParts = [countryName, cabinetName, personName].filter(Boolean)
          const label = labelParts.join(' · ') || (cabinet.id as string)

          return (
            <Row key={entry.id}>
              <Main>
                {countryId ? (
                  <Link to={pathKeys.countryDetail(countryId)}>{label}</Link>
                ) : (
                  <span>{label}</span>
                )}
                {entry.note && <Note>{entry.note}</Note>}
              </Main>
              {entry.role && <S.Tag>{ROLE_LABEL[entry.role] ?? entry.role}</S.Tag>}
            </Row>
          )
        })}
      </Table>
    </S.Section>
  )
}

const Table = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;

  a,
  span {
    font-size: 14px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: none;
  }

  a:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`

const Note = styled.span`
  font-size: 12.5px !important;
  font-weight: 400 !important;
  color: ${({ theme }) => theme.colors.text.secondary} !important;
  line-height: 1.5;
`
