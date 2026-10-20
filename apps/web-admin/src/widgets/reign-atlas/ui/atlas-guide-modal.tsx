/**
 * 수장 지도 안내 — 헤더 '?' 버튼으로 여는 설명 창.
 *
 * "이 지도는 어디서 데이터를 가져와 어떻게 그리는가"를 사용자 언어로 풀어 쓴다.
 * 색 견본은 지도와 같은 상수(TITLE_RANK_META)에서 가져와, 지도 색을 바꾸면 안내도 따라간다.
 */
import { useRef, type ReactNode } from 'react'

import styled from 'styled-components'

import { Modal, ModalBody } from '@/shared/ui/modal'

import { TITLE_RANK_META, TITLE_RANK_ORDER } from '../lib/title-rank'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** '데이터 점검' 창으로 바로 넘어가기 */
  onOpenAudit: () => void
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </Section>
  )
}

export function AtlasGuideModal({ isOpen, onClose, onOpenAudit }: Props) {
  // 읽는 창이라 첫 포커스는 본문 첫머리 — 기본값(닫기 다음 첫 버튼)은 맨 아래
  // '데이터 점검 열기'라 열자마자 끝까지 스크롤됐다
  const leadRef = useRef<HTMLParagraphElement>(null)
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      initialFocusRef={leadRef}
      size="wide"
      title="수장 지도 안내"
      subtitle="이 지도는 저장된 그림이 아니라, 등록된 기록을 연도마다 다시 계산해 그립니다"
    >
      <ModalBody>
        <Lead ref={leadRef} tabIndex={-1}>
          한 해를 고르면 그해 각국을 다스린 군주·대통령·총리를 지도 위에 놓고,
          사건과 조약 기록에서 <War>교전</War>과 <Ally>동맹</Ally> 관계를 찾아
          선으로 잇습니다. 지도 화면 자체에는 데이터가 없습니다 —
          국가·인물·사건·조약 기록을 고치면 지도가 그대로 따라 바뀝니다.
        </Lead>

        <Flow aria-label="데이터 흐름">
          <FlowStep>
            <b>기록</b>
            <span>국가 · 재위/재임 · 사건 · 조약</span>
          </FlowStep>
          <FlowArrow aria-hidden>→</FlowArrow>
          <FlowStep>
            <b>연도로 거르기</b>
            <span>그해에 해당하는 것만</span>
          </FlowStep>
          <FlowArrow aria-hidden>→</FlowArrow>
          <FlowStep>
            <b>지도·표·헤드라인</b>
            <span>핀 · 선 · 브리핑</span>
          </FlowStep>
        </Flow>

        <Grid>
          <Block title="📍 핀 — 어느 나라에, 누가">
            <List>
              <li>
                <b>위치</b>는 역사국가에 입력된 위도·경도입니다. 그해에 존속한
                나라만 나옵니다 (예: 프로이센 왕국 1701~1918).
              </li>
              <li>
                <b>이름</b>은 그해에 재위·재임 중인 군주·대통령·총리입니다.
                'N년차'는 즉위한 해를 1년차로 셉니다. 그해 즉위했으면{' '}
                <NewTag>즉위</NewTag> 표시가 붙습니다.
              </li>
              <li>
                현대국가(예: 영국)에만 연결된 기록은 그해 존속하던, 그
                현대국가와 연결된 역사국가 핀에 올라갑니다.
              </li>
              <li>
                멀리서 보면 이름표만, 확대하면 나라·이름·연차가 든 카드로
                바뀝니다.
              </li>
            </List>
          </Block>

          <Block title="⚔ 선 — 누가 누구와 싸우고 손잡았나">
            <LineLegend>
              <span>
                <WarSwatch aria-hidden /> 교전
              </span>
              <span>
                <AllySwatch aria-hidden /> 동맹
              </span>
            </LineLegend>
            <List>
              <li>
                그해에 진행 중인 사건에서 <b>서로 다른 진영</b>의 나라끼리
                교전선, <b>같은 진영</b>끼리 동맹선을 긋습니다.
              </li>
              <li>
                진영이 비어 있으면, 유형이 전쟁·전투·봉기인 사건에 한해
                주도국·동맹국 ↔ 대상국·적대국·피해국 역할로 교전선을 긋습니다.
              </li>
              <li>
                나라별 <b>가담·이탈 시점</b>을 반영합니다 (예: 1차대전의
                이탈리아는 1915년부터).
              </li>
              <li>
                종류가 '동맹'인 조약은 서명일부터 만료·파기일까지 서명국끼리
                동맹선을 긋습니다.
              </li>
              <li>
                선 위에 마우스를 올리면 근거 사건이, 누르면 그 사건 요약이
                열립니다.
              </li>
            </List>
          </Block>

          <Block title="👑 칭호 — 황제·술탄·국왕·공">
            <List>
              <li>
                나라에 입력된 <b>국가 유형</b>으로 정합니다 (제국 → 황제, 왕국 →
                국왕, 공국·막부 → 공…). 핀 테두리 색이 칭호 색입니다.
              </li>
            </List>
            <RankLegend>
              {TITLE_RANK_ORDER.map((rank) => (
                <RankChip key={rank}>
                  <i
                    style={{ background: TITLE_RANK_META[rank].color }}
                    aria-hidden
                  />
                  {TITLE_RANK_META[rank].label}
                </RankChip>
              ))}
            </RankLegend>
            <Note>
              칭호 탭을 고르면 지도에서는 다른 나라가 흐려지고, 표에서는
              걸러집니다.
            </Note>
          </Block>

          <Block title="📰 시대 헤드라인 — 그해의 제목">
            <List>
              <li>
                그해에 걸친 <b>최상위 사건</b> 중 하나를 고릅니다. 전선을 긋는
                사건 → 전쟁 분류 → 여러 해에 걸친 사건 → 참여국이 많은 사건
                순으로 우선합니다.
              </li>
              <li>하위 사건(개별 전투 등)은 제목 후보에서 뺍니다.</li>
              <li>같은 해의 다른 큰 사건은 아래 칩으로 붙습니다.</li>
            </List>
          </Block>

          <Block title="🎛 조작">
            <List>
              <li>
                <b>연도</b>: 슬라이더·◀▶(1·5·10년 걸음)·재생. 아래 칩은 지도에
                전선을 긋는 전쟁의 시작 연도입니다.
              </li>
              <li>
                <b>나라 선택</b>: 핀이나 표의 행을 누르면 그 나라와 교전·동맹
                상대가 한 화면에 들어오고, 우측에 브리핑이 뜹니다.
              </li>
              <li>
                <b>공유</b>: 주소에 연도·선택 나라가 실려 그대로 링크로 보낼 수
                있습니다.
              </li>
              <li>
                <b>연표로 보기</b>: 같은 연도로 '역대 수장 비교' 연표를 엽니다.
              </li>
            </List>
          </Block>

          <Block title="🩺 선·핀이 안 보일 때">
            <List>
              <li>
                전쟁 사건에 참여국이 둘 이상이고 진영(또는 주도국·대상국)이
                있어야 선이 생깁니다.
              </li>
              <li>
                재위·재임 기록이 국가에 연결돼 있고, 그 나라에 좌표가 있어야
                핀이 생깁니다.
              </li>
              <li>
                원인은 <b>데이터 점검</b>이 모아 보여줍니다. 항목마다 고칠
                곳으로 바로 갈 수 있습니다.
              </li>
              <li>
                다른 화면에서 기록을 고쳤다면 <b>새로고침</b>하세요 (지도
                데이터는 5분간 다시 받지 않습니다).
              </li>
            </List>
            <AuditLink
              type="button"
              onClick={() => {
                onClose()
                onOpenAudit()
              }}
            >
              데이터 점검 열기 →
            </AuditLink>
          </Block>
        </Grid>
      </ModalBody>
    </Modal>
  )
}

const Lead = styled.p`
  margin: 0 0 14px;
  outline: none;
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const War = styled.strong`
  color: #dc2626;
`

const Ally = styled.strong`
  color: #2563eb;
`

const Flow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 18px;
  @media (max-width: 640px) {
    flex-direction: column;
  }
`

const FlowStep = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  b {
    font-size: 13px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  span {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const FlowArrow = styled.span`
  align-self: center;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  @media (max-width: 640px) {
    transform: rotate(90deg);
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 22px;
  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Section = styled.section`
  min-width: 0;
`

const SectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 12.5px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  li + li {
    margin-top: 3px;
  }
  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NewTag = styled.span`
  padding: 0 5px;
  border-radius: 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
`

const LineLegend = styled.div`
  display: flex;
  gap: 14px;
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
`

/* 지도 선과 같은 점선 문법 — 교전 9·6 굵게, 동맹 3·6 얇게 */
const WarSwatch = styled.span`
  display: inline-block;
  width: 34px;
  border-top: 3px dashed #ef4444;
`

const AllySwatch = styled.span`
  display: inline-block;
  width: 34px;
  border-top: 2px dotted #3b82f6;
`

const RankLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin: 8px 0 4px;
`

const RankChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
`

const Note = styled.p`
  margin: 4px 0 0;
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AuditLink = styled.button`
  margin-top: 8px;
  padding: 5px 11px;
  border-radius: 7px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.activeLight};
  }
`
