/**
 * 트럼프 2기 행정부 내각 각료(Executive Department Secretaries) 시드
 *
 * ⚠️ 기존 데이터 보존 모드 — Person/Tenure가 이미 있으면 갱신하지 않고 누락 필드만 보강한다.
 *
 * 2025-01-20 출범한 트럼프 2기 행정부의 15개 행정부처(Executive Department) 장관 전원을 등록한다.
 * 법무장관·노동장관·국토안보장관 3개 직위는 2025~2026년 사이 인선이 교체되어 전임자도 함께
 * 등록한다(종료된 재임으로 교체 이력을 남김) — 총 인물 18명.
 * 키스 손덜링(노동장관 대행)은 2026-08-14 기준 상원 본회의 인준이 계류 중인 상태를 그대로 기록한다.
 *
 * ⚠️ 어드민 "행정부(Cabinet)" 뷰는 Cabinet 테이블 기준으로 조회된다(GovernmentPositionTenure만
 *    만들면 안 뜬다 — [[project_cabinet_must_accompany_pm_tenure]]). 그래서 트럼프 본인의
 *    대통령(HEAD_OF_STATE) 재임 1건 + 그걸 head로 하는 Cabinet 1건도 함께 만들고, 18개 장관
 *    재임 전부에 그 Cabinet의 cabinetId를 건다(인선이 바뀐 3개 직위도 동일 행정부 소속).
 *
 * 의존: seedCountries('미국' 현대 국가) + seedGovernmentPositionDefinitions(국무장관 등 신설 10종
 *       포함)가 먼저 실행돼야 한다. 트럼프 본인 Person은 기존 사건 시드(merz-us 등)에 이미 있으면
 *       재사용하고, 없으면 최소 필드로 새로 만든다.
 *
 * 등록 항목:
 *  - Person x18 (+ 트럼프 본인은 기존 행 재사용/보강)
 *  - PersonCountryAffiliation x18 (전원 CITIZENSHIP → 미국, 현대 국가 FK)
 *  - AdministrationDepartment x15 (미국 국무부 등) — 재임의 「소속 부처」 표시는 title이 아니라
 *    이 FK(administrationDepartmentId)로 채워진다. 없으면 어드민에 "부처 미지정"으로 뜬다.
 *  - GovernmentPositionTenure x18 (전원 CABINET_MINISTER, countryId=미국 — 역사국가가 아닌
 *    현대 Country FK를 쓰는 최초의 구조화 재임 시드) + 대통령 재임 x1
 *  - Cabinet x1 ("트럼프 2기 행정부") — 18개 장관 재임 전부가 cabinetId로 소속
 */
import {
  AppointmentMethod,
  GovernmentPositionType,
  TenureEndReason,
  TenureMandateSource,
} from '@prisma/client'

import { PrismaService } from '../prisma.service'

interface CabinetPersonSpec {
  key: string
  name: string
  surname: string
  originalName: string
  gender: 'MALE' | 'FEMALE'
  birthYear: number
  birthMonth: number
  birthDay: number
  birthPlaceText: string
  biography: string
}

const PERSONS: CabinetPersonSpec[] = [
  {
    key: 'rubio',
    name: '마르코', surname: '루비오',
    originalName: 'Marco Antonio Rubio',
    gender: 'MALE',
    birthYear: 1971, birthMonth: 5, birthDay: 28,
    birthPlaceText: '미국 플로리다주 마이애미',
    biography:
      '쿠바 이민자 가정에서 태어나 플로리다 대학교에서 정치학 학사, 마이애미 대학교 로스쿨에서 ' +
      '법학박사를 받았다. 웨스트마이애미 시의원(1998~2000)을 거쳐 플로리다 하원의원(2000~2008)을 ' +
      '지냈고 2006~2008년 하원의장을 역임했다. 2010년 티파티 돌풍 속에 연방 상원의원에 당선돼 ' +
      '2011년부터 2025년까지 플로리다주를 대표했으며, 2016년 공화당 대선 경선에도 출마했다. ' +
      '상원 정보위원회·외교위원회에서 활동하며 대중국·대쿠바 강경파로 자리매김했다. 2024년 대선 ' +
      '이후 국무장관에 지명돼 2025년 1월 21일 상원 만장일치로 인준, 트럼프 2기 내각 중 가장 먼저 ' +
      '취임했다. 2025년 5월부터는 국가안보보좌관을 겸임하고 있다.',
  },
  {
    key: 'bessent',
    name: '스콧', surname: '베센트',
    originalName: 'Scott Kenneth Homer Bessent',
    gender: 'MALE',
    birthYear: 1962, birthMonth: 8, birthDay: 21,
    birthPlaceText: '미국 사우스캐롤라이나주 콘웨이',
    biography:
      '예일 대학교에서 정치학을 전공했다. 브라운 브라더스 해리먼, 사우디 올라얀 그룹을 거쳐 ' +
      '키니코스 어소시에이츠에서 공매도 투자를 익혔고, 1991년부터 조지 소로스의 소로스 펀드 ' +
      '매니지먼트에서 수석 포트폴리오 매니저로 활동하며 1992년 "검은 수요일" 파운드화 공매도에 ' +
      '관여했다. 2000년 자신의 헤지펀드 베센트 캐피털을 설립했고, 2011~2015년 소로스 펀드로 ' +
      '복귀해 최고투자책임자를 지냈다. 2015년 소로스의 20억 달러 종잣돈으로 키스퀘어 그룹을 세워 ' +
      '운영하다 2024년 트럼프 대선 캠프의 경제 자문으로 합류했다. 재무장관 지명 후 2025년 1월 27일 ' +
      '상원 인준(68대29), 이튿날 취임해 제79대 재무장관이 되었다.',
  },
  {
    key: 'hegseth',
    name: '피트', surname: '헤그세스',
    originalName: 'Peter Brian Hegseth',
    gender: 'MALE',
    birthYear: 1980, birthMonth: 6, birthDay: 6,
    birthPlaceText: '미국 미네소타주 미니애폴리스',
    biography:
      '프린스턴 대학교에서 정치학을 전공하고 하버드 케네디스쿨에서 행정학 석사를 받았다. ' +
      '미네소타 육군 주방위군 소속 장교로 관타나모·이라크(2005)·아프가니스탄(2010) 등에 파병됐으며 ' +
      '소령으로 예편했다. 재향군인 단체 "자유를 위한 재향군인회" 사무국장(2007), "미국을 걱정하는 ' +
      '재향군인회" 회장(2012~2016)을 지내며 보수 정치권에 이름을 알렸고, 2014년부터 폭스뉴스 ' +
      '계약직 논평가로 폭스 앤 프렌즈 위켄드를 공동 진행했다. 정부 고위직 경력은 없었으나 국방장관에 ' +
      '지명돼 2025년 1월 24일 상원에서 부통령의 캐스팅보트로 51대50 인준을 통과, 이튿날 취임했다.',
  },
  {
    key: 'bondi',
    name: '팸', surname: '본디',
    originalName: 'Pamela Jo Bondi',
    gender: 'FEMALE',
    birthYear: 1965, birthMonth: 11, birthDay: 17,
    birthPlaceText: '미국 플로리다주 탬파',
    biography:
      '플로리다 대학교에서 형사사법학을, 스텟슨 대학교 로스쿨에서 법학을 전공했다. 힐즈버러 카운티 ' +
      '검사보(1994~2009)로 15년간 재직한 뒤 2010년 플로리다주 법무장관에 당선돼 2011~2019년 두 ' +
      '차례 임기를 지내며 오피오이드 소송·인신매매 단속 등에 주력했다. 2016년부터 트럼프의 측근 ' +
      '법률 자문 그룹에 합류했고, 2019~2020년 하원 탄핵 심리에서 대통령 변호인단으로 활동했다. ' +
      '법무장관에 지명돼 2025년 2월 4일 상원 인준(54대46), 이튿날 클래런스 토머스 대법관 주재로 ' +
      '취임했다. 2026년 4월 2일 엡스타인 관련 문건 처리를 둘러싼 논란 끝에 트럼프에 의해 경질됐다.',
  },
  {
    key: 'blanche',
    name: '토드', surname: '블랜치',
    originalName: 'Todd Wallace Blanche',
    gender: 'MALE',
    birthYear: 1974, birthMonth: 8, birthDay: 6,
    birthPlaceText: '미국 콜로라도주 덴버',
    biography:
      '아메리칸 대학교를 거쳐 브루클린 로스쿨을 우등 졸업했다. 뉴욕 남부지검 검사보(2006~2014)로 ' +
      '강력범죄부에서 활동한 뒤 캐드월레더 법무법인 파트너(2017~2023)로 옮겼다. 2023~2024년 ' +
      '트럼프의 형사재판(뉴욕 성추문 입막음 사건 등) 변호인단을 이끌며 이름을 알렸고, 트럼프 2기 ' +
      '출범과 함께 법무부 부장관(2025년 3월~2026년 8월)으로 발탁됐다. 팸 본디 경질 후 법무장관에 ' +
      '지명돼 2026년 8월 8일 상원 인준(50대49), 8월 10일 취임해 부장관에서 곧바로 승진했다.',
  },
  {
    key: 'burgum',
    name: '더그', surname: '버검',
    originalName: 'Douglas James Burgum',
    gender: 'MALE',
    birthYear: 1956, birthMonth: 8, birthDay: 1,
    birthPlaceText: '미국 노스다코타주 아서',
    biography:
      '노스다코타 주립대에서 학사, 스탠퍼드 경영대학원에서 MBA를 받았다. 1984년 소프트웨어 기업 ' +
      '그레이트플레인스에 합류해 대표이사로 나스닥 상장을 이끌었고, 2001년 마이크로소프트에 11억 ' +
      '달러에 매각한 뒤 마이크로소프트 비즈니스솔루션 그룹 수석부사장(2001~2007)을 지냈다. 이후 ' +
      '벤처캐피털·부동산 투자에 주력하다 2016년 노스다코타 주지사에 당선돼 2016~2024년 재임하며 ' +
      '에너지·기술 산업 유치에 힘썼고, 2024년 공화당 대선 경선에도 잠시 도전했다. 내무장관에 ' +
      '지명돼 2025년 1월 30일 상원 인준(79대18), 2월 1일 취임해 제55대 내무장관이 되었다.',
  },
  {
    key: 'rollins',
    name: '브룩', surname: '롤린스',
    originalName: 'Brooke Christine Rollins',
    gender: 'FEMALE',
    birthYear: 1972, birthMonth: 4, birthDay: 10,
    birthPlaceText: '미국 텍사스주 댈러스 (글렌로즈에서 성장)',
    biography:
      '텍사스 A&M 대학교에서 농업개발학을 우등 졸업하고 텍사스 대학교 로스쿨에서 법학박사를 ' +
      '받았다. 텍사스 공공정책재단(2003~2018) 대표로 조직을 3명에서 100명 규모로 키우며 텍사스 ' +
      '보수 진영의 핵심 싱크탱크로 성장시켰다. 트럼프 1기에서 백악관 미국혁신국장(2018~2020), ' +
      '국내정책위원회 대행 국장(2020~2021)을 지냈고, 퇴임 후 래리 커들로와 "아메리카 퍼스트 ' +
      '정책연구소"를 공동 설립해 대표를 맡으며 트럼프의 재집권을 준비했다. 농무장관에 지명돼 ' +
      '2025년 2월 13일 상원 인준(72대28), 같은 날 취임했다.',
  },
  {
    key: 'lutnick',
    name: '하워드', surname: '러트닉',
    originalName: 'Howard William Lutnick',
    gender: 'MALE',
    birthYear: 1961, birthMonth: 7, birthDay: 14,
    birthPlaceText: '미국 뉴욕주 롱아일랜드',
    biography:
      '해버포드 칼리지에서 경제학을 전공했다. 1983년 채권중개회사 캔터 피츠제럴드에 입사해 1991년 ' +
      '대표이사, 1996년 창업자 버나드 캔터 별세 후 회장을 겸임하며 30년 넘게 회사를 이끌었다. ' +
      '2004년 캔터 피츠제럴드의 음성 브로커리지 사업을 분사해 BGC 파트너스(현 BGC 그룹)를 공동 ' +
      '설립했다. 2001년 9·11 테러로 세계무역센터 사무실 직원 658명을 잃은 뒤 회사를 재건한 ' +
      '일화로도 잘 알려져 있다. 2024년 트럼프 대선 캠프 인수위 공동위원장을 맡았고, 상무장관에 ' +
      '지명돼 2025년 2월 18일 상원 인준(51대45), 2월 21일 취임했다.',
  },
  {
    key: 'chavezDeRemer',
    name: '로리', surname: '차베스-데레머',
    originalName: 'Lori Michelle Chavez-DeRemer',
    gender: 'FEMALE',
    birthYear: 1968, birthMonth: 4, birthDay: 7,
    birthPlaceText: '미국 캘리포니아주 산타클라라',
    biography:
      '프레즈노 캘리포니아 주립대에서 경영학을 전공했다. 오리건주 해피밸리 시의원을 거쳐 ' +
      '2011~2019년 해피밸리 시장을 지냈고, 2022년 오리건주 5선거구에서 연방 하원의원에 당선돼 ' +
      '2023~2025년 재임했다. 노동조합 친화적 공화당 의원으로 분류돼 노동장관 지명 당시 이례적이라는 ' +
      '평가를 받았다. 2025년 3월 상원 인준을 거쳐 3월 11일 취임했으나, 2026년 4월 20일 본인 및 ' +
      '가족의 비위 의혹(공무 출장 사적 유용, 직원과의 부적절한 관계, 배우자 관련 성비위 의혹 등)에 ' +
      '대한 조사가 겹치며 사임했다.',
  },
  {
    key: 'sonderling',
    name: '키스', surname: '손덜링',
    originalName: 'Keith E. Sonderling',
    gender: 'MALE',
    birthYear: 1982, birthMonth: 11, birthDay: 25,
    birthPlaceText: '미국 뉴욕주 뉴욕시',
    biography:
      '플로리다 대학교를 거쳐 노바 사우스이스턴 대학교 로스쿨에서 법학박사를 받았다. 거스터 ' +
      '요클리 앤 스튜어트 법무법인(2008~2017)에서 노동소송을 전문으로 다뤘고, 2017년 노동부 ' +
      '임금시간국 정책보좌관으로 공직에 입문해 부국장·대행 국장을 지냈다. 2020~2024년 평등고용 ' +
      '기회위원회(EEOC) 위원 겸 부의장을 지낸 뒤, 2025년 3월 노동부 부장관으로 트럼프 2기 ' +
      '행정부에 합류했다. 2026년 4월 20일 로리 차베스-데레머의 사임으로 노동장관 대행을 맡았고, ' +
      '6월 29일 정식 지명돼 7월 30일 상원 노동위원회를 통과했으나 2026년 8월 현재 본회의 인준 ' +
      '표결은 계류 중이다.',
  },
  {
    key: 'rfkJr',
    name: '로버트', surname: '케네디 주니어',
    originalName: 'Robert Francis Kennedy Jr.',
    gender: 'MALE',
    birthYear: 1954, birthMonth: 1, birthDay: 17,
    birthPlaceText: '미국 워싱턴 D.C.',
    biography:
      '로버트 F. 케네디 상원의원의 아들이자 존 F. 케네디 대통령의 조카로, 하버드 대학교에서 ' +
      '역사학을, 버지니아 대학교 로스쿨에서 법학박사를, 페이스 대학교에서 환경법 석사를 받았다. ' +
      '1980년대부터 환경단체 리버키퍼 수석변호사로 허드슨강 오염 소송을 이끌었고, 1999년 워터키퍼 ' +
      '얼라이언스를 창립해 2020년까지 회장을 지냈다. 페이스 대학교 로스쿨 환경소송클리닉을 30년 ' +
      '가까이 지도하며 환경 변호사로 명성을 쌓았으나, 2000년대 후반부터는 백신-자폐증 연관설 등 ' +
      '반백신 운동의 대표적 인물로 전환했다. 2023년 민주당으로 대선 출마를 선언했다가 무소속으로 ' +
      '전환, 2024년 8월 사퇴하며 트럼프를 지지했다. 보건복지장관에 지명돼 2025년 2월 13일 상원 ' +
      '인준(52대48), 같은 날 취임했다.',
  },
  {
    key: 'turner',
    name: '스콧', surname: '터너',
    originalName: 'Eric Scott Turner',
    gender: 'MALE',
    birthYear: 1972, birthMonth: 2, birthDay: 26,
    birthPlaceText: '미국 텍사스주 리처드슨',
    biography:
      '일리노이 대학교 어바나-샴페인에서 언어커뮤니케이션학을 전공했다. NFL 코너백으로 ' +
      '1995~2003년 워싱턴 레드스킨스·샌디에이고 차저스·버펄로 빌스·덴버 브롱코스에서 뛴 뒤 ' +
      '텍사스주 하원의원(2013~2017, 33선거구)을 지냈다. 트럼프 1기에서 백악관 기회·재활성화 ' +
      '위원회 상임이사(2019~2021)를 맡아 저소득 지역 투자촉진지구(Opportunity Zone) 정책을 ' +
      '총괄했다. 주택도시개발장관에 지명돼 2025년 2월 5일 상원 인준(55대44), 같은 날 클래런스 ' +
      '토머스 대법관 주재로 취임했다.',
  },
  {
    key: 'duffy',
    name: '션', surname: '더피',
    originalName: 'Sean Patrick Duffy',
    gender: 'MALE',
    birthYear: 1971, birthMonth: 10, birthDay: 3,
    birthPlaceText: '미국 위스콘신주 헤이워드',
    biography:
      '세인트메리스 대학교(미네소타)에서 마케팅을, 윌리엄 미첼 로스쿨에서 법학을 전공했다. 벌목 ' +
      '선수권 대회 챔피언 출신으로 1997년 MTV 리얼리티쇼 "리얼 월드: 보스턴" 출연으로 먼저 ' +
      '유명해졌다. 위스콘신주 7선거구 연방 하원의원(2011~2019)을 지낸 뒤 폭스비즈니스 "더 바텀 ' +
      '라인" 공동 진행자(2023~2025)로 방송에 복귀했다. 교통장관에 지명돼 2025년 1월 28일 상원 ' +
      '인준을 거쳐 같은 날 클래런스 토머스 대법관 주재로 취임했다.',
  },
  {
    key: 'wright',
    name: '크리스', surname: '라이트',
    originalName: 'Christopher Allen Wright',
    gender: 'MALE',
    birthYear: 1965, birthMonth: 1, birthDay: 15,
    birthPlaceText: '미국 콜로라도주',
    biography:
      'MIT에서 기계공학 학사와 전기공학 석사를 받았고 UC버클리에서 전기공학 박사 과정을 밟았다. ' +
      '1992년 셰일가스 수압파쇄 기술 기업 피너클 테크놀로지스를 설립해 2006년까지 대표를 지냈고, ' +
      '이후 스트라우드 에너지 회장을 거쳐 2011년 리버티 에너지(옛 리버티 오일필드 서비스)를 ' +
      '창업, 2023년 기준 기업가치 28억 달러 규모로 키웠다. 원자력 스타트업 오클로, 캐나다 광물 ' +
      '로열티 기업 EMX 로열티의 이사회에도 참여했다. 에너지장관에 지명돼 2025년 2월 3일 상원 ' +
      '인준(59대38), 같은 날 취임했다.',
  },
  {
    key: 'mcmahon',
    name: '린다', surname: '맥마흔',
    originalName: 'Linda Marie McMahon',
    gender: 'FEMALE',
    birthYear: 1948, birthMonth: 10, birthDay: 4,
    birthPlaceText: '미국 노스캐롤라이나주 뉴번',
    biography:
      '이스트캐롤라이나 대학교에서 불문학을 전공했다. 남편 빈스 맥마흔과 함께 1980년 지역 ' +
      '프로레슬링 단체를 인수해 WWE(옛 WWF)로 키웠고, 1980~2009년 공동창업자 겸 CEO로 다국적 ' +
      '엔터테인먼트 기업으로 성장시켰다. 2010·2012년 코네티컷주 연방 상원의원 선거에 출마했다 ' +
      '낙선했으나, 트럼프 1기에서 중소기업청장(2017~2019)을 지냈고 이후 "아메리카 퍼스트 ' +
      '정책연구소" 회장을 맡아 트럼프 2기 정책 구상에 관여했다. 교육장관에 지명돼 2025년 3월 3일 ' +
      '상원 인준(51대45), 같은 날 취임해 제13대 교육장관이 되었다.',
  },
  {
    key: 'collins',
    name: '더그', surname: '콜린스',
    originalName: 'Douglas Allen Collins',
    gender: 'MALE',
    birthYear: 1966, birthMonth: 8, birthDay: 16,
    birthPlaceText: '미국 조지아주 게인즈빌',
    biography:
      '노스조지아 대학교에서 정치학·형법을, 뉴올리언스 침례신학대학원에서 목회학 석사를, ' +
      '애틀랜타 존 마셜 로스쿨에서 법학박사를 받았다. 조지아주 하원의원(2007~2013)을 거쳐 조지아 ' +
      '9선거구 연방 하원의원(2013~2021)을 지냈고, 2019~2020년 하원 법사위 공화당 간사로 1차 ' +
      '탄핵 심리에서 트럼프를 변호해 두각을 나타냈다. 공군 예비군 군종장교(대령)로 이라크에 ' +
      '파병된 경력이 있으며, 2010년부터 애틀랜타에서 법률사무소 "콜린스 앤 크사이더"를 공동 ' +
      '운영해왔다. 보훈장관에 지명돼 2025년 2월 4일 상원 인준(77대23), 2월 5일 취임해 9·11 ' +
      '이후 참전용사 출신으로는 처음으로 보훈장관이 되었다(제12대).',
  },
  {
    key: 'mullin',
    name: '마크웨인', surname: '멀린',
    originalName: 'Markwayne Mullin',
    gender: 'MALE',
    birthYear: 1977, birthMonth: 7, birthDay: 26,
    birthPlaceText: '미국 오클라호마주 털사',
    biography:
      '체로키 네이션 원주민 혈통으로, 레슬링 장학생으로 미주리밸리 칼리지에 진학했고 오클라호마 ' +
      '주립대 기술대학에서 배관 전공 준학사를 받았다. 1997년 가업인 멀린 플러밍을 물려받아 ' +
      '환경서비스·부동산 관리 등으로 사업을 확장한 기업인 출신이다. 오클라호마 2선거구 연방 ' +
      '하원의원(2013~2023)을 지낸 뒤 2022년 보궐 상원의원 선거에서 당선돼 2023~2026년 연방 ' +
      '상원의원으로 재직했다. 크리스티 노엄 경질 후 국토안보장관에 지명돼 2026년 3월 23일 상원 ' +
      '인준, 이튿날 팸 본디 당시 법무장관 주재로 취임하며 상원의원직을 사퇴했다.',
  },
  {
    key: 'noem',
    name: '크리스티', surname: '노엄',
    originalName: 'Kristi Lynn Noem',
    gender: 'FEMALE',
    birthYear: 1971, birthMonth: 11, birthDay: 30,
    birthPlaceText: '미국 사우스다코타주 워터타운',
    biography:
      '사우스다코타 주립대에서 정치학 학사를 받았다(가업 승계로 학업을 미루다 2012년 재입학해 ' +
      '졸업). 사우스다코타 주하원의원(2007~2011)을 지낸 뒤 사우스다코타주 유일 선거구 연방 ' +
      '하원의원(2011~2019)을 거쳐 2019년 사우스다코타 최초의 여성 주지사에 당선, 2019~2025년 ' +
      '재임했다. 코로나19 방역 규제에 반대하는 강경 노선과 2024년 대선 부통령 후보 하마평으로 ' +
      '전국적 인지도를 얻었다. 국토안보장관에 지명돼 2025년 1월 25일 상원 인준을 거쳐 취임했으나, ' +
      '예산 오남용·해안경비대 자산의 사적 사용·개인 비위 의혹에 대한 청문회 이후 2026년 3월 24일 ' +
      '트럼프에 의해 경질되고 "아메리카 대륙 방패" 특사로 재배치됐다.',
  },
]

interface TenureSpec {
  personKey: string
  defTitle: string
  termNumber?: number
  startYear: number; startMonth: number; startDay: number
  endYear?: number; endMonth?: number; endDay?: number
  endReason?: (typeof TenureEndReason)[keyof typeof TenureEndReason]
  endReasonDetail?: string
  appointmentDetail: string
  notes: string
}

const TENURES: TenureSpec[] = [
  {
    personKey: 'rubio', defTitle: '국무장관',
    startYear: 2025, startMonth: 1, startDay: 21,
    appointmentDetail: '2024년 11월 트럼프 당선인이 지명, 2025년 1월 21일 상원에서 만장일치(99대0)로 인준되어 취임했다.',
    notes: '트럼프 2기 내각 중 가장 먼저 취임한 각료. 2025년 5월부터 국가안보보좌관을 겸임.',
  },
  {
    personKey: 'bessent', defTitle: '재무장관',
    termNumber: 79,
    startYear: 2025, startMonth: 1, startDay: 28,
    appointmentDetail: '2024년 11월 지명, 2025년 1월 27일 상원 인준(68대29)을 거쳐 이튿날 제79대 재무장관으로 취임했다.',
    notes: '헤지펀드 매니저 출신 재무장관.',
  },
  {
    personKey: 'hegseth', defTitle: '국방장관',
    startYear: 2025, startMonth: 1, startDay: 25,
    appointmentDetail: '2024년 11월 지명, 2025년 1월 24일 상원에서 부통령 캐스팅보트로 51대50 인준을 통과해 이튿날 취임했다.',
    notes: '정부 고위직 경력 없이 폭스뉴스 방송인에서 국방장관에 발탁된 이례적 인선.',
  },
  {
    personKey: 'bondi', defTitle: '법무장관',
    startYear: 2025, startMonth: 2, startDay: 5,
    endYear: 2026, endMonth: 4, endDay: 2,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail: '엡스타인 관련 문건 처리를 둘러싼 논란 끝에 2026년 4월 2일 트럼프에 의해 경질됐다.',
    appointmentDetail: '2024년 11월 지명(맷 게이츠 지명 철회 후 대체), 2025년 2월 4일 상원 인준(54대46)을 거쳐 이튿날 클래런스 토머스 대법관 주재로 취임했다.',
    notes: '플로리다주 법무장관을 두 차례 지낸 뒤 연방 법무장관으로 발탁.',
  },
  {
    personKey: 'blanche', defTitle: '법무장관',
    startYear: 2026, startMonth: 8, startDay: 10,
    appointmentDetail: '팸 본디 경질 직후 지명, 2026년 8월 8일 상원 인준(50대49)을 거쳐 8월 10일 취임했다. 트럼프의 개인 형사재판 변호인 출신으로, 법무부 부장관에서 곧바로 승진했다.',
    notes: '법무부 부장관(2025-03~2026-08)에서 승진.',
  },
  {
    personKey: 'burgum', defTitle: '내무장관',
    termNumber: 55,
    startYear: 2025, startMonth: 2, startDay: 1,
    appointmentDetail: '2024년 11월 지명, 2025년 1월 30일 상원 인준(79대18)을 거쳐 2월 1일 제55대 내무장관으로 취임했다.',
    notes: '노스다코타 주지사(2016~2024) 출신. 소프트웨어 기업 매각으로 부를 축적한 기업인.',
  },
  {
    personKey: 'rollins', defTitle: '농무장관',
    startYear: 2025, startMonth: 2, startDay: 13,
    appointmentDetail: '2024년 11월 지명, 2025년 2월 13일 상원 인준(72대28)을 거쳐 같은 날 취임했다.',
    notes: '트럼프 1기 백악관 국내정책위원회 출신, 아메리카 퍼스트 정책연구소 공동설립자.',
  },
  {
    personKey: 'lutnick', defTitle: '상무장관',
    startYear: 2025, startMonth: 2, startDay: 21,
    appointmentDetail: '2024년 11월 지명, 2025년 2월 18일 상원 인준(51대45)을 거쳐 2월 21일 취임했다.',
    notes: '캔터 피츠제럴드·BGC 그룹 회장 겸 CEO 출신. 2024년 트럼프 인수위 공동위원장.',
  },
  {
    personKey: 'chavezDeRemer', defTitle: '노동장관',
    startYear: 2025, startMonth: 3, startDay: 11,
    endYear: 2026, endMonth: 4, endDay: 20,
    endReason: TenureEndReason.RESIGNATION,
    endReasonDetail: '본인 및 가족을 둘러싼 비위 의혹(공무 출장 사적 유용, 직원과의 부적절한 관계, 배우자 관련 성비위 의혹 등)에 대한 조사가 겹치며 2026년 4월 20일 사임했다.',
    appointmentDetail: '2024년 11월 지명, 2025년 3월 상원 인준을 거쳐 3월 11일 취임했다. 노동조합 친화적 성향의 공화당 의원 출신이라는 점에서 이례적 인선으로 평가됐다.',
    notes: '오리건주 해피밸리 시장·연방 하원의원(2023~2025) 출신.',
  },
  {
    personKey: 'sonderling', defTitle: '노동장관',
    startYear: 2026, startMonth: 4, startDay: 20,
    appointmentDetail: '로리 차베스-데레머 사임 직후인 2026년 4월 20일 노동장관 대행으로 업무를 시작했다. 6월 29일 정식 지명돼 7월 30일 상원 보건교육노동연금위원회를 정당 표결(12대11)로 통과했으나, 2026년 8월 14일 현재 상원 본회의 인준 표결은 계류 중이다.',
    notes: '노동부 부장관(2025-03~)에서 대행으로 승격. 본회의 인준 전이라 startDate는 대행 취임일 기준.',
  },
  {
    personKey: 'rfkJr', defTitle: '보건복지장관',
    startYear: 2025, startMonth: 2, startDay: 13,
    appointmentDetail: '2024년 11월 지명, 2025년 2월 13일 상원 인준(52대48)을 거쳐 같은 날 대법관 닐 고서치 주재로 취임했다.',
    notes: '환경 변호사에서 반백신 운동가로, 2024년 대선 무소속 후보에서 트럼프 지지로 전환한 이력.',
  },
  {
    personKey: 'turner', defTitle: '주택도시개발장관',
    startYear: 2025, startMonth: 2, startDay: 5,
    appointmentDetail: '2024년 12월 지명, 2025년 2월 5일 상원 인준(55대44)을 거쳐 같은 날 클래런스 토머스 대법관 주재로 취임했다.',
    notes: 'NFL 코너백 출신, 트럼프 1기 백악관 기회·재활성화위원회 상임이사.',
  },
  {
    personKey: 'duffy', defTitle: '교통장관',
    startYear: 2025, startMonth: 1, startDay: 28,
    appointmentDetail: '2024년 11월 지명, 2025년 1월 28일 상원 인준을 거쳐 같은 날 취임했다.',
    notes: '전 연방 하원의원(위스콘신), MTV 리얼리티쇼 출연 이력으로도 알려짐.',
  },
  {
    personKey: 'wright', defTitle: '에너지장관',
    startYear: 2025, startMonth: 2, startDay: 3,
    appointmentDetail: '2024년 11월 지명, 2025년 2월 3일 상원 인준(59대38)을 거쳐 같은 날 취임했다.',
    notes: '셰일가스 수압파쇄 기업 리버티 에너지 창업자 겸 CEO 출신.',
  },
  {
    personKey: 'mcmahon', defTitle: '교육장관',
    termNumber: 13,
    startYear: 2025, startMonth: 3, startDay: 3,
    appointmentDetail: '2024년 11월 지명, 2025년 3월 3일 상원 인준(51대45)을 거쳐 같은 날 제13대 교육장관으로 취임했다.',
    notes: 'WWE 공동창업자 겸 前 CEO, 트럼프 1기 중소기업청장(2017~2019) 출신.',
  },
  {
    personKey: 'collins', defTitle: '보훈장관',
    termNumber: 12,
    startYear: 2025, startMonth: 2, startDay: 5,
    appointmentDetail: '2024년 11월 지명, 2025년 2월 4일 상원 인준(77대23)을 거쳐 이튿날 클래런스 토머스 대법관 주재로 취임했다.',
    notes: '9·11 이후 참전용사 출신으로는 최초의 보훈장관. 공군 예비군 군종장교(대령) 경력.',
  },
  {
    personKey: 'mullin', defTitle: '국토안보장관',
    startYear: 2026, startMonth: 3, startDay: 24,
    appointmentDetail: '크리스티 노엄 경질 직후 지명, 2026년 3월 23일 상원 인준을 거쳐 이튿날 팸 본디 당시 법무장관 주재로 취임했다. 취임과 동시에 연방 상원의원직을 사퇴했다.',
    notes: '전 연방 상원의원(오클라호마). 배관업체 창업자 출신 기업인.',
  },
  {
    personKey: 'noem', defTitle: '국토안보장관',
    startYear: 2025, startMonth: 1, startDay: 25,
    endYear: 2026, endMonth: 3, endDay: 24,
    endReason: TenureEndReason.REMOVAL,
    endReasonDetail: '예산 오남용·해안경비대 자산의 사적 사용·개인 비위 의혹에 대한 청문회 이후 2026년 3월 24일 트럼프에 의해 경질되고 "아메리카 대륙 방패" 특사로 재배치됐다.',
    appointmentDetail: '2024년 11월 지명, 2025년 1월 25일 상원 인준을 거쳐 같은 날 취임했다.',
    notes: '사우스다코타 주지사(2019~2025) 출신, 코로나19 방역 강경 반대 노선으로 전국적 인지도.',
  },
]

// ── 부처(AdministrationDepartment) 15개 — 재임의 「소속 부처」란은 title이 아니라
//    administrationDepartmentId로 채워진다. 이게 없으면 어드민에 "부처 미지정"으로 뜬다.
interface DepartmentSpec {
  defTitle: string
  deptName: string
  categoryName: string
  description: string
}

const DEPARTMENTS: DepartmentSpec[] = [
  { defTitle: '국무장관', deptName: '미국 국무부', categoryName: '외교', description: '외교·조약·여권 등 대외 관계를 총괄하는 미국 연방행정부 최선임 부처(1789 설치).' },
  { defTitle: '재무장관', deptName: '미국 재무부', categoryName: '재정·경제', description: '조세·국채·통화 정책과 연방 재정을 총괄하는 부처(1789 설치).' },
  { defTitle: '국방장관', deptName: '미국 국방부', categoryName: '국방', description: '육·해·공군·해병대·우주군을 총괄하는 국방 부처. 1947년 국가안보법으로 통합 설치.' },
  { defTitle: '법무장관', deptName: '미국 법무부', categoryName: '법무', description: '연방 검찰·FBI 등을 관할하며 법무장관이 검찰총장을 겸하는 부처(1870 설치).' },
  { defTitle: '내무장관', deptName: '미국 내무부', categoryName: '환경', description: '연방 공유지·국립공원·야생동물·원주민 관련 업무를 관할하는 부처(1849 설치).' },
  { defTitle: '농무장관', deptName: '미국 농무부', categoryName: '농림·해양', description: '농업 정책·식품안전·산림청 등을 관할하는 부처.' },
  { defTitle: '상무장관', deptName: '미국 상무부', categoryName: '산업·에너지', description: '무역·통계(센서스)·특허·해양대기청(NOAA) 등을 관할하는 부처.' },
  { defTitle: '노동장관', deptName: '미국 노동부', categoryName: '고용·노동', description: '고용·임금·산업안전·노동통계를 관할하는 부처.' },
  { defTitle: '보건복지장관', deptName: '미국 보건복지부', categoryName: '보건·복지', description: '공중보건·메디케어·메디케이드·식품의약국(FDA)을 관할하는 부처.' },
  { defTitle: '주택도시개발장관', deptName: '미국 주택도시개발부', categoryName: '국토·교통', description: '주택 정책·공정주거·도시개발을 관할하는 부처(1965 설치).' },
  { defTitle: '교통장관', deptName: '미국 교통부', categoryName: '국토·교통', description: '연방항공청·연방고속도로청 등 교통 인프라 전반을 관할하는 부처(1966 설치).' },
  { defTitle: '에너지장관', deptName: '미국 에너지부', categoryName: '산업·에너지', description: '핵무기 관리·에너지 정책·국립연구소를 관할하는 부처(1977 설치).' },
  { defTitle: '교육장관', deptName: '미국 교육부', categoryName: '교육', description: '연방 교육 정책·학자금 지원을 관할하는 부처(1979 설치).' },
  { defTitle: '보훈장관', deptName: '미국 보훈부', categoryName: '보건·복지', description: '참전용사 의료·연금·복지를 관할하는 부처(1989 내각급 승격).' },
  { defTitle: '국토안보장관', deptName: '미국 국토안보부', categoryName: '행정·안전', description: '테러 대응·국경 관리·재난 대응(FEMA)·이민 등을 관할하는 부처(2002 9·11 이후 신설).' },
]

// ── 대통령 본인 (Cabinet의 head) ─────────────────────────────────────────────
// 행정부 뷰가 Cabinet 테이블 기준이라, 장관 재임만으로는 노출되지 않는다 — 트럼프 본인의
// HEAD_OF_STATE 재임과 그걸 head로 하는 Cabinet 행이 반드시 함께 있어야 한다.
const TRUMP_ORIGINAL_NAME = 'Donald John Trump'
const PRESIDENT_TENURE = {
  termNumber: 47,
  startYear: 2025, startMonth: 1, startDay: 20,
  appointmentDetail: '2024년 11월 5일 대선에서 당선, 2025년 1월 20일 취임해 제47대 대통령이 되었다. 1885·1893년 두 차례 재임한 그로버 클리블랜드(22·24대) 이후 132년 만에 비연속 2회 임기를 지낸 두 번째 대통령이다.',
  notes: '2017~2021년 제45대에 이어 2025년 제47대로 재취임 — 비연속 2회 임기.',
  cabinetName: '트럼프 2기 행정부',
}

function toDate(y: number, m?: number, d?: number): Date {
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export async function seedTrumpCabinet(prisma: PrismaService): Promise<void> {
  console.log('\n🇺🇸 트럼프 2기 내각 각료 시딩 시작 (기존 데이터 보존 모드)...')

  const admin = await prisma.account.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.warn('  ⚠️  admin 계정이 없어 시딩을 건너뜀 (먼저 admin.seed 실행 필요)')
    return
  }

  const usa = await prisma.country.findFirst({ where: { name: '미국' }, select: { id: true } })
  if (!usa) {
    console.warn('  ⚠️  "미국" 국가 미존재 — 먼저 seedCountries 실행 필요. 시딩 중단.')
    return
  }

  // ── 0) 트럼프 본인 대통령 재임 + Cabinet ─────────────────────────────────
  // 행정부 뷰(GET /government-positions/cabinets)는 Cabinet 테이블 기준이라 이 단계 없이는
  // 장관 재임 18건이 전부 있어도 "행정부" 화면에 아무것도 뜨지 않는다.
  let trumpPerson = await prisma.person.findFirst({ where: { originalName: TRUMP_ORIGINAL_NAME } })
  if (!trumpPerson) {
    trumpPerson = await prisma.person.create({
      data: {
        name: '도널드',
        surname: '트럼프',
        originalName: TRUMP_ORIGINAL_NAME,
        birthDate: toDate(1946, 6, 14),
        birthEra: 'AD' as any,
        isAlive: true,
        gender: 'MALE',
        nameDisplayOrder: 'western' as any,
        birthPlaceText: '미국 뉴욕주 뉴욕시 퀸스',
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 인물 생성: ${TRUMP_ORIGINAL_NAME} (id=${trumpPerson.id})`)
  } else {
    console.log(`  ⏭️  인물 이미 존재: ${TRUMP_ORIGINAL_NAME}`)
  }

  const presidentDef = await prisma.governmentPositionDefinition.findFirst({
    where: { title: '대통령', positionType: GovernmentPositionType.HEAD_OF_STATE },
    select: { id: true },
  })

  let presidentTenure = await prisma.governmentPositionTenure.findFirst({
    where: {
      personId: trumpPerson.id,
      countryId: usa.id,
      positionType: GovernmentPositionType.HEAD_OF_STATE,
      termNumber: PRESIDENT_TENURE.termNumber,
    },
  })
  if (!presidentTenure) {
    presidentTenure = await prisma.governmentPositionTenure.create({
      data: {
        personId: trumpPerson.id,
        countryId: usa.id,
        positionDefinitionId: presidentDef?.id ?? undefined,
        positionType: GovernmentPositionType.HEAD_OF_STATE,
        title: '대통령',
        termNumber: PRESIDENT_TENURE.termNumber,
        startDate: toDate(PRESIDENT_TENURE.startYear, PRESIDENT_TENURE.startMonth, PRESIDENT_TENURE.startDay),
        appointmentMethod: AppointmentMethod.INDIRECT_ELECTION,
        appointmentDetail: PRESIDENT_TENURE.appointmentDetail,
        notes: PRESIDENT_TENURE.notes,
        mandateSource: TenureMandateSource.ELECTION,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: 대통령(제${PRESIDENT_TENURE.termNumber}대) — trump (${PRESIDENT_TENURE.startYear}~현재)`)
  } else {
    console.log(`  ⏭️  재임 스킵 (이미 존재): 대통령(제${PRESIDENT_TENURE.termNumber}대)`)
  }

  let cabinet = await prisma.cabinet.findUnique({ where: { headTenureId: presidentTenure.id } })
  if (!cabinet) {
    cabinet = await prisma.cabinet.create({
      data: { headTenureId: presidentTenure.id, name: PRESIDENT_TENURE.cabinetName, accountId: admin.id },
    })
    console.log(`  🏛️  내각: ${PRESIDENT_TENURE.cabinetName}`)
  } else {
    console.log(`  ⏭️  내각 스킵 (이미 존재): ${cabinet.name ?? PRESIDENT_TENURE.cabinetName}`)
  }
  const cabinetId = cabinet.id

  // ── 0-1) 부처(AdministrationDepartment) 15개 — defTitle → deptId ────────
  const deptIdByTitle = new Map<string, string>()
  for (const d of DEPARTMENTS) {
    const category = await prisma.administrationDepartmentCategory.findFirst({
      where: { name: d.categoryName },
      select: { id: true },
    })
    let dept = await prisma.administrationDepartment.findFirst({
      where: { name: d.deptName, countryId: usa.id },
      select: { id: true },
    })
    if (!dept) {
      dept = await prisma.administrationDepartment.create({
        data: {
          name: d.deptName,
          countryId: usa.id,
          categoryId: category?.id ?? null,
          description: d.description,
        },
        select: { id: true },
      })
      console.log(`  ✅ 부처: ${d.deptName}`)
    } else {
      console.log(`  ⏭️  부처 스킵 (이미 존재): ${d.deptName}`)
    }
    deptIdByTitle.set(d.defTitle, dept.id)
  }

  // ── 1) 인물 18명 등록 ────────────────────────────────────────────────────
  const personIdByKey = new Map<string, string>()
  for (const p of PERSONS) {
    let person = await prisma.person.findFirst({ where: { originalName: p.originalName } })
    if (person) {
      const patch: Record<string, unknown> = {}
      if (!person.biography) patch.biography = p.biography
      if (!person.birthPlaceText) patch.birthPlaceText = p.birthPlaceText
      if (Object.keys(patch).length > 0) {
        person = await prisma.person.update({ where: { id: person.id }, data: patch })
        console.log(`  🔧 보강: ${p.originalName} (${Object.keys(patch).join(', ')})`)
      } else {
        console.log(`  ⏭️  인물 이미 존재: ${p.originalName}`)
      }
    } else {
      person = await prisma.person.create({
        data: {
          name: p.name,
          surname: p.surname,
          originalName: p.originalName,
          biography: p.biography,
          birthDate: toDate(p.birthYear, p.birthMonth, p.birthDay),
          birthEra: 'AD' as any,
          isAlive: true,
          gender: p.gender,
          nameDisplayOrder: 'western' as any,
          birthPlaceText: p.birthPlaceText,
          accountId: admin.id,
        },
      })
      console.log(`  ✅ 인물 생성: ${p.originalName} (id=${person.id})`)
    }
    personIdByKey.set(p.key, person.id)

    const affExists = await prisma.personCountryAffiliation.findFirst({
      where: { personId: person.id, countryId: usa.id, affiliationType: 'CITIZENSHIP' as any },
    })
    if (!affExists) {
      await prisma.personCountryAffiliation.create({
        data: { personId: person.id, countryId: usa.id, affiliationType: 'CITIZENSHIP' as any, priority: 0 },
      })
      console.log(`  ✅ 소속국가: ${p.originalName} → 미국`)
    }
  }

  // ── 2) 재임(GovernmentPositionTenure) 18건 ──────────────────────────────
  for (const t of TENURES) {
    const personId = personIdByKey.get(t.personKey)
    if (!personId) continue

    const def = await prisma.governmentPositionDefinition.findFirst({
      where: { title: t.defTitle, positionType: GovernmentPositionType.CABINET_MINISTER },
      select: { id: true },
    })
    if (!def) {
      console.warn(`  ⚠️  관직 정의 없음: ${t.defTitle} — seedGovernmentPositionDefinitions 먼저 실행 필요. 이 재임은 건너뜀.`)
      continue
    }

    const existing = await prisma.governmentPositionTenure.findFirst({
      where: {
        personId,
        countryId: usa.id,
        positionType: GovernmentPositionType.CABINET_MINISTER,
        title: t.defTitle,
      },
    })
    const departmentId = deptIdByTitle.get(t.defTitle)

    if (existing) {
      const patch: Record<string, unknown> = {}
      if (!existing.appointmentDetail) patch.appointmentDetail = t.appointmentDetail
      if (!existing.cabinetId) patch.cabinetId = cabinetId
      if (!existing.administrationDepartmentId && departmentId) patch.administrationDepartmentId = departmentId
      if (Object.keys(patch).length > 0) {
        await prisma.governmentPositionTenure.update({ where: { id: existing.id }, data: patch })
        console.log(`  🔧 재임 보강: ${t.defTitle} (${t.personKey}) — ${Object.keys(patch).join(', ')}`)
      } else {
        console.log(`  ⏭️  재임 스킵 (이미 존재): ${t.defTitle} (${t.personKey})`)
      }
      continue
    }

    await prisma.governmentPositionTenure.create({
      data: {
        personId,
        countryId: usa.id,
        positionDefinitionId: def.id,
        positionType: GovernmentPositionType.CABINET_MINISTER,
        title: t.defTitle,
        termNumber: t.termNumber,
        startDate: toDate(t.startYear, t.startMonth, t.startDay),
        endDate: t.endYear ? toDate(t.endYear, t.endMonth, t.endDay) : undefined,
        appointmentMethod: AppointmentMethod.APPOINTMENT,
        appointmentDetail: t.appointmentDetail,
        endReason: t.endReason,
        endReasonDetail: t.endReasonDetail,
        notes: t.notes,
        mandateSource: TenureMandateSource.APPOINTMENT,
        cabinetId,
        administrationDepartmentId: departmentId,
        accountId: admin.id,
      },
    })
    console.log(`  ✅ 재임: ${t.defTitle} — ${t.personKey} (${t.startYear}~${t.endYear ?? '현재'})`)
  }

  console.log('✅ 트럼프 2기 내각 각료 시딩 완료\n')
}
