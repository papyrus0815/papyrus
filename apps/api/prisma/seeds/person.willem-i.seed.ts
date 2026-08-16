/**
 * 빌럼 1세 (Willem I der Nederlanden, 1772~1843) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/SovereignReign 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 네덜란드 초대 국왕(1815~1840)이자 룩셈부르크 대공. 나폴레옹 몰락 후 오라녀 가문을
 * 군주로 복귀시켜 남북 네덜란드를 묶은 연합왕국을 세웠고, 무역·운하·산업을 직접 챙겨
 * «상인왕(koopman-koning)»이라 불렸다. 그러나 남부의 불만을 누르지 못해 1830년 벨기에가
 * 떨어져 나갔고, 9년을 버티다 승인한 뒤 1840년 퇴위했다.
 *
 * ⚠️ 이 시리즈 첫 «군주» — 재임(GovernmentPositionTenure)이 아니라 **재위(SovereignReign)**
 * 를 쓴다. 유니크 제약이 (historicalCountryId, regnalNumber)라 다른 인물이 같은 국가·같은
 * 서수를 점유하고 있으면 건너뛴다(영국 군주 시드 선례).
 *
 * 재위 분할 규약: 그의 왕위는 두 역사국가에 걸친다 —
 *  - 네덜란드 연합왕국(1815~1839, 벨기에 포함): 즉위 1815-03-16 ~ 런던 조약 1839
 *  - 네덜란드 왕국(1839~): 벨기에 분리 후 ~ 퇴위 1840-10-07
 * 각각 SovereignReign 1건으로 두고 regnalNumber는 둘 다 1이다(제약은 국가별이라 충돌 없음).
 *
 * 대응 HC가 없어 재위로 만들지 않고 연보로 처리하는 것(크리보셰인 선례):
 *  - 연합네덜란드 주권공(Soeverein Vorst, 1813~1815) — 해당 시기 HC 없음
 *  - 룩셈부르크 대공(1815~1840) — DB에 «룩셈부르크 공국»(1354~1795)뿐이라 대공국 HC 없음
 *
 * 날짜 규약: 네덜란드는 그레고리력이라 구력 병기 없음.
 *
 * 서수 주의: 여기서 «1세»는 **국왕** 계보의 1세다. 오라녀 공 빌럼 1세(침묵공, 1533~1584)와
 * 총독(스타트하우더) 빌럼 1~5세는 별개 계보로, 1815년 왕위 창설과 함께 번호가 새로 시작됐다.
 *
 * 의존: seedBeneluxHistoricalCountries(두 HC) + seedGovernmentPositionDefinitions('국왕').
 *
 * 등록 항목:
 *  - Person x1 (빌럼 1세 — historicalCountryId=네덜란드 연합왕국)
 *  - SovereignReign x2 (연합왕국·왕국, regnalNumber 1)
 *  - PersonCountryAffiliation x2 (두 HC CITIZENSHIP)
 *  - PersonLifeEvent (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import { AppointmentMethod, DeathType, TenureEndReason } from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const WILLEM = {
  name: '빌럼',
  middleName: null as string | null,
  surname: '오라녀나사우',
  originalName: 'Willem I der Nederlanden (Willem Frederik, Prins van Oranje-Nassau)',
  gender: 'MALE' as const,
  birthYear: 1772, birthMonth: 8, birthDay: 24,
  birthNote:
    '본명 빌럼 프레데릭. 네덜란드 공화국 마지막 총독(스타트하우더) 빌럼 5세와 프로이센의 ' +
    '빌헬미나 사이에서 태어났다 — 어머니는 프리드리히 대왕의 조카이자 훗날 프로이센 국왕 ' +
    '프리드리히 빌헬름 2세의 누이로, 이 프로이센 인연이 그의 생애 전체를 관통한다(1787년 ' +
    '어머니가 애국파 민병에게 억류되자 오라비가 군대를 보내 오라녀파를 복권시킨 것이 그 ' +
    '시작이다). 1806년 아버지가 죽은 뒤로는 «오라녀 공 빌럼 6세»로 헤아려졌고, 1815년 ' +
    '왕위 창설과 함께 국왕 계보의 «1세»로 번호가 새로 시작됐다.',
  birthPlaceText: '네덜란드 공화국 헤이그 (하위스 텐 보스 궁)',
  deathYear: 1843, deathMonth: 12, deathDay: 12,
  deathPlaceText: '프로이센 베를린',
  deathType: DeathType.NATURAL,
  deathCause: '퇴위 후 자진 은거하던 베를린에서 사망 (향년 71세).',
  deathNote: '델프트 신교회(Nieuwe Kerk)의 오라녀 가문 왕실 납골당에 안장되었다.',
  influence: 76,
  biography:
    '네덜란드 초대 국왕(1815~1840)이자 룩셈부르크 초대 대공. 총독 가문의 상속자로 태어나 ' +
    '18년의 망명 끝에 돌아와, 공화국도 총독도 아닌 «왕국»이라는 새 형태로 네덜란드를 다시 ' +
    '세웠다. 운하와 무역회사가 그의 치세와 함께 이름을 얻어 «운하왕»·«상인왕»으로 불렸지만 ' +
    '(운하 계획 자체는 해군성에서 나왔고, 경제 개발을 노려 팠다는 문헌 증거는 없다), 남부를 ' +
    '북부의 방식으로 다스리려 한 고집이 벨기에 혁명을 불렀고, 9년의 승인 거부 끝에 왕국의 ' +
    '절반과 왕위를 함께 잃었다. ' +
    '\n\n' +
    '총독의 아들(1772~1794). 헤이그 하위스 텐 보스 궁에서 빌럼 5세와 프로이센의 빌헬미나 ' +
    '사이에서 태어났다. 어머니는 프리드리히 대왕의 조카 — 1787년 그 어머니가 애국파 민병에 ' +
    '억류되자 오라비인 프로이센 왕이 군대를 보내 오라녀파를 복권시켰고, 이 프로이센 인연은 ' +
    '이후 그의 망명지와 재혼까지 이어진다. 1791년 외사촌 누이인 프로이센의 빌헬미나와 ' +
    '혼인했고, 스무 살에 총사령관으로 프랑스 혁명전쟁에 나서 랑드르시를 함락하기도 했으나 ' +
    '1794년 플뢰뤼스에서 패했다. ' +
    '\n\n' +
    '망명 18년(1795~1813). 1795년 1월 스헤베닝언에서 배를 타고 영국으로 떠난 이튿날 ' +
    '바타비아 공화국이 선포되었다. 1802년에는 잃은 것의 보상으로 나사우-오라녀-풀다 공국을 ' +
    '받았다. 1806년 예나 전역에서 프로이센 편에 섰다가 에르푸르트 요새를 병력째 넘기고 ' +
    '항복했고, 그 보복으로 그해 10-31 공국을 몰수당했다. 1809년에는 오스트리아군으로 ' +
    '바그람에서 싸우다 부상했다. ' +
    '아버지가 죽은 1806년부터 1815년까지 그의 이름은 «오라녀 공 빌럼 6세»였다 — 오늘의 ' +
    '«1세»는 왕위가 창설되며 새로 시작된 번호다. ' +
    '\n\n' +
    '귀환과 왕국 창설(1813~1815). 프랑스 지배에 맞선 11월 봉기가 임시정부를 세우고 그를 ' +
    '부르자 1813-11-30 스헤베닝언에 상륙했다. 12-01 주권공으로 선포되자 이튿날 «현명한 ' +
    '헌법의 보장 아래(onder waarborging eener wijze constitutie)»라는 단서를 달고 받아들였고, ' +
    '이듬해 3월 암스테르담에서 «국왕»이 아니라 주권공으로서 취임했다. 열강은 완충국을 원해 ' +
    '남부 네덜란드를 그의 통치에 넘겼고(1814-06-21 런던 8개조 서명, 07-21 그의 수락, ' +
    '08-01 남부 통치 개시), 나폴레옹이 엘바에서 돌아온 ' +
    '1815-03-16 그는 스스로 국왕을 선포했다. 빈 회의는 이를 승인하면서 룩셈부르크를 ' +
    '대공국으로 올려 그에게 개인 자격으로 주었다. ' +
    '\n\n' +
    '운하왕·상인왕(1815~1830). 그는 헌법이 왕에게 남긴 재량을 최대한 넓게 썼다 — 1815년 ' +
    '헌법이 예산을 10년 단위로 정하도록 한 탓에 의회는 1829년에야 ' +
    '상환기금(Amortisatiesyndicaat)의 장부를 처음 보았고, 각료는 사실상 그의 비서였다. 그 힘으로 1815~1832년 ' +
    '사이 네덜란드에 481km의 운하를 놓았고(1824년 80km 노르트홀란트 운하), 1824년 칙령으로 ' +
    '네덜란드 무역회사(NHM)를 세워 최대 주주가 되었다. 남부의 공업과 북부의 상업·식민지 ' +
    '무역을 한 몸에 붙이려는 구상이었다. 국부와 왕실 수입은 실제로 불어났지만 노동계층은 ' +
    '빈곤화해 암스테르담 인구의 3분의 1이 구빈 지원으로 살았다. ' +
    '\n\n' +
    '남부를 잃다(1830~1839). 그러나 통합의 방법이 통합을 깨뜨렸다. 네덜란드어 강제, ' +
    '성직자 양성 과정 간섭, 언론인 기소, 인구 350만의 남부에 200만의 북부와 똑같이 55석만 ' +
    '준 의석 배분과 (가톨릭 주교단의 공직 취임 금지령까지 겹쳐) 각료 넷 중 하나만 남부인 ' +
    '이던 관직 구조, 그리고 북부의 옛 채무를 남부가 함께 갚게 한 재정 — 1830년 8월 브뤼셀 ' +
    '봉기는 그 청구서였다. 언어령과 철학 콜레기움은 그해 6월 이미 철회했지만 불만은 ' +
    '가라앉지 않았다. 1831년 10일 전쟁에서 벨기에군을 압도했지만 프랑스군 개입으로 진격을 ' +
    '멈췄고, 이 원정으로 그해 10월 「24개조」라는 더 유리한 조건을 얻어내고도 스스로 ' +
    '거절했다. 이후 8년간 군을 전시 태세로 묶어둔 것이 재정을 무너뜨렸고, 1839-04-19 런던 ' +
    '조약으로 결국 벨기에를 승인했다. ' +
    '\n\n' +
    '퇴위와 만년(1840~1843). 1840년 헌법 개정으로 각료의 책임이 명문화되어 왕의 재량이 ' +
    '좁아졌고, 가톨릭 신자이자 부계가 왈롱 귀족인 여관(女官) 헨리에터 둘트르몽과 혼인하려는 뜻은 ' +
    '왕가와 여론의 거센 반대에 부딪혔다. 1840-10-07 헷 로 궁에서 퇴위 문서에 서명하고 ' +
    '장남 빌럼 2세에게 넘긴 뒤 «나사우 백작»을 칭했다. 이듬해 베를린에서 재혼하고 그곳에 ' +
    '머물다 1843-12-12 사망했으며, 유해는 델프트 신교회 왕실 납골당에 안장되었다. ' +
    '\n\n' +
    '평가. 네덜란드 사료가 그에게 붙이는 말은 «일 중독»·«고집(koppig)»·«계몽 전제군주»다. ' +
    '재정 천재라는 평판은 1840년 해산한 상환기금이 국가부채에 남긴 1억 1,300만 휠던과 함께 ' +
    '금이 갔다. 경제를 일으킨 손과 남부를 밀어낸 손이 같은 손이었다는 것 — 왕의 재량을 넓게 쓴 그의 ' +
    '방식이 성과와 파국을 동시에 만들었다는 것이 이 재위의 요약이다. 그가 남긴 왕국은 ' +
    '반쪽이 되었지만, 총독의 나라를 왕의 나라로 바꾼 것은 되돌려지지 않았다.',
}

// ── 재위 ────────────────────────────────────────────────────────────────────
type HcKey = 'united' | 'kingdom'

interface ReignSpec {
  hc: HcKey
  /** 화면 표기용 직함 — 관직 정의는 '국왕'으로 연결 */
  label: string
  regnalNumber: number
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 즉위 경위 — 인물 상세 재위 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
}

const REIGNS: ReignSpec[] = [
  {
    hc: 'united',
    label: '네덜란드 연합왕국 국왕',
    regnalNumber: 1,
    startYear: 1815, startMonth: 3, startDay: 16,
    endYear: 1839, endMonth: 4, endDay: 19,
    endReason: TenureEndReason.STATE_DISSOLVED,
    endReasonDetail:
      '1839-04-19 런던 조약으로 벨기에 독립을 승인하면서 남북을 아우르던 연합왕국 자체가 ' +
      '끝났다 — 룩셈부르크의 왈롱어권을 떼어주고 동림뷔르흐를 받아, 이후 «림뷔르흐 공작»도 ' +
      '함께 칭했다. 왕위는 축소된 네덜란드 왕국에서 이어진다.',
    appointmentDetail:
      '1813년 11월 프랑스 지배에 맞선 봉기가 일어나자 망명지에서 돌아와 11-30 스헤베닝언에 ' +
      '상륙했고, 12-02 «현명한 헌법의 보장 아래»라는 조건을 달아 연합네덜란드의 ' +
      '주권공(Soeverein Vorst) 자리를 받아들였다 — 총독으로 쫓겨났던 가문이 군주로 돌아온 순간이다. ' +
      '1814-03-30 암스테르담 신교회에서 주권공으로 취임했고, 나폴레옹이 엘바에서 돌아오자 ' +
      '1815-03-16 스스로 «네덜란드 국왕»을 선포했다. 그해 06-09 빈 회의가 남부 네덜란드와의 ' +
      '통합을 승인했고, 09-21 브뤼셀에서 국왕 취임식을 치렀다.',
    notes:
      '1815-03-16 ~ 1839-04-19. ①«상인왕(koopman-koning)» — 1824-03-29 칙령으로 네덜란드 ' +
      '무역회사(NHM)를 직접 세워 최대 주주가 되었고, 코커릴의 공업 투자를 대고, ' +
      '상환기금(Amortisatiesyndicaat)이라는 예산 밖 금융 수단으로 사업을 굴렸다. ' +
      '1815~1832년 사이 481km의 운하를 놓아 «운하왕»으로도 불렸다(1824년 80km 노르트홀란트 ' +
      '운하). ②동시에 ' +
      '«칙령으로 다스린 왕» — 하루 수십 건, 많을 때는 100건이 넘는 칙령에 서명했고 성탄절에도 ' +
      '일했으며 오후 4시 아내와 차 마실 때만 손을 놓았다. 의회 통제를 우회한 «계몽 전제군주»라는 ' +
      '평이 여기서 나온다. ③남부(벨기에)의 불만 — 네덜란드어 공용화, 성직자 양성에 대한 ' +
      '간섭(철학 콜레기움), 언론 기소, 인구에 못 미치는 의석·관직 배분, 북부 채무의 공동 부담 — 이 ' +
      '쌓여 1830-08-25 브뤼셀 봉기로 터졌다(언어령과 철학 콜레기움은 그해 6월 이미 철회했지만 ' +
      '불만은 가라앉지 않았다). 1831년 «10일 전쟁»은 프랑스군 개입으로 중단되었으나 그해 ' +
      '10월 「24개조」라는 더 유리한 조건을 얻어냈고, 그것을 그가 거절한 것이 대치를 이어갔다. ' +
      '그 뒤 8년간 승인을 거부한 채 군을 전시 태세로 묶어둔 것이 국가 재정을 파탄냈다. 재위 전 기간 룩셈부르크 대공을 겸했으나 해당 HC가 없어 연보로 기록한다.',
  },
  {
    hc: 'kingdom',
    label: '네덜란드 왕국 국왕',
    regnalNumber: 1,
    startYear: 1839, startMonth: 4, startDay: 19,
    endYear: 1840, endMonth: 10, endDay: 7,
    endReason: TenureEndReason.ABDICATION,
    endReasonDetail:
      '1840-10-07 헷 로 궁에서 퇴위 문서에 서명하고 장남 빌럼 2세에게 왕위를 넘겼다. ' +
      '벨기에 승인의 굴욕, 재정 파탄과 개인 통치에 대한 의회의 공격, 각료의 형사책임을 ' +
      '도입한 1840년 헌법 개정이 겹쳤고, 결정타는 가톨릭 신자에 왈롱 귀족 가문 출신인 ' +
      '둘트르몽 백작영애(마스트리흐트 태생·네덜란드 국적)와 혼인하려는 뜻에 쏟아진 ' +
      '반발이었다. 퇴위 후에는 «나사우 백작»을 칭했다.',
    appointmentDetail:
      '새 즉위가 아니라 같은 왕위의 연속이다 — 1839년 런던 조약으로 벨기에가 떨어져 나가면서 ' +
      '통치 대상이 남북 연합왕국에서 축소된 네덜란드 왕국으로 바뀌었을 뿐이다. 이 시드는 ' +
      '역사국가 경계에 맞춰 재위를 둘로 나누어 기록한다.',
    notes:
      '1839-04-19 ~ 1840-10-07. 벨기에 분리 후의 1년 반. 이 시기 헌법 개정으로 각료의 형사 ' +
      '책임이 도입되어 왕의 대권에 처음으로 사법적 제동이 걸렸다 — 의회에 대한 정치적 ' +
      '각료책임은 1848년 헌법을 기다려야 했지만, 그 자신은 이 정도도 왕권의 과도한 축소로 ' +
      '받아들여 퇴위로 이어졌다. 서수 1은 국왕 계보의 것으로, ' +
      '연합왕국 재위와 같은 번호를 쓰되 유니크 제약이 국가별이라 충돌하지 않는다.',
  },
]

// ── 연보 ────────────────────────────────────────────────────────────────────
type LifeEventCategory =
  | 'EDUCATION' | 'TRAVEL' | 'PUBLICATION' | 'EXILE' | 'AWARD' | 'PERSONAL'
  | 'CAREER' | 'MILITARY' | 'POLITICAL' | 'DIPLOMATIC' | 'FAMILY' | 'HEALTH' | 'OTHER'

interface LifeEventEntry {
  title: string
  category: LifeEventCategory
  startYear: number; startMonth?: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  description?: string
}

const LIFE_EVENTS: LifeEventEntry[] = [
  {
    title: '헤이그 출생',
    category: 'FAMILY',
    startYear: 1772, startMonth: 8, startDay: 24,
    description:
      '마지막 총독 빌럼 5세와 프로이센의 빌헬미나의 아들로 하위스 텐 보스 궁에서 태어났다. ' +
      '어머니는 프리드리히 대왕의 조카.',
  },
  {
    title: '프로이센의 빌헬미나와 결혼',
    category: 'FAMILY',
    startYear: 1791, startMonth: 10, startDay: 1,
    description:
      '베를린 왕궁에서 외사촌 누이인 프로이센 국왕 프리드리히 빌헬름 2세의 딸 빌헬미나 ' +
      '(1774 포츠담~1837 헤이그)와 혼인하고 17일간 축하연을 열었다 — 오라녀와 호엔촐레른을 ' +
      '겹으로 묶은 결합이다. 여섯 아이를 얻어 사산 둘을 빼고 넷이 태어났고, 그중 파울리너는 ' +
      '여섯 살에 죽었다. 장남이 훗날의 빌럼 2세(1792-12-06 헤이그 출생)다.',
  },
  {
    title: '프랑스 혁명전쟁 종군',
    category: 'MILITARY',
    startYear: 1793, endYear: 1795, endMonth: 1, endDay: 18,
    description:
      '스무 살에 총사령관(kapitein-generaal)으로 플랑드르 전역에 나서 푀르너·메넌에서 ' +
      '싸웠고, ' +
      '1794년 랑드르시 요새를 함락하고 고슬리·랑뷔자에서 이겼으나 플뢰뤼스 전투에서 패했다 — ' +
      '이 패배가 오스트리아령 네덜란드를 프랑스에 열어주었다.',
  },
  {
    title: '영국 망명 — 바타비아 공화국 수립',
    category: 'EXILE',
    startYear: 1795, startMonth: 1, startDay: 18,
    description:
      '아버지가 그의 지휘권을 명예롭게 거두고 같은 날 총독 일가가 스헤베닝언에서 배를 타 ' +
      '영국으로 떠났다. 이튿날 바타비아 공화국이 선포되었고, 일가는 큐에 이어 햄프턴코트에 ' +
      '머물렀다.',
  },
  {
    title: '나사우-오라녀-풀다 공국',
    category: 'POLITICAL',
    startYear: 1802, endYear: 1806,
    description:
      '1802-05-23 프랑스-프로이센 협약으로 네덜란드에서 잃은 것의 보상으로 풀다·코르바이 ' +
      '수도원령과 도르트문트 등을 받았고, 12-06 풀다에 공(公)으로 입성했다. 1803년 제국대표자 ' +
      '회의 주요결의로 합법화되었으나, 1806년 나폴레옹에 맞선 대가로 몰수되었다.',
  },
  {
    title: '아버지 사망 — 오라녀 공 빌럼 6세',
    category: 'FAMILY',
    startYear: 1806, startMonth: 4, startDay: 9,
    description:
      '브라운슈바이크에서 빌럼 5세가 죽어 오라녀 가문의 수장이 되었다 — 1815년 왕위 창설 ' +
      '전까지 그는 «오라녀 공 빌럼 6세»였다.',
  },
  {
    title: '예나 전역 참전·에르푸르트 항복',
    category: 'MILITARY',
    startYear: 1806, startMonth: 10,
    description:
      '프로이센 편에 서서 사단을 지휘했으나 10-14 예나-아우어슈테트 패전 뒤 에르푸르트에서 ' +
      '프로이센·작센 병력 1만~1만 2천과 대포 65문, 페테르스베르크 요새를 뮈라에게 넘겼다. ' +
      '당일 풀려났으나 프로이센에서 비겁 혐의로 군법회의에 회부되었고, 나폴레옹은 보복으로 ' +
      '10-31 그의 공국을 몰수했다. 날짜는 사료가 갈린다 — 네덜란드어·영어 ' +
      '위키는 10-16을(네덜란드어판은 «항복»이 아니라 «포로가 되었다»로 적는다), 독일어 ' +
      '위키는 10-15를 든다.',
  },
  {
    title: '바그람 전투에서 부상',
    category: 'MILITARY',
    startYear: 1809, startMonth: 7,
    description:
      '1809년 5월 오스트리아군에 중장(Feldmarschalleutnant)으로 들어가 총사령관 막료로 있다가 ' +
      '07-05~06 바그람 전투에서 다리에 부상을 입었다. 이후 베를린 «네덜란드 궁»에서 망명 ' +
      '생활을 이어갔다.',
  },
  {
    title: '스헤베닝언 상륙 — 귀환',
    category: 'POLITICAL',
    startYear: 1813, startMonth: 11, startDay: 30,
    description:
      '프랑스 지배에 맞선 11월 봉기와 3인 임시정부의 부름으로 18년 만에 귀국했다. 열강은 ' +
      '이미 오라녀가의 복귀를 보장해 둔 상태였지만, 임시정부는 열강이 앉히는 형식을 피해 ' +
      '스스로 그를 초청하는 형식을 택했다.',
  },
  {
    title: '연합네덜란드 주권공 수락',
    category: 'POLITICAL',
    startYear: 1813, startMonth: 12, startDay: 2,
    description:
      '전날(12-01) 연합네덜란드 주권공(Soeverein Vorst)으로 선포되자 «현명한 헌법의 보장 ' +
      '아래»라는 조건을 달고 이날 받아들였다 — 총독이 아닌 군주로의 전환점. 1814-03-29 ' +
      '명사회의가 헌법 초안을 448 대 26으로 가결하고 이튿날 암스테르담 신교회에서 취임식을 ' +
      '치렀는데, 이때의 직함은 «국왕»이 아니라 «주권공»이다(네덜란드 군주는 대관식이 아니라 ' +
      '취임식을 한다). 이 시기에 대응하는 역사국가가 DB에 없어 재위가 아닌 연보로 기록한다.',
  },
  {
    title: '남부 네덜란드 통합 — 런던 8개조',
    category: 'DIPLOMATIC',
    startYear: 1814, startMonth: 7, startDay: 21,
    description:
      '열강이 남부 네덜란드(옛 오스트리아령)를 그의 통치에 넘기기로 한 8개조 합의. 6월 21일 ' +
      '캐슬레이·메테르니히·네셀로데·하르덴베르크 등 4대 열강 대표가 서명했고, 그가 이를 ' +
      '수락한 날이 7월 21일이다. 08-01 남부 통치를 시작하며 판 데르 카펠런을 벨기에 지방 ' +
      '부총독으로 임명했다.',
  },
  {
    title: '국왕 선포',
    category: 'POLITICAL',
    startYear: 1815, startMonth: 3, startDay: 16,
    description:
      '나폴레옹이 엘바에서 돌아오자 스스로 «네덜란드 국왕» 칭호를 취했다 — 남이 준 것이 ' +
      '아니라 그 자신의 행위였다. 06-09 빈 회의 최종의정서가 이를 승인했고, 취임식은 반년 ' +
      '뒤인 09-21 브뤼셀 시청과 성 미카엘·성 구둘라 대성당에서 치렀다(칭호를 취한 곳이 ' +
      '브뤼셀이라는 영어 위키 서술은 이 둘을 뒤섞은 것이다). 네덜란드 군주는 대관식이 아니라 ' +
      '취임식(inhuldiging)을 한다.',
  },
  {
    title: '룩셈부르크 대공 겸위',
    category: 'POLITICAL',
    startYear: 1815, endYear: 1840, endMonth: 10, endDay: 7,
    description:
      '빈 회의가 룩셈부르크를 대공국으로 올려 그에게 개인 자격으로 주었다 — 프로이센에 넘긴 ' +
      '나사우 세습령의 대가였다. 동시에 독일 연방 회원국이라 수도 요새에는 프로이센 수비대가 ' +
      '있었고, 그는 이곳을 네덜란드 헌정 기구가 아니라 헤이그에서 사적 영지처럼 다스렸다. ' +
      '시작일은 축이 다르다 — 네덜란드 왕호는 03-16이지만 룩셈부르크 군주 계보는 ' +
      '네덜란드어·영어 위키 모두 03-15로 헤아린다. 대응 HC(룩셈부르크 대공국)가 DB에 없어 재위가 아닌 ' +
      '연보로 기록한다.',
  },
  {
    title: '노르트홀란트 운하 개통',
    category: 'POLITICAL',
    startYear: 1824,
    description:
      '1819-04-15 칙령으로 착공을 명하고 그해 여름 인부 약 9천 명이 파기 시작해 1824년 ' +
      '완공한 80km 운하로 암스테르담의 바닷길을 되살렸다(계획을 낸 것은 그가 아니라 ' +
      '해군성이다). 1815~1832년 사이 네덜란드에 놓인 ' +
      '운하가 481km에 이르러 «운하왕(kanalenkoning)»이라 불렸다.',
  },
  {
    title: '네덜란드 무역회사(NHM) 설립',
    category: 'POLITICAL',
    startYear: 1824, startMonth: 3, startDay: 29,
    description:
      '03-09 헤이그에서 자신의 발의로 출범시키고 03-29 칙령으로 세워 최대 주주가 되었다 — ' +
      '«상인왕(koopman-koning)»이라는 별칭의 근거이자 훗날 ABN AMRO로 이어지는 뿌리. 1827년 ' +
      '동인도 아편 수입 전매를 이 회사에 넘기자 부진하던 실적이 곧바로 흑자로 돌아섰다.',
  },
  {
    title: '벨기에 혁명',
    category: 'POLITICAL',
    startYear: 1830, startMonth: 8, startDay: 25,
    description:
      '브뤼셀 봉기로 남부가 이탈했다. 언어 정책·성직자 양성 간섭·언론 기소·의석과 관직의 ' +
      '북부 편중·북부 채무의 공동 부담이 쌓인 결과였다. 그날 밤 군중은 «자유 만세(vive la ' +
      'liberté)»를 외치며 극장을 나와, 왕의 언어정책을 밀어붙인 판 마넌 장관의 집에 불을 ' +
      '질렀다.',
  },
  {
    title: '10일 전쟁 — 프랑스 개입으로 중단',
    category: 'MILITARY',
    startYear: 1831, startMonth: 8, startDay: 2,
    endYear: 1831, endMonth: 8, endDay: 12,
    description:
      '벨기에군을 군사적으로 압도했으나 프랑스군 개입으로 진격을 멈췄다. 다만 이 원정으로 ' +
      '1831년 10월 「24개조」라는 더 유리한 조건을 얻어냈고, 그것을 스스로 거절한 것이 이후 ' +
      '8년의 대치를 낳았다. 그 8년간 군을 전시 태세로 유지한 것이 국가 재정을 무너뜨렸다.',
  },
  {
    title: '런던 조약 — 벨기에 승인',
    category: 'DIPLOMATIC',
    startYear: 1839, startMonth: 4, startDay: 19,
    description:
      '9년의 거부 끝에 벨기에 독립을 승인했다. 룩셈부르크의 왈롱어권을 잃고 동림뷔르흐를 ' +
      '얻어 이후 «림뷔르흐 공작»도 칭했다.',
  },
  {
    title: '퇴위',
    category: 'POLITICAL',
    startYear: 1840, startMonth: 10, startDay: 7,
    description:
      '헷 로 궁(아펠도른)에서 퇴위 문서에 서명하고 장남 빌럼 2세에게 넘겼다 — 네덜란드 ' +
      '사료는 그가 «환멸에 빠진 채(teleurgesteld)» 왕위를 내놓았다고 적는다. 이후 «나사우 ' +
      '백작»을 칭했는데, 정확한 칭호는 사료가 갈린다 — 네덜란드어 위키 본문은 «폐하 나사우 ' +
      '백작»으로, 왕실 칭호 항목과 왕실 공식 사이트는 «국왕 빌럼 프레데릭, 나사우 백작»으로 ' +
      '적어 «국왕»을 이름에 남긴다. 어느 쪽이든 20세기의 빌헬미나·율리아나가 퇴위 후 ' +
      '«공주»가 된 것보다는 높은 격이다.',
  },
  {
    title: '둘트르몽 백작영애와 재혼',
    category: 'FAMILY',
    startYear: 1841, startMonth: 2, startDay: 17,
    description:
      '베를린에서 개신교·가톨릭 두 예식으로 혼인했다. 가톨릭 신자이자 왈롱 귀족 가문 ' +
      '출신인 여성(마스트리흐트 태생·네덜란드 국적이며, «벨기에 사람»이라는 통념은 부계 ' +
      '가문에서 온 오해다)과의 혼인은 왕가와 여론의 거센 반대를 불렀고, 네덜란드 사료는 ' +
      '이것을 퇴위의 «최종적 이유»로 꼽는다. 부인은 «나사우 백작부인»을 칭했다. 이 혼인은 ' +
      '같은 해 10-02 헤이그 호적에도 조용히 올려졌다.',
  },
  {
    title: '베를린에서 사망',
    category: 'PERSONAL',
    startYear: 1843, startMonth: 12, startDay: 12,
    description:
      '자신 소유의 «네덜란드 궁»에서 향년 71세로 죽었다. 흔히 뇌졸중으로 전하지만 ' +
      '네덜란드어·영어·독일어 위키 어느 쪽도 사인을 적지 않아 확정된 사실로 다루지 않는다. 유해는 이듬해 ' +
      '01-02 델프트 신교회 왕실 납골당에 안장되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const WILLEM_STATS = {
  politics: 55,
  military: 35,
  diplomacy: 50,
  intellect: 68,
  charisma: 45,
  administration: 82,
  notes:
    '행정 82 — 10년 단위 예산 뒤에서 각료를 비서처럼 부리며 운하 481km(1815~1832)와 NHM을 ' +
    '직접 밀어붙인 «운하왕·상인왕»의 실행력. 학식 68 — 이론가는 아니었으나 산업·수리·재정 실무를 ' +
    '스스로 챙긴 근면형. 정치 55 — 헌법의 재량을 넓게 쓰는 데는 능했지만 남부의 불만을 ' +
    '정치로 풀지 못해 왕국의 절반을 잃었다. 외교 50 — 1813~15년 열강의 완충국 구상에 올라탄 ' +
    '것은 성공이나, 1830년 이후 9년의 승인 거부는 외교적 자해였다. 군사 35 — 고슬리· ' +
    '랑뷔자에서 이겨 유능한 지휘관 소리를 들었으나 코부르크의 연합군이 무너진 플뢰뤼스와 ' +
    '에르푸르트 항복이 그의 이력이고, 10일 전쟁의 전술적 우세는 프랑스 개입으로 중단됐으며 ' +
    '얻어낸 「24개조」마저 스스로 거절했다. ' +
    '카리스마 45 — 대중적 인기보다 «남의 말을 듣지 않는 왕»이라는 평이 앞선다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedWillemI(prisma: PrismaService): Promise<void> {
  console.log('\n👑 빌럼 1세(Willem I der Nederlanden) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const united = await prisma.historicalCountry.findFirst({
    where: { name: '네덜란드 연합왕국' },
    select: { id: true },
  })
  if (!united) {
    console.warn(
      '  ⚠️  «네덜란드 연합왕국» HC 미존재 — 먼저 seedBeneluxHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }
  const kingdom = await prisma.historicalCountry.findFirst({
    where: { name: '네덜란드 왕국' },
    select: { id: true },
  })
  if (!kingdom) {
    console.warn('  ⚠️  «네덜란드 왕국» HC 미존재 — 1839년 이후 재위·소속 연결을 건너뛴다.')
  }
  const hcIdByKey: Record<HcKey, string | undefined> = { united: united.id, kingdom: kingdom?.id }

  const kingDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '국왕' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Willem I der Nederlanden' } },
        // 옛 표기(영·네 혼종)로 이미 들어간 행도 잡는다
        { originalName: { contains: 'Willem I of the Netherlands' } },
        // ⚠️이름+성만으로는 빌럼 2세·5세와 충돌하므로 생일까지 건다
        {
          AND: [
            { name: '빌럼' },
            { surname: '오라녀나사우' },
            { birthDate: toDate(WILLEM.birthYear, WILLEM.birthMonth, WILLEM.birthDay) },
          ],
        },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = WILLEM.originalName
    if (!person.biography) patch.biography = WILLEM.biography
    if (!person.birthPlaceText) patch.birthPlaceText = WILLEM.birthPlaceText
    if (!person.birthNote) patch.birthNote = WILLEM.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = WILLEM.deathPlaceText
    if (!person.deathType) patch.deathType = WILLEM.deathType
    if (!person.deathCause) patch.deathCause = WILLEM.deathCause
    if (!person.deathNote) patch.deathNote = WILLEM.deathNote
    if (person.influence == null) patch.influence = WILLEM.influence
    if (!person.historicalCountryId) patch.historicalCountryId = united.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${WILLEM.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${WILLEM.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: WILLEM.name,
        middleName: WILLEM.middleName,
        surname: WILLEM.surname,
        originalName: WILLEM.originalName,
        biography: WILLEM.biography,
        birthDate: toDate(WILLEM.birthYear, WILLEM.birthMonth, WILLEM.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: WILLEM.birthNote,
        deathDate: toDate(WILLEM.deathYear, WILLEM.deathMonth, WILLEM.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: WILLEM.deathType,
        deathCause: WILLEM.deathCause,
        deathNote: WILLEM.deathNote,
        gender: WILLEM.gender,
        nameDisplayOrder: 'western' as any,
        influence: WILLEM.influence,
        birthPlaceText: WILLEM.birthPlaceText,
        deathPlaceText: WILLEM.deathPlaceText,
        historicalCountryId: united.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${WILLEM.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재위 ────────────────────────────────────────────────────────────────
  for (const r of REIGNS) {
    const hcId = hcIdByKey[r.hc]
    if (!hcId) {
      console.warn(`  ⚠️  HC 미존재로 재위 건너뜀: ${r.label}`)
      continue
    }
    /**
     * 유니크 제약이 (historicalCountryId, regnalNumber)라 인물이 달라도 충돌한다 —
     * 제약 키로 조회해 다른 인물이 점유 중이면 경고만 남기고 넘어간다(영국 군주 시드 선례).
     */
    const existing = await prisma.sovereignReign.findFirst({
      where: { historicalCountryId: hcId, regnalNumber: r.regnalNumber },
    })
    if (existing) {
      if (existing.personId === personId) {
        console.log(`  ⏭️  재위 스킵 (이미 존재): ${r.label}`)
      } else {
        console.warn(`  ⚠️  재위 스킵: ${r.label} — 같은 국가·서수를 다른 인물이 점유 중`)
      }
      continue
    }
    const startDate = toDate(r.startYear, r.startMonth, r.startDay)
    const startDatePrecision = r.startDay ? 'day' : r.startMonth ? 'month' : 'year'
    await prisma.sovereignReign.create({
      data: {
        personId,
        historicalCountryId: hcId,
        positionDefinitionId: kingDef?.id ?? undefined,
        regnalNumber: r.regnalNumber,
        startDate,
        startDatePrecision,
        endDate: toDate(r.endYear, r.endMonth, r.endDay),
        appointmentMethod: AppointmentMethod.HEREDITARY,
        appointmentDetail: r.appointmentDetail,
        endReason: r.endReason,
        endReasonDetail: r.endReasonDetail,
        notes: r.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재위: ${r.label} (${r.startYear} ~ ${r.endYear})`)
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: { historicalCountryId: string; label: string; priority: number; note?: string }[] = [
    {
      historicalCountryId: united.id,
      label: '네덜란드 연합왕국 (1815~1839)',
      priority: 0,
    },
  ]
  if (kingdom) {
    affiliations.push({
      historicalCountryId: kingdom.id,
      label: '네덜란드 왕국 (1839~1843)',
      priority: 1,
      note: '벨기에 분리 후의 네덜란드 — 퇴위(1840)와 사망(1843)까지.',
    })
  }
  for (const aff of affiliations) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        historicalCountryId: aff.historicalCountryId,
        affiliationType: 'CITIZENSHIP' as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${aff.label}`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: aff.historicalCountryId,
          affiliationType: 'CITIZENSHIP' as any,
          priority: aff.priority,
          note: aff.note,
        },
      })
      console.log(`  ✅ 소속국가: ${aff.label}`)
    }
  }

  // ── 4) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({
      where: { personId, title: e.title },
    })
    if (exists) continue
    const startDate = toDate(e.startYear, e.startMonth, e.startDay)
    const startDatePrecision = e.startDay ? 'day' : e.startMonth ? 'month' : 'year'
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    const endDatePrecision = e.endYear ? (e.endDay ? 'day' : e.endMonth ? 'month' : 'year') : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate,
        startDatePrecision,
        endDate,
        endDatePrecision,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 5) 6축 능력치 ────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({
    where: { personId, accountId: admin.id },
  })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: WILLEM_STATS.politics,
        military: WILLEM_STATS.military,
        diplomacy: WILLEM_STATS.diplomacy,
        intellect: WILLEM_STATS.intellect,
        charisma: WILLEM_STATS.charisma,
        administration: WILLEM_STATS.administration,
        notes: WILLEM_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${WILLEM_STATS.politics}·군사 ${WILLEM_STATS.military}·` +
        `외교 ${WILLEM_STATS.diplomacy}·학식 ${WILLEM_STATS.intellect}·` +
        `카리스마 ${WILLEM_STATS.charisma}·행정 ${WILLEM_STATS.administration}`,
    )
  }

  console.log('✅ 빌럼 1세 시딩 완료\n')
}
