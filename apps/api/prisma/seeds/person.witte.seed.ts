/**
 * 세르게이 율리예비치 비테 (Sergei Yulyevich Witte, 1849~1915) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure/Cabinet 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 정치가·재정가. 재무장관(1892~1903)으로 금본위제·주류 전매·시베리아
 * 횡단철도를 밀어붙여 제국 공업화의 설계자가 되었고, 1905년 포츠머스 강화를 성사시킨 뒤
 * 10월 선언을 기초하고 개편된 대신회의의 초대 의장(총리)이 되었다 — 제국 역사상 첫
 * «총리»다.
 *
 * 날짜 규약: 러시아 관보 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(19세기 +12일, 20세기 +13일). 구력 원일자는 notes·birthNote에 병기.
 *
 * 관직 매핑 규약:
 *  - 대신회의 의장(Совет министров, 1905-10~1906-04)만 HEAD_OF_GOVERNMENT + '총리' 정의
 *    + Cabinet 행 동반([[project_cabinet_must_accompany_pm_tenure]]), termNumber=1.
 *    고레미킨 시드가 «비테1 → 고레미킨2 → 스톨리핀3 → 코콥초프4 → 고레미킨5» 축을 이미
 *    전제하고 있어 여기서 제1대가 확정된다.
 *  - 대신위원회 의장(Комитет министров, 1903~1905)은 정부 수반이 아닌 조정 기구의 장이라
 *    HEAD_OF_GOVERNMENT로 두지 않고 SPECIAL_POSITION으로 기록한다(팔레올로그의 외무부
 *    사무총장 선례). 실권 없는 «영전»이었다는 성격도 notes에 남긴다.
 *  - 교통장관은 카탈로그에 대응 정의가 없어 title 직접 기입(크리보셰인 폴백 규약).
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('총리'·'재무장관' 관직 정의).
 *
 * 등록 항목:
 *  - Person x1 (비테 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x5 (철도사무국장·교통장관·재무장관·대신위원회 의장·총리)
 *    + Cabinet x1 (총리 재임 동반) — 신규 생성이므로 appointmentDetail을 create에 직접 넣는다
 *  - PersonCountryAffiliation x1 (러시아 제국 CITIZENSHIP)
 *  - PersonLifeEvent x33 (연보)
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
const WITTE = {
  name: '세르게이',
  middleName: '율리예비치',
  surname: '비테',
  originalName: 'Sergei Yulyevich Witte (Сергей Юльевич Витте)',
  gender: 'MALE' as const,
  birthYear: 1849, birthMonth: 6, birthDay: 29,
  birthNote:
    '구력(율리우스력) 1849-06-17 출생 — 신력 환산 06-29. 아버지 율리우스 크리스토프 하인 ' +
    '리히 게오르크 비테(1814~1868)는 쿠를란트 독일계 시민 가문 출신으로 — 네덜란드 기원설은 ' +
    '집안 전승이고 18세기에 이미 완전히 독일화했다 — 결혼을 위해 루터교에서 정교로 개종해 ' +
    '«율리 표도로비치»가 되었다. 어머니 예카테리나 안드레예브나 파데예바(1821~1897)의 ' +
    '어머니가 돌고루코프 공작가의 옐레나 파블로브나 공녀여서 외가로 공작가와 닿는다. ' +
    '신지학회 창시자 헬레나 블라바츠키는 이종사촌 누이. 비테 가는 1849년 출생 시점에는 ' +
    '아직 러시아 세습귀족이 아니었고 1856년에 등재되었다.',
  birthPlaceText: '러시아 제국 티플리스 (현 조지아 트빌리시)',
  deathYear: 1915, deathMonth: 3, deathDay: 13,
  deathPlaceText: '러시아 제국 페트로그라드 카멘노오스트롭스키 대로 자택',
  deathType: DeathType.NATURAL,
  deathCause: '수막염 — 중이염이 뇌막으로 번진 것으로 전한다 (향년 65세).',
  deathNote:
    '구력 1915-02-28 사망. 장례는 구력 03-02 알렉산드르 넵스키 대수도원 성령교회에서 ' +
    '치러졌으나 «3등급»의 조촐한 규모였고 공식 의전은 없었다 — 니콜라이 2세가 그의 죽음에 ' +
    '안도했다고 전해질 만큼 만년의 그는 궁정에서 배척당했다. 라자렙스코예 묘지(18세기 ' +
    '네크로폴)에 안장 — 영어권 일부 자료의 «티흐빈 묘지»는 오류다. 검은 화강암 묘석에는 ' +
    '생몰년 외에 «1905년 10월 17일»이라는 제3의 날짜가 새겨졌다(그가 기초한 10월 선언). ' +
    '사망 당일 밤 당국이 그의 서재를 봉인하고 회고록을 찾아 자택과 비아리츠 별장까지 ' +
    '수색했으나 원고는 이미 바욘의 은행 금고에 옮겨져 있어 압수에 실패했다.',
  influence: 88,
  biography:
    '러시아 제국의 정치가·재정가. 재무장관(1892~1903)으로 금본위제와 주류 전매, 시베리아 ' +
    '횡단철도를 밀어붙여 제국 공업화의 설계자가 되었고, 1905년 포츠머스 강화를 성사시킨 뒤 ' +
    '10월 선언을 발의해 제국 최초의 헌정 문서를 만들었으며, 개편된 대신회의의 초대 의장 — ' +
    '제국 역사상 첫 «총리» — 이 되었다. 궁정의 배척과 대중의 조롱을 동시에 받으면서도 ' +
    '제정 말기 20년의 국가 정책을 사실상 혼자 설계한 인물이다. ' +
    '\n\n' +
    '출신과 교육(1849~1870). 티플리스에서 캅카스 총독부 관리의 아들로 태어났다. 아버지는 ' +
    '결혼을 위해 루터교에서 정교로 개종한 쿠를란트 독일계였고 — 집안이 내세운 네덜란드 ' +
    '기원설은 전승에 가깝다 — 어머니 쪽으로는 돌고루코프 공작가와 닿았다(신지학회 창시자 ' +
    '블라바츠키가 이종사촌 누이다). 비테 가가 러시아 세습귀족으로 등재된 것은 그가 태어난 ' +
    '뒤인 1856년이다. 오데사의 노보로시스크 대학 물리수학부를 1870년 졸업했고 한때 수학 ' +
    '교수직을 생각했으나 집안의 반대로 철도로 향했다. ' +
    '\n\n' +
    '철도인(1870~1889). 대학 출신으로는 이례적으로 매표소 견습부터 시작해 역장·검수관· ' +
    '운전 감독을 차례로 거쳤다 — 훗날 그의 실무 감각의 원천이 된 이력이다. 1875년 말 ' +
    '틸리굴 참사(신병 419명을 태운 군용열차 탈선, 약 140명 사망)로 금고 4개월을 선고받았 ' +
    '으나 러시아-튀르크 전쟁의 병력 수송 공로로 영창 2주로 감형되었다. 1883년 «화물 운송 ' +
    '철도 운임의 원리»로 전문가 사회에서 이름을 얻었고, 1886년 남서철도회사 지배인이 되어 ' +
    '연봉 4만 루블의 민간 경영자가 되었다. ' +
    '\n\n' +
    '보르키와 발탁(1888~1892). 1888년 여름 알렉산드르 3세 앞에서 «화물기관차 두 대로 황제 ' +
    '열차를 과속시키면 안 된다»며 철도 관리들과 맞섰고, 두 달 뒤 보르키에서 황실 열차가 ' +
    '정확히 그 이유로 탈선해 21명이 즉사했다. 이 일로 황제의 눈에 들어 1889년 재무부 ' +
    '철도사무국의 초대 국장이 되었다 — 연봉이 4만에서 3천 루블로 떨어지자 황제가 사재를 ' +
    '보태 채워주었다. 1892년 2월 교통장관, 반년 만인 8월 재무장관에 올랐다. ' +
    '\n\n' +
    '재무장관 11년(1892~1903). ①금본위제 — 1897년 1월 칙령으로 금화의 함량은 그대로 두고 ' +
    '액면만 10→15루블로 올려 신용루블을 1/3 절하했고, 그해 8월 발권법으로 국립은행을 무제한 ' +
    '금태환의 발권 중심으로 만들었다. 루블은 1914년까지 태환을 유지하며 세계 4위의 통화가 ' +
    '되었지만, 국가채무가 약 16억 금루블 늘었다는 비판도 함께 남았다. ②주류 전매(1895년 ' +
    '국영 소매 개시)는 1913년 세입의 26%를 담당하는 최대 단일 재원이 되었다. ③시베리아 ' +
    '횡단철도(1891~)를 전액 국고로 밀어붙였고, 1896년 이홍장과의 밀약으로 만주를 가로지르는 ' +
    '동청철도 부설권을 얻었다 — 러청은행을 앞세워 국가 개입을 감춘 설계였다. ④1891년 ' +
    '보호관세(멘델레예프 참여)와 1893~94년 독일 관세전쟁 끝의 통상조약, 외자 유치, 1897년 ' +
    '공장법(하루 11.5시간 상한)까지가 그의 몫이다. 1890년대 러시아 공업은 연평균 7.6% ' +
    '성장했다. ' +
    '\n\n' +
    '실각(1903). 그의 전략은 무력이 아닌 경제적 침투였으나, 압록강 삼림 이권을 앞세워 ' +
    '한반도·만주로 밀고 들어가려는 베조브라조프 일파와 내무장관 플레베의 협공에 밀렸다. ' +
    '1903년 8월 극동 총독부가 신설되고 17일 뒤, 그는 부처 통할권도 정책 책임도 없는 ' +
    '대신위원회 의장으로 «영전»되며 사실상 경질되었다 — 그가 막으려던 전쟁은 이듬해 ' +
    '터졌다. ' +
    '\n\n' +
    '포츠머스(1905). 패전국의 수석전권으로 미국에 건너가 배상금 지불을 완전히 막고 사할린 ' +
    '전도를 요구하던 일본을 남반부 할양에서 멈춰 세웠다. 다만 그 자신이 회담 직전 본국에 ' +
    '사할린 전도 할양까지 건의했고 «한 뼘의 땅도 안 된다»는 차르의 재가 문구가 강경 자세를 ' +
    '강제했다는 기록도 남아 있다. 귀국 후 백작 작위를 받았지만, 반대파는 무공 백작의 명예 ' +
    '성씨를 패러디해 그를 «반쪽 사할린 백작»이라 불렀다. ' +
    '\n\n' +
    '10월 선언과 초대 총리(1905~1906). 전국 총파업으로 제정이 벼랑에 몰리자 «군사독재냐 ' +
    '헌정 양보냐»를 논한 상주서를 올렸고, 군사독재의 수반으로 지목된 니콜라이 니콜라예비치 ' +
    '대공이 이를 거부하면서 10월 선언(구력 10-17)이 서명되었다 — 시민적 자유와 국가두마를 ' +
    '약속한 제국 최초의 헌정 문서이고, 그의 발의로 기초되었다. 이틀 뒤 대신회의가 상설 ' +
    '통합정부로 개편되면서 그 초대 의장이 되었다. 그러나 재임 6개월은 12월 모스크바 무장 ' +
    '봉기 진압과 «처형열차» 지시로도 기록된다 — 헌정을 연 사람과 진압을 집행한 사람이 ' +
    '동일인이라는 점이 그의 평가를 끝까지 가른다. 8억 4,300만 루블의 대프랑스 차관으로 ' +
    '루블의 금태환을 지켜낸 직후, 제1대 두마 소집을 닷새 앞두고 물러났다. ' +
    '\n\n' +
    '만년(1906~1915). 다시는 행정직을 얻지 못한 채 국가평의회 의석만 유지했고 만년에는 ' +
    '재정위원장을 맡았다. 1907년에는 자택 굴뚝에서 폭발물이 발견되는 암살 미수를 겪었는데 ' +
    '수사는 비밀경찰 관련자들을 지목했다. 1914년 7월 위기에서 참전 반대를 진언했으나 ' +
    '받아들여지지 않았다. 1915년 수막염으로 죽었고, 니콜라이 2세는 «그의 죽음은 내게 깊은 ' +
    '안도였다»고 말했다. 당국은 그날 밤 서재를 봉인하고 회고록을 찾아 자택과 비아리츠 ' +
    '별장까지 뒤졌으나 원고는 이미 바욘의 은행 금고에 있었고, 1921~1923년 국외에서 출간 ' +
    '되었다. ' +
    '\n\n' +
    '평가. 전제정의 틀 안에서 근대 산업국가를 만들려 한 마지막 시도이자, 그 틀과 끝내 ' +
    '화해하지 못한 사람이었다. 두 번의 결혼이 모두 이혼녀와의 것이어서 부인은 장관 부인 ' +
    '가운데 유일하게 궁정에 받아들여지지 못했고, 그 자신도 귀족 사회에서 «벼락출세한 ' +
    '철도쟁이»로 겉돌았다. 그럼에도 금본위제·시베리아 철도·10월 선언·포츠머스 강화라는 ' +
    '제정 말기의 굵직한 결절 대부분에 그의 이름이 남아 있다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  definitionTitle?: '총리' | '재무장관'
  termNumber?: number
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

const TENURES: TenureSpec[] = [
  {
    title: '재무부 철도사무국장',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1889, startMonth: 3, startDay: 22,
    endYear: 1892, endMonth: 2, endDay: 27,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '교통장관으로 영전 (구력 1892-02-15).',
    appointmentDetail:
      '보르키 황실 열차 탈선(1888-10-29) 두 달 전, 알렉산드르 3세 앞에서 화물기관차 두 대로 ' +
      '황제 열차를 과속시키면 안 된다고 철도 관리들과 맞섰던 일이 사고로 그대로 입증되면서 ' +
      '황제의 눈에 들었다. 그 부름으로 1889-03-22(구력 03-10) 재무부에 신설된 철도사무국의 ' +
      '초대 국장이 되었다 — 연봉 4만 루블의 민간 철도 경영자에서 3천 루블의 관리로 내려앉는 ' +
      '자리였고, 황제가 사재에서 9,600루블을 보태 겨우 1만 7,600루블을 맞춰주었다.',
    notes:
      '구력 1889-03-10 임명, 동시에 4등문관(실제국가고문관) 서임 — 민간 철도인이 관등 없이 ' +
      '국장에 앉는 이례적 인사였다. 철도 운임 체계의 국가 통제를 설계했다.',
  },
  {
    title: '교통장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    startYear: 1892, startMonth: 2, startDay: 27,
    endYear: 1892, endMonth: 9, endDay: 11,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '재무장관으로 영전 (구력 1892-08-30) — 후임 교통장관은 A. K. 크리보셰인.',
    appointmentDetail:
      '철도사무국장으로 3년간 운임 개혁을 설계한 실적을 인정받아 1892-02-27(구력 02-15) ' +
      '교통장관에 임명되었다. 전임 귀베네트가 구력 01-17 물러난 뒤의 공백을 메운 인사였다.',
    notes:
      '구력 1892-02-15 ~ 08-30, 6개월 반의 짧은 재임. 철도망에 쌓여 있던 대량의 미발송 화물을 ' +
      '해소하고 철도 운임 개혁을 관철했다. 카탈로그에 대응 관직 정의가 없어 title 직접 기입. ' +
      '직함은 정식 장관이 아니라 «부처 관리»(управляющий)였을 가능성이 높다 — 브로크하우스-' +
      '예프론 사전이 «교통부의 관리를 맡도록 부름받았다»고 적었고, 후임 크리보셰인이 ' +
      '«1892~93년 관리 → 1893~94년 장관»으로 명시되는 당대 관례가 이를 뒷받침한다.',
  },
  {
    title: '재무장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '재무장관',
    startYear: 1892, startMonth: 9, startDay: 11,
    endYear: 1903, endMonth: 8, endDay: 29,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '극동 정책을 둘러싼 베조브라조프 일파·내무장관 플레베와의 대립 끝에 실권 없는 ' +
      '대신위원회 의장으로 «영전»되며 사실상 경질 (구력 1903-08-16) — 러시아 사료는 이를 ' +
      '«명예로운 퇴임»이라 부른다.',
    appointmentDetail:
      '뇌졸중으로 물러난 비셰그라드스키의 후임으로 1892-09-11(구력 08-30) 재무장관에 ' +
      '임명되었다 — 교통부를 맡은 지 반년 만의 이동이었다. 전임이 1892년 4월 건강을 이유로 ' +
      '물러난 뒤 차관 테르네르가 넉 달간 부처를 관리하던 공백을 메운 인사다. 두 번째 부인이 ' +
      '이혼녀·유대계라는 점을 미리 아뢰고 사직을 청했음에도 알렉산드르 3세가 그를 계속 ' +
      '신임한 것이 발탁의 배경이었다.',
    notes:
      '구력 1892-08-30 ~ 1903-08-16, 11년의 최장 재임. ①금본위제 — 1895년 금 거래 합법화를 ' +
      '거쳐 1897-01-15(구력 01-03) 칙령으로 임페리알 금화를 함량 그대로 액면만 10→15루블로 ' +
      '재평가해 신용루블을 1/3 절하했고(금루블 1=지폐 1.5), 구력 1897-08-29 발권법으로 ' +
      '국립은행을 금태환 발권 중심으로 만들었다. ②주류 전매(1894 도입, 구력 1895-01-01 ' +
      '국영 소매 개시) — 1913년 6억 7,500만 루블로 세입의 26%. ③시베리아 횡단철도(1891~)와 ' +
      '동청철도 — 구력 1896-05-22 리-로바노프 밀약, 08-27 80년 조차 계약, 러청은행을 ' +
      '통로로 삼아 국가 개입을 감췄다. ④1891년 보호관세(멘델레예프 참여)와 1893~94년 독일 ' +
      '관세전쟁, 구력 1894-01-29 통상조약. ⑤구력 1897-06-02 공장법(하루 11.5시간 상한). ' +
      '1890년대 러시아 공업은 연평균 7.6% 성장했다.',
  },
  {
    title: '대신위원회 의장',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1903, startMonth: 8, startDay: 29,
    endYear: 1905, endMonth: 11, endDay: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '개편된 대신회의의 초대 의장(총리)이 되며 이임 (구력 1905-10-19) — 대신위원회 자체는 ' +
      '1906년 4월 폐지되었다.',
    appointmentDetail:
      '재무장관에서 밀려나던 1903-08-29(구력 08-16) 같은 날 대신위원회 의장에 임명되었다. ' +
      '형식은 승진이었으나 이 기구는 각 부처가 황제에게 직접 상주하는 구조 아래 부처를 ' +
      '통할할 권한도 정책 책임도 없는 조정 기구였고, 안건에는 개인 연금 조정 같은 잡무까지 ' +
      '섞여 있었다 — 러시아 사료가 «사실상의 명예 퇴임»이라 부르는 이유다.',
    notes:
      '구력 1903-08-16 ~ 1905-10-19. 실권 없는 자리였지만 실제국가고문관 관등과 국무서기 ' +
      '칭호, 국가평의회 의석은 유지했다. 정부 수반이 아니므로 HEAD_OF_GOVERNMENT가 아닌 ' +
      'SPECIAL_POSITION으로 기록한다. 대신위원회 의장직 자체는 총리가 된 뒤에도 기구가 ' +
      '폐지되는 1906년 4월까지 형식상 겸했으나, 이 시드는 총리 취임일을 종료로 잡아 두 ' +
      '재임이 겹치지 않게 했다.',
  },
  {
    title: '총리 (대신회의 의장)',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    definitionTitle: '총리',
    termNumber: 1,
    startYear: 1905, startMonth: 11, startDay: 1,
    endYear: 1906, endMonth: 5, endDay: 5,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '구력 1906-04-22 사임 — 관보의 형식은 «본인 희망에 따른 퇴임»이나, 12월 모스크바 봉기 ' +
      '진압이 성공하자 차르에게 그가 더 필요 없어졌다는 것이 실질이다. 트레포프 등 궁정 ' +
      '반동파의 압력, 제1대 두마 소집(구력 04-27)을 앞둔 정치 지형, 4월에 성사된 대프랑스 ' +
      '차관으로 급한 불을 끈 사정이 겹쳤다. 같은 날 성 알렉산드르 넵스키 훈장(다이아몬드 ' +
      '장식)을 받았다 — 관례적인 위로 서훈이다.',
    appointmentDetail:
      '전국 총파업으로 제정이 벼랑에 몰린 1905-10-22(구력 10-09) 니콜라이 2세에게 상주서를 ' +
      '올려 «군사독재냐 헌정 양보냐» 두 길뿐임을 논하고 후자를 권했다. 차르가 처음 기울었던 ' +
      '군사독재안은 그 수반으로 지목된 니콜라이 니콜라예비치 대공이 거부하면서 무산되었고, ' +
      '10-30(구력 10-17) 10월 선언이 서명되었다. 이틀 뒤인 11-01(구력 10-19) «각 부처 활동의 ' +
      '통일 강화에 관한» 칙령으로 대신회의가 상설 통합정부로 개편되면서 그 초대 의장에 ' +
      '임명되었다 — 제국 역사상 첫 «총리»다.',
    notes:
      '구력 1905-10-19 ~ 1906-04-22, 약 6개월. 제국 대신회의 의장 제1대 — 이후 고레미킨2· ' +
      '스톨리핀3·코콥초프4·고레미킨5로 이어진다. 재임 중 ①12월 모스크바 무장봉기 진압 ' +
      '(구력 12-09~18, 세묘놉스키 근위연대 투입·프레스냐 포격)을 지휘했고 구력 1906-03-11 ' +
      '두르노보 내무장관에게 보낸 서한에서 «주요 분기역마다 특별 처형열차를 편성»할 것을 ' +
      '지시했다 — 10월 선언의 기초자와 진압의 집행자가 같은 사람이라는 점이 그의 평가를 ' +
      '가른다. ②재정에서는 구력 1905-12-29 프랑스계 선급 계약(2억 6,700만 프랑)에 이어 ' +
      '1906년 8억 4,300만 루블의 대프랑스 차관을 성사시켜 루블의 금태환을 지켜냈다 — ' +
      '로스차일드는 유대인 지위 개선 입법을 조건으로 참여를 거절했다. ' +
      '재임 중 겨울궁전 예비관에 거주했다.',
    cabinetName: '비테 내각 (1905~1906)',
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
    title: '티플리스 출생',
    category: 'FAMILY',
    startYear: 1849, startMonth: 6, startDay: 29,
    description:
      '구력 06-17. 캅카스 총독부 관리 집안 — 아버지는 정교로 개종한 쿠를란트 독일계, 어머니 ' +
      '쪽으로 돌고루코프 공작가와 닿는다. 신지학회 창시자 블라바츠키가 이종사촌 누이.',
  },
  {
    title: '노보로시스크 대학 졸업',
    category: 'EDUCATION',
    startYear: 1870,
    description:
      '1866년 오데사의 노보로시스크 대학 물리수학부 입학, 1870년 학사(칸디다트) 학위로 졸업 ' +
      '— 수학 교수직을 잠시 고려했으나 집안의 반대로 철도로 향했다.',
  },
  {
    title: '오데사 철도 입사 — 매표소부터',
    category: 'CAREER',
    startYear: 1870, startMonth: 5, startDay: 13,
    description:
      '구력 05-01, 연봉 2,400루블의 견습으로 시작해 «역 매표소·화물계에 앉았고, 이어 역장보· ' +
      '역장, 그다음 검수관과 운전 감독»(회고록)을 차례로 밟았다 — 대학 출신이 현장 말단부터 ' +
      '올라간 이례적 이력.',
  },
  {
    title: '틸리굴 참사 — 금고형 선고',
    category: 'PERSONAL',
    startYear: 1876, startMonth: 1, startDay: 5,
    description:
      '구력 1875-12-24, 오데사 철도 틸리굴 제방에서 신병 419명을 태운 군용열차가 탈선해 약 ' +
      '140명이 사망했다. 운전과장이던 그는 철도 사장 치하초프와 함께 금고 4개월을 선고받았 ' +
      '으나, 러시아-튀르크 전쟁의 병력 수송 공로로 니콜라이 니콜라예비치 대공이 개입해 ' +
      '영창 2주로 감형되었다 — 낮에는 철도 위원회 일을 계속했다.',
  },
  {
    title: '남서철도회사로 이직',
    category: 'CAREER',
    startYear: 1877, startMonth: 4, startDay: 23,
    description:
      '구력 04-11 관직을 떠나 민간 철도로 — 러시아-튀르크 전쟁의 병력 수송에서 두각을 ' +
      '나타냈다. 1879년 페테르부르크로 옮겨 바라노프 철도위원회에 참여했다.',
  },
  {
    title: '나데즈다 스피리도노바와 결혼',
    category: 'FAMILY',
    startYear: 1879, startMonth: 7, startDay: 11,
    description:
      '구력 06-29 페테르부르크 블라디미르 성당 — 첫 부인은 이혼 경력이 있었고 1890년 10월 ' +
      '심장 파열로 사망했다.',
  },
  {
    title: '키예프 — 남서철도 운전과장',
    category: 'CAREER',
    startYear: 1880, startMonth: 2,
    description: '구력 1880-02 부임 — 철도 경영자로서의 본격적 경력이 시작된 자리.',
  },
  {
    title: '«화물 운송 철도 운임의 원리» 출간',
    category: 'PUBLICATION',
    startYear: 1883,
    description:
      '철도 운임 이론서로 전문가 사회에서 이름을 얻었다 — 1884년 2판, 1910년 3판.',
  },
  {
    title: '남서철도회사 지배인',
    category: 'CAREER',
    startYear: 1886, endYear: 1889,
    description:
      '키예프 본사의 최고 경영자로 효율과 수익성을 크게 끌어올렸다(곡물 수송 신용 제도 등). ' +
      '연봉 4만 루블.',
  },
  {
    title: '보르키 황실 열차 탈선',
    category: 'OTHER',
    startYear: 1888, startMonth: 10, startDay: 29,
    description:
      '구력 10-17 하리코프현 보르키역 인근에서 알렉산드르 3세 일가의 열차가 탈선해 21명이 ' +
      '즉사했다(황실 가족은 생존). 검사 코니의 조사 결론은 «약한 선로 위를 과도한 중량으로 ' +
      '과속»으로, 두 달 전 비테가 황제 면전에서 경고한 그대로였다 — 이 일이 그를 황제의 ' +
      '눈에 들게 했다.',
  },
  {
    title: '철도사무국장 — 관직 복귀',
    category: 'CAREER',
    startYear: 1889, startMonth: 3, startDay: 22,
    description:
      '구력 03-10, 재무부 신설 철도사무국의 초대 국장 겸 4등문관 — 연봉이 4만에서 3천 루블로 ' +
      '떨어지자 황제가 사재로 9,600루블을 보탰다.',
  },
  {
    title: '교통장관 취임',
    category: 'POLITICAL',
    startYear: 1892, startMonth: 2, startDay: 27,
    description: '구력 02-15 — 6개월 반 만에 재무부로 옮겨 가는 징검다리가 되었다.',
  },
  {
    title: '재무장관 취임',
    category: 'POLITICAL',
    startYear: 1892, startMonth: 9, startDay: 11,
    description:
      '구력 08-30, 비셰그라드스키 후임 — 이후 11년간 제국 경제 정책의 사실상 총사령탑이 ' +
      '된다.',
  },
  {
    title: '마틸다 리사네비치와 재혼 — 궁정의 배척',
    category: 'FAMILY',
    startYear: 1892,
    description:
      '유대계로 태어나 정교로 개종한 이혼녀(개종명 마리야 이바노브나)와의 재혼. 이혼 성립 ' +
      '전부터의 교제와 금전이 오간 정황으로 큰 물의를 빚었고, 부인은 장관 부인 가운데 ' +
      '유일하게 끝내 궁정에 받아들여지지 못했다. 친자녀 없이 두 부인이 데려온 딸들(소피야· ' +
      '베라)을 키웠다. 혼인 연도는 1891년설과 1892년설이 갈린다.',
  },
  {
    title: '국립은행 신정관 — 산업 금융으로',
    category: 'POLITICAL',
    startYear: 1894, startMonth: 6, startDay: 18,
    description:
      '구력 06-06. 상업 어음 할인 위주였던 국립은행의 임무를 화폐·상공업·농업 지원으로 ' +
      '확대해 최대 50만 루블·2년의 산업 대출을 열었다.',
  },
  {
    title: '주류 전매 시행',
    category: 'POLITICAL',
    startYear: 1895, startMonth: 1, startDay: 13,
    description:
      '구력 1895-01-01 국영 소매 개시(1894년 도입 결정). 민간 증류는 허용하되 국가가 전량 ' +
      '매입·정제·판매하는 구조로, 1913년 6억 7,500만 루블을 걷어 세입의 26%를 차지했다.',
  },
  {
    title: '리-로바노프 밀약 — 동청철도 부설권',
    category: 'DIPLOMATIC',
    startYear: 1896, startMonth: 6, startDay: 3,
    description:
      '구력 05-22 모스크바에서 청의 이홍장과 체결한 비밀 동맹조약으로 만주 횡단 철도 ' +
      '부설권을 얻었다 — 구력 08-27 80년 조차 계약으로 동청철도회사가 섰다. 러청은행을 ' +
      '앞세워 국가 개입을 감춘 설계였고, 이홍장 매수설(«이홍장 기금» 300만 루블 중 50만 ' +
      '지급 확인)이 따라다닌다.',
  },
  {
    title: '금본위제 확립',
    category: 'POLITICAL',
    startYear: 1897, startMonth: 1, startDay: 15,
    description:
      '구력 01-03 칙령 — 금화의 함량은 그대로 두고 액면만 10→15루블(반임페리알 5→7.5)로 ' +
      '올려 신용루블을 1/3 절하했다(금루블 1 = 지폐 1.5). 구력 08-29 발권법으로 국립은행이 ' +
      '무제한 금태환 발권 중심이 되었고, 루블은 1914년까지 태환을 유지했다. 국가채무가 약 ' +
      '16억 금루블 늘었다는 비판도 함께 남았다.',
  },
  {
    title: '공장법 — 하루 11.5시간 상한',
    category: 'POLITICAL',
    startYear: 1897, startMonth: 6, startDay: 14,
    description:
      '구력 06-02. 야간·토요일·축일 전날은 10시간, 여성·아동 10시간, 일요일 노동 금지와 ' +
      '연 14일의 법정 공휴일을 정했다.',
  },
  {
    title: '뤼순 조차 — 노선 전환',
    category: 'DIPLOMATIC',
    startYear: 1898, startMonth: 3, startDay: 27,
    description:
      '구력 03-15 러청협약으로 랴오둥 반도의 뤼순·다롄을 25년 조차했다. 영토 획득이 아닌 ' +
      '경제적 침투를 주장해 온 그가 이 국면에서 입장을 바꿨다는 러시아 측 서술과, 끝까지 ' +
      '반대했다는 영어권 서술이 갈린다.',
  },
  {
    title: '재무장관 해임 — 대신위원회 의장으로',
    category: 'POLITICAL',
    startYear: 1903, startMonth: 8, startDay: 29,
    description:
      '구력 08-16. 극동에서 무력 팽창을 밀어붙이던 베조브라조프 일파와 내무장관 플레베의 ' +
      '압박 끝에, 부처 통할권도 정책 책임도 없는 대신위원회 의장으로 «영전»되며 사실상 ' +
      '경질되었다 — 17일 전에는 극동 총독부가 신설돼 그의 노선이 이미 뒤집힌 뒤였다.',
  },
  {
    title: '포츠머스 강화 — 러시아 수석전권',
    category: 'DIPLOMATIC',
    startYear: 1905, startMonth: 9, startDay: 5,
    description:
      '구력 08-23 서명. 루스벨트 미국 대통령의 중재로 08-09(신력) 개막한 회담에서 배상금 ' +
      '지불을 완전히 막아냈고, 일본이 전 섬을 요구하며 이미 점령했던 사할린도 남반부(북위 ' +
      '50도 이남) 할양으로 막았다. 다만 그 자신은 회담 직전 본국에 사할린 전도 할양까지 ' +
      '건의했고, «한 뼘의 땅도 안 된다»는 니콜라이 2세의 재가 문구가 강경 자세를 강제했다는 ' +
      '기록이 남아 있다. 랴오둥 조차권과 남만주철도는 일본에 넘어갔다.',
  },
  {
    title: '백작 작위 — «반쪽 사할린 백작»',
    category: 'AWARD',
    startYear: 1905, startMonth: 10, startDay: 1,
    description:
      '구력 09-18, 강화 성사의 공. 반대파는 무공 백작에게 붙던 명예 성씨(«자두나이스키» 등)를 ' +
      '패러디해 «폴루사할린스키(반쪽 사할린) 백작»이라 조롱했다.',
  },
  {
    title: '10월 선언 상주 — 헌정 양보 권고',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 10, startDay: 22,
    description:
      '구력 10-09, 전국 총파업 국면에서 «군사독재냐 헌정 양보냐» 두 길뿐이라는 상주서를 ' +
      '올렸다. 군사독재의 수반으로 지목된 니콜라이 니콜라예비치 대공이 거부하면서 차르가 ' +
      '후자를 택했다.',
  },
  {
    title: '10월 선언 공포',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 10, startDay: 30,
    description:
      '구력 10-17 페테르고프 서명, 이튿날 관보 게재. 시민적 자유의 불가침과 국가두마 ' +
      '설치를 선언한 제국 최초의 헌정 문서로, 그의 발의로 기초되었다.',
  },
  {
    title: '초대 총리 취임',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 11, startDay: 1,
    description:
      '구력 10-19, 대신회의를 상설 통합정부로 개편한 칙령과 동시에 그 초대 의장이 되었다 — ' +
      '제국 역사상 첫 «총리»(제1대).',
  },
  {
    title: '모스크바 무장봉기 진압',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 12, startDay: 22,
    endYear: 1905, endMonth: 12, endDay: 31,
    description:
      '구력 12-09~18. 세묘놉스키 근위연대가 투입되고 프레스냐 지구가 포격당했다. 이듬해 ' +
      '구력 03-11 두르노보 내무장관에게 «주요 분기역마다 특별 처형열차를 편성하라»고 지시한 ' +
      '서한이 남아 있다 — 10월 선언의 기초자와 진압의 집행자가 같은 사람이라는 사실이 그의 ' +
      '평가를 가른다.',
  },
  {
    title: '대프랑스 차관 성사 — 금태환 사수',
    category: 'DIPLOMATIC',
    startYear: 1906, startMonth: 4,
    description:
      '8억 4,300만 루블의 프랑스 차관으로 루블의 자유 금태환을 지켜냈다 — «전제정을 구한 ' +
      '차관». 구력 1905-12-29의 선급 계약(2억 6,700만 프랑)이 앞섰고, 로스차일드는 유대인 ' +
      '지위 개선 입법을 조건으로 참여를 거절했다.',
  },
  {
    title: '총리 사임',
    category: 'POLITICAL',
    startYear: 1906, startMonth: 5, startDay: 5,
    description:
      '구력 04-22. 형식은 «본인 희망»이나 진압이 끝나고 차관이 성사된 뒤 차르에게 더 필요 ' +
      '없어진 것이 실질이다 — 닷새 뒤 제1대 두마가 소집되었다. 같은 날 성 알렉산드르 넵스키 ' +
      '훈장(다이아몬드 장식)을 받았다.',
  },
  {
    title: '폭탄 암살 미수',
    category: 'PERSONAL',
    startYear: 1907,
    description:
      '카멘노오스트롭스키 대로 자택 굴뚝에서 폭발물이 발견되었다. 수사를 맡은 알렉산드로프 ' +
      '검사는 황실 비밀경찰(오흐라나)에 몸담은 자들이 연루됐음을 밝혀냈다 — 월일은 사료가 ' +
      '갈린다.',
  },
  {
    title: '국가평의회 재정위원장',
    category: 'POLITICAL',
    startYear: 1911, endYear: 1915,
    description:
      '총리 사임 후 다시는 행정직을 얻지 못한 채 국가평의회 의석만 유지했고, 만년에는 재정 ' +
      '위원회를 이끌었다.',
  },
  {
    title: '7월 위기 — 참전 반대 진언',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7,
    description:
      '니콜라이 2세에게 러시아가 개입하면 유럽이 파국에 이른다며 참전하지 말 것을 진언했으나 ' +
      '받아들여지지 않았고, 죽을 때까지 전쟁에 비판적이었다.',
  },
  {
    title: '페트로그라드에서 사망',
    category: 'PERSONAL',
    startYear: 1915, startMonth: 3, startDay: 13,
    description:
      '구력 02-28, 수막염. 향년 65세. 장례는 구력 03-02 «3등급»으로 조촐히 치러졌고 공식 ' +
      '의전은 없었다 — 니콜라이 2세는 사흘 뒤 팔레올로그 프랑스 대사에게 «비테 백작의 ' +
      '죽음은 내게 깊은 안도였다. 나는 거기서 신의 표징까지 보았다»고 말했다. 라자렙스코예 ' +
      '묘지 안장.',
  },
  {
    title: '회고록 출간 — 압수 실패',
    category: 'PUBLICATION',
    startYear: 1921, endYear: 1923,
    description:
      '사망 직후 당국이 서재를 봉인하고 자택과 비아리츠 별장을 수색했으나, 원고는 파리 은행 ' +
      '금고에서 바욘으로 옮겨진 뒤라 압수에 실패했다. 1921년 영역본이 먼저 나왔고 러시아어 ' +
      '원본은 베를린의 «슬로보» 출판사에서 1922~1923년 전 3권으로 출간되었다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const WITTE_STATS = {
  politics: 82,
  military: 20,
  diplomacy: 85,
  intellect: 88,
  charisma: 58,
  administration: 92,
  notes:
    '제정 말기 국가 운영의 설계자(행정) — 금본위제·주류 전매·시베리아 횡단철도·보호관세를 ' +
    '한 사람이 밀어붙였고, 매표소 견습부터 올라온 현장 감각과 운임 이론서를 쓴 분석력이 ' +
    '그 바탕이다(학식). 패전국 수석전권으로 배상금 0에 사할린 절반을 지켜낸 포츠머스와 ' +
    '전제정을 구한 8억 4천만 루블 차관은 외교의 정점. 총파업 국면에서 헌정 양보로 활로를 ' +
    '연 판단(정치)도 탁월했으나, 같은 손으로 «처형열차»를 지시했고 목적을 달성한 차르에게 ' +
    '6개월 만에 버려졌다. 군 경력은 전무하고, 벼락출세·이혼녀와의 재혼·오만한 처신으로 ' +
    '궁정과 귀족 사회에서 끝내 겉돈 것이 최대 약점이다(카리스마).',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedWitte(prisma: PrismaService): Promise<void> {
  console.log('\n💰 세르게이 비테(Sergei Witte) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const russianEmpire = await prisma.historicalCountry.findFirst({
    where: { name: '러시아 제국' },
    select: { id: true },
  })
  if (!russianEmpire) {
    console.warn('  ⚠️  러시아 제국 HC 미존재 — 먼저 seedRussiaHistoricalCountries 실행 필요. 시딩 중단.')
    return
  }

  const pmDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '총리' },
    select: { id: true },
  })
  const financeDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '재무장관' },
    select: { id: true },
  })
  const defByTitle: Record<string, string | undefined> = {
    총리: pmDef?.id,
    재무장관: financeDef?.id,
  }

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Sergei Yulyevich Witte' } },
        { AND: [{ name: '세르게이' }, { middleName: '율리예비치' }, { surname: '비테' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = WITTE.originalName
    if (!person.biography) patch.biography = WITTE.biography
    if (!person.birthPlaceText) patch.birthPlaceText = WITTE.birthPlaceText
    if (!person.birthNote) patch.birthNote = WITTE.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = WITTE.deathPlaceText
    if (!person.deathType) patch.deathType = WITTE.deathType
    if (!person.deathCause) patch.deathCause = WITTE.deathCause
    if (!person.deathNote) patch.deathNote = WITTE.deathNote
    if (person.influence == null) patch.influence = WITTE.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${WITTE.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${WITTE.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: WITTE.name,
        middleName: WITTE.middleName,
        surname: WITTE.surname,
        originalName: WITTE.originalName,
        biography: WITTE.biography,
        birthDate: toDate(WITTE.birthYear, WITTE.birthMonth, WITTE.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: WITTE.birthNote,
        deathDate: toDate(WITTE.deathYear, WITTE.deathMonth, WITTE.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: WITTE.deathType,
        deathCause: WITTE.deathCause,
        deathNote: WITTE.deathNote,
        gender: WITTE.gender,
        nameDisplayOrder: 'western' as any,
        influence: WITTE.influence,
        birthPlaceText: WITTE.birthPlaceText,
        deathPlaceText: WITTE.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${WITTE.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 (+ 총리 재임에는 내각 동반) ─────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    let tenureId: string
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: russianEmpire.id,
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
          historicalCountryId: russianEmpire.id,
          positionDefinitionId: t.definitionTitle ? defByTitle[t.definitionTitle] : undefined,
          positionType: t.positionType,
          title: t.title,
          termNumber: t.termNumber,
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
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: {
      personId,
      historicalCountryId: russianEmpire.id,
      affiliationType: 'CITIZENSHIP' as any,
    },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 러시아 제국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: russianEmpire.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
      },
    })
    console.log('  ✅ 소속국가: 러시아 제국 (출생·복무 1849~1915)')
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
        politics: WITTE_STATS.politics,
        military: WITTE_STATS.military,
        diplomacy: WITTE_STATS.diplomacy,
        intellect: WITTE_STATS.intellect,
        charisma: WITTE_STATS.charisma,
        administration: WITTE_STATS.administration,
        notes: WITTE_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${WITTE_STATS.politics}·군사 ${WITTE_STATS.military}·` +
        `외교 ${WITTE_STATS.diplomacy}·학식 ${WITTE_STATS.intellect}·` +
        `카리스마 ${WITTE_STATS.charisma}·행정 ${WITTE_STATS.administration}`,
    )
  }

  console.log('✅ 세르게이 비테 시딩 완료\n')
}
