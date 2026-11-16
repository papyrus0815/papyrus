/**
 * 부처 이름의 **틀(frame)** — 나라마다 같은 자리를 다른 이름으로 부른다.
 *
 * 대시보드의 「기본 틀에서 고르기」는 오래 '외무부·국방부…' 13개를 하드코딩해 뒀다.
 * 근대 일본은 외무성·내무성·대장성이었고 우두머리는 장관이 아니라 대신이었으며,
 * 조선은 이조·호조·예조였다. 한국식 '부'만 권하면 일본 지면을 만드는 사람은 권유를
 * 전부 지우고 손으로 다시 쳐야 한다.
 *
 * 그래서 이름을 고정값이 아니라 **틀의 한 변형**으로 둔다. 기본 틀('부')은 그대로
 * 남기고, 나라·시대에 맞는 틀을 골라 담을 수 있게 한다. 담은 뒤의 이름은 언제든
 * 고칠 수 있다(부처 이름은 원래 자유 입력 — 여기서 정하는 건 출발점뿐이다).
 *
 * `categoryName`은 전역 카테고리(administration_department_category.name)와 맞춰
 * 둔다. 예전 프리셋은 카테고리 없이 만들어서, 대시보드에서 만든 부처가 「행정조직 →
 * 중앙부처」의 어느 카테고리 탭에도 안 나타났다.
 */

import type { AdministrationDepartmentKind } from '@/shared/api/administration-department'

export type DepartmentFrameItem = {
  /** 명칭 체계가 달라도 같은 자리를 가리키는 키 (외교·국방…) */
  slot: string
  name: string
  /** 전역 부처 카테고리 이름 — 만들 때 categoryId로 환원한다 */
  categoryName: string
  /** 이 부처의 장관·수장 직함 예시 (예: 국무장관, 대장대신, 이조판서) */
  headPositionTitle?: string
  /** 기관 성격 (미지정 시 MINISTRY) */
  kind?: AdministrationDepartmentKind
}

export type DepartmentNameFrame = {
  id: string
  /** 선택기에 보이는 이름 */
  label: string
  /** 이 틀에서 부처 우두머리를 부르는 말 (장관·대신·부장·판서·상서) */
  headTitle: string
  /** 언제 쓰는 틀인지 */
  hint: string
  items: DepartmentFrameItem[]
}

export type DepartmentFrameCountryContext = {
  name?: string | null
  isoCode?: string | null
  isHistorical?: boolean
}

export const DEPARTMENT_NAME_FRAMES: DepartmentNameFrame[] = [
  {
    id: 'bu',
    label: '부(部) — 기본 근현대',
    headTitle: '장관',
    hint: '일반적인 근현대 국가 부처 체계 (외무부·국방부·재무부…)',
    items: [
      { slot: 'foreign', name: '외무부', categoryName: '외교', headPositionTitle: '외무장관' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방장관' },
      { slot: 'finance', name: '재무부', categoryName: '재정·경제', headPositionTitle: '재무장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무장관' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전', headPositionTitle: '내무장관' },
      { slot: 'education', name: '교육부', categoryName: '교육', headPositionTitle: '교육장관' },
      { slot: 'health', name: '보건부', categoryName: '보건·복지', headPositionTitle: '보건장관' },
      { slot: 'labor', name: '노동부', categoryName: '고용·노동', headPositionTitle: '노동장관' },
      { slot: 'industry', name: '산업부', categoryName: '산업·에너지', headPositionTitle: '산업장관' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양', headPositionTitle: '농업장관' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통', headPositionTitle: '교통장관' },
      { slot: 'culture', name: '문화부', categoryName: '문화·체육', headPositionTitle: '문화장관' },
      { slot: 'environment', name: '환경부', categoryName: '환경', headPositionTitle: '환경장관' },
    ],
  },
  {
    id: 'kr-modern',
    label: '부(部) — 현대 대한민국',
    headTitle: '장관',
    hint: '대한민국 현행 중앙행정기관 (기획재정부·외교부·행정안전부…)',
    items: [
      { slot: 'finance', name: '기획재정부', categoryName: '재정·경제', headPositionTitle: '기획재정부 장관' },
      { slot: 'foreign', name: '외교부', categoryName: '외교', headPositionTitle: '외교부 장관' },
      { slot: 'unification', name: '통일부', categoryName: '외교', headPositionTitle: '통일부 장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무부 장관' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방부 장관' },
      { slot: 'interior', name: '행정안전부', categoryName: '행정·안전', headPositionTitle: '행정안전부 장관' },
      { slot: 'education', name: '교육부', categoryName: '교육', headPositionTitle: '교육부 장관' },
      { slot: 'communications', name: '과학기술정보통신부', categoryName: '정보·통신', headPositionTitle: '과학기술정보통신부 장관' },
      { slot: 'culture', name: '문화체육관광부', categoryName: '문화·체육', headPositionTitle: '문화체육관광부 장관' },
      { slot: 'agriculture', name: '농림축산식품부', categoryName: '농림·해양', headPositionTitle: '농림축산식품부 장관' },
      { slot: 'industry', name: '산업통상자원부', categoryName: '산업·에너지', headPositionTitle: '산업통상자원부 장관' },
      { slot: 'health', name: '보건복지부', categoryName: '보건·복지', headPositionTitle: '보건복지부 장관' },
      { slot: 'environment', name: '환경부', categoryName: '환경', headPositionTitle: '환경부 장관' },
      { slot: 'labor', name: '고용노동부', categoryName: '고용·노동', headPositionTitle: '고용노동부 장관' },
      { slot: 'transport', name: '국토교통부', categoryName: '국토·교통', headPositionTitle: '국토교통부 장관' },
      { slot: 'maritime', name: '해양수산부', categoryName: '농림·해양', headPositionTitle: '해양수산부 장관' },
    ],
  },
  {
    id: 'us',
    label: '부(Department) — 미국 연방 행정부',
    headTitle: '장관(Secretary)',
    hint: '미국 대통령제 내각 — 외교는 「국무부」, 법무는 「법무부(법무장관)」',
    items: [
      { slot: 'foreign', name: '국무부', categoryName: '외교', headPositionTitle: '국무장관' },
      { slot: 'finance', name: '재무부', categoryName: '재정·경제', headPositionTitle: '재무장관' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무장관' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전', headPositionTitle: '내무장관' },
      { slot: 'agriculture', name: '농무부', categoryName: '농림·해양', headPositionTitle: '농무장관' },
      { slot: 'industry', name: '상무부', categoryName: '산업·에너지', headPositionTitle: '상무장관' },
      { slot: 'labor', name: '노동부', categoryName: '고용·노동', headPositionTitle: '노동장관' },
      { slot: 'health', name: '보건복지부', categoryName: '보건·복지', headPositionTitle: '보건복지장관' },
      { slot: 'housing', name: '주택도시개발부', categoryName: '국토·교통', headPositionTitle: '주택도시개발장관' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통', headPositionTitle: '교통장관' },
      { slot: 'energy', name: '에너지부', categoryName: '산업·에너지', headPositionTitle: '에너지장관' },
      { slot: 'education', name: '교육부', categoryName: '교육', headPositionTitle: '교육장관' },
      { slot: 'veterans', name: '보훈부', categoryName: '행정·안전', headPositionTitle: '보훈장관' },
      { slot: 'homeland', name: '국토안보부', categoryName: '행정·안전', headPositionTitle: '국토안보장관' },
      { slot: 'army', name: '전쟁부', categoryName: '국방', headPositionTitle: '전쟁장관' },
      { slot: 'navy', name: '해군부', categoryName: '국방', headPositionTitle: '해군장관' },
    ],
  },
  {
    id: 'uk',
    label: '부(Ministry/Office) — 영국 내각',
    headTitle: '장관(대신)',
    hint: '영국 의원내각제 — 4대 각료(총리·재무·외무·내무) 및 내각 부처',
    items: [
      { slot: 'finance', name: '재무부', categoryName: '재정·경제', headPositionTitle: '재무장관' },
      { slot: 'foreign', name: '외무부', categoryName: '외교', headPositionTitle: '외무장관' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전', headPositionTitle: '내무장관' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무장관' },
      { slot: 'industry', name: '상무부', categoryName: '산업·에너지', headPositionTitle: '상무장관' },
      { slot: 'health', name: '보건사회복지부', categoryName: '보건·복지', headPositionTitle: '보건장관' },
      { slot: 'education', name: '교육부', categoryName: '교육', headPositionTitle: '교육장관' },
      { slot: 'labor', name: '노동연금부', categoryName: '고용·노동', headPositionTitle: '노동장관' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통', headPositionTitle: '교통장관' },
      { slot: 'agriculture', name: '환경식품농촌부', categoryName: '농림·해양', headPositionTitle: '환경식품농촌장관' },
      { slot: 'army', name: '전쟁부', categoryName: '국방', headPositionTitle: '전쟁장관' },
      { slot: 'navy', name: '해군성', categoryName: '국방', headPositionTitle: '해군대신' },
      { slot: 'colonial', name: '식민지부', categoryName: '기타', headPositionTitle: '식민지장관' },
      { slot: 'india', name: '인도부', categoryName: '기타', headPositionTitle: '인도장관' },
    ],
  },
  {
    id: 'eu-continental',
    label: '부(Ministry) — 유럽 대륙식',
    headTitle: '장관',
    hint: '프랑스·독일·러시아·이탈리아 등 근현대 유럽 내각',
    items: [
      { slot: 'foreign', name: '외무부', categoryName: '외교', headPositionTitle: '외무장관' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전', headPositionTitle: '내무장관' },
      { slot: 'finance', name: '재무부', categoryName: '재정·경제', headPositionTitle: '재무장관' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방장관' },
      { slot: 'army', name: '전쟁부', categoryName: '국방', headPositionTitle: '전쟁장관' },
      { slot: 'navy', name: '해군부', categoryName: '국방', headPositionTitle: '해군장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무장관' },
      { slot: 'industry', name: '경제산업부', categoryName: '산업·에너지', headPositionTitle: '경제장관' },
      { slot: 'education', name: '국민교육부', categoryName: '교육', headPositionTitle: '교육장관' },
      { slot: 'labor', name: '노동사회부', categoryName: '고용·노동', headPositionTitle: '노동장관' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양', headPositionTitle: '농업장관' },
      { slot: 'transport', name: '공공사업교통부', categoryName: '국토·교통', headPositionTitle: '교통장관' },
      { slot: 'culture', name: '문화부', categoryName: '문화·체육', headPositionTitle: '문화장관' },
      { slot: 'colonial', name: '식민지부', categoryName: '기타', headPositionTitle: '식민지장관' },
    ],
  },
  {
    id: 'jp-imperial',
    label: '성(省) — 일본 제국',
    headTitle: '대신',
    hint: '메이지~1947. 외무대신·내무대신처럼 우두머리는 「대신」',
    items: [
      { slot: 'foreign', name: '외무성', categoryName: '외교', headPositionTitle: '외무대신' },
      { slot: 'interior', name: '내무성', categoryName: '행정·안전', headPositionTitle: '내무대신' },
      { slot: 'finance', name: '대장성', categoryName: '재정·경제', headPositionTitle: '대장대신' },
      { slot: 'army', name: '육군성', categoryName: '국방', headPositionTitle: '육군대신' },
      { slot: 'navy', name: '해군성', categoryName: '국방', headPositionTitle: '해군대신' },
      { slot: 'justice', name: '사법성', categoryName: '법무', headPositionTitle: '사법대신' },
      { slot: 'education', name: '문부성', categoryName: '교육', headPositionTitle: '문부대신' },
      { slot: 'communications', name: '체신성', categoryName: '정보·통신', headPositionTitle: '체신대신' },
      { slot: 'industry', name: '농상무성', categoryName: '농림·해양', headPositionTitle: '농상무대신' },
      { slot: 'colonial', name: '척무성', categoryName: '기타', headPositionTitle: '척무대신' },
      {
        slot: 'court',
        name: '궁내성',
        categoryName: '기타',
        headPositionTitle: '궁내대신',
        kind: 'ROYAL_HOUSEHOLD',
      },
    ],
  },
  {
    id: 'jp-modern',
    label: '성(省) — 현대 일본',
    headTitle: '대신',
    hint: '1947년 이후 — 방위성·총무성·재무성 체제',
    items: [
      { slot: 'foreign', name: '외무성', categoryName: '외교', headPositionTitle: '외무대신' },
      { slot: 'defense', name: '방위성', categoryName: '국방', headPositionTitle: '방위대신' },
      { slot: 'finance', name: '재무성', categoryName: '재정·경제', headPositionTitle: '재무대신' },
      { slot: 'justice', name: '법무성', categoryName: '법무', headPositionTitle: '법무대신' },
      { slot: 'interior', name: '총무성', categoryName: '행정·안전', headPositionTitle: '총무대신' },
      { slot: 'education', name: '문부과학성', categoryName: '교육', headPositionTitle: '문부과학대신' },
      { slot: 'health', name: '후생노동성', categoryName: '보건·복지', headPositionTitle: '후생노동대신' },
      { slot: 'industry', name: '경제산업성', categoryName: '산업·에너지', headPositionTitle: '경제산업대신' },
      { slot: 'agriculture', name: '농림수산성', categoryName: '농림·해양', headPositionTitle: '농림수산대신' },
      { slot: 'transport', name: '국토교통성', categoryName: '국토·교통', headPositionTitle: '국토교통대신' },
      { slot: 'environment', name: '환경성', categoryName: '환경', headPositionTitle: '환경대신' },
    ],
  },
  {
    id: 'cn',
    label: '부(部) — 중국식',
    headTitle: '부장',
    hint: '중화민국·중화인민공화국 — 외교부·재정부·공안부 (우두머리: 부장)',
    items: [
      { slot: 'foreign', name: '외교부', categoryName: '외교', headPositionTitle: '외교부장' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방부장' },
      { slot: 'finance', name: '재정부', categoryName: '재정·경제', headPositionTitle: '재정부장' },
      { slot: 'justice', name: '사법부', categoryName: '법무', headPositionTitle: '사법부장' },
      { slot: 'interior', name: '공안부', categoryName: '행정·안전', headPositionTitle: '공안부장' },
      { slot: 'education', name: '교육부', categoryName: '교육', headPositionTitle: '교육부장' },
      { slot: 'health', name: '위생부', categoryName: '보건·복지', headPositionTitle: '위생부장' },
      { slot: 'labor', name: '노동부', categoryName: '고용·노동', headPositionTitle: '노동부장' },
      { slot: 'industry', name: '공업부', categoryName: '산업·에너지', headPositionTitle: '공업부장' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양', headPositionTitle: '농업부장' },
      { slot: 'transport', name: '교통부', categoryName: '국토·교통', headPositionTitle: '교통부장' },
      { slot: 'culture', name: '문화부', categoryName: '문화·체육', headPositionTitle: '문화부장' },
    ],
  },
  {
    id: 'korean-empire',
    label: '부(部) — 대한제국·갑오개혁',
    headTitle: '대신',
    hint: '갑오개혁~대한제국기 — 외부·내부·탁지부·군부·법부·학부·농상공부',
    items: [
      { slot: 'interior', name: '내부', categoryName: '행정·안전', headPositionTitle: '내부대신' },
      { slot: 'foreign', name: '외부', categoryName: '외교', headPositionTitle: '외부대신' },
      { slot: 'finance', name: '탁지부', categoryName: '재정·경제', headPositionTitle: '탁지부대신' },
      { slot: 'defense', name: '군부', categoryName: '국방', headPositionTitle: '군부대신' },
      { slot: 'justice', name: '법부', categoryName: '법무', headPositionTitle: '법부대신' },
      { slot: 'education', name: '학부', categoryName: '교육', headPositionTitle: '학부대신' },
      { slot: 'industry', name: '농상공부', categoryName: '산업·에너지', headPositionTitle: '농상공부대신' },
      {
        slot: 'court',
        name: '궁내부',
        categoryName: '기타',
        headPositionTitle: '궁내부대신',
        kind: 'ROYAL_HOUSEHOLD',
      },
    ],
  },
  {
    id: 'joseon',
    label: '조(曹) — 조선 6조',
    headTitle: '판서',
    hint: '조선 의정부·6조 체제 — 이조·호조·예조·병조·형조·공조 (우두머리: 판서)',
    items: [
      { slot: 'interior', name: '이조', categoryName: '행정·안전', headPositionTitle: '이조판서' },
      { slot: 'finance', name: '호조', categoryName: '재정·경제', headPositionTitle: '호조판서' },
      { slot: 'foreign', name: '예조', categoryName: '외교', headPositionTitle: '예조판서' },
      { slot: 'defense', name: '병조', categoryName: '국방', headPositionTitle: '병조판서' },
      { slot: 'justice', name: '형조', categoryName: '법무', headPositionTitle: '형조판서' },
      { slot: 'transport', name: '공조', categoryName: '국토·교통', headPositionTitle: '공조판서' },
    ],
  },
  {
    id: 'austria-hungary',
    label: '공동성·왕립 부처 — 오스트리아-헝가리·합스부르크',
    headTitle: '장관(대신)',
    hint: '1867 대타협 체제 — 제국·왕실 3대 공동성(외무·전쟁·공동재무) 및 오스트리아·헝가리 왕립 내각',
    items: [
      { slot: 'foreign', name: '제국·왕실 외무성', categoryName: '외교', headPositionTitle: '공동외무대신' },
      { slot: 'army', name: '제국·왕실 전쟁성', categoryName: '국방', headPositionTitle: '공동전쟁대신' },
      { slot: 'joint-finance', name: '제국·왕실 공동재무성', categoryName: '재정·경제', headPositionTitle: '공동재무대신' },
      { slot: 'defense', name: '국방부', categoryName: '국방', headPositionTitle: '국방장관' },
      { slot: 'interior', name: '내무부', categoryName: '행정·안전', headPositionTitle: '내무장관' },
      { slot: 'finance', name: '재무부', categoryName: '재정·경제', headPositionTitle: '재무장관' },
      { slot: 'justice', name: '법무부', categoryName: '법무', headPositionTitle: '법무장관' },
      { slot: 'education', name: '종교교육부', categoryName: '교육', headPositionTitle: '종교교육장관' },
      { slot: 'industry', name: '상무부', categoryName: '산업·에너지', headPositionTitle: '상무장관' },
      { slot: 'agriculture', name: '농업부', categoryName: '농림·해양', headPositionTitle: '농업장관' },
    ],
  },
  {
    id: 'socialist-commissariat',
    label: '인민위원부(Narkomat) — 초기 소련·사회주의',
    headTitle: '인민위원',
    hint: '1917~1946 소련 인민위원회의 체제 — 외무·국방·내무인민위원부 및 국가계획위원회',
    items: [
      { slot: 'foreign', name: '외무인민위원부', categoryName: '외교', headPositionTitle: '외무인민위원' },
      { slot: 'defense', name: '국방인민위원부', categoryName: '국방', headPositionTitle: '국방인민위원' },
      { slot: 'navy', name: '해군인민위원부', categoryName: '국방', headPositionTitle: '해군인민위원' },
      { slot: 'interior', name: '내무인민위원부', categoryName: '행정·안전', headPositionTitle: '내무인민위원' },
      { slot: 'finance', name: '재정인민위원부', categoryName: '재정·경제', headPositionTitle: '재정인민위원' },
      { slot: 'justice', name: '사법인민위원부', categoryName: '법무', headPositionTitle: '사법인민위원' },
      {
        slot: 'planning',
        name: '국가계획위원회',
        categoryName: '기획·조정',
        headPositionTitle: '국가계획위원회 의장',
        kind: 'AGENCY',
      },
      { slot: 'industry', name: '중공업인민위원부', categoryName: '산업·에너지', headPositionTitle: '중공업인민위원' },
      { slot: 'education', name: '교육인민위원부', categoryName: '교육', headPositionTitle: '교육인민위원' },
      { slot: 'transport', name: '교통인민위원부', categoryName: '국토·교통', headPositionTitle: '교통인민위원' },
    ],
  },
  {
    id: 'socialist-ministry',
    label: '성·국가위원회 — 사회주의권 (소련 후기·동구권·북한)',
    headTitle: '상(부장)',
    hint: '1946년 이후 소련 각료회의·동유럽 인민공화국·북한 내각 (외무성·국방성·국가계획위원회…)',
    items: [
      { slot: 'foreign', name: '외무성', categoryName: '외교', headPositionTitle: '외무상' },
      { slot: 'defense', name: '국방성', categoryName: '국방', headPositionTitle: '국방상' },
      { slot: 'interior', name: '내무성', categoryName: '행정·안전', headPositionTitle: '내무상' },
      { slot: 'finance', name: '재정성', categoryName: '재정·경제', headPositionTitle: '재정상' },
      { slot: 'justice', name: '사법성', categoryName: '법무', headPositionTitle: '사법상' },
      {
        slot: 'planning',
        name: '국가계획위원회',
        categoryName: '기획·조정',
        headPositionTitle: '국가계획위원장',
        kind: 'AGENCY',
      },
      {
        slot: 'intelligence',
        name: '국가보안위원회',
        categoryName: '정보·정보기관',
        headPositionTitle: '국가보안위원장',
        kind: 'AGENCY',
      },
      { slot: 'education', name: '교육성', categoryName: '교육', headPositionTitle: '교육상' },
      { slot: 'culture', name: '문화성', categoryName: '문화·체육', headPositionTitle: '문화상' },
      { slot: 'health', name: '보건성', categoryName: '보건·복지', headPositionTitle: '보건상' },
    ],
  },
  {
    id: 'cn-imperial',
    label: '부(部) — 동아시아 전통 6부 (당·송·명·청·고려)',
    headTitle: '상서',
    hint: '수·당·송·명·청·고려 3성 6부제 — 이부·호부·예부·병부·형부·공부 (우두머리: 상서)',
    items: [
      { slot: 'interior', name: '이부', categoryName: '행정·안전', headPositionTitle: '이부상서' },
      { slot: 'finance', name: '호부', categoryName: '재정·경제', headPositionTitle: '호부상서' },
      { slot: 'foreign', name: '예부', categoryName: '외교', headPositionTitle: '예부상서' },
      { slot: 'defense', name: '병부', categoryName: '국방', headPositionTitle: '병부상서' },
      { slot: 'justice', name: '형부', categoryName: '법무', headPositionTitle: '형부상서' },
      { slot: 'transport', name: '공부', categoryName: '국토·교통', headPositionTitle: '공부상서' },
    ],
  },
]

export const DEFAULT_DEPARTMENT_FRAME_ID = 'bu'

export function getDepartmentNameFrame(frameId: string): DepartmentNameFrame {
  return (
    DEPARTMENT_NAME_FRAMES.find((frame) => frame.id === frameId) ??
    DEPARTMENT_NAME_FRAMES[0]
  )
}

const stripSpace = (value: string) => value.replace(/\s/g, '')

/**
 * 국가명·ISO 코드·역사국가 여부로 가장 어울리는 기본 부처 틀 ID를 추론한다.
 */
export function inferDepartmentFrameIdFromCountry(
  country?: DepartmentFrameCountryContext | null,
): string {
  if (!country) return DEFAULT_DEPARTMENT_FRAME_ID
  const name = (country.name ?? '').trim()
  const iso = (country.isoCode ?? '').trim().toUpperCase()

  if (/대한제국/.test(name)) return 'korean-empire'
  if (/조선민주주의|^북한$/.test(name) || iso === 'KP' || iso === 'PRK') {
    return 'socialist-ministry'
  }
  if (/조선/.test(name)) return 'joseon'
  if (/고려|발해|당나라|^당$|송나라|^송$|명나라|^명$|청나라|^청$|^수나라|^수$/.test(name)) {
    return 'cn-imperial'
  }
  if (/오스트리아[-\s·]*헝가리|합스부르크/.test(name)) {
    return 'austria-hungary'
  }
  if (/소비에트|소련/.test(name) || iso === 'SU' || iso === 'SUN') {
    return 'socialist-commissariat'
  }
  if (/인민공화국|민주공화국|사회주의\s*공화국/.test(name) && !/중화인민공화국|콩고|알제리|라오스/.test(name)) {
    return 'socialist-ministry'
  }
  if (/일본\s*제국|대일본\s*제국/.test(name)) return 'jp-imperial'
  if (iso === 'JP' || iso === 'JPN' || /^일본$/.test(name)) {
    return country.isHistorical ? 'jp-imperial' : 'jp-modern'
  }
  if (iso === 'KR' || iso === 'KOR' || /대한민국|^한국$/.test(name)) {
    return 'kr-modern'
  }
  if (iso === 'US' || iso === 'USA' || /미국|아메리카\s*합중국/.test(name)) {
    return 'us'
  }
  if (
    iso === 'GB' ||
    iso === 'GBR' ||
    iso === 'UK' ||
    /영국|대영\s*제국|그레이트\s*브리튼|잉글랜드/.test(name)
  ) {
    return 'uk'
  }
  if (
    iso === 'CN' ||
    iso === 'CHN' ||
    iso === 'TW' ||
    iso === 'TWN' ||
    /중화인민공화국|중화민국|^중국$/.test(name)
  ) {
    return 'cn'
  }
  if (
    /^(FR|FRA|DE|DEU|RU|RUS|IT|ITA|ES|ESP|AT|AUT|HU|HUN|PL|POL|NL|NLD|BE|BEL|SE|SWE|NO|NOR|DK|DNK|FI|FIN|CZ|CZE|PT|PRT|GR|GRC|RO|ROU|BG|BGR|RS|SRB|HR|HRV|UA|UKR|CH|CHE|TR|TUR)$/.test(
      iso,
    ) ||
    /프랑스|독일|프로이센|바이마르|러시아|이탈리아|스페인|오스트리아|헝가리|폴란드|네덜란드|벨기에|스웨덴|노르웨이|덴마크|핀란드|체코|포르투갈|그리스|루마니아|불가리아|세르비아|유고슬라비아|우크라이나|스위스|오스만|튀르키예|터키/.test(
      name,
    )
  ) {
    return 'eu-continental'
  }
  return DEFAULT_DEPARTMENT_FRAME_ID
}

/**
 * 이미 만들어 둔 부처 이름과 국가 컨텍스트로 이 나라가 쓰는 틀을 짐작한다.
 * 일본 지면에 외무성이 이미 있으면 다음 권유도 '성'이어야 하고,
 * 아직 부처가 0개일 때는 국가 컨텍스트(미국→us, 일본 제국→jp-imperial 등)를 따른다.
 */
export function inferDepartmentFrameId(
  existingNames: string[],
  country?: DepartmentFrameCountryContext | null,
): string {
  const countryFallback = inferDepartmentFrameIdFromCountry(country)
  const names = existingNames.map(stripSpace).filter(Boolean)
  if (names.length === 0) return countryFallback
  const scored = DEPARTMENT_NAME_FRAMES.map((frame) => ({
    id: frame.id,
    hits: frame.items.filter((item) =>
      names.some((name) => name === stripSpace(item.name) || name.includes(stripSpace(item.name))),
    ).length,
    isCountryDefault: frame.id === countryFallback,
  }))
  const best = scored.reduce((acc, row) => {
    if (row.hits > acc.hits) return row
    if (row.hits === acc.hits && row.isCountryDefault && !acc.isCountryDefault) {
      return row
    }
    return acc
  })
  return best.hits > 0 ? best.id : countryFallback
}

/**
 * 이 틀에서 아직 만들지 않은 항목만. 이미 있는 부처를 또 권하지 않는다.
 * 같은 자리를 다른 틀 이름으로 이미 만들어 뒀다면(외무부가 있는데 외무성을 권함)
 * 그것도 거른다 — 자리(slot)로 판단한다.
 */
export function suggestFrameItems(
  frame: DepartmentNameFrame,
  existingNames: string[],
): DepartmentFrameItem[] {
  const existing = existingNames.map(stripSpace).filter(Boolean)
  const takenSlots = new Set<string>()
  for (const candidate of DEPARTMENT_NAME_FRAMES) {
    for (const item of candidate.items) {
      if (existing.some((name) => name.includes(stripSpace(item.name)))) {
        takenSlots.add(item.slot)
      }
    }
  }
  return frame.items.filter((item) => !takenSlots.has(item.slot))
}

const KEYWORD_CATEGORY_RULES: Array<{ pattern: RegExp; categoryName: string }> = [
  {
    pattern: /외교|외무|국무부|국무성|통일|예조|예부|외부|대외관계/,
    categoryName: '외교',
  },
  {
    pattern: /국방|방위|전쟁|육군|해군|공군|군부|병조|병부|참모본부|군령|군무/,
    categoryName: '국방',
  },
  {
    pattern: /재무|재정|기획재정|대장|탁지|호조|호부|국고|세무|국세|관세/,
    categoryName: '재정·경제',
  },
  {
    pattern:
      /대법원|헌법재판소|대심원|최고재판소|연방대법원|최고법원|국회|의회|원로원|중의원|참의원|추밀원|중추원|선거관리위원|선관위/,
    categoryName: '기타',
  },
  {
    pattern: /법무|사법|법부|형조|형부|검찰|법제/,
    categoryName: '법무',
  },
  {
    pattern:
      /중앙정보|국가정보|국정원|안기부|보안본부|방첩|첩보|아프베어|게슈타포|비밀경찰|특무|정보국|정보원/,
    categoryName: '정보·정보기관',
  },
  {
    pattern: /내무|행정|안전|총무|공안|내부|이조|이부|보훈|국토안보|경찰|치안|인사혁신/,
    categoryName: '행정·안전',
  },
  {
    pattern: /기획조정|국무조정|경제기획|기획원|기획처|예산처|감사원|감찰|어사대|사헌부/,
    categoryName: '기획·조정',
  },
  { pattern: /교육|문부|학부/, categoryName: '교육' },
  { pattern: /과학기술|과기|연구개발|원자력|우주항공/, categoryName: '과학기술' },
  { pattern: /보건|복지|후생|위생|질병|식약/, categoryName: '보건·복지' },
  { pattern: /고용|노동|연금/, categoryName: '고용·노동' },
  { pattern: /여성|가족|보육/, categoryName: '여성·가족' },
  {
    pattern: /산업|상무|경제|공업|통상|에너지|농상공|중소벤처|군수|조달/,
    categoryName: '산업·에너지',
  },
  {
    pattern: /농림|농업|농무|해양|수산|농상무|축산|식량|산림/,
    categoryName: '농림·해양',
  },
  {
    pattern: /국토|교통|주택|공공사업|공조|공부|철도|해운|항공/,
    categoryName: '국토·교통',
  },
  { pattern: /정보통신|통신|체신|우정|디지털|방송통신/, categoryName: '정보·통신' },
  { pattern: /문화|체육|관광|선전|공보/, categoryName: '문화·체육' },
  { pattern: /환경|기후|기상/, categoryName: '환경' },
  {
    pattern: /궁내|식민|척무|인도부|종친|총독부|점령지|승정원|추밀원|비서실|관저/,
    categoryName: '기타',
  },
]

/** 타국 기관 비교 시 주요 직능별 시대·국가 동종 기관 예시 */
export const CROSS_COUNTRY_CATEGORY_EXAMPLES: Record<string, string> = {
  외교: '한국 외교부 · 미국 국무부 · 일본 외무성 · 영국 외무부 · 조선 예조',
  국방: '한국 국방부 · 미국 국방부/전쟁부 · 일본 방위성/육·해군성 · 조선 병조',
  '재정·경제': '한국 기획재정부 · 미국 재무부 · 일본 재무성/대장성 · 조선 호조',
  '행정·안전': '한국 행정안전부 · 영·미 내무부 · 일본 내무성/총무성 · 중국 공안부 · 조선 이조',
  법무: '한국·미국 법무부 · 일본 법무성/사법성 · 조선 형조',
  교육: '한국·미국 교육부 · 일본 문부과학성/문부성 · 대한제국 학부',
  '산업·에너지': '산업통상자원부 · 미국 상무부/에너지부 · 일본 경제산업성',
  '국토·교통': '국토교통부 · 미국 교통부/주택도시개발부 · 조선 공조',
  '농림·해양': '농림축산식품부 · 미국 농무부 · 일본 농림수산성',
  '보건·복지': '보건복지부 · 일본 후생노동성 · 영국 보건사회복지부',
  '고용·노동': '고용노동부 · 미국 노동부 · 영국 노동연금부',
  '정보·통신': '과학기술정보통신부 · 일본 체신성 · 우정성',
  과학기술: '과학기술처 · 국가과학기술위원회 · 우주항공청',
  '문화·체육': '문화체육관광부 · 프랑스 문화부 · 국민계몽선전성',
  환경: '한국 환경부 · 일본 환경성 · 미국 환경보호청(EPA)',
  '여성·가족': '여성가족부 · 아동가족청',
  '기획·조정': '국무조정실 · 경제기획원 · 감사원 · 조선 사헌부',
  '정보·정보기관': '국가정보원 · 미국 CIA · 독일 아프베어/RSHA · 소련 NKVD/KGB',
  기타: '궁내성/궁내부 · 추밀원 · 총독부 · 의회·사법 헌법기관',
}

/** 등록 사이드바에서 우선 노출할 핵심 직능 순서 */
export const CORE_CATEGORY_PRIORITY_NAMES: ReadonlyArray<string> = [
  '외교',
  '국방',
  '재정·경제',
  '행정·안전',
  '법무',
  '교육',
  '산업·에너지',
  '국토·교통',
  '정보·정보기관',
  '기획·조정',
  '보건·복지',
  '농림·해양',
  '고용·노동',
  '문화·체육',
  '정보·통신',
  '과학기술',
  '환경',
  '여성·가족',
  '기타',
]

const CATEGORY_SYNONYM_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ['외교', '외무', '외교·통일', '대외'],
  ['국방', '국방·군사', '국방·군무', '군사', '방위'],
  ['재정·경제', '재정', '재무', '경제·재정'],
  ['행정·안전', '내무', '행정', '내무·치안'],
  ['법무', '사법', '법무·사법'],
  ['정보·정보기관', '정보기관', '정보·치안', '첩보·방첩'],
  ['기획·조정', '기획', '감사·기획'],
  ['산업·에너지', '산업', '상무', '통상·산업'],
  ['국토·교통', '교통', '건설·교통'],
  ['농림·해양', '농림', '농업', '농수산'],
  ['보건·복지', '보건', '복지', '후생'],
  ['고용·노동', '노동'],
  ['문화·체육', '문화'],
  ['정보·통신', '통신', '체신'],
]

/**
 * 명시적 규칙에 매칭되는 직능 카테고리 이름만 반환 (매칭 실패 시 `null` 반환).
 * 입력창 타이핑 중 무관한 단어에 '기타'가 강제 선택되는 현상을 방지한다.
 */
export function inferExplicitDepartmentCategoryName(
  departmentName: string,
  preferredFrame?: DepartmentNameFrame,
): string | null {
  const normalized = stripSpace(departmentName)
  if (!normalized || normalized.length < 2) return null

  const framesToCheck = preferredFrame
    ? [
        preferredFrame,
        ...DEPARTMENT_NAME_FRAMES.filter(
          (candidateFrame) => candidateFrame.id !== preferredFrame.id,
        ),
      ]
    : DEPARTMENT_NAME_FRAMES

  for (const frame of framesToCheck) {
    const exact = frame.items.find((item) => stripSpace(item.name) === normalized)
    if (exact) return exact.categoryName
  }
  for (const frame of framesToCheck) {
    const partial = frame.items.find((item) =>
      normalized.includes(stripSpace(item.name)),
    )
    if (partial) return partial.categoryName
  }
  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (rule.pattern.test(normalized)) return rule.categoryName
  }
  return null
}

/**
 * 추론된 카테고리 표준 이름을 실제 DB 카테고리 목록(`categories`)의 항목으로 연결한다.
 */
export function resolveCategoryByCanonicalName<
  TCategory extends { id: string; name: string; nameEn?: string | null },
>(canonicalName: string | null | undefined, categories: ReadonlyArray<TCategory>): TCategory | null {
  if (!canonicalName || categories.length === 0) return null
  const targetNorm = stripSpace(canonicalName)
  const exact = categories.find((cat) => stripSpace(cat.name) === targetNorm)
  if (exact) return exact

  const synonymGroup = CATEGORY_SYNONYM_GROUPS.find((group) =>
    group.some((alias) => stripSpace(alias) === targetNorm),
  )
  if (synonymGroup) {
    for (const alias of synonymGroup) {
      const aliasNorm = stripSpace(alias)
      const matched = categories.find((cat) => stripSpace(cat.name) === aliasNorm)
      if (matched) return matched
    }
  }

  const partial = categories.find(
    (cat) =>
      stripSpace(cat.name).includes(targetNorm) ||
      targetNorm.includes(stripSpace(cat.name)),
  )
  return partial ?? null
}

/**
 * 기관명으로부터 등록된 카테고리 목록 내 최적 카테고리를 찾는다 (명시 매칭 시에만 반환).
 */
export function matchDepartmentCategoryByName<
  TCategory extends { id: string; name: string; nameEn?: string | null },
>(
  departmentName: string,
  categories: ReadonlyArray<TCategory>,
  preferredFrame?: DepartmentNameFrame,
): TCategory | null {
  const inferredName = inferExplicitDepartmentCategoryName(
    departmentName,
    preferredFrame,
  )
  return resolveCategoryByCanonicalName(inferredName, categories)
}

/**
 * 부처 이름으로부터 전역 카테고리 이름(예: '외교', '국방', '기타')을 추론한다.
 * 대시보드에서 직접 이름을 입력해 부처를 만들 때도 카테고리가 비지 않도록 돕는다.
 */
export function inferDepartmentCategoryName(
  departmentName: string,
  preferredFrame?: DepartmentNameFrame,
): string | null {
  const normalized = stripSpace(departmentName)
  if (!normalized) return null
  return inferExplicitDepartmentCategoryName(departmentName, preferredFrame) ?? '기타'
}

/**
 * 부처 이름으로부터 기본 기관 성격(kind)을 추론한다.
 */
export function inferDepartmentKind(
  departmentName: string,
  preferredFrame?: DepartmentNameFrame,
): AdministrationDepartmentKind | undefined {
  const normalized = stripSpace(departmentName)
  if (!normalized) return undefined

  const framesToCheck = preferredFrame
    ? [
        preferredFrame,
        ...DEPARTMENT_NAME_FRAMES.filter(
          (candidateFrame) => candidateFrame.id !== preferredFrame.id,
        ),
      ]
    : DEPARTMENT_NAME_FRAMES

  for (const frame of framesToCheck) {
    const matched = frame.items.find(
      (item) =>
        stripSpace(item.name) === normalized ||
        normalized.includes(stripSpace(item.name)),
    )
    if (matched?.kind) return matched.kind
  }
  if (
    /궁내성|궁내부|종친부|내수사|시종원|장악원|황실|왕실|대통령비서실|대통령경호처|국가안보실|승정원/.test(
      normalized,
    )
  ) {
    return 'ROYAL_HOUSEHOLD'
  }
  if (/총독부|도독부|군정청|고등판무관/.test(normalized)) {
    return 'COLONIAL_GOVERNMENT'
  }
  if (
    /대법원|헌법재판소|대심원|최고재판소|연방대법원|국회|의회|원로원|추밀원|중추원|선거관리위원회|선관위/.test(
      normalized,
    )
  ) {
    return 'OTHER'
  }
  return undefined
}
