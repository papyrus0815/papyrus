/**
 * 관직·직책·계급 도메인 전수 정규화 및 FK 백필 스크립트 (멱등 실행)
 *
 * 수행 항목:
 * 1) [Track 5] 오타('벽경백') 삭제, 동명 중복 직책 정본 6쌍 통합, 문화권 고유 칭호('번주'·'방백'·'변경백'·'대공(오스트리아)'·'백작(영)'·'국공'·'군왕') 스코프 지정,
 *    외교/특수 1회성 직책 8건 및 마지막 미정규화 재임 1건('정년 퇴역 (예비역)') 100% 정본 정규화
 * 2) [Track 1] 군 지휘관(MILITARY_COMMANDER) 부대 귀속 1회성 문자열 정의 81건 → 보편 지휘·참모 정본 보직으로 이관·정리 (재임의 세부 title·부대·계급 보존)
 * 3) [Track 2] 헌정 체제(PoliticalSystem) 텍스트 수반 직책 미연결 10건 → DB 직책 정본 생성·백필 연결
 * 4) [Track 3] 조약 서명자(TreatySignatory) 텍스트 직함 36건 + 재임 연결 행 → position_definition_id 백필 연결
 * 5) [Track 4] 장관·차관·기관장 정본 60여 건 ↔ 중앙부처 표준 기능 카테고리(categoryId) 매핑
 */
const crypto = require('node:crypto')
const mysql = require('mysql2/promise')

async function main() {
  const dbUrl =
    process.env.DATABASE_URL || 'mysql://papyrus:papyrus@127.0.0.1:3307/papyrus'
  const conn = await mysql.createConnection(dbUrl)

  // Helper: find or create universal (0-scope, null dept/unit/org) definition
  async function ensureUniversalDef({
    positionType,
    title,
    titleEn = null,
    titleLocal = null,
    rank = 20,
    isMonarchical = false,
    description = null,
  }) {
    const [found] = await conn.query(
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
      [title],
    )
    if (found.length > 0) return found[0].id
    const id = crypto.randomUUID()
    await conn.query(
      `
      INSERT INTO government_position_definition
        (id, position_type, title, title_en, title_local, description, \`rank\`, is_monarchical, is_generic, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(3), NOW(3))
      `,
      [
        id,
        positionType,
        title,
        titleEn,
        titleLocal,
        description,
        rank,
        isMonarchical ? 1 : 0,
      ],
    )
    return id
  }

  // Helper: find or create polity-scoped definition
  async function ensureScopedDef({
    positionType,
    title,
    titleEn = null,
    titleLocal = null,
    rank = 1,
    isMonarchical = false,
    scopes = [],
  }) {
    const [found] = await conn.query(
      `
      SELECT d.id
      FROM government_position_definition d
      WHERE d.is_generic = 0
        AND d.title = ?
        AND d.position_type = ?
        AND d.administration_department_id IS NULL
        AND d.military_unit_id IS NULL
      LIMIT 1
      `,
      [title, positionType],
    )
    let defId = found.length > 0 ? found[0].id : null
    if (!defId) {
      defId = crypto.randomUUID()
      await conn.query(
        `
        INSERT INTO government_position_definition
          (id, position_type, title, title_en, title_local, \`rank\`, is_monarchical, is_generic, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(3), NOW(3))
        `,
        [
          defId,
          positionType,
          title,
          titleEn,
          titleLocal,
          rank,
          isMonarchical ? 1 : 0,
        ],
      )
    }
    for (const sc of scopes) {
      await ensureScope(defId, sc.countryId || null, sc.historicalCountryId || null, sc.localTitle || null)
    }
    return defId
  }

  async function ensureScope(definitionId, countryId, historicalCountryId, localTitle = null) {
    if (!countryId && !historicalCountryId) return
    const [exists] = await conn.query(
      `
      SELECT id FROM government_position_definition_scope
      WHERE definition_id = ?
        AND ((country_id IS NULL AND ? IS NULL) OR country_id = ?)
        AND ((historical_country_id IS NULL AND ? IS NULL) OR historical_country_id = ?)
      LIMIT 1
      `,
      [definitionId, countryId, countryId, historicalCountryId, historicalCountryId],
    )
    if (exists.length > 0) return exists[0].id
    const scId = crypto.randomUUID()
    await conn.query(
      `
      INSERT INTO government_position_definition_scope
        (id, definition_id, country_id, historical_country_id, local_title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))
      `,
      [scId, definitionId, countryId, historicalCountryId, localTitle],
    )
    return scId
  }

  async function mergeDefInto(sourceId, targetId, targetPositionType) {
    if (!sourceId || !targetId || sourceId === targetId) return false
    const [srcRows] = await conn.query(
      `SELECT id, title FROM government_position_definition WHERE id = ? AND is_generic = 0`,
      [sourceId],
    )
    if (srcRows.length === 0) return false
    // Preserve tenure.title if null before re-pointing
    await conn.query(
      `
      UPDATE government_position_tenure
      SET title = COALESCE(NULLIF(TRIM(title), ''), ?),
          position_definition_id = ?,
          position_type = ?
      WHERE position_definition_id = ?
      `,
      [srcRows[0].title, targetId, targetPositionType, sourceId],
    )
    await conn.query(
      `UPDATE political_system SET head_of_state_position_id = ? WHERE head_of_state_position_id = ?`,
      [targetId, sourceId],
    )
    await conn.query(
      `UPDATE political_system SET head_of_government_position_id = ? WHERE head_of_government_position_id = ?`,
      [targetId, sourceId],
    )
    await conn.query(
      `UPDATE treaty_signatory SET position_definition_id = ? WHERE position_definition_id = ?`,
      [targetId, sourceId],
    )
    await conn.query(`DELETE FROM government_position_definition WHERE id = ?`, [
      sourceId,
    ])
    return true
  }

  // =========================================================================
  // STEP 1 (Track 5A): 오타('벽경백') 제거 및 동명 중복 정본 6쌍 보편 정본으로 통합
  // =========================================================================
  await conn.query(
    `DELETE FROM government_position_definition WHERE id = '299f34f9-f108-491b-8150-82ac06aa4788' AND title = '벽경백'`,
  )

  const univSecState = await ensureUniversalDef({
    positionType: 'CABINET_MINISTER',
    title: '국무장관',
    titleEn: 'Secretary of State',
    rank: 4,
  })
  await mergeDefInto('a1978631-ef71-4715-867f-a425c746f7ee', univSecState, 'CABINET_MINISTER')

  const univDeputyPm = await ensureUniversalDef({
    positionType: 'CABINET_MINISTER',
    title: '부총리',
    titleEn: 'Deputy Prime Minister',
    rank: 2,
  })
  await mergeDefInto('76673a30-35a8-4f9c-aec4-7d43cfbd2465', univDeputyPm, 'CABINET_MINISTER')

  const univLowerMp = await ensureUniversalDef({
    positionType: 'LEGISLATOR',
    title: '하원의원',
    titleEn: 'Member of the Lower House',
    rank: 10,
  })
  await mergeDefInto('74fb5432-81b8-4ebd-9be0-aca380d48d28', univLowerMp, 'LEGISLATOR')

  const univLowerSpeaker = await ensureUniversalDef({
    positionType: 'LEGISLATOR',
    title: '하원의장',
    titleEn: 'Speaker of the House / Lower House',
    rank: 2,
  })
  await mergeDefInto('0a51b078-2c4e-4377-b8ff-2488287aabf8', univLowerSpeaker, 'LEGISLATOR')

  // =========================================================================
  // STEP 2 (Track 5B): 특정 문화권 칭호 스코프 지정 (전역 오염 해소)
  // =========================================================================
  // 번주 (Daimyo) -> 일본 + 실제 재임 역사번(기이번, 다테바야시번, 고후번) 및 에도 막부 계열
  const [daimyoPolities] = await conn.query(
    `SELECT id FROM historical_country WHERE name REGEXP '막부|번$'`,
  )
  await ensureScope('b6bddf6f-57a1-4da5-b702-ce4b951c6f92', '1df49650-f314-480f-aba1-74b8d9c7b894', null, '藩主')
  for (const hp of daimyoPolities) {
    await ensureScope('b6bddf6f-57a1-4da5-b702-ce4b951c6f92', null, hp.id, '藩主')
  }

  // 방백 (Landgrave) & 변경백 (Margrave) -> 독일 + 오스트리아 + 신성로마제국 + 실제 재임 영방국들
  const [germanPolities] = await conn.query(
    `SELECT id FROM historical_country WHERE name REGEXP '신성로마|방백|변경백|선제후|프로이센|작센|브란덴부르크|바이에른|오스트리아'`,
  )
  for (const defId of ['90c7cc9e-2570-4172-9890-0b5dddb5aa7e', '74919908-fa35-42e3-8b55-2497a9e7bee1']) {
    await ensureScope(defId, '713f8aaf-f9ae-4ee1-aacc-758dfd38a340', null)
    await ensureScope(defId, '480309a0-6a9c-4d23-ba92-e57ce7205ec6', null)
    for (const gp of germanPolities) {
      await ensureScope(defId, null, gp.id)
    }
  }

  // 대공(오스트리아) (Archduke) -> 오스트리아 및 합스부르크/오스트리아 역사정체
  await ensureScope('986fdade-fb36-4b7e-9824-b108c7579b61', '480309a0-6a9c-4d23-ba92-e57ce7205ec6', null, 'Erzherzog')
  for (const hid of [
    'fd4919a0-c6e8-460c-ac49-aff8e4f33e55',
    'd100bddc-84ed-40d0-a84d-d19422cb7817',
    '694515a9-cd57-43fe-b1a5-6b89ec37b09b',
    '0b21e8de-d70a-405a-a7ab-e62bec18d606',
  ]) {
    await ensureScope('986fdade-fb36-4b7e-9824-b108c7579b61', null, hid, 'Erzherzog')
  }

  // 백작(영) (Earl) -> 영국 및 잉글랜드·그레이트브리튼·연합왕국
  await ensureScope('a918ac9e-d9cb-4240-8fa5-59c6330b488d', '51f31c0c-c015-4218-9801-215e8c9232c9', null, 'Earl')
  for (const hid of [
    'b1c18ac8-098e-450c-b822-27e5da4359e9',
    '64efd788-01b6-40c4-a212-182810523a4c',
    'cb291565-3a0f-4c5d-9414-1b05a22e7d11',
    '7fdd9514-bb46-4ac5-ada1-a9a8a9fe3653',
  ]) {
    await ensureScope('a918ac9e-d9cb-4240-8fa5-59c6330b488d', null, hid, 'Earl')
  }

  // 국공 & 군왕 -> 동아시아 왕조 스코프 (중국·청·고려·조선·대한제국)
  for (const defId of ['d1c36b92-8f58-4234-ae69-b51ee2c6d5e0', 'ea1a4efa-d2b4-48cb-b48e-21a2a18dc0d1']) {
    await ensureScope(defId, 'be212304-aba5-41f8-ad0c-68af03054080', null)
    for (const hid of [
      '2fa90215-7677-4915-9af0-91229c096f03',
      '15ed37d8-f7b0-4d45-988f-e706a072b9c4',
      'c5a8a9db-1578-4269-a527-475d6643e1a5',
      'b54cd5ed-44e5-44a1-bca9-0f871e273b89',
    ]) {
      await ensureScope(defId, null, hid)
    }
  }

  // =========================================================================
  // STEP 3 (Track 5C): 1회성 외교/특수 정의 8건 및 마지막 미정규화 재임 1건 정규화
  // =========================================================================
  const univConsul = await ensureUniversalDef({ positionType: 'DIPLOMATIC_POST', title: '영사', titleEn: 'Consul', rank: 10 })
  const univConsulGen = await ensureUniversalDef({ positionType: 'DIPLOMATIC_POST', title: '총영사', titleEn: 'Consul General', rank: 8 })
  const univEnvoy = await ensureUniversalDef({
    positionType: 'DIPLOMATIC_POST',
    title: '특명전권공사',
    titleEn: 'Envoy Extraordinary and Minister Plenipotentiary',
    rank: 4,
  })
  const univSpecialEnvoy = await ensureUniversalDef({
    positionType: 'DIPLOMATIC_POST',
    title: '특사',
    titleEn: 'Special Envoy',
    rank: 5,
  })
  const univMarshalHonor = await ensureUniversalDef({
    positionType: 'SPECIAL_POSITION',
    title: '국가원수급 명예원수',
    titleEn: 'Marshal of the Nation (State Dignity)',
    rank: 2,
  })
  const univReserveGeneral = await ensureUniversalDef({
    positionType: 'SPECIAL_POSITION',
    title: '예비역 장성 (대기명령)',
    titleEn: 'Reserve General Officer',
    rank: 50,
  })

  const [specialDipRows] = await conn.query(`
    SELECT id, title FROM government_position_definition
    WHERE is_generic = 0 AND position_type = 'SPECIAL_POSITION'
      AND title IN (
        '광저우 영국 영사',
        '상하이 영국 영사',
        '트리에스테 프랑스 영사',
        '튀니스 프랑스 총영사',
        '주일 영국 특명전권공사',
        '주일 프랑스 특명전권공사',
        '주청 영국 특명전권공사',
        '국왕 특사 (남슬라브 정세 시찰)',
        '프랑스 원수'
      )
  `)
  for (const sp of specialDipRows) {
    if (sp.title.includes('총영사')) {
      await mergeDefInto(sp.id, univConsulGen, 'DIPLOMATIC_POST')
    } else if (sp.title.includes('영사')) {
      await mergeDefInto(sp.id, univConsul, 'DIPLOMATIC_POST')
    } else if (sp.title.includes('특명전권공사')) {
      await mergeDefInto(sp.id, univEnvoy, 'DIPLOMATIC_POST')
    } else if (sp.title.includes('특사')) {
      await mergeDefInto(sp.id, univSpecialEnvoy, 'DIPLOMATIC_POST')
    } else if (sp.title === '프랑스 원수') {
      await mergeDefInto(sp.id, univMarshalHonor, 'SPECIAL_POSITION')
    }
  }

  // 마지막 남은 isGeneric=1 재임 ('정년 퇴역 (예비역)') 정규화
  await conn.query(
    `
    UPDATE government_position_tenure t
    JOIN government_position_definition d ON d.id = t.position_definition_id
    SET t.position_definition_id = ?, t.position_type = 'SPECIAL_POSITION'
    WHERE d.is_generic = 1
    `,
    [univReserveGeneral],
  )

  // =========================================================================
  // STEP 4 (Track 1): 부대 귀속 1회성 MILITARY_COMMANDER 81건 → 보편 지휘·참모 보직 정본 정규화
  // =========================================================================
  const milCanon = {
    supremeCmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '총사령관', titleEn: 'Commander-in-Chief', rank: 1 }),
    cogs: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '참모총장', titleEn: 'Chief of the General Staff', rank: 2 }),
    viceCogs: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '부참모총장', titleEn: 'Deputy Chief of the General Staff', rank: 3 }),
    milGov: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군사총독', titleEn: 'Military Governor', rank: 3 }),
    cmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '사령관', titleEn: 'Commander', rank: 3 }),
    warCouncilVice: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '최고전쟁회의 부의장', titleEn: 'Vice-President of the Supreme War Council', rank: 4 }),
    warCouncilMem: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '최고전쟁회의 위원', titleEn: 'Member of the Supreme War Council', rank: 5 }),
    inspector: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군 감찰관', titleEn: 'Inspector General', rank: 5 }),
    cos: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '참모장', titleEn: 'Chief of Staff', rank: 5 }),
    qmGen: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '병참감', titleEn: 'Quartermaster General', rank: 7 }),
    staffDir: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '참모본부 국·부장', titleEn: 'Director of General Staff Bureau', rank: 8 }),
    milSec: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군사비서실장', titleEn: 'Chief of the Military Chancellery', rank: 9 }),
    corpsCmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군단장', titleEn: 'Corps Commander', rank: 10 }),
    academyHead: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군사학교장', titleEn: 'Commandant of Military Academy', rank: 11 }),
    divCmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '사단장', titleEn: 'Division Commander', rank: 12 }),
    bdeCmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '여단장', titleEn: 'Brigade Commander', rank: 14 }),
    shipCapt: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '함장', titleEn: 'Commanding Officer (Ship Captain)', rank: 15 }),
    regtCmd: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '연대장', titleEn: 'Regiment Commander', rank: 16 }),
    advisor: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군사고문·무관', titleEn: 'Military Advisor / Representative', rank: 17 }),
    adc: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '전속부관', titleEn: 'Aide-de-Camp', rank: 19 }),
    instructor: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '군사학교 교관·교수', titleEn: 'Military Academy Professor', rank: 20 }),
    staffOff: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '참모·보좌장교', titleEn: 'Staff Officer', rank: 22 }),
    juniorOff: await ensureUniversalDef({ positionType: 'MILITARY_COMMANDER', title: '부대 장교', titleEn: 'Unit Commissioned Officer', rank: 30 }),
  }

  function classifyMilitaryTitle(rawTitle) {
    const t = (rawTitle || '').trim()
    if (/총사령관|최고사령관/.test(t)) return { defId: milCanon.supremeCmd, roleKind: 'COMMANDER' }
    if (/부참모총장/.test(t)) return { defId: milCanon.viceCogs, roleKind: 'DEPUTY_COMMANDER' }
    if (/참모총장/.test(t)) return { defId: milCanon.cogs, roleKind: 'CHIEF_OF_STAFF' }
    if (/군사총독/.test(t)) return { defId: milCanon.milGov, roleKind: 'COMMANDER' }
    if (/최고전쟁회의 부의장/.test(t)) return { defId: milCanon.warCouncilVice, roleKind: 'DEPUTY_COMMANDER' }
    if (/최고전쟁회의 위원/.test(t) && !/국장/.test(t)) return { defId: milCanon.warCouncilMem, roleKind: 'STAFF' }
    if (/감찰관/.test(t)) return { defId: milCanon.inspector, roleKind: 'STAFF' }
    if (/보좌관|참모본부과 근무|정보업무 책임자/.test(t)) return { defId: milCanon.staffOff, roleKind: 'STAFF' }
    if (/참모장/.test(t)) return { defId: milCanon.cos, roleKind: 'CHIEF_OF_STAFF' }
    if (/병참감/.test(t)) return { defId: milCanon.qmGen, roleKind: 'STAFF' }
    if (/작전과장|정보부장|공병국장|후방근무국장/.test(t)) return { defId: milCanon.staffDir, roleKind: 'STAFF' }
    if (/군사비서실장/.test(t)) return { defId: milCanon.milSec, roleKind: 'CHIEF_OF_STAFF' }
    if (/군단장/.test(t)) return { defId: milCanon.corpsCmd, roleKind: 'COMMANDER' }
    if (/사단장/.test(t)) return { defId: milCanon.divCmd, roleKind: 'COMMANDER' }
    if (/여단장/.test(t)) return { defId: milCanon.bdeCmd, roleKind: 'COMMANDER' }
    if (/연대 지휘관|연대장/.test(t)) return { defId: milCanon.regtCmd, roleKind: 'COMMANDER' }
    if (/함장/.test(t)) return { defId: milCanon.shipCapt, roleKind: 'COMMANDER' }
    if (/교장/.test(t)) return { defId: milCanon.academyHead, roleKind: 'COMMANDER' }
    if (/교수|교관/.test(t)) return { defId: milCanon.instructor, roleKind: 'STAFF' }
    if (/전속부관/.test(t)) return { defId: milCanon.adc, roleKind: 'STAFF' }
    if (/군사고문|군사대표/.test(t)) return { defId: milCanon.advisor, roleKind: 'STAFF' }
    if (/소위|책임 장교/.test(t)) return { defId: milCanon.juniorOff, roleKind: 'STAFF' }
    return { defId: milCanon.cmd, roleKind: 'COMMANDER' }
  }

  const [unitBoundMilDefs] = await conn.query(`
    SELECT id, title
    FROM government_position_definition
    WHERE is_generic = 0
      AND position_type = 'MILITARY_COMMANDER'
      AND military_unit_id IS NOT NULL
  `)
  let milMigrated = 0
  for (const mDef of unitBoundMilDefs) {
    const mapped = classifyMilitaryTitle(mDef.title)
    if (mDef.id === mapped.defId) continue
    await conn.query(
      `
      UPDATE government_position_tenure
      SET title = COALESCE(NULLIF(TRIM(title), ''), ?),
          position_definition_id = ?,
          military_role_kind = COALESCE(military_role_kind, ?)
      WHERE position_definition_id = ?
      `,
      [mDef.title, mapped.defId, mapped.roleKind, mDef.id],
    )
    await conn.query(
      `UPDATE treaty_signatory SET position_definition_id = ? WHERE position_definition_id = ?`,
      [mapped.defId, mDef.id],
    )
    await conn.query(`DELETE FROM government_position_definition WHERE id = ?`, [
      mDef.id,
    ])
    milMigrated += 1
  }

  // =========================================================================
  // STEP 5 (Track 2): PoliticalSystem 텍스트 수반 직책 미연결 10건 정본 백필
  // =========================================================================
  // 1) 제1공화국 '없음(합의체)' 텍스트 비우기
  await conn.query(
    `UPDATE political_system SET head_of_state_title = NULL WHERE head_of_state_title = '없음(합의체)'`,
  )

  // 2) 나치 독일 총통(Führer)
  const fuhrerDefId = await ensureScopedDef({
    positionType: 'HEAD_OF_STATE',
    title: '총통',
    titleLocal: 'Führer und Reichskanzler',
    titleEn: 'Führer',
    rank: 1,
    scopes: [{ historicalCountryId: '62f80e5d-84da-4071-afc5-2019679c2da8', localTitle: 'Führer' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_state_position_id = ?, head_of_state_title = NULL WHERE id = '50a3238a-5ad7-49ec-8d42-6f8e7823311d'`,
    [fuhrerDefId],
  )

  // 3) 고려 문하시중
  const munhaDefId = await ensureScopedDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '문하시중',
    titleLocal: '門下侍中',
    titleEn: 'Supreme Chancellor of Goryeo',
    rank: 1,
    scopes: [{ historicalCountryId: '15ed37d8-f7b0-4d45-988f-e706a072b9c4', localTitle: '門下侍中' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_government_position_id = ?, head_of_government_title = NULL WHERE id = '6cecf0ff-b029-4860-92f4-97c20ca18241'`,
    [munhaDefId],
  )

  // 4) 임시정부 수반 (보편 정본 연결)
  const provGovDefId = await ensureUniversalDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '임시정부 수반',
    titleEn: 'Head of Provisional Government',
    rank: 2,
  })
  await conn.query(
    `UPDATE political_system SET head_of_government_position_id = ?, head_of_government_title = NULL WHERE id = '8ef203b7-05dd-4632-ba0c-279931ee841b'`,
    [provGovDefId],
  )

  // 5) 미국 연합규약 체제 -> 연합회의 의장
  const confedPresId = await ensureScopedDef({
    positionType: 'HEAD_OF_STATE',
    title: '연합회의 의장',
    titleEn: 'President of the Congress of the Confederation',
    rank: 2,
    scopes: [{ countryId: '841c6f98-ac4c-4a29-8ac7-2e74c24cd90c' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_state_position_id = ?, head_of_state_title = NULL WHERE id = '9618460b-a397-47d4-b843-33d318b965d8'`,
    [confedPresId],
  )

  // 6) 중화민국 행정원장 & 국민정부 주석
  const execYuanId = await ensureScopedDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '행정원장',
    titleLocal: '行政院院長',
    titleEn: 'Premier of the Republic of China (President of the Executive Yuan)',
    rank: 1,
    scopes: [
      { historicalCountryId: 'bcad5825-1276-40cd-a625-af61b27dfa11', localTitle: '行政院院長' },
      { countryId: '9fc82dc5-8b16-4bca-b9e6-8322faaede30', localTitle: '行政院院長' },
    ],
  })
  const natGovChairId = await ensureScopedDef({
    positionType: 'HEAD_OF_STATE',
    title: '국민정부 주석',
    titleLocal: '國民政府主席',
    titleEn: 'Chairman of the National Government',
    rank: 1,
    scopes: [{ historicalCountryId: 'bcad5825-1276-40cd-a625-af61b27dfa11', localTitle: '國民政府主席' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_government_position_id = ?, head_of_government_title = NULL WHERE id IN ('9de93f0d-e9d4-46d0-8c39-cd932f93c36f','fd564725-ce56-426a-8f6c-f7350926f0f9')`,
    [execYuanId],
  )
  await conn.query(
    `UPDATE political_system SET head_of_state_position_id = ?, head_of_state_title = NULL WHERE id = 'fd564725-ce56-426a-8f6c-f7350926f0f9'`,
    [natGovChairId],
  )

  // 7) 국가재건최고회의 의장
  const scnrChairId = await ensureScopedDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '국가재건최고회의 의장',
    titleEn: 'Chairman of the Supreme Council for National Reconstruction',
    rank: 1,
    scopes: [{ countryId: 'b4684d4d-3ca2-46ca-86c1-f3f60ae0ac51' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_government_position_id = ?, head_of_government_title = NULL WHERE id = 'e46ecb5b-0cfa-40f4-871d-b6b4b67eacb2'`,
    [scnrChairId],
  )

  // 8) 소련 최고소비에트 상임간부회 의장
  const ussrPresidiumId = await ensureScopedDef({
    positionType: 'HEAD_OF_STATE',
    title: '최고소비에트 상임간부회 의장',
    titleEn: 'Chairman of the Presidium of the Supreme Soviet',
    rank: 1,
    scopes: [{ historicalCountryId: 'b3ff8fa7-b7fd-4254-b674-2e1abbd12330' }],
  })
  await conn.query(
    `UPDATE political_system SET head_of_state_position_id = ?, head_of_state_title = NULL WHERE id = 'e9c2c351-d957-4bf2-acc1-5e98bafea134'`,
    [ussrPresidiumId],
  )

  // 9) 동독 국가평의회 의장 -> 보편 정본 연결
  const stateCouncilChairId = await ensureUniversalDef({
    positionType: 'HEAD_OF_STATE',
    title: '국가평의회 의장',
    titleEn: 'Chairman of the Council of State',
    rank: 2,
  })
  await conn.query(
    `UPDATE political_system SET head_of_state_position_id = ?, head_of_state_title = NULL WHERE id = 'fb4ea5d8-fa7b-4625-b799-d14fef2801e6'`,
    [stateCouncilChairId],
  )

  // =========================================================================
  // STEP 6 (Track 3): TreatySignatory position_definition_id 백필
  // =========================================================================
  // 먼저 tenure_id가 있는 서명자 행은 tenure의 position_definition_id로 동기화
  await conn.query(`
    UPDATE treaty_signatory ts
    JOIN government_position_tenure t ON t.id = ts.tenure_id
    SET ts.position_definition_id = t.position_definition_id
    WHERE ts.position_definition_id IS NULL AND t.position_definition_id IS NOT NULL
  `)

  const plenipotentiaryAmbId = await ensureUniversalDef({
    positionType: 'DIPLOMATIC_POST',
    title: '전권대사',
    titleEn: 'Ambassador Plenipotentiary',
    rank: 1,
  })
  const plenipotentiaryMinId = await ensureUniversalDef({
    positionType: 'DIPLOMATIC_POST',
    title: '전권대신·전권위원',
    titleEn: 'Plenipotentiary Commissioner / Minister',
    rank: 2,
  })
  const univForeignMinId = await ensureUniversalDef({
    positionType: 'CABINET_MINISTER',
    title: '외무장관',
    titleEn: 'Foreign Minister',
    rank: 3,
  })
  const univPmId = await ensureUniversalDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '총리',
    titleEn: 'Prime Minister',
    rank: 1,
  })
  const univChancellorId = await ensureUniversalDef({
    positionType: 'HEAD_OF_GOVERNMENT',
    title: '재상',
    titleEn: 'Chancellor',
    rank: 1,
  })
  const univPresId = await ensureUniversalDef({
    positionType: 'HEAD_OF_STATE',
    title: '대통령',
    titleEn: 'President',
    rank: 1,
  })
  const univEmperorId = await ensureUniversalDef({
    positionType: 'HEAD_OF_STATE',
    title: '황제',
    titleEn: 'Emperor',
    rank: 1,
    isMonarchical: true,
  })
  const univKingId = await ensureUniversalDef({
    positionType: 'HEAD_OF_STATE',
    title: '국왕',
    titleEn: 'King',
    rank: 2,
    isMonarchical: true,
  })
  const univQueenId = await ensureUniversalDef({
    positionType: 'HEAD_OF_STATE',
    title: '여왕',
    titleEn: 'Queen',
    rank: 2,
    isMonarchical: true,
  })
  const univRegentId = await ensureUniversalDef({
    positionType: 'REGENT',
    title: '섭정',
    titleEn: 'Regent',
    rank: 1,
  })
  const univChairpersonId = await ensureUniversalDef({
    positionType: 'SPECIAL_POSITION',
    title: '위원장',
    titleEn: 'Chairperson',
    rank: 10,
  })

  // 내각총리대신 (이미 존재하면 조회)
  const [jpPmRows] = await conn.query(
    `SELECT id FROM government_position_definition WHERE is_generic = 0 AND title = '내각총리대신' LIMIT 1`,
  )
  const jpPmId = jpPmRows[0]?.id || univPmId

  const [tsUnlinked] = await conn.query(`
    SELECT id, role FROM treaty_signatory
    WHERE position_definition_id IS NULL AND role IS NOT NULL AND TRIM(role) != ''
  `)
  let tsLinkedCount = 0
  for (const ts of tsUnlinked) {
    const r = ts.role.trim()
    if (r === '연방의회') continue // 기관(의회) 비준 표기이므로 인물 직책 아님
    let targetDef = null
    if (/내각총리대신/.test(r)) targetDef = jpPmId
    else if (/^전권대사|특파대사/.test(r)) targetDef = plenipotentiaryAmbId
    else if (/전권대신|전권위원|전권대관|접견대관|특명전권변리대신|흠차대신/.test(r)) targetDef = plenipotentiaryMinId
    else if (/주영공사|공사/.test(r)) targetDef = univEnvoy
    else if (/외무장관|외무대신|외부대신|외무인민위원/.test(r)) targetDef = univForeignMinId
    else if (/국무장관/.test(r)) targetDef = univSecState
    else if (/^총리/.test(r)) targetDef = univPmId
    else if (/^재상/.test(r)) targetDef = univChancellorId
    else if (/^대통령/.test(r)) targetDef = univPresId
    else if (/섭정/.test(r)) targetDef = univRegentId
    else if (/여왕/.test(r)) targetDef = univQueenId
    else if (/황제|나폴레옹 1세|알렉산드르 1세/.test(r)) targetDef = univEmperorId
    else if (/루이 14세|프리드리히 빌헬름 3세|국왕/.test(r)) targetDef = univKingId
    else if (/참모차장/.test(r)) targetDef = milCanon.viceCogs
    else if (/위원장/.test(r)) targetDef = univChairpersonId

    if (targetDef) {
      await conn.query(
        `UPDATE treaty_signatory SET position_definition_id = ? WHERE id = ?`,
        [targetDef, ts.id],
      )
      tsLinkedCount += 1
    }
  }

  // =========================================================================
  // STEP 7 (Track 4): 중앙부처 표준 기능 분류(categoryId) ↔ 장관·차관·기관장 정본 매핑
  // =========================================================================
  const CAT = {
    FOREIGN: '08a3ca40-72b8-466e-a4db-3fdbbbb51ade', // 외교
    DEFENSE: 'b1724943-c564-4eca-8c3d-7847f3be2386', // 국방
    FINANCE: 'e8c37e78-2849-4612-a9e3-144622da0ca1', // 재정·경제
    ADMIN_SAFETY: '1bea9e3d-f4ae-4d6f-a2b6-2dad92a0138a', // 행정·안전
    JUSTICE: '7b072c83-b310-4654-900b-5d0d3a65d47f', // 법무
    EDUCATION: '68bd8cd9-b912-47ee-8f49-445b1674c5ba', // 교육
    LAND_TRANSPORT: '25d7f4a3-9bf0-4fa9-b362-848622c760c4', // 국토·교통
    LABOR: '6d98608b-97fb-4164-a21d-1dd063121da8', // 고용·노동
    AGRI: 'b1abf436-f0f7-482b-a9d3-830a9de9b60d', // 농림·해양
    HEALTH: '1d6904af-783c-4def-8981-af9d7ada6a7f', // 보건·복지
    INDUSTRY: 'de663a7d-ac64-430f-ae6b-5406522d718e', // 산업·에너지
    GENERAL_EXEC: '4e09ea52-feb2-4d60-abb8-d233c88cdf66', // 국정 총괄
    PLANNING: '2fbf324c-7010-4cbf-a8df-5a3b9022d09f', // 기획·조정
  }

  const categoryRules = [
    { catId: CAT.FOREIGN, titles: ['외무장관', '국무장관', '외국봉행', '예조판서', '외무부 사무총장'] },
    { catId: CAT.DEFENSE, titles: ['국방장관', '전쟁장관', '해군장관', '병조판서', '군함봉행', '보병봉행', '군무관 판사', '병부대보', '국가안보보좌관'] },
    { catId: CAT.FINANCE, titles: ['재무장관', '호조판서', '감정봉행', '재무부 철도사무국장'] },
    { catId: CAT.ADMIN_SAFETY, titles: ['내무장관', '국토안보장관', '이조판서'] },
    { catId: CAT.JUSTICE, titles: ['법무장관', '형조판서', '검찰총장'] },
    { catId: CAT.EDUCATION, titles: ['교육장관'] },
    { catId: CAT.LAND_TRANSPORT, titles: ['교통장관', '주택도시개발장관', '공조판서'] },
    { catId: CAT.LABOR, titles: ['노동장관'] },
    { catId: CAT.AGRI, titles: ['농무장관'] },
    { catId: CAT.HEALTH, titles: ['보건복지장관', '보훈장관'] },
    { catId: CAT.INDUSTRY, titles: ['상무장관', '에너지장관'] },
    { catId: CAT.GENERAL_EXEC, titles: ['부총리', '수석장관', '무임소장관', '우의정', '좌의정', '로주', '와카도시요리', '대신위원회 의장', '비서실장'] },
  ]

  let catUpdated = 0
  for (const rule of categoryRules) {
    const [res] = await conn.query(
      `
      UPDATE government_position_definition
      SET category_id = ?
      WHERE is_generic = 0 AND category_id IS NULL AND title IN (?)
      `,
      [rule.catId, rule.titles],
    )
    catUpdated += res.affectedRows || 0
  }

  console.log('[normalize-positions-and-references] Done:', {
    milMigrated,
    tsLinkedCount,
    catUpdated,
  })
  await conn.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
