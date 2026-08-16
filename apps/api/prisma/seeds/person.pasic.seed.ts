/**
 * 니콜라 파시치 (Nikola Pašić, 1845~1926) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure/Cabinet 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 세르비아의 정치가. 인민급진당을 창당해 반세기 가까이 세르비아 정치를 지배했고, 총리를
 * 여러 차례 지내며 발칸 전쟁과 제1차 세계대전을 이끌었다. 1914년 7월 오스트리아-헝가리의
 * 최후통첩을 받고 회답을 직접 건넨 당사자이며, 전후에는 세르비아-크로아티아-슬로베니아
 * 왕국(유고슬라비아)의 총리로 그 건국을 마무리했다.
 *
 * ⚠️ 날짜 규약 — 이 시리즈에서 가장 까다로운 축: 세르비아는 1919년 1월까지 율리우스력
 * (구력·OS)을 썼다. 따라서 세르비아 국내 사료의 날짜는 구력이고, 이 시드는 신력(NS)으로
 * 환산해 저장한다(19세기 +12일, 20세기 +13일). 구력 원일자는 notes·birthNote에 병기.
 * 반면 국제 무대의 사건(최후통첩 전달·파리 강화회의 등)은 이미 신력으로 기록된다 —
 * 영어권 자료가 두 역법을 섞어 쓰는 일이 잦아 각 항목의 출처 역법을 확인해야 한다.
 *
 * 국가 매핑: 그의 경력은 두 나라에 걸친다 —
 *  - 세르비아 왕국(근대, 1882~1918): 총리 재임 다수
 *  - 세르비아-크로아티아-슬로베니아 왕국(1918~1929): 총리 재임
 * 각 재임을 해당 시기의 HC에 붙이고, 소속국가(PersonCountryAffiliation)도 둘 다 건다.
 *
 * 의존: seedSerbiaHistoricalCountries(두 HC) + seedGovernmentPositionDefinitions('총리').
 *
 * 등록 항목:
 *  - Person x1 (파시치 본인 — historicalCountryId=세르비아 왕국(근대))
 *  - GovernmentPositionTenure + Cabinet (총리 재임 1건당 내각 1건 —
 *    [[project_cabinet_must_accompany_pm_tenure]])
 *  - GovernmentPositionTenure x8 (세르비아 총리 5 + SCS 각의 의장 대행 1 + SCS 총리 2)
 *    + Cabinet x7 (직무대행 제외) — 신규 생성이라 appointmentDetail을 create에 직접 기입
 *  - PersonCountryAffiliation x2 (세르비아 왕국 / SCS 왕국 CITIZENSHIP)
 *  - PersonLifeEvent x28 (연보)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const PASIC = {
  name: '니콜라',
  middleName: null as string | null,
  surname: '파시치',
  originalName: 'Nikola Pašić (Никола Пашић)',
  gender: 'MALE' as const,
  birthYear: 1845, birthMonth: 12, birthDay: 18,
  birthNote:
    '구력(율리우스력) 1845-12-06 성 니콜라이 축일 출생 — 신력 환산 12-18(19세기 +12일). ' +
    '자예차르의 소상인 페타르와 어머니 페나의 아들이며, 조부는 빵집을 했다. 본인은 조상이 ' +
    '테토보 인근(마케도니아)의 로가체보 마을 출신이라고 밝혔다. 생일에는 이설이 있는데 ' +
    '(12-19, 구력 12-19=신력 12-31), 1925년 기념문집이 잘못 적은 것이 유고슬라비아 문서고 ' +
    '인명사전과 브리태니커로 전파된 것으로 추적된다 — 세르비아어 위키백과와 ' +
    '영어·독일어·러시아어 위키가 모두 채택한 12-18(구력 12-06)을 따른다. 출생지도 러시아어·불가리아어 ' +
    '위키가 인근 마을 벨리키 이즈보르라 적어 갈린다.',
  birthPlaceText: '세르비아 공국 자예차르',
  deathYear: 1926, deathMonth: 12, deathDay: 10,
  deathPlaceText: '세르비아-크로아티아-슬로베니아 왕국 베오그라드',
  deathType: DeathType.NATURAL,
  deathCause:
    '뇌졸중 — 전날 국왕 알현에서 아들 문제로 질책받고 조각 명령도 받지 못한 충격 끝에 ' +
    '이튿날 아침 급사했다 (향년 80세).',
  deathNote:
    '1926-12-09 오후 알렉산다르 1세를 한 시간 알현했으나 국왕은 아들 라도미르의 부패를 ' +
    '문제 삼으며 새 조각 명령을 주지 않았다. 그날 저녁 궁내장관의 방문 뒤 쓰러져 이튿날 ' +
    '아침 9시 사망했다 — 81번째 생일을 여드레 앞둔 때였다. 사인은 세르비아·크로아티아어 ' +
    '사료가 «뇌졸중»으로 일치하나 영어 위키는 심장마비로 적는다. 베오그라드 신묘지(노보 ' +
    '그로블레)에 안장되었다. 그가 죽은 뒤 급진당에서 그의 권위에 견줄 정치인은 나오지 않았고, 세르비아 ' +
    '정치에 몸담은 48년 동안 22개 정부를 이끌었고, 재임 약 12년으로 세르비아 역대 최장수 ' +
    '총리로 남았다.',
  influence: 85,
  biography:
    '세르비아의 정치가. 인민급진당을 창당해 45년간 이끌었고 세르비아 총리를 다섯 차례, ' +
    '세르비아-크로아티아-슬로베니아 왕국 총리를 두 차례 지내며 반세기 가까이 세르비아 ' +
    '정치의 중심에 있었다. 1914년 7월 오스트리아-헝가리의 최후통첩을 받고 시한 5분 전 ' +
    '회답을 직접 건넨 당사자이며, 니시 선언과 코르푸 선언으로 남슬라브 통합을 전쟁 목표로 ' +
    '세워 유고슬라비아 건국을 이끌었다. ' +
    '\n\n' +
    '출신과 유학(1845~1873). 동부 세르비아 자예차르의 소상인 집안에서 태어나 열한 살에야 ' +
    '학교에 들어갔고, 김나지움을 스물한 살에 마쳤다. 베오그라드 고등학교(벨리카 ' +
    '슈콜라, 오늘날 베오그라드 대학교의 전신) 기술학부를 거쳐 ' +
    '국비 장학생으로 취리히 공과대학에서 철도·토목을 공부했다(1868~1872) — 그곳에서 ' +
    '스베토자르 마르코비치와 가까워지고 러시아 인민주의자들과 접촉하며 훗날 급진당의 ' +
    '중핵이 될 유학생 무리와 결속했다. 귀국 후 건설부 기사로 잠시 일하다 1878년 ' +
    '자예차르에서 국민의회 의원으로 당선되며 정치에 들어섰다. ' +
    '\n\n' +
    '창당과 망명(1881~1889). 1881년 인민주권·보통선거·지방분권을 내건 인민급진당을 세워 ' +
    '초대 중앙위원장이 되었다. 1883년 정부가 민간의 총기를 걷으려 하자 급진당 지지 지역이 ' +
    '거부하며 티모크 봉기가 터졌고, 그는 사바강을 건너 탈출한 뒤 궐석 사형을 선고받았다. ' +
    '불가리아 소피아에서 건설 청부업으로 6년을 버텼는데, 불가리아의 비호는 1885년 밀란 ' +
    '국왕이 세르비아-불가리아 전쟁을 일으킨 명분이 되었고 패전 후의 사면에서도 그만 ' +
    '제외되었다. 밀란이 물러난 1889년에야 사면돼 돌아왔다. ' +
    '\n\n' +
    '집권과 추락(1891~1903). 1891년 처음 총리에 올랐으나 이듬해 물러났고, 1899년 전 국왕 ' +
    '밀란 저격 미수 사건으로 급진당 지도부가 일제히 검거되면서 최대의 위기를 맞았다. 밀란은 ' +
    '사형을 압박했지만 친러 성향의 그를 처형하면 러시아가 보복하리라 본 오스트리아-헝가리가 ' +
    '개입해 막았다 — 그 사실을 모른 채 옥중에서 «급진당이 오브레노비치 왕조에 불충했다»고 자백한 ' +
    '것은 평생 씻지 못한 오점이 되었다. 1903년 5월 쿠데타로 오브레노비치 왕조가 무너질 때 ' +
    '그는 모의에 가담하지 않았고 정계 밖에 있었으나, 새 왕조와 급진당의 시대가 열리며 ' +
    '복귀했다. ' +
    '\n\n' +
    '관세 전쟁과 발칸 전쟁(1904~1913). 1904년 카라조르제비치 왕조 아래 처음으로 총리가 ' +
    '되었고, ' +
    '1906~1908년 집권기에는 오스트리아-헝가리가 세르비아산 돼지 수입을 막아 시작된 관세 ' +
    '전쟁의 최대 국면을 지휘했다 — 對오스트리아 무역 비중을 크게 떨어뜨리고 ' +
    '독일·프랑스로 판로를 돌려, 경제로 굴복시키려던 빈의 기도를 무산시켰다. 1912년 다시 ' +
    '정부를 맡아 두 차례의 발칸 전쟁을 치렀고, 1913년 부쿠레슈티 강화회의에 대표단을 직접 ' +
    '이끌어 바르다르 마케도니아를 확보했다. ' +
    '\n\n' +
    '1914년 7월. 사라예보 암살 직전 «보스니아에서 대공 암살 음모가 있다»는 구체성 없는 ' +
    '경고가 빈에 전달된 정황이 있는데, 이름도 무기도 적히지 않은 채 군부에 가까운 인물을 ' +
    '통해 간 것이라 «알렸다는 알리바이만 남겼다»(알베르티니)는 해석과 «전혀 ' +
    '몰랐다»(초로비치)는 해석이 맞선다 — 당시 그는 총사퇴하고 08-14 총선을 앞둔 과도내각의 총리였고 ' +
    '«검은손» 장교단과 대립하던 처지였다. 07-23 최후통첩이 도착했을 때 그는 유세차 지방에 있었고, 섭정의 ' +
    '명으로 급히 돌아와 07-25 각의에서 회답을 만들었다. 열 개 요구 중 오스트리아 관리의 ' +
    '영내 수사 참여만 헌법을 들어 거부한 그 회답을, 세르비아가 총동원을 발령하고 세 시간 ' +
    '뒤인 오후 5시 55분에 그가 직접 기슬 공사에게 건넸다 — 아무도 그 일을 맡으려 하지 ' +
    '않았기 때문이다. 최후통첩을 기초한 무술린조차 «외교적 기교의 가장 빛나는 본보기»라 ' +
    '했고 빌헬름 2세는 «전쟁의 명분이 모두 사라졌다»고 적었으나, 클라크는 양보하는 인상만 ' +
    '주고 실제로는 거의 내주지 않은 «향수 뿌린 거절»이라 본다. ' +
    '\n\n' +
    '전쟁과 건국(1914~1918). 정부를 니시로 옮긴 뒤 1914-12-07 «니시 선언»으로 세르비아· ' +
    '크로아티아·슬로베니아의 해방과 통일을 전쟁 목표로 선포했다 — 유고슬라비아 건국의 최초 ' +
    '공식 선언이다. 1915년 겨울 알바니아 산악을 넘는 «대퇴각»으로 18만 남짓이 아드리아 ' +
    '연안에 이르렀고, 코르푸의 망명 정부에서 1917-07-20 트룸비치의 유고슬라비아 위원회와 ' +
    '«코르푸 선언»에 서명해 통합 국가의 골격을 잡았다. 같은 해 솔룬(테살로니키) 재판으로 ' +
    '«검은손»의 아피스가 처형된 것도 이 시기다 — 그는 기소에 앞선 정치 지도자 회합에 ' +
    '참석했고, 1953년 재심에서 조작으로 ' +
    '판정나 전원이 복권되었다. ' +
    '\n\n' +
    '유고슬라비아(1918~1926). 1918-12-01 통합 선포 시점의 세르비아 총리였으나 신생 왕국의 ' +
    '초대 총리는 되지 못했다 — 한 달 전 제네바에서 국민회의 측 요구를 상당 부분 수용하는 ' +
    '선언에 서명한 것이 왕조의 이해와 어긋나, 섭정 알렉산다르가 그를 파리 강화회의로 ' +
    '보내고 프로티치에게 조각을 맡겼다. 파리에서 신생 왕국의 승인과 국경을 얻어냈지만 ' +
    '피우메와 케른텐(카린티아)은 잃었다. 1921년 마침내 왕국의 총리가 되어 비도브단 헌법으로 ' +
    '중앙집권 단일국가를 관철했고, 자치를 요구하는 크로아티아 세력을 경찰력과 ' +
    '선거 조작으로 눌렀다 — 그러다 1925년에는 감옥에 넣었던 라디치를 풀어 연립 상대로 삼는 반전을 ' +
    '연출하기도 했다. 1926년 아들 라도미르의 부패 의혹이 터지자 의회를 휴회시켜 막으려 ' +
    '했고, 그것이 야당을 결집시켜 4월 총사퇴로 이어졌다. 그해 12월 9일 국왕에게 아들 문제로 ' +
    '질책만 받고 조각 명령을 얻지 못한 채 물러나온 다음 날 아침, 뇌졸중으로 죽었다. ' +
    '\n\n' +
    '평가. 궐석 사형과 옥중 자백과 아들의 스캔들을 모두 겪고도 반세기를 살아남아 일곱 ' +
    '차례 정부를 이끈 정치적 생존력이 그의 본질이다. 말수가 적고 «овај(이…)»를 입버릇처럼 ' +
    '달아 «바야(Баја)»라 불렸으며, 결단을 미루고 상황이 익기를 기다리는 방식은 동지 페라 ' +
    '토도로비치에게조차 ' +
    '«영원한 우물쭈물»이라 조롱받았지만, 바로 그 방식으로 그는 오스트리아의 경제 봉쇄와 ' +
    '두 차례 발칸 전쟁과 세계대전을 건너 유고슬라비아를 세웠다. 크로아티아 쪽 서술은 ' +
    '그를 «대세르비아·군주제 원칙 위에 비민주적 국가를 세운 사람»으로 기록하고, 세르비아 ' +
    '쪽은 «가장 저명한 세르비아인 100인»(1993)에 넣는다 — 사회주의 유고슬라비아 시절 «마르크스 ' +
    '엥겔스 광장»이던 국회 앞 광장이 1997년 그의 이름을 되찾고 이듬해 동상이 선 것이 그 ' +
    '평가의 진자를 보여준다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
/** 어느 역사국가에 붙일 재임인지 */
type HcKey = 'serbia' | 'scs'

interface TenureSpec {
  title: string
  hc: HcKey
  positionType: GovernmentPositionType
  definitionTitle?: '총리'
  /**
   * 본인 회차(제N차 총리). 세르비아 총리의 «공식 통산 대수»는 사료로 확인되지 않아
   * termNumber는 비운다([[tenure-termnumber-vs-subtermnumber]] 규약).
   */
  subTermNumber?: number
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 */
  appointmentDetail: string
  notes: string
  /** HEAD_OF_GOVERNMENT 재임에만 — 동반 생성할 내각 이름 */
  cabinetName?: string
}

/**
 * ⚠️ 재임 단위에 관하여: 세르비아 사학은 그의 «내각»에 서수를 붙여 1918년까지 제1~12차,
 * SCS 왕국기에 제13~22차로 센다(개각마다 번호가 올라간다). 이 시드는 그 세밀한 내각
 * 단위가 아니라 «연속한 집권 기간»을 재임 1건으로 잡고, 각 기간에 몇 차 내각이 들어가는지는
 * notes와 내각 이름에 적는다 — 22건의 재임·내각을 만드는 대신 인물 상세에서 읽히는 단위로
 * 묶은 것이다.
 */
const TENURES: TenureSpec[] = [
  {
    title: '총리',
    hc: 'serbia',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 1,
    startYear: 1891, startMonth: 2, startDay: 23,
    endYear: 1892, endMonth: 8, endDay: 21,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '구력 1892-08-09 총사퇴 — 이듬해 알렉산다르 1세의 친정 선포로 이어지는 섭정기의 ' +
      '정쟁 속에 물러났다. (일부 사료는 신력 08-22로 적는다.)',
    appointmentDetail:
      '1889년 급진당이 총선에서 승리하고 그가 국민의회 의장·베오그라드 시장을 지낸 뒤, ' +
      '구력 1891-02-11(신력 02-23) 미성년 국왕 알렉산다르 1세 오브레노비치의 섭정 아래 ' +
      '처음으로 총리에 올랐다. 1883년 티모크 봉기로 궐석 사형을 선고받고 불가리아로 ' +
      '망명했던 인물이 8년 만에 정부 수반이 된 셈이다.',
    notes:
      '구력 1891-02-11 ~ 1892-08-09. 세르비아 사학 기준 제1·2차 파시치 내각이 이 기간에 ' +
      '들어간다(구력 1892-03-21 개각). 오브레노비치 왕조 아래에서의 유일한 집권기다.',
    cabinetName: '파시치 1차 집권 (1891~1892, 제1·2차 내각)',
  },
  {
    title: '총리',
    hc: 'serbia',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 2,
    startYear: 1904, startMonth: 12, startDay: 10,
    endYear: 1905, endMonth: 5, endDay: 29,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail: '구력 1905-05-16 사퇴 — 후임은 독립급진당의 류보미르 스토야노비치.',
    appointmentDetail:
      '1903년 5월 쿠데타로 오브레노비치 왕조가 무너지고 페타르 1세 카라조르제비치가 즉위한 ' +
      '뒤, 급진당이 그해 10월 총선에서 승리하면서 구력 1904-11-27(신력 12-10) 총리에 ' +
      '올랐다 — 아바쿠모비치·그루이치에 이은 새 왕조 세 번째 정부이자 그 자신의 첫 ' +
      '카라조르제비치기 집권이다. 1899년 이반단 사건 이후 정계에서 물러나 있던 그의 ' +
      '복귀였다.',
    notes:
      '구력 1904-11-27 ~ 1905-05-16, 제3차 내각. 외무장관을 겸했다. 카라조르제비치 왕조 ' +
      '아래에서의 첫 집권.',
    cabinetName: '파시치 2차 집권 (1904~1905, 제3차 내각)',
  },
  {
    title: '총리',
    hc: 'serbia',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 3,
    startYear: 1906, startMonth: 4, startDay: 30,
    endYear: 1908, endMonth: 7, endDay: 20,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail: '구력 1908-07-07 사퇴 — 후임은 페타르 벨리미로비치.',
    appointmentDetail:
      '오스트리아-헝가리가 세르비아산 돼지 수입을 막으며 시작된 관세 전쟁(«돼지 전쟁») ' +
      '와중인 구력 1906-04-17(신력 04-30) 다시 총리가 되었다 — 전쟁이 터진 것은 그의 ' +
      '취임 전이었고, 판로 재편으로 빈의 경제적 압박을 무력화한 것이 이 집권기의 ' +
      '성적표다(전쟁 자체는 그의 퇴임 뒤 1911-01 새 통상조약 발효로 끝난다).',
    notes:
      '구력 1906-04-17 ~ 1908-07-07, 제4~6차 내각(두 차례 개각). 오스트리아-헝가리와의 ' +
      '관세 전쟁을 지휘해 對오스트리아 수출 의존도를 88%에서 30% 수준으로 떨어뜨리고 ' +
      '독일·프랑스·영국 등으로 판로를 돌렸다 — 경제적 압박으로 세르비아를 굴복시키려던 빈의 ' +
      '기도는 오히려 세르비아를 더 자립시켰다. 1906년 6월 영국의 외교적 압박 속에 1903년 ' +
      '시해에 가담한 장교들을 예편시킨 것도 이 시기다. ⚠️보스니아 병합 위기(1908-10)는 ' +
      '그의 내각이 무너지고 11주 뒤의 일로, 그의 집권기가 아니다.',
    cabinetName: '파시치 3차 집권 (1906~1908, 제4~6차 내각)',
  },
  {
    title: '총리',
    hc: 'serbia',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 4,
    startYear: 1909, startMonth: 10, startDay: 24,
    endYear: 1911, endMonth: 7, endDay: 4,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '구력 1911-06-25 사퇴 — 후임은 밀로반 밀로바노비치. 세르비아어·영어 위키는 후임 ' +
      '취임을 신력 07-04로 적고, 파일 규약(20세기 +13일)으로 환산하면 07-08이라 하루 이상 ' +
      '어긋난다. 후임 취임일을 따랐다.',
    appointmentDetail:
      '보스니아 병합 위기로 세르비아가 굴욕적 후퇴를 강요당한 직후인 구력 1909-10-11 ' +
      '(신력 10-24) 다시 정부를 맡았다 — 병합 위기 자체는 그가 야인이던 시기의 일이지만, ' +
      '그 뒷수습과 군비 재건이 이 집권기의 과제가 되었다.',
    notes: '구력 1909-10-11 ~ 1911-06-25, 제7차 내각. 관세 전쟁의 마무리 국면과 겹친다.',
    cabinetName: '파시치 4차 집권 (1909~1911, 제7차 내각)',
  },
  {
    title: '총리',
    hc: 'serbia',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 5,
    startYear: 1912, startMonth: 9, startDay: 12,
    endYear: 1918, endMonth: 12, endDay: 1,
    endReason: TenureEndReason.STATE_DISSOLVED,
    endReasonDetail:
      '1918-12-01 세르비아가 세르비아-크로아티아-슬로베니아 왕국으로 통합되면서 세르비아 ' +
      '왕국 총리직 자체가 소멸 — 신생 왕국의 각의 의장 직무대행으로 12-20까지 이어졌다.',
    appointmentDetail:
      '구력 1912-08-30(신력 09-12) 발칸 전쟁을 코앞에 두고 다시 정부를 맡았다 — 오스만에 ' +
      '맞선 발칸 동맹 조약 자체는 전임 밀로바노비치가 맺어놓은 것이었고, 그 동맹으로 전쟁을 ' +
      '치르고 강화까지 끌고 가는 일이 그의 몫이 되었다. 이후 6년 3개월, 두 차례의 발칸 ' +
      '전쟁과 제1차 세계대전 전체를 관통하는 최장기 집권이 시작된다.',
    notes:
      '구력 1912-08-30 ~ 1918-12-01(신력), 제8~12차 내각. 총리와 외무장관을 겸했다. ' +
      '①제1·2차 발칸 전쟁을 지휘하고 1913-08-10 부쿠레슈티 강화회의에 세르비아 대표단을 ' +
      '직접 이끌어 바르다르 마케도니아를 확보했다. ②1914-07-23 오스트리아-헝가리의 최후 ' +
      '통첩을 받고 07-25 회답을 직접 기슬 공사에게 건넸다. ③패퇴 후 정부를 니시로 옮겨 ' +
      '1914-12-07 «니시 선언»으로 세르비아·크로아티아·슬로베니아의 통합을 전쟁 목표로 ' +
      '선포했고, 1915~16년 겨울 알바니아 산악을 넘는 «대퇴각» 끝에 코르푸로 망명 정부를 ' +
      '옮겨 1917-07-20 트룸비치의 유고슬라비아 위원회와 «코르푸 선언»을 맺었다. ' +
      '④1917년 솔룬 재판으로 «검은손»의 아피스가 처형된 것도 이 시기이며, 정치적 ' +
      '제거였다는 평가가 따른다.',
    cabinetName: '파시치 5차 집권 (1912~1918, 제8~12차 내각 — 발칸 전쟁·제1차 세계대전)',
  },
  {
    title: '각의 의장 직무대행',
    hc: 'scs',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    startYear: 1918, startMonth: 12, startDay: 1,
    endYear: 1918, endMonth: 12, endDay: 20,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '섭정 알렉산다르가 정식 조각 명령을 스토얀 프로티치에게 주면서 이임 — 당론상 초대 ' +
      '총리는 파시치여야 했으나, 섭정이 그의 입지를 누르려 프로티치를 앉히고 파시치는 파리 ' +
      '강화회의 대표로 보냈다.',
    appointmentDetail:
      '1918-12-01 통합 선포 시점의 세르비아 총리였으므로, 신생 왕국의 각의 의장 직무를 ' +
      '«마지막 세르비아 총리 자격으로» 20일간 대행했다. 정식 조각 명령은 끝내 받지 못했다 — ' +
      '1918년 11월 제네바 회의에서 슬로베니아·크로아티아·세르비아 국민회의 측 요구를 상당 ' +
      '부분 수용하는 선언에 서명한 것이 카라조르제비치 왕조의 이해와 어긋나 섭정과의 관계가 ' +
      '식은 것이 직접 원인으로 지목된다.',
    notes:
      '1918-12-01 ~ 12-20(신력). 정식 총리가 아닌 직무대행이라 내각(Cabinet)은 만들지 ' +
      '않는다. 프로티치의 초대 내각은 17명 중 11명이 파시치의 급진당이 아닌 민주당 ' +
      '출신이었다.',
  },
  {
    title: '총리',
    hc: 'scs',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 6,
    startYear: 1921, startMonth: 1, startDay: 1,
    endYear: 1924, endMonth: 7, endDay: 28,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '사퇴 — 후임은 류보미르 다비도비치(1924-07-28 ~ 11-06). 종료일은 07-27설과 07-28설이 ' +
      '갈린다.',
    appointmentDetail:
      '1920-11-28 제헌의회 선거에서 급진당이 419석 중 91석을 얻어 민주당(92석)과 사실상 ' +
      '비긴 뒤, 1921-01-01 왕국의 총리가 되었다 — 통합 3년 만에 마침내 신생국의 정부 수반 ' +
      '자리에 올랐다. 이 집권기에 페타르 1세가 죽고(1921-08) 알렉산다르 1세가 즉위한다.',
    notes:
      '1921-01-01 ~ 1924-07-28. 세르비아 사학 기준 제13~19차 내각. ①1921-06-28 비도브단 ' +
      '헌법을 «주요 입안자» 중 한 사람으로 관철했다 — 역사적 지방을 폐지하고 33개 ' +
      '오블라스트로 나눈 중앙집권 단일국가 체제로, 표결(찬성 223)은 이슬람 조직 등에 농지개혁 관련 ' +
      '보상을 약속해 얻어낸 것이었다. ②라디치의 크로아티아 농민당은 제헌의회를 보이콧해 ' +
      '표결에 불참했고, 이후 그의 정부는 경찰력·선전물 압수·선거 조작으로 자치파를 눌렀다. ' +
      '③1924-01-27 로마 협정으로 이탈리아의 피우메 병합을 승인했다.',
    cabinetName: '파시치 SCS 1차 집권 (1921~1924, 제13~19차 내각)',
  },
  {
    title: '총리',
    hc: 'scs',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    subTermNumber: 7,
    startYear: 1924, startMonth: 11, startDay: 6,
    endYear: 1926, endMonth: 4, endDay: 8,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '아들 라도미르의 부패 의혹으로 야당의 총공세를 받자 1926-04-04 국왕에게 내각 총사퇴를 ' +
      '제출했고 04-08 우주노비치가 조각하며 물러났다 — 국가 조달 계약이 민간가보다 30~100% ' +
      '비싸게 체결된 것이 문제였고, 그가 의혹을 의회에서 다루지 못하게 하려 국민의회를 ' +
      '휴회시킨 것이 야당을 결집시켰다.',
    appointmentDetail:
      '다비도비치 정부가 석 달여 만에 무너진 뒤 1924-11-06 다시 총리가 되었다 — 78세였다. ' +
      '이 마지막 집권기에 그는 오랜 적수 라디치를 감옥에서 끌어내 연립 상대로 삼는 반전을 ' +
      '연출한다.',
    notes:
      '1924-11-06 ~ 1926-04-08, 제20~22차 내각. ①1924-12-23 라디치의 크로아티아 공화농민당 ' +
      '(HRSS)에 1921년 국가보안법(Zakon o zaštiti države)을 적용해 활동을 금지하고 ' +
      '1925-01-05 그를 체포했으나, 옥중에서도 그의 당은 1925-02 총선에서 67석을 얻었다 ' +
      '(1920-12 «오브즈나나»는 공산당을 겨눈 별개 포고라 이 조치와 혼동하지 말 것). ' +
      '②1925-03-27 파블레 라디치가 스체판의 지시로 의회에서 당의 왕조·비도브단 헌법 수용을 ' +
      '선언했고, 이후 스체판 라디치가 풀려나 연립에 합류해 1925-11 교육장관이 되었다 — ' +
      '제22차 내각에는 그 라디치가 앉아 있었다. ③그 내각이 아들의 부패 의혹으로 무너지며 반세기 정치 인생이 끝났다.',
    cabinetName: '파시치 SCS 2차 집권 (1924~1926, 제20~22차 내각)',
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
    title: '자예차르 출생',
    category: 'FAMILY',
    startYear: 1845, startMonth: 12, startDay: 18,
    description:
      '구력 12-06 성 니콜라이 축일. 소상인 페타르의 아들로, 조부는 빵집을 했다. 본인은 조상이 ' +
      '테토보 인근 로가체보 출신이라 밝혔다. 학교는 열한 살에야 들어가 네고틴·크라구예바츠 ' +
      '김나지움을 스물한 살에 우수한 성적으로 마쳤다.',
  },
  {
    title: '취리히 공과대학 유학',
    category: 'EDUCATION',
    startYear: 1868, endYear: 1872,
    description:
      '베오그라드 고등학교(벨리카 슈콜라, 오늘날 베오그라드 대학교의 전신) 기술학부를 ' +
      '거쳐 우수 학생으로 국비 유학 — 철도·토목을 ' +
      '전공해 1872년 3월 졸업했다. 이곳에서 스베토자르 마르코비치와 가까워졌고, 페라 ' +
      '토도로비치·라자르 파추 등 훗날 급진당의 중핵이 될 세르비아 유학생 무리가 함께 있었다. ' +
      '러시아 인민주의자들과 접촉해 한때 바쿠닌의 영향을 받았다는 서술도 있다.',
  },
  {
    title: '귀국 — 부속 기사',
    category: 'CAREER',
    startYear: 1873, startMonth: 5,
    description:
      '부다페스트-빈 철도 건설 현장에서 1년 실습한 뒤 1873년 3월 베오그라드로 돌아와 5월 ' +
      '건설부 부속 기사가 되었다. 1875년 의원 출마를 위해 관직에서 물러났다.',
  },
  {
    title: '국민의회 의원 당선',
    category: 'POLITICAL',
    startYear: 1878,
    description: '자예차르에서 당선 — 정당이 정식으로 서기 전이었다.',
  },
  {
    title: '인민급진당 창당',
    category: 'POLITICAL',
    startYear: 1881, startMonth: 1, startDay: 20,
    description:
      '기관지 «자치»에 강령을 발표하며 창당(구력 01-08). 인민주권·보통선거·지방분권·사법 ' +
      '독립·공평 과세를 내걸었고, 그는 초대 중앙위원장이 되어 1926년 죽을 때까지 45년간 ' +
      '당을 이끌었다.',
  },
  {
    title: '티모크 봉기 — 사바강을 건너 망명',
    category: 'EXILE',
    startYear: 1883, startMonth: 11, startDay: 6,
    description:
      '구력 10-25 정오 사바강을 건너 탈출했고, 그날 밤 급진당 중앙위원 전원이 체포됐으나 ' +
      '그만 빠져나갔다. 정부가 상비군 창설을 이유로 민간의 총기를 걷으려 하자 급진당 지지 ' +
      '지역이 거부하며 터진 봉기였다(구력 10-20~11-02).',
  },
  {
    title: '궐석 사형 선고',
    category: 'POLITICAL',
    startYear: 1883, startMonth: 12,
    description:
      '구력 1883-12 궐석 재판에서 사형. 진압으로 수십 명이 처형되고 수백 명이 중형을 받았다.',
  },
  {
    title: '불가리아 망명 6년',
    category: 'EXILE',
    startYear: 1883, endYear: 1889,
    description:
      '소피아에서 건설 청부업으로 생계를 꾸리고 내무부에서도 잠시 일했다. 불가리아 정부의 ' +
      '그에 대한 비호는 1885년 밀란 국왕이 세르비아-불가리아 전쟁을 일으킨 명분 중 하나가 ' +
      '되었고, 패전 후 밀란은 티모크 봉기 관련자를 사면하면서 그만 제외했다.',
  },
  {
    title: '사면·귀국',
    category: 'POLITICAL',
    startYear: 1889, startMonth: 3,
    description:
      '밀란 국왕 퇴위(1889-03-06) 며칠 뒤 새로 선 사바 그루이치의 급진당 정부가 사면했다. ' +
      '티모크 봉기 관련 사면 일자를 구력 1889-11-27로 적는 사료도 있으나, 그가 ' +
      '1889-10-13 국민의회 의장으로 선출된 것과 앞뒤가 맞지 않는다.',
  },
  {
    title: '베오그라드 시장',
    category: 'POLITICAL',
    startYear: 1890, startMonth: 1, startDay: 11,
    endYear: 1891, endMonth: 1, endDay: 26,
    description: '구력 1889-12-30 ~ 1891-01-14. 1897년에도 한 차례 더 시장을 지냈다.',
  },
  {
    title: '주러시아 특별대표',
    category: 'DIPLOMATIC',
    startYear: 1893, endYear: 1894,
    description:
      '알렉산다르 국왕이 그를 국내 정치에서 떼어놓으려 페테르부르크로 보냈다 — 전 국왕 ' +
      '밀란의 무단 귀국에 항의해 사임했다고 전한다.',
  },
  {
    title: '이반단 사건 — 옥중 자백',
    category: 'POLITICAL',
    startYear: 1899, startMonth: 7, startDay: 6,
    description:
      '구력 06-24 전 국왕 밀란 저격 미수 직후 급진당 지도부가 일제히 검거되었다. 밀란은 ' +
      '그에게 사형을 구형하도록 압박했으나, 친러 성향의 그를 처형하면 러시아가 보복하리라 ' +
      '본 오스트리아-헝가리가 개입해 막았다. 그 사실을 모른 채 그는 «급진당이 오브레노비치 ' +
      '왕조에 불충했다»고 자백했고 — 평생 씻지 못한 오점이 되었다. 이후 정계에서 물러났다.',
  },
  {
    title: '1903년 5월 쿠데타 — 왕조 교체',
    category: 'POLITICAL',
    startYear: 1903, startMonth: 6, startDay: 11,
    description:
      '구력 05-28~29 밤 장교단이 알렉산다르 오브레노비치 국왕 부부를 시해했다. 그는 ' +
      '모의에 가담하지 않았고 당시 정계를 떠나 있었다 — 그러나 카라조르제비치 왕조가 서고 ' +
      '급진당이 그해 10월 총선에서 이기면서 복귀의 길이 열렸다.',
  },
  {
    title: '부쿠레슈티 강화 — 대표단 수석',
    category: 'DIPLOMATIC',
    startYear: 1913, startMonth: 8, startDay: 10,
    description:
      '제2차 발칸 전쟁을 끝낸 강화회의에 세르비아 대표단을 직접 이끌어 바르다르 마케도니아 ' +
      '(오흐리드·비톨라 등)를 확보했다 — 세르비아 영토와 인구가 크게 늘었다.',
  },
  {
    title: '사라예보 암살 사전 경고 논쟁',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 6, startDay: 18,
    description:
      '주오스트리아 공사 요반 요바노비치에게 «보스니아에서 대공 암살 음모가 있다고 믿을 ' +
      '근거가 있다»는 취지의 구체성 없는 전보가 갔고, 06-21 그가 빌린스키 재무장관에게 ' +
      '우회적으로 경고했다. 파시치는 사후 두 차례 인터뷰에서 사전 인지를 부인했다. ' +
      '알베르티니는 그가 대강은 알았으나 이름도 무기도 적지 않은 채 군부에 가까운 인물을 ' +
      '통해 전달함으로써 «알렸다»는 알리바이만 남겼다고 본다 — 당시 그는 총사퇴하고 ' +
      '08-14 총선을 앞둔 과도내각의 총리였고 군부와 대립하고 있었다. 반면 초로비치는 전혀 몰랐다고 본다.',
  },
  {
    title: '최후통첩 접수 — 부재중',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 23,
    description:
      '기슬 공사가 오후 6시 베오그라드에서 48시간 시한의 최후통첩을 전달했을 때 그는 08-14 ' +
      '총선 유세로 지방에 있다가 테살로니키로 향하던 중이었다 — 재무장관 파추와 외무부 ' +
      '사무총장 그루이치가 대신 받았고, 섭정 알렉산다르가 즉시 귀경을 명했다.',
  },
  {
    title: '회답 전달 — 총동원 3시간 뒤',
    category: 'DIPLOMATIC',
    startYear: 1914, startMonth: 7, startDay: 25,
    description:
      '오전 각의에서 내무장관 프로티치가 주로 기초한 회답이 만들어졌다 — 러시아가 지지 ' +
      '의사를 알려온 가운데 대부분을 수용하되, 오스트리아 관리가 세르비아 영내 수사에 ' +
      '참여하는 제6항만 헌법을 들어 거부했다. 세르비아는 오후 3시 이미 총동원을 발령한 ' +
      '뒤였고, 시한 5분 전인 오후 5시 55분 그가 직접 기슬에게 회답을 건넸다 — 아무도 그 ' +
      '일을 맡으려 하지 않았다. 최후통첩을 기초한 무술린은 이 회답을 «외교적 기교의 가장 ' +
      '빛나는 본보기»라 했고 빌헬름 2세는 «전쟁의 명분이 모두 사라졌다»고 적었으나, ' +
      '클라크는 양보하는 인상만 주고 실제로는 거의 내주지 않은 «향수 뿌린 거절»이라 본다.',
  },
  {
    title: '니시 선언 — 남슬라브 통합을 전쟁 목표로',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 12, startDay: 7,
    description:
      '구력 11-24, 니시로 옮긴 국민의회에서 연립내각의 시정 방침으로 «이 전쟁은 시작되는 ' +
      '순간 아직 자유롭지 못한 우리 형제 세르비아인·크로아티아인·슬로베니아인의 해방과 ' +
      '통일을 위한 투쟁이 되었다»고 선포했다 — 유고슬라비아 건국의 최초 공식 선언이다. ' +
      '나흘 전 콜루바라 반격이 시작돼 곧 베오그라드를 되찾는 국면이었다.',
  },
  {
    title: '알바니아 대퇴각 — 코르푸 망명정부',
    category: 'TRAVEL',
    startYear: 1915, startMonth: 11,
    endYear: 1916, endMonth: 2,
    description:
      '독일·불가리아의 협공으로 1915-11 정부와 최고사령부가 몬테네그로·알바니아 산악을 넘는 ' +
      '퇴각을 결정했다 — 26만 명이 넘는 인원이 아드리아해로 빠져나가 코르푸 등지로 옮겨졌고, ' +
      '망명 정부가 그곳에 섰다.',
  },
  {
    title: '코르푸 선언 — 트룸비치와 공동 서명',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 7, startDay: 20,
    description:
      '구력 07-07. 35일간 28차례 본회의 끝에 유고슬라비아 위원회 의장 트룸비치와 함께 ' +
      '서명했다 — 세 이름을 가진 한 민족, 카라조르제비치 왕조 아래의 입헌군주국, 세 국명· ' +
      '세 국기·두 문자·세 종교의 평등, 보통선거와 제헌의회를 규정했다. 국가 형태(중앙집권 ' +
      '대 연방)는 제헌의회로 미뤄 뒷날의 갈등을 예고했다.',
  },
  {
    title: '솔룬 재판 — 아피스 처형',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 6, startDay: 26,
    description:
      '«검은손»의 아피스(드라구틴 디미트리예비치)가 섭정 암살 모의 혐의로 사형돼 총살됐다. ' +
      '파시치는 기소에 앞서 열린 정치 지도자 회합에 참석했고 섭정이 재가했으며, 그는 사면 ' +
      '요구를 물리쳤다. ' +
      '1953년 세르비아 최고법원 재심에서 전원 무죄로 복권되며 «조작된 재판»으로 판정났다.',
  },
  {
    title: '제네바 선언 — 섭정과의 균열',
    category: 'DIPLOMATIC',
    startYear: 1918, startMonth: 11, startDay: 9,
    description:
      '제네바 회의에서 슬로베니아·크로아티아·세르비아 국민회의 측 요구를 상당 부분 수용하는 ' +
      '이원적 국가 구상에 «세르비아를 대표해» 서명했다 — 카라조르제비치 왕조의 이해와 ' +
      '어긋나 섭정 알렉산다르와의 관계가 식었고, 통합 후 초대 총리 자리를 놓치는 직접 ' +
      '원인이 되었다.',
  },
  {
    title: '세르비아-크로아티아-슬로베니아 왕국 성립',
    category: 'POLITICAL',
    startYear: 1918, startMonth: 12, startDay: 1,
    description:
      '통합 선포 시점의 세르비아 총리로서 신생 왕국 각의 의장을 20일간 대행했다. 당론상 ' +
      '초대 총리는 그여야 했으나 섭정이 프로티치에게 조각을 맡기고 그는 파리 강화회의 ' +
      '대표로 보내졌다.',
  },
  {
    title: '파리 강화회의 대표단 수석',
    category: 'DIPLOMATIC',
    startYear: 1919,
    description:
      '트룸비치·베스니치 등과 함께 대표단을 이끌어 신생 왕국의 승인과 불가리아·알바니아 ' +
      '국경(뇌이 조약으로 서부 변경 약 2,563㎢ 획득), 달마티아 대부분을 확보했다 — 그러나 ' +
      '피우메와 케른텐 대부분은 잃었다. 중앙집권파인 그와 트룸비치의 국가 구상 충돌이 ' +
      '대표단 내부의 큰 장애였다.',
  },
  {
    title: '비도브단 헌법',
    category: 'POLITICAL',
    startYear: 1921, startMonth: 6, startDay: 28,
    description:
      '제헌의회에서 찬성 223표로 통과 — 역사적 지방을 없애고 33개 오블라스트로 나눈 ' +
      '중앙집권 단일국가 체제로, 그가 «주요 입안자» 중 하나였다. 이슬람 조직 등에 농지개혁 ' +
      '보상을 약속해 표를 모았고, 라디치의 크로아티아 공화농민당(HRSS)은 보이콧으로 ' +
      '표결에 불참했다.',
  },
  {
    title: '라디치와의 연립',
    category: 'POLITICAL',
    startYear: 1925, startMonth: 11, startDay: 17,
    description:
      '1924-12 그의 정부가 라디치의 크로아티아 공화농민당에 1921년 국가보안법을 적용해 ' +
      '활동을 금지하고 1925-01 그를 체포했으나, 옥중에서도 그 당은 총선에서 67석을 얻었다. ' +
      '1925-03-27 파블레 라디치가 스체판의 지시로 의회에서 공화주의를 접고 왕조·비도브단 ' +
      '헌법을 받아들인다고 선언했고, 이후 스체판 라디치가 풀려나 연립에 들어와 11월 ' +
      '교육장관이 되었다 — 평생의 적수를 내각에 앉힌 만년의 반전.',
  },
  {
    title: '아들 부패 의혹 — 사퇴',
    category: 'POLITICAL',
    startYear: 1926, startMonth: 4, startDay: 4,
    description:
      '아들 라도미르가 얽힌 국가 조달 비리(민간가보다 30~100% 비싼 계약)가 쟁점이 되자 ' +
      '의회를 휴회시켜 논의를 막으려 했고, 이것이 야당을 결집시켰다. 04-04 국왕에게 총사퇴를 ' +
      '제출하고 04-08 우주노비치가 조각하며 물러났다.',
  },
  {
    title: '마지막 알현과 죽음',
    category: 'PERSONAL',
    startYear: 1926, startMonth: 12, startDay: 10,
    description:
      '12-09 오후 한 시간 알렉산다르 1세를 알현했으나 국왕은 아들 문제를 질책하며 새 조각 ' +
      '명령을 주지 않았다. 그날 저녁 쓰러져 이튿날 아침 9시 뇌졸중으로 사망 — 81번째 생일을 ' +
      '여드레 앞둔 때였다. 베오그라드 신묘지(노보 그로블레)에 안장되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const PASIC_STATS = {
  politics: 92,
  military: 30,
  diplomacy: 82,
  intellect: 68,
  charisma: 58,
  administration: 65,
  notes:
    '48년을 세르비아 정치의 중심에 있으면서 일곱 차례 정부를 이끈 생존력이 이 인물의 본체다 ' +
    '(정치) — 1883년 궐석 사형 선고를 받고 망명한 사람이 8년 뒤 총리가 되었고, 1899년 옥중 ' +
    '자백으로 평판이 무너진 뒤에도 돌아왔으며, 1925년에는 감옥에 넣었던 라디치를 연립 상대로 ' +
    '끌어냈다. 외교에서는 부쿠레슈티 강화로 바르다르 마케도니아를 확보하고 코르푸 선언으로 ' +
    '유고슬라비아 건국의 틀을 잡았으며 파리에서 신생 왕국의 승인을 받아냈다 — 다만 피우메와 ' +
    '케른텐은 잃었다. 말수가 적고 «овај(이…)»를 입버릇처럼 달아 «바야»라 불린 화법, 결단을 미루며 상황이 ' +
    '익기를 기다리는 방식은 동지들에게조차 «영원한 우물쭈물»이라 비판받았다(카리스마). ' +
    '군 경력은 없고, 만년의 중앙집권 통치와 아들의 부패 스캔들은 행정 평가를 끌어내린다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedPasic(prisma: PrismaService): Promise<void> {
  console.log('\n🧔 니콜라 파시치(Nikola Pašić) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const serbia = await prisma.historicalCountry.findFirst({
    where: { name: '세르비아 왕국 (근대)' },
    select: { id: true },
  })
  if (!serbia) {
    console.warn(
      '  ⚠️  «세르비아 왕국 (근대)» HC 미존재 — 먼저 seedSerbiaHistoricalCountries 실행 필요. 시딩 중단.',
    )
    return
  }
  const scs = await prisma.historicalCountry.findFirst({
    where: { name: '세르비아-크로아티아-슬로베니아 왕국' },
    select: { id: true },
  })
  if (!scs) {
    console.warn('  ⚠️  SCS 왕국 HC 미존재 — 해당 재임·소속 연결을 건너뛴다.')
  }
  const hcIdByKey: Record<HcKey, string | undefined> = { serbia: serbia.id, scs: scs?.id }

  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Nikola Pašić' } },
        { AND: [{ name: '니콜라' }, { surname: '파시치' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = PASIC.originalName
    if (!person.biography) patch.biography = PASIC.biography
    if (!person.birthPlaceText) patch.birthPlaceText = PASIC.birthPlaceText
    if (!person.birthNote) patch.birthNote = PASIC.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = PASIC.deathPlaceText
    if (!person.deathType) patch.deathType = PASIC.deathType
    if (!person.deathCause) patch.deathCause = PASIC.deathCause
    if (!person.deathNote) patch.deathNote = PASIC.deathNote
    if (person.influence == null) patch.influence = PASIC.influence
    if (!person.historicalCountryId) patch.historicalCountryId = serbia.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${PASIC.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${PASIC.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: PASIC.name,
        middleName: PASIC.middleName,
        surname: PASIC.surname,
        originalName: PASIC.originalName,
        biography: PASIC.biography,
        birthDate: toDate(PASIC.birthYear, PASIC.birthMonth, PASIC.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: PASIC.birthNote,
        deathDate: toDate(PASIC.deathYear, PASIC.deathMonth, PASIC.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: PASIC.deathType,
        deathCause: PASIC.deathCause,
        deathNote: PASIC.deathNote,
        gender: PASIC.gender,
        nameDisplayOrder: 'western' as any,
        influence: PASIC.influence,
        birthPlaceText: PASIC.birthPlaceText,
        deathPlaceText: PASIC.deathPlaceText,
        historicalCountryId: serbia.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${PASIC.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 (+ 총리 재임에는 내각 동반) ─────────────────────────────────────
  for (const t of TENURES) {
    const hcId = hcIdByKey[t.hc]
    if (!hcId) {
      console.warn(`  ⚠️  HC 미존재로 재임 건너뜀: ${t.title} (${t.startYear})`)
      continue
    }
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: hcId,
        positionType: t.positionType,
        startDate,
      },
    })
    if (existing) {
      tenureId = existing.id
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
    } else {
      const created = await prisma.governmentPositionTenure.create({
        data: {
          personId,
          historicalCountryId: hcId,
          positionDefinitionId: t.definitionTitle === '총리' ? (pmDef?.id ?? undefined) : undefined,
          positionType: t.positionType,
          title: t.title,
          subTermNumber: t.subTermNumber,
          startDate,
          startDatePrecision,
          endDate: toDate(t.endYear, t.endMonth, t.endDay),
          appointmentMethod: AppointmentMethod.APPOINTMENT,
          appointmentDetail: t.appointmentDetail,
          endReason: t.endReason,
          endReasonDetail: t.endReasonDetail,
          notes: t.notes,
          accountId: admin.id,
        },
      })
      tenureId = created.id
      console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
    }

    // 행정부(Cabinet) — 총리 임기 1건당 내각 1건 (행정부 뷰 노출용)
    if (t.cabinetName) {
      const cab = await prisma.cabinet.findUnique({ where: { headTenureId: tenureId } })
      if (cab) {
        console.log(`  ⏭️  내각 스킵 (이미 존재): ${cab.name ?? t.cabinetName}`)
      } else {
        await prisma.cabinet.create({
          data: { headTenureId: tenureId, name: t.cabinetName, accountId: admin.id },
        })
        console.log(`  🏛️  내각: ${t.cabinetName}`)
      }
    }
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: { historicalCountryId: string; label: string; priority: number; note?: string }[] = [
    {
      historicalCountryId: serbia.id,
      label: '세르비아 왕국 (출생·복무 1845~1918)',
      priority: 0,
    },
  ]
  if (scs) {
    affiliations.push({
      historicalCountryId: scs.id,
      label: '세르비아-크로아티아-슬로베니아 왕국 (1918~1926)',
      priority: 1,
      note: '자신이 건국에 관여한 신생 왕국의 국민이자 총리로 만년을 보냈다.',
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
        politics: PASIC_STATS.politics,
        military: PASIC_STATS.military,
        diplomacy: PASIC_STATS.diplomacy,
        intellect: PASIC_STATS.intellect,
        charisma: PASIC_STATS.charisma,
        administration: PASIC_STATS.administration,
        notes: PASIC_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${PASIC_STATS.politics}·군사 ${PASIC_STATS.military}·` +
        `외교 ${PASIC_STATS.diplomacy}·학식 ${PASIC_STATS.intellect}·` +
        `카리스마 ${PASIC_STATS.charisma}·행정 ${PASIC_STATS.administration}`,
    )
  }

  console.log('✅ 니콜라 파시치 시딩 완료\n')
}
