/**
 * 이반 콘스탄티노비치 그리고로비치 (Ivan Konstantinovich Grigorovich, 1853~1930) 인물 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure 등이 이미 있으면 갱신하지 않고
 *    누락 필드만 보강한다. (사용자 편집 보호)
 *
 * 러시아 제국의 해군대장(адмирал)·마지막 해군장관(1911~1917). 쓰시마에서 궤멸한 함대를
 * 다시 세운 재건의 설계자이자, 두마와 협력해 예산을 따낸 이례적 각료였다. 수호믈리노프와
 * 정반대로 2월 혁명 후에도 기소되지 않았고, 소비에트 러시아에 남아 해군 사료 편찬에
 * 종사하다 1924년 프랑스로 떠나 망명지에서 그림을 팔아 연명했다.
 *
 * 날짜 규약: 러시아 관보·복무기록 원자료는 구력(율리우스력·OS)이며, 이 시드는 신력(NS)으로
 * 환산해 저장한다(20세기 +13일, 19세기 +12일). 구력 원일자는 notes·birthNote에 병기.
 * 1930년 망통 사망은 그레고리력이라 환산 불필요.
 *
 * 의존: seedRussiaHistoricalCountries('러시아 제국' HC) +
 *       seedGovernmentPositionDefinitions('해군장관' 관직 정의).
 *       프랑스 제3공화국 HC는 있으면 망명지(EXILE)로 연결하고 없으면 건너뛴다.
 *
 * 등록 항목:
 *  - Person x1 (그리고로비치 본인 — historicalCountryId=러시아 제국)
 *  - GovernmentPositionTenure x7 (해군 지휘 MILITARY_COMMANDER 5 + 해군차관 VICE_MINISTER 1
 *    + 해군장관 CABINET_MINISTER 1) — 신규 생성이므로 appointmentDetail(취임 경위)을
 *    create에 직접 넣는다. 기존 행 보강용 축 시드(tenure.ww1-appointment.enrich)와 규약은
 *    같고, 그쪽은 이미 있는 행만 채우므로 여기서 채워두면 중복되지 않는다.
 *  - PersonCountryAffiliation x2 (러시아 제국 CITIZENSHIP / 프랑스 제3공화국 EXILE)
 *  - PersonLifeEvent x32 (연보)
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
const GRIGOROVICH = {
  name: '이반',
  middleName: '콘스탄티노비치',
  surname: '그리고로비치',
  originalName: 'Ivan Konstantinovich Grigorovich (Иван Константинович Григорович)',
  gender: 'MALE' as const,
  birthYear: 1853, birthMonth: 2, birthDay: 7,
  birthNote:
    '구력(율리우스력) 1853-01-26 출생 — 신력 환산 02-07. 폴타바현 귀족 출신의 대물림 ' +
    '해군 가문으로, 아버지 콘스탄틴 이바노비치는 1등대령(후일 소장)·제5함대승조단장, ' +
    '어머니 마리야 예고로브나는 폰 데어 호벤 남작가 출신(제독 바실리 호벤의 누이)이었다. ' +
    '유년기는 아버지의 임지 레발(현 탈린)에서 보냈고, 훗날 탈린 명예시민이 되었다.',
  birthPlaceText: '러시아 제국 상트페테르부르크',
  deathYear: 1930, deathMonth: 3, deathDay: 3,
  deathPlaceText: '프랑스 망통',
  deathType: DeathType.NATURAL,
  deathCause: '망명지에서 사실상의 궁핍 속에 사망 (향년 77세) — 사인은 사료 미기록.',
  deathNote:
    '46년을 복무한 제독이 연금 없이 그림을 팔아 살다 세상을 떠났다. 사인을 명시한 사료는 ' +
    '없고, 1924년 출국 사유였던 뇌종양(현지 수술설)과 1920~21년 두 차례의 대엽성 폐렴이 ' +
    '유일한 의학적 단서다. 망통의 러시아인 묘지(«옛 성» 묘지)에 안장되었으나, «러시아 ' +
    '땅의 가족 납골묘에 아내 곁으로»라는 유언은 75년 뒤에야 이행되었다 — 2005-07-26 ' +
    '상트페테르부르크 알렉산드르 넵스키 대수도원 니콜스코예 묘지의 가족 납골묘에 이장. ' +
    '유해가 화장된 유골함이었는지 관이었는지는 보도가 엇갈린다.',
  influence: 58,
  biography:
    '러시아 제국의 해군대장(адмирал)·마지막 해군장관(1911~1917). 쓰시마에서 궤멸한 함대를 ' +
    '다시 세운 재건의 설계자이자, 두마를 적대하지 않고 설득해 예산을 따낸 이례적 각료였다. ' +
    '2월 혁명 때 제정 각료 대부분이 구금된 가운데 그는 체포되지 않았고, 소비에트 러시아에 ' +
    '남아 해군 사료 편찬에 종사하다 1924년 프랑스로 떠나 망명지에서 그림을 팔아 연명했다. ' +
    '\n\n' +
    '성장과 임관(1853~1875). 폴타바현 귀족의 대물림 해군 가문에서 태어나 아버지의 임지 ' +
    '레발에서 자랐다 — 레발 제1김나지움 동급생 중에 훗날 순양함 바랴크의 초대 함장 베어와 ' +
    '아브로라 함장 예고리예프가 있었다. 1871년 해군학교(당시 해군유년학교의 명칭)에 들어가 ' +
    '1874년 졸업, 1875년 소위(미치만)로 임관해 발트함대에 배속되었다. ' +
    '\n\n' +
    '함상 근무와 유럽(1877~1898). 1877년 크론시타트 포술장교 과정을 마쳤고, 1878년 러시아-' +
    '튀르크 전쟁기의 «침브리아 원정»에 참가해 필라델피아에서 건조된 순양함 «자비야카»의 ' +
    '승조원이 되었다. 1883년 소형 항무선 «콜둔치크»를 시작으로 «리브카»·«페테르부르크»를 ' +
    '지휘했고, 1895년 2등순양함 «라즈보이니크» 함장을 거쳤다. 1896~1898년 런던 주재 해군 ' +
    '무관으로 근무하며 영국 해군을 관찰했다. ' +
    '\n\n' +
    '«체사레비치»와 뤼순(1899~1905). 1899-02-27 툴롱에서 건조 중이던 전함 «체사레비치»의 ' +
    '함장으로 임명되어 프랑스에서 건조를 감독했고, 1903년 완성함을 몰고 뤼순(포트아서)에 ' +
    '입항해 제1태평양함대 기함으로 만들었다. 1904-02-08~09 밤 일본 구축대의 기습 뇌격을 ' +
    '함장으로서 맞았다 — 51번째 생일(구력 01-26) 몇 시간 뒤의 일이었다. 침몰을 막은 공으로 ' +
    '성 블라디미르 3등훈장에 검을 더해 받았고, 1904-04-10 소장 진급과 함께 뤼순항 사령관에 ' +
    '임명되어 함락(1905-01-02)까지 농성 중인 함대의 수리·석탄·탄약 보급을 총괄했다. ' +
    '\n\n' +
    '흑해·리바바·크론시타트(1905~1909). 귀환 후 흑해함대 참모장을 지냈고, 1906-05-27 ' +
    '세바스토폴 열병식에서 테러범이 던진 폭탄에 뇌진탕을 입었다. 사령관 추흐닌이 암살된 뒤 ' +
    '한때 흑해함대를 대리 지휘했다. 1906년 말부터 알렉산드르 3세 리바바항 사령관으로 대형 ' +
    '수리 기지를 세우고 러시아 최초의 잠수항해 교육대를 창설했으며, 1908-10부터 넉 달간 ' +
    '크론시타트항 사령관 겸 군정장관 직무대행을 맡았다. ' +
    '\n\n' +
    '차관에서 장관으로(1909~1911). 1909-02-22 보예봅스키 해군장관의 차관으로 발탁되어 ' +
    '해군성의 두마 창구를 맡았다 — 두마가 해군성을 «쓰시마 관청»이라 조롱하며 예산을 ' +
    '틀어쥐던 시기였고, 본인도 «1909년은 무위로 지나갔다. 입법기관의 불신 때문에 아무 일도 ' +
    '할 수 없었다»고 적었다. 1911-04-01(구력 03-19) 보예봅스키의 후임 해군장관에 임명되며 ' +
    '해군성의 법안 제출권을 확보했고, 같은 해 10월 해군대장, 1912년 12월 시종무관장이 ' +
    '되었다. ' +
    '\n\n' +
    '함대 재건(1911~1914). 취임 직후 흑해함대 계획이 두마를 통과했고(1911-06-01), 발트함대 ' +
    '긴급증강계획은 각의(1912-03-02)와 두마(1912-06-19, 찬성 197 대 반대 89)를 거쳐 ' +
    '1912-07-06 법률로 확정되었다 — 이즈마일급 순양전함 4척·스베틀라나급 경순양함 4척· ' +
    '구축함 36척·잠수함 12척의 재원이었다. 1914-07-07에는 흑해 증강 추가계획(약 1억 1천만 ' +
    '루블)이 승인되었다. 재임 중 국고에서 5억 루블 이상을 끌어와 해군 예산을 1910~14년 ' +
    '2.3배로 키웠고, 강구트급 전함 4척(1914년 취역)과 임페라트리차 마리야급(1915~) 등 ' +
    '러시아 최초의 드레드노트들이 그의 계획에서 나왔다. 러시아 측 평가는 1941년 독소전 ' +
    '개전 당시 소련 함대의 전함 100%·순양함 40%·구축함 30%가 그가 착공시킨 배였다고 ' +
    '집계한다. ' +
    '\n\n' +
    '두마와의 관계. 그의 정치적 자산은 의회를 적으로 돌리지 않은 데 있었다. 카데트·10월당과 ' +
    '접촉을 유지했고 — 다만 국방위원장 구치코프는 끝내 우군이 아니었다 — 미국 측의 100만 ' +
    '루블 뇌물 제의를 거절하며 «러시아 배는 러시아 노동자의 손으로, 러시아 재료로, 러시아 ' +
    '땅에서» 지어야 한다고 못 박은 청렴이 신뢰의 근거였다. 1916년에는 부르주아 진영에서 ' +
    '총리 후보로 거론되기까지 했다. ' +
    '\n\n' +
    '전시의 한계(1914~1917). 개전과 동시에 작전 함대의 지휘권에서 배제되어 장관의 권한은 ' +
    '산업·보급·교육으로 좁혀졌고, 1916년 1월에야 스타프카 해군참모부를 통해 두 함대를 ' +
    '자기 계통에 넣을 수 있었다. 그 대신 페트로그라드 방어 체계와 핀란드만 기뢰-포대 진지를 ' +
    '직접 관장했다. 라스푸틴의 간섭을 받지 않은 몇 안 되는 장관이기도 했다. ' +
    '\n\n' +
    '2월 혁명과 그 후(1917~1924). 1917-03-14(구력 03-01) 사임 압박으로 자리에서 물러났고, ' +
    '03-13(구력) 구치코프 육해군장관의 명령으로 «건강 악화를 이유로 군복과 연금과 함께» ' +
    '예편했다. 사법 조사가 열렸으나 «전 장관은 깨끗했다»는 결론으로 아무 일 없이 끝났다 — ' +
    '수호믈리노프를 비롯한 제정 각료 대부분이 구금된 것과 대조적이다. 10월 혁명 후에도 ' +
    '러시아에 남아 1919년 봄 회고록을 탈고했고, 1919-06부터 페트로그라드 문서고 총국· ' +
    '해군문서고 선임 사료관과 해군사위원회에서 일하며 배급을 받았다. 난방 없는 문서고에서 ' +
    '일하다 두 차례 폐렴을 앓았고, 겨울에는 조선학자 크릴로프의 집에 얹혀 지냈으며, ' +
    '넵스키 대로 제과점 광고 그림까지 그려 팔았다. 1921-10 인원 감축으로 해직되었다. ' +
    '\n\n' +
    '망명과 최후(1924~1930). 1923년 말부터 치료를 명분으로 출국을 신청해 1924-04-14 ' +
    '페트로그라드 당국의 거부를 겪은 끝에 그해 가을 프랑스로 떠났고 돌아오지 않았다 — ' +
    '소련 여권을 지닌 채였다. 리비에라의 망통에서 하숙방을 얻어 바닷가에서 그린 해경화를 ' +
    '팔아 살았고, 레지옹 도뇌르 대십자 수훈자로서 받을 수 있던 프랑스 연금을 «원칙상» ' +
    '거절했다. 망명 사회의 정치 활동에는 일절 참여하지 않았고 1930-03-03 궁핍 속에 ' +
    '세상을 떠났다. ' +
    '\n\n' +
    '평가와 후세. 동시대인 야혼토프는 그를 «가장 좋은 의미의 바다 늑대»라 불렀고, 반대편의 ' +
    '레디게르조차 «자신만만하고 우쭐대는 데가 있으나 그의 밑에서 조선(造船)은 성공적으로 ' +
    '진행됐다»고 적었다. 회고록은 정치를 거의 건드리지 않은 채 문서고에 70년 넘게 묻혀 ' +
    '있다가 1993년에야 출간되었다. 유언은 2005년에 이행되어 유해가 상트페테르부르크의 ' +
    '가족 납골묘로 돌아왔고, 2010년 진수된 최신예 호위함에 «아드미랄 그리고로비치»라는 ' +
    '이름이 붙었다 — 이장이 먼저고 함명이 나중이다.',
}

// ── 재임 ────────────────────────────────────────────────────────────────────
interface TenureSpec {
  title: string
  positionType: GovernmentPositionType
  definitionTitle?: '해군장관'
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail?: string
  /** 취임 경위 — 인물 상세 재임 카드의 「경위」 항목 (tenure.ww1-appointment.enrich 규약) */
  appointmentDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    title: '전함 «체사레비치» 함장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1899, startMonth: 2, startDay: 27,
    endYear: 1904, endMonth: 4, endDay: 10,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '소장 진급과 함께 뤼순항 사령관으로 영전 (구력 1904-03-28).',
    appointmentDetail:
      '런던 주재 해군무관을 마친 1898년 말 프랑스에 파견되어 툴롱에서 건조 중이던 전함 ' +
      '«체사레비치»와 장갑순양함 «바얀»의 감독관을 맡았고, 1899-02-27(구력 02-15) 건조 중인 ' +
      '함의 함장으로 임명되었다. 유럽 조선소에서 배를 받아 끌고 오는 임무는 당시 해군에서 ' +
      '기술과 외국어를 겸비한 장교에게만 맡기던 자리였다.',
    notes:
      '구력 1899-02-15 임명. 툴롱에서 건조를 감독해 1903-05-15 승조, 1903-12-02 뤼순 입항으로 ' +
      '제1태평양함대 기함이 되었다. 1904-02-08~09 밤 일본 구축대의 기습 뇌격을 함장으로 맞아 ' +
      '침몰을 막았고(자신의 51번째 생일 몇 시간 뒤였다), 그 공으로 성 블라디미르 3등훈장에 ' +
      '검을 더해 받았다(구력 1904-03-22).',
  },
  {
    title: '뤼순항 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1904, startMonth: 4, startDay: 10,
    endYear: 1905, endMonth: 1, endDay: 3,
    endReason: TenureEndReason.WAR_DEFEAT,
    endReasonDetail:
      '요새 항복(1905-01-02, 구력 1904-12-20)으로 임무 종료 — 귀환 후 해군본부 참모부에 ' +
      '임시 배속.',
    appointmentDetail:
      '개전 초 «체사레비치»를 지켜낸 공으로 1904-04-10(구력 03-28) 소장으로 진급하면서 함께 ' +
      '뤼순항 사령관에 임명되었다. 임명은 마카로프 제독의 전사(구력 03-31) 사흘 전이라 ' +
      '«마카로프 사후의 발탁»이라는 영어권 서술은 시점이 맞지 않는다.',
    notes:
      '구력 1904-03-28 ~ 12-21. 농성 기간 내내 함대의 수리·석탄·탄약 보급을 총괄했고 요새 ' +
      '육상 전면의 보급도 담당했다. 뤼순 방어의 공으로 성 스타니슬라프 1등훈장에 검을 더해 ' +
      '받았다(구력 1904-11-22).',
  },
  {
    title: '흑해함대·흑해항만 참모장',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1905,
    endYear: 1907, endMonth: 1, endDay: 10,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '알렉산드르 3세 리바바항 사령관으로 전보 (구력 1906-12-28) — 부임 시점을 종료일로 ' +
      '삼는다. 시작일은 월일 사료가 없어 1905년(연 단위)으로 둔다.',
    appointmentDetail:
      '뤼순 함락 후 귀환해 해군본부 참모부에 임시 배속돼 있다가 흑해함대 사령관 추흐닌 제독 ' +
      '아래 참모장으로 부임했다. 영어 위키가 이 시기를 «흑해함대 사령관»으로 적은 것은 ' +
      '오류로, 그는 참모장이었다.',
    notes:
      '1906-05-27(구력 05-14) 세바스토폴 열병식에서 테러범이 던진 폭탄에 뇌진탕을 입었고, ' +
      '같은 해 6월 사령관 추흐닌이 암살된 뒤 한때 흑해함대를 대리 지휘했다. 월일 단위 사료가 ' +
      '없어 연 단위로 기록한다.',
  },
  {
    title: '알렉산드르 3세 리바바항 사령관',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1907, startMonth: 1, startDay: 10,
    endYear: 1908, endMonth: 10, endDay: 14,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '크론시타트항 사령관 겸 군정장관 직무대행으로 전보 (구력 1908-10-01).',
    appointmentDetail:
      '흑해에서의 참모장·대리 지휘 경험과 뤼순에서 입증된 항만 운영 능력을 인정받아 구력 ' +
      '1906-12-28 발트해의 신설 대형 군항인 알렉산드르 3세항(리바바) 사령관에 임명되었고, ' +
      '발트해 해양방어 책임도 함께 맡았다.',
    notes:
      '구력 1906-12-28 ~ 1908-10-01. 대형 함선 수리 기지를 구축하고 러시아 최초의 잠수항해 ' +
      '교육대를 편성했다. 이 공으로 성 안나 1등훈장을 받았다(구력 1908-04-13).',
  },
  {
    title: '크론시타트항 사령관 겸 군정장관 (직무대행)',
    positionType: GovernmentPositionType.MILITARY_COMMANDER,
    startYear: 1908, startMonth: 10, startDay: 14,
    endYear: 1909, endMonth: 2, endDay: 13,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '해군차관으로 영전 (구력 1909-01-31 이임, 02-09 차관 임명).',
    appointmentDetail:
      '리바바에서의 실적을 인정받아 구력 1908-10-01 제국 해군의 본거지 크론시타트의 항만 ' +
      '사령관 겸 시 군정장관 직무대행으로 옮겼다. 함대·항만 총사령관과 발트해 해양방어 ' +
      '책임까지 겸한 «직무대행» 발령이라 4개월 만에 차관으로 옮겨 가는 징검다리가 되었다.',
    notes: '구력 1908-10-01 ~ 1909-01-31. 정식 보임이 아닌 직무대행(временно и. д.)이었다.',
  },
  {
    title: '해군차관',
    positionType: GovernmentPositionType.VICE_MINISTER,
    startYear: 1909, startMonth: 2, startDay: 22,
    endYear: 1911, endMonth: 4, endDay: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail: '해군장관으로 승진 (구력 1911-03-19) — 전임 보예봅스키 이임 이튿날.',
    appointmentDetail:
      '크론시타트항 사령관 직무대행이던 1909-02-22(구력 02-09), 해군장관 보예봅스키의 ' +
      '전보로 차관 임명 소식을 받았다 — «폐하께서 귀하를 해군장관의 차관으로 임명하시었소. ' +
      '진심으로 축하하오». 뤼순·리바바·크론시타트로 이어진 항만 운영 실적이 발탁의 근거였다.',
    notes:
      '구력 1909-02-09 ~ 1911-03-19. 해군성의 두마 창구 역할을 맡아 입법기관과의 관계를 ' +
      '쌓기 시작한 자리다 — 당시 두마는 해군성을 «쓰시마 관청»이라 부르며 예산을 틀어쥐고 ' +
      '있었고, 본인도 «1909년은 무위로 지나갔다»고 적었다. 재임 중 중장 진급(구력 ' +
      '1909-03-29), 해군본부회의 위원.',
  },
  {
    title: '해군장관',
    positionType: GovernmentPositionType.CABINET_MINISTER,
    definitionTitle: '해군장관',
    startYear: 1911, startMonth: 4, startDay: 1,
    endYear: 1917, endMonth: 3, endDay: 14,
    endReason: TenureEndReason.OVERTHROWN,
    endReasonDetail:
      '2월 혁명으로 사임 압박을 받아 1917-03-14(구력 03-01) 퇴임 — 구력 03-31 구치코프 ' +
      '육해군장관의 명령으로 «건강 악화를 이유로 군복과 연금과 함께» 예편했다. 사법 조사가 ' +
      '열렸으나 혐의 없음으로 종결되어, 제정 각료 대부분과 달리 체포되지 않았다.',
    appointmentDetail:
      '차관으로 2년간 두마를 상대하며 신임을 쌓은 끝에, 전임 보예봅스키가 물러난 이튿날인 ' +
      '1911-04-01(구력 03-19) 해군장관에 임명되었다. 본인이 이 인사에서 가장 중히 여긴 것은 ' +
      '해군성이 확보한 법안 제출권으로, 조선 예산안을 중개자 없이 직접 두마에 올릴 수 있게 ' +
      '된 점이었다. 같은 해 11월 니콜라이 2세는 «귀하에게 맡긴 함대 재건의 과업을 굳건히 ' +
      '이어가라»는 전보로 그를 공개 지지했다.',
    notes:
      '구력 1911-03-19 임명, 제국 마지막 해군장관. 흑해함대 계획 두마 통과(1911-06-01)를 ' +
      '시작으로 발트함대 긴급증강계획을 각의(1912-03-02)와 두마(1912-06-19, 197 대 89)를 ' +
      '거쳐 1912-07-06 법률로 확정시켰고, 1914-07-07 흑해 추가계획(약 1억 1천만 루블)까지 ' +
      '얻어냈다. 재임 중 국고 5억 루블 이상을 끌어와 해군 예산을 2.3배로 키웠다. 미국 측의 ' +
      '100만 루블 뇌물 제의를 거절하고 국내 건조를 고집한 청렴으로 유명했다. 다만 개전과 ' +
      '동시에 작전 함대 지휘에서 배제되어 1916년 1월에야 스타프카 해군참모부를 통해 두 ' +
      '함대를 계통에 넣었고, 그 대신 페트로그라드 방어와 핀란드만 기뢰-포대 진지를 직접 ' +
      '관장했다. 1911~17년 해군본부회의 의장, 1913년부터 국가평의회 의원. 퇴임일은 사료가 ' +
      '구력 02-28(장관 명단)·03-01(전기)로 갈리는데 후자를 채택했다.',
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
    title: '상트페테르부르크 출생',
    category: 'FAMILY',
    startYear: 1853, startMonth: 2, startDay: 7,
    description:
      '구력 01-26. 폴타바현 귀족의 대물림 해군 가문 — 아버지는 1등대령(후일 소장) 콘스탄틴 ' +
      '이바노비치, 어머니는 폰 데어 호벤 남작가의 마리야 예고로브나. 유년기는 아버지 임지 ' +
      '레발(현 탈린)에서 보냈다.',
  },
  {
    title: '해군학교 졸업',
    category: 'EDUCATION',
    startYear: 1874, startMonth: 3,
    description:
      '1871년 입학(해군유년학교가 1867~91년에 쓰던 «해군학교» 명칭) — 졸업과 함께 사관후보생 ' +
      '(가르데마린), 이듬해 실습 항해를 마치고 소위(미치만)로 임관해 발트함대 배속.',
  },
  {
    title: '크론시타트 포술장교 과정 수료',
    category: 'EDUCATION',
    startYear: 1877,
    description: '이듬해 포술장교 자격 취득.',
  },
  {
    title: '«침브리아 원정» 참가',
    category: 'MILITARY',
    startYear: 1878,
    description:
      '러시아-튀르크 전쟁 중 영국의 시선을 발칸에서 돌리기 위한 통상파괴 시위 작전 — ' +
      '필라델피아 크램프 조선소에서 인수한 순양함 «자비야카» 승조원으로 미국에 파견되었다.',
  },
  {
    title: '첫 지휘 — 항무선 «콜둔치크»',
    category: 'MILITARY',
    startYear: 1883,
    description:
      '배수량 53톤의 소형 항무선이 첫 «함장» 보직이었다 — 이후 «리브카»(1884~86)· ' +
      '«페테르부르크»(1890)로 이어진다. 영어권에 도는 «크라스나야 고르카 수송선 지휘»는 ' +
      '어느 사료에도 없다.',
  },
  {
    title: '2등순양함 «라즈보이니크» 함장',
    category: 'MILITARY',
    startYear: 1895,
    description:
      '2등대령으로 극동 순항 — 1895년 봄~여름 지푸(즈푸)에서 촬영된 기록이 남아 있다. ' +
      '이어 해방함 «브로네노세츠»(1895~96)·기뢰순양함 «보예보다»(1896)를 지휘했다.',
  },
  {
    title: '런던 주재 해군무관',
    category: 'DIPLOMATIC',
    startYear: 1896, endYear: 1898,
    description:
      '영국 해군을 가까이서 관찰한 시기 — 일부 사료는 프랑스 무관 겸임도 기록한다. 재임 중 ' +
      '1등대령 진급(구력 1897-04-13).',
  },
  {
    title: '뤼순 기습 뇌격 — 함을 지키다',
    category: 'MILITARY',
    startYear: 1904, startMonth: 2, startDay: 8,
    description:
      '구력 01-26~27 밤, 일본 구축대 10척이 어뢰 16발을 쏜 개전 기습에서 «체사레비치» ' +
      '함장으로 침몰을 막았다 — 자신의 51번째 생일 몇 시간 뒤였다. 공으로 성 블라디미르 ' +
      '3등훈장에 검을 더해 받았다(구력 03-22).',
  },
  {
    title: '소장 진급 — 뤼순항 사령관',
    category: 'MILITARY',
    startYear: 1904, startMonth: 4, startDay: 10,
    description:
      '구력 03-28, «적과의 교전에서의 공훈»으로 진급하며 항만 사령관 겸임 — 마카로프 제독 ' +
      '전사(구력 03-31) 사흘 전이다.',
  },
  {
    title: '뤼순 함락',
    category: 'MILITARY',
    startYear: 1905, startMonth: 1, startDay: 2,
    description:
      '구력 1904-12-20 요새 항복 — 농성 내내 함대 수리·석탄·탄약 보급을 총괄한 임무가 ' +
      '끝났다. 방어 공로로 성 스타니슬라프 1등훈장에 검을 더해 받았다(구력 1904-11-22).',
  },
  {
    title: '세바스토폴 폭탄 테러로 부상',
    category: 'HEALTH',
    startYear: 1906, startMonth: 5, startDay: 27,
    description:
      '구력 05-14 열병식에서 테러범이 던진 폭탄에 뇌진탕 — 이듬달 사령관 추흐닌이 암살된 ' +
      '뒤에는 한때 흑해함대를 대리 지휘했다.',
  },
  {
    title: '러시아 최초 잠수항해 교육대 창설',
    category: 'MILITARY',
    startYear: 1907,
    description: '리바바항 사령관으로서 대형 수리 기지 구축과 함께 편성했다.',
  },
  {
    title: '해군차관 취임',
    category: 'POLITICAL',
    startYear: 1909, startMonth: 2, startDay: 22,
    description:
      '구력 02-09, 보예봅스키 장관의 차관 — 해군성의 두마 창구를 맡았다. 재임 중 중장 진급 ' +
      '(구력 03-29).',
  },
  {
    title: '해군장관 취임',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 4, startDay: 1,
    description:
      '구력 03-19, 보예봅스키 후임 — 해군성의 법안 제출권을 확보해 조선 예산을 직접 두마에 ' +
      '올릴 수 있게 된 것을 스스로 가장 큰 성과로 꼽았다.',
  },
  {
    title: '흑해함대 계획 두마 통과',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 6, startDay: 1,
    description:
      '구력 05-19 — 취임 두 달 만의 첫 입법 성과. 전함 3·순양함 2·구축함 9·잠수함 6척, ' +
      '1억 5,100만 루블.',
  },
  {
    title: '해군대장 진급',
    category: 'AWARD',
    startYear: 1911, startMonth: 10, startDay: 10,
    description:
      '구력 09-27 리바디아에서 발한 해군성 명령 제1064호 — 장관 임명과 «동시»라는 서술이 ' +
      '있으나 실제로는 반년 뒤다.',
  },
  {
    title: '니콜라이 2세의 공개 지지 전보',
    category: 'POLITICAL',
    startYear: 1911, startMonth: 11, startDay: 14,
    description:
      '구력 11-01 «귀하에게 맡긴 함대 재건의 과업을 굳건히, 흔들림 없이 이어가라» — 구력 ' +
      '11-04 명령으로 공표되었다.',
  },
  {
    title: '발트함대 긴급증강계획 두마 통과',
    category: 'POLITICAL',
    startYear: 1912, startMonth: 6, startDay: 19,
    description:
      '구력 06-06, 찬성 197 대 반대 89 — 구력 06-23(신력 07-06) 법률로 확정. 이즈마일급 ' +
      '순양전함 4·스베틀라나급 경순양함 4·구축함 36·잠수함 12척의 재원이 되었다.',
  },
  {
    title: '시종무관장(генерал-адъютант) 서임',
    category: 'AWARD',
    startYear: 1912, startMonth: 12, startDay: 19,
    description: '구력 12-06(성 니콜라이 축일 서훈일) — 이후 «해군대장 계급의 시종무관장».',
  },
  {
    title: '아내 마리야와 사별 — 가족 납골묘 조성',
    category: 'FAMILY',
    startYear: 1913,
    description:
      '1884년 결혼한 마리야 니콜라예브나(슈먀키나)와 사별하고 니콜스코예 묘지에 가족 ' +
      '납골묘를 지었다 — 92년 뒤 자신이 그 옆에 눕게 된다. 두 딸(마리야 1885~1963· ' +
      '나탈리야 1901~1964)을 두었다.',
  },
  {
    title: '국가평의회 의원 임명',
    category: 'POLITICAL',
    startYear: 1913,
    description: '황제 임명직 — 월일은 사료 미확인.',
  },
  {
    title: '흑해 추가 증강계획 승인',
    category: 'POLITICAL',
    startYear: 1914, startMonth: 7, startDay: 7,
    description:
      '구력 06-24 두마 통과·황제 재가 — 전함 1·경순양함 2·구축함 8·잠수함 6척, 약 1억 ' +
      '1천만 루블. 제국의 마지막 해군 계획이 되었다.',
  },
  {
    title: '개전 — 작전 함대 지휘권에서 배제',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8,
    description:
      '전시 체제에서 함대 작전은 최고사령부로 넘어가 장관의 권한은 산업·보급·교육으로 ' +
      '좁혀졌다. 대신 페트로그라드 방어 체계와 핀란드만 기뢰-포대 진지를 직접 관장했다.',
  },
  {
    title: '스타프카 해군참모부 설치 — 함대 계통 회복',
    category: 'MILITARY',
    startYear: 1916, startMonth: 1,
    description: '어렵사리 발트·흑해 두 함대를 자신의 계통에 넣는 데 성공했다.',
  },
  {
    title: '2월 혁명 — 해군장관 퇴임',
    category: 'POLITICAL',
    startYear: 1917, startMonth: 3, startDay: 14,
    description:
      '구력 03-01 사임 압박으로 퇴임(장관 명단은 구력 02-28로 적기도 한다) — 구력 03-31 ' +
      '구치코프의 명령으로 «건강 악화를 이유로 군복과 연금과 함께» 예편. 사법 조사가 열렸 ' +
      '으나 «전 장관은 깨끗했다»로 종결되어, 제정 각료 중 드물게 체포를 면했다.',
  },
  {
    title: '회고록 탈고',
    category: 'PUBLICATION',
    startYear: 1919, startMonth: 4,
    description:
      '«전 해군장관의 회고» — 정치를 거의 건드리지 않고 2월 혁명 직전까지만 서술했다. ' +
      '원고는 해군문서고(РГАВМФ 개인 폰드 701)에 70년 넘게 잠들어 있다가 1993년에야 ' +
      '출간되었다.',
  },
  {
    title: '소비에트 문서고 근무',
    category: 'CAREER',
    startYear: 1919, startMonth: 6,
    endYear: 1921, endMonth: 10,
    description:
      '페트로그라드 문서고 총국 군사학술출판부(1919-06~) → 해군문서고 선임 사료관 ' +
      '(1920-01~) + 해군사위원회 — 배급을 받는 대가였다. 난방 없는 문서고에서 일하다 두 ' +
      '차례 폐렴을 앓았고, 땔감이 없어 조선학자 크릴로프의 집에 얹혀 겨울을 났다. 1921-10 ' +
      '인원 감축으로 해직.',
  },
  {
    title: '넵스키 대로에서 그림을 팔다',
    category: 'PERSONAL',
    startYear: 1921,
    description:
      '네바 강변에서 소품을 그렸으나 기근 속에 사는 이가 없어 제과점 진열창·상자 광고 ' +
      '그림까지 그렸다. 제독 단추를 실로 덮어 옛 계급을 숨겼고, 굶주림과 추위로 길에서 ' +
      '쓰러진 일도 있었다고 전한다.',
  },
  {
    title: '출국 신청 거부',
    category: 'POLITICAL',
    startYear: 1924, startMonth: 4, startDay: 14,
    description: '페트로그라드 당국이 치료 목적 출국을 불허 — 그해 가을 결국 허가를 받아냈다.',
  },
  {
    title: '프랑스로 출국',
    category: 'EXILE',
    startYear: 1924, startMonth: 9,
    description:
      '치료를 명분으로 소련 여권을 지닌 채 떠나 돌아오지 않았다 — 형식은 망명이 아닌 요양 ' +
      '출국이었다. 리비에라의 망통에서 하숙방을 얻어 바닷가에서 그린 해경화를 팔아 살았고, ' +
      '레지옹 도뇌르 대십자 수훈자로 받을 수 있던 프랑스 연금을 원칙상 거절했다.',
  },
  {
    title: '망통에서 사망',
    category: 'PERSONAL',
    startYear: 1930, startMonth: 3, startDay: 3,
    description:
      '향년 77세, 궁핍 속에서. 망통의 러시아인 묘지에 안장되었고, 묘비에는 «언제나 사랑스 ' +
      '럽고 언제나 소중한 러시아여, 그대를 그토록 생각한 이를 이따금 기억해다오»라 새겨졌다.',
  },
  {
    title: '유해 귀환 — 가족 납골묘 이장',
    category: 'OTHER',
    startYear: 2005, startMonth: 7, startDay: 26,
    description:
      '흑해함대 순양함 «모스크바»가 07-05 세바스토폴을 떠나 망통에서 유해를 싣고 07-24 ' +
      '노보로시스크에 입항(예포 19발), 07-26 상트페테르부르크에서 운구 행렬이 그가 일한 ' +
      '해군본부를 지나 알렉산드르 넵스키 대수도원 니콜스코예 묘지의 가족 납골묘에 안장 — ' +
      '아내 곁에 묻히고 싶다는 75년 전의 유언이 이행되었다. 2010년 진수된 호위함에 ' +
      '«아드미랄 그리고로비치»라는 이름이 붙은 것은 그 뒤의 일이다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const GRIGOROVICH_STATS = {
  politics: 66,
  military: 62,
  diplomacy: 42,
  intellect: 64,
  charisma: 60,
  administration: 85,
  notes:
    '항만·조선·예산을 굴리는 조직 운영이 최대 강점(행정) — 뤼순 농성의 보급, 리바바의 수리 ' +
    '기지, 그리고 5억 루블 이상을 끌어와 해군 예산을 2.3배로 키운 재건 실적이 한 줄기로 ' +
    '이어진다. 같은 시기 수호믈리노프가 두마를 6년간 외면하다 무너진 것과 달리, 그는 ' +
    '«쓰시마 관청»이라 조롱받던 부처를 설득의 대상으로 삼아 계획마다 표결을 통과시켰다 ' +
    '(정치) — 100만 루블 뇌물을 거절한 청렴이 그 신뢰의 근거였고, 2월 혁명 후 체포되지 ' +
    '않은 이유이기도 하다. 함장·항만 사령관으로서의 군사 역량은 확실하나 함대를 지휘한 ' +
    '야전 제독은 아니었고, 개전 후에는 작전 지휘에서 배제되었다. 외교는 런던 무관 경력에 ' +
    '한정.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedGrigorovich(prisma: PrismaService): Promise<void> {
  console.log('\n⚓ 이반 그리고로비치(Ivan Grigorovich) 시딩 시작 (기존 데이터 보존 모드)...')

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

  const thirdRepublic = await prisma.historicalCountry.findFirst({
    where: { name: '프랑스 제3공화국' },
    select: { id: true },
  })

  const navyMinisterDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '해군장관' },
    select: { id: true },
  })

  // ── 1) 인물 등록 ───────────────────────────────────────────────────────────
  let person = await prisma.person.findFirst({
    where: {
      OR: [
        { originalName: { contains: 'Ivan Konstantinovich Grigorovich' } },
        { AND: [{ name: '이반' }, { middleName: '콘스탄티노비치' }, { surname: '그리고로비치' }] },
      ],
    },
  })
  if (person) {
    const patch: Record<string, unknown> = {}
    if (!person.originalName) patch.originalName = GRIGOROVICH.originalName
    if (!person.biography) patch.biography = GRIGOROVICH.biography
    if (!person.birthPlaceText) patch.birthPlaceText = GRIGOROVICH.birthPlaceText
    if (!person.birthNote) patch.birthNote = GRIGOROVICH.birthNote
    if (!person.deathPlaceText) patch.deathPlaceText = GRIGOROVICH.deathPlaceText
    if (!person.deathType) patch.deathType = GRIGOROVICH.deathType
    if (!person.deathCause) patch.deathCause = GRIGOROVICH.deathCause
    if (!person.deathNote) patch.deathNote = GRIGOROVICH.deathNote
    if (person.influence == null) patch.influence = GRIGOROVICH.influence
    if (!person.historicalCountryId) patch.historicalCountryId = russianEmpire.id
    if (Object.keys(patch).length > 0) {
      person = await prisma.person.update({ where: { id: person.id }, data: patch })
      console.log(`  🔧 보강: ${GRIGOROVICH.originalName} (${Object.keys(patch).join(', ')})`)
    } else {
      console.log(`  ⏭️  인물 이미 존재: ${GRIGOROVICH.originalName}`)
    }
  } else {
    person = await prisma.person.create({
      data: {
        name: GRIGOROVICH.name,
        middleName: GRIGOROVICH.middleName,
        surname: GRIGOROVICH.surname,
        originalName: GRIGOROVICH.originalName,
        biography: GRIGOROVICH.biography,
        birthDate: toDate(GRIGOROVICH.birthYear, GRIGOROVICH.birthMonth, GRIGOROVICH.birthDay),
        birthEra: 'AD' as any,
        birthDatePrecision: 'day',
        birthNote: GRIGOROVICH.birthNote,
        deathDate: toDate(GRIGOROVICH.deathYear, GRIGOROVICH.deathMonth, GRIGOROVICH.deathDay),
        deathEra: 'AD' as any,
        deathDatePrecision: 'day',
        deathType: GRIGOROVICH.deathType,
        deathCause: GRIGOROVICH.deathCause,
        deathNote: GRIGOROVICH.deathNote,
        gender: GRIGOROVICH.gender,
        nameDisplayOrder: 'western' as any,
        influence: GRIGOROVICH.influence,
        birthPlaceText: GRIGOROVICH.birthPlaceText,
        deathPlaceText: GRIGOROVICH.deathPlaceText,
        historicalCountryId: russianEmpire.id,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${GRIGOROVICH.originalName} (id=${person.id})`)
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
          t.definitionTitle === '해군장관' ? (navyMinisterDef?.id ?? undefined) : undefined,
        positionType: t.positionType,
        title: t.title,
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
      label: '러시아 제국 (출생·복무 1853~1917)',
      priority: 0,
    },
  ]
  if (thirdRepublic) {
    affiliations.push({
      historicalCountryId: thirdRepublic.id,
      type: 'EXILE',
      label: '프랑스 제3공화국 (1924 출국 — 망통, 1930 사망)',
      priority: 1,
      note: '치료를 명분으로 출국이 허가된 사실상의 망명 — 리비에라 망통에서 수채화를 팔아 연명하다 사망.',
    })
  } else {
    console.warn('  ⚠️  프랑스 제3공화국 HC 미존재 — 망명지(EXILE) 소속 연결을 건너뛴다.')
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
        politics: GRIGOROVICH_STATS.politics,
        military: GRIGOROVICH_STATS.military,
        diplomacy: GRIGOROVICH_STATS.diplomacy,
        intellect: GRIGOROVICH_STATS.intellect,
        charisma: GRIGOROVICH_STATS.charisma,
        administration: GRIGOROVICH_STATS.administration,
        notes: GRIGOROVICH_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${GRIGOROVICH_STATS.politics}·군사 ${GRIGOROVICH_STATS.military}·` +
        `외교 ${GRIGOROVICH_STATS.diplomacy}·학식 ${GRIGOROVICH_STATS.intellect}·` +
        `카리스마 ${GRIGOROVICH_STATS.charisma}·행정 ${GRIGOROVICH_STATS.administration}`,
    )
  }

  console.log('✅ 이반 그리고로비치 시딩 완료\n')
}
