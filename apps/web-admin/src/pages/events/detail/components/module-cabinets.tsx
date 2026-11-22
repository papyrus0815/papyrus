import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerHairline,
} from '@/entities/event/ui/ledger-tokens'
import { pathKeys } from '@/shared/router'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { SectionHintText } from './actors/actors.styles'

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
      <S.SectionHeaderGroup>
        <S.SectionHeader>
          <S.SectionTitle $sub>관련 행정부</S.SectionTitle>
          <S.SectionSubtitle>{entries.length}곳</S.SectionSubtitle>
        </S.SectionHeader>
        <SectionHintText>
          이 사건 당시 재임하며 사건을 다룬 각국 행정부(내각)입니다. 내각 이름을 누르면 해당 국가 상세로 이동합니다.
        </SectionHintText>
      </S.SectionHeaderGroup>

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
          const label = labelParts.join(' · ') || '내각 정보 미상'

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

  @container eventdetail (min-width: 1240px) {
    &:has(> div:nth-child(2)) {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 36px;
      align-items: start;
    }
  }
`

const Row = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
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
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const Note = styled.span`
  font-size: 12.5px !important;
  font-weight: 400 !important;
  color: ${({ theme }) => theme.colors.text.secondary} !important;
  line-height: 1.5;
`
