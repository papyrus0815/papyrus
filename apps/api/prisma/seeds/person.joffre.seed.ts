/**
 * 조제프 조프르 (Joseph Jacques Césaire Joffre, 1852~1931) 인물 보강 시드
 *
 * ⚠️ 기존 행 보강 모드 — UI로 최소 등록돼 있던 행(이름·생몰·사진·별칭 '파파 조프르'·소속국가만
 *    있고 전기·재임·연보·능력치가 전부 0건)을 채운다. 이미 값이 있는 필드는 덮어쓰지 않는다.
 *    (사조노프 5호 선례)
 *
 * ⚠️ 예외 — nameDisplayOrder 교정: 프랑스 인물인데 'korean'(성+이름)으로 등록돼 "조프르 조제프"로
 *    뒤집혀 표시되고 있었다. 누락이 아니라 오등록이므로 'western'으로 바로잡고 로그로 알린다.
 *    같은 문제가 클레망소·푸앵카레에도 있으나 그 행들은 이 시드의 범위가 아니다.
 *
 * 제1차 세계대전 개전기 프랑스군 총사령관. 공병 출신으로 통킹·수단·마다가스카르의 축성과
 * 철도 건설로 «물류 전문가» 평판을 얻어 1911년 참모총장에 발탁됐고, 1914년 Plan XVII의
 * 참패 뒤에도 무너지지 않고 철도로 병력을 좌익에 재배치해 마른에서 반격에 성공했다.
 * 1915~16년 소모전 공세의 실패로 1916년 12월 실권을 잃고 «명예로운 해임»으로 제3공화국
 * 최초의 원수(Maréchal de France)에 서임되었다.
 *
 * 날짜 규약: 프랑스 사료라 전부 그레고리력(구력 환산 없음). 연·월 단위까지만 확인된 보직은
 * startDatePrecision으로 정밀도를 명시한다(팔레올로그 선례).
 *
 * 조사에서 교정한 통설: ① 에콜 폴리테크니크 입학은 1869년(영어 위키의 1870년은 오류)
 * ② 팀북투는 그가 «점령»한 것이 아니라 부아토·보니에가 이미 점령한 곳의 포위를 풀고 요새로
 * 공고화한 것이며, 보니에는 대령이 아니라 중령 ③ 원수 서임일은 관보 기준 1916-12-26
 * (아카데미 프랑세즈 약력의 12-25는 이설) ④ 아카데미 프랑세즈 선출은 1918-02-14(영어 위키의
 * 1919년은 오류) ⑤ 일본 방문은 1917년이 아니라 1921~22년 극동 사절단의 일부
 * ⑥ Plan XVII은 포슈가 아니라 조프르 참모부의 작품.
 *
 * 의존: seedFranceHistoricalCountries('프랑스 제3공화국' HC).
 *
 * 보강 항목:
 *  - Person 필드 보강(전기·출생지·사망지·영향력 등) + nameDisplayOrder 교정
 *  - GovernmentPositionTenure x15 (MILITARY_COMMANDER — 식민지 원정부터 최고전쟁회의까지,
 *    appointmentDetail 포함)
 *  - PersonLifeEvent x16 / PersonStats x1
 */
import {
  AppointmentMethod,
  GovernmentPositionType,
  TenureEndReason,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

// ── 인물 보강 명세 ───────────────────────────────────────────────────────────
const JOFFRE = {
  originalNameKey: 'Joffre',
  birthPlaceText: '프랑스 피레네조리앙탈 리베사르트(Rivesaltes)',
  birthNote:
    '통 제조업자 질 조프르와 카트린 플라스 사이의 11남매 중 장남으로, 모어는 카탈루냐어였다. ' +
    '가업은 랑그도크-루시용 포도주 호황을 타고 통 제조에서 포도밭 소유·양조로 확장돼, 사료에 ' +
    '따라 부친이 «통 제조업자»(출생증서)로도 «부유한 포도 재배업자»(아카데미 프랑세즈)로도 ' +
    '적힌다.',
  deathPlaceText: '프랑스 파리 7구',
  deathNote:
    '1930년 12월 19일 극심한 다리 통증으로 입원해 오른쪽 다리를 절단했으나 며칠 뒤 혼수에 ' +
    '빠져 1931-01-03 사망했다. 1931-01-07 국장(funérailles nationales)이 거행되었고 유해는 ' +
    '에콜 밀리테르 예배당에 안치·공개된 뒤, 앵발리드가 아니라 본인 유언대로 이블린 주 ' +
    '루브시엔의 사유지 «라 샤테녜레»에 마련한 사설 영묘로 옮겨졌다(최종 이장은 1933년).',
  influence: 72,
  biography:
    '프랑스 제3공화국의 원수·군인. 제1차 세계대전 개전기 프랑스군 총사령관으로 마른 전투를 ' +
    '승리로 이끌어 «마른의 승자»이자 «파파 조프르»로 불렸고, 1916년 소모전의 책임을 지고 ' +
    '물러나면서 제3공화국 최초의 원수가 되었다. ' +
    '\n\n' +
    '성장과 교육(1852~1871). 피레네조리앙탈 리베사르트에서 통 제조업자의 11남매 중 장남으로 ' +
    '태어났고 모어는 카탈루냐어였다. 1869년 7월 에콜 폴리테크니크에 132명 중 14등, 만 17세 ' +
    '동기 최연소로 입학했으나 보불전쟁으로 학업이 끊겨 소위로 파리 방어에 투입돼 라 빌레트 ' +
    '인근 보루를 지휘했다. 1871년 복학해 그해 10월 학업을 마치고 포병이 아닌 공병을 택했다. ' +
    '\n\n' +
    '식민지의 공병(1885~1903). 청불전쟁 국면에 포르모사·통킹으로 파견돼 지룽 기지를 ' +
    '요새화하고 방어 거점망을 조직했다(1885~1888). 1892년부터는 프랑스령 수단에서 카이~ ' +
    '바마코 철도 건설을 감독하다가, 1894년 타쿠바오에서 보니에 중령의 종대가 전멸하자 육로 ' +
    '종대를 이끌고 팀북투에 들어가 요새를 세워 포위를 풀었다 — 흔히 «팀북투 점령자»로 ' +
    '소개되지만 점령 자체는 앞서 이뤄졌고 그는 이를 공고화한 것이다. 1900~1903년에는 ' +
    '마다가스카르에서 갈리에니 총독 아래 디에고수아레즈 군항을 요새화했다. ' +
    '\n\n' +
    '본국 승진과 참모총장 발탁(1903~1911). 귀국 후 기병여단장·육군부 공병국장·사단장· ' +
    '군사학교 감찰관·군단장을 거쳐 1910년 후방근무국장 겸 최고전쟁회의 위원이 되었다. ' +
    '1911년 7월 최고전쟁회의가 미셸 장군의 예비군 이중편성·벨기에 방어 구상을 만장일치로 ' +
    '부결하고 메시미 육군장관이 그를 경질하자, 통합된 참모총장 겸 최고전쟁회의 부의장 ' +
    '자리가 갈리에니에게 먼저 제안되었다. 갈리에니는 정년과 본국 경험 부족을 이유로 고사하며 ' +
    '조프르와 폴 포를 천거했고, 가톨릭·반공화파 성향에 인사권까지 요구한 포가 배제되면서 ' +
    '1911-07-28 59세의 조프르가 임명되었다. 발탁의 실질 근거는 철도·동원 물류 전문성이었다. ' +
    '\n\n' +
    'Plan XVII(1913). 그의 참모부가 만든 이 계획은 전역 계획이 아니라 어느 부대를 어느 ' +
    '철도로 어디에 모을지를 정한 집중·배치 계획이었다. 예비사단을 2선으로 돌리고 로렌과 ' +
    '아르덴 두 방향의 공세를 상정했으나, 독일군 우익의 벨기에 대우회 규모를 과소평가해 좌익이 ' +
    '얇았고 중포를 경시했다(1914년 프랑스 중포 280문 대 독일 848문). ' +
    '\n\n' +
    '개전과 마른(1914). 8월 국경 전투에서 계획이 무너져 한 달 만에 10만 명 넘는 손실을 ' +
    '냈다. 그는 대후퇴 중 무능한 지휘관을 대거 경질했고 — 좌천지 리모주에서 유래한 ' +
    '«limogeage»라는 말이 여기서 나왔다 — 모누리의 제6군과 포슈의 제9군을 급조해 좌익을 ' +
    '두텁게 했다. 9월 3일 갈리에니가 클루크 제1군의 측면 노출을 포착해 제6군 투입을 ' +
    '요구하자 하루 숙고 끝에 승인했고, 9월 5일 «더 이상 뒤를 돌아볼 때가 아니다»라는 훈령을 ' +
    '내린 뒤 이튿날 새벽 전면 반격을 명령했다. 마른의 공적을 두고 갈리에니 측과 오랜 논쟁이 ' +
    '있었으나, 현재 학계는 국지적 기회 포착은 갈리에니, 5개 군 규모 기동의 설계와 결단은 ' +
    '조프르의 것으로 정리한다. ' +
    '\n\n' +
    '소모전과 실각(1915~1916). 1915년 아르투아·샹파뉴 공세는 모두 실패했고, 1915년 12월 ' +
    '지휘권이 프랑스 전군으로 확대된 뒤 맞은 1916년의 베르됭 방어와 솜 공세도 사상자에 비해 ' +
    '성과가 빈약했다. «나는 독일군을 갉아먹고 있다»는 소모전 논리와 베르됭 요새 무장 해제 ' +
    '책임이 의회의 표적이 되었고, 1916년 12월 7일 비밀위원회가 브리앙 내각 신임의 조건으로 ' +
    '그의 실권 박탈을 걸었다. 12월 13일 «정부 군사고문»이라는 실권 없는 직함으로 형식상 ' +
    '승진했고 실전 지휘는 니벨에게 넘어갔다. 그는 신문을 보고 «내게 약속한 것은 이게 ' +
    '아니다»라고 했고, 12월 26일 스스로 해임을 청하면서 같은 날 원수로 서임되었다. ' +
    '\n\n' +
    '원수 이후(1917~1931). 1917년 4월 조프르-비비아니 사절단의 군사대표로 미국에 건너가 ' +
    '상·하원 연설과 윌슨·퍼싱 면담으로 미군의 조기 파병을 이끌어냈고, 이어 프랑스 주둔 미군 ' +
    '총감으로 참호전 교육을 감독했다. 1918-02-14 아카데미 프랑세즈 35번 의석에 만장일치로 ' +
    '선출되었고, 입회식에는 초록 예복 대신 장군 정복을 입고 나타났다. 1919년 승전 퍼레이드를 ' +
    '포슈와 함께 선두에서 이끌었으며 1921~22년에는 인도차이나·시암·일본·조선·중국을 도는 ' +
    '4개월여 극동 사절단을 수행했다. 회고록은 유언에 따라 사후에 출간되었다. ' +
    '\n\n' +
    '평가. «전략가로서는 실패했으나 위기관리자·조직가로서는 성공했다»가 현재의 균형점이다. ' +
    '잘못된 전략 가정으로 개전 첫 달에 감당할 수 없는 사상자를 냈고 소모전 공세를 고집했으나, ' +
    '계획이 무너진 뒤에도 공황에 빠지지 않고 철도로 전략을 구제했으며 포슈·페탱·프랑셰 ' +
    '데스프레 같은 인재를 끌어올린 인사 결단도 공로로 꼽힌다. 본인의 것으로 전해지는 «누가 ' +
    '마른을 이겼는지는 몰라도, 졌다면 누구 책임이었을지는 안다»는 말이 그 평가를 압축한다.',
}

// ── 재임 (전부 프랑스 제3공화국 · MILITARY_COMMANDER) ────────────────────────
interface TenureSpec {
  title: string
  startYear: number; startMonth?: number; startDay?: number
  endYear: number; endMonth?: number; endDay?: number
  endReason: TenureEndReason
  endReasonDetail: string
  notes: string
  appointmentDetail: string
}

const TENURES: TenureSpec[] = [
  {
    title: '포르모사·통킹 원정 공병 책임 장교',
    startYear: 1885, startMonth: 1,
    endYear: 1888, endMonth: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1888년 1월 임기 만료로 귀국했다.',
    notes:
      '쿠르베 제독 휘하에서 지룽(기륭) 기지를 요새화했고, 1885년 7월 통킹으로 옮겨 방어 거점망을 조직·구축했다. ' +
      '1887년 1월 바딘(Ba Dinh) 공방전 관련 공로로 첫 표창을 받았고, 귀국길에 중국·일본·미국을 순방했다. ' +
      '1889년 소령(chef de bataillon)으로 진급.',
    appointmentDetail:
      '청불전쟁 국면에서 축성 전문 공병 장교로 차출되어 1885년 1월 마르세유를 출항, 6주 항해 끝에 포르모사에 도착했다. ' +
      '본국 요새 건설(몽리뇽 요새, 쥐라·몽루이·빌프랑슈 축성)에서 쌓은 실무 능력이 발탁 근거였다.',
  },
  {
    title: '프랑스령 수단 철도 감독·팀북투 종대 지휘관',
    startYear: 1892, startMonth: 10,
    endYear: 1895,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '본국으로 소환되어 참모본부 공병부·군사발명위원회 서기로 보임되었다.',
    notes:
      '카이~바마코 철도 건설을 감독했고, 1894년 2월 12일 팀북투에 도착해 남북 두 곳에 요새를 세워 투아레그의 포위를 풀고 점령을 공고화했다. ' +
      '다만 팀북투 자체는 부아토(1893-12-15)와 보니에(1894-01-10)가 이미 점령한 상태였다. ' +
      '1894년 3월 중령 진급, 카이~팀북투 지역 사령관이 됨.',
    appointmentDetail:
      '1892년 10월 루이 아르시나르 대령 지휘 아래 프랑스령 수단에 배속되었다. ' +
      '1894년 1월 14~15일 밤 타쿠바오에서 외젠 보니에 중령의 종대가 기습으로 전멸(장교 13명 포함 90여 명 전사)하자, 육로 종대를 이끌고 전장 수습과 팀북투 확보 임무를 받았다.',
  },
  {
    title: '마다가스카르 디에고수아레즈 요새화 책임자',
    startYear: 1900,
    endYear: 1903,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '임무를 마치고 1903년 봄 귀국하며 레지옹 도뇌르 코망되르를 받았다.',
    notes:
      '인도양 거점 디에고수아레즈 군항의 방어시설과 배후 철도·도로를 건설했다. ' +
      '현지 정치적 알력에 시달려 1901년 1월 일시 귀국했다가 준장 진급 후 1902년 4월 임무 완수를 위해 재파견되었고, 1903년 봄 귀국하면서 레지옹 도뇌르 코망되르를 받았다.',
    appointmentDetail:
      '대령으로 진급한 뒤 마다가스카르 총독 조제프 갈리에니 휘하로 파견되었다. ' +
      '이때 형성된 갈리에니와의 상하 관계는 1911년 참모총장 발탁 통설의 배경이자 1914년 마른의 공적 논쟁의 복선이 된다.',
  },
  {
    title: '제19기병여단장',
    startYear: 1903,
    endYear: 1904, endMonth: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '수개월 만에 육군부 공병국장으로 전보되었다.',
    notes:
      '재임이 수개월에 그쳐 특기할 실적 기록은 거의 없다. ' +
      '공병 출신 장성에게 부족했던 본국 부대 지휘 경력을 형식적으로 메워 준 자리로 평가되며, 곧바로 육군부 중앙 행정직으로 이동한다.',
    appointmentDetail:
      '마다가스카르에서 귀국한 준장에게 주어진 과도적 보직이다. ' +
      '공병 출신이 기병여단을 맡은 이례적 인사로, 식민지 경력만 있고 본국 야전 지휘 이력이 없다는 약점을 보완하려는 배치로 읽힌다.',
  },
  {
    title: '육군부 공병국장',
    startYear: 1904, startMonth: 1,
    endYear: 1906,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1905년 소장 진급 후 제6보병사단장으로 전보되었다.',
    notes:
      '국경 요새 체계 정비와 함께, 동원 시 병력 집중을 철도로 처리하는 문제에 집중했다. ' +
      '여기서 굳어진 «철도 물류 전문가» 이미지가 1911년 참모총장 발탁의 핵심 근거가 된다. ' +
      '1905년 소장(général de division)으로 진급.',
    appointmentDetail:
      '식민지에서 축성과 철도 건설로 쌓은 기술 관료로서의 평판이 인정되어 1904년 1월 임명되었다. ' +
      '러일전쟁 관찰과 독일의 동원 속도에 대한 경각심으로 요새·철도 문제가 육군부의 최우선 현안이던 시기였다.',
  },
  {
    title: '제6보병사단장',
    startYear: 1906,
    endYear: 1907, endMonth: 1,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '군사학교 상설감찰관으로 전보되었다.',
    notes:
      '소장 진급 직후 맡은 첫 본국 사단 지휘직이다. ' +
      '파리 주둔 사단을 지휘하며 야전 경력을 보강했으나 재임은 1년 안팎으로 짧았고, 곧 육군 교육기관 감찰 보직으로 옮겼다.',
    appointmentDetail:
      '1905년 소장으로 진급하면서 중앙 행정직에서 야전 지휘직으로 이동했다. ' +
      '공병국장 시절의 실무 성과와 갈리에니 계열 식민지 장교라는 배경이 함께 작용한 인사로 평가된다.',
  },
  {
    title: '군사학교 상설감찰관',
    startYear: 1907, startMonth: 1,
    endYear: 1908, endMonth: 5,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '제2군단장으로 전보되었다.',
    notes:
      '육군 교육기관 전반을 감찰하는 자리로, 그랑메종 등이 설파한 «offensive à outrance»(극단적 공세) 교리가 에콜 드 게르에서 확산되던 국면과 겹친다. ' +
      '조프르 본인은 이 교리의 창안자가 아니지만 이후 이를 계승·집행한다.',
    appointmentDetail:
      '사단장 임기를 마친 뒤 육군 교육 체계 전반을 살피는 중앙 보직으로 이동했다. ' +
      '병과와 무관하게 육군 전체를 조망할 수 있는 자리여서 참모총장 후보군에 드는 데 유리하게 작용했다.',
  },
  {
    title: '제2군단장',
    startYear: 1908, startMonth: 5, startDay: 31,
    endYear: 1910, endMonth: 2,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '후방근무국장 겸 최고전쟁회의 위원으로 전보되었다(후임 군단장은 조르주 피카르).',
    notes:
      '약 2년간 아미앵의 제2군단 및 군관구를 지휘하며 대부대 지휘 경험을 쌓았다. ' +
      '후임으로는 조르주 피카르가 부임했다. ' +
      '이 군단장 경력이 1911년 발탁 시 «본국 대부대 지휘 이력»의 근거로 제시된다.',
    appointmentDetail:
      '1908년 5월 31일 아미앵 제2군단장으로 부임했다. ' +
      '소장 진급 후 사단장·감찰관을 거쳐 군단급 지휘로 올라서는 정규 승진 경로였으며, 이 시기 육군부는 공화파 성향의 기술 장교를 상위직에 올리는 인사 기조를 유지했다.',
  },
  {
    title: '후방근무국장 겸 최고전쟁회의 위원',
    startYear: 1910, startMonth: 1,
    endYear: 1911, endMonth: 7,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '참모총장 겸 최고전쟁회의 부의장으로 승진했다.',
    notes:
      '동원·수송·보급 등 후방 전반을 총괄하면서 최고전쟁회의(CSG) 위원으로 최고위 전략 논의에 참여했다. ' +
      '이 자리에서 축적한 동원 계획·철도 수송 지식이 이듬해 참모총장 임명의 직접적 자산이 된다.',
    appointmentDetail:
      '1910년 1월 23일(일부 자료는 2월 23일) 브룅 육군장관이 최고전쟁회의 위원 겸 후방근무국장으로 임명했다. ' +
      '독일의 동원 속도에 대응할 후방 조직 정비가 시급했고, 철도 물류에 밝은 조프르가 적임자로 지목되었다.',
  },
  {
    title: '참모총장 겸 최고전쟁회의 부의장',
    startYear: 1911, startMonth: 7, startDay: 28,
    endYear: 1914, endMonth: 8, endDay: 2,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1914-08-02 총동원령과 함께 전시 총사령관으로 전환되었다 — 제도 설계상 예정된 승계다.',
    notes:
      '메시미 개혁으로 참모총장직과 CSG 부의장직이 통합되어 사실상 전시 총사령관 지위를 확보했다. ' +
      '뒤바일이 그 아래 «육군참모장»으로 격하되었고 1911년 8월 2일 카스텔노가 제1참모차장으로 배속되었다. ' +
      '장군단 인사를 대폭 정리하고 3년 병역법(1913) 관철을 뒷받침했으며, 1913년 Plan XVII를 완성했다.',
    appointmentDetail:
      '1911년 7월 19일 최고전쟁회의가 전임 미셸 장군의 예비군 통합·벨기에 국경 방어 구상을 만장일치로 부결했고, 메시미 육군장관은 그를 «무능»으로 규정해 7월 21일 경질했다(아가디르 위기 한복판). ' +
      '갈리에니는 정년 임박·본국 경험 부족을 이유로 고사하며 조프르나 폴 포를 천거했고, 포는 가톨릭 성향과 장군 인사권 요구로 배제되어 7월 28일 조프르가 임명되었다.',
  },
  {
    title: '북부·북동부군 총사령관',
    startYear: 1914, startMonth: 8, startDay: 2,
    endYear: 1915, endMonth: 12, endDay: 2,
    endReason: TenureEndReason.OTHER,
    endReasonDetail:
      '1915-12-02자 명령으로 지휘 범위가 프랑스 전군으로 확대되었다.',
    notes:
      'Plan XVII를 발동했으나 국경 전투에서 참패해 8월 한 달에만 10만 명 이상(일부 추계 37만) 손실을 냈다. ' +
      '대후퇴 중 무능 지휘관을 대거 경질(limogeage)하고 모누리의 제6군·포슈의 제9군을 신편, 9월 6일 총반격을 명령해 마른 전투에서 승리했다. ' +
      '이후 1914-15 샹파뉴, 1915년 봄·가을 아르투아·샹파뉴 공세를 이어갔으나 모두 실패했다.',
    appointmentDetail:
      '1911년 이래 «전시 총사령관» 지위를 겸하고 있었으므로 1914년 8월 2일 총동원과 동시에 자동으로 북부·북동부 전역 총사령관에 취임했다. ' +
      '별도의 후보 경합 없이 메시미 개혁의 제도 설계에 따른 승계였다.',
  },
  {
    title: '프랑스 전군 총사령관',
    startYear: 1915, startMonth: 12, startDay: 2,
    endYear: 1916, endMonth: 12, endDay: 13,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail:
      '1916년 12월 브리앙 내각이 실권을 박탈하고 실전 지휘를 니벨에게 넘긴 실질적 경질이다.',
    notes:
      '베르됭 방어(1916년 2~12월)에서 페탱·니벨을 기용해 전선을 지켰고, 여름에는 영국군과 함께 솜 공세를 지휘했다. ' +
      '그러나 두 전역 모두 막대한 사상자에 비해 성과가 빈약해 의회의 비판이 집중되었고, 특히 베르됭 요새의 무장 해제와 초기 대응 지연이 책임 추궁의 초점이 되었다.',
    appointmentDetail:
      '1915년 12월 2일 정부는 동방(살로니카) 전선을 포함한 프랑스 전 군에 대한 지휘권을 조프르에게 부여하는 명령을 내렸다. ' +
      '전역별로 분산된 지휘를 단일화해 연합국 전략 조정에 대응하려는 조치였다.',
  },
  {
    title: '정부 군사고문',
    startYear: 1916, startMonth: 12, startDay: 13,
    endYear: 1916, endMonth: 12, endDay: 26,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail:
      '실권 없는 직함에 항의해 본인이 해임을 요청했고, 같은 날(12-26) 원수로 서임되었다.',
    notes:
      '«프랑스군 총사령관, 정부 군사고문, 전쟁위원회 자문위원»이라는 긴 직함만 남고 실권은 없었다. ' +
      '조프르는 신문에서 이를 읽고 «내게 약속한 것은 이게 아니다»라고 반응했으며, 육군장관 대행이 부대 훈장 승인권조차 막자 12월 26일 스스로 해임을 요청했다.',
    appointmentDetail:
      '1916년 12월 7일 비밀위원회가 브리앙 내각을 신임하되 조프르의 권한 박탈을 조건으로 걸었고, 브리앙은 12월 12일 사임 후 재조각했다. ' +
      '정면 해임의 정치적 부담을 피하려고 형식상 «승진»시키는 방식이 채택되었으며 실전 지휘는 로베르 니벨에게 넘어갔다.',
  },
  {
    title: '주미 사절단 군사대표·프랑스 주둔 미군 총감',
    startYear: 1917, startMonth: 4,
    endYear: 1918,
    endReason: TenureEndReason.TERM_COMPLETED,
    endReasonDetail:
      '임무 종료와 종전으로 마무리되었다.',
    notes:
      '1917년 4월 24일 햄프턴로즈에 상륙해 상·하원에서 연설하고 윌슨 대통령과 퍼싱을 만나 미군의 조기 편성·파병과 프랑스 내 독립 부대 편성을 이끌어냈다. ' +
      '이후 프랑스 주둔 미군 총감(inspecteur général des troupes américaines en France)으로 참호전 적응 교육을 감독했고, 1918년 11월 13일 미국 수훈십자장(DSM)을 받았다.',
    appointmentDetail:
      '원수라는 상징 자본은 있으나 실권이 없던 조프르에게 정부가 부여한 «명예 활용» 임무다. ' +
      '1917년 4월 미국 참전 직후 르네 비비아니 부총리가 이끄는 사절단(1917-04-24~05-14)의 군사 고문으로 합류했다.',
  },
  {
    title: '최고전쟁회의 위원',
    startYear: 1918,
    endYear: 1931, endMonth: 1, endDay: 3,
    endReason: TenureEndReason.DEATH_IN_OFFICE,
    endReasonDetail:
      '1931-01-03 재임 중 사망했다.',
    notes:
      '1919년 7월 14일 포슈와 함께 승전 퍼레이드를 선두에서 이끌었다. ' +
      '1920년 바르셀로나 «꽃놀이(Jocs Florals)» 대회 주재, 1921년 11월~1922년 3월 극동 사절단(인도차이나·시암·일본·조선·중국), 1922년 뉴욕 브로드웨이 색종이 퍼레이드 등 상징적 활동에 주력했고 회고록 집필에 몰두했다.',
    appointmentDetail:
      '실전 지휘에서 물러난 뒤 원수 신분으로 최고전쟁회의에 자리를 얻어 사망 때까지 유지했다. ' +
      '다만 합류 시점을 1918년으로 보는 자료와 1920년으로 보는 자료(레지옹 도뇌르 아카이브)가 갈린다.',
  },]

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
    title: '리베사르트 출생',
    category: 'FAMILY',
    startYear: 1852, startMonth: 1, startDay: 12,
    description: '통 제조업자의 11남매 중 장남으로 출생. 모어는 카탈루냐어였다.',
  },
  {
    title: '에콜 폴리테크니크 입학',
    category: 'EDUCATION',
    startYear: 1869, startMonth: 7,
    description: '132명 중 14등, 만 17세로 동기 최연소 입학(영어권 자료의 «1870년 입학»은 오류).',
  },
  {
    title: '보불전쟁 — 파리 공방전 참전',
    category: 'MILITARY',
    startYear: 1870, startMonth: 9, startDay: 21,
    endYear: 1871, endMonth: 3, endDay: 7,
    description: '학업을 중단하고 소위로 파리 방어에 투입돼 라 빌레트 인근 39호 보루를 지휘했다.',
  },
  {
    title: '폴리테크니크 복학·공병 임관',
    category: 'EDUCATION',
    startYear: 1871, startMonth: 10,
    description: '학업을 마치고 포병이 아닌 공병을 택해 11월 몽펠리에 제2공병연대 소위로 배속되었다.',
  },
  {
    title: '통킹 원정',
    category: 'MILITARY',
    startYear: 1885, startMonth: 1,
    endYear: 1888, endMonth: 1,
    description: '지룽 기지 요새화와 통킹 방어 거점망 구축. 귀국길에 중국·일본·미국을 순방했다.',
  },
  {
    title: '팀북투 종대 지휘',
    category: 'MILITARY',
    startYear: 1894, startMonth: 2, startDay: 12,
    description:
      '타쿠바오에서 보니에 중령의 종대가 전멸하자 육로 종대를 이끌고 팀북투에 도착, 요새 두 곳을 ' +
      '세워 투아레그의 포위를 풀었다 — 점령 자체는 앞서 이뤄져 있었다.',
  },
  {
    title: '마다가스카르 요새화 — 갈리에니 휘하',
    category: 'MILITARY',
    startYear: 1900, endYear: 1903,
    description: '디에고수아레즈 군항 방어시설과 배후 철도·도로 건설. 이때의 상하 관계가 1911년 발탁의 배경이 된다.',
  },
  {
    title: '참모총장 겸 최고전쟁회의 부의장 취임',
    category: 'MILITARY',
    startYear: 1911, startMonth: 7, startDay: 28,
    description:
      '미셸 경질 후 갈리에니가 고사하며 천거해 59세로 발탁되었다. 철도·동원 물류 전문성이 실질 근거였다.',
  },
  {
    title: 'Plan XVII 완성',
    category: 'MILITARY',
    startYear: 1913,
    description:
      '동원·집중 계획으로 1914년 4월 발효. 독일군 우익의 벨기에 대우회를 과소평가하고 중포를 경시한 것이 결정적 결함이었다.',
  },
  {
    title: '총사령관 취임 — 개전',
    category: 'MILITARY',
    startYear: 1914, startMonth: 8, startDay: 2,
    description: '총동원과 동시에 제도 설계대로 북부·북동부군 총사령관으로 전환되었다.',
  },
  {
    title: '마른 전투 — 총반격 명령',
    category: 'MILITARY',
    startYear: 1914, startMonth: 9, startDay: 6,
    description:
      '9월 5일 «더 이상 뒤를 돌아볼 때가 아니다» 훈령을 내리고 이튿날 새벽 전면 반격을 명령해 ' +
      '독일군의 진격을 꺾었다. 대후퇴 중의 지휘관 대량 경질(limogeage)과 제6·제9군 신편이 그 토대였다.',
  },
  {
    title: '전군 총사령관으로 지휘권 확대',
    category: 'MILITARY',
    startYear: 1915, startMonth: 12, startDay: 2,
    description: '살로니카 전선을 포함한 프랑스 전 군의 지휘권을 부여받았다.',
  },
  {
    title: '실권 박탈 — 니벨 교체',
    category: 'POLITICAL',
    startYear: 1916, startMonth: 12, startDay: 13,
    description:
      '베르됭·솜의 소모전 책임으로 의회가 실권 박탈을 요구했고, 실권 없는 «정부 군사고문»으로 ' +
      '형식 승진했다. 실전 지휘는 니벨에게 넘어갔다.',
  },
  {
    title: '프랑스 원수 서임',
    category: 'AWARD',
    startYear: 1916, startMonth: 12, startDay: 26,
    description:
      '제2제정 붕괴 후 사라졌던 원수 위계의 부활이자 제3공화국 최초 서임. 실질은 «명예로운 해임»이었다 ' +
      '(관보 기준 12-26, 아카데미 프랑세즈 약력은 12-25로 적는다).',
  },
  {
    title: '조프르-비비아니 사절단 — 미국 참전 교섭',
    category: 'DIPLOMATIC',
    startYear: 1917, startMonth: 4, startDay: 24,
    endYear: 1917, endMonth: 5, endDay: 14,
    description:
      '미 상·하원 연설과 윌슨·퍼싱 면담으로 미군의 조기 편성·파병과 프랑스 내 독립 부대 편성을 이끌어냈다.',
  },
  {
    title: '아카데미 프랑세즈 선출',
    category: 'AWARD',
    startYear: 1918, startMonth: 2, startDay: 14,
    description:
      '재적 23명 만장일치로 35번 의석 선출(전임 쥘 클라르티). 12월 19일 입회식에 초록 예복 대신 ' +
      '장군 정복을 입고 나타났다.',
  },
  {
    title: '극동 사절단',
    category: 'TRAVEL',
    startYear: 1921, startMonth: 11, startDay: 11,
    endYear: 1922, endMonth: 3,
    description:
      '인도차이나·시암·일본(1922-01~02, 히로히토 황태자 알현)·조선·중국을 도는 4개월여 순방. ' +
      '«1917년 일본 방문»설은 이 사절단과의 혼동이다.',
  },
  {
    title: '파리에서 사망·국장',
    category: 'PERSONAL',
    startYear: 1931, startMonth: 1, startDay: 3,
    description:
      '하지 동맥염으로 오른쪽 다리를 절단한 뒤 혼수에 빠져 78세로 사망. 1월 7일 국장이 거행되었고 ' +
      '유해는 유언대로 루브시엔의 사설 영묘로 옮겨졌다.',
  },
]

// ── 6축 능력치 ──────────────────────────────────────────────────────────────
const JOFFRE_STATS = {
  politics: 55,
  military: 74,
  diplomacy: 58,
  intellect: 66,
  charisma: 78,
  administration: 88,
  notes:
    '축성과 철도로 경력을 쌓은 공병 출신 조직가 — 동원·수송 물류를 장악한 행정 역량이 최고 ' +
    '강점이며, 1911년 참모총장 발탁의 실질 근거도 전략 식견이 아니라 이 물류 전문성이었다. ' +
    '군사는 평가가 갈린다: Plan XVII의 전략 가정은 실패했고 소모전 공세를 고집했으나, 계획이 ' +
    '무너진 뒤 철도로 병력을 재배치해 마른 반격을 성립시킨 위기관리와 무능 지휘관 대량 경질· ' +
    '인재 발탁의 결단은 최상급이었다. «파파 조프르»라는 국민적 애칭이 말해주는 대중적 신뢰와 ' +
    '흔들리지 않는 평정심이 카리스마의 실체다. 반면 의회·내각을 상대하는 정치력은 부족해 ' +
    '1916년 여론이 돌아서자 방어하지 못하고 실권을 잃었다.',
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function precisionOf(month?: number, day?: number): string {
  return day ? 'day' : month ? 'month' : 'year'
}

// ── 메인 ────────────────────────────────────────────────────────────────────
export async function seedJoffre(prisma: PrismaService): Promise<void> {
  console.log('\n🎖️ 조제프 조프르(Joseph Joffre) 보강 시작 (기존 행 보강 모드)...')

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
    console.warn('  ⚠️  «프랑스 제3공화국» HC 미존재 — seedFranceHistoricalCountries 먼저 실행. 시딩 중단.')
    return
  }

  const person = await prisma.person.findFirst({
    where: { originalName: { contains: JOFFRE.originalNameKey } },
  })
  if (!person) {
    console.warn('  ⚠️  조프르 인물 행이 없다 — 이 시드는 기존 행 보강 전용이라 중단한다.')
    return
  }
  const personId = person.id

  // ── 1) 인물 필드 보강 (누락만) + 이름 표시 순서 교정 ──────────────────────
  const patch: Record<string, unknown> = {}
  if (!person.biography) patch.biography = JOFFRE.biography
  if (!person.birthPlaceText) patch.birthPlaceText = JOFFRE.birthPlaceText
  if (!person.birthNote) patch.birthNote = JOFFRE.birthNote
  if (!person.deathPlaceText) patch.deathPlaceText = JOFFRE.deathPlaceText
  if (!person.deathNote) patch.deathNote = JOFFRE.deathNote
  if (person.influence == null) patch.influence = JOFFRE.influence
  if (!person.historicalCountryId) patch.historicalCountryId = france.id
  // 오등록 교정 — 프랑스 인물이 'korean'(성+이름)이면 "조프르 조제프"로 뒤집혀 표시된다
  if (person.nameDisplayOrder === ('korean' as any)) {
    patch.nameDisplayOrder = 'western'
    console.log("  🔧 교정: nameDisplayOrder 'korean' → 'western' (프랑스 인물 표기 순서)")
  }
  if (Object.keys(patch).length > 0) {
    await prisma.person.update({ where: { id: personId }, data: patch })
    console.log(`  🔧 보강: ${Object.keys(patch).join(', ')}`)
  } else {
    console.log('  ⏭️  인물 필드 보강할 것 없음')
  }

  // ── 2) 재임 15건 ──────────────────────────────────────────────────────────
  for (const t of TENURES) {
    const startDate = toDate(t.startYear, t.startMonth, t.startDay)
    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        historicalCountryId: france.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
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
        historicalCountryId: france.id,
        positionType: GovernmentPositionType.MILITARY_COMMANDER,
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

  // ── 3) 연보 ─────────────────────────────────────────────────────────────────
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

  // ── 4) 능력치 ────────────────────────────────────────────────────────────────
  const statsExists = await prisma.personStats.findFirst({ where: { personId, accountId: admin.id } })
  if (statsExists) {
    console.log('  ⏭️  능력치 스킵 (이미 존재)')
  } else {
    await prisma.personStats.create({
      data: {
        personId,
        accountId: admin.id,
        politics: JOFFRE_STATS.politics,
        military: JOFFRE_STATS.military,
        diplomacy: JOFFRE_STATS.diplomacy,
        intellect: JOFFRE_STATS.intellect,
        charisma: JOFFRE_STATS.charisma,
        administration: JOFFRE_STATS.administration,
        notes: JOFFRE_STATS.notes,
      },
    })
    console.log(
      `  ✅ 능력치: 정치 ${JOFFRE_STATS.politics}·군사 ${JOFFRE_STATS.military}·` +
        `외교 ${JOFFRE_STATS.diplomacy}·학식 ${JOFFRE_STATS.intellect}·` +
        `카리스마 ${JOFFRE_STATS.charisma}·행정 ${JOFFRE_STATS.administration}`,
    )
  }

  console.log('✅ 조제프 조프르 보강 완료\n')
}
