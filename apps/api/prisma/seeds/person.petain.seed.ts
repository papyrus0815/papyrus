/**
 * 필리프 페탱 (Henri Philippe Pétain, 1856~1951) 인물 보강 시드
 *
 * ⚠️ 기존 행 보강 모드 — UI로 최소 등록돼 있던 스텁(이름·생몰·사진·소속국가만 있고
 *    originalName·전기·출생지·사망지·재임·연보·능력치가 전부 비어 있던 행)을 채운다.
 *    이미 값이 있는 필드는 덮어쓰지 않는다(사조노프·조프르 선례).
 *
 * ⚠️ 서술 원칙 — 이 인물은 «베르됭의 영웅»이자 «비시 정권의 수반»이라는 두 얼굴을 가진다.
 *    어느 쪽도 미화하거나 은폐하지 않고, 학계 정설(팩스턴 이후)을 그대로 기술한다:
 *     · 1916~18년의 군사적 공적(성스러운 길 병참·노리아 순환·1917년 항명 수습)은 사실로 인정
 *     · 동시에 대독 협력을 자발적 국책으로 선언했고, 1940년 유대인 지위법은 독일의 요구가
 *       아니라 비시의 자체 발의였으며 그가 손글씨로 조문을 강화한 초안이 2010년 공개되었다
 *     · «검(드골)과 방패(페탱)» 이중게임론은 팩스턴(1972) 이후 학계에서 기각된 것으로 본다
 *    공적이 책임을 상쇄하지 않는다는 것이 학계의 합의이며, 이 시드도 그 구도를 따른다.
 *
 * ⚠️ 소속 국가 이원화: 1940-07-11 이후의 두 재임(국가주석·정부수반 겸직)은 제3공화국이
 *    아니라 «비시 프랑스» HC(1940~1944)에 붙인다 — 국호 자체가 «프랑스국(État français)»으로
 *    바뀌었기 때문이다. 비시 HC가 없으면 그 두 건만 건너뛴다.
 *
 * 날짜 규약: 프랑스 사료라 그레고리력(구력 환산 없음). 연·월 단위까지만 확인된 보직은
 * startDatePrecision으로 정밀도를 명시한다(팔레올로그 선례).
 *
 * 의존: seedFranceHistoricalCountries('프랑스 제3공화국'·'비시 프랑스' HC).
 *
 * 보강 항목:
 *  - Person 필드 보강(originalName·전기·출생지·사망지·사인·영향력 등)
 *  - GovernmentPositionTenure x14 (군 지휘 8·각료 2·외교 1·정부수반 2·국가원수 1,
 *    전 건 appointmentDetail 포함)
 *  - PersonCountryAffiliation +1 (비시 프랑스) / PersonNickname x2
 *  - PersonLifeEvent x20 / PersonStats x1
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
const PETAIN = {
  /** 기존 행 조회 키 — 이 인물은 originalName이 NULL이라 성으로 찾는다 */
  surnameKey: '페탱',
  originalName: 'Henri Philippe Bénoni Omer Joseph Pétain',
  birthPlaceText: '프랑스 파드칼레주 코시아라투르(Cauchy-à-la-Tour)',
  birthNote:
    '자작농 오메르베낭 페탱의 아들로, 빈농이 아니라 «형편이 넉넉한 농가» 출신이다. 어머니 ' +
    '클로틸드 르그랑은 그가 생후 18개월 무렵 사망했고 부친이 재혼해 이복형제 셋이 더 있었다. ' +
    '어머니를 일찍 여읜 그는 사제였던 종조부 등 친척의 후원으로 교회계 학교에서 교육받았고, ' +
    '1870년 보불전쟁 패전의 기억이 군인의 길을 택한 계기로 전해진다.',
  deathPlaceText: '프랑스 방데주 외되 섬(Île d\'Yeu) 포르조앵빌 — 유폐지',
  deathType: DeathType.NATURAL,
  deathCause: '노쇠에 따른 심폐 기능 부전 (향년 95세)',
  deathNote:
    '1945년 11월부터 외되 섬 피에르르베 요새 감옥에 유폐되었고 말년에는 심한 치매로 상황 ' +
    '인식을 잃었다. 1951-06-08 인도적 조치로 포르조앵빌 시내 민가로 옮겨진 뒤 약 6주 만에 ' +
    '사망했다. 유해는 포르조앵빌 묘지에 묻혔고, 지지자들이 요구해 온 베르됭 두오몽 납골당 ' +
    '이장은 역대 정부가 모두 거부했다. 1973-02-18~19 극우 6인조가 관을 탈취해 두오몽으로 ' +
    '옮기려다 발각된 «유해 탈취 사건»이 있었으나, 퐁피두 대통령이 이장을 거부해 유해는 ' +
    '02-22 원래 자리에 재매장되었다.',
  influence: 76,
  biography:
    '프랑스의 군인·정치가. 제1차 세계대전에서 베르됭 방어와 1917년 항명 사태 수습으로 «베르됭의 ' +
    '사자»라 불린 원수였고, 제2차 세계대전에서는 비시 프랑스의 국가주석으로 나치 독일과의 협력을 ' +
    '국책으로 선언해 종전 후 국가반역죄로 사형을 선고받았다. 프랑스 현대사에서 공적과 책임이 ' +
    '가장 극단적으로 갈리는 인물이다. ' +
    '\n\n' +
    '성장과 전전 경력(1856~1914). 파드칼레의 농가에서 태어나 1876년 생시르 사관학교에 입학했다 ' +
    '— 입학 성적은 412명 중 403등이었고 졸업도 중하위권이었다. 진급은 매우 느려 1910년 54세에야 ' +
    '대령이 되었다. 1901~1911년 고등군사학교 교관으로 «화력이 죽인다(Le feu tue)»를 정식화해, ' +
    '정신력과 총검 돌격을 앞세운 당시 주류 교리 «극단적 공세»에 정면으로 맞섰다. 이 비주류성 ' +
    '때문에 경력이 정체돼 1914년에는 58세 대령으로 은퇴를 준비하고 있었다. ' +
    '\n\n' +
    '개전과 초고속 승진(1914~1915). 그의 교리는 서부전선에서 사실상 옳았음이 입증되었다. 개전 ' +
    '직후 기즈 전투 지휘로 8월 말 준장, 9월 소장이 되었고 10월 제33군단장에 올랐다. 1915년 ' +
    '5월 아르투아 공세에서 비미 능선 방면으로 개전 이래 프랑스군 최대의 돌파를 만들어 제2군 ' +
    '사령관에 발탁되었다. ' +
    '\n\n' +
    '베르됭(1916). 독일군 공세로 두오몽 요새가 함락된 직후인 2월 24일 베르됭 지구를 맡았다. ' +
    '바르르뒤크로 이어지는 단일 보급로 «성스러운 길»에 트럭 3천여 대를 15초 간격으로 돌려 주당 ' +
    '병력 9만 명과 탄약 5만 톤을 실어 날랐고, 사단을 4~5일 단위로 교대시키는 «노리아» 순환으로 ' +
    '부대의 소모를 분산했다. 다만 «그들은 지나가지 못한다»는 실제로 니벨의 일일명령에서 나온 ' +
    '말이며, 손실에 민감한 그의 신중론을 부담스러워한 최고사령부는 1916년 5월 그를 상급 제대인 ' +
    '중부집단군으로 «영전»시켜 현장 지휘에서 배제했다. «베르됭의 승리자»라는 칭호는 니벨이 ' +
    '몰락한 뒤에야 그에게 재귀속된 것이다. ' +
    '\n\n' +
    '항명 수습과 총사령관(1917~1918). 니벨의 슈맹데담 공세가 참패해 군의 신뢰가 무너지자 ' +
    '1917년 5월 총사령관이 되었다. 4~9월에 걸쳐 5만 9천~8만 8천 명이 139건의 집단 불복종에 ' +
    '가담한 항명 사태를 주모자 처벌과 처우 개선의 병행으로 수습했다 — 사형 선고는 554~671건에 ' +
    '이르렀으나 실제 총살은 49명 안팎으로 선고의 90% 이상이 감형되었다. 정기 휴가제와 급식· ' +
    '숙영 개선을 제도화하고 90여 개 사단을 직접 순시했으며, 대규모 돌파를 포기하고 «전차와 ' +
    '미국인을 기다린다»는 제한 목표 전략으로 전환해 프랑스군을 재건했다. 1918-11-21 원수에 ' +
    '서임되었다. ' +
    '\n\n' +
    '전간기(1920~1939). 최고전쟁회의 부의장으로 11년간 프랑스 육군을 좌우했고, 화력과 진지 ' +
    '방어를 중시한 그의 교리가 마지노선의 지적 배경이 되었다. 1925~26년 리프 전쟁을 지휘했고 ' +
    '1931년 아카데미 프랑세즈 회원이 되었다. 1934년 두메르그 거국내각의 육군장관으로 첫 각료직을 ' +
    '맡았고, 1939년 프랑코 정부 주재 초대 대사로 스페인에 갔다 — 이 부임이 그를 1939~40년 ' +
    '프랑스 정계의 실패로부터 격리시켜 «오염되지 않은 원로»로 남겨두었다. ' +
    '\n\n' +
    '패전과 전권 장악(1940). 5월 18일 레노 내각 부총리로 소환되어 즉각 휴전을 주장했고, 6월 ' +
    '16일 레노 사임으로 총리가 되어 이튿날 «싸움을 중지해야 한다»고 방송한 뒤 6월 22일 ' +
    '콩피에뉴에서 휴전협정에 서명했다. 7월 10일 비시에 소집된 국민의회가 찬성 569·반대 80· ' +
    '기권 17로 헌법 개정 전권을 위임했고, 이튿날 그는 «공화국»을 «프랑스국»으로 바꾸고 입법· ' +
    '행정·사법권과 후계자 지명권까지 쥔 국가주석이 되었다. ' +
    '\n\n' +
    '협력과 유대인 박해(1940~1944). 1940-10-24 몽투아르에서 히틀러와 회담한 뒤 10월 30일 ' +
    '라디오로 «나는 오늘 협력(collaboration)의 길에 들어선다»고 공개 선언했다 — 패전국 ' +
    '국가원수가 협력을 자발적 국책으로 천명한 사례이며, 독일이 요구한 것이 아니었다. 같은 해 ' +
    '10월 3일 서명된 유대인 지위법 역시 독일의 압력이 아니라 비시의 자체 발의였다. 이 법은 ' +
    '유대인을 종교가 아니라 «인종»으로 정의하고 공직·군·사법·언론·교육에서 배제했으며, 2010년 ' +
    '공개된 초안에는 그가 손글씨로 금지 직종을 넓히고 오래 정착한 유대인에 대한 예외 조항을 ' +
    '삭제한 흔적이 남아 있다. 1942년 라발이 복귀한 뒤로는 실권이 줄어 사실상 명목상 존재로 ' +
    '전락했고, 1944년 8월 독일군에 의해 지크마링겐으로 이송되었다. ' +
    '\n\n' +
    '재판과 최후(1945~1951). 1945년 4월 스위스를 거쳐 자진 귀국해 발로르브에서 출두했다. ' +
    '7월 23일부터 3주간 최고재판소에서 적과의 내통·국가반역죄로 재판받아 8월 15일 사형과 국민 ' +
    '자격 박탈, 재산 몰수를 선고받았다. 재판부가 89세 고령을 들어 집행 유예를 권고했고 드골이 ' +
    '이를 받아들여 종신금고로 감형했다. 외되 섬에 유폐되어 1951년 95세로 죽었다. ' +
    '\n\n' +
    '평가. 학계는 두 얼굴을 모두 사실로 인정하되 후자가 전자로 상쇄되지 않는다는 데 대체로 ' +
    '합의한다. 전후 수십 년간 통념이던 «검(드골)과 방패(페탱)» 이중게임론 — 협력은 최악을 막기 ' +
    '위한 위장이었다는 변론 — 은 로버트 팩스턴의 『비시 프랑스』(1972)가 독일 측 문서고를 근거로 ' +
    '무너뜨린 뒤 기각된 것으로 본다. 프랑스의 공식 입장도 1995년 시라크 대통령의 벨디브 ' +
    '연설에서 국가의 책임을 인정하는 쪽으로 정리되었다. 드골의 총평이 이 양가성을 압축한다 — ' +
    '«평범했다가, 영광스러웠다가, 개탄스러웠으나, 결코 범용하지는 않았던 생애».',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  /** true면 «비시 프랑스» HC에 붙인다(1940-07-11 이후) */
  vichy?: boolean
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  appointmentDetail: string
}

const TENURES: TenureSpec[] = [
  {
    title: '제33군단장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1914, startMonth: 10,
    endYear: 1915, endMonth: 6,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '제2군 사령관으로 영전.',
    notes:
      '1915년 5월 아르투아 공세에서 비미 능선 방면으로 제33군단을 투입해 개전 이래 프랑스군 최대의 돌파를 만들어냈다. ' +
      '충분한 포병 준비사격 뒤 제한 목표를 확보한다는 «화력이 죽인다» 원칙이 실전에서 처음 입증된 사례로 평가받았고, 이 성과가 제2군 사령관 발탁의 근거가 되었다.',
    appointmentDetail:
      '1914년 8월 개전 시 58세 대령으로 제4보병여단을 임시 지휘했고, 기즈 전투(8월 29일)에서의 지휘로 8월 말 준장, 마른 전투 직후인 9월 14일 소장으로 초고속 승진했다. ' +
      '제6보병사단장을 거쳐 10월 아르투아 방면 제33군단장에 올랐다. ' +
      '진급이 막혀 은퇴를 준비하던 인물의 급반전이었다.',
  },
  {
    title: '제2군 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1915, startMonth: 6,
    endYear: 1916, endMonth: 5, endDay: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '중부집단군 사령관으로 «영전» — 사실상 베르됭 현장 지휘를 니벨에게 넘김.',
    notes:
      '1916년 2월 21일 독일군 베르됭 공세가 시작되고 두오몽 요새가 함락되자 2월 24일 베르됭 지구를 맡아 25일 밤 지휘를 인수했다. ' +
      '바르르뒤크–베르됭 단일 보급로(«성스러운 길»)에 트럭 3천여 대를 15초 간격으로 돌려 주당 병력 9만 명·탄약 5만 톤을 운반했고, 사단을 4~5일 단위로 교대시키는 «노리아» 순환을 도입했다.',
    appointmentDetail:
      '아르투아에서의 성과를 인정한 조프르 총사령관이 1915년 6월 신편 제2군 지휘를 맡겼다(영어권 자료는 7월로 적어 갈린다). ' +
      '9월 샹파뉴 공세를 지휘했으나 대규모 돌파에는 실패했고, 이 경험이 «돌파는 불가능하고 전쟁은 소모전»이라는 그의 인식을 굳혔다.',
  },
  {
    title: '중부집단군 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1916, startMonth: 5, startDay: 1,
    endYear: 1917, endMonth: 5,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '니벨 공세 실패 후 육군참모총장을 거쳐 총사령관 취임.',
    notes:
      '1916년 여름 이후 베르됭 전선 전체를 상급 제대에서 관할했으나, 가을 두오몽·보 요새 탈환이라는 결정적 반격의 영광은 현장 지휘관 니벨에게 돌아갔다. ' +
      '«그들은 지나가지 못한다»도 1916년 6월 23일 니벨의 일일명령에서 나온 것으로, 전후 니벨이 몰락한 뒤에야 «베르됭의 승리자» 이미지가 페탱에게 재귀속되었다.',
    appointmentDetail:
      '조프르와 최고사령부는 손실에 민감하고 방어·소모전을 인정하는 페탱의 신중론을 부담스러워했고, 공세적인 니벨을 선호했다. ' +
      '1916년 5월 1일(자료에 따라 2일) 상위 제대인 중부집단군 사령관으로 «승진»시키는 형식으로 베르됭 현장 지휘에서 배제했다.',
  },
  {
    title: '육군참모총장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1917, startMonth: 4, startDay: 29,
    endYear: 1917, endMonth: 5, endDay: 15,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '니벨 후임 총사령관으로 임명.',
    notes:
      '2주 남짓의 짧은 재임 동안 정부와 최고사령부 사이의 실질적 조정자로서 니벨 공세의 중단을 관철했다. ' +
      '이 자리는 총사령관 교체를 위한 과도기적 배치였음이 곧 드러났고, 5월 15일 니벨이 해임되면서 후임으로 승계했다.',
    appointmentDetail:
      '4월 16일 개시된 니벨의 슈맹데담 공세가 참담하게 실패했으나 정부는 니벨을 즉각 해임하지 못했고, 대신 페탱을 신설 육군참모총장에 앉혀 정부의 군사 고문 겸 최고사령부 견제 장치로 삼았다.',
  },
  {
    title: '북동부전선 총사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1917, startMonth: 5, startDay: 15,
    endYear: 1918, endMonth: 11, endDay: 11,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '1918년 11월 11일 휴전으로 전쟁 종결(공식 보직은 1919년까지 유지).',
    notes:
      '항명에 대해 주모자 군법회의 처벌과 병사 처우 개선을 병행했다. ' +
      '정기적·예측 가능한 휴가제, 급식·숙영·수송 개선, 부대 순환을 제도화하고 90여 개 사단을 직접 순시했다. ' +
      '전략은 대규모 돌파를 포기하고 말메종(1917-10) 같은 제한 목표 공세로 전환 — «전차와 미국인을 기다린다»가 이 시기를 요약한다.',
    appointmentDetail:
      '니벨 공세가 수만 명의 사상자만 내고 실패해 군 전체의 신뢰가 무너지자 5월 15일 니벨을 대신해 북동부전선 총사령관에 임명되었다. ' +
      '취임 시점에 이미 항명 사태가 전선 곳곳으로 번지고 있어, 처음부터 «군을 재건하라»는 임무를 안고 출발했다.',
  },
  {
    title: '프랑스 원수',
    positionType: GovernmentPositionType.SPECIAL_POSITION,
    startYear: 1918, startMonth: 11, startDay: 21,
    endYear: 1945, endMonth: 8, endDay: 15,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1945년 8월 15일 국가반역 유죄·국민 자격 박탈 선고.',
    notes:
      '원수는 계급이 아니라 국가적 존엄직으로, 이후 30년 가까이 그의 정치적 자산이 되었다. ' +
      '1931년 아카데미 프랑세즈 회원으로 선출되며 «국민적 원로»의 지위를 굳혔고, 1940년 «구원자» 옹립의 정당성도 이 칭호에서 나왔다. ' +
      '1945년 국민 자격 박탈 판결로 원수의 위엄과 훈장·연금이 사실상 박탈되었다.',
    appointmentDetail:
      '휴전 열흘 뒤인 1918년 11월 21일 대통령령으로 원수에 서임되었고(관보 게재는 22일), 12월 8일 메스에서 푸앵카레 대통령으로부터 원수봉을 받았다. ' +
      '일부 자료는 서임일을 11월 19일로 적어 갈린다.',
  },
  {
    title: '최고전쟁회의 부의장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1920, startMonth: 1,
    endYear: 1931,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '1931년 정년으로 부의장·군 총감직 동시 퇴임.',
    notes:
      '11년간 프랑스 육군의 편성·교리·요새화를 좌우했다. ' +
      '화력과 연속 전선, 진지 방어를 중시한 그의 교리가 1930년 착공된 마지노선의 지적 배경을 이룬다. ' +
      '다만 기갑 집중 운용(드골의 «직업군» 구상)에는 회의적이었고, 아르덴 방면을 방어 가능하다고 낙관한 평가는 1940년 붕괴의 교리적 책임 논쟁의 표적이 되었다.',
    appointmentDetail:
      '1920년 1월 최고전쟁회의(Conseil supérieur de la guerre) 부의장에 취임했다. ' +
      '의장은 대통령이 명목상 겸하는 구조였으므로 부의장이 프랑스 육군의 실질적 최고위 군직이었고, 1922년 2월부터는 군 총감(inspecteur général)을 겸했다.',
  },
  {
    title: '모로코 주둔군 총사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1925, startMonth: 9, startDay: 3,
    endYear: 1926,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '리프 전쟁 종결에 따른 임무 완료·귀국.',
    notes:
      '스페인과 공동작전을 펴 대규모 병력과 항공·포병을 집중 투입하는 정규전식 공세로 전환했다. ' +
      '화학무기 사용과 민간인 피해가 뒤따랐다(주된 사용 주체는 스페인군이며 프랑스군의 관여 범위는 논쟁적이다). ' +
      '1926년 5월 압델크림 항복으로 전쟁이 끝났고 알폰소 13세로부터 스페인 무공훈장을 받았다.',
    appointmentDetail:
      '압델크림이 이끄는 리프 공화국군이 프랑스령 모로코를 위협하자, 파리는 리요테의 점진적·유화적 지휘로는 수습이 어렵다고 보고 페탱을 파견했다. ' +
      '1925년 9월 3일 모로코 주둔 프랑스군 총사령관 전권을 부여받아 리요테를 사실상 대체했다.',
  },
  {
    title: '육군장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    startYear: 1934, startMonth: 2, startDay: 9,
    endYear: 1934, endMonth: 11, endDay: 8,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '두메르그 내각 총사퇴로 함께 퇴임.',
    notes:
      '디플레이션 정책에 따른 예산 삭감 압력 속에서 총액을 줄이면서도 요새화 예산은 지켜냈다. ' +
      '이 시기 정치권·언론과의 접촉으로 «구원자 페탱»이라는 정치적 이미지가 형성되었고, 우파 일각에서 그를 강력한 행정부의 수반으로 옹립하려는 흐름이 생겨났다.',
    appointmentDetail:
      '1934년 2월 6일 극우 연맹의 폭동으로 달라디에 내각이 무너지자, 가스통 두메르그가 «거국 신뢰» 내각을 구성하면서 국민적 권위를 빌리기 위해 78세의 페탱을 육군장관으로 입각시켰다. ' +
      '그의 첫 각료직이자 첫 공식 정치 경력이다.',
  },
  {
    title: '주스페인 대사',
    positionType: GovernmentPositionType.DIPLOMATIC_POST,
    startYear: 1939, startMonth: 3,
    endYear: 1940, endMonth: 5,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '레노 내각 부총리로 입각하기 위해 소환.',
    notes:
      '부르고스·마드리드에서 난민 송환과 스페인 공화파가 프랑스로 가져간 자산·금 반환 문제를 협상했다. ' +
      '결과적으로 이 스페인 체류는 그를 1939~40년 프랑스 정계의 실패로부터 격리시켜 «오염되지 않은 원로»로 남겨두었고, 패전 국면에서 구원자로 소환되는 배경이 되었다. ' +
      '임기 종료일은 5월 17일/18일로 자료가 갈린다.',
    appointmentDetail:
      '스페인 내전이 프랑코의 승리로 끝나자 달라디에 정부는 새 정권과의 관계를 복원하고 프랑코를 추축국에서 떼어놓기 위해 원수의 권위를 활용하기로 하고, 1939년 3월 그를 프랑코 정부 주재 초대 대사로 파견했다.',
  },
  {
    title: '부총리',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    startYear: 1940, startMonth: 5, startDay: 18,
    endYear: 1940, endMonth: 6, endDay: 16,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '레노 사임으로 총리직 승계.',
    notes:
      '입각 직후부터 베강과 함께 북아프리카 항전론에 반대하고 즉각 휴전을 주장하며 레노를 압박했다. ' +
      '6월 중순 정부가 보르도로 옮긴 뒤 각의에서 휴전파가 다수를 이루자 레노는 사임했다. ' +
      '이 한 달이 그를 «패전 처리자»로 밀어올린 결정적 국면이었다.',
    appointmentDetail:
      '5월 10일 독일군 침공과 스당 돌파로 전선이 붕괴하자 폴 레노 총리는 국민 사기를 붙들기 위해 5월 18일 페탱을 마드리드에서 불러들여 부총리로 입각시켰다. ' +
      '같은 개편에서 베강이 총사령관에 임명되었다.',
  },
  {
    title: '총리',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    startYear: 1940, startMonth: 6, startDay: 16,
    endYear: 1940, endMonth: 7, endDay: 11,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '7월 11일 헌법적 법률로 «국가주석» 취임 — 제3공화국 총리직 소멸.',
    notes:
      '6월 22일 콩피에뉴에서 대독 휴전협정, 24일 대이탈리아 휴전협정에 서명했다. ' +
      '정부는 보르도를 거쳐 비시로 이동했고, 라발을 앞세워 의회에 헌법 개정 전권을 요구했다. ' +
      '7월 10일 국민의회는 찬성 569·반대 80·기권 17로 전권을 위임했다.',
    appointmentDetail:
      '6월 16일 밤 레노가 사임하자 르브룅 대통령은 휴전파가 다수라는 현실에 따라 페탱에게 조각을 맡겼다. ' +
      '84세의 원수는 즉시 내각을 구성했고, 취임 다음 날인 6월 17일 라디오로 «전투를 중지해야 한다»고 방송해 전선의 붕괴를 가속시켰다는 비판을 받는다.',
  },
  {
    title: '정부수반 (국가주석 겸직)',
    positionType: GovernmentPositionType.HEAD_OF_GOVERNMENT,
    vichy: true,
    startYear: 1940, startMonth: 7, startDay: 11,
    endYear: 1942, endMonth: 4, endDay: 18,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '독일 압력으로 라발이 정부수반에 복귀.',
    notes:
      '1940년 12월 13일 라발을 전격 해임하고 플랑댕, 이어 다를랑을 부수반으로 기용해 직접 통치했다. ' +
      '다를랑 체제(1941~42)에서 파리 의정서 등 군사 협력 논의가 진행되었다. ' +
      '1942년 4월 독일의 압력에 굴복해 라발을 정부수반으로 복귀시키며 이 권한을 사실상 통째로 넘겼다.',
    appointmentDetail:
      '1940년 7월 11일 헌법적 법률 제1~3호로 국가주석에 오르면서 정부수반 권한까지 함께 쥐었다. ' +
      '의회에 책임지지 않는 자리였고, 부수반(vice-président du Conseil)을 두어 실무를 맡기는 방식으로 운용했다.',
  },
  {
    title: '국가주석',
    positionType: GovernmentPositionType.HEAD_OF_STATE,
    vichy: true,
    startYear: 1940, startMonth: 7, startDay: 11,
    endYear: 1944, endMonth: 8, endDay: 20,
    endReason: TenureEndReason.OVERTHROWN,
    endReasonDetail:
      '1944년 8월 20일 독일군에 의해 벨포르로 강제 이송(9월 지크마링겐).',
    notes:
      '«노동·가족·조국»의 국민혁명을 추진해 정당·노조를 억압하고 프리메이슨·공산주의자를 탄압했다. ' +
      '1940년 10월 3일 유대인 지위법에 서명(프랑스 자체 발의), 10월 24일 몽투아르에서 히틀러와 회담하고 30일 라디오로 «협력의 길에 들어선다»고 선언했다. ' +
      '1942년 라발 복귀 후 실권을 잃고 의례적 존재로 남았다.',
    appointmentDetail:
      '7월 10일 비시 국민의회의 전권 위임(찬성 569·반대 80·기권 17)에 근거해 이튿날 «프랑스국» 주석에 취임했다. ' +
      '입법·행정·사법권과 후계자 지명권까지 집중된 사실상 무제한 권력이었고, «공화국» 국호가 폐기되고 상하원은 정회되었다. ' +
      '취임 당시 84세로 프랑스사상 최고령 국가원수였다.',
  },]

// ── 별명 ────────────────────────────────────────────────────────────────────
const NICKNAMES: { nickname: string; type: PersonNicknameType; priority: number }[] = [
  { nickname: '베르됭의 사자 (le Lion de Verdun)', type: 'EPITHET', priority: 1 },
  { nickname: '원수님 (le Maréchal)', type: 'HONORIFIC', priority: 2 },
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
    title: '코시아라투르 출생',
    category: 'FAMILY',
    startYear: 1856, startMonth: 4, startDay: 24,
    description: '파드칼레의 자작농 가정에서 출생. 생후 18개월 무렵 어머니를 잃고 친척의 후원으로 자랐다.',
  },
  {
    title: '생시르 육군사관학교 입학',
    category: 'EDUCATION',
    startYear: 1876,
    description: '입학 성적 412명 중 403등. 1878년 졸업 성적도 중하위권으로, 이후 진급이 매우 느렸다.',
  },
  {
    title: '고등군사학교 교관 — «화력이 죽인다»',
    category: 'CAREER',
    startYear: 1901, endYear: 1911,
    description:
      '보병 전술 교관으로 «Le feu tue»를 정식화해, 정신력과 총검 돌격을 앞세운 주류 교리 ' +
      '«극단적 공세»에 정면으로 맞섰다. 이 비주류성이 경력 정체의 원인이 되었다.',
  },
  {
    title: '58세 대령 — 은퇴 준비',
    category: 'CAREER',
    startYear: 1914, startMonth: 7,
    description: '1910년 54세에야 대령이 되었고, 장군은 못 될 것이라는 통보에 은퇴용 별장까지 사두었다고 전한다.',
  },
  {
    title: '개전 후 초고속 승진',
    category: 'MILITARY',
    startYear: 1914, startMonth: 9,
    description: '기즈 전투 지휘로 8월 말 준장, 마른 직후 9월 14일 소장. 은퇴를 준비하던 인물의 급반전이었다.',
  },
  {
    title: '아르투아 공세 — 비미 능선 돌파',
    category: 'MILITARY',
    startYear: 1915, startMonth: 5,
    description:
      '제33군단으로 개전 이래 프랑스군 최대의 돌파를 만들어냈다. «화력이 죽인다» 원칙이 실전에서 ' +
      '입증된 사례로 제2군 사령관 발탁의 근거가 되었다.',
  },
  {
    title: '베르됭 방어 — 성스러운 길과 노리아',
    category: 'MILITARY',
    startYear: 1916, startMonth: 2, startDay: 25,
    description:
      '두오몽 함락 직후 베르됭 지구를 인수해, 단일 보급로에 트럭 3천여 대를 15초 간격으로 돌리고 ' +
      '사단을 4~5일 단위로 교대시켰다. 주당 병력 9만 명·탄약 5만 톤을 실어 날랐다.',
  },
  {
    title: '중부집단군으로 «영전» — 현장 지휘 배제',
    category: 'MILITARY',
    startYear: 1916, startMonth: 5, startDay: 1,
    description:
      '손실에 민감한 신중론을 부담스러워한 최고사령부가 상급 제대로 승진시키는 형식으로 베르됭 ' +
      '현장에서 물러나게 했다. 반격의 영광은 니벨에게 돌아갔다.',
  },
  {
    title: '총사령관 취임 — 항명 사태 수습',
    category: 'MILITARY',
    startYear: 1917, startMonth: 5, startDay: 15,
    description:
      '니벨 공세 참패로 무너진 군을 인수했다. 5만 9천~8만 8천 명이 가담한 항명을 주모자 처벌과 ' +
      '처우 개선의 병행으로 수습했고, 사형 선고 554~671건 중 실제 총살은 49명 안팎이었다.',
  },
  {
    title: '병사 처우 개선·90여 개 사단 순시',
    category: 'MILITARY',
    startYear: 1917, endYear: 1918,
    description:
      '정기 휴가제와 급식·숙영·수송 개선을 제도화하고 직접 부대를 돌며 불만을 청취했다. ' +
      '«전차와 미국인을 기다린다»는 제한 목표 전략으로 전환해 프랑스군을 재건했다.',
  },
  {
    title: '프랑스 원수 서임',
    category: 'AWARD',
    startYear: 1918, startMonth: 11, startDay: 21,
    description: '휴전 열흘 뒤 대통령령으로 서임. 계급이 아닌 국가적 존엄직으로, 이후 30년간 정치적 자산이 되었다.',
  },
  {
    title: '리프 전쟁 지휘',
    category: 'MILITARY',
    startYear: 1925, startMonth: 9, startDay: 3,
    endYear: 1926, endMonth: 5,
    description:
      '모로코 주둔군 전권을 받아 리요테를 대체하고 스페인과 공동으로 정규전식 공세를 폈다. ' +
      '1926년 5월 압델크림의 항복으로 종결되었다.',
  },
  {
    title: '아카데미 프랑세즈 선출',
    category: 'AWARD',
    startYear: 1931,
    description: '«국민적 원로»의 지위를 굳혔고, 1940년 «구원자» 옹립의 정당성도 이 위신에서 나왔다.',
  },
  {
    title: '육군장관 — 첫 각료직',
    category: 'POLITICAL',
    startYear: 1934, startMonth: 2, startDay: 9,
    description:
      '2월 6일 극우 폭동으로 달라디에 내각이 무너진 뒤 두메르그 거국내각에 78세로 입각했다. ' +
      '이 시기에 «구원자 페탱»이라는 정치적 이미지가 형성되었다.',
  },
  {
    title: '휴전 요청 방송·콩피에뉴 협정 서명',
    category: 'POLITICAL',
    startYear: 1940, startMonth: 6, startDay: 17,
    description:
      '총리 취임 이튿날 «싸움을 중지해야 한다»고 방송해 전선의 저항 의지를 무너뜨렸다는 비판을 ' +
      '받는다. 6월 22일 콩피에뉴에서 대독 휴전협정에 서명했다.',
  },
  {
    title: '비시 국민의회 전권 위임 — 프랑스국 수립',
    category: 'POLITICAL',
    startYear: 1940, startMonth: 7, startDay: 10,
    description:
      '찬성 569·반대 80·기권 17로 헌법 개정 전권을 위임받아 이튿날 «공화국»을 «프랑스국»으로 ' +
      '바꾸고 입법·행정·사법권과 후계자 지명권을 쥔 국가주석이 되었다.',
  },
  {
    title: '유대인 지위법 서명 — 비시의 자체 발의',
    category: 'POLITICAL',
    startYear: 1940, startMonth: 10, startDay: 3,
    description:
      '독일의 요구가 아니라 비시의 자체 발의였다. 2010년 공개된 초안에는 그가 손글씨로 금지 직종을 ' +
      '넓히고 오래 정착한 유대인의 예외 조항을 삭제한 흔적이 남아 있다.',
  },
  {
    title: '몽투아르 회담과 «협력» 선언',
    category: 'POLITICAL',
    startYear: 1940, startMonth: 10, startDay: 24,
    description:
      '히틀러와 회담하고 악수하는 장면이 대대적으로 선전되었으며, 10월 30일 라디오로 «나는 오늘 ' +
      '협력의 길에 들어선다»고 공개 선언했다 — 독일이 요구한 것이 아니었다.',
  },
  {
    title: '지크마링겐 이송 — 실권 상실',
    category: 'POLITICAL',
    startYear: 1944, startMonth: 8, startDay: 20,
    description: '연합군의 파리 해방 국면에서 독일군에 의해 강제로 옮겨졌다. 1942년 라발 복귀 이후 이미 명목상 존재였다.',
  },
  {
    title: '자진 귀국·체포',
    category: 'POLITICAL',
    startYear: 1945, startMonth: 4, startDay: 26,
    description:
      '스위스를 거쳐 발로르브 국경에서 출두했다. 쾨니그 장군은 내민 손을 거절하며 «유감입니다, ' +
      '원수님. 당신은 나의 포로입니다»라고 말했다.',
  },
  {
    title: '국가반역죄 사형 판결·종신형 감형',
    category: 'POLITICAL',
    startYear: 1945, startMonth: 8, startDay: 15,
    description:
      '7월 23일부터 3주간의 재판 끝에 사형·국민 자격 박탈·재산 몰수가 선고되었다. 재판부가 89세 ' +
      '고령을 들어 집행 유예를 권고했고 드골이 8월 17일 종신금고로 감형했다.',
  },
  {
    title: '외되 섬에서 사망',
    category: 'PERSONAL',
    startYear: 1951, startMonth: 7, startDay: 23,
    description:
      '유폐지에서 95세로 사망. 말년에는 심한 치매로 상황 인식을 잃은 상태였다. 두오몽 이장 요구는 ' +
      '역대 정부가 모두 거부했다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const PETAIN_STATS = {
  politics: 48,
  military: 82,
  diplomacy: 35,
  intellect: 70,
  charisma: 88,
  administration: 84,
  notes:
    '병참·화력·인력 순환과 무너진 부대의 재건에서는 동시대 최고 수준이었다 — 성스러운 길과 ' +
    '노리아, 1917년 항명 수습이 그 증거다(군사·행정). 반면 공세 기획과 전략적 상상력은 ' +
    '보수적·비관적이어서 1918년 봄 위기에서 포슈에게 연합군 총사령관 자리를 내주었다. ' +
    '병사와 대중의 압도적 신뢰, 절제된 언행과 «국민의 할아버지» 이미지가 결합한 카리스마는 ' +
    '최상위권이며, 비시의 조직적 개인숭배도 이 자산 위에서 작동했다. 그러나 통치자로서는 ' +
    '수동적이어서 84세에 전권을 쥐고도 정책 실무는 라발·다를랑에게 의존했고 1942년 이후에는 ' +
    '명목상 존재로 전락했다(정치). 독일과의 교섭에서 지렛대를 만들어내지 못한 것이 외교 ' +
    '평가의 핵심이다. 유대인 지위법을 자발적으로 발의·강화하고 협력을 국책으로 선언한 도덕적 ' +
    '책임은 군사적 공적으로 상쇄되지 않는다는 것이 학계의 합의다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedPetain(prisma: PrismaService): Promise<void> {
  console.log('\n🎖️ 필리프 페탱(Philippe Pétain) 보강 시작 (기존 행 보강 모드)...')

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
  // 1940-07-11 이후 재임은 국호가 «프랑스국»으로 바뀌었으므로 비시 HC에 붙인다
  const vichy = await prisma.historicalCountry.findFirst({
    where: { name: '비시 프랑스' },
    select: { id: true },
  })
  if (!vichy) {
    console.warn('  ⚠️  «비시 프랑스» HC 미존재 — 1940~44 재임 2건과 소속을 건너뛴다.')
  }

  const person = await prisma.person.findFirst({
    where: { surname: PETAIN.surnameKey },
  })
  if (!person) {
    console.warn('  ⚠️  페탱 인물 행이 없다 — 이 시드는 기존 행 보강 전용이라 중단한다.')
    return
  }
  const personId = person.id

  // ── 1) 인물 필드 보강 (누락만) ────────────────────────────────────────────
  const patch: Record<string, unknown> = {}
  if (!person.originalName) patch.originalName = PETAIN.originalName
  if (!person.biography) patch.biography = PETAIN.biography
  if (!person.birthPlaceText) patch.birthPlaceText = PETAIN.birthPlaceText
  if (!person.birthNote) patch.birthNote = PETAIN.birthNote
  if (!person.deathPlaceText) patch.deathPlaceText = PETAIN.deathPlaceText
  if (!person.deathType) patch.deathType = PETAIN.deathType
  if (!person.deathCause) patch.deathCause = PETAIN.deathCause
  if (!person.deathNote) patch.deathNote = PETAIN.deathNote
  if (person.influence == null) patch.influence = PETAIN.influence
  if (!person.historicalCountryId) patch.historicalCountryId = france.id
  if (Object.keys(patch).length > 0) {
    await prisma.person.update({ where: { id: personId }, data: patch })
    console.log(`  🔧 보강: ${Object.keys(patch).join(', ')}`)
  } else {
    console.log('  ⏭️  인물 필드 보강할 것 없음')
  }

  // ── 2) 재임 14건 ──────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const hcId = t.vichy ? vichy?.id : france.id
    if (!hcId) {
      console.warn(`  ⚠️  재임 건너뜀 (비시 HC 없음): ${t.title}`)
      continue
    }
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: { personId, historicalCountryId: hcId, positionType: t.positionType, startDate },
      select: { id: true, appointmentDetail: true },
    })
    if (existing) {
      // 선재 행은 create를 타지 않으므로 비어 있는 취임 경위만 백필한다
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
        historicalCountryId: hcId,
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
    console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})${t.vichy ? ' [비시]' : ''}`)
  }

  // ── 3) 비시 프랑스 소속 추가 ───────────────────────────────────────────────
  if (vichy) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: { personId, historicalCountryId: vichy.id },
    })
    if (exists) {
      console.log('  ⏭️  소속국가 스킵: 비시 프랑스')
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: vichy.id,
          affiliationType: 'CITIZENSHIP' as any,
          priority: 1,
          note: '1940-07-11 국가주석 취임으로 «프랑스국(État français)»의 수반이 되었다 (~1944-08).',
        },
      })
      console.log('  ✅ 소속국가: 비시 프랑스 (1940~1944 국가주석)')
    }
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
        politics: PETAIN_STATS.politics,
        military: PETAIN_STATS.military,
        diplomacy: PETAIN_STATS.diplomacy,
        intellect: PETAIN_STATS.intellect,
        charisma: PETAIN_STATS.charisma,
        administration: PETAIN_STATS.administration,
        notes: PETAIN_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${PETAIN_STATS.politics}·군사 ${PETAIN_STATS.military}·` +
        `외교 ${PETAIN_STATS.diplomacy}·학식 ${PETAIN_STATS.intellect}·` +
        `카리스마 ${PETAIN_STATS.charisma}·행정 ${PETAIN_STATS.administration}`,
    )
  }

  console.log('✅ 필리프 페탱 보강 완료\n')
}
