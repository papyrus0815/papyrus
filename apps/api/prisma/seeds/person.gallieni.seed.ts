/**
 * 조제프 갈리에니 (Joseph Simon Gallieni, 1849~1916) 인물 보강 시드
 *
 * ⚠️ 기존 행 보강 모드 — UI로 최소 등록돼 있던 스텁(이름·생몰·사진·별칭 «파리 구원자»만
 *    있고 전기·출생지·사망지·재임·연보·능력치가 전부 비어 있던 행)을 채운다.
 *    이미 값이 있는 필드는 덮어쓰지 않는다(사조노프·조프르·페탱 선례).
 *
 * ⚠️ 예외 — 주 국적 교정: 이 행은 historicalCountryId가 «프랑스 제2제국»(1852~1870)으로
 *    등록돼 있었으나 두 가지가 어긋난다 — (1) 1849년생이라 출생 시점은 제2제국 이전이고
 *    (2) 임관(1870)부터 사망(1916)까지 경력 전체가 제3공화국이다. 같은 DB의 동시대 프랑스
 *    인물(클레망소 1841·조프르 1852·페탱 1856·팔레올로그 1859) 전원이 «프랑스 제3공화국»을
 *    주 국적으로 쓰므로 규약에 맞춰 교정하고 로그로 알린다. 기존 제2제국 소속(affiliation)
 *    행 자체는 사용자 데이터일 수 있어 삭제하지 않고 남겨 둔다.
 *
 * 1914년 9월 파리 군사총독으로 클루크 제1군의 측면 노출을 포착해 마른 반격의 도화선을
 * 당긴 «파리의 구원자». 동시에 30년 가까이를 식민지에서 보내며 「기름 얼룩」 평정 교리를
 * 만들고 마다가스카르에서 왕정을 폐지한 총독이기도 하다.
 *
 * ⚠️ 서술 원칙: 마른의 공적과 식민 통치의 폭력을 어느 쪽도 미화·은폐하지 않는다.
 *  · 마른 — 「진짜 승자는 갈리에니」설은 그의 사후 회고록(1920)이 촉발한 논쟁이며, 현재
 *    학계는 «국지적 기회 포착은 갈리에니, 전 전선 반격의 구상과 결단은 조프르»로 정리한다.
 *    「마른의 택시」가 승리의 원인이라는 대중 서사는 전문 연구에서 사실상 폐기되었다.
 *  · 마다가스카르 — 왕정 폐지와 여왕 유배, 재상·왕족의 약식 처형, 연 10~50일 강제부역과
 *    그로 인한 대량 사망을 함께 적는다. «온건한 평정»이라는 20세기의 서술은 통치의 절반만
 *    본 것이라는 현재의 재평가를 따른다.
 *
 * 날짜 규약: 프랑스 사료라 그레고리력. 연·월 단위까지만 확인된 보직은 startDatePrecision으로
 * 정밀도를 명시한다(팔레올로그 선례).
 *
 * 의존: seedFranceHistoricalCountries('프랑스 제3공화국' HC).
 *
 * 보강 항목:
 *  - Person 필드 보강(전기·출생지·사망지·사인·영향력) + 주 국적 교정
 *  - GovernmentPositionTenure x10 (식민지 지휘 3·본토 군직 4·각료 1·특별직 2, 경위 전건)
 *  - PersonCountryAffiliation +1 (제3공화국) / PersonNickname +2
 *  - PersonLifeEvent x18 / PersonStats x1
 */
import {
  AppointmentMethod,
  DeathType,
  GovernmentPositionType,
  TenureEndReason,
  type PersonNicknameType,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 보강 명세 ───────────────────────────────────────────────────────────
const GALLIENI = {
  originalNameKey: 'Joseph Simon Gallieni',
  birthPlaceText: '프랑스 오트가론주 생베아(Saint-Béat) — 피레네 산자락의 소읍',
  birthNote:
    '부친 가에탕 마리 갈리에니는 이탈리아 롬바르디아 출신으로 프랑스군에 사병으로 입대해 ' +
    '대위까지 오른 하급 장교였고 프랑스로 귀화했다. 모친 프랑수아즈 페리세는 생베아 현지 ' +
    '출신이다. 파리 살롱이나 참모본부 인맥과 무관한 이민 사병 출신 장교의 아들이라는 배경은 ' +
    '그가 격이 낮게 여겨지던 해병보병을 택하고 경력 대부분을 식민지에서 보낸 사실, 그리고 ' +
    '1911년 본토군 최고직을 고사한 판단과도 이어진다.',
  deathPlaceText: '프랑스 베르사유 — 사설 클리닉',
  deathType: DeathType.ILLNESS,
  deathCause: '전립선암 — 두 차례 수술 후 합병증 (향년 67세)',
  deathNote:
    '육군장관 재임 중 이미 병세가 깊었고 1916년 3월 사임의 한 축이 이 건강 문제였다. 국장이 ' +
    '거행되었으나 유해는 앵발리드나 팡테옹이 아니라 본인 유지에 따라 바르주 생라파엘 묘지의 ' +
    '부인 마르트 사벨리(1914년 사망) 곁에 안장되었다. 생전에 원수가 되지 못한 것은 조프르와의 ' +
    '갈등과 이른 죽음 탓이며, 사후 5년 만인 1921-05-07 대통령령으로 프랑스 원수가 추서되었다 ' +
    '(다수 자료는 05-06으로 적는다).',
  influence: 68,
  biography:
    '프랑스의 군인·식민지 총독. 1914년 9월 파리 군사총독으로 독일 제1군의 측면 노출을 포착해 ' +
    '마른 반격의 도화선을 당겨 «파리의 구원자»로 불렸고, 그에 앞서 30년 가까이를 서아프리카· ' +
    '인도차이나·마다가스카르에서 보내며 20세기 대반란전 교리의 원형이 된 「기름 얼룩」 평정론을 ' +
    '만든 인물이다. 생전에는 원수가 되지 못했고 1921년 사후에 추서되었다. ' +
    '\n\n' +
    '성장과 보불전쟁(1849~1871). 오트가론의 소읍에서 이탈리아계 이민 하급 장교의 아들로 ' +
    '태어나 라플레슈 군사예비학교를 거쳐 1868년 생시르에 입학했다. 보불전쟁 발발로 학업이 ' +
    '단축돼 1870년 7월 해병보병 소위로 임관했고, 스당 전투의 일부인 바제유 전투에 참전했다가 ' +
    '9월 1일 항복과 함께 포로가 되어 독일에서 반년 넘게 억류되었다. 이때 독일어를 익혔고 ' +
    '평생 4~5개 언어를 구사했다. ' +
    '\n\n' +
    '식민지의 30년(1876~1905). 세네갈 근무와 니제르강 유역 탐사로 서아프리카 전문가가 되었고, ' +
    '1886~88년 오플뢰브 상급 사령관으로 사모리 투레와 대치했다. 1892~96년 통킹 제2군관구 ' +
    '사령관으로 리요테를 참모로 두고 「기름 얼룩」식 점진 점령을 실전에 적용했다 — 거점에 ' +
    '도로·시장·학교·행정을 함께 심어 통제 구역을 얼룩처럼 번지게 하고, 군사·정치·행정 권한을 ' +
    '구역 지휘관 한 사람에게 통합하는 방식이다. ' +
    '\n\n' +
    '마다가스카르 총독(1896~1905). 메날람바 봉기로 보호령이 무너지자 민·군 전권을 쥐고 ' +
    '부임했다. 도착 한 달 만에 라치마망가 왕자와 내무대신 라이니잔드리아맘판드리를 형식적 ' +
    '재판 뒤 총살했고, 1897년 2월 라나발로나 3세를 폐위해 레위니옹으로 유배하며 왕정을 ' +
    '폐지했다. 성인에게 연 10~50일의 강제부역을 부과해 도로·철도 공사에 동원했는데 프랑스인 ' +
    '식민자들조차 «끔찍한 사망률»을 진정할 정도의 인명 손실이 났다. 동시에 타마타브~ ' +
    '타나나리브 철도와 파스퇴르 연구소, 학교망을 세웠다. 20세기 프랑스가 그를 «건설의 평정»을 ' +
    '실천한 모범으로 서술해 온 것은 통치의 절반만 본 것이며, 오늘날에는 정복자로서의 폭력을 ' +
    '함께 놓는 재평가가 자리 잡았다. ' +
    '\n\n' +
    '본토 복귀와 1911년의 고사(1906~1914). 40년 가까이 해외에서만 복무한 그를 정규군 계통에 ' +
    '편입시키려 제13군단장·리옹 군사총독을 거치게 했고, 1908년 최고전쟁회의 위원이 되었다. ' +
    '1911년 미셸 장군 경질로 신설된 사실상의 총사령관직이 먼저 그에게 제안되었으나 고사하며 ' +
    '조프르를 지지했다 — 표면적 이유는 나이와 건강(당시 62세, 정년 3년 전)이었고, 미셸을 ' +
    '밀어내고 그 자리를 차지하는 데 대한 거리낌과 식민지 출신에 대한 본토 장교단의 반발 ' +
    '우려도 함께 거론된다. 조프르는 마다가스카르에서 그의 부하였던 공병 장교였고, 이 ' +
    '뒤집힌 상하 관계가 1914년의 갈등으로 이어진다. 1914년 4월 정년으로 퇴역했다. ' +
    '\n\n' +
    '파리 군사총독과 마른(1914). 국경전투 연패로 독일군이 파리에 접근하자 8월 26일 퇴역 상태의 ' +
    '그를 파리 군사총독으로 불러냈고, 9월 2일 정부가 보르도로 피난하면서 파리의 민·군 전권과 ' +
    '«끝까지 사수하라»는 명령이 그에게 남겨졌다. 9월 3일 그는 클루크 제1군이 파리를 정면 ' +
    '공격하지 않고 동남쪽으로 선회해 우측면을 드러냈음을 파악했고, 이튿날 항공 정찰로 독일 ' +
    '제1·제2군 사이 약 45km의 공백을 확증한 뒤 총사령부의 지시를 기다리지 않고 09시 10분 ' +
    '모누리의 제6군에 출동 준비를 명했다. 같은 날 저녁 전화로 조프르에게 즉각 공세를 ' +
    '종용했고, 9월 5일 제6군이 우르크강에서 클루크의 측면을 치면서 마른 반격이 시작되었다. ' +
    '9월 7~8일 밤 파리 택시를 징발해 병력을 전선으로 실어 나른 「마른의 택시」는 상징으로 ' +
    '남았으나, 승리의 원인이었다는 대중 서사는 전문 연구에서 폐기되었다. ' +
    '\n\n' +
    '육군장관과 사임(1915~1916). 1915년 10월 브리앙이 «파리를 구한 장군»의 권위를 빌려 ' +
    '육군장관에 앉혔으나, 12월 조프르가 전 전선 총사령관으로 격상되면서 장관의 통제력은 오히려 ' +
    '약해졌다. 그는 드리앙 중령의 제보를 받아 조프르가 베르됭 요새군에서 화포와 수비대를 빼내고 ' +
    '있다고 12월 중순 서면으로 경고했으나 지휘권 침해로 반발만 샀고, 무장 해제는 계속되어 ' +
    '이듬해 2월 독일군 공세를 그 상태로 맞았다. 1916년 3월 7일 각의에서 조프르의 지휘 전반을 ' +
    '비판하고 문민 통제 강화를 요구하는 보고서를 낸 뒤 사의를 표했고, 브리앙이 공개를 막은 채 ' +
    '3월 16일 이임시켰다. 두 달 뒤 전립선암 수술 후유증으로 죽었다. ' +
    '\n\n' +
    '평가. 그의 위상은 단 한 달(1914년 9월)의 결정적 국면과 이른 죽음에 압축돼 있다. 마른의 ' +
    '공적을 두고 클레망소는 «갈리에니가 없었다면 승리는 불가능했다»고 했으나, 현재 학계는 ' +
    '국지적 기회 포착은 그의 것이고 전 전선 반격의 구상과 결단은 조프르의 것이라는 절충에 ' +
    '무게를 둔다. 식민지 총독으로서의 「기름 얼룩」 교리는 리요테를 거쳐 알제리 전쟁기 ' +
    '프랑스군과 뒷날 미군 교범에까지 인용되었지만, 그 평정이 무엇을 대가로 했는지에 대한 ' +
    '재평가가 2000년대 이후 본격화해 2020년에는 파리 보방 광장의 기념물을 검은 천으로 덮는 ' +
    '항의 행동과 거리 이름 변경 요구로 이어졌다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  appointmentDetail: string
}

const TENURES: TenureSpec[] = [
  {
    title: '프랑스령 수단 오플뢰브 상급 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1886, startMonth: 12, startDay: 20,
    endYear: 1888, endMonth: 4,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '1888년 4월 임기를 마치고 귀국. ' +
      '후임 루이 아르시나르가 1888년 10월 28일 지휘를 이어받았다.',
    notes:
      '세구의 아마두(1887), 사모리 투레와 조약과 무력을 병행해 대치하고 마마두 라민 봉기 진압에 관여하며 니제르강 상류로 프랑스 세력권을 밀어올렸다. ' +
      '오늘날 기니의 시기리에 \'갈리에니 요새\'를 세웠다. ' +
      '이 시기에 이미 군사행동과 행정·교섭을 한 손에 쥐는 그의 통치 방식이 형태를 갖췄다.',
    appointmentDetail:
      '1876년부터 세네갈에서 근무하며 1880~81년 생루이에서 니제르강 유역에 이르는 탐사 임무를 수행하고 낭고에서 억류당하면서까지 니제르강 항행권 교섭을 성사시켜 서아프리카 전문가로 인정받았다. ' +
      '1886년 12월 20일 중령 진급과 함께 세네갈·수단 내륙 오플뢰브 지역 상급 사령관에 임명되었다.',
  },
  {
    title: '통킹 제2군관구 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1892, startMonth: 9,
    endYear: 1896, endMonth: 8,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '1896년 8월 임기 종료로 귀국. ' +
      '곧바로 반란이 확산 중이던 마다가스카르 총독 겸 총사령관으로 전보되었다.',
    notes:
      '위베르 리요테를 참모로 두고 「기름 얼룩(tache d\'huile)」식 점진 점령과 「인종 정책(politique des races)」을 실전에 적용했다. ' +
      '1894~95년 데 탐(Đề Thám) 세력과 국경 무장집단을 상대로 세 차례 종대 작전을 벌였고 그 경험을 『통킹의 세 종대』로 정리했다. ' +
      '각 구역에서 군사·정치·행정 권한을 한 인물에게 통합하는 지휘 구조를 제도화했다.',
    appointmentDetail:
      '1891년 3월 11일 대령으로 진급한 뒤 1892년 통킹으로 파견되어 제3통킹보병연대를 지휘했고, 1893년 12월 1일 랑선(Lang Son)에 사령부를 둔 제2군관구 사령관에 정식 임명되었다. ' +
      '중국 국경지대의 무장세력·\'해적\' 소탕과 국경 확정이 과제였다.',
  },
  {
    title: '마다가스카르 총독 겸 총사령관',
    positionType: GovernmentPositionType.LOCAL_GOVERNMENT,
    startYear: 1896, startMonth: 9, startDay: 15,
    endYear: 1905, endMonth: 11, endDay: 3,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '9년 재임 후 1905년 본국 귀환. ' +
      '문민 총독 빅토르 오가뉴르가 1905년 11월 3일 후임으로 취임했다(그가 실제로 섬을 떠난 시점은 1905년 5월경으로 보는 자료도 있다).',
    notes:
      '1896년 9월 15일 타나나리브 도착. ' +
      '10월 15일 라치마망가 왕자와 내무대신 라이니잔드리아맘판드리를 형식적 재판 뒤 총살했고, 1897년 2월 27일 라나발로나 3세를 폐위해 레위니옹으로 유배(1899년 2월 알제리로 이송)하며 왕정을 폐지했다. ' +
      '성인에게 연 10~50일의 강제부역(prestations)을 부과해 도로·철도 공사에 동원, 1900년 프랑스인 식민자들조차 \'끔찍한 사망률\'을 진정할 정도의 인명 손실을 냈다. ' +
      '동시에 타마타브~타나나리브 철도, 파스퇴르 연구소, 학교망을 건설했다.',
    appointmentDetail:
      '1895년 원정으로 세운 보호령이 이듬해 메날람바(Menalamba) 봉기로 무너지고 문민 총독 이폴리트 라로슈가 사태를 수습하지 못하자, 1896년 8월 병합법 직후 파리는 민·군 전권을 한 손에 쥔 강경 인물로 갈리에니를 지명했다. ' +
      '준장 진급과 함께 부임했다.',
  },
  {
    title: '제13군단장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1906, startMonth: 2,
    endYear: 1906, endMonth: 6,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '4개월 만에 리옹 군사총독 겸 제14군단장으로 영전했다.',
    notes:
      '불과 4개월의 과도적 보직으로, 본국 정규군의 편성·훈련·행정 실무를 처음 경험한 자리였다. ' +
      '식민지 출신 장성에 대한 본토 장교단의 거리감을 체감한 시기이기도 하며, 이는 1911년 그가 최고 지휘직을 고사할 때 든 이유 가운데 하나로 지목된다.',
    appointmentDetail:
      '1899년 8월 9일 사단장으로 진급한 상태에서 1905년 마다가스카르 임기를 마치고 귀국했다. ' +
      '40년 가까이 해외에서만 복무해 본토 야전 경력이 사실상 없던 그를 정규군 지휘 계통에 편입시키기 위해 1906년 2월(자료에 따라 3월) 클레르몽페랑의 제13군단장에 보임했다.',
  },
  {
    title: '리옹 군사총독 겸 제14군단장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1906, startMonth: 6,
    endYear: 1908, endMonth: 8,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1908년 8월 리옹을 떠나 최고전쟁회의 위원 겸 식민지방위위원회 의장으로 이동했다.',
    notes:
      '알프스 국경 방면 부대의 편성·훈련·동원 계획을 관장했다. ' +
      '1905년 11월 6일 레지옹 도뇌르 대십자장을 받았다. ' +
      '이 2년간 본토 군 수뇌부 및 정치권과의 인맥을 넓혔고, 그 결과 1908년 최고전쟁회의 진입으로 이어졌다.',
    appointmentDetail:
      '제13군단장 부임 4개월 만인 1906년 6월 리옹 군사총독으로 옮겨 알프스 방면을 담당하는 제14군단을 지휘하고 제14·15군단(리옹·마르세유) 감찰을 겸했다. ' +
      '식민지 군인이 본토 대부대를 맡은 드문 사례였다.',
  },
  {
    title: '최고전쟁회의 위원 겸 식민지방위위원회 의장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1908, startMonth: 8, startDay: 7,
    endYear: 1914, endMonth: 4,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '1914년 만 65세 정년에 도달해 현역에서 물러났다.',
    notes:
      '북아프리카 감찰 순시를 수행했다. ' +
      '전시 지정 사령관으로서 제5군 전력이 벨기에 방면 진공에는 부족하며 모뵈주 요새를 보강해야 한다고 경고했으나 반영되지 않았다. ' +
      '1911년 미셸 장군 경질 국면에서 총사령관직 제안을 고사하고 조프르를 지지한 것이 이 시기 최대의 결정이다.',
    appointmentDetail:
      '1908년 8월 7일 최고전쟁회의(Conseil supérieur de la guerre) 위원에 임명되고 식민지방위자문위원회 의장을 겸했다. ' +
      'CSG 위원은 전시에 야전군 사령관으로 지정되는 자리였고, 갈리에니에게는 제5군 지휘가 배정되었다. ' +
      '1911년에는 국방최고회의에도 참여했다.',
  },
  {
    title: '정년 퇴역 (예비역)',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1914, startMonth: 4,
    endYear: 1914, endMonth: 8, endDay: 26,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1914년 8월 26일 파리 군사총독으로 소환되어 현역에 복귀했다.',
    notes:
      '퇴역 신분이었음에도 1914년 7월 31일 조프르 유고 시 승계할 총사령관으로 지정되어 있었다. ' +
      '8월 국경전투의 연패와 독일군의 파리 접근으로 정부는 4개월 만에 그를 다시 불러냈고, 이 짧은 공백이 뒷날 \'마른의 공적\' 논쟁에서 그의 위치를 애매하게 만드는 요인이 된다.',
    appointmentDetail:
      '1849년 4월생으로 1914년 정년에 도달해 현역에서 물러났다. ' +
      '프랑스어 위키백과는 1914년 4월로, 일부 자료는 2월 또는 정년 도달일 1914년 3월 17일로 적는다. ' +
      '개전 넉 달 전, 프랑스군 최고 원로 중 한 사람이 야전 보직 없이 예비역이 된 상태였다.',
  },
  {
    title: '파리 군사총독',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1914, startMonth: 8, startDay: 26,
    endYear: 1915, endMonth: 10, endDay: 29,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1915년 10월 29일 브리앙 내각의 육군장관으로 입각하면서 총독직에서 이임했다.',
    notes:
      '부임 즉시 현역 3개 군단을 요구해 모누리의 제6군을 확보했고, 외곽 수목 벌채·교량 폭파 준비·진지 구축으로 파리를 요새화했다. ' +
      '9월 3일 아침 클루크 제1군이 파리 동남쪽으로 선회해 우측면을 드러냈음을 파악하고, 4일 09시 10분 항공 정찰 보고를 근거로 독자적으로 제6군에 출동 준비를 명한 뒤 조프르에게 전화로 공세를 종용했다.',
    appointmentDetail:
      '국경전투 패배로 독일군이 파리로 접근하자 육군장관 아돌프 메시미가 1914년 8월 26일 전임 미셸 장군을 해임하고 퇴역 상태의 갈리에니를 파리 군사총독에 임명했다. ' +
      '9월 2일 스당 패전 기념일에 정부가 보르도로 피난하면서, 밀랑 장관은 그에게 파리의 민·군 전권과 \'끝까지(à outrance) 사수하라\'는 명령을 남겼다.',
  },
  {
    title: '육군장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    startYear: 1915, startMonth: 10, startDay: 29,
    endYear: 1916, endMonth: 3, endDay: 16,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '1916년 3월 7일 각의에서 조프르의 18개월간 작전 지휘를 비판하고 문민 통제 강화를 요구하는 보고서를 낸 뒤 사의를 표명했다. ' +
      '브리앙이 사기 저하를 우려해 만류·부인했고, 후임 피에르 로크가 정해진 3월 16일 정식 이임했다.',
    notes:
      '아프리카 식민지 병력 약 5만 명의 동원을 승인했다. ' +
      '1915년 12월 드리앙 중령의 제보를 받아 조프르가 베르됭 요새군에서 화포와 수비대를 빼내고 일부 보루를 폭파 준비까지 시킨다고 12월 중순 서면으로 경고했다. ' +
      '그러나 1915년 12월 2일 조프르가 북아프리카를 제외한 전 전선의 총사령관으로 격상되면서 장관의 통제력은 오히려 약해졌다.',
    appointmentDetail:
      '1915년 아르투아·샹파뉴 공세의 참담한 실패와 알렉상드르 밀랑 장관의 의회 대응 실패로 내각이 무너지자, 아리스티드 브리앙이 10월 29일 새 내각을 구성하며 \'파리를 구한 장군\'의 권위를 빌리기 위해 갈리에니를 육군장관에 기용했다. ' +
      '전임자는 밀랑.',
  },
  {
    title: '프랑스 원수 (사후 추서)',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1921, startMonth: 5, startDay: 7,
    endYear: 1921, endMonth: 5, endDay: 7,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '해당 없음 — 사후 추서된 종신 존호.',
    notes:
      '생전에 원수 지팡이를 받지 못한 것은 조프르와의 갈등과 이른 죽음 때문이었다. ' +
      '추서는 마른에서의 역할과 파리 방어 공로를 국가가 공식 인정한 것이자, 사임의 형태로 물러난 그에 대한 사후 명예 회복의 성격을 띤다. ' +
      '오늘날 프랑스에서 그가 \'갈리에니 원수\'로 불리는 근거가 이 추서다.',
    appointmentDetail:
      '1차대전 원수 서임(조프르 1916, 포슈·페탱 1918)에서 제외된 채 사망한 그를 두고 의회와 여론에서 복권 요구가 이어졌고, 사후 5년 만인 1921년 5월 7일 대통령령으로 프랑스 원수 존호가 추서되었다(Légifrance 관보 원문 기준. ' +
      '다수 자료는 5월 6일로 표기).',
  },]

// ── 별명 ────────────────────────────────────────────────────────────────────
// «파리 구원자»는 이미 등록돼 있어 중복 생성되지 않는다(이름 기준 멱등).
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '파리의 구원자 (le sauveur de Paris)', type: 'EPITHET', priority: 1 },
  { nickname: '갈리에니 원수 (maréchal Gallieni)', type: 'HONORIFIC', priority: 2 },
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
    title: '생베아 출생',
    category: 'FAMILY',
    startYear: 1849, startMonth: 4, startDay: 24,
    description: '이탈리아 롬바르디아 출신으로 프랑스군 대위까지 오른 이민 장교의 아들로 출생.',
  },
  {
    title: '생시르 사관학교 입학',
    category: 'EDUCATION',
    startYear: 1868,
    description: '라플레슈 군사예비학교를 거쳐 입학. 수학과 어학에 강했고 평생 4~5개 언어를 구사했다.',
  },
  {
    title: '바제유 전투 참전·스당에서 포로',
    category: 'MILITARY',
    startYear: 1870, startMonth: 8, startDay: 31,
    endYear: 1871, endMonth: 3, endDay: 11,
    description:
      '보불전쟁으로 학업이 단축돼 해병보병 소위로 임관, 「푸른 사단」의 결사 항전으로 유명한 ' +
      '바제유 전투에 투입되었다가 9월 1일 스당 항복과 함께 포로가 되어 독일에서 반년 넘게 ' +
      '억류되었다. 이때 독일어를 익혔다.',
  },
  {
    title: '니제르강 유역 탐사·항행권 교섭',
    category: 'TRAVEL',
    startYear: 1880, endYear: 1881,
    description: '생루이에서 니제르강에 이르는 탐사 임무 중 낭고에서 억류당하면서까지 항행권 교섭을 성사시켰다.',
  },
  {
    title: '프랑스령 수단 상급 사령관',
    category: 'MILITARY',
    startYear: 1886, startMonth: 12, startDay: 20,
    endYear: 1888, endMonth: 4,
    description: '아마두·사모리 투레와 조약과 무력을 병행해 대치하며 니제르강 상류로 세력권을 넓혔다.',
  },
  {
    title: '통킹 제2군관구 — 「기름 얼룩」 교리의 실험',
    category: 'MILITARY',
    startYear: 1892, startMonth: 9,
    endYear: 1896, endMonth: 8,
    description:
      '리요테를 참모로 두고 점진 점령과 「인종 정책」을 실전 적용했다. 거점에 도로·시장·학교· ' +
      '행정을 함께 심어 통제 구역을 얼룩처럼 번지게 하는 방식이다.',
  },
  {
    title: '마다가스카르 총독 부임',
    category: 'CAREER',
    startYear: 1896, startMonth: 9, startDay: 15,
    description: '메날람바 봉기로 보호령이 무너지자 민·군 전권을 쥐고 부임했다.',
  },
  {
    title: '라치마망가 왕자·내무대신 처형',
    category: 'POLITICAL',
    startYear: 1896, startMonth: 10, startDay: 15,
    description: '도착 한 달 만에 형식적 재판을 거쳐 총살했다. 왕정 해체의 신호탄이었다.',
  },
  {
    title: '라나발로나 3세 폐위·왕정 폐지',
    category: 'POLITICAL',
    startYear: 1897, startMonth: 2, startDay: 27,
    description:
      '여왕을 폐위해 레위니옹으로 유배(1899년 알제리로 이송)하고 메리나 왕정을 폐지했다. ' +
      '이후 연 10~50일의 강제부역이 부과되어 도로·철도 공사에 동원되었고 대량의 인명 손실이 났다.',
  },
  {
    title: '최고전쟁회의 위원',
    category: 'MILITARY',
    startYear: 1908, startMonth: 8, startDay: 7,
    endYear: 1914, endMonth: 4,
    description:
      '전시에 제5군 사령관으로 지정되었고, 제5군 전력이 부족하며 모뵈주 요새를 보강해야 한다고 ' +
      '경고했으나 반영되지 않았다.',
  },
  {
    title: '총사령관직 고사 — 조프르 지지',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 7,
    description:
      '미셸 경질로 신설된 사실상의 총사령관직을 먼저 제안받았으나 나이와 건강(62세, 정년 3년 전)을 ' +
      '들어 고사하며 조프르를 지지했다. 조프르는 마다가스카르에서 그의 부하였다.',
  },
  {
    title: '정년 퇴역',
    category: 'CAREER',
    startYear: 1914, startMonth: 4,
    description: '개전 넉 달 전 만 65세 정년으로 현역에서 물러났다. 다만 조프르 유고 시 승계자로는 지정돼 있었다.',
  },
  {
    title: '파리 군사총독 임명 — 현역 복귀',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8, startDay: 26,
    description:
      '국경전투 연패로 독일군이 파리에 접근하자 메시미 육군장관이 퇴역 상태의 그를 불러냈다. ' +
      '9월 2일 정부가 보르도로 피난하며 «끝까지 사수하라»는 명령과 민·군 전권을 남겼다.',
  },
  {
    title: '클루크 제1군 측면 노출 포착',
    category: 'MILITARY',
    startYear: 1914, startMonth: 9, startDay: 3,
    description:
      '독일 제1군이 파리를 정면 공격하지 않고 동남쪽으로 선회해 우측면을 드러냈음을 파악했고, ' +
      '이튿날 항공 정찰로 독일 제1·2군 사이 약 45km의 공백을 확증했다.',
  },
  {
    title: '제6군 독자 출동 명령·조프르 설득',
    category: 'MILITARY',
    startYear: 1914, startMonth: 9, startDay: 4,
    description:
      '09시 10분 총사령부 지시를 기다리지 않고 모누리의 제6군에 출동 준비를 명했고, 저녁에 ' +
      '전화로 주저하던 조프르에게 즉각 공세를 종용했다 — «진짜 마른 전투는 전화로 치러졌다».',
  },
  {
    title: '「마른의 택시」',
    category: 'MILITARY',
    startYear: 1914, startMonth: 9, startDay: 7,
    description:
      '파리 시내 택시를 징발해 제7보병사단 병력을 우르크 전선으로 실어 날랐다. 상징으로 오래 ' +
      '남았으나 승리의 원인이었다는 대중 서사는 전문 연구에서 폐기되었다.',
  },
  {
    title: '육군장관 취임',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 10, startDay: 29,
    description:
      '브리앙이 «파리를 구한 장군»의 권위를 빌려 기용했으나, 12월 조프르가 전 전선 총사령관으로 ' +
      '격상되면서 장관의 통제력은 오히려 약해졌다.',
  },
  {
    title: '베르됭 요새 무장 해제 경고',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 12,
    description:
      '드리앙 중령의 제보로 조프르가 요새군에서 화포와 수비대를 빼내고 있다고 서면 경고했으나 ' +
      '지휘권 침해라는 반발만 샀고, 무장 해제는 계속되어 이듬해 2월 독일군 공세를 그 상태로 맞았다.',
  },
  {
    title: '조프르 비판 보고서·사임',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 3, startDay: 7,
    description:
      '각의에서 18개월간의 조프르 지휘 전반을 비판하고 문민 통제 강화를 요구한 뒤 사의를 표했다. ' +
      '브리앙이 공개를 막았고 3월 16일 정식 이임했다.',
  },
  {
    title: '베르사유에서 사망',
    category: 'PERSONAL',
    startYear: 1916, startMonth: 5, startDay: 27,
    description: '전립선암 수술 후 합병증으로 67세에 사망. 국장이 거행되었고 생라파엘의 부인 곁에 묻혔다.',
  },
  {
    title: '프랑스 원수 사후 추서',
    category: 'AWARD',
    startYear: 1921, startMonth: 5, startDay: 7,
    description:
      '사후 5년 만의 추서로, 마른의 공로 인정이자 조프르와의 갈등 속에 물러난 인물에 대한 명예 ' +
      '회복이었다. 그의 회고록(1920)이 촉발한 공적 논쟁 직후라는 점에서 정치적 타협의 성격도 있다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const GALLIENI_STATS = {
  politics: 58,
  military: 80,
  diplomacy: 55,
  intellect: 82,
  charisma: 60,
  administration: 86,
  notes:
    '30년의 식민지 통치에서 군사·행정·건설을 한 손에 묶어 운영한 조직가로, 「기름 얼룩」 교리는 ' +
    '20세기 대반란전의 고전이 되었다(행정·학식). 관찰과 기록의 습관이 1914년 9월 클루크의 측면 ' +
    '노출을 가장 먼저 알아채고 총사령부보다 앞서 제6군을 움직인 판단으로 이어졌다(군사). 다만 ' +
    '본토 야전 지휘 경력이 거의 없어 1911년 최고직을 고사했고, 1915~16년 육군장관으로서는 ' +
    '조프르를 문민 통제 아래 넣는 데 실패해 보고서 하나를 남기고 물러났다(정치). 식민지에서의 ' +
    '평정이 왕정 폐지·약식 처형·강제부역과 대량 사망을 대가로 했다는 점은 그 행정 역량의 어두운 ' +
    '이면이며, 오늘날의 재평가는 이 둘을 함께 놓는다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedGallieni(prisma: PrismaService): Promise<void> {
  console.log('\n🚕 조제프 갈리에니(Joseph Gallieni) 보강 시작 (기존 행 보강 모드)...')

  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const france = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제3공화국' },
    select: { id: true },
  })
  if (!france) {
    console.warn('  ⚠️  «프랑스 제3공화국» HC 미존재 — 시딩 중단.')
    return
  }

  const person = await prisma.person.findFirst({
    where: { originalName: { contains: GALLIENI.originalNameKey } },
  })
  if (!person) {
    console.warn('  ⚠️  갈리에니 인물 행이 없다 — 이 시드는 기존 행 보강 전용이라 중단한다.')
    return
  }
  const personId = person.id

  // ── 1) 인물 필드 보강 + 주 국적 교정 ──────────────────────────────────────
  const patch: Record<string, unknown> = {}
  if (!person.biography) patch.biography = GALLIENI.biography
  if (!person.birthPlaceText) patch.birthPlaceText = GALLIENI.birthPlaceText
  if (!person.birthNote) patch.birthNote = GALLIENI.birthNote
  if (!person.deathPlaceText) patch.deathPlaceText = GALLIENI.deathPlaceText
  if (!person.deathType) patch.deathType = GALLIENI.deathType
  if (!person.deathCause) patch.deathCause = GALLIENI.deathCause
  if (!person.deathNote) patch.deathNote = GALLIENI.deathNote
  if (person.influence == null) patch.influence = GALLIENI.influence
  // 오등록 교정 — 1849년생·경력 전체가 제3공화국인데 제2제국으로 잡혀 있었다
  if (person.historicalCountryId !== france.id) {
    patch.historicalCountryId = france.id
    console.log('  🔧 교정: 주 국적 → 프랑스 제3공화국 (경력 전체가 제3공화국, 동시대 인물 규약과 일치)')
  }
  if (Object.keys(patch).length > 0) {
    await prisma.person.update({ where: { id: personId }, data: patch })
    console.log(`  🔧 보강: ${Object.keys(patch).join(', ')}`)
  } else {
    console.log('  ⏭️  인물 필드 보강할 것 없음')
  }

  // ── 2) 재임 10건 ──────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: { personId, historicalCountryId: france.id, positionType: t.positionType, startDate },
      select: { id: true, appointmentDetail: true },
    })
    if (existing) {
      if (!existing.appointmentDetail) {
        await prisma.governmentPositionTenure.update({
          where: { id: existing.id },
          data: { appointmentDetail: t.appointmentDetail },
        })
        console.log(`  🔧 취임 경위 보강: ${t.title}`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      }
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: france.id,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision: precisionOf(t.startMonth, t.startDay),
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        appointmentDetail: t.appointmentDetail,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
  }

  // ── 3) 제3공화국 소속 추가 ─────────────────────────────────────────────────
  const affExists = await prisma.personCountryAffiliation.findFirst({
    where: { personId, historicalCountryId: france.id },
  })
  if (affExists) {
    console.log('  ⏭️  소속국가 스킵: 프랑스 제3공화국')
  } else {
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: france.id,
        affiliationType: 'CITIZENSHIP' as any,
        priority: 0,
        note: '1870년 임관부터 1916년 사망까지 경력 전체가 제3공화국이다.',
      },
    })
    console.log('  ✅ 소속국가: 프랑스 제3공화국 (1870~1916 복무)')
  }

  // ── 4) 별명 ─────────────────────────────────────────────────────────────────
  for (const nk of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({ where: { personId, nickname: nk.nickname } })
    if (!exists) {
      await prisma.personNickname.create({
        data: { personId, nickname: nk.nickname, type: nk.type, priority: nk.priority },
      })
      console.log(`  ✅ 별명: ${nk.nickname}`)
    }
  }

  // ── 5) 연보 ─────────────────────────────────────────────────────────────────
  let lifeEventCount = 0
  for (const e of LIFE_EVENTS) {
    const exists = await prisma.personLifeEvent.findFirst({ where: { personId, title: e.title } })
    if (exists) continue
    const endDate = e.endYear
      ? new Date(e.endYear, (e.endMonth ?? 12) - 1, e.endDay ?? (e.endMonth ? 28 : 31))
      : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: e.title,
        description: e.description,
        category: e.category,
        startDate: toDate(e.startYear, e.startMonth, e.startDay),
        startDatePrecision: precisionOf(e.startMonth, e.startDay),
        endDate,
        endDatePrecision: e.endYear ? precisionOf(e.endMonth, e.endDay) : null,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 6) 능력치 ────────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({ where: { personId, accountId: admin.id } })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: GALLIENI_STATS.politics,
        military: GALLIENI_STATS.military,
        diplomacy: GALLIENI_STATS.diplomacy,
        intellect: GALLIENI_STATS.intellect,
        charisma: GALLIENI_STATS.charisma,
        administration: GALLIENI_STATS.administration,
        notes: GALLIENI_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${GALLIENI_STATS.politics}·군사 ${GALLIENI_STATS.military}·` +
        `외교 ${GALLIENI_STATS.diplomacy}·학식 ${GALLIENI_STATS.intellect}·` +
        `카리스마 ${GALLIENI_STATS.charisma}·행정 ${GALLIENI_STATS.administration}`,
    )
  }

  console.log('✅ 조제프 갈리에니 보강 완료\n')
}
