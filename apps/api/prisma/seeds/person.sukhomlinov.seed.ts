/**
 * 블라디미르 알렉산드로비치 수호믈리노프 (Vladimir Alexandrovich Sukhomlinov, 1848~1926) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 기병대장·전쟁장관(1909~1915). 제1차 세계대전 개전기 육군을 총괄한
 * 최고 책임자로, 개전 직후의 대패와 1915년 «포탄 기근»의 책임을 지고 해임된 뒤
 * 반역 혐의로 기소되어 1917년 직권남용으로 무기징역을 선고받았다. 러시아 제국사에서
 * 형사 유죄판결을 받은 유일한 전쟁장관.
 *
 * 날짜 규약: 러시아 관보·복무기록 원자료는 구력(율리우스력·OS)이며, 이 시드는
 * 신력(NS)으로 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes·
 * birthNote에 병기. 1926년 베를린 사망은 그레고리력 전환 후라 환산 불필요.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('전쟁장관' 관직 정의).
 *       독일 바이마르 공화국 HC는 있으면 망명지(EXILE)로 연결하고 없으면 건너뛴다.
 *
 * 등록 항목:
 *  - Person x1 (수호믈리노프 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x7 (군 지휘 MILITARY_COMMANDER 6 + 전쟁장관 CABINET_MINISTER 1)
 *    · 키예프 군관구 사령관 재임에 총독 겸임을 흡수(겸직 시점은 notes) — 바르크 선례
 *  - PersonCountryAffiliation x2 (러시아 제국 CITIZENSHIP / 바이마르 공화국 EXILE)
 *  - PersonLifeEvent x34 (연보)
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
const SUKHOMLINOV = {
  name: '블라디미르',
  middleName: '알렉산드로비치',
  surname: '수호믈리노프',
  originalName: 'Vladimir Alexandrovich Sukhomlinov (Владимир Александрович Сухомлинов)',
  gender: 'MALE' as const,
  birthYear: 1848, birthMonth: 8, birthDay: 16,
  birthNote:
    '구력(율리우스력) 1848-08-04 출생 — 신력 환산 08-16. 코브노현 텔시(현 리투아니아 ' +
    '텔샤이)의 귀족 가문 — 아버지 알렉산드르 파블로비치(1796~1886), 어머니 올가 이바노브나 ' +
    '룬스카야. 누이 베라는 파벨 플레베 장군과 혼인했고, 형제 니콜라이는 오렌부르크 ' +
    '지사였다. (영어권 일부 자료의 «빌나현»은 1861년 입학한 빌노 유년학교와의 혼동.)',
  birthPlaceText: '러시아 제국 코브노현 텔시 (현 리투아니아 텔샤이)',
  deathYear: 1926, deathMonth: 2, deathDay: 2,
  deathPlaceText: '독일 베를린',
  deathType: DeathType.NATURAL,
  deathCause: '심장 발작으로 추정 (향년 77세) — 망명지 베를린에서 극빈 속에 사망.',
  deathNote:
    '사망 정황은 출처가 갈린다 — 영어권 통설(풀러·맥밀런·영어 위키)은 «이른 아침 티어가르텐 ' +
    '공원 벤치에서 얼어 죽은 채 발견»이나, 이 시기를 전문으로 다룬 러시아 군사사가 베이(ВИЖ ' +
    '2015)는 시립병원에서 지병인 심장병 발작으로 죽었다고 정정한다. 이 시드는 베이를 따르되 ' +
    '벤치 이설을 병기한다. 베를린-테겔 러시아 정교회 묘지(6열 4구역 17번)에 안장 — 2차 대전 ' +
    '피해 후 복원 과정에서 목제 십자가에 사망일이 «11-02»로 잘못 새겨졌고, 교회 문서고의 ' +
    '매장 등록카드가 02-02를 기록한다. 장례에서 백군 장교 출신 인부가 «독일 첩자여, 독일 ' +
    '땅으로 가라»고 내뱉었다는 일화(로만 굴 회고)가 전한다.',
  influence: 60,
  biography:
    '러시아 제국의 기병대장(генерал от кавалерии)·전쟁장관(1909~1915). 제1차 세계대전 ' +
    '개전기 육군을 총괄한 최고 책임자로, 1915년 «포탄 기근»과 대후퇴의 책임을 지고 해임된 뒤 ' +
    '반역 혐의로 기소되어 1917년 무기 유형(бессрочная каторга)을 선고받았다 — 제국사에서 ' +
    '형사 유죄판결을 받은 유일한 전쟁장관. 오늘날의 연구는 간첩 혐의를 근거 없는 것으로 ' +
    '보지만, 금전 문제와 준비 부실의 책임까지 벗겨주지는 않는다. ' +
    '\n\n' +
    '성장과 교육(1848~1874). 코브노현 텔시(현 리투아니아 텔샤이)의 소지주 귀족 가문에서 ' +
    '군수(уездный начальник)의 장남으로 태어났다(구력 08-04). 본인 회고에 따르면 집안은 ' +
    '원래 «수호믈린»이라는 우크라이나계 성이었다. 빌노의 알렉산드르 유년학교(1861)를 거쳐 ' +
    '폴란드 봉기 후 페테르부르크 제1군사김나지움으로 옮겼고, 니콜라예프 기병학교를 1867년 ' +
    '졸업해 19세에 근위창기병연대 소위로 임관했다. 1874년 니콜라예프 참모본부아카데미를 ' +
    '수석급(1등급)으로 졸업하고 참모본부로 전속되었다. ' +
    '\n\n' +
    '러시아-튀르크 전쟁(1877~1878). 참모장교로 종군해 불가리아 터르노보의 민정을 조직했고, ' +
    '플레브나 요새 일대의 정찰 — 특히 고르니 두브냐크 전투 전의 정찰 — 로 아군의 손실을 ' +
    '크게 줄였다. 카르초프 지대에 배속돼 한겨울 트로얀 고개 돌파에 참가했다. 전공으로 ' +
    '중령 진급과 «용맹»명 황금무기(1878-02-05), 성 게오르기 4등훈장(1878-02-12)을 받았다. ' +
    '\n\n' +
    '교육자·기병 전문가(1878~1899). 드라고미로프의 초빙으로 참모본부아카데미 서무장을 맡아 ' +
    '(1878~1884) 실습 전술과 보충과정을 이끌었고, 기병학교·근위유년학교에서 전술을 강의했다 ' +
    '— 다만 아카데미 «교수»는 아니었다. 파블로그라드 근위용기병연대장(1884~1886)을 거쳐 ' +
    '장교기병학교 교장으로 11년 3개월(1886~1897)을 보내며 러시아 기병 교육의 중추를 맡았고, ' +
    '이 시기 «오스타프 본다렌코»라는 필명으로 기병 논쟁·풍자 소품·군사 단편을 써 문명(文名) ' +
    '도 얻었다. 제10기병사단장(1897~1899)으로 야전에 복귀했다. ' +
    '\n\n' +
    '키예프 시대(1899~1908). 키예프 군관구 참모장(1899)·사령관 보좌관(1902)·사령관(1904)으로 ' +
    '올라섰고, 1905년부터는 키예프·포돌리아·볼히니아 총독을 겸해 1905~07년 혁명기의 서남부를 ' +
    '관할했다. 1906년 기병대장. 이 시기 비아리츠에서 34세 연하의 유부녀 예카테리나 부토비치를 ' +
    '만나 5년에 걸친 이혼 소송에 직접 개입했고, 1909년 그와 재혼했다 — 세 번째 결혼이자 평생의 ' +
    '평판을 갉아먹은 «개인적 불행의 근원»(본인 표현)이었다. ' +
    '\n\n' +
    '참모총장에서 전쟁장관으로(1908~1909). 1908-12-15(구력 12-02) 참모총장에 올랐으나 99일 ' +
    '만인 1909-03-24(구력 03-11) 레디게르의 후임 전쟁장관이 되었다 — 참모본부를 육군성에 ' +
    '재예속시킨 인사였다. ' +
    '\n\n' +
    '개혁(1909~1914). 예비·요새 부대를 폐지해 야전군단을 31→37개로 늘리고, 폴란드 돌출부의 ' +
    '요새들을 폐기한 뒤 동원 집중선을 코브노-브레스트-로브노로 후퇴시켰다(1910) — 전방 ' +
    '지휘관 알렉세예프와 병참감 다닐로프의 반발을 1912년 모스크바 회의로 봉합해 A안(주적 ' +
    '오스트리아)·G안(주적 독일) 이원 전쟁계획이 나왔다. 1912년 야전근무령, 1913년 배치요강, ' +
    '1914년 «대육군계획»(4억 3,320만 루블·장교 1만 1,800명과 병 46만 8,200명 증원, 1917년 ' +
    '완성 목표)이 그의 작품이며, 방첩기관 창설(1911)·항공대·군단 항공분대·연대 기관총대도 ' +
    '그의 재임기 산물이다. 개전 전야 상비군은 142만 3천 명에 이르렀다. 반면 두마에는 6년간 ' +
    '한 번도 출석하지 않아 구치코프와 척을 졌고, 화력보다 기병 돌격을 중시한 구식 취향과 ' +
    '«나는 25년째 군사 교범을 읽지 않았다»는 호언(터크먼 전언)은 두고두고 조롱거리가 되었다. ' +
    '\n\n' +
    '7월 위기와 개전(1914). 1914-07-29 밤 니콜라이 2세가 빌헬름 2세의 전보를 받고 총동원을 ' +
    '번복하자, 야누시케비치에게 «아무것도 하지 말라»며 사실상 동원을 멈추지 않았다고 훗날 ' +
    '재판에서 진술했다. 07-30 사조노프·야누시케비치와 함께 총동원 재가를 관철했다. 개전 후 ' +
    '최고총사령관이 된 니콜라이 니콜라예비치 대공과의 반목으로 육군성의 권한은 스타프카로 ' +
    '넘어갔다. ' +
    '\n\n' +
    '몰락(1915). 자신의 비호를 받던 헌병대령 먀소예도프가 간첩 혐의로 체포·처형되자 ' +
    '(1915-04-02, 재판관 8인이 4대 4로 갈렸으나 대공이 «어쨌든 목매달라»고 재결) 반역의 혐의가 ' +
    '그대로 장관에게 옮겨붙었다. 고를리체 돌파와 대후퇴, 하루 포당 5~10발까지 떨어진 «포탄 ' +
    '기근»의 책임론이 겹치며 1915-06-26(구력 06-13) 해임되었다 — 후임은 1912년 자신이 내친 ' +
    '폴리바노프였다. ' +
    '\n\n' +
    '수사와 재판(1915~1917). 해임 한 달 뒤인 1915-07-28(구력 07-15) 위법한 태만·직권남용· ' +
    '공문서 위조·수뢰·국가반역 혐의로 수사가 개시되었다. 1916-03-21 군적을 잃고 4월 국가 ' +
    '평의회에서 제명된 뒤 페트로파블 요새 트루베츠코이 능보에 수감되었다가, 라스푸틴·황후의 ' +
    '개입으로 1916-10-24 가택연금으로 완화되었으나 2월 혁명 이튿날인 1917-03-14 자택에서 ' +
    '다시 체포되었다 — 페트로그라드 소비에트 «이즈베스티야» 보도에 따르면 침실 이불 속에 ' +
    '베개를 뒤집어쓴 채 발견되었다. 1917-08-23~09-25(구력 08-10~09-12) 배심 재판을 거쳐 ' +
    '09-26(구력 09-13) 열 개 공소사실 중 아홉 개 — 국가반역·직권남용과 태만·공문서 위조를 ' +
    '포함 — 에 유죄, 「전시 직무유기로 적을 이롭게 한 죄」 한 건에만 무죄가 선고되었다. ' +
    '형량은 신분권 박탈과 무기 유형(бессрочная каторга)으로, 전선 밖에서는 사형이 폐지돼 ' +
    '있어 내릴 수 있는 최고형이었다 — 다만 유형은 곧 금고로 감형되어 실제 노역은 하지 ' +
    '않았다. 함께 기소된 아내 예카테리나는 무죄로 법정의 박수를 받으며 나갔다. ' +
    '\n\n' +
    '망명과 최후(1918~1926). 1918-05-01 볼셰비키의 «70세 이상» 사면으로 크레스티 감옥에서 ' +
    '풀려났다 — 2년의 수감으로 30킬로그램 넘게 빠진 뒤였다. 적색테러가 시작되자 잠적했다가 ' +
    '09-22 핀란드역에서 기차를 타고 세스트라 강을 어부의 배로 건너 핀란드로 탈출했고, 1920년 ' +
    '독일로 옮겨 반들리츠를 거쳐 베를린에 정착했다. 망명 사회 대부분이 등을 돌린 가운데 ' +
    '극빈 속에서 회고록 «Воспоминания»(베를린 1924, 독일어판 «Erinnerungen» 1923-12)를 ' +
    '남기고 1926-02-02 사망했다. ' +
    '\n\n' +
    '평가. 오랫동안 «군복 입은 라스푸틴»으로 1917년의 악마학에 편입돼 있었으나, 노먼 스톤은 ' +
    '«그에 대한 기소는 결코 물샐틈없지 않다»고 했고, 풀러는 반역 재판의 두 핵심 증인을 ' +
    '«투명한 거짓과 광기 어린 환상의 혼합»으로 판정해 간첩 혐의 자체를 기각하면서도, 재임 ' +
    '6년간 연봉 6만 3천 루블로는 설명되지 않는 70만 2,737루블의 입금을 들어 «뇌물은 받았다»고 ' +
    '못 박았다. 러시아 측 연구(베이)는 1917년 재판을 아예 «준비 부실의 모든 책임을 한 사람에게 ' +
    '떠넘긴 치욕적 전시재판»으로 규정하고, 포탄 재고가 승인된 기준치를 채우고 있었다는 점 — ' +
    '기준 자체가 너무 낮았을 뿐이라는 점 — 을 들어 «포탄 기근» 책임론을 반박한다. 메닝은 그의 ' +
    '개혁이 개전 전야의 142만 상비군을 만들었다고 평가한다. 오늘날의 통설은 그를 제국 준비 ' +
    '부실의 유일한 원흉이 아니라 체제 전체의 실패를 뒤집어쓴 희생양으로 보되, 그 자신도 결백 ' +
    '하지는 않았다고 본다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  definitionTitle?: '전쟁장관'
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '장교기병학교 교장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1886, startMonth: 1, startDay: 22,
    endYear: 1897, endMonth: 4, endDay: 28,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '제10기병사단장으로 전보 (구력 1897-04-16).',
    notes:
      '구력 1886-01-10 취임 — 11년 3개월의 최장 보직으로, 러시아 기병 교육의 중추를 맡았다. ' +
      '재임 중 소장 진급(구력 1890-08-30). 기병 근무 교범·뮈라 연구 등 군사 저술과 «정찰병»· ' +
      '«군사총서»·«러시아 상이군인» 기고로 이름을 알린 시기. (영어권 일부 자료의 1898년 ' +
      '이임은 오기 — 후임 아가시베크 압샤로프 취임이 구력 1897-05-03.)',
  },
  {
    title: '제10기병사단장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1897, startMonth: 4, startDay: 28,
    endYear: 1899, endMonth: 6, endDay: 6,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '키예프 군관구 참모장으로 전보 (구력 1899-05-25).',
    notes: '구력 1897-04-16 취임, 하리코프 주둔(키예프 군관구). 재임 중 중장 진급(구력 1898-01-13).',
  },
  {
    title: '키예프 군관구 참모장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1899, startMonth: 6, startDay: 6,
    endYear: 1902, endMonth: 10, endDay: 25,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '키예프 군관구 사령관 보좌관으로 승진 (구력 1902-10-12).',
    notes:
      '구력 1899-05-25 취임 — 스승 격인 드라고미로프 사령관 아래서. 1902년 쿠르스크 대기동에서 ' +
      '«남부군» 참모장.',
  },
  {
    title: '키예프 군관구 사령관 보좌관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1902, startMonth: 10, startDay: 25,
    endYear: 1904, endMonth: 11, endDay: 5,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '키예프 군관구 사령관으로 승진 (구력 1904-10-23).',
    notes: '구력 1902-10-12 취임 — 계속 드라고미로프 아래서 부사령관 격.',
  },
  {
    title: '키예프 군관구 사령관 (1905~ 키예프·포돌리아·볼히니아 총독 겸임)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1904, startMonth: 11, startDay: 5,
    endYear: 1908, endMonth: 12, endDay: 15,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '참모총장으로 영전 (구력 1908-12-02).',
    notes:
      '구력 1904-10-23 취임. 구력 1905-10-19(신력 11-01)부터 키예프·포돌리아·볼히니아 총독을 ' +
      '겸해 1905~07년 혁명기의 서남부를 관할했다 — 두 직을 한 재임으로 묶고 겸직 시점을 여기 ' +
      '기록. 재임 중 기병대장 진급(구력 1906-12-06). (histrf의 «1903년 사령관 취임»은 소수설.)',
  },
  {
    title: '참모본부 총국장(참모총장)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1908, startMonth: 12, startDay: 15,
    endYear: 1909, endMonth: 3, endDay: 24,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '전쟁장관으로 영전 (구력 1909-03-11) — 후임은 미실랍스키.',
    notes:
      '구력 1908-12-02 취임, 팔리친 후임. 정식 직함은 참모본부 총국장(начальник ГУГШ)이고 ' +
      '«참모총장»은 통칭 — 부임하면서 «군령은 하나여야 한다»며 스스로 총국의 육군성 예속을 ' +
      '관철했다(전임 팔리친은 바로 그 예속에 반대해 물러났다). 재임 99일로 사실상 전쟁장관 ' +
      '취임을 위한 경유지. 1908~09년 국가방위회의 위원 겸임.',
  },
  {
    title: '전쟁장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '전쟁장관',
    startYear: 1909, startMonth: 3, startDay: 24,
    endYear: 1915, endMonth: 6, endDay: 26,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1915년 «포탄 기근»과 대후퇴의 책임론·먀소예도프 사건의 여파로 여론에 밀려 해임 — ' +
      '후임은 1912년 자신이 내친 폴리바노프(처음엔 육군성 관리서리, 구력 09-10 정식 임명). ' +
      '국가평의회 의석은 일단 유지. 해임일은 사료가 구력 06-11·12·13으로 갈리는데, 니콜라이 ' +
      '2세의 해임 명령서 날짜가 구력 06-12(이튿날 «레치»·«신시대» 등에 게재)이고 폴리바노프의 ' +
      '인수일이 구력 06-13이라, 인수일인 06-13(신력 06-26)을 재임 종료로 채택한다.',
    notes:
      '구력 1909-03-11 임명, 레디게르 후임 — 참모총장에서 100일 만의 승진. 재임 6년간 예비· ' +
      '요새부대 폐지로 야전군단을 31→37개로 늘리고(1909), 동원 집중선을 코브노-브레스트-' +
      '로브노로 후퇴시켰으며(1910), 1912년 야전근무령·1913년 배치요강·1914년 «대육군계획» ' +
      '(4억 3,320만 루블·병력 46만 8천 증원)을 추진했다. 방첩기관 창설(1911)·항공대·기관총대 ' +
      '도입도 그의 몫. 두마에는 6년간 단 한 번도 출석하지 않았고 구치코프와 대립했으며, ' +
      '개전 후에는 최고총사령관 니콜라이 니콜라예비치 대공과의 반목으로 권한이 스타프카로 ' +
      '넘어갔다. 1914년 7월 위기에서는 사조노프·야누시케비치와 함께 총동원을 관철.',
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
    title: '코브노현 텔시 출생',
    category: 'FAMILY',
    startYear: 1848, startMonth: 8, startDay: 16,
    description:
      '구력 08-04. 군수(уездный начальник) 알렉산드르 파블로비치의 장남 — 프로이센 국경 ' +
      '가까운 소읍의 소지주 귀족 가문(원래 성은 우크라이나계 «수호믈린»).',
  },
  {
    title: '니콜라예프 기병학교 졸업·임관',
    category: 'MILITARY',
    startYear: 1867,
    description:
      '빌노 알렉산드르 유년학교(1861)→페테르부르크 제1군사김나지움(1863, 폴란드 봉기로 ' +
      '전학)→기병학교. 19세에 바르샤바 주둔 근위창기병연대 소위로 임관.',
  },
  {
    title: '니콜라예프 참모본부아카데미 졸업',
    category: 'EDUCATION',
    startYear: 1874,
    description: '1871년 입학, 3년 과정을 1등급(수석급)으로 졸업하고 참모본부 전속.',
  },
  {
    title: '러시아-튀르크 전쟁 종군',
    category: 'MILITARY',
    startYear: 1877, endYear: 1878,
    description:
      '불가리아 터르노보 민정 조직 → 제14보병사단 → 총사령관 부속. 플레브나 요새 정찰(특히 ' +
      '고르니 두브냐크 전투 전)로 아군 손실을 크게 줄였고, 카르초프 지대에서 한겨울 트로얀 ' +
      '고개 돌파에 참가. 전공으로 중령 진급.',
  },
  {
    title: '«용맹»명 황금무기 수여',
    category: 'AWARD',
    startYear: 1878, startMonth: 2, startDay: 5,
    description: '구력 01-24 황제 명령.',
  },
  {
    title: '성 게오르기 4등훈장',
    category: 'AWARD',
    startYear: 1878, startMonth: 2, startDay: 12,
    description: '구력 01-31 — 러시아-튀르크 전쟁의 전공.',
  },
  {
    title: '참모본부아카데미 서무장',
    category: 'CAREER',
    startYear: 1878, endYear: 1884,
    description:
      '구력 1878-05-06 임명 — 드라고미로프 교장의 초빙으로 그의 최측근이 되어 실습 전술과 ' +
      '보충과정을 지도. 다만 아카데미 «교수»는 아니었다(직책은 행정직).',
  },
  {
    title: '파블로그라드 근위용기병연대장',
    category: 'MILITARY',
    startYear: 1884, endYear: 1886,
    description:
      '구력 1884-11-25 ~ 1886-01-10, 수바우키 주둔 — 부대는 옛 파블로그라드 경기병연대(1907년 ' +
      '제6경기병으로 환원)라 자료마다 용기병·경기병 표기가 갈린다.',
  },
  {
    title: '첫 결혼 — 류보프 코르프',
    category: 'FAMILY',
    startYear: 1886,
    description: '연대장 시절 결혼했으나 부인이 이듬해(1887) 사망.',
  },
  {
    title: '필명 «오스타프 본다렌코» 저술 활동',
    category: 'PUBLICATION',
    startYear: 1892, endYear: 1897,
    description:
      '기병학교 교장 시절 필명으로 기병 논쟁·풍자 소품·군사 단편을 발표(«말 위에서의 사격» ' +
      '1892, «세기말의 기병» 1893 등). 본명으로도 «기병중대의 훈련»(1887)·«말 관리 지침»' +
      '(1887) 등 교범을 남겼다.',
  },
  {
    title: '두 번째 결혼 — 사별(1904)',
    category: 'FAMILY',
    startYear: 1904,
    description:
      '기사(技師)의 미망인이던 엘리자베타 랴푸노바와 재혼했으나 1904년 사별 — «1904년부터 ' +
      '나는 홀아비였다»(회고록). 이 상태에서 이듬해 부토비치 사건이 시작된다.',
  },
  {
    title: '비아리츠 — 예카테리나와 만남',
    category: 'PERSONAL',
    startYear: 1905,
    description:
      '프랑스 휴양지에서 34세 연하의 유부녀 예카테리나 부토비치(당시 23세)를 만났다 — 5년에 ' +
      '걸친 이혼 소송에 본인이 직접 개입하며 평판을 크게 잃었다.',
  },
  {
    title: '키예프·포돌리아·볼히니아 총독 겸임',
    category: 'POLITICAL',
    startYear: 1905, startMonth: 11, startDay: 1,
    description: '구력 10-19 — 군관구 사령관과 겸해 1905~07년 혁명기 서남부를 관할.',
  },
  {
    title: '기병대장 진급',
    category: 'MILITARY',
    startYear: 1906, startMonth: 12, startDay: 19,
    description: '구력 12-06(성 니콜라이 축일 서훈일).',
  },
  {
    title: '전쟁장관 취임',
    category: 'POLITICAL',
    startYear: 1909, startMonth: 3, startDay: 24,
    description: '구력 03-11, 레디게르 후임 — 참모총장 취임 99일 만의 승진.',
  },
  {
    title: '세 번째 결혼 — 예카테리나 부토비치',
    category: 'FAMILY',
    startYear: 1909, startMonth: 11, startDay: 26,
    description:
      '구력 11-13, 종무원 결정으로 그가 이혼 성립된 이틀 뒤의 조촐한 예식(하객에 먀소예도프 ' +
      '부부도 있었다). 폴타바 귀족단이 소송 처신을 «불명예»로 결의하는 등 사회적 파장이 컸다.',
  },
  {
    title: '국가평의회 의원 임명',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 12, startDay: 19,
    description: '구력 12-06 — 전쟁장관 겸임.',
  },
  {
    title: '구치코프의 먀소예도프 공격 — 사건의 발단',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 4,
    description:
      '두마 예산 심의에서 구치코프가 헌병대령 먀소예도프의 전력을 폭로하고 «신시대»지 ' +
      '인터뷰(구력 04-17)로 간첩 의혹을 공개, 결투(구력 04-22)로 번졌다 — 3년 뒤 장관을 ' +
      '무너뜨리는 사건의 시작.',
  },
  {
    title: '시종무관장(генерал-адъютант) 서임',
    category: 'AWARD',
    startYear: 1912,
    description: '월일은 사료 미확인 — 황제의 각별한 신임을 보여주는 최고 예우.',
  },
  {
    title: '«러시아는 평화를 원하지만 전쟁에 준비돼 있다»',
    category: 'PUBLICATION',
    startYear: 1914, startMonth: 3, startDay: 12,
    description:
      '구력 02-27 «증권소식»지 익명 기고 — 러일전쟁 후 육군이 회복됐다는 주장으로, 당대인들이 ' +
      '장관의 문체를 알아봤고 황제의 사전 승인을 받았다고 전한다. 독일을 자극한 실책으로 꼽힌다.',
  },
  {
    title: '7월 위기 — 총동원 관철',
    category: 'MILITARY',
    startYear: 1914, startMonth: 7, startDay: 30,
    description:
      '07-29 밤 황제가 총동원을 번복하자 야누시케비치에게 «아무것도 하지 말라»고 해 사실상 ' +
      '동원을 멈추지 않았다고 훗날 재판에서 진술. 이튿날 사조노프·야누시케비치와 함께 재가를 ' +
      '관철했다.',
  },
  {
    title: '먀소예도프 처형 — 반역 혐의의 전이',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 4, startDay: 2,
    description:
      '자신의 비호를 받던 헌병대령이 간첩죄로 처형(구력 03-20, 바르샤바 성채) — 재판관 8인이 ' +
      '4대 4로 갈렸으나 대공이 «어쨌든 목매달라»고 재결했다. 반역의 혐의가 그대로 장관에게 ' +
      '옮겨붙었다.',
  },
  {
    title: '전쟁장관 해임',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 6, startDay: 26,
    description:
      '대후퇴와 «포탄 기근»의 책임론에 밀려 해임 — 후임은 1912년 자신이 내친 폴리바노프. ' +
      '사료가 구력 06-11·12·13으로 갈리나 해임 명령서가 구력 06-12자이고 후임 인수가 06-13 ' +
      '이라, 인수일(신력 06-26)을 채택했다.',
  },
  {
    title: '수사 개시',
    category: 'POLITICAL',
    startYear: 1915, startMonth: 7, startDay: 28,
    description:
      '구력 07-15 — 위법한 태만·직권남용·공문서 위조·수뢰·국가반역 혐의. 해임 한 달 만이었다.',
  },
  {
    title: '군적 박탈·국가평의회 제명',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 3, startDay: 21,
    description: '구력 03-08 퇴역 처분, 이어 4월 국가평의회에서 제명.',
  },
  {
    title: '페트로파블 요새 수감',
    category: 'PERSONAL',
    startYear: 1916, startMonth: 5, startDay: 4,
    description:
      '구력 04-21 트루베츠코이 능보 수감(체포일은 구력 04-20/21/29 이설). 구력 10-11(신력 ' +
      '10-24) 라스푸틴·황후의 개입으로 가택연금으로 완화.',
  },
  {
    title: '2월 혁명 — 자택에서 재체포',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 3, startDay: 14,
    description:
      '구력 03-01, 오피체르스카야 거리 자택 — 페트로그라드 소비에트 «이즈베스티야»(구력 ' +
      '03-09) 보도에 따르면 침실 이불 속에 베개를 뒤집어쓴 채 발견돼 자동차로 국가두마에 ' +
      '연행되었고, 군중은 «반역자, 조국을 팔았다»고 외쳤다.',
  },
  {
    title: '페트로그라드 배심 재판',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 8, startDay: 23,
    endYear: 1917, endMonth: 9, endDay: 25,
    description:
      '구력 08-10~09-12 심리 — 재판장 타간체프 원로원 의원, 검사 노소비치, 변호인 카자리노프. ' +
      '함께 기소된 아내 예카테리나는 무죄로 법정의 박수를 받으며 나갔다.',
  },
  {
    title: '유죄 판결 — 무기 유형',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 9, startDay: 26,
    description:
      '구력 09-13(배심이 09-12 저녁 7시 30분 평의에 들어가 새벽에 복귀). 열 개 공소사실 중 ' +
      '아홉 개(국가반역·직권남용과 태만·공문서 위조 포함)에 유죄, 「전시 직무유기로 적을 ' +
      '이롭게 한 죄」 한 건만 무죄. 형량은 신분권 박탈+무기 유형으로 전선 밖 최고형이었으나 ' +
      '곧 금고로 감형돼 실제 노역은 하지 않았다. (영어 위키의 «반역 무죄»는 오류 — 다투어지는 ' +
      '것은 유죄 여부가 아니라 그 유죄가 정당했는가다.)',
  },
  {
    title: '사면 석방 — 70세 조항',
    category: 'PERSONAL',
    startYear: 1918, startMonth: 5, startDay: 1,
    description:
      '볼셰비키의 노동절 사면(70세 이상 수감자)으로 크레스티 감옥에서 석방 — 2년 수감으로 ' +
      '체중이 30킬로그램 넘게 빠진 뒤였다. 실제로는 당시 69세였고 70세 생일은 그해 8월이라, ' +
      '러시아 사료의 «70세 도달» 설명은 계산이 맞지 않는다. (소비에트 러시아가 1918년 2월 ' +
      '그레고리력으로 전환한 뒤라 이후 날짜는 구력 병기가 없다.)',
  },
  {
    title: '핀란드로 탈출',
    category: 'EXILE',
    startYear: 1918, startMonth: 9, startDay: 22,
    description:
      '적색테러로 동료 수감자들이 총살되자 잠적했다가 핀란드역에서 기차로 벨로오스트로프까지 ' +
      '간 뒤 어부의 배로 세스트라 강을 건넜다. 테리요키를 거쳐 헬싱포르스 — 1919·1920년 ' +
      '«망명 동지에게 보내는 편지» 두 권을 냈다.',
  },
  {
    title: '독일 망명 — 회고록 집필',
    category: 'EXILE',
    startYear: 1920,
    description:
      '난민 자격으로 독일 이주, 1923~24년 베를린 근교 반들리츠에서 회고록을 마무리 — 서문에 ' +
      '«1923년 11월, 반들리츠제»라 적었다. 망명 사회 대부분이 등을 돌린 가운데 극빈 속에 ' +
      '지냈고 망명 단체 활동은 하지 않았다.',
  },
  {
    title: '회고록 «Воспоминания» 출간',
    category: 'PUBLICATION',
    startYear: 1924, startMonth: 1,
    description:
      '베를린 러시아종합출판사 — 독일어판 «Erinnerungen»은 1923-12 선행 출간(라이마르 호빙). ' +
      '1926년 소련 국영출판사가 네프스키의 서문을 붙여 재간했다. 1925년에는 «니콜라이 ' +
      '니콜라예비치 대공»도 냈다.',
  },
  {
    title: '베를린에서 사망',
    category: 'PERSONAL',
    startYear: 1926, startMonth: 2, startDay: 2,
    description:
      '향년 77세 — 시립병원에서 심장 발작(러시아 전문 연구 베이)으로 보는 설과 티어가르텐 ' +
      '공원 벤치에서 동사한 채 발견됐다는 영어권 통설이 갈린다. 베를린-테겔 러시아 정교회 ' +
      '묘지 안장.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const SUKHOMLINOV_STATS = {
  politics: 52,
  military: 58,
  diplomacy: 30,
  intellect: 58,
  charisma: 68,
  administration: 45,
  notes:
    '기병 교육의 일인자로 40년을 쌓아 올린 군 경력과 개전 전야 142만 상비군을 만든 개혁 ' +
    '실적(군사)은 실재하나, 화력보다 기병 돌격을 신봉한 구식 취향과 «25년째 교범을 읽지 ' +
    '않았다»는 호언이 그 절반을 깎아먹는다. 최대 자산은 황제를 사로잡은 화술과 인간적 매력 ' +
    '(카리스마) — 레디게르는 «스스로 일하는 사람은 아니나 부하에게 일을 맡기고 이끌 줄 ' +
    '안다», 브루실로프는 «영민하나 천박하고 경솔한 눈속임꾼»이라 평했다. 두마에 6년간 단 ' +
    '한 번도 나가지 않은 대의회 감각의 부재(정치)와, 포탄 부족을 은폐하고 70만 루블의 출처 ' +
    '불명 예금을 남긴 성무 관리(행정)가 몰락의 근인이다. 외교는 경력 자체가 없다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedSukhomlinov(prisma: PrismaService): Promise<void> {
  console.log('\n🎖️ 블라디미르 수호믈리노프(Vladimir Sukhomlinov) 시딩 시작 (기존 데이터 보존 모드)...')

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

  // 망명 체류의 대부분(1921~1926 베를린)이 바이마르기라 바이마르 공화국으로 연결한다.
  const exileHc = await prisma.historicalCountry.findFirst({
    where: { name: '바이마르 공화국' },
    select: { id: true, name: true },
  })

  const warMinisterDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '전쟁장관' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Vladimir Alexandrovich Sukhomlinov' } },
        { AND: [{ name: '블라디미르' }, { surname: '수호믈리노프' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = SUKHOMLINOV.originalName
    if (!person.biography) patch.biography = SUKHOMLINOV.biography
    if (!person.birthPlaceText) patch.birthPlaceText = SUKHOMLINOV.birthPlaceText
    if (!person.birthNote) patch.birthNote = SUKHOMLINOV.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = SUKHOMLINOV.deathPlaceText
    if (!person.deathType) patch.deathType = SUKHOMLINOV.deathType
    if (!person.deathCause) patch.deathCause = SUKHOMLINOV.deathCause
    if (!person.deathNote) patch.deathNote = SUKHOMLINOV.deathNote
    if (person.influence == null) patch.influence = SUKHOMLINOV.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${SUKHOMLINOV.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${SUKHOMLINOV.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: SUKHOMLINOV.name,
        middleName: SUKHOMLINOV.middleName,
        surname: SUKHOMLINOV.surname,
        originalName: SUKHOMLINOV.originalName,
        biography: SUKHOMLINOV.biography,
        birthDate: toDate(SUKHOMLINOV.birthYear, SUKHOMLINOV.birthMonth, SUKHOMLINOV.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: SUKHOMLINOV.birthNote,
        deathDate: toDate(SUKHOMLINOV.deathYear, SUKHOMLINOV.deathMonth, SUKHOMLINOV.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: SUKHOMLINOV.deathType,
        deathCause: SUKHOMLINOV.deathCause,
        deathNote: SUKHOMLINOV.deathNote,
        gender: SUKHOMLINOV.gender,
        nameDisplayOrder: 'western' as any,
        influence: SUKHOMLINOV.influence,
        birthPlaceText: SUKHOMLINOV.birthPlaceText,
        deathPlaceText: SUKHOMLINOV.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${SUKHOMLINOV.originalName} (id=${person.id})`)
  }
  const personId = person.id

  // ── 2) 재임 ────────────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const startDatePrecision = t.startDay ? 'day' : t.startMonth ? 'month' : 'year'
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionType: t.positionType,
        startDate,
      },
    })
    if (existing) {
      console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.title} (${t.startYear})`)
      continue
    }
    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        historicalCountryId: russianEmpire.id,
        positionDefinitionId:
          t.definitionTitle === '전쟁장관' ? (warMinisterDef?.id ?? undefined) : undefined,
        positionType: t.positionType,
        title: t.title,
        startDate,
        startDatePrecision,
        endDate: toDate(t.endYear, t.endMonth, t.endDay),
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${t.title} (${t.startYear} ~ ${t.endYear})`)
  }

  // ── 3) 국가 소속 ───────────────────────────────────────────────────────────
  const affiliations: {
    historicalCountryId: string
    type: 'CITIZENSHIP' | 'EXILE'
    label: string
    priority: number
    note?: string
  }[] = [
    {
      historicalCountryId: russianEmpire.id,
      type: 'CITIZENSHIP',
      label: '러시아 제국 (출생·복무 1848~1918)',
      priority: 0,
    },
  ]
  if (exileHc) {
    affiliations.push({
      historicalCountryId: exileHc.id,
      type: 'EXILE',
      label: `${exileHc.name} (1918 망명 — 베를린, 1926 사망)`,
      priority: 1,
      note: '석방 후 핀란드를 거쳐 베를린에 정착 — 궁핍 속에 회고록을 남기고 1926년 사망.',
    })
  } else {
    console.warn('  ⚠️  망명지 HC(바이마르 공화국/독일 제국) 미존재 — EXILE 소속 연결을 건너뛴다.')
  }
  for (const aff of affiliations) {
    const exists = await prisma.personCountryAffiliation.findFirst({
      where: {
        personId,
        historicalCountryId: aff.historicalCountryId,
        affiliationType: aff.type as any,
      },
    })
    if (exists) {
      console.log(`  ⏭️  소속국가 스킵: ${aff.label}`)
    } else {
      await prisma.personCountryAffiliation.create({
        data: {
          personId,
          historicalCountryId: aff.historicalCountryId,
          affiliationType: aff.type as any,
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
        politics: SUKHOMLINOV_STATS.politics,
        military: SUKHOMLINOV_STATS.military,
        diplomacy: SUKHOMLINOV_STATS.diplomacy,
        intellect: SUKHOMLINOV_STATS.intellect,
        charisma: SUKHOMLINOV_STATS.charisma,
        administration: SUKHOMLINOV_STATS.administration,
        notes: SUKHOMLINOV_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${SUKHOMLINOV_STATS.politics}·군사 ${SUKHOMLINOV_STATS.military}·` +
        `외교 ${SUKHOMLINOV_STATS.diplomacy}·학식 ${SUKHOMLINOV_STATS.intellect}·` +
        `카리스마 ${SUKHOMLINOV_STATS.charisma}·행정 ${SUKHOMLINOV_STATS.administration}`,
    )
  }

  console.log('✅ 블라디미르 수호믈리노프 시딩 완료\n')
}
