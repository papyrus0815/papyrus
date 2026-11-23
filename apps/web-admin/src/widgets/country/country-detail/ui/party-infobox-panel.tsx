/**
 * 정당 상세 — 인포박스(정보 상자). 섹션들과 같은 조회 키로 같은 캐시를 읽어 저장된 기록에서 만든다.
 * 줄의 구성은 widgets/political-party/party-infobox.ts(순수 함수) — 여기는 그리기만.
 */
import React, { useMemo } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { listSubjectObservations } from '@/shared/api/evidence'
import { politicalPartyApi } from '@/shared/api/political-party'
import { getUploadImageUrl } from '@/shared/api/upload'
import { pathKeys } from '@/shared/router'
import { buildPartyInfobox, type PartyInfoboxInput } from '@/widgets/political-party/party-infobox'
import { partyKeys } from '@/widgets/political-party/party-query-keys'

export function PartyInfoboxPanel({
  partyId,
  routeCountryId,
  party,
}: {
  partyId: string
  routeCountryId: string
  party: PartyInfoboxInput['party']
}) {
  const navigate = useNavigate()
  const aliases = useQuery({ queryKey: partyKeys.aliases(partyId), queryFn: () => politicalPartyApi.getAliases(partyId) })
  const legalStatuses = useQuery({
    queryKey: partyKeys.legalStatuses(partyId),
    queryFn: () => politicalPartyApi.getLegalStatuses(partyId),
  })
  const ideologies = useQuery({ queryKey: partyKeys.ideologies(partyId), queryFn: () => politicalPartyApi.getIdeologies(partyId) })
  const positionPeriods = useQuery({
    queryKey: partyKeys.positionPeriods(partyId),
    queryFn: () => politicalPartyApi.getPositionPeriods(partyId),
  })
  const organizations = useQuery({
    queryKey: partyKeys.organizations(partyId),
    queryFn: () => politicalPartyApi.getOrganizations(partyId),
  })
  const memberships = useQuery({ queryKey: partyKeys.memberships(partyId), queryFn: () => politicalPartyApi.getMemberships(partyId) })
  const symbols = useQuery({ queryKey: partyKeys.symbols(partyId), queryFn: () => politicalPartyApi.getSymbols(partyId) })
  const expressions = useQuery({ queryKey: partyKeys.expressions(partyId), queryFn: () => politicalPartyApi.getExpressions(partyId) })
  const headquarters = useQuery({ queryKey: partyKeys.headquarters(partyId), queryFn: () => politicalPartyApi.getHeadquarters(partyId) })
  const links = useQuery({ queryKey: partyKeys.links(partyId), queryFn: () => politicalPartyApi.getLinks(partyId) })
  const lineage = useQuery({ queryKey: partyKeys.lineage(partyId), queryFn: () => politicalPartyApi.getLineage(partyId) })
  const observations = useQuery({
    queryKey: partyKeys.observations(partyId),
    queryFn: () => listSubjectObservations('POLITICAL_PARTY', partyId),
  })

  const infobox = useMemo(
    () =>
      buildPartyInfobox({
        party,
        aliases: aliases.data ?? [],
        legalStatuses: legalStatuses.data ?? [],
        ideologies: ideologies.data ?? [],
        positionPeriods: positionPeriods.data ?? [],
        organizations: organizations.data ?? [],
        memberships: memberships.data ?? [],
        symbols: symbols.data ?? [],
        expressions: expressions.data ?? [],
        headquarters: headquarters.data ?? [],
        links: links.data ?? [],
        lineage: lineage.data ?? null,
        observations: observations.data ?? [],
      }),
    [
      party,
      aliases.data,
      legalStatuses.data,
      ideologies.data,
      positionPeriods.data,
      organizations.data,
      memberships.data,
      symbols.data,
      expressions.data,
      headquarters.data,
      links.data,
      lineage.data,
      observations.data,
    ],
  )

  return (
    <InfoboxRoot aria-label={`${infobox.title} 정보 상자`}>
      {infobox.palette.length > 0 ? (
        <PaletteBar aria-hidden>
          {infobox.palette.map((color, index) => (
            <span key={`${color}-${index}`} style={{ background: color }} />
          ))}
        </PaletteBar>
      ) : null}
      <InfoboxHead>
        <h3>{infobox.title}</h3>
        {infobox.subtitles.map((subtitle) => (
          <p key={subtitle}>{subtitle}</p>
        ))}
      </InfoboxHead>
      {infobox.images.length > 0 ? (
        <ImageRow $count={infobox.images.length}>
          {infobox.images.map((image) => (
            <figure key={image.key}>
              <img src={getUploadImageUrl(image.url)} alt={image.caption || ''} />
              {image.caption ? <figcaption>{image.caption}</figcaption> : null}
            </figure>
          ))}
        </ImageRow>
      ) : null}
      <InfoboxList>
        {infobox.rows.map((row) => (
          <div key={row.key} className="row">
            <dt>{row.label}</dt>
            <dd>
              <ul className={row.inline ? 'inline' : undefined}>
                {row.items.map((item, index) => (
                  <li key={`${row.key}-${index}`}>
                    {item.partyId ? (
                      <LinkBtn
                        type="button"
                        onClick={() => navigate(pathKeys.countryElectionPartyDetail(routeCountryId, item.partyId!))}
                      >
                        {item.text}
                      </LinkBtn>
                    ) : item.personId ? (
                      <LinkBtn type="button" onClick={() => navigate(pathKeys.personsTimelineDetail(item.personId!))}>
                        {item.text}
                      </LinkBtn>
                    ) : (
                      <span className="text">{item.text}</span>
                    )}
                    {item.sub ? <span className="sub">{item.sub}</span> : null}
                    {item.when ? <span className="when">{item.when}</span> : null}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </InfoboxList>
      {infobox.rows.length === 0 ? <EmptyLine>아래 섹션에 기록을 넣으면 정보 상자가 채워집니다.</EmptyLine> : null}
    </InfoboxRoot>
  )
}

const InfoboxRoot = styled.aside`
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 14px;
  overflow: hidden;
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : theme.colors.background.primary)};
`

const PaletteBar = styled.div`
  display: flex;
  height: 6px;

  span {
    flex: 1;
  }
`

const InfoboxHead = styled.div`
  padding: 14px 16px 10px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.35;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  p {
    margin: 3px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const ImageRow = styled.div<{ $count: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $count }) => Math.min($count, 2)}, minmax(0, 1fr));
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  img {
    max-width: 100%;
    max-height: 96px;
    object-fit: contain;
  }
  figcaption {
    font-size: 11.5px;
    text-align: center;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const InfoboxList = styled.dl`
  margin: 0;
  padding: 4px 0;

  .row {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    padding: 7px 16px;
  }
  .row + .row {
    border-top: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)')};
  }
  dt {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  dd {
    margin: 0;
    min-width: 0;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  ul.inline {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0;
  }
  /* 쉼표는 앞 낱말 끝에 붙인다 — 줄이 바뀌어도 새 줄이 쉼표로 시작하지 않게 */
  ul.inline li:not(:last-child)::after {
    content: ',';
    margin-right: 0.3em;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  li {
    font-size: 13px;
    line-height: 1.55;
    overflow-wrap: anywhere;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .sub,
  .when {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .sub::before {
    content: ' · ';
  }
  .when::before {
    content: ' ';
  }
  .when {
    font-variant-numeric: tabular-nums;
  }
`

const LinkBtn = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }
`

const EmptyLine = styled.p`
  margin: 0;
  padding: 10px 16px 14px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
