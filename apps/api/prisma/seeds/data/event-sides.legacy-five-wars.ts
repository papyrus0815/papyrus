/**
 * 5개 전쟁 사건의 진영 데이터 — 옛 BelligerentSide·CountryInSide·CasualtiesData에서 이관한 정본.
 *
 * ⚠️ 이 파일은 이관 시점 DB 덤프에서 생성됐고, 수치(측정값)만 사람이 원문을 읽고 옮겼다.
 *    정규식으로 숫자를 긁지 않았다 — '약 14만 (전사·전상사, 질병 사망 별도)'의 정의·범위·단서를
 *    지표(combat_deaths)·qualifier로 나눠 담았고, 원문 문장은 각 측정값 인용의 quote에 그대로 있다.
 *    정의를 알 수 없는 '사망'은 military.deaths_unspecified로 둔다(전사로 단정하지 않는다).
 *    단일국 진영의 소속국 병력처럼 진영 값과 같은 숫자는 소속국에 다시 넣지 않았다(이중 계상 방지).
 *    지휘관 문장은 인물 연결(D6) 전까지 진영 설명·참여국 비고에 '…(인물 연결 대기)'로 남겼다.
 *
 * 출처는 기록되지 않았던 데이터라 SourceKind.LEGACY_UNVERIFIED로 명시한다.
 * 적용: applyEventSides(prisma, eventId, LEGACY_FIVE_WAR_SIDES[title], LEGACY_FIVE_WAR_SOURCE)
 */
import { SourceKind } from '@prisma/client'

import type { SideSeed, SourceSeed } from '../lib/event-sides'

export const LEGACY_FIVE_WAR_SOURCE: SourceSeed = {
  kind: SourceKind.LEGACY_UNVERIFIED,
  title: '사건 시드 군사 데이터 (출처 미기재 · 진영 모델 이관)',
  note: '1차 아편전쟁·보오전쟁·보불전쟁·크림 전쟁·플라시 전투 시드가 출처 없이 넣은 병력·사상자 문장. 검증된 출처로 교체 대상.',
}

export const LEGACY_FIVE_WAR_SIDES: Record<string, SideSeed[]> = {
  '플라시 전투': [
    {
      name: '영국 동인도회사 측',
      level: 'COALITION',
      color: '#1d4ed8',
      description:
        'EIC의 캘커타 주재 부대를 핵심으로 한 소규모 원정군. 마드라스에서 1757-01-02 출발한 클라이브 부대가 캘커타 탈환(1757-01) → 알리나가르 조약(2-09) → 찬다나가르 함락(3-23)을 거쳐 6월 22일 플라시 인근 망고 숲에 도착. 군사적 우위는 (1)상비 정규군의 훈련도·기율 (2)영국제 머스킷 소총·야포의 화력·정확도 (3)방수 처리된 화약(우천 시에도 사격 가능) (4)사전 매수된 벵골 측 사령관 미르 자파르의 미동(내응)이었다. 실제 군사적 충돌은 약 8시간(오전 8시~오후 5시)에 그쳤고, 영국 측 사상자는 65명에 불과했다.\n\n지휘관(인물 연결 대기): 로버트 클라이브(EIC 군 사령관·중령) / 에어 쿠트(부지휘관) / 미르 자파르(벵골 측 내응자, 명목 지휘관) / 본국 정치 결정: 윌리엄 피트(원로원 수석대신)',
      members: [
        {
          historicalCountry: '그레이트브리튼 왕국',
          participation: 'LIMITED',
          join: {
            era: 'AD',
            year: 1757,
            month: 6,
            day: 23,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '1707년 잉글랜드·스코틀랜드 합방으로 출범한 그레이트브리튼 왕국 시기. 7년 전쟁(1756~1763)이 진행 중이던 시점, 인도 전구의 대 프랑스 견제와 EIC의 벵골 권익 보호가 본국의 명시적 정책이었다. 윌리엄 피트가 인도·북미 전구를 동시에 강조하는 글로벌 전략을 추진, EIC에 대한 본국 지원이 강화된 시기.',
          noteAppend:
            '진영 내 역할(이관): 주도국 / 본국 정치 결정 주체\n지휘관(인물 연결 대기): 윌리엄 피트(본국) / 로버트 클라이브(현지)',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '800',
              approx: true,
              qualifier: '영국 정규군만(EIC 함대·해상 보급 별도)',
              quote: '영국 정규군 약 800명 + EIC 함대·해상 보급',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '3000',
          approx: true,
          qualifier: '영국 정규군 800 + 인도 세포이 2,200',
          quote:
            '약 3,000명 — 영국 정규군 800명(39연대 등) + 인도 세포이 2,200명, 야포 10문(6파운드 8문 + 호위포 2문)',
        },
        {
          metricKey: 'military.artillery',
          value: '10',
          quote:
            '약 3,000명 — 영국 정규군 800명(39연대 등) + 인도 세포이 2,200명, 야포 10문(6파운드 8문 + 호위포 2문)',
        },
        {
          metricKey: 'military.killed_in_action',
          value: '22',
          approx: true,
          quote: '전사 약 22명',
        },
        {
          metricKey: 'military.wounded',
          value: '50',
          approx: true,
          quote: '전상 약 50명',
        },
        {
          metricKey: 'military.casualties_total',
          value: '72',
          approx: true,
          qualifier: '전사+전상, 영국 측 정규군·세포이 합산',
          quote: '전사·전상 약 72명 (영국 측 정규군·세포이 합산)',
        },
      ],
    },
    {
      name: '벵골 나와브 측',
      level: 'COUNTRY',
      color: '#b91c1c',
      description:
        '23세의 신임 벵골 나와브 시라지 웃 다울라가 1757년 6월 동원한 벵골군. 명목 병력은 약 5만으로 EIC군의 약 17배에 달했으나, 실질 전투 가능 부대는 미르 마단·모한 랄 휘하 약 1.2만에 불과했다. 나머지 주력(미르 자파르·라이 두를라브·야르 라티프 휘하 약 3.8만)은 사전에 EIC와 비밀 협약을 체결한 상태로, 전투 중 일체 움직이지 않는다는 합의를 이행했다. 시라지의 폭정(즉위 직후 일족 숙청·자가트 세트 등 대상인 모욕)에 대한 벵골 귀족·상인층의 깊은 반감, 무굴 제국 중앙의 약화로 외부 견제 부재, 시라지 본인의 군사적 무경험 (즉위 14개월의 청년 군주)이 결합된 구조적 취약성이 결정적 패인.\n\n지휘관(인물 연결 대기): 시라지 웃 다울라(벵골 나와브, 명목 총사령관) / 미르 마단(친 시라지 사령관, 전사) / 모한 랄(친 시라지) / 미르 자파르·라이 두를라브·야르 라티프(EIC에 매수된 사령관들) / 생프레(Sinfray, 프랑스 포병 50명 지휘)\n수치화하지 않은 피해 기록: 부상 — 미상 (사료 미비)',
      members: [
        {
          historicalCountry: '무굴 제국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1757,
            month: 6,
            day: 23,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '1707년 아우랑제브 사후 무굴 제국 중앙 권력은 사실상 약화되어 벵골 나와브가 자치권을 행사하는 상태였다. 시라지 웃 다울라는 1756-04 즉위 직후 EIC의 무단 캘커타 요새 강화에 격분해 6-20 캘커타 공격 → 블랙 홀 사건. 플라시 전투 패배 후 시라지 폐위·살해, 미르 자파르가 EIC 괴뢰 나와브로 즉위. 1764 부크사르 전투에서 무굴 황제 샤 알람 2세까지 패배 → 1765 알라하바드 조약으로 벵골·비하르·오리사 디와니가 EIC에 부여되며 무굴의 인도 동부 종주권이 사실상 종결.',
          noteAppend:
            '진영 내 역할(이관): 주(主) 적국 / 영토 침해 피해국 (명목상 종주국)\n지휘관(인물 연결 대기): 시라지 웃 다울라 (벵골 나와브, 무굴 제국 명목 신하)',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '50000',
              approx: true,
              qualifier: '벵골 나와브 직속군. 프랑스 포병 50명 별도',
              quote:
                '벵골 나와브 직속군 약 5만 + 프랑스 포병 50명 (생프레 지휘)',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '50000',
          approx: true,
          qualifier: '보병 35,000 + 기병 15,000(명목 병력)',
          quote:
            '약 5만 — 보병 35,000명 + 기병 15,000명 + 대포 53문(인도 토속 + 프랑스 포병 50명 운용 분 포함)',
        },
        {
          metricKey: 'military.artillery',
          value: '53',
          quote:
            '약 5만 — 보병 35,000명 + 기병 15,000명 + 대포 53문(인도 토속 + 프랑스 포병 50명 운용 분 포함)',
        },
        {
          metricKey: 'military.killed_in_action',
          value: '500',
          approx: true,
          qualifier: '포격·사격에 의한 직접 사상 + 미르 마단 전사',
          quote:
            '전사 약 500명 (포격·사격에 의한 직접 사상자 + 미르 마단 전사)',
        },
        {
          metricKey: 'military.casualties_total',
          value: '500',
          approx: true,
          qualifier: '전사+전상, 영국 측 보고. 패주 후 추격 사상자 별도',
          quote:
            '전사·전상 약 500명 (영국 측 보고). 패주 후 추격 사상자 별도 추정',
        },
      ],
    },
  ],
  보오전쟁: [
    {
      name: '프로이센 측',
      level: 'COALITION',
      color: '#1d4ed8',
      description:
        '프로이센 왕국이 주도한 진영. 비스마르크의 외교로 이탈리아 왕국과 1866년 4월 동맹을 맺어 남부 전선을 분산시켰고, 북독일 일부 소국이 가세하였다.\n\n지휘관(인물 연결 대기): 빌헬름 1세 (총사령관, 프로이센 국왕) / 헬무트 폰 몰트케 (참모총장)',
      members: [
        {
          historicalCountry: '프로이센 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '독일연방 내 패권을 차지하기 위해 1866년 6월 14일 가슈타인 협약 위반을 명분으로 동원령을 발효, 작센과 하노버를 즉시 점령하며 개전.',
          noteAppend:
            '진영 내 역할(이관): 주도국\n지휘관(인물 연결 대기): 빌헬름 1세 / 헬무트 폰 몰트케',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '437000',
              approx: true,
              quote: '약 43만 7천명',
            },
          ],
        },
        {
          historicalCountry: '이탈리아 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '베네치아 회복을 목표로 6월 20일 오스트리아에 선전포고. 쿠스토자 전투(6/24)와 리사 해전(7/20)에서 잇따라 패했으나 종전 조약으로 베네치아를 획득.',
          noteAppend:
            '진영 내 역할(이관): 동맹국 (남부 전선)\n지휘관(인물 연결 대기): 비토리오 에마누엘레 2세 / 알폰소 라 마르모라',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '200000',
              approx: true,
              quote: '약 20만명',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '637000',
          approx: true,
          qualifier: '프로이센 43.7만 + 이탈리아 20만',
          quote: '약 63만 7천명 (프로이센 43.7만 + 이탈리아 20만)',
        },
        {
          metricKey: 'military.deaths_unspecified',
          value: '5750',
          approx: true,
          quote: '약 5,750명',
        },
        {
          metricKey: 'military.wounded',
          value: '11300',
          approx: true,
          quote: '약 11,300명',
        },
        {
          metricKey: 'military.missing',
          value: '1400',
          approx: true,
          quote: '약 1,400명',
        },
        {
          metricKey: 'military.casualties_total',
          value: '18500',
          approx: true,
          quote: '약 18,500명',
        },
      ],
    },
    {
      name: '오스트리아 측',
      level: 'COALITION',
      color: '#b91c1c',
      description:
        '오스트리아 제국이 주도한 진영. 독일연방 내 보수 진영(바이에른·작센·하노버·뷔르템베르크·바덴·헤센·나사우 등)을 규합했으나 부대 통합이 부족해 분산 운용되었다.\n\n지휘관(인물 연결 대기): 프란츠 요제프 1세 (오스트리아 황제) / 루트비히 폰 베네데크 (북부군 사령관)',
      members: [
        {
          historicalCountry: '하노버 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '랑엔잘차 전투(6/27)에서 일시 승리했으나 보급 단절로 항복, 종전 후 프로이센에 병합되며 왕국이 소멸했다.',
          noteAppend:
            '진영 내 역할(이관): 독일연방 동맹국\n지휘관(인물 연결 대기): 게오르크 5세',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '19000',
              approx: true,
              quote: '약 1만 9천명',
            },
          ],
        },
        {
          country: '오스트리아',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '독일연방의 맹주를 자처하며 프로이센의 슐레스비히-홀슈타인 단독 처분에 반발, 6월 14일 연방의회에서 대(對)프로이센 동원안을 가결시키며 개전 책임을 졌다.',
          noteAppend:
            '진영 내 역할(이관): 주도국\n지휘관(인물 연결 대기): 프란츠 요제프 1세 / 루트비히 폰 베네데크',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '407000',
              approx: true,
              quote: '약 40만 7천명',
            },
          ],
        },
        {
          historicalCountry: '바덴 대공국',
          participation: 'LIMITED',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '독일연방 제8군단에 편성되어 프랑크푸르트 방면에서 활동. 종전 후 친(親)프로이센 노선으로 전환했다.',
          noteAppend:
            '진영 내 역할(이관): 독일연방 동맹국\n지휘관(인물 연결 대기): 빌헬름 폰 바덴 대공자',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '10000',
              approx: true,
              quote: '약 1만명',
            },
          ],
        },
        {
          historicalCountry: '바이에른 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '독일연방 군 산하 제7군단 편성. 프랑크푸르트 일대 방어를 맡았으나 통일된 작전을 펴지 못하고 후퇴했다.',
          noteAppend:
            '진영 내 역할(이관): 독일연방 동맹국\n지휘관(인물 연결 대기): 카를 테오도어 폰 바이에른 공',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '55000',
              approx: true,
              quote: '약 5만 5천명',
            },
          ],
        },
        {
          historicalCountry: '작센 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '개전 직후 프로이센군에 점령되어 본토를 잃고 보헤미아로 후퇴, 오스트리아 북부군에 합류해 쾨니히그레츠에서 함께 싸웠다.',
          noteAppend:
            '진영 내 역할(이관): 독일연방 동맹국\n지휘관(인물 연결 대기): 알베르트 작센 왕세자',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '24000',
              approx: true,
              quote: '약 2만 4천명',
            },
          ],
        },
        {
          historicalCountry: '뷔르템베르크 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1866,
            month: 6,
            day: 14,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '독일연방 제8군단 일부로 마인 전선에서 프로이센군과 교전. 종전 후 프로이센과 단독 평화조약을 체결했다.',
          noteAppend:
            '진영 내 역할(이관): 독일연방 동맹국\n지휘관(인물 연결 대기): 아우구스트 폰 뷔르템베르크 공',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '20000',
              approx: true,
              quote: '약 2만명',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '600000',
          approx: true,
          qualifier: '오스트리아 40.7만 + 독일연방 동맹국 약 15만 등',
          quote:
            '약 60만명 (오스트리아 40.7만 + 독일연방 동맹국 약 15만 + 독일 동맹 부대 등)',
        },
        {
          metricKey: 'military.deaths_unspecified',
          value: '7800',
          approx: true,
          quote: '약 7,800명',
        },
        {
          metricKey: 'military.wounded',
          value: '19800',
          approx: true,
          quote: '약 19,800명',
        },
        {
          metricKey: 'military.missing',
          value: '7800',
          approx: true,
          quote: '약 7,800명',
        },
        {
          metricKey: 'military.captured',
          value: '73000',
          approx: true,
          quote: '약 73,000명',
        },
        {
          metricKey: 'military.casualties_total',
          value: '108000',
          approx: true,
          qualifier: '포로 포함, 보헤미아 전선 기준',
          quote: '약 108,000명 (포로 포함, 보헤미아 전선 기준)',
        },
      ],
    },
  ],
  '크림 전쟁': [
    {
      name: '동맹국 측 (오스만·프랑스·영국·사르데냐)',
      level: 'COALITION',
      color: '#1d4ed8',
      description:
        '러시아의 남하·흑해 패권 시도를 저지하려는 반(反)러시아 연합. 오스만 제국이 1853-10 단독 개전했고, 시노프 참사 후 1854-03 프랑스 제2제국과 영국이 참전, 1855-01 사르데냐 왕국이 외교적 목적으로 가세했다. 연합군은 크림 반도에 상륙해 세바스토폴 요새 함락을 목표로 삼았다.\n\n지휘관(인물 연결 대기): 프랑스: 생타르노 → 캉로베르 → 펠리시에 원수 / 영국: 라글란 경 → 심프슨 / 오스만: 오메르 파샤 / 사르데냐: 알폰소 페레로 라 마르모라',
      members: [
        {
          historicalCountry: '프랑스 제2제국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1854,
            month: 3,
            day: 27,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '나폴레옹 3세가 가톨릭 성지 관할권 분쟁과 대(對)러시아 견제를 명분으로 참전한 최대 파병국. 세바스토폴 공방전에서 말라코프 보루를 함락시켜 종전을 이끌었다.',
          noteAppend:
            '진영 내 역할(이관): 주력 파병국\n지휘관(인물 연결 대기): 생타르노 → 캉로베르 → 펠리시에 원수 (황제 나폴레옹 3세)',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '400000',
              approx: true,
              qualifier: '최대 파병',
              quote: '약 40만명 (최대 파병)',
            },
            {
              metricKey: 'military.deaths_total',
              value: '100000',
              approx: true,
              quote:
                '총사망 약 30만+ (대부분 콜레라·티푸스 등 질병) — 프랑스 10만·오스만 15만+·영국 2만+·사르데냐 2천',
            },
          ],
        },
        {
          historicalCountry: '사르데냐 왕국',
          participation: 'LIMITED',
          join: {
            era: 'AD',
            year: 1855,
            month: 1,
            day: 26,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '카보우르 총리의 결정으로 1855-01 참전. 직접적 국익보다 파리 강화회의 참석권을 얻어 "이탈리아 문제"를 열강 외교 무대에 올리려는 포석이었다. 체르나야 전투(1855-08)에 참가.',
          noteAppend:
            '진영 내 역할(이관): 후발 동맹국\n지휘관(인물 연결 대기): 알폰소 페레로 라 마르모라(Alfonso La Marmora)',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '15000',
              approx: true,
              quote: '약 1만 5천명',
            },
            {
              metricKey: 'military.deaths_total',
              value: '2000',
              approx: true,
              quote:
                '총사망 약 30만+ (대부분 콜레라·티푸스 등 질병) — 프랑스 10만·오스만 15만+·영국 2만+·사르데냐 2천',
            },
          ],
        },
        {
          historicalCountry: '오스만 제국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1853,
            month: 10,
            day: 16,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '러시아의 다뉴브 공국 점령과 정교도 보호권 요구에 맞서 1853-10-04(율리우스력) 러시아에 선전포고하며 개전한 당사국. 다뉴브 전선과 캅카스(카르스)에서 분전했다.',
          noteAppend:
            '진영 내 역할(이관): 개전 당사국\n지휘관(인물 연결 대기): 오메르 파샤(Omer Pasha)',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '300000',
              approx: true,
              quote: '약 30만명',
            },
            {
              metricKey: 'military.deaths_total',
              low: '150000',
              approx: true,
              atLeast: true,
              quote:
                '총사망 약 30만+ (대부분 콜레라·티푸스 등 질병) — 프랑스 10만·오스만 15만+·영국 2만+·사르데냐 2천',
            },
          ],
        },
        {
          historicalCountry: '그레이트브리튼 및 아일랜드 연합왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1854,
            month: 3,
            day: 28,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '러시아의 지중해·인도 방면 남하를 차단하려 참전. 발라클라바·인케르만에서 분전했으나 보급·의료 체계의 난맥이 드러나 플로렌스 나이팅게일의 간호 개혁을 촉발했다.',
          noteAppend:
            '진영 내 역할(이관): 주력 파병국\n지휘관(인물 연결 대기): 라글란 경(Lord Raglan) → 제임스 심프슨',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '250000',
              approx: true,
              qualifier: '누계',
              quote: '약 25만명 (누계)',
            },
            {
              metricKey: 'military.deaths_total',
              low: '20000',
              approx: true,
              atLeast: true,
              quote:
                '총사망 약 30만+ (대부분 콜레라·티푸스 등 질병) — 프랑스 10만·오스만 15만+·영국 2만+·사르데냐 2천',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '1000000',
          approx: true,
          qualifier: '누계',
          quote:
            '누계 약 100만명 — 프랑스 약 40만(최대 파병국), 오스만 약 30만, 영국 약 25만, 사르데냐 약 1만 5천. 흑해 연합 함대(증기 군함 포함).',
        },
        {
          metricKey: 'military.combat_deaths',
          value: '70000',
          approx: true,
          quote: '약 7만 (전사·전상사)',
        },
        {
          metricKey: 'military.deaths_total',
          low: '300000',
          approx: true,
          atLeast: true,
          qualifier: '대부분 콜레라·티푸스 등 질병',
          quote:
            '총사망 약 30만+ (대부분 콜레라·티푸스 등 질병) — 프랑스 10만·오스만 15만+·영국 2만+·사르데냐 2천',
        },
      ],
    },
    {
      name: '러시아 제국 측',
      level: 'COUNTRY',
      color: '#b91c1c',
      description:
        '니콜라이 1세 치하에서 오스만에 대한 압박과 흑해·발칸 남하 정책을 추진하다 개전. 1855-03 니콜라이 1세 사망 후 알렉산드르 2세가 전쟁을 수습했다. 세바스토폴을 약 11개월간 방어했으나 함락되어 강화에 응했다.\n\n지휘관(인물 연결 대기): 알렉산드르 멘시코프 공 / 미하일 고르차코프 / 파벨 나히모프 제독(세바스토폴 방어, 전사) / 에두아르트 토틀레벤(축성)',
      members: [
        {
          historicalCountry: '러시아 제국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1853,
            month: 10,
            day: 16,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '다뉴브 공국 점령(1853)과 시노프 해전 승리로 전쟁을 촉발. 그러나 연합 함대·증기 군함·라이플 머스킷의 기술 격차와 보급난으로 세바스토폴을 잃고 패전, 흑해 중립화를 받아들였다.',
          noteAppend:
            '진영 내 역할(이관): 주(主) 교전국\n지휘관(인물 연결 대기): 멘시코프 공 / 고르차코프 / 나히모프 제독 / 토틀레벤\n병력(이관): 동원 약 70만~90만명',
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          low: '700000',
          high: '900000',
          approx: true,
          qualifier: '동원',
          quote:
            '동원 약 70만~90만명. 흑해 함대(범선 위주) + 세바스토폴 요새 수비대.',
        },
        {
          metricKey: 'military.combat_deaths',
          value: '140000',
          approx: true,
          qualifier: '질병 사망 별도',
          quote: '약 14만 (전사·전상사, 질병 사망 별도)',
        },
        {
          metricKey: 'military.deaths_total',
          value: '450000',
          approx: true,
          qualifier: '질병 포함 추정',
          quote: '총사망 약 45만 (질병 포함 추정) — 전쟁 전체 최대 손실국',
        },
      ],
    },
  ],
  '1차 아편전쟁': [
    {
      name: '영국 측',
      level: 'COALITION',
      color: '#1d4ed8',
      description:
        '영국 본토 정규군·왕립해군과 영령 인도(동인도회사군)가 합동 편성한 동방원정군(Expeditionary Force). 의회는 1840년 4월 7~9일 표결에서 271 대 262라는 박빙 표차로 출병안을 가결했고, 출병 명분은 (1)자국 상인 신변·재산 보호 (2)자유무역 원칙 관철 (3)청의 "야만적 단속"에 대한 응징이었다. 실제 작전은 압도적 함포 화력(68파운더 함포, 명중률·발사속도 모두 청의 구식 화포를 압도)과 증기선의 천수(淺水) 기동력에 의존하여, 청 연안의 지방군을 점령·차단·우회하는 방식으로 전개되었다. 베이징을 직접 공격하지 않고 양쯔강·대운하 결절점인 진강(鎮江)을 함락해 수운을 끊는 "간접 압박" 전략을 채택, 최소 비용으로 최대 정치 효과를 얻었다.\n\n지휘관(인물 연결 대기): 외상 파머스턴(정치 결정) / 찰스 엘리엇 → 헨리 포팅거(외교 전권) / 휴 고프(육군) / 조지 엘리엇 → 윌리엄 파커(해군) / 동인도회사: 인도총독 오클랜드 → 엘렌버러\n수치화하지 않은 피해 기록: 실종 — 극소수',
      members: [
        {
          historicalCountry: '그레이트브리튼 및 아일랜드 연합왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1839,
            month: 9,
            day: 4,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '외상 파머스턴이 실질적 주전론자로, 1839년 임칙서의 아편 압수를 "영국 자산 침탈"로 규정해 출병을 추진. 의회 출병안은 271:262로 가까스로 통과했으나(자유당 멜번 정부 신임 결부), 이후 4년 가까이 인도와 본토를 잇는 보급선을 운영하며 청 연안 13개 거점을 차례로 점거. 난징 조약(1842) 체결로 홍콩 영구 할양·5개항 개항·배상금 2,100만 은량을 확보하면서 아시아 자유무역 체제의 첫 교두보를 마련했다.',
          noteAppend:
            '진영 내 역할(이관): 주도국 / 정치적 결정 주체\n지휘관(인물 연결 대기): 찰스 엘리엇 → 헨리 포팅거 (외교) / 휴 고프 (육군) / 조지 엘리엇 → 윌리엄 파커 (해군)',
          observations: [
            {
              metricKey: 'military.personnel',
              low: '10000',
              approx: true,
              atLeast: true,
              qualifier:
                '사포이 합산. 본토 정규군 약 4,000 + 해병·무장선원 약 5,000',
              quote:
                '본토 정규군 약 4,000명 + 왕립해군 25척 이상 + 해병·무장선원 약 5,000명 (사포이 합산 1만 이상)',
            },
            {
              metricKey: 'military.vessels',
              low: '25',
              atLeast: true,
              quote:
                '본토 정규군 약 4,000명 + 왕립해군 25척 이상 + 해병·무장선원 약 5,000명 (사포이 합산 1만 이상)',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '20000',
          approx: true,
          quote:
            '약 2만명 — 영국 정규 보병 4개 연대 + 영령 인도 사포이, 함정 25~30척, 해병·무장선원 약 5,000명',
        },
        {
          metricKey: 'military.vessels',
          low: '25',
          high: '30',
          quote:
            '약 2만명 — 영국 정규 보병 4개 연대 + 영령 인도 사포이, 함정 25~30척, 해병·무장선원 약 5,000명',
        },
        {
          metricKey: 'military.killed_in_action',
          value: '69',
          approx: true,
          quote: '전사 약 69명 (전투 사상)',
        },
        {
          metricKey: 'military.wounded',
          value: '451',
          approx: true,
          quote: '전상 약 451명',
        },
        {
          metricKey: 'military.casualties_total',
          value: '520',
          approx: true,
          qualifier: '전사+전상(전투 직접)',
          quote:
            '전사·전상 약 520명 (전투 직접). 풍토병·항해 중 사망 포함 시 추정 1,000~2,000명',
        },
        {
          metricKey: 'military.casualties_total',
          low: '1000',
          high: '2000',
          approx: true,
          qualifier: '풍토병·항해 중 사망 포함 추정',
          quote:
            '전사·전상 약 520명 (전투 직접). 풍토병·항해 중 사망 포함 시 추정 1,000~2,000명',
        },
      ],
    },
    {
      name: '청 측',
      level: 'COUNTRY',
      color: '#b91c1c',
      description:
        '내륙 농경 제국의 청 정규군은 만주 정복기(17세기) 이래 200년간 본격적 외세 전쟁을 겪지 않아 전술·무기·지휘체계가 전반적으로 정체된 상태였다. 도광제는 "검약과 친정"으로 알려졌으나 외부 정보 부재로 영국군의 실력을 끝까지 과소평가했고, 강경파(임칙서·왕정·이리포 초기)와 화의파(기선·기영·이리포 후기) 사이의 정책 진동(振動)이 단속 → 협상 → 결사항전 → 강화로 이어지며 일관된 전략 수립을 방해했다. 또한 만주 팔기와 한족 녹영의 지휘 분리, 지방 총독·순무의 자율 동원 한계, 베이징과 광저우 간 정보 전달 지연(왕복 약 40일) 등으로 각 전선이 사실상 고립 분전했다. 진강 등에서 만주 팔기 부대가 결사항전(가족 동반 자결) 양상을 보였으나 전체 전국(戰局)에는 영향이 미미했다.\n\n지휘관(인물 연결 대기): 도광제(친정) / 임칙서 → 기선(광저우 흠차대신) / 기영·이리포(강화 전권) / 관텐페이·유겸·해령(전사·자결한 야전 지휘관)\n수치화하지 않은 피해 기록: 부상 — 미상 (사료 미비, 추정 수만 명) / 포로 — 소수 (대부분 처형되거나 도주)',
      members: [
        {
          historicalCountry: '청나라',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1839,
            month: 9,
            day: 4,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '아편 단속에서 시작된 외교 충돌이 군사 충돌로 확대. 광저우·딩하이·샤먼·닝보·우송·진강에서 차례로 패배하며, 1842년 7월 진강 함락으로 양쯔강·대운하 보급선이 끊기자 8월 강화에 응함. 난징 조약(1842) 체결로 홍콩 할양·5개항 개항·배상금 2,100만 은량·협정관세·공행 폐지를 수락, 동아시아 조공·해금 체제의 종언과 반(半)식민지화의 시발점을 맞이했다.',
          noteAppend:
            '진영 내 역할(이관): 주(主) 적국 / 영토·주권 침해 피해국\n지휘관(인물 연결 대기): 도광제(친정) / 임칙서 → 기선 → 기영·이리포\n병력(이관): 실제 분쟁 지역 동원 약 22만명 (지역별 분산 배치, 통합 야전군 미편성)',
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '220000',
          approx: true,
          qualifier: '분쟁지 동원. 명목 정규군 85만(팔기 25만 + 녹영 60만)',
          quote:
            '명목 정규군 85만(팔기 25만+녹영 60만), 분쟁지 동원 약 22만. 화승총·구식 청동포 위주의 열세',
        },
        {
          metricKey: 'military.killed_in_action',
          low: '18000',
          high: '20000',
          approx: true,
          qualifier: '전투 직접 + 만주 팔기 자결 포함',
          quote: '전사 약 18,000~20,000명 (전투 직접 + 만주 팔기 자결 포함)',
        },
        {
          metricKey: 'military.casualties_total',
          low: '22000',
          high: '30000',
          approx: true,
          qualifier:
            '전투 + 학살·자결·도주. 진강 만주 팔기 1,500명 자결 등 편차 큼',
          quote:
            '추정 22,000~30,000명 (전투 + 학살·자결·도주). 진강 만주 팔기 1,500명 자결 등 편차 큼',
        },
      ],
    },
  ],
  보불전쟁: [
    {
      name: '프로이센·독일 측',
      level: 'COALITION',
      color: '#1d4ed8',
      description:
        '프로이센 왕국이 주도한 북독일 연방과 남독일 4국(바이에른·뷔르템베르크·바덴·헤센) 연합. 1870년 7월 비밀 동맹 조항이 자동 발효되어 즉시 통합 작전이 가능했고, 종전 직전인 1871년 1월 18일 베르사유에서 독일 제국이 선포되었다.\n\n지휘관(인물 연결 대기): 빌헬름 1세 (총사령관, 프로이센 국왕·이후 독일 황제) / 헬무트 폰 몰트케 (참모총장) / 오토 폰 비스마르크 (수상)',
      members: [
        {
          historicalCountry: '프로이센 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '북독일 연방의 맹주로서 전쟁 전 과정을 주도. 7월 19일 프랑스의 선전포고를 받자 즉시 동원령을 발효, 8월 초 라인강을 도하해 알자스·로렌으로 진격했다.',
          noteAppend:
            '진영 내 역할(이관): 주도국\n지휘관(인물 연결 대기): 빌헬름 1세 / 헬무트 폰 몰트케',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '900000',
              approx: true,
              qualifier: '북독일 연방군 전체. 전선 투입 약 30만',
              quote: '북독일 연방군 약 90만명 (전선 투입 약 30만)',
            },
          ],
        },
        {
          historicalCountry: '뷔르템베르크 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '뷔르템베르크 사단으로 편성되어 프로이센 제3군에 합류. 알자스 진격과 파리 포위에 참여했고 종전 후 독일 제국에 가입했다.',
          noteAppend:
            '진영 내 역할(이관): 남독일 동맹국\n지휘관(인물 연결 대기): 카를 1세',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '20000',
              approx: true,
              quote: '약 2만명',
            },
          ],
        },
        {
          historicalCountry: '바덴 대공국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '바덴 사단이 프로이센 제3군에 편성되어 알자스 작전에 참여. 종전 후 독일 제국 가입.',
          noteAppend:
            '진영 내 역할(이관): 남독일 동맹국\n지휘관(인물 연결 대기): 프리드리히 1세 폰 바덴 대공',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '15000',
              approx: true,
              quote: '약 1만 5천명',
            },
          ],
        },
        {
          historicalCountry: '북독일 연방',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '1867년 보오전쟁 후 프로이센 주도로 결성된 22개국 연방. 보불전쟁의 공식 교전 주체이자 1871년 1월 독일 제국으로 승격되었다.',
          noteAppend:
            '진영 내 역할(이관): 주(主) 정치체\n지휘관(인물 연결 대기): 빌헬름 1세 (연방 대통령)\n병력(이관): 북독일 22개 회원국의 군사 통합체',
        },
        {
          historicalCountry: '헤센 대공국',
          participation: 'LIMITED',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '헤센-다름슈타트 사단으로 편성되어 메스 포위와 파리 포위에 참여했다.',
          noteAppend:
            '진영 내 역할(이관): 남독일 동맹국\n지휘관(인물 연결 대기): 루트비히 3세 헤센 대공',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '10000',
              approx: true,
              quote: '약 1만명',
            },
          ],
        },
        {
          historicalCountry: '바이에른 왕국',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'PARTICIPANT',
          roleDescription:
            '1870년 비밀 군사 동맹에 따라 자동 참전. 베르트 전투(8/6)와 스당 전투(9/1)에서 프로이센 제3군에 편성되어 결정적 역할을 수행. 종전 후 독일 제국 가입.',
          noteAppend:
            '진영 내 역할(이관): 남독일 동맹국\n지휘관(인물 연결 대기): 루트비히 2세 (국왕) / 야코프 폰 하르트만',
          observations: [
            {
              metricKey: 'military.personnel',
              value: '55000',
              approx: true,
              qualifier: '제1·제2 바이에른 군단',
              quote: '약 5만 5천명 (제1·제2 바이에른 군단)',
            },
          ],
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '1200000',
          approx: true,
          qualifier: '동원 총원(북독일 연방군 + 남독일 4국). 전선 투입 약 50만',
          quote:
            '동원 약 120만명 (북독일 연방군 + 남독일 4국 연합군). 전선 투입 약 50만명 — 후속 동원으로 단계별 증강.',
        },
        {
          metricKey: 'military.deaths_unspecified',
          value: '44700',
          approx: true,
          quote: '약 44,700명',
        },
        {
          metricKey: 'military.wounded',
          value: '89700',
          approx: true,
          quote: '약 89,700명',
        },
        {
          metricKey: 'military.missing',
          value: '4000',
          approx: true,
          quote: '약 4,000명',
        },
        {
          metricKey: 'military.captured',
          value: '720',
          approx: true,
          quote: '약 720명',
        },
        {
          metricKey: 'military.casualties_total',
          value: '139000',
          approx: true,
          qualifier: '전사·부상·실종·포로 합계',
          quote: '약 139,000명 (전사·부상·실종·포로 합계)',
        },
      ],
    },
    {
      name: '프랑스 측',
      level: 'COUNTRY',
      color: '#b91c1c',
      description:
        '프랑스 제2제국(나폴레옹 3세)이 7월 19일 선전포고로 개전. 9월 2일 스당 전투에서 황제가 항복하며 제정이 붕괴, 9월 4일 파리에서 제3공화국 국방정부가 선포되어 항전을 이어갔다. 그러나 메스(10/27)·파리(1871-01-28) 차례로 항복하며 패전.\n\n지휘관(인물 연결 대기): 나폴레옹 3세 (황제, ~1870-09-02) / 레옹 강베타 (국방정부 내무장관, 1870-09-04~) / 파트리스 드 마크마옹 (원수, 샬롱군) / 프랑수아 아실 바젠 (원수, 라인군)',
      members: [
        {
          country: '프랑스',
          participation: 'FULL',
          join: {
            era: 'AD',
            year: 1870,
            month: 7,
            day: 19,
          },
          roleIfNew: 'INITIATOR',
          roleDescription:
            '엠스 전보 사건(7/13)에 격분해 7월 19일 프로이센에 선전포고. 1804–1870 시기 프랑스 제2제국이나 별도 historicalCountry가 시드에 없어 현대 프랑스로 매핑. 9/4 이후 프랑스 제3공화국이 같은 정치적 실체로 항전을 이어감.',
          noteAppend:
            '진영 내 역할(이관): 주도국\n지휘관(인물 연결 대기): 나폴레옹 3세 → 국방정부(레옹 강베타·줄 파브르)\n병력(이관): 약 90만명 (정규군·국민방위대·의용군 총합)',
        },
      ],
      observations: [
        {
          metricKey: 'military.personnel',
          value: '900000',
          approx: true,
          qualifier:
            '동원 총원(정규군 49만 + 국민방위대 + 의용군). 개전 시 전선 투입 약 25만',
          quote:
            '동원 약 90만명 — 정규군 49만 + 국민방위대 + 의용군. 개전 시 전선 투입 약 25만으로 동원·집결 모두 독일 측에 비해 늦었다.',
        },
        {
          metricKey: 'military.deaths_unspecified',
          value: '138800',
          approx: true,
          quote: '약 138,800명',
        },
        {
          metricKey: 'military.wounded',
          value: '143000',
          approx: true,
          quote: '약 143,000명',
        },
        {
          metricKey: 'military.missing',
          value: '41000',
          approx: true,
          quote: '약 41,000명',
        },
        {
          metricKey: 'military.captured',
          value: '474000',
          approx: true,
          qualifier: '스당 10만, 메스 17만, 파리 항복 시 등',
          quote: '약 474,000명 (스당 10만, 메스 17만, 파리 항복 시 등)',
        },
        {
          metricKey: 'military.casualties_total',
          value: '756000',
          approx: true,
          qualifier: '전사·부상·실종·포로 합계',
          quote:
            '약 756,000명 — 보불전쟁의 인적 손실 대부분이 프랑스 측에 집중되었으며, 특히 포로 수가 압도적이다.',
        },
      ],
    },
  ],
}
