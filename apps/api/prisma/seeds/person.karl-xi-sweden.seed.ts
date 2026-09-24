/**
 * 칼 11세 (Karl XI, 1655~1697) — 스웨덴 국왕 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/재위/연보 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 네 살에 아버지를 잃고 열두 해의 섭정정 아래 방치되다시피 자랐고, 열일곱에 친정을 시작한
 * 이듬해 스코네 전쟁을 맞아 룬드에서 직접 기병을 이끌고 왕국을 지켰다. 전후에는 귀족에게
 * 넘어간 왕령을 대규모로 되찾는 「대환수(리덕션)」와 병농 일체의 「인델닝스베르크」로
 * 재정과 상비군을 다시 세웠고, 그 과정에서 신분회 스스로가 국왕을 「절대적 주권 군주」로
 * 선언하게 만들었다. 아들 칼 12세가 대북방전쟁에서 쓴 국력은 이 사람이 쌓아 둔 것이다.
 *
 * ── 재위를 어느 역사국가에 다느냐(이 시드의 핵심 판정) ────────────────────────
 * 재위는 **「스웨덴 제국」(1611~1721, 대국 시대)** 행에 단다. 「스웨덴 왕국」(970~현존)이
 * 아니다. 이유는 서수 규약 때문이다 — [[reign-ordinal-scope-review]] 정본 P와 DB 실측에 따라
 * regnalNumber는 «그 역사국가 행 안에서의 통산 제N대»이고(그레이트브리튼 왕국이 앤 1 →
 * 조지 1세 2 → 조지 2세 3), 970년부터 오늘까지 이어지는 「스웨덴 왕국」 행에서는 중세 군주
 * 목록 자체가 사료마다 갈려 통산 순번을 확정할 수 없다. 반면 「스웨덴 제국」 행 안에서는
 * 구스타브 2세 아돌프 1 → 크리스티나 2 → 칼 10세 구스타브 3 → **칼 11세 4** → 칼 12세 5로
 * 순번이 일의적으로 정해지고, 그의 재위(1660~1697)가 이 행의 기간에 온전히 들어간다.
 * Person.historicalCountryId도 같은 행으로 맞춰 재위와 어긋나지 않게 하고, 상위 정체인
 * 「스웨덴 왕국」은 PersonCountryAffiliation(CITIZENSHIP)으로 따로 잇는다.
 *
 * ⚠️ 서수 «11세» 자체가 허구다 — 16세기 요하네스 망누스가 지어낸 고대 왕 계보 때문에 번호가
 * 여섯이나 부풀려졌고, 실제로 그는 스웨덴의 여섯 번째 칼이다. 그래도 공식 표기가 XI이므로
 * regnalName은 «칼 11세»로 두고 이 사정은 별칭 reason에 남긴다.
 *
 * 날짜 규약: **이 시드의 모든 날짜는 스웨덴이 당시 쓰던 율리우스력(구력)이다.** 스웨덴은
 * 1700년까지 율리우스력을 썼으므로(그 뒤 1712년까지는 스웨덴력이라는 과도 역법) 생몰·전투·
 * 조약일이 모두 구력이며, 그레고리력으로는 17세기 기준 10일이 늦다(예: 사망 1697-04-05 구력
 * = 04-15 신력, 룬드 전투 1676-12-04 구력 = 12-14 신력). 구력을 정본으로 두는 것은 스웨덴어·
 * 영어 사료가 모두 구력 날짜로 적기 때문이고, 신력 환산은 notes·연보 설명에 병기한다.
 *
 * 의존: seedSwedenHistoricalCountries(「스웨덴 제국」·「스웨덴 왕국」·「스웨덴령 포메라니아」 HC)
 *       + seedGovernmentPositionDefinitions('국왕' 정의). 「비텔스바흐 가문」 왕조는 있으면
 *       연결하고 없으면 생략한다.
 *
 * 등록 항목:
 *  - Person x1 (칼 11세 — historicalCountryId=스웨덴 제국, dynastyId=비텔스바흐 가문)
 *  - SovereignReign x1 (스웨덴 제국 제4대, 1660-02-13 ~ 1697-04-05)
 *  - PersonNickname x5
 *  - PersonCountryAffiliation x4
 *  - PersonLifeEvent x26 (연보 — 배열 순서를 sortOrder로. 사망 당일·사후 항목은 넣지 않는다)
 *  - PersonStats x1 (6축 능력치, admin 평가)
 *
 * ── 범위 판단 ──────────────────────────────────────────────────────────────
 * **부모·배우자·아들은 만들지 않는다.** 기준은 레오폴트 1세 시드에서 세운 «기존 그래프에
 * 붙는가»다. 레오폴트 때는 형·누나·조카가 **이미 DB에 있는데** 부모가 없어 끊겨 있었으므로
 * 부모 2행이 기존 관계 4개를 이어 주는 이득이 있었다. 여기는 사정이 정반대다 — DB에 스웨덴
 * 인물이 **한 명도 없어서**(실측 0행) 칼 10세 구스타브·헤드비그 엘레오노라·울리카 엘레오노라·
 * 칼 12세를 만들어 봐야 서로만 가리키는 새 고립 섬이 될 뿐이고, 특히 칼 12세는 대북방전쟁
 * 전체를 짊어진 독립 인물이라 스텁으로 선점하면 나중에 delete-recreate 위험이 생긴다.
 * 후속 person.sweden-monarchs 시드에서 한꺼번에 만드는 것이 옳다.
 * 대신 가족 관계는 연보(FAMILY)와 전기로 남겨 나중에 FK로 승격할 수 있게 해 둔다.
 *
 * ── 조사 메모(채택/기각) ────────────────────────────────────────────────────
 *  ① 즉위일은 **1660-02-13** — 아버지 칼 10세 구스타브가 예테보리에서 신분회 회기 중 죽은 날.
 *     대관식(1675-09-28)이 아니라 사망일이 재위 시작이다(부왕 사망 즉시 왕위 승계).
 *  ② appointmentMethod=**HEREDITARY**. 1660년 유언 분쟁은 «누가 섭정하느냐»의 다툼이었지
 *     왕위 자체는 다툼이 없었다 — 선출 요소가 없으므로 PARLIAMENTARY_ELECTION·
 *     ELECTIVE_MONARCHY 모두 부적합.
 *  ③ 친정 시작은 **1672-12-18 성년 선언**이고 대관식은 그보다 뒤인 1675-09-28이다. 둘 사이
 *     3년은 그가 이미 친정 중이되 아직 대관하지 않은 구간이라 재위 레코드를 쪼개지 않고
 *     연보 두 항목으로 표현한다.
 *  ④ **룬드 전투 1676-12-04(구력)** — 참전 규모 대비 사망률이 북유럽 전사상 최고로 꼽히는
 *     전투이며, 양군 합쳐 1만 8천 중 8~9천이 죽었다는 추계가 통설이다. 숫자 계통이 갈려
 *     연보에는 «절반 가까이»로 적고 정확한 수치는 단정하지 않는다.
 *  ⑤ **대환수(reduktion)는 1680년 신분회 결의가 시작이고 치세 내내 이어진 과정**이다.
 *     «1680년에 끝난 사건»으로 적으면 안 된다 — 리보니아에서는 1680년대 후반까지 이어져
 *     요한 파트쿨의 저항과 망명(1694 궐석 사형)을 낳았고, 그 망명이 훗날 대북방전쟁의
 *     반스웨덴 동맹으로 이어진다. 이 아카이브의 「스웨덴령 리보니아」 HC 설명과 같은 사건이다.
 *  ⑥ 절대왕정 선언은 **한 번이 아니라 세 단계**다 — 1680년 신분회가 국왕이 국정자문회의에
 *     구속되지 않음을 결의, 1682년 신분회가 입법권을 인정, 1693-12 신분회가 «절대적 주권
 *     군주»임을 명문으로 선언. 이 아카이브에서는 1680·1693 두 항목만 연보에 싣고 1682년은
 *     인델닝스베르크 항목에 함께 적는다.
 *  ⑦ **인델닝스베르크(할당제)는 그의 창안이 아니라 확립이다** — 구스타브 2세 아돌프 시대의
 *     선례를 1682년 이후 전국 규모로 제도화해 농가가 병사 한 명을 부양하는 상비군 체계를
 *     완성했다. «창설»로 적으면 과장이다.
 *  ⑧ 사인은 **위암**이 통설이다(사후 부검 소견 계통). 다만 «복부 종양»까지만 적는 계통도
 *     있어 deathCause에 두 표기를 함께 남긴다.
 *  ⑨ **트레 크로노르 성 화재(1697-05-07)는 그가 죽고 한 달 뒤**다. 빈소가 차려져 있던 왕성이
 *     불타 중세 이래의 왕실 기록이 소실되었다 — 사후 사건이므로 연보가 아니라 deathNote에 싣는다
 *     (연보 타임라인이 사망 이후 노드를 버리는 규약).
 *  ⑩ 「회색 망토(Gråkappan)」 미행 순시는 **후대 민담 계통이 강하다** — 직접 사료로 확인되는
 *     것은 그가 수행을 거의 두지 않고 왕국을 끊임없이 순회했다는 사실까지이고, 변장 일화
 *     자체는 18~19세기 전승에서 부풀려졌다. 별칭으로는 싣되 사실 주장으로 적지 않는다.
 *  ⑪ **1695~1697 대기근**은 그의 치세 마지막 사건이자 최대 재난이다 — 핀란드 인구의 3분의 1,
 *     스웨덴 본토에서도 수만 명이 죽었다. 절대왕정의 곡물 비축·구휼이 작동하지 않은 사례라
 *     치세 평가에서 빼면 안 된다.
 *  ⑫ 1697년 레이스베이크 조약에서 **스웨덴이 중재국을 맡았다** — 그의 사망 직전까지 이어진
 *     일이며, 1679년 이후 18년을 전쟁 없이 버틴 외교의 결산이다. 조약 체결(09~10월)은
 *     그가 죽은 뒤이므로 연보에는 1697년 초의 중재 개시까지만 적는다.
 *  ⑬ 그의 학습 곤란(철자·독해)은 여러 계통이 일치해 기록하나 **난독증이라는 현대 진단명은
 *     쓰지 않는다** — 사후 추정일 뿐이다. 대신 «문서보다 현장과 구두 보고를 신뢰했다»는
 *     동시대 관찰로 적는다.
 *
 * ── 기존 아카이브와의 관계 ──────────────────────────────────────────────────
 *  ㉠ 「비텔스바흐 가문」(a4bf1d48) 행은 광의의 가문이고 그가 속한 것은 그 방계인
 *     팔츠-츠바이브뤼켄-클레에부르크 가계다. 새 왕조 행을 만들면 소속 인물 1명짜리 고립
 *     행이 또 생기므로(레오폴트 세션이 보고한 작센/코부르크 4행 중복의 재발) 기존 광의 행에
 *     붙이고 방계는 sur_name·전기로 표기한다. dynastyOrdinal은 그래서 비워 둔다 —
 *     «비텔스바흐 제2대»는 사실이 아니고, 스웨덴 팔츠 가계 제2대라는 뜻은 이 필드로 표현할
 *     수 없기 때문이다.
 *  ㉡ 「스웨덴령 리보니아」 HC 설명이 이미 «칼 11세의 영지 환수(리덕치온)»와 파트쿨 망명을
 *     적고 있다 — 이 시드의 연보 ⑤ 항목과 같은 사건이며 서술이 어긋나지 않게 맞췄다.
 */
import {
  AppointmentMethod,
  DeathType,
  Era,
  NameDisplayOrder,
  PersonCountryAffiliationType,
  PersonNicknameType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 명세 ───────────────────────────────────────────────────────────────
const KARL_XI = {
  name: '칼',
  middleName: null as string | null,
  surname: '팔츠츠바이브뤼켄',
  originalName: 'Karl XI of Sweden',
  gender: 'MALE' as const,
  birthOrder: 1,
  birthYear: 1655, birthMonth: 11, birthDay: 24,
  birthNote:
    '1655-11-24(구력) 스톡홀름의 왕성 트레 크로노르에서, 즉위한 지 여섯 달 된 칼 10세 ' +
    '구스타브와 홀슈타인고토르프의 헤드비그 엘레오노라 사이의 외아들로 태어났다. ' +
    '아버지는 그가 태어나기 넉 달 전에 폴란드 원정에 나서 있었고, 아들이 네 살이 될 때까지 ' +
    '대부분을 전장에서 보냈다. 태어난 순간부터 왕위 계승자였으나 왕실은 스웨덴에 자리 잡은 지 ' +
    '한 해밖에 되지 않은 신생 가계였다 — 그의 아버지가 사촌 크리스티나 여왕의 퇴위로 ' +
    '1654년에야 왕위를 받은 팔츠-츠바이브뤼켄-클레에부르크 가문의 첫 국왕이었기 때문이다.',
  birthPlaceText: '스웨덴 스톡홀름 트레 크로노르 왕성',
  deathYear: 1697, deathMonth: 4, deathDay: 5,
  deathPlaceText: '스웨덴 스톡홀름 트레 크로노르 왕성',
  deathType: DeathType.ILLNESS,
  deathCause:
    '위암으로 인한 쇠약. 1696년 겨울부터 복통과 식욕 부진이 심해졌고 1697-04-05(구력, ' +
    '신력 04-15) 마흔한 살로 죽었다. 사후 소견 계통은 위의 종양을 지목하나, 「복부 종양」 ' +
    '이상으로 부위를 특정하지 않는 서술 계통도 있어 두 표기를 함께 남긴다.',
  deathNote:
    '⚠️ 사후 한 달 만인 1697-05-07 빈소가 차려져 있던 트레 크로노르 왕성에 불이 났다. ' +
    '그가 태어나고 죽은 성이자 중세 이래 스웨덴 왕실 문서고였던 건물이 타면서 ' +
    '왕국 기록의 상당 부분이 사라졌고, 그 자리에 오늘의 스톡홀름 왕궁이 새로 지어졌다. ' +
    '왕위는 열다섯 살의 아들 칼 12세에게 넘어갔는데, 유언은 열여덟 살까지 섭정을 두도록 ' +
    '했으나 신분회가 그해 11월 곧바로 친정을 선포했다. 아버지가 17년간 쌓아 둔 재정과 ' +
    '상비군은 3년 뒤 시작된 대북방전쟁에서 아들이 21년 동안 쓰고 소진한다. ' +
    '유해는 스톡홀름 리다르홀름 교회의 카롤린 납골묘에 안장되었다.',
  influence: 71,
  biography:
    '스웨덴 국왕(재위 1660~1697). 네 살에 즉위해 열두 해의 섭정정을 겪고, 친정 3년 만에 맞은 ' +
    '스코네 전쟁에서 룬드 전투를 직접 이끌어 왕국을 지켰다. 전후에는 귀족에게 넘어간 왕령을 ' +
    '되찾는 「대환수」와 병농 일체의 상비군 제도로 국가를 다시 세웠고, 신분회 스스로가 그를 ' +
    '「절대적 주권 군주」로 선언하게 만들었다. ' +
    '\n\n' +
    '방치된 소년왕(1655~1672). 그의 가계는 스웨덴 왕실이 된 지 한 해밖에 되지 않은 신참이었다 — ' +
    '아버지 칼 10세 구스타브가 사촌 크리스티나 여왕의 퇴위로 1654년 왕위를 받은 ' +
    '팔츠-츠바이브뤼켄-클레에부르크 가문의 첫 국왕이었다. 그 아버지가 1660-02-13 예테보리 ' +
    '신분회 회기 중 갑자기 죽자 네 살의 아들이 왕이 되었고, 유언을 둘러싼 다툼 끝에 모후 ' +
    '헤드비그 엘레오노라를 의장으로 하는 5인 섭정회가 나라를 맡았다. 실권자는 재상 마그누스 ' +
    '가브리엘 데 라 가르디였다. 섭정정 12년 동안 왕령은 귀족에게 계속 넘어갔고 국고는 비었으며, ' +
    '1672년 프랑스와 맺은 보조금 조약은 훗날 스웨덴을 원치 않는 전쟁으로 끌고 들어간다. ' +
    '소년왕의 교육은 방치에 가까웠다. 철자와 독해를 끝내 버거워했고 라틴어도 익히지 못했으며, ' +
    '동시대 관찰자들은 그가 문서보다 현장과 구두 보고를 신뢰했다고 적었다. 대신 사냥과 승마, ' +
    '그리고 숫자와 장부를 다루는 감각은 뛰어났다 — 훗날의 통치를 예고하는 조합이었다. ' +
    '\n\n' +
    '친정과 스코네 전쟁(1672~1679). 1672-12-18 성년이 선포되어 친정을 시작했으나, 물려받은 것은 ' +
    '프랑스와의 동맹 의무였다. 1675년 스웨덴군이 브란덴부르크의 페어벨린에서 패하자 «무적 ' +
    '스웨덴»의 명성이 깨졌고, 그 틈을 노린 덴마크가 그해 9월 선전포고하며 스코네 전쟁이 ' +
    '시작되었다. 개전 초는 연패였다 — 1676년 6월 욀란드 해전에서 기함 크로난이 폭발하며 함대가 ' +
    '무너졌고 덴마크군은 스코네 전역을 점령했다. 그해 8월 할름스타드에서 첫 승리를 거둔 뒤, ' +
    '12-04 룬드에서 그는 스무 살의 나이로 기병 우익을 직접 이끌고 하루 종일 이어진 난전 끝에 ' +
    '승리했다. 양군을 합쳐 1만 8천 중 절반 가까이가 죽은, 북유럽 전사상 가장 유혈적인 ' +
    '전투였다. 이듬해 란스크로나에서 다시 이겼고, 1679년 프랑스의 중재로 맺어진 룬드 조약과 ' +
    '생제르맹 조약은 전전 상태를 회복해 주었다. 전쟁은 그에게 두 가지를 가르쳤다 — 프랑스의 ' +
    '보조금에 매인 외교는 위험하고, 귀족에게 재정을 맡긴 국가는 전쟁을 치를 수 없다는 것이다. ' +
    '\n\n' +
    '대환수 — 재정 혁명(1680~). 1680년 신분회에서 하급 신분들이 «왕령을 되찾자»고 요구하자 ' +
    '그는 이를 받아 대환수(reduktion)에 착수했다. 백작령·남작령을 비롯해 선대가 귀족에게 ' +
    '양도했던 영지를 왕령으로 거둬들이는 작업은 치세 내내 이어져, 왕실 세입을 몇 배로 늘리고 ' +
    '국가 부채를 청산했다. 대가는 컸다 — 고위 귀족의 경제적 기반이 무너졌고, 발트해 건너 ' +
    '리보니아에서는 1680년대 후반까지 이어진 환수에 맞서 요한 파트쿨이 저항하다 1694년 궐석 ' +
    '사형을 선고받고 망명했다. 그 망명자가 훗날 대북방전쟁의 반스웨덴 동맹을 조직한다. ' +
    '같은 해 신분회는 국왕이 국정자문회의의 조언에 구속되지 않는다고 결의했고, 1682년에는 ' +
    '입법권을, 1693년 12월에는 «오직 신에게만 책임지는 절대적 주권 군주»임을 명문으로 ' +
    '선언했다. 스웨덴의 절대왕정은 국왕이 빼앗은 것이 아니라 신분회가 넘겨준 것이었다 — ' +
    '귀족을 누르려는 하급 신분과 재정을 세우려는 국왕의 이해가 맞아떨어진 결과다. ' +
    '\n\n' +
    '인델닝스베르크와 칼스크로나(1680~1697). 환수로 확보한 왕령은 그대로 군제로 전환되었다. ' +
    '구스타브 2세 아돌프 시대의 선례를 전국 규모로 확립한 할당제(indelningsverket)는 농가 ' +
    '몇 호가 병사 한 명에게 토지와 집을 대는 방식으로, 국고를 거의 쓰지 않고 상비군 2만 5천과 ' +
    '기병을 유지하게 했다. 해군은 덴마크 해협에서 겨울에 얼지 않는 남단으로 옮겨 1680년 ' +
    '칼스크로나를 새로 건설했다 — 도시 이름 자체가 «칼의 왕관»이다. 1686년 교회법으로 ' +
    '전 교구에 호적과 교리 문답 시험을 의무화한 것도 같은 기획의 일부였다. 인구와 토지를 ' +
    '파악해야 병사와 세금이 나오기 때문이다. 그 자신은 이 체계의 감독관처럼 살았다 — 수행을 ' +
    '거의 두지 않고 왕국을 끊임없이 순회하며 직접 장부와 현장을 확인했고, 여기서 훗날 회색 ' +
    '망토 차림으로 신분을 감추고 다녔다는 「그로카판」 전승이 자라났다. ' +
    '\n\n' +
    '마지막 2년(1695~1697). 1693년 왕비 울리카 엘레오노라를 잃은 뒤 그는 더 고립되었다. ' +
    '1695년부터 3년 연속 흉작이 이어지며 대기근이 북유럽을 덮쳤고, 핀란드 인구의 3분의 1이 ' +
    '굶어 죽었다. 그가 세운 비축과 구휼 체계는 이 규모 앞에 작동하지 않았다 — 절대왕정의 ' +
    '가장 큰 실패이자, 재정과 군대를 위해 설계된 국가가 백성을 먹이는 데는 설계되지 않았음을 ' +
    '보여준 사건이다. 대외적으로는 1679년 이후 18년을 전쟁 없이 버텼고 1697년에는 유럽 ' +
    '전쟁을 끝낸 레이스베이크 조약의 중재국을 맡았다. 그해 4월 위암으로 마흔한 살에 죽었고, ' +
    '한 달 뒤 그가 태어나고 죽은 왕성이 불탔다. 그가 쌓아 둔 재정과 상비군은 3년 뒤 시작된 ' +
    '대북방전쟁에서 열다섯 살 아들 칼 12세가 21년 동안 쓰고 소진한다. 스웨덴 대국 시대의 ' +
    '마지막 축적기를 만든 왕이자, 그 축적을 남김없이 쓰게 될 왕의 아버지였다.',
}

// ── 재위 ────────────────────────────────────────────────────────────────────
const REIGN = {
  /** ⚠️「스웨덴 왕국」(970~)이 아니라 대국 시대 행. 파일 머리말의 판정 근거 참조 */
  countryName: '스웨덴 제국',
  positionTitle: '국왕',
  /** 이름별 서수 정본(Person.regnalName은 오염 필드라 쓰지 않는다) */
  regnalName: '칼 11세 (Karl XI)',
  /** 스웨덴 제국(1611~1721) 통산 제4대 — 구스타브 2세 아돌프 1·크리스티나 2·칼 10세 구스타브 3 */
  regnalNumber: 4,
  termNumber: 1,
  startYear: 1660, startMonth: 2, startDay: 13,
  endYear: 1697, endMonth: 4, endDay: 5,
  appointmentMethod: AppointmentMethod.HEREDITARY,
  endReason: TenureEndReason.DEATH_IN_OFFICE,
  appointmentDetail:
    '1660-02-13(구력) 아버지 칼 10세 구스타브가 예테보리에서 열린 신분회 회기 중 폐렴으로 ' +
    '급사하면서 만 네 살에 즉위했다. 왕위 자체에는 다툼이 없었고(부계 계승), 다툼은 «누가 ' +
    '섭정하느냐»였다 — 선왕의 유언은 동생 아돌프 요한에게 큰 역할을 맡겼으나 신분회와 ' +
    '귀족이 이를 뒤집어, 모후 헤드비그 엘레오노라를 의장으로 하고 재상 마그누스 가브리엘 ' +
    '데 라 가르디가 실권을 쥔 5인 섭정회가 구성되었다. 성년 선언은 1672-12-18, 대관식은 ' +
    '그보다 뒤인 1675-09-28 스톡홀름 대성당에서 치러졌다 — 즉위·친정·대관이 15년에 걸쳐 ' +
    '따로 일어난 드문 사례다.',
  endReasonDetail:
    '재위 중 사망. 1696년 겨울부터 악화된 위암으로 1697-04-05(구력) 트레 크로노르 왕성에서 ' +
    '죽었고, 열다섯 살의 아들 칼 12세가 승계했다. 유언은 열여덟 살까지 섭정을 두도록 했으나 ' +
    '신분회는 그해 11월 곧바로 칼 12세의 친정을 선포했다.',
  notes:
    '37년 1개월 23일 재위 — 이 아카이브에 등록된 재위 가운데 손꼽히게 길다. 앞의 12년은 ' +
    '섭정정(1660~1672)이고 실제 친정은 1672-12-18부터 24년간이다. ' +
    '스코네 전쟁(1675~1679)에서 룬드·란스크로나를 직접 지휘해 왕국을 지켰고, 전후 대환수 ' +
    '(reduktion)·할당제(indelningsverket)·칼스크로나 해군기지·1686년 교회법으로 재정과 ' +
    '상비군을 재건했다. 절대왕정은 세 단계로 확립되었다 — 1680년 신분회가 국왕이 국정자문 ' +
    '회의에 구속되지 않음을 결의, 1682년 입법권 인정, 1693-12 «절대적 주권 군주» 명문 선언. ' +
    '1679년 이후 18년을 전쟁 없이 버텼고 1697년 레이스베이크 조약에서는 중재국을 맡았다. ' +
    '반면 1695~1697 대기근에 국가는 무력했다. ' +
    '\n\n' +
    '⚠️날짜는 모두 **율리우스력(구력)** — 스웨덴은 1700년까지 율리우스력을 썼다. 신력으로는 ' +
    '즉위 1660-02-23, 사망 1697-04-15이다. ' +
    '\n\n' +
    '⚠️재위를 「스웨덴 왕국」(970~현존)이 아니라 「스웨덴 제국」(1611~1721) 행에 단 것은 서수 ' +
    '규약 때문이다 — regnalNumber는 그 역사국가 행 안의 통산 제N대인데, 970년부터의 왕국 ' +
    '행에서는 중세 군주 목록이 사료마다 갈려 순번을 확정할 수 없고 대국 시대 행 안에서는 ' +
    '구스타브 2세 아돌프 1 → 크리스티나 2 → 칼 10세 구스타브 3 → 칼 11세 4로 일의적이다. ' +
    '상위 정체 「스웨덴 왕국」은 소속 국가(CITIZENSHIP)로 따로 이어 두었다.',
}

// ── 별칭 ────────────────────────────────────────────────────────────────────
const NICKNAMES: {
  nickname: string
  type: PersonNicknameType
  priority: number
  reason: string
}[] = [
  {
    nickname: '스베아인·예타인·벤드인의 왕 (Sveriges, Götes och Vendes Konung)',
    type: 'HONORIFIC',
    priority: 0,
    reason:
      '당대 스웨덴 국왕의 정식 칭호. 멜라렌 호의 스베아인과 남쪽 예타인이라는 왕국의 이중 ' +
      '기원에 발트 남안의 벤드인이 더해진 형태로, 오늘날 스웨덴 국왕 칭호에도 남아 있다.',
  },
  {
    nickname: '회색 망토 (Gråkappan)',
    type: 'EPITHET',
    priority: 1,
    reason:
      '회색 망토 차림으로 신분을 감추고 지방을 돌며 관리들의 부정을 적발했다는 전승에서 온 ' +
      '별명. ⚠️직접 사료로 확인되는 것은 그가 수행을 거의 두지 않고 왕국을 끊임없이 순회하며 ' +
      '직접 장부와 현장을 확인했다는 사실까지이고, 변장 일화 자체는 18~19세기 민담 계통에서 ' +
      '부풀려진 것이다.',
  },
  {
    nickname: '전제 군주 (envåldskonung)',
    type: 'EPITHET',
    priority: 2,
    reason:
      '스웨덴어로 «홀로 다스리는 왕». 1693-12 신분회가 그를 «오직 신에게만 책임지는 절대적 ' +
      '주권 군주»로 선언하면서 굳어진 표현으로, 스웨덴 절대왕정기(1680~1718)를 가리키는 ' +
      '«envälde»라는 시대 명칭의 어원이기도 하다.',
  },
  {
    nickname: 'Carl XI',
    type: 'OTHER',
    priority: 3,
    reason:
      '스웨덴어 당대 표기(현대 스웨덴어는 Karl XI). ⚠️서수 «11세»는 사실 허구다 — 16세기 ' +
      '요하네스 망누스가 『고트·스웨덴 왕들의 역사』에서 지어낸 고대 왕 계보 때문에 번호가 ' +
      '여섯이나 부풀려졌고, 실제로 그는 스웨덴의 여섯 번째 칼이다. 공식 표기가 XI이므로 ' +
      '재위명은 «칼 11세»로 두되 이 사정을 여기에 남긴다.',
  },
  {
    nickname: '팔츠-츠바이브뤼켄-클레에부르크 공자',
    type: 'OTHER',
    priority: 4,
    reason:
      '가문 표기. 비텔스바흐가의 방계인 팔츠-츠바이브뤼켄-클레에부르크 가계 출신으로, ' +
      '아버지 칼 10세 구스타브가 사촌 크리스티나 여왕의 퇴위(1654)로 왕위를 받으면서 ' +
      '스웨덴 왕실이 된 지 한 해 만에 태어난 첫 세대다.',
  },
]

// ── 국가 소속 ───────────────────────────────────────────────────────────────
interface AffiliationSpec {
  countryName: string
  affiliationType: PersonCountryAffiliationType
  priority: number
  startYear?: number; startMonth?: number; startDay?: number
  endYear?: number; endMonth?: number; endDay?: number
  note: string
}

const AFFILIATIONS: AffiliationSpec[] = [
  {
    countryName: '스웨덴 제국',
    affiliationType: 'CITIZENSHIP',
    priority: 1,
    startYear: 1655, startMonth: 11, startDay: 24,
    endYear: 1697, endMonth: 4, endDay: 5,
    note: '재위 국가이자 이 인물의 정본 국가. 생몰 전 기간이 대국 시대(1611~1721) 안에 들어간다.',
  },
  {
    countryName: '스웨덴 제국',
    affiliationType: 'BIRTH_PLACE',
    priority: 1,
    startYear: 1655, startMonth: 11, startDay: 24,
    note: '스톡홀름 트레 크로노르 왕성 출생. 그가 죽은 곳이기도 하며, 사후 한 달 만에 불탔다.',
  },
  {
    countryName: '스웨덴 왕국',
    affiliationType: 'CITIZENSHIP',
    priority: 2,
    startYear: 1655, startMonth: 11, startDay: 24,
    endYear: 1697, endMonth: 4, endDay: 5,
    note:
      '대국 시대를 품은 상위 정체. 재위는 서수 규약상 「스웨덴 제국」 행에 달았으므로, ' +
      '끊이지 않고 이어지는 왕국 행과는 이 소속으로 잇는다.',
  },
  {
    countryName: '스웨덴령 포메라니아',
    affiliationType: 'OTHER',
    priority: 3,
    startYear: 1660, startMonth: 2, startDay: 13,
    endYear: 1697, endMonth: 4, endDay: 5,
    note:
      '스웨덴 국왕으로서 포메라니아 공작을 겸해 신성로마제국의 제후 자격을 가졌다 — ' +
      '독일 제국의회에 자리를 둔 스웨덴 왕의 이중 지위다. 이 영지에 거주한 적은 없다.',
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

// ⚠️사망일(1697-04-05) 당일 및 사후 항목은 넣지 않는다 — 연보 타임라인이 «사망 이후 노드는
//   제외» 규약으로 걸러내고 사망 노드는 deathType·deathCause·deathNote에서 자동 생성한다.
//   트레 크로노르 화재(1697-05-07)·칼 12세 친정 선포(1697-11)는 deathNote가 싣는다.
// ⚠️배열 순서가 sortOrder다 — 날짜순과 어긋나지 않게 유지할 것.
const LIFE_EVENTS: LifeEventEntry[] = [
  {
    title: '부왕 칼 10세 구스타브 사망 — 만 네 살에 즉위',
    category: 'POLITICAL',
    startYear: 1660, startMonth: 2, startDay: 13,
    description:
      '아버지가 예테보리에서 열린 신분회 회기 중 폐렴으로 급사하면서 네 살의 외아들이 왕이 ' +
      '되었다. 즉위 당시 스웨덴은 폴란드·덴마크·러시아를 상대로 한 북방전쟁 한복판에 있었다.',
  },
  {
    title: '섭정정 개시 — 모후 헤드비그 엘레오노라와 5인 섭정회',
    category: 'POLITICAL',
    startYear: 1660, startMonth: 3,
    endYear: 1672, endMonth: 12,
    description:
      '선왕의 유언은 동생 아돌프 요한에게 큰 몫을 맡겼으나 신분회와 귀족이 이를 뒤집고, ' +
      '모후 헤드비그 엘레오노라를 의장으로 하는 5인 섭정회를 세웠다. 실권자는 재상 마그누스 ' +
      '가브리엘 데 라 가르디였다. 12년 동안 왕령은 계속 귀족에게 넘어갔고 국고는 비어 갔다.',
  },
  {
    title: '올리바·코펜하겐 조약 — 섭정정이 북방전쟁을 매듭짓다',
    category: 'DIPLOMATIC',
    startYear: 1660, startMonth: 5,
    endYear: 1660, endMonth: 6,
    description:
      '05-03 올리바 조약으로 폴란드가 스웨덴의 리보니아 영유를 인정했고, 06-06 코펜하겐 ' +
      '조약으로 덴마크와의 전쟁이 끝났다. 선왕이 벌여 놓은 전쟁을 섭정회가 수습한 것으로, ' +
      '스코네·블레킹에·보후슬렌을 스웨덴 영토로 확정한 이 국경이 오늘까지 이어진다.',
  },
  {
    title: '방치된 교육 — 문서보다 현장을 신뢰한 소년',
    category: 'EDUCATION',
    startYear: 1662,
    endYear: 1672,
    description:
      '섭정회는 소년왕의 교육에 거의 힘을 쏟지 않았다. 그는 철자와 독해를 끝내 버거워했고 ' +
      '라틴어도 익히지 못했다 — 동시대 관찰자들은 그가 문서보다 현장과 구두 보고를 믿었다고 ' +
      '적었다. 대신 사냥·승마와 숫자·장부를 다루는 감각이 뛰어났다. ⚠️후대에 붙은 난독증 ' +
      '진단명은 사후 추정일 뿐이라 쓰지 않는다.',
  },
  {
    title: '프랑스와 보조금 조약 — 훗날의 전쟁을 부른 동맹',
    category: 'DIPLOMATIC',
    startYear: 1672, startMonth: 4,
    description:
      '데 라 가르디의 섭정정이 재정난을 메우려 루이 14세의 보조금을 받고 군사 지원 의무를 ' +
      '졌다. 이 의무가 3년 뒤 스웨덴을 원치 않는 스코네 전쟁으로 끌고 들어간다 — 그가 평생 ' +
      '«외국 보조금에 매인 외교»를 경계한 출발점이다.',
  },
  {
    title: '성년 선언 — 친정 시작',
    category: 'POLITICAL',
    startYear: 1672, startMonth: 12, startDay: 18,
    description:
      '만 열일곱에 신분회가 성년을 선포하면서 섭정정이 끝나고 친정이 시작되었다. ' +
      '대관식은 아직 3년 뒤의 일이라, 즉위(1660)·친정(1672)·대관(1675)이 15년에 걸쳐 ' +
      '따로 일어난 드문 사례가 되었다.',
  },
  {
    title: '페어벨린 패전 — 「무적 스웨덴」의 명성이 깨지다',
    category: 'MILITARY',
    startYear: 1675, startMonth: 6, startDay: 18,
    description:
      '프랑스와의 동맹 의무로 브란덴부르크를 공격한 스웨덴군이 페어벨린에서 대선제후 ' +
      '프리드리히 빌헬름에게 패했다. 규모는 크지 않았으나 30년 전쟁 이래의 무적 신화가 ' +
      '무너진 사건으로 받아들여졌고, 덴마크가 설욕의 기회를 잡는 계기가 되었다.',
  },
  {
    title: '스코네 전쟁 개전 — 덴마크의 선전포고',
    category: 'MILITARY',
    startYear: 1675, startMonth: 9,
    endYear: 1679, endMonth: 9,
    description:
      '1658년 로스킬레 조약으로 잃은 스코네를 되찾으려는 덴마크가 선전포고했다. ' +
      '4년에 걸친 이 전쟁이 그의 치세를 둘로 가른다 — 전쟁 전의 스웨덴은 귀족이 재정을 쥔 ' +
      '나라였고, 전쟁 후의 스웨덴은 국왕이 재정과 군대를 쥔 나라가 된다.',
  },
  {
    title: '대관식 — 스톡홀름 대성당',
    category: 'POLITICAL',
    startYear: 1675, startMonth: 9, startDay: 28,
    description:
      '전쟁이 막 시작된 시점에 스톡홀름 대성당에서 대관했다. 친정 선언(1672)보다 3년, ' +
      '즉위(1660)보다 15년 뒤였다.',
  },
  {
    title: '욀란드 해전 — 기함 크로난 폭침',
    category: 'MILITARY',
    startYear: 1676, startMonth: 6, startDay: 1,
    description:
      '덴마크·네덜란드 연합 함대에 맞선 해전에서 스웨덴 기함 크로난이 급선회 중 전복·폭발해 ' +
      '800여 명과 함께 가라앉았고 함대는 궤멸했다. 제해권을 잃은 스웨덴은 스코네의 육군을 ' +
      '고립시켰고, 덴마크군은 곧 스코네 전역을 점령했다. 훗날 그가 해군 기지를 남단 ' +
      '칼스크로나로 옮긴 직접적인 배경이다.',
  },
  {
    title: '할름스타드 전투 — 첫 승리',
    category: 'MILITARY',
    startYear: 1676, startMonth: 8, startDay: 17,
    description:
      '연패 끝에 거둔 첫 승리. 스무 살의 국왕이 직접 군을 이끌었고, 이 승리로 덴마크군의 ' +
      '북상이 막히면서 스코네 회복의 발판이 마련되었다.',
  },
  {
    title: '룬드 전투 — 북유럽 전사상 가장 유혈적인 하루',
    category: 'MILITARY',
    startYear: 1676, startMonth: 12, startDay: 4,
    description:
      '얼어붙은 로뇨 강을 건너 기습한 스웨덴군과 덴마크군이 새벽부터 해질 때까지 맞붙었다. ' +
      '국왕은 기병 우익을 직접 이끌고 덴마크 좌익을 무너뜨렸으나 중앙이 붕괴해 한때 패색이 ' +
      '짙었고, 되돌아온 기병이 전세를 뒤집었다. 양군 1만 8천 가운데 절반 가까이가 죽은 것으로 ' +
      '추계되며, 참전 규모 대비 사망률에서 북유럽 전사상 최고로 꼽힌다. ' +
      '⚠️사상자 수치는 계통마다 갈려 단정하지 않는다. 신력으로는 12-14.',
  },
  {
    title: '란스크로나 전투 — 스코네 회복',
    category: 'MILITARY',
    startYear: 1677, startMonth: 7, startDay: 14,
    description:
      '룬드에 이어 다시 덴마크군을 격파하며 스코네의 주도권을 확정했다. 이후 전쟁은 ' +
      '요새전과 게릴라전(스나판) 양상으로 소모전이 되었다.',
  },
  {
    title: '룬드 조약 — 전전 상태 회복',
    category: 'DIPLOMATIC',
    startYear: 1679, startMonth: 9, startDay: 26,
    description:
      '프랑스의 중재로 덴마크와 맺은 강화. 앞서 8월 퐁텐블로·생제르맹 조약으로 브란덴부르크 ' +
      '전선도 정리되어 스웨덴은 잃었던 영토를 거의 모두 되찾았다. 다만 그 회복이 스웨덴의 ' +
      '전공이 아니라 루이 14세의 압력으로 이뤄졌다는 사실이 그에게 깊은 교훈을 남겼다.',
  },
  {
    title: '칼스크로나 해군기지 건설',
    category: 'MILITARY',
    startYear: 1680,
    description:
      '겨울에 얼어붙는 스톡홀름 대신, 덴마크 해협에 가깝고 부동(不凍)인 블레킹에 남단에 ' +
      '새 해군 도시를 세웠다. 이름 자체가 «칼의 왕관(Karlskrona)»이다. 욀란드 해전의 참사를 ' +
      '되풀이하지 않겠다는 설계였고, 오늘날까지 스웨덴 해군의 본거지다.',
  },
  {
    title: '덴마크의 울리카 엘레오노라와 혼인',
    category: 'FAMILY',
    startYear: 1680, startMonth: 5, startDay: 6,
    description:
      '전쟁 전에 정해졌다가 개전으로 미뤄졌던 혼약이 강화 이듬해 할란드의 스코토르프에서 ' +
      '치러졌다. 적국의 공주와 맺은 화해의 혼인이었고, 왕비는 자선과 구휼로 사랑받았으나 ' +
      '정치에서는 철저히 배제되었다. 일곱 자녀 중 셋만 성년에 이르렀다.',
  },
  {
    title: '1680년 신분회 — 대환수 결의와 국왕 대권 확인',
    category: 'POLITICAL',
    startYear: 1680, startMonth: 10,
    description:
      '하급 신분들이 «선대가 귀족에게 넘긴 왕령을 되찾자»고 요구하자 국왕이 이를 받아 ' +
      '대환수(reduktion)에 착수했다. 같은 회기에서 신분회는 국왕이 국정자문회의의 조언에 ' +
      '구속되지 않는다고 결의했다 — 스웨덴 절대왕정의 첫 단계이며, 국왕이 빼앗은 것이 아니라 ' +
      '귀족을 누르려는 하급 신분이 넘겨준 권력이었다.',
  },
  {
    title: '할당제(인델닝스베르크) 확립 — 국고를 쓰지 않는 상비군',
    category: 'MILITARY',
    startYear: 1682,
    endYear: 1697,
    description:
      '농가 몇 호가 묶여 병사 한 명에게 토지와 집을 대는 방식으로 상비군 2만 5천과 기병을 ' +
      '유지하는 체계를 전국 규모로 확립했다. 환수로 되찾은 왕령이 그대로 이 제도의 재원이 ' +
      '되었다. ⚠️구스타브 2세 아돌프 시대의 선례를 제도화한 것이지 그의 창안은 아니다. ' +
      '같은 1682년 신분회는 국왕의 입법권도 인정했다.',
  },
  {
    title: '아들 칼 12세 출생',
    category: 'FAMILY',
    startYear: 1682, startMonth: 6, startDay: 17,
    description:
      '스톡홀름에서 태어난 왕세자. 아버지가 17년에 걸쳐 쌓아 올린 재정과 상비군을 ' +
      '대북방전쟁에서 21년 동안 쓰고 소진하게 될 인물이다.',
  },
  {
    title: '1686년 교회법 — 전 교구 호적과 문답 시험 의무화',
    category: 'POLITICAL',
    startYear: 1686,
    description:
      '모든 교구에 주민 등록과 교리 문답 시험을 의무화했다. 신앙 정책인 동시에 통치 기술이었다 — ' +
      '인구와 토지를 파악해야 병사와 세금이 나오기 때문이다. 이 교구 기록이 ' +
      '오늘날 세계에서 손꼽히게 긴 스웨덴 인구 통계의 기원이 되었다.',
  },
  {
    title: '리보니아 환수와 파트쿨의 저항',
    category: 'POLITICAL',
    startYear: 1687,
    endYear: 1694,
    description:
      '발트해 건너 리보니아에서도 발트 독일계 귀족의 대농장을 왕령으로 거둬들이자 ' +
      '귀족 대표 요한 파트쿨이 특권 침해를 들어 저항했고, 1694년 궐석 사형을 선고받고 ' +
      '망명했다. 이 망명자가 훗날 작센·덴마크·러시아를 묶어 대북방전쟁의 반스웨덴 동맹을 ' +
      '조직한다 — 아들 대의 재앙이 아버지 대의 개혁에서 싹텄다.',
  },
  {
    title: '왕비 울리카 엘레오노라 사망',
    category: 'FAMILY',
    startYear: 1693, startMonth: 7, startDay: 26,
    description:
      '서른여섯에 죽었다. 자선으로 백성에게 사랑받던 왕비의 죽음 뒤 그는 더 고립되었고, ' +
      '남은 4년은 순회와 장부 확인으로 채워진 고독한 통치기였다.',
  },
  {
    title: '1693년 신분회 선언 — 「절대적 주권 군주」',
    category: 'POLITICAL',
    startYear: 1693, startMonth: 12,
    description:
      '신분회가 국왕을 «오직 신에게만 책임지는 절대적 주권 군주»로 명문 선언했다. ' +
      '1680년 대권 확인, 1682년 입법권 인정에 이은 세 번째이자 마지막 단계로, ' +
      '이로써 스웨덴 절대왕정(envälde)이 법적으로 완성되었다.',
  },
  {
    title: '대기근 — 핀란드 인구의 3분의 1이 굶어 죽다',
    category: 'OTHER',
    startYear: 1695,
    endYear: 1697,
    description:
      '3년 연속 흉작으로 북유럽을 덮친 기근. 핀란드에서는 인구의 3분의 1이, 스웨덴 본토에서도 ' +
      '수만 명이 죽었다. 그가 세운 비축·구휼 체계는 이 규모 앞에 작동하지 않았다 — 재정과 ' +
      '군대를 위해 설계된 절대왕정 국가가 백성을 먹이는 데는 설계되지 않았음을 보여준 사건이며, ' +
      '치세 평가에서 빼놓을 수 없는 실패다.',
  },
  {
    title: '병세 악화 — 복통과 쇠약',
    category: 'HEALTH',
    startYear: 1696, startMonth: 12,
    description:
      '겨울부터 복통과 식욕 부진이 심해져 순회를 멈췄다. 위암이 통설이며, 이듬해 4월까지 ' +
      '넉 달 동안 급격히 쇠약해졌다.',
  },
  {
    title: '레이스베이크 강화 중재 — 마지막 외교',
    category: 'DIPLOMATIC',
    startYear: 1697, startMonth: 1,
    description:
      '9년 전쟁을 끝내기 위한 강화회의에서 스웨덴이 중재국을 맡았다. 1679년 이후 18년을 ' +
      '전쟁 없이 버틴 외교의 결산이자, 병상에서 이어 간 마지막 국사였다. ' +
      '조약 체결(9~10월)은 그가 죽은 뒤의 일이다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const KARL_XI_STATS = {
  politics: 80,
  military: 62,
  diplomacy: 60,
  intellect: 42,
  charisma: 48,
  administration: 90,
  notes:
    '행정이 최고치인 이유는 이 인물의 실적 거의 전부가 행정이기 때문이다 — 대환수로 왕실 ' +
    '세입을 몇 배로 늘려 국가 부채를 청산했고, 할당제로 국고를 거의 쓰지 않는 상비군 2만 ' +
    '5천을 유지했으며, 1686년 교회법의 전 교구 호적이 오늘날까지 이어지는 인구 통계의 ' +
    '기원이 되었다. 정치는 신분회가 스스로 국왕을 절대 군주로 선언하게 만든 3단계 설계가 ' +
    '탁월해 80. 군사는 극단적으로 갈린다 — 룬드·란스크로나에서 직접 기병을 이끌고 이긴 ' +
    '전장 지휘는 뛰어났으나 전략가는 아니었고, 개전 초 페어벨린·욀란드의 참패와 4년을 끈 ' +
    '소모전은 그의 몫이며 영토 회복도 결국 루이 14세의 압력으로 이뤄졌다. 외교는 1679년 ' +
    '이후 18년의 평화와 1697년 레이스베이크 중재가 실적이나, 젊은 시절 프랑스 보조금 ' +
    '동맹에 끌려다닌 기억이 상한을 눌러 60. 학식이 최저인 것은 철자·독해를 끝내 버거워하고 ' +
    '라틴어도 익히지 못한 방치된 교육 탓이며, 다만 숫자와 장부를 읽는 실무 감각은 통치의 ' +
    '기반이 되었으므로 바닥은 아니다. 카리스마는 과묵하고 수행 없이 홀로 다니는 성정이 ' +
    '대중적 인기와는 거리가 멀었으나 「회색 망토」 전승이 자라날 만큼 «직접 보러 오는 왕»이라는 ' +
    '상이 굳어져 48. 1695~1697 대기근 앞의 무력함은 정치·행정 양쪽의 상한을 눌렀다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(year: number, month?: number, day?: number): Date {
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedKarlXISweden(prisma: PrismaService): Promise<void> {
  console.log('\n👑 칼 11세(Karl XI) 시딩 시작 (기존 데이터 보존 모드)...')

  // ── 사전 의존성 ──────────────────────────────────────────────────────────
  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const swedishEmpire = await prisma.historicalCountry.findFirst({
    where: { name: REIGN.countryName },
    select: { id: true },
  })
  if (!swedishEmpire) {
    console.warn(
      `  ⚠️  「${REIGN.countryName}」 HC 미존재 — 먼저 seedSwedenHistoricalCountries 실행 필요. 시딩 중단.`,
    )
    return
  }

  // 광의의 비텔스바흐가 행에 붙인다 — 방계(팔츠-츠바이브뤼켄-클레에부르크) 전용 행을 새로
  // 만들면 소속 1명짜리 고립 왕조가 또 생긴다(레오폴트 세션이 보고한 작센/코부르크 4행 중복).
  const wittelsbach = await prisma.dynasty.findFirst({
    where: { name: '비텔스바흐 가문' },
    select: { id: true },
  })
  const kingDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: REIGN.positionTitle },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  // ⚠️'Karl XI'로 contains 조회하면 다른 나라 동명 군주가 잡힐 수 있다 —
  //   originalName 정확 일치 + (이름·성·생년) 보조 조건으로 이중화한다.
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: KARL_XI.originalName },
        {
          AND: [
            { name: KARL_XI.name },
            { surname: KARL_XI.surname },
            { birthDate: toDate(KARL_XI.birthYear, KARL_XI.birthMonth, KARL_XI.birthDay) },
          ],
        },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = KARL_XI.originalName
    if (!person.biography) patch.biography = KARL_XI.biography
    if (!person.birthPlaceText) patch.birthPlaceText = KARL_XI.birthPlaceText
    if (!person.birthNote) patch.birthNote = KARL_XI.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = KARL_XI.deathPlaceText
    if (!person.deathType) patch.deathType = KARL_XI.deathType
    if (!person.deathCause) patch.deathCause = KARL_XI.deathCause
    if (!person.deathNote) patch.deathNote = KARL_XI.deathNote
    if (person.influence == null) patch.influence = KARL_XI.influence
    if (person.birthOrder == null) patch.birthOrder = KARL_XI.birthOrder
    if (!person.historicalCountryId) patch.historicalCountryId = swedishEmpire.id
    if (!person.dynastyId && wittelsbach) patch.dynastyId = wittelsbach.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${KARL_XI.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${KARL_XI.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: KARL_XI.name,
        middleName: KARL_XI.middleName,
        surname: KARL_XI.surname,
        originalName: KARL_XI.originalName,
        biography: KARL_XI.biography,
        birthDate: toDate(KARL_XI.birthYear, KARL_XI.birthMonth, KARL_XI.birthDay),
        birthEra: Era.AD,
        birthDatePrecision: 'day',
        birthNote: KARL_XI.birthNote,
        birthOrder: KARL_XI.birthOrder,
        deathDate: toDate(KARL_XI.deathYear, KARL_XI.deathMonth, KARL_XI.deathDay),
        deathEra: Era.AD,
        deathDatePrecision: 'day',
        deathType: KARL_XI.deathType,
        deathCause: KARL_XI.deathCause,
        deathNote: KARL_XI.deathNote,
        gender: KARL_XI.gender,
        nameDisplayOrder: NameDisplayOrder.western,
        influence: KARL_XI.influence,
        birthPlaceText: KARL_XI.birthPlaceText,
        deathPlaceText: KARL_XI.deathPlaceText,
        historicalCountryId: swedishEmpire.id,
        dynastyId: wittelsbach?.id ?? undefined,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${KARL_XI.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재위 ────────────────────────────────────────────────────────────────
  // ⚠️멱등 키는 인물이 아니라 유니크 제약 (historicalCountryId, regnalNumber)이다.
  const existingReign = await prisma.sovereignReign.findFirst({
    where: { historicalCountryId: swedishEmpire.id, regnalNumber: REIGN.regnalNumber },
  })
  if (existingReign) {
    if (existingReign.personId === personId) {
      console.log(`  ⏭️  재위 스킵 (이미 존재): ${REIGN.countryName} 제${REIGN.regnalNumber}대`)
    } else {
      console.warn(
        `  ⚠️  재위 ${REIGN.countryName} 제${REIGN.regnalNumber}대 — 다른 인물이 이미 점유 (skip)`,
      )
    }
  } else {
    await prisma.sovereignReign.create({
      data: {
        personId,
        historicalCountryId: swedishEmpire.id,
        positionDefinitionId: kingDef?.id ?? undefined,
        regnalName: REIGN.regnalName,
        regnalNumber: REIGN.regnalNumber,
        termNumber: REIGN.termNumber,
        // dynastyOrdinal은 비워 둔다 — 붙인 왕조 행이 광의의 비텔스바흐가라
        // «제2대»(스웨덴 팔츠 가계 기준)를 이 필드로 표현하면 거짓이 된다.
        startDate: toDate(REIGN.startYear, REIGN.startMonth, REIGN.startDay),
        startDatePrecision: 'day',
        startEra: Era.AD,
        startYear: REIGN.startYear,
        startMonth: REIGN.startMonth,
        startDay: REIGN.startDay,
        endDate: toDate(REIGN.endYear, REIGN.endMonth, REIGN.endDay),
        endDatePrecision: 'day',
        endEra: Era.AD,
        endYear: REIGN.endYear,
        endMonth: REIGN.endMonth,
        endDay: REIGN.endDay,
        appointmentMethod: REIGN.appointmentMethod,
        appointmentDetail: REIGN.appointmentDetail,
        endReason: REIGN.endReason,
        endReasonDetail: REIGN.endReasonDetail,
        notes: REIGN.notes,
        showPositionInfo: true,
        accountId: admin.id,
      },
    })
    console.log(
      `  ✅ 재위: ${REIGN.countryName} 제${REIGN.regnalNumber}대 (${REIGN.startYear}~${REIGN.endYear})`,
    )
  }

  // ── 3) 별칭 ────────────────────────────────────────────────────────────────
  for (const nick of NICKNAMES) {
    const exists = await prisma.personNickname.findFirst({
      where: { personId, nickname: nick.nickname },
    })
    if (exists) continue
    await prisma.personNickname.create({
      data: {
        personId,
        nickname: nick.nickname,
        type: nick.type,
        priority: nick.priority,
        reason: nick.reason,
      },
    })
    console.log(`  ✅ 별칭: ${nick.nickname}`)
  }

  // ── 4) 국가 소속 ───────────────────────────────────────────────────────────
  for (const aff of AFFILIATIONS) {
    const hc = await prisma.historicalCountry.findFirst({
      where: { name: aff.countryName },
      select: { id: true },
    })
    if (!hc) {
      console.warn(`  ⚠️  소속국가 HC 미존재 — 생략: ${aff.countryName}`)
      continue
    }
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: { personId, historicalCountryId: hc.id, affiliationType: aff.affiliationType },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${aff.countryName} (${aff.affiliationType})`)
      continue
    }
    await prisma.personCountryAffiliation.create({
      data: {
        personId,
        historicalCountryId: hc.id,
        affiliationType: aff.affiliationType,
        priority: aff.priority,
        startDate: aff.startYear ? toDate(aff.startYear, aff.startMonth, aff.startDay) : undefined,
        endDate: aff.endYear ? toDate(aff.endYear, aff.endMonth, aff.endDay) : undefined,
        note: aff.note,
      },
    })
    console.log(`  ✅ 소속국가: ${aff.countryName} (${aff.affiliationType})`)
  }

  // ── 5) 연보 ─────────────────────────────────────────────────────────────────
  // 배열 순서를 그대로 sortOrder로 쓴다 — 같은 날짜 항목의 순서를 고정하는 유일한 장치.
  let lifeEventCount = 0
  for (const [index, entry] of LIFE_EVENTS.entries()) {
    const exists = await prisma.personLifeEvent.findFirst({
      where: { personId, title: entry.title },
    })
    if (exists) continue
    const endDate = entry.endYear
      ? new Date(
          entry.endYear,
          (entry.endMonth ?? 12) - 1,
          entry.endDay ?? (entry.endMonth ? 28 : 31),
        )
      : null
    await prisma.personLifeEvent.create({
      data: {
        personId,
        title: entry.title,
        description: entry.description,
        category: entry.category,
        startDate: toDate(entry.startYear, entry.startMonth, entry.startDay),
        startDatePrecision: precisionOf(entry.startMonth, entry.startDay),
        endDate,
        endDatePrecision: entry.endYear ? precisionOf(entry.endMonth, entry.endDay) : null,
        sortOrder: index,
        accountId: admin.id,
      },
    })
    lifeEventCount++
  }
  if (lifeEventCount > 0) console.log(`  ✅ 연보 ${lifeEventCount}건 등록`)

  // ── 6) 6축 능력치 ────────────────────────────────────────────────────────────
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
        politics: KARL_XI_STATS.politics,
        military: KARL_XI_STATS.military,
        diplomacy: KARL_XI_STATS.diplomacy,
        intellect: KARL_XI_STATS.intellect,
        charisma: KARL_XI_STATS.charisma,
        administration: KARL_XI_STATS.administration,
        notes: KARL_XI_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${KARL_XI_STATS.politics}·군사 ${KARL_XI_STATS.military}·` +
        `외교 ${KARL_XI_STATS.diplomacy}·학식 ${KARL_XI_STATS.intellect}·` +
        `카리스마 ${KARL_XI_STATS.charisma}·행정 ${KARL_XI_STATS.administration}`,
    )
  }

  console.log('✅ 칼 11세 시딩 완료\n')
}
