/**
 * 사건 종류 안내 — 상세 머리의 '단일 사건 ?' / '최상위 사건 ?' 버튼으로 여는 설명 창.
 *
 * "최상위 사건은 어떻게 만드나"를 화면 여기저기 흩어진 버튼(전개 머리·연관 탭)을 찾아다니지
 * 않고 한 곳에서 알 수 있게 한다. 지금 이 사건의 종류에 맞춰 할 일을 단계로 보여 주고,
 * 그 자리에서 바로 실행하는 버튼을 단다 — 읽고 나서 다시 버튼을 찾으러 가지 않게.
 */
import { useRef, type ReactNode } from 'react'

import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentHover,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { Modal, ModalBody, ModalFooter } from '@/shared/ui/modal'

import { type EventDetail } from '../use-event-detail'
import { sectionKindOf } from './narrative-sections.lib'

interface EventKindGuideModalProps {
  event: EventDetail
  isOpen: boolean
  onClose: () => void
  /** 단일 → 묶음: '하위 사건으로 나누기' 창을 연다 */
  onSplit: () => void
  /** 묶음: 개요 탭의 전개(하위 사건) 자리로 간다 */
  onGoToDevelopment: () => void
  /** 묶음 → 단일(하위가 0일 때만) */
  onBecomeSingle: () => void
  /** 연관 탭(상위 해제)으로 간다 */
  onGoToLinks: () => void
}

export function EventKindGuideModal({
  event,
  isOpen,
  onClose,
  onSplit,
  onGoToDevelopment,
  onBecomeSingle,
  onGoToLinks,
}: EventKindGuideModalProps) {
  // 읽는 창이라 첫 포커스는 본문 첫머리 — 기본값이면 맨 아래 실행 버튼으로 가 끝까지 스크롤된다
  const leadRef = useRef<HTMLParagraphElement>(null)
  const isCollection = event.kind === 'COLLECTION'
  const parentTitle = event.parentEvent?.title ?? null
  const childCount = (event.childEvents?.length ?? 0) + (event.extraChildren?.length ?? 0)
  const developmentCount = (event.eventSections ?? []).filter(
    (section) => sectionKindOf(section.sectionType) === 'narrative',
  ).length
  const currentLabel = isCollection ? (parentTitle ? '묶음 사건' : '최상위 사건') : '단일 사건'

  const run = (action: () => void) => {
    onClose()
    action()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      initialFocusRef={leadRef}
      size="wide"
      title="사건 종류 안내"
      subtitle={`지금 이 사건은 '${currentLabel}'입니다`}
    >
      <ModalBody>
        <Lead ref={leadRef} tabIndex={-1}>
          사건은 두 종류입니다. 한 덩어리로 서술하는 <b>단일 사건</b>과, 여러 국면(하위 사건)을
          거느리는 <b>묶음 사건</b>. 상위가 없는 묶음 사건이 목록에서 <b>최상위 사건</b>으로
          표시됩니다.
        </Lead>

        <Compare>
          <KindCard $current={!isCollection}>
            <KindName>
              단일 사건 {!isCollection && <Now>지금</Now>}
            </KindName>
            <KindExample>예: 전투 · 회담 · 조약 체결 · 선언</KindExample>
            <List>
              <li>배경 · 전개 · 여파를 글로 씁니다</li>
              <li>하위 사건을 둘 수 없습니다</li>
            </List>
          </KindCard>
          <KindCard $current={isCollection}>
            <KindName>
              묶음 사건 {isCollection && <Now>지금</Now>}
            </KindName>
            <KindExample>예: 전쟁 · 위기 · 개혁 · 운동</KindExample>
            <List>
              <li>
                <b>전개 = 하위 사건</b>들 — 글 대신 국면을 하위 사건으로 등록합니다
              </li>
              <li>본문에는 배경과 여파만 씁니다</li>
              <li>상위가 없으면 &lsquo;최상위 사건&rsquo;</li>
            </List>
          </KindCard>
        </Compare>

        {isCollection ? (
          <Block title="하위 사건 채우기">
            <Steps>
              <li>
                <b>개요</b> 탭의 <b>전개</b>로 갑니다 — 하위 사건이 날짜 순으로 놓이는 자리입니다.
              </li>
              <li>
                새로 만들려면 <b>[하위 사건 추가]</b>, 이미 등록된 사건을 붙이려면{' '}
                <b>[기존 사건 모으기]</b>.
              </li>
              <li>
                <b>조망</b> 탭에서 하위 사건 전부의 간트·참여국·빈 구간을 한눈에 봅니다.
              </li>
            </Steps>
            {childCount === 0 ? (
              <Note>
                아직 하위 사건이 없습니다. 하위 없이 한 덩어리로 쓸 사건이라면 단일 사건으로 되돌릴 수
                있습니다(하위가 하나라도 있으면 되돌릴 수 없습니다).
              </Note>
            ) : (
              <Note>하위 사건 {childCount}건이 있습니다.</Note>
            )}
          </Block>
        ) : (
          <Block title="이 사건을 최상위 사건으로 만들기">
            <Steps>
              <li>
                아래 <b>[지금 최상위 사건으로 만들기]</b>를 누릅니다.
              </li>
              {developmentCount > 0 ? (
                <li>
                  지금 쓴 <b>전개 단락 {developmentCount}개</b>가 나옵니다. 단락마다{' '}
                  <b>하위 사건 · 배경 · 여파 · 버리기</b> 중 하나를 고릅니다 — &lsquo;하위
                  사건&rsquo;을 고르면 그 단락 글이 새 하위 사건의 본문이 됩니다.
                </li>
              ) : (
                <li>전개 단락이 없어 바로 바뀝니다.</li>
              )}
              <li>
                바뀐 뒤 <b>개요 → 전개 → [하위 사건 추가]</b>로 국면을 하나씩 등록합니다.
              </li>
            </Steps>
            {parentTitle && (
              <Note>
                이 사건은 &lsquo;{parentTitle}&rsquo;의 하위라서, 묶음이 되어도 최상위가 아니라 그
                아래의 중간 묶음이 됩니다. 최상위로 올리려면 연관 탭에서 상위를 해제하세요.
              </Note>
            )}
          </Block>
        )}
      </ModalBody>
      <ModalFooter>
        <Button type="button" onClick={onClose}>
          닫기
        </Button>
        {isCollection ? (
          <>
            {childCount === 0 && (
              <Button type="button" onClick={() => run(onBecomeSingle)}>
                단일 사건으로 되돌리기
              </Button>
            )}
            <Button type="button" $primary onClick={() => run(onGoToDevelopment)}>
              하위 사건 추가하러 가기
            </Button>
          </>
        ) : (
          <>
            {parentTitle && (
              <Button type="button" onClick={() => run(onGoToLinks)}>
                상위 해제하러 가기
              </Button>
            )}
            <Button type="button" $primary onClick={() => run(onSplit)}>
              {parentTitle ? '지금 묶음 사건으로 만들기' : '지금 최상위 사건으로 만들기'}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </Section>
  )
}

const Lead = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};

  &:focus {
    outline: none;
  }
  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Compare = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
`

const KindCard = styled.div<{ $current: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $current }) => ($current ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  background: ${({ theme, $current }) => ($current ? ledgerAccentSubtle(theme.mode) : 'transparent')};
`

const KindName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Now = styled.span`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
`

const KindExample = styled.div`
  font-size: 12px;
  color: ${metaText};
`

const List = styled.ul`
  margin: 2px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Steps = styled.ol`
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Note = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: ${metaText};
`

const Button = styled.button<{ $primary?: boolean }>`
  padding: 7px 16px;
  border-radius: ${RADIUS.SM};
  border: 1px solid
    ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  background: ${({ theme, $primary }) => ($primary ? ledgerAccent(theme.mode) : 'transparent')};
  /* 다크의 강조색은 밝은 인디고라 흰 글자가 안 읽힌다 — 면이 밝으면 글자를 어둡게 */
  color: ${({ theme, $primary }) =>
    $primary ? (theme.mode === 'dark' ? '#111827' : '#fff') : theme.colors.text.primary};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:not(:disabled):hover {
    background: ${({ theme, $primary }) => ($primary ? ledgerAccentHover(theme.mode) : 'transparent')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`
