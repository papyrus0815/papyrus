/**
 * 보편(전역, scopes=0) 관직·직책 정본 시드 스크립트 (멱등 실행)
 *
 * 목표:
 * - 정부 행정(내각·중앙부처·위원회·독립기구·사법·입법·지방·외교·군사령부)에서 수장 및 인사를 임명할 때
 *   자유 문자열이 아닌 DB `government_position_definition` 정본 행을 즉시 선택할 수 있도록
 *   비어 있던 보편 직책 계층(처장·청장·위원장·차관·대법원장·국회의장·사령관·섭정·왕세자 등)을 채운다.
 * - 이미 전역(무스코프·무부처·무부대·무기구, is_generic=0)으로 동일 title이 존재하면 건너뛴다.
 */
const crypto = require('node:crypto')
const mysql = require('mysql2/promise')

const UNIVERSAL_POSITIONS = [
  // 1) 국가원수 (비군주 보편 칭호 보강)
  { positionType: 'HEAD_OF_STATE', title: '집정관', titleEn: 'Consul', rank: 2, isMonarchical: false, description: '공화정 집정관 및 통령 체제의 국가원수' },
  { positionType: 'HEAD_OF_STATE', title: '제1집정', titleEn: 'First Consul', rank: 2, isMonarchical: false, description: '통령정부 등 복수 집정 체제의 수석 국가원수' },
  { positionType: 'HEAD_OF_STATE', title: '호국경', titleEn: 'Lord Protector', rank: 2, isMonarchical: false, description: '공화정·과도기 호국경 체제의 국가원수' },
  { positionType: 'HEAD_OF_STATE', title: '국가평의회 의장', titleEn: 'Chairman of the Council of State', rank: 2, isMonarchical: false, description: '국가평의회·최고회의 합의체 국가원수' },
  { positionType: 'HEAD_OF_STATE', title: '권한대행 (국가원수)', titleEn: 'Acting Head of State', rank: 9, isMonarchical: false, description: '국가원수 궐위·사고 시 직무·권한대행' },
  // 1-b) 군주·주권 칭호 보강
  { positionType: 'HEAD_OF_STATE', title: '파라오', titleEn: 'Pharaoh', rank: 1, isMonarchical: true, description: '고대 이집트 군주 칭호' },
  { positionType: 'HEAD_OF_STATE', title: '칼리프', titleEn: 'Caliph', rank: 1, isMonarchical: true, description: '이슬람 공동체 최고 통치자 칭호' },
  { positionType: 'HEAD_OF_STATE', title: '샤', titleEn: 'Shah', rank: 1, isMonarchical: true, description: '페르시아·이란 군주 칭호' },

  // 2) 정부수반 (내각 수반 보편 칭호 보강)
  { positionType: 'HEAD_OF_GOVERNMENT', title: '수상', titleEn: 'Premier / Prime Minister', rank: 1, isMonarchical: false, description: '행정부·내각을 이끄는 정부수반' },
  { positionType: 'HEAD_OF_GOVERNMENT', title: '재상', titleEn: 'Chancellor', rank: 1, isMonarchical: false, description: '군주국·제국의 최고 행정수반(재상)' },
  { positionType: 'HEAD_OF_GOVERNMENT', title: '승상', titleEn: 'Grand Chancellor', rank: 1, isMonarchical: false, description: '동아시아 전근대 왕조의 최고 행정수반' },
  { positionType: 'HEAD_OF_GOVERNMENT', title: '각료평의회 의장', titleEn: 'Chairman of the Council of Ministers', rank: 1, isMonarchical: false, description: '각료평의회·장관회의 체제의 내각 수반' },
  { positionType: 'HEAD_OF_GOVERNMENT', title: '임시정부 수반', titleEn: 'Head of Provisional Government', rank: 2, isMonarchical: false, description: '과도·망명·혁명 임시정부의 행정수반' },
  { positionType: 'HEAD_OF_GOVERNMENT', title: '권한대행', titleEn: 'Acting Prime Minister', rank: 9, isMonarchical: false, description: '정부수반 궐위·사임 시 직무·권한대행' },

  // 3) 부원수 · 섭정 · 왕위 계승자
  { positionType: 'DEPUTY_HEAD_OF_STATE', title: '국가부주석', titleEn: 'Vice President / Vice Chairman', rank: 2, isMonarchical: false, description: '국가주석·국가평의회 체제의 부원수' },
  { positionType: 'REGENT', title: '섭정', titleEn: 'Regent', rank: 1, isMonarchical: false, description: '군주 미성년·유고·궐위 시 국권을 대행하는 섭정' },
  { positionType: 'REGENT', title: '수렴청정', titleEn: 'Queen Dowager Regent', rank: 2, isMonarchical: false, description: '왕실 대비·태후가 어린 군주를 대신해 정사를 결재하는 섭정' },
  { positionType: 'HEIR_APPARENT', title: '황태자', titleEn: 'Crown Prince Imperial', rank: 1, isMonarchical: false, description: '황제국의 법정 제1위 황위 계승자' },
  { positionType: 'HEIR_APPARENT', title: '왕세자', titleEn: 'Crown Prince', rank: 2, isMonarchical: false, description: '왕국의 법정 제1위 왕위 계승자' },
  { positionType: 'HEIR_APPARENT', title: '왕태자', titleEn: 'Crown Prince Royal', rank: 2, isMonarchical: false, description: '왕국의 법정 왕위 계승자' },

  // 4) 내각 각료 · 장관 보강
  { positionType: 'CABINET_MINISTER', title: '부총리', titleEn: 'Deputy Prime Minister', rank: 2, isMonarchical: false, description: '정부수반을 보좌·대행하는 부총리급 각료' },
  { positionType: 'CABINET_MINISTER', title: '수석장관', titleEn: 'First Secretary of State', rank: 3, isMonarchical: false, description: '내각 내 선임·수석 각료' },
  { positionType: 'CABINET_MINISTER', title: '국무장관', titleEn: 'Secretary of State / Minister of State', rank: 4, isMonarchical: false, description: '국무성 수장 또는 국무위원급 장관' },
  { positionType: 'CABINET_MINISTER', title: '무임소장관', titleEn: 'Minister without Portfolio', rank: 15, isMonarchical: false, description: '특정 부처를 맡지 않고 내각에 참여하는 정무·특임 각료' },

  // 5) 차관 · 차관급
  { positionType: 'VICE_MINISTER', title: '차관', titleEn: 'Vice Minister / Deputy Minister', rank: 10, isMonarchical: false, description: '중앙부처 장관을 보좌하는 정무·행정 차관' },
  { positionType: 'VICE_MINISTER', title: '제1차관', titleEn: 'First Vice Minister', rank: 11, isMonarchical: false, description: '복수 차관제 부처의 제1차관' },
  { positionType: 'VICE_MINISTER', title: '제2차관', titleEn: 'Second Vice Minister', rank: 12, isMonarchical: false, description: '복수 차관제 부처의 제2차관' },
  { positionType: 'VICE_MINISTER', title: '사무차관', titleEn: 'Permanent Under-Secretary', rank: 13, isMonarchical: false, description: '부처의 최고 직업관료(사무차관)' },
  { positionType: 'VICE_MINISTER', title: '차관보', titleEn: 'Assistant Minister / Under-Secretary', rank: 14, isMonarchical: false, description: '차관을 보좌하는 고위 정무·실무 직위' },

  // 6) 중앙행정기관 · 위원회 · 독립기구 수장 (SPECIAL_POSITION)
  { positionType: 'SPECIAL_POSITION', title: '처장', titleEn: 'Minister / Director of Ministry-Agency', rank: 10, isMonarchical: false, description: '처(處) 단위 중앙행정기관의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '청장', titleEn: 'Commissioner', rank: 11, isMonarchical: false, description: '청(廳)·외청 단위 행정기관의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '위원장', titleEn: 'Chairperson', rank: 10, isMonarchical: false, description: '합의제 행정위원회·독립위원회의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '부위원장', titleEn: 'Vice Chairperson', rank: 15, isMonarchical: false, description: '합의제 위원회의 부수장' },
  { positionType: 'SPECIAL_POSITION', title: '원장', titleEn: 'President / Director of Board', rank: 10, isMonarchical: false, description: '감사원·정보원·연구원 등 원(院) 단위 국가기관의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '총재', titleEn: 'Governor / President', rank: 10, isMonarchical: false, description: '중앙은행·국책기구·특수법인의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '부총재', titleEn: 'Deputy Governor', rank: 15, isMonarchical: false, description: '중앙은행·국책기구의 부수장' },
  { positionType: 'SPECIAL_POSITION', title: '비서실장', titleEn: 'Chief of Staff', rank: 10, isMonarchical: false, description: '국가원수·정부수반 비서실의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '국가안보보좌관', titleEn: 'National Security Advisor', rank: 11, isMonarchical: false, description: '국가안보회의·안보실 수석 보좌 직책' },
  { positionType: 'SPECIAL_POSITION', title: '실장', titleEn: 'Director of Office', rank: 16, isMonarchical: false, description: '국무조정실·기획실 등 실(室) 단위 기구의 수장' },
  { positionType: 'SPECIAL_POSITION', title: '국장', titleEn: 'Director-General', rank: 20, isMonarchical: false, description: '정보국·수사국·본부 내 국(局) 단위 기구의 수장' },

  // 7) 사법부 · 검찰 수장
  { positionType: 'JUDICIARY', title: '대법원장', titleEn: 'Chief Justice', rank: 1, isMonarchical: false, description: '최고법원(대법원)의 수장' },
  { positionType: 'JUDICIARY', title: '헌법재판소장', titleEn: 'President of the Constitutional Court', rank: 2, isMonarchical: false, description: '헌법재판기관의 수장' },
  { positionType: 'JUDICIARY', title: '대법관', titleEn: 'Supreme Court Justice', rank: 5, isMonarchical: false, description: '최고법원 재판관' },
  { positionType: 'JUDICIARY', title: '검찰총장', titleEn: 'Prosecutor General', rank: 6, isMonarchical: false, description: '검찰청·공소기관의 최고 수장' },

  // 8) 입법부 · 의회 직책
  { positionType: 'LEGISLATOR', title: '국회의장', titleEn: 'Speaker of Parliament', rank: 1, isMonarchical: false, description: '단원제 의회 또는 양원 합동 의회의 수장' },
  { positionType: 'LEGISLATOR', title: '상원의장', titleEn: 'President of the Senate / Upper House', rank: 2, isMonarchical: false, description: '양원제 상원(참의원·귀족원·원로원)의 의장' },
  { positionType: 'LEGISLATOR', title: '하원의장', titleEn: 'Speaker of the House / Lower House', rank: 2, isMonarchical: false, description: '양원제 하원(중의원·서민원·대의원)의 의장' },
  { positionType: 'LEGISLATOR', title: '부의장', titleEn: 'Deputy Speaker', rank: 4, isMonarchical: false, description: '의회 부의장' },
  { positionType: 'LEGISLATOR', title: '국회의원', titleEn: 'Member of Parliament', rank: 10, isMonarchical: false, description: '단원제 의회 의원' },
  { positionType: 'LEGISLATOR', title: '상원의원', titleEn: 'Senator / Member of the Upper House', rank: 10, isMonarchical: false, description: '양원제 상원 의원' },
  { positionType: 'LEGISLATOR', title: '하원의원', titleEn: 'Member of the Lower House', rank: 10, isMonarchical: false, description: '양원제 하원 의원' },

  // 9) 지방정부 · 식민/속령 통치 수장
  { positionType: 'LOCAL_GOVERNMENT', title: '총독', titleEn: 'Governor-General', rank: 1, isMonarchical: false, description: '자치령·식민지·총독부의 최고 통치 수장' },
  { positionType: 'LOCAL_GOVERNMENT', title: '부왕', titleEn: 'Viceroy', rank: 1, isMonarchical: false, description: '국왕·황제를 대리해 광역 속령을 통치하는 부왕' },
  { positionType: 'LOCAL_GOVERNMENT', title: '주지사', titleEn: 'State / Provincial Governor', rank: 5, isMonarchical: false, description: '연방 주(State) 또는 광역 행정구역의 수장' },
  { positionType: 'LOCAL_GOVERNMENT', title: '도지사', titleEn: 'Governor', rank: 5, isMonarchical: false, description: '도(道)·현 단위 광역 지방정부의 수장' },
  { positionType: 'LOCAL_GOVERNMENT', title: '시장', titleEn: 'Mayor', rank: 10, isMonarchical: false, description: '도시·특별시·자치시의 행정수반' },

  // 10) 군 사령부 · 부대 보편 지휘 보직
  { positionType: 'MILITARY_COMMANDER', title: '총사령관', titleEn: 'Commander-in-Chief', rank: 1, isMonarchical: false, description: '전군 또는 전구(Theater) 최고 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '참모총장', titleEn: 'Chief of the General Staff', rank: 2, isMonarchical: false, description: '총참모부·각군 본부의 최고 참모 수장' },
  { positionType: 'MILITARY_COMMANDER', title: '사령관', titleEn: 'Commander', rank: 3, isMonarchical: false, description: '사령부·야전군·집단군·합동부대의 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '부사령관', titleEn: 'Deputy Commander', rank: 4, isMonarchical: false, description: '사령관을 보좌·대리하는 부지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '참모장', titleEn: 'Chief of Staff', rank: 5, isMonarchical: false, description: '사령부·야전부대의 참모진 수장' },
  { positionType: 'MILITARY_COMMANDER', title: '함대사령관', titleEn: 'Fleet Commander', rank: 6, isMonarchical: false, description: '해군 함대의 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '군단장', titleEn: 'Corps Commander', rank: 10, isMonarchical: false, description: '군단급 부대 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '사단장', titleEn: 'Division Commander', rank: 12, isMonarchical: false, description: '사단급 부대 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '여단장', titleEn: 'Brigade Commander', rank: 14, isMonarchical: false, description: '여단급 부대 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '연대장', titleEn: 'Regiment Commander', rank: 16, isMonarchical: false, description: '연대급 부대 지휘관' },
  { positionType: 'MILITARY_COMMANDER', title: '정치위원', titleEn: 'Political Commissar', rank: 18, isMonarchical: false, description: '부대 내 당·정치 지도 감독관' },
]

async function main() {
  const dbUrl =
    process.env.DATABASE_URL || 'mysql://papyrus:papyrus@127.0.0.1:3307/papyrus'
  const conn = await mysql.createConnection(dbUrl)

  let inserted = 0
  let skipped = 0

  for (const item of UNIVERSAL_POSITIONS) {
    // 무스코프·무부처·무부대·무기구인 전역 정본(is_generic=0) 중 같은 title이 있는지 확인
    const [existing] = await conn.query(
      `
      SELECT d.id
      FROM government_position_definition d
      WHERE d.is_generic = 0
        AND d.title = ?
        AND d.administration_department_id IS NULL
        AND d.military_unit_id IS NULL
        AND d.organization_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM government_position_definition_scope s WHERE s.definition_id = d.id
        )
      LIMIT 1
      `,
      [item.title],
    )

    if (existing.length > 0) {
      skipped += 1
      continue
    }

    const id = crypto.randomUUID()
    await conn.query(
      `
      INSERT INTO government_position_definition
        (id, position_type, title, title_en, description, \`rank\`, is_monarchical, is_generic, created_at, updated_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 0, NOW(3), NOW(3))
      `,
      [
        id,
        item.positionType,
        item.title,
        item.titleEn || null,
        item.description || null,
        item.rank ?? 999,
        item.isMonarchical ? 1 : 0,
      ],
    )
    inserted += 1
  }

  console.log(
    `[seed-canonical-position-definitions] Inserted ${inserted} universal definitions (skipped ${skipped} existing).`,
  )
  await conn.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
