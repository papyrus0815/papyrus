# 인물 상세 「개요·전기」 개선 검토서 (2차 다각도 리뷰)

- 작성일: 2026-07-16
- 상태: **검토 완료 · 구현 완료(미커밋) — 2026-07-17.** 61건 중 **58건 구현**, 3건 의도적 보류(아래). 검증: API tsc 0 · web tsc 0 · 변경파일 lint 0 · jest 68건 통과(rich-text-read-view.spec는 커밋 `9d4b3af70`부터의 `import.meta`→client.ts 환경 이슈로 실행 불가 — 본 변경과 무관). 라이브 e2e 미실행. 병렬 팀원 WIP와 다수 파일이 엉켜 **미커밋**(성격별 hunk 선별 커밋은 후속).
  - **보류 3건(P3)**: **UX5**(경력·학력·수상 항목 수정 — 백엔드 PATCH 엔드포인트 신설 필요, 별도 작업) · **UX6**(활동·이력 빈 상태 노출 — 4개 하위그룹 중 3개가 저작 UI 자체 부재[검증자 정정]라 빈 섹션이 오히려 오도) · **UX4**(임베드 클러스터 라벨/섹션 게이트 조건 일치 — 조건부 클러스터 렌더 재설계 필요, 위험>가치).
  - 구현 분담: 백엔드 클러스터(BE1·2·3·4·5·6부분·8·PF2·DS4·CC1서버·CC3서버) + 리치텍스트 읽기/에디터(RD1·2·4·5·AY2·8·MD3) + 기타 프론트(TC3·4·MD2·ER5·2·AY1·5) = 서브에이전트, god 파일 2개·helpers·개요 UX·동시성 클라이언트 = 메인.
- 요구: 인물 상세 페이지의 「개요 탭」(패널 헤더·4클러스터 14섹션)과 「전기」(섹션 저작·읽기)를 다각도로 재검토한다. 1차 개요 리뷰(2026-07-01, 41건 — 문서 미작성·배치 1·2+IA 재편 구현됨)와 전기 용어·엔티티 링크 검토(`docs/person-biography-term-entity-review.md`, 36건) **이후에 새로 발견 가능한 것**과 **기지 잔여 항목의 현재 상태**를 함께 확정한다.
- 방법: 8개 렌즈 병렬 리뷰(저장 안전·백엔드 계약·UX/IA·전기 저작·전기 읽기·성능 구조·접근성·시간축 정합) + 기지 14항목(K1~K14) 재검 → 렌즈 간 중복 병합(61→51) → **전 건 file:line 적대 검증**(생존 48: CONFIRMED 42/PARTIAL 6, 반박 탈락 3) → 완전성 비평이 지목한 보강 3렌즈(에러 상태·동시 편집·미디어 견고성) 추가 리뷰·검증(+13). 총 78 에이전트.
- 결과: **확정 61건 = P1 4 · P2 21 · P3 36** (CONFIRMED 51 / PARTIAL 10). **전 건 무마이그** — 스키마 정리 대기 없이 전 배치 착수 가능.
- 범위 경계: 개요 탭+전기 수직 슬라이스(프론트 `widgets/person/person-detail-panel/*`+`shared/ui/rich-text-*` 소비 지점, 백엔드 person 도메인). 용어·엔티티 링크는 기존 검토서 소관(중복 배제), 연보·가계도·정치 탭 제외. 작업트리 기준(병렬 WIP 포함) 2026-07-16 시점.

---

## 0. 결론 요약

1차 리뷰가 개요의 **IA·인라인 편집 표면**을 다뤘다면, 이번에 확정된 결함은 그 아래층에서 나왔다 — **저장 파이프라인의 '성공 낙관' 설계**와 **서브리소스 API의 규약 미계승**이 두 개의 뿌리다.

**P1 4건 (즉시 차단 권고):**

1. **BE1** — 경력·학력·수상 **서브리소스 22개 엔드포인트 전체에 계정 소유권 검사 부재**. 같은 파일의 인물 본체(PUT/DELETE)·연보(lifeEvents)는 검사하는데 이 22개만 뚫려 있고, 「방 놀러가기」로 타 계정 personId가 노출되는 지금 id만 알면 타 계정 데이터 생성·삭제가 성립한다.
2. **BE2** — 능력치 부분수정의 `'politics' in dto` 판정이 **ES2023 `useDefineForClassFields`로 항상 true**. 일괄 평가 모달이 의존하는 "생략 키=기존값 유지" 계약이 컴파일 타깃 전환으로 무너져, 정치력만 일괄 평가하면 대상 전원의 나머지 축·노트가 조용히 null로 wipe된다(런타임 재현 완료).
3. **DS1** — 전기 명시 저장이 **PUT 결과 확인 전에 편집모드를 닫아** 실패 시 flush 안전망·재시도 동선 밖으로 이탈. 읽기 모드가 미저장 원고를 저장본처럼 보여주고, 이후 인물 전환·탭 이동 한 번에 원고가 영구 소실된다.
4. **CC1** — PUT /persons/:id의 sections·nicknames가 **동시성 토큰 없는 전체 delete-recreate**. 멀티탭·스택 모달·상세 위 수정 모달이 각자 stale 스냅샷으로 전체 배열을 밀어 넣는 구조라, 마지막 저장이 상대 세션의 저장을 무통보 역전시킨다(삭제 섹션 부활 포함). `Person.updatedAt`이 이미 있어 무마이그 프리컨디션으로 막을 수 있다.

**뿌리 5개:**

- **전기 저장 파이프라인이 '성공 낙관' 설계** — 편집모드 종료·낙관 반영이 PUT 결과와 분리(DS1·DS3·DS4), 서버는 전체 교체 delete-recreate(CC1·CC3), 클라이언트는 스냅샷 전체 왕복(CC4). 실패·동시성·부분 반영에 전부 무방비.
- **서브리소스 API가 본체와 다른 시대에 만들어져 규약 미계승** — 소유권(BE1)·날짜 검증(BE3)·enum/범위 검증(BE6)·POST 매핑(BE5)이 lifeEvents·본체 경로에는 있는 규약을 빠뜨림.
- **정본 시간축 레이어가 있는데 개요 헤더·KPI·배지가 우회** — 연보 리뷰에서 확인된 실패 패턴의 개요판(UX1·TC1·TC2·TC3). BC·미상·circa 인물에서 헤더가 가장 먼저 깨진다.
- **비정상 경로(에러·미디어 실패·embed)가 정상 경로 마감에서 소외** — fetch 실패 무성 둔갑(ER2~ER5), 이미지 실패 무방비(MD1~MD4), embed 모달의 편집 어포던스 누출(UX2). cross-account 읽기 지면(방)이 생기며 노출면이 커졌다.
- **플랫폼 드리프트가 계약을 조용히 깨는 유형**(BE2) — 코드 변경 없이 tsconfig target 상향만으로 P1이 됐다. `in` 판정·클래스 필드 의존 코드의 전수 점검 가치.

---

## 1. 기지 항목 현황 재검 (K1~K14)

선행 리뷰 2건의 미해결 추적 항목을 현재 작업트리에서 재검증한 결과. **K2(학력 진입점)·K11(D1 계정 스코프)이 해소**됐고, K1·K9는 부분 해소, 나머지 10건은 잔존.

- **K1 ◐ 부분 해소** — person-detail-panel.styles.ts:1016·1026 OverviewSectionHeaderRow/OverviewSectionHeading(h3) 추출·재사용(spouse-detail-section.tsx:37 포함), 출생/사망 카드도 LifeCardTitle=styled.h3(styles:1769), defaultOpen={count>0} 규칙은 상수 false로 대체(person-detail-panel.tsx:1977 등 4곳); 그러나 collapsible-section.tsx:73-89 제목은 여전히 heading 아닌 버튼 내 span으로 헤더 체계 이원 유지 — 단일 공용 헤더 컴포넌트 미완.
- **K2 ✅ 해소** — education-register-modal/education-register-modal.tsx 신설, person-detail-panel.tsx:96 import·2105 학력 섹션 actions의 추가 버튼이 setEducationModalOpen(true)·2931 모달 렌더 — 학력 추가 진입점 배선 완료.
- **K3 ❌ 잔존** — web-admin 전체 grep InfluenceEditor 0건; editingInfluence/influenceDraft 상태가 패널 최상위(person-detail-panel.tsx:406-408)에 있고 슬라이더가 인라인(L1689~)이라 드래그가 여전히 개요 전체 재렌더.
- **K4 ❌ 잔존** — person-detail-panel.tsx:2004·2126·2231·2356·2401·2489 — 렌더 내 IIFE에서 useMemo 없이 매 렌더 .sort() 실행 유지.
- **K5 ❌ 잔존** — person-detail-panel.tsx 여전히 3187줄(wc -l) — birth-death-cards·spouse-detail-section·education-register-modal 등 일부 추출은 있었으나 god 본체 분해 미착수.
- **K6 ❌ 잔존** — isoDateSortKey는 widgets/person/person-detail-panel/helpers.ts에만 존재(grep -l 결과 helpers.ts·panel 2파일) — shared/lib 승격 안 됨.
- **K7 ❌ 잔존** — person-detail-panel.tsx:1661~2791 <section aria-label> 8곳 region 남용 유지, role=meter 0건(영향력 막대), aria-label="삭제" 비맥락 3곳(L2043·2153·2247), collapsible-section.tsx 제목이 heading 아닌 버튼 — 기지 a11y 항목 전부 잔존.
- **K8 ❌ 잔존** — person.prisma.repository.ts:1580 PersonEvent.event select에 description: true 유지 + person.controller.ts:724 events: person.PersonEvent 그대로 통과 — full description 과다 fetch 미해결.
- **K9 ◐ 부분 해소** — person.controller.ts:672 buildHistorical이 thumbnailUrl 포함, first-class country:true(repository:1118)도 전체 스칼라라 주 경로는 보존; 단 CITIZENSHIP 폴백의 현대국가는 PERSON_INCLUDE_AFFILIATIONS_FOR_NAME country select(repository:85-93)에 thumbnailUrl이 없어 그 경로만 여전히 손실.
- **K10 ❌ 잔존** — person.controller.ts:632 biography와 L635 biographySections를 둘 다 무가공 반환, service/repository에 수렴 로직 0건 — 프론트가 legacyBiography 시드(person-biography-sections.tsx:98-115)로 표시만 봉합, 백엔드 NULL 수렴 미처리.
- **K11 ✅ 해소** — entity-link-search.controller.ts:66-114 getActorAccountId 기반 person accountId·event createdById 스코프 존재, git status 클린·커밋 ae2f71483(2026-07-16 'fix(api): 엔티티 링크 검색 소유자 스코프 + 연보 목록 인증 가드')로 D1 미커밋 상태 해소.
- **K12 ❌ 잔존** — use-rich-text-prose-click.ts:241·306·338 — 정당/역사국가/군부대 데드엔드는 여전히 notify.show 토스트(D2-light)뿐 dynasty식 인라인 툴팁 미구현, navigate 타입(L147 personGroup·257 event·269 company·281 country)은 존재확인 없이 즉시 navigate(D3 사전검증 부재).
- **K13 ❌ 잔존** — person-biography-sections.tsx에 mentionEntities 추천 프리시드 0건(추천 grep 결과는 빈상태 템플릿 팔레트뿐 L653·1301), apps/api/prisma/seeds/에 term/glossary 시드 파일 없음 — E4·E5 모두 미착수.
- **K14 ❌ 잔존** — F1: EntityMention이 libs/db/prisma·schema.prisma·api src 어디에도 0건(마이그 미실행); A2/D-2: glossary.controller.ts:101 여전히 where.countryId = countryId 정확일치 AND(OR 전역 대칭화 안 됨); A4: anchorText 0건; B5: person service/controller에 sanitize 0건; F2: MENTION_TYPE_CONFIG 死코드 유지 — A1만 배치0 결정(D-1 전역 확정)으로 '불필요' 종결, 나머지 배치5 전부 잔존.

---

## 2. 발견 목록 (61건 · 전 건 적대 검증)

> 표기: ID · 심각도(P1 손실/보안/파손, P2 명백한 결함·함정, P3 개선) · 규모(S≤1h/M 반나절/L 1일+) · 마이그 여부. PARTIAL은 검증자가 정정한 내용을 함께 기록.

### DS. 저장·데이터 안전

#### DS1 · **P1** · M · 무마이그 — 전기 명시 저장 실패 시 편집모드가 PUT 결과 확인 전에 이미 종료돼 flush 안전망·재시도 동선에서 제외 — 읽기 모드가 미저장 내용을 저장본처럼 표시하고 이후 이탈 시 영구 유실

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:604`
- **증거**: saveSection(L604-610): `setEditingKey(null); persistNow(latestRowsRef.current)` — PUT 결과를 기다리지 않고 편집모드를 먼저 닫는다. doPersist 실패 시(L356-360) `notify.error(...)` 토스트만 띄우고 lastPersistedRef 기준선도 갱신하지 않으며 재시도 경로가 없다. 이후의 flush 안전망은 전부 `pendingTimer != null || hasDirtyInProgressEdit()` 조건인데(인물 전환 L441, 언마운트 L490), hasDirtyInProgressEdit(L413-424)는 `editingKeyRef.current == null`이면 즉시 false. 재현: 섹션 편집→긴 본문 타이핑→저장 클릭→PUT 실패(네트워크 단절·413·세션 만료)→읽기 모드에는 타이핑한 내용이 그대로 보임(저장된 것처럼)→탭 전환 또는 다른 인물 클릭→rows 리셋, 서버엔 옛 내용만 남아 전체 편집분 영구 소실. 토스트 하나가 유일한 신호이고 화면상 dirty 표시가 없다.
- **영향**: 단 한 번의 일시적 저장 실패가 수 시간 분량의 전기 원고를 되돌릴 수 없이 삭제할 수 있다. '실패인데 성공처럼 보이는 경로'의 전형 — 읽기 모드가 미저장 콘텐츠를 저장본처럼 렌더링한다.
- **제안**: ① flush 조건(hasDirtyInProgressEdit)을 '편집 중 row'가 아니라 lastPersistedRef 기준 `rows.some(r => isRowDirtySince(r, lastPersisted))`로 확장해 실패 잔여분도 인물 전환·언마운트 시 재전송. ② doPersist 실패 시 해당 섹션을 편집모드로 복귀시키거나 '저장 실패 — 재시도' 배너/버튼을 노출해 dirty 상태를 시각화.
- **검증**: CONFIRMED

#### DS2 · **P2** · S · 무마이그 — 편집 중 다른 섹션 ✎/섹션 추가 진입 시 이전 편집을 마감하지 않고 editingKey·editInitialRef를 덮어써 미저장 변경이 dirty 추적에서 고아화 — 조용한 유실 또는 조용한 동반 커밋

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:511`
- **증거**: beginEdit(L511-521)는 `editInitialRef.current = {title: row?.title…}; setEditingKey(key)`만 수행 — 이전 편집 섹션의 저장/취소 확인이 없다. addSection(L501-509)도 동일하게 editInitialRef를 새 row 값으로 덮어쓴다. 편집 중이 아닌 다른 섹션의 StickyEditBtn(L897-905)은 항상 노출되므로 진입 가능. 재현: 섹션 A 편집→타이핑(미저장)→섹션 B의 ✎ 클릭→editingKey=B로 이동, A의 변경은 rows에만 잔존하며 editInitialRef 기준선을 잃음→B를 Esc 취소 후 인물 전환/패널 닫기→flush 조건(hasDirtyInProgressEdit)은 B만 검사해 false→A의 타이핑 조용히 유실(그 사이 화면에는 A의 변경이 저장된 듯 표시). 반대로 B를 '저장'하면 A의 반쯤 친 초안이 통째 PUT에 동반 커밋된다.
- **영향**: 여러 섹션을 오가며 쓰는 자연스러운 저작 흐름에서 미저장 변경이 소리 없이 유실되거나(취소·이탈), 의도하지 않은 초안이 커밋되는(저장) 양방향 함정.
- **제안**: beginEdit/addSection 진입 시 기존 editingKey가 dirty면 confirm('저장하지 않은 변경이 있습니다…')로 저장/폐기를 강제하거나, 사건 상세 InlineRichText처럼 자동 저장 후 전환. 최소한 F1의 flush 조건 확장(lastPersisted 기준 전 row dirty 검사)과 함께 적용하면 유실 경로는 닫힌다.
- **검증**: CONFIRMED

#### DS3 · **P2** · M · 무마이그 — 편집 중 구조 변경(삭제·이동)의 디바운스 PUT이 편집 중 초안을 함께 서버에 발행 — 이후 Esc 취소가 서버에 반영되지 않아 UI·서버 발산

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:524`
- **증거**: removeSection/moveSection은 `persistDebounced(next)`로 rows 전체를 전송하는데 cleaned(L331-338)는 편집 중(editingKey) row의 현재 타이핑 내용을 그대로 포함한다. 이후 cancelEdit(L524-541)은 로컬 rows만 editInitialRef로 복원하고 **PUT을 쏘지 않는다**. 재현: 섹션 A 편집·타이핑→'관리' 토글(편집 유지된 채 가능)→섹션 B 삭제(confirm)→600ms 디바운스 PUT에 A의 초안 포함 커밋, lastPersistedRef도 초안 기준으로 갱신(L346)→A를 Esc로 취소('변경을 버릴까요?' 확인)→화면은 원본 복원되지만 서버에는 버린 초안이 남음. 복원된 row는 lastPersisted와 달라 dirty지만 flush 조건은 편집 중 row만 보므로 재동기화도 안 됨→재방문 시 '취소했던 내용'이 되살아나 있음.
- **영향**: 명시적으로 '버림'을 확인한 변경이 서버에 잔존 — 사용자 의도와 저장 상태의 발산이며, 취소 기능이 사실상 무효가 되는 결함.
- **제안**: ① 구조 변경 persist 시 편집 중 row는 rows의 현재값 대신 editInitialRef(편집 진입 시점) 내용으로 직렬화하거나, ② cancelEdit에서 복원된 rows가 lastPersistedRef와 다르면(중간 persist가 있었으면) persistNow로 복원분을 재전송.
- **검증**: CONFIRMED

#### DS4 · **P3** · S · 무마이그 — 백엔드 update가 트랜잭션 커밋 후 부수효과(알림·완성도 포인트) 예외를 그대로 전파 — 저장 성공을 프론트에 실패로 보고해 dirty 기준선 오염·중복 알림 유발

- **위치**: `apps/api/src/libs/person/application/person.service.ts:482`
- **증거**: update(L454-497): `await this.personRepository.update(id, data)`(트랜잭션 커밋) 이후 `await this.notificationService.notifyPerson(...)`(L482)과 `await this.pointService.awardCompletenessBonus(...)`(L490)를 try/catch 없이 await — 여기서 예외가 나면 500이 반환된다. 재현: 전기 섹션 저장 PUT→personSection delete-recreate 커밋 완료→알림/포인트 적립에서 예외(DB 순단 등)→프론트 doPersist catch가 '전기 저장에 실패했습니다' 토스트를 띄우고 lastPersistedRef 기준선도 갱신하지 않음→실제로는 저장돼 있어 사용자가 재저장하면 알림 중복 발행, 안 하면 로컬 dirty 판정·sync 기준선이 서버 실상과 어긋난 채 동작.
- **영향**: 저장 성공/실패 피드백의 정확성 훼손 — 성공을 실패로 안내해 불필요한 재시도(중복 알림·포인트 재산정)를 유발하고, 프론트의 dirty 기준선을 오염시킨다.
- **제안**: 커밋 이후의 notifyPerson·awardCompletenessBonus를 try/catch로 격리해 로깅만 하고 응답은 저장 결과(person)를 반환. create(L442-447)의 동일 패턴도 함께 점검.
- **검증**: ⚠ PARTIAL — 핵심은 성립: update 커밋(L472) 후 L482 notifyPerson이 try/catch 없이 await되고, NotificationService(notification.service.ts L19-52)와 컨트롤러(@Put ':id', person.controller.ts L945) 어디에도 격리가 없어 알림 예외 시 저장 성공에도 500 전파 → 프론트 person-biography-sections.tsx L339/346/356-360의 doPersist catch가 실패 토스트를 띄우고 lastPersistedRef 기준선 미갱신(재현 체인 실재). 단 두 가지 정정 필요: (1) L490 awardCompletenessBonus는 불성립 — point.service.ts는 문서화된 설계(L124-125)대로 addEntry(L257-274)·resolveContentCentury/Country(L875-925 등)·evaluateBadges(L755-766) 전 구간이 내부 try/catch로 오류를 로그만 남기고 흡수해 예외가 전파되지 않음(create의 awardForCreate L169-183도 동일). (2) '중복 알림' 결과도 불성립 — 커밋 후 무방비 await는 notifyPerson 하나뿐이고 그것이 실패하면 알림 행이 애초에 안 생기므로, 재저장 시 알림은 처음 1회 발행될 뿐 중복이 아님. 결과적으로 증상은 '성공을 실패로 보고 + dirty 기준선 오염 + 불필요 재시도'로 한정되며 알림 경로(L482, create의 L436 포함)만 격리하면 됨.

#### DS5 · **P3** · S · 무마이그 — 전기 편집 중 브라우저 새로고침·창 닫기 보호 부재 — beforeunload 가드·keepalive 없이 언마운트 flush는 SPA 내부 전환만 커버

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:482`
- **증거**: 언마운트 flush(L482-495)는 React cleanup에서 `doPersist(...)`를 호출하는 구조라 SPA 라우팅·탭 전환·모달 닫기에서만 동작한다. `beforeunload` 리스너가 없고(파일 전체에 부재), flush의 updatePerson도 keepalive 옵션 없는 일반 XHR이라 문서 unload 시 중단될 수 있다. 재현: 섹션 편집 중 장문 타이핑→습관적 F5(새로고침) 또는 브라우저 창 닫기→아무 경고 없이 편집분 소실. 같은 리포의 person-edit 페이지는 useBlocker+confirm으로 이탈을 가드하는 것과 비대칭.
- **영향**: 컴포넌트 주석이 '저장 안 누른 타이핑의 조용한 유실 방지'를 목표로 명시하지만 전체 페이지 unload 경로가 잔여 구멍으로 남아 있다. 어드민에서 새로고침은 흔한 습관이라 실사용 빈도가 낮지 않다.
- **제안**: editingKey가 있고 hasDirtyInProgressEdit()(또는 lastPersisted 대비 dirty)일 때만 beforeunload에서 preventDefault로 네이티브 이탈 확인을 띄우고, pagehide 시점에는 fetch keepalive(소용량일 때) 또는 확인창만으로 최소 방어.
- **검증**: CONFIRMED

### BE. 백엔드 계약·권한·검증

#### BE1 · **P1** · M · 무마이그 — 경력·학력·수상 서브리소스 22개 엔드포인트 전체에 계정 소유권 검사 부재 — 타 계정 데이터 생성·삭제·열람 가능

- **위치**: `apps/api/src/libs/person/presentation/person.controller.ts:1198`
- **증거**: 컨트롤러: `@Delete('careers/military/:id') … await this.personService.deleteMilitaryCareer(id)` — accountId를 아예 안 넘김(POST 11종 L1106~1188, DELETE 11종 L1198~1292, GET :personId/careers L1098 동일). 서비스도 무검사 통과(person.service.ts L604 `addMilitaryCareer(dto)` → repo 직행, L1208 `deleteMilitaryCareer(id)`), 리포지토리는 `this.prisma.militaryCareer.delete({ where: { id } })`(person.prisma.repository.ts L3821)로 스코프 없는 삭제. PrismaService에 전역 계정 스코핑($use/$extends)도 없음을 확인. 재현: 계정 B로 로그인 → DELETE /persons/careers/military/{계정A의 경력 id} → 204로 삭제 성공 + notifyPersonSection이 알림까지 발행. POST /persons/educations에 타 계정 personId를 넣으면 남의 인물에 학력이 붙음. GET /persons/{타계정 personId}/careers는 findAllCareers가 `findById(personId)`를 accountId 없이 호출(L1267)해 존재 확인만 하고 전체 경력을 반환.
- **영향**: 같은 파일의 인물 본체(PUT/DELETE :id)와 연보(addPersonLifeEvent L823~886)는 소유권을 검사하는데 이 서브리소스 22개 엔드포인트만 뚫려 있음 — '방(놀러가기)'로 타 계정 personId가 카드에 노출되는 지금, id만 알면 파괴적 cross-account write가 성립하는 보안·데이터 손실 결함.
- **제안**: lifeEvents 패턴(person.service.ts L823~)을 그대로 이식: add류는 dto.personId의 Person.accountId를 조회해 불일치 시 ForbiddenException, delete류는 행→personId→소유자 검증 후 삭제, findAllCareers는 findById(personId, accountId)로 스코프. 컨트롤러에서 `req.user?.id ?? req.user?.sub`를 서비스로 배선.
- **검증**: CONFIRMED

#### BE2 · **P1** · S · 무마이그 — 능력치 부분수정 `'politics' in dto` 판정이 ES2023 useDefineForClassFields로 항상 true — 일괄 평가 시 미전송 축이 조용히 null 초기화

- **위치**: `apps/api/src/libs/person/application/person.service.ts:2172`
- **증거**: `if ('politics' in statsDto) data.politics = statsDto.politics ?? null`(upsertMyEvaluation L2172~2179, upsertMyStats L2057~2063 동일). tsconfig.base target=ES2023 → useDefineForClassFields=true라 컴파일 산출물(dist/…/person-stats.dto.js)이 `class UpsertPersonStatsDto { politics; military; … }`로 모든 필드를 own property(undefined)로 정의 — GlobalValidationPipe의 plainToClass가 만든 인스턴스에서 `'k' in dto`는 페이로드에 없던 키도 전부 true. 재현: person-bulk-evaluate-modal.tsx L80~85가 의도적으로 부분 페이로드 전송("null 차원은 보내지 않음 — 기존 점수 보존") → 정치력만 90으로 일괄 평가하면 대상 인물들의 기존 military/diplomacy/intellect/charisma/administration/notes가 전부 null로 wipe(override 체크 여부 무관).
- **영향**: 문서화된 계약(L2040 '생략된 키는 기존값 유지')이 컴파일 타깃 변화로 무너졌고, 프론트 일괄 평가 모달이 정확히 이 계약에 의존하므로 출하된 실사용 흐름에서 무성 데이터 손실이 발생.
- **제안**: `'k' in dto` → `dto.k !== undefined`로 교체(명시적 null=초기화 의미는 보존). upsertMyStats·upsertMyEvaluation 두 곳 모두. 재발 방지로 DTO 필드에 `declare`를 붙이거나 공용 헬퍼(pickDefined)로 수렴.
- **검증**: CONFIRMED

#### BE3 · **P2** · S · 무마이그 — DateInfoDto year/month/day 범위 미검증 — month=13·day=0·연도 0/음수가 400 없이 silent 롤오버 저장

- **위치**: `apps/api/src/libs/person/presentation/dto/create-person.dto.ts:131`
- **증거**: `@IsNumber() year!: number` / month·day도 `@IsNumber()`뿐(L127~141) — @IsInt/@Min/@Max 없음. 컨트롤러 buildUtcDateFromParts(person.controller.ts L68~72)는 `Date.UTC(2000,(month||1)-1, day||1)` 후 setUTCFullYear라 재현: birth={era:'AD',year:1500,month:13} → Date.UTC가 2001-01-01로 롤오버된 뒤 연도만 1500으로 덮여 '1500년 1월'로 저장(월 13이 1월로 둔갑, 에러 없음). day=32 → 다음 달로 밀림, month=0·day=0 → `||1` 폴백으로 1월/1일 날조, year=0·음수 → birthYear 0/음수가 era와 무관하게 응답에 그대로 노출.
- **영향**: 생몰 정밀도(birthDatePrecision) 체계까지 만들어 '연도만 앎→1월1일 둔갑'을 막아놓고, 정작 잘못된 월·일 입력은 검증 없이 다른 날짜로 조용히 변조되어 저장됨 — 역사 데이터 정확성 플랫폼에서 무성 데이터 손상.
- **제안**: DateInfoDto에 `@IsInt() @Min(1)` (year), `@IsInt() @Min(1) @Max(12)` (month), `@IsInt() @Min(1) @Max(31)` (day) 추가. create/update가 공유하는 클래스라 한 곳 수정으로 양쪽 커버.
- **검증**: CONFIRMED

#### BE4 · **P3** · S · 무마이그 — json body limit 10MB < 전기 섹션 검증상수 16MB 상한 모순 — 섹션 합계 10MB 초과 시 그 인물의 모든 전기 저장(무관한 삭제·순서변경 포함)이 진단 불가 raw 413으로 영구 실패

- **위치**: `apps/api/src/apps/api-gateway/src/main.ts:57`
- **증거**: `expressApp.use(json({ limit: '10mb' }))`(main.ts L57) vs `BIOGRAPHY_SECTION_CONTENT_MAX_BYTES = 16777215` + `@MaxByteLength(...)`(create-person.dto.ts L7, L39) — MEDIUMTEXT 마이그레이션으로 섹션당 16MB까지 허용한다고 검증상수를 올렸지만 실효 상한은 body-parser의 10MB(payload 전체 합산). 재현: 섹션 합계 10MB 초과 PUT → Nest 라우팅 전 raw express 계층에서 PayloadTooLargeError 413(GlobalExceptionFilter의 ApiErrorResponse 포맷도 안 탐) → 전기 자동저장 토스트에 비정형 에러 노출, 검증상수 10~16MB 구간은 도달 불가한 죽은 코드.
- **영향**: '64KB 상한 가정 무효'를 위해 만든 16MB 검증이 10MB에서 먼저 잘려 계약과 실제 한도가 다름 — 어디까지 저장 가능한지에 대한 단일 진실 부재.
- **제안**: json/urlencoded limit을 18mb 정도로 상향해 검증상수가 실효 상한이 되게 하거나, 반대로 검증상수를 10MB 미만으로 내려 400(친화 메시지)으로 먼저 걸리게 정렬. 주석으로 두 상수의 종속 관계 명시.
- **검증**: CONFIRMED

#### BE5 · **P3** · S · 무마이그 — POST /persons가 DTO에 선언·검증되는 sections·profileImages를 서비스 매핑 누락으로 무성 드롭 — update 경로와 비대칭인 죽은 계약

- **위치**: `apps/api/src/libs/person/presentation/person.controller.ts:876`
- **증거**: CreatePersonDto는 `sections?: BiographySectionDto[]`(create-person.dto.ts L599~603)와 `profileImages?: ProfileImageDto[]`(L425~429)를 선언·검증하지만, create()의 서비스 호출 매핑(L876~939)에 두 필드가 없고 CreatePersonData(domain/person.repository.ts L42~128)에도 키 자체가 없음 — 검증까지 통과한 페이로드가 조용히 버려짐. update 경로는 `sections: dto.sections`(L1076)로 정상 전달되는 비대칭. 재현: POST /persons에 sections를 실어 보내면 201인데 전기 섹션 0개.
- **영향**: 현재 웹 프론트는 생성 시 sections를 안 보내 실피해는 없지만(전기는 상세에서 PUT), SDK 계약상 받는 척하고 버리는 필드는 API 직접 사용·향후 등록 폼 확장 시 무성 유실 함정이 됨.
- **제안**: create 매핑에 sections를 추가하고 repository.create에서 update와 동일하게 createMany 하거나, 반대로 CreatePersonDto에서 sections/profileImages를 제거해 계약을 정직하게. (forbidNonWhitelisted라 제거 시 보내면 400으로 명시 거부됨)
- **검증**: CONFIRMED

#### BE6 · **P3** · M · 무마이그 — 재임·경력 DTO 런타임 검증 구멍 — enum을 @IsString만으로 검증, Int 필드 소수·TEXT 무제한이 Prisma 500으로 전환('400 원칙'과 비대칭)

- **위치**: `apps/api/src/libs/person/presentation/dto/create-career.dto.ts:673`
- **증거**: `@IsString() positionType!: 'HEAD_OF_STATE' | …`(L672~673) — TS union은 런타임 무력이라 임의 문자열이 통과해 Prisma enum 컬럼에서 500(appointmentMethod L721~722, endReason L724~726 동일; CreateSovereignReignDto도 같음). `@IsNumber() termNumber`(L59~60)·classNumber·jerseyNumber는 소수·음수 허용 → Int 컬럼에서 Prisma 에러 500(BiographySectionDto.order L42~44도 동일 패턴). 또 UpdatePersonDto.biography/birthNote/deathNote는 @db.Text(64KB, person.prisma L192)인데 길이 검증 전무 — deathCause는 MaxLength(300)로 이미 '500 대신 400' 처리한 것과 비대칭.
- **영향**: deathCause·nickname 등에 'Prisma 500 대신 400' 원칙을 이미 적용해 놓고 같은 파일·같은 수직 슬라이스의 나머지 필드는 미적용 — 크래프트된 요청이나 향후 폼 확장에서 사용자에게 원인 불명 500이 떨어짐.
- **제안**: enum 유니온 필드는 `@IsIn([...])`(mandateSource L757이 이미 모범), 정수 필드는 `@IsInt()`+범위, TEXT 필드는 `@MaxByteLength(65535)` 부여. 기계적 일괄 적용 가능.
- **검증**: ⚠ PARTIAL — 핵심 성립: (1) enum 유니온 필드가 @IsString만으로 검증됨을 확인(create-career.dto.ts:672-673 positionType, :720-726 appointmentMethod/endReason, CreateSovereignReignDto :805-811 동일; :757 mandateSource만 @IsIn). 검증 경로는 nestia TypedBody가 아닌 @Body()+class-validator GlobalValidationPipe(shared/pipes/validation.pipe.ts:11)라 TS 유니온 런타임 무력, 서비스(person.service.ts:688)에도 enum 가드 없음. (2) 500 전환 성립: GlobalExceptionFilter(global-exception.filter.ts:82-127)는 PrismaClientKnownRequestError P2002/P2025/P2003/P2004만 매핑 — 잘못된 enum·Int 소수는 PrismaClientValidationError로 기본 분기(L99-111)→500, TEXT 초과는 P2000으로 미매핑→500. (3) 비대칭 성립: update-person.dto.ts:166 deathCause @MaxLength(300)에 '500 대신 400' 주석 명시인데 biography(L226)·birthNote(L114)·deathNote(L175)는 길이검증 전무, person.prisma L156/180/192 셋 다 @db.Text. 정정 필요: '소수·음수 허용→500' 중 음수는 불성립 — Prisma Int는 signed라 음수는 에러 없이 저장(데이터 품질 문제일 뿐 500 아님). 소수만 500 유발. 나머지 라인·심각도(P3)는 정확.

#### BE7 · **P3** · M · 무마이그 — 검증 실패 400이 'Validation failed' 고정 문구 — 전기 자동저장 실패 토스트에 raw JSON/영문 노출로 원인 파악 불가

- **위치**: `apps/api/src/libs/shared/pipes/validation.pipe.ts:26`
- **증거**: `throw new BadRequestException({ message: 'Validation failed', errors: errorMessages })`(L26~29) — 필드·사유가 error.details에만 있고 message는 영문 고정. 프론트 전기 편집기는 `notify.error(err instanceof Error ? err.message : …)`(person-biography-sections.tsx L358~360)인데 nestia HttpError.message는 응답 body 전문이라, 재현: 섹션 제목 500자 초과 자동저장 → 토스트에 `{"success":false,…"message":"Validation failed"…}` JSON 덩어리 또는 무의미한 영문 노출, 사용자는 어느 필드가 왜 거부됐는지 알 수 없고 편집분은 미저장 상태로 남음.
- **영향**: 서버는 deathCause 등에 '400으로 거른다'는 방침을 세워놓고 그 400의 문구가 사용자에게 전달 가능한 형태가 아님 — 자동저장(디바운스) 흐름이라 사용자가 실패를 인지·복구하기 특히 어려움.
- **제안**: GlobalValidationPipe에서 constraints 첫 메시지를 한국어 요약으로 message에 승격(예: '전기 섹션 제목은 500자 이하여야 합니다')하고, 프론트 공용 에러 헬퍼가 ApiErrorResponse.error.message를 파싱해 토스트하도록 수렴.
- **검증**: CONFIRMED

#### BE8 · **P3** · S · 무마이그 — GET :id/detail에서 findHumanRelationships가 소유권 검사용 findById(전체 매핑 포함)를 중복 실행 — 상세 진입마다 인물 본체 쿼리 1세트 낭비

- **위치**: `apps/api/src/libs/person/presentation/person.controller.ts:528`
- **증거**: `const person = await this.personService.findByIdWithRelations(id, accountId)` 직후 `const humanRelationships = await this.personService.findHumanRelationships(id, accountId)`(L527~528). findHumanRelationships는 내부에서 `await this.findById(personId, accountId)`(person.service.ts L1449)를 다시 실행 — 30여 relation을 include하는 거대 상세 쿼리로 이미 소유권이 확정된 뒤에, PersonResponseDto 전체 매핑(국가·소속·별칭 include 포함)을 순수 존재/소유 확인용으로 한 번 더 돌림. 상세 진입마다 인물 본체 계열 쿼리 1세트가 순수 낭비.
- **영향**: 상세 화면은 이 코드베이스에서 가장 자주 열리는 화면이고(K8 트림 등 페치 예산을 이미 관리 중), 같은 요청 안에서 동일 인물·동일 스코프 검증을 2회 수행하는 것은 무상 비용.
- **제안**: 관계 조회를 소유권 검사 없는 내부 메서드로 분리해 getDetailById에서는 findByIdWithRelations 성공을 신뢰하고 호출하거나, findByIdWithRelations의 include에 humanRelationships를 편입해 한 번에 가져오기.
- **검증**: CONFIRMED

### UX. 개요 UX·정보구조

#### UX1 · **P2** · M · 무마이그 — 헤더 생몰 subtitle이 정본 formatLifespan 미위임 — isAlive·미상 플래그 무시로 몰년 미상 고인이 '생존 (수백 세)'로 둔갑하고 circa '경'·floruit 폴백·편측 미상 '?' 규약도 전부 누락돼 같은 화면 카드와 자기모순

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1098`
- **증거**: L1098 `const isDeceased = p.deathYear != null` 뒤 L1127-1131에서 `birthDateStr ? \`${birthDateStr} ~ 생존${currentAge...}\` : ... '생존'`. 사망했으나 연도 미상(isDeathDateUnknown=true, deathYear=null)인 16세기 인물이면 헤더가 "1500년 ~ 생존 (526세)", KPI(L1492-1493)는 "생존 기간 526년 (생존 중)"을 표시. 같은 화면의 사망 카드(birth-death-cards.tsx L153-157)는 "사망 일자 미상"을 표시해 자기모순. 생몰 전면 미상+floruit 인물도 헤더는 그냥 '생존'(floruit는 카드만 노출). 응답에 isAlive가 있고 이 파일 L648이 이미 `person?.isAlive === false`를 사용 중이나 isDeceased 판정에는 미반영. circa(isBirthDateApproximate)도 카드는 '경' 접미(L106), 헤더는 미표기로 불일치.
- **영향**: 역사 백과에서 인물의 생사·생몰은 가장 기본 사실인데 헤더가 사망자를 생존자로, 나이를 수백 세로 단정 표기한다. shared/lib/lifespan-text.ts formatLifespan(L73~)이 미상·circa·floruit 규약의 정본으로 이미 존재하고 가계도 카드·목록은 수렴 완료(커밋 b34614336)인데 상세 패널 헤더만 수렴에서 빠져 화면 내·화면 간 표기가 갈라진다.
- **제안**: isDeceased 판정을 `deathYear != null || p.isAlive === false || p.isDeathDateUnknown`으로 확장하고, 사망 확정+일자 미상이면 '~ 몰년 미상', 생몰 전면 미상이면 floruit 폴백(formatFloruit)을 서브타이틀에 반영. circa는 lifespan-text canon('년경' 접미)을 헤더에도 적용. 가능하면 subtitleLifespan 산출 자체를 formatLifespan 계열 유틸로 위임(월일 표기가 필요하면 유틸에 정밀도 파라미터 추가).
- **검증**: CONFIRMED

#### UX2 · **P2** · M · 무마이그 — embed(읽기) 모달에 편집 어포던스 누출 — 능력치·인간관계·소속그룹·전기(✎/관리/추가)·아바타 5곳이 embedInModal 규약 미적용, '비교' 버튼은 모달 밑 페이지 이탈

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1815`
- **증거**: 패널은 embed에서 편집을 일관 차단(영향력 L1689 `!embedInModal && !editingInfluence`, 재임 추가 L1838, 경력/학력/수상 추가·삭제 L1979/L2039/L2101/L2149)하지만: ① PersonStatsSection(L1815, person-stats-section.tsx L99-113·L171-178)은 embed prop 자체가 없어 '평가 시작/수정' 버튼·빈상태 CTA 노출, '비교' 버튼(L86-97)은 navigate()로 모달 밑 페이지를 persons-timeline으로 이탈시켜 모달 컨텍스트 파괴 ② PersonHumanRelationshipsSection(L2458, 해당 파일 L1354-1405)은 '관계 추가·계보 보기·첫 관계 추가 CTA'와 카드별 수정/삭제/시기 추가 전부 노출 ③ SamePersonGroupSection(L2574, 해당 파일 L119 '그룹 관리') ④ PersonBiographySections(L1668)는 embed에서도 '관리' 토글·sticky 편집(✎)·빈상태 작성 템플릿 노출 ⑤ AvatarButton(L1223-1247)은 embed에서도 클릭 시 파일 선택→업로드 실행.
- **영향**: 임베드 모달(가계도 노드·persons-timeline 등)은 '보기' 여정인데 섹션별로 편집 노출이 제각각이라, 읽는 사람에게 편집 UI 소음이 크고(특히 빈 인물은 CTA 4~5개가 본문보다 많음), '비교' 버튼은 실제로 사용자를 모달 밖으로 튕겨내는 함정이다. 같은 패널 안에서 절반은 읽기전용·절반은 편집가능인 비일관은 규약 위반으로 굳어지기 쉽다.
- **제안**: PersonStatsSection·PersonHumanRelationshipsSection·SamePersonGroupSection·PersonBiographySections에 readOnly(또는 embedInModal) prop을 추가해 헤더 액션·행 액션·빈상태 CTA를 숨기고(빈 데이터면 섹션 자체 숨김 — 기존 careers 패턴 준용), AvatarButton은 embed에서 비대화형 이미지로 렌더. '비교'는 embed에서는 숨기거나 '상세로 이동'과 같은 새 페이지 딥링크임을 명시.
- **검증**: CONFIRMED

#### UX3 · **P2** · S · 무마이그 — 사망자의 진행형 기간이 '~ 현재'/'~ 재학중'으로 표기 — 재임·재위의 endReason/isDeceased 폴백 규약과 불일치

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:2024`
- **증거**: 경력 L2023-2024 `formatPeriod(start, end)`(helpers.ts L154-161 기본 ongoingLabel='현재'), 학력 L2140 `formatPeriod(start, end, '재학중')`, 조직 역할 L2369-2370, 군부대 L2414-2415, 국가 소속 L2515-2516 모두 isDeceased 미반영. 1950년 사망 인물의 종료일 미입력 경력이 "1930년 3월 1일 ~ 현재", 학력이 "~ 재학중"으로 표시. 반면 재임·재위(tenure-reign-list.tsx L106-112)는 endReason·isDeceased를 보고 '사망일/미상/현재'를 분기하는 정본 규약을 이미 구현. 배우자 상세(spouse-detail-section.tsx L50)는 `[start, end].join(' ~ ')`라 start만 있으면 물결표 없이 날짜 하나만 남아 혼인일인지 기간인지 구분 불가 — 제3의 표기.
- **영향**: 역사 인물(대부분 사망자)의 화면에서 '현재'·'재학중'은 명백히 거짓 진술이고, 같은 개요 탭 안에서 미종료 기간 표기가 3가지(현재/미상/무표기)로 갈라져 표기 일관성이 깨진다.
- **제안**: formatPeriod에 isDeceased(또는 endFallbackLabel)를 받아 사망자는 '미상'(tenure-reign-list 규약과 동일)으로 폴백하고, 개요 탭 호출 6곳(경력·학력·조직·군부대·국가소속·배우자상세)에 일괄 적용. 배우자 상세는 end-only일 때 '~ ' 접두를 붙여 기간임을 명시.
- **검증**: CONFIRMED

#### UX4 · **P3** · S · 무마이그 — 클러스터 라벨 게이트와 섹션 렌더 게이트 조건 불일치 — embed에서 라벨 없는 고아 섹션이 이웃 클러스터 소속처럼 보임

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:2447`
- **증거**: 클러스터 ③ 라벨은 `!embedInModal || spouseRelations>0 || humanRelationships>0`(L2447-2452), ④ 라벨은 `!embedInModal || countryAffiliations>0 || foundedDynasties>0`(L2473-2477)로 게이트되지만 그 아래 PersonHumanRelationshipsSection(L2458)과 SamePersonGroupSection(L2574)은 무조건 렌더. embed에서 배우자·인간관계 0인 인물이면 '관계' 라벨은 숨는데 인간관계 섹션(빈상태 CTA 포함)은 그대로 떠서 직전 '이력·활동' 클러스터에 붙은 것처럼 보임. ④도 소속그룹만 있는 인물이면 라벨 없이 소속그룹 섹션이 관계 클러스터 밑에 이어짐(라벨 게이트가 그룹 보유 여부를 안 봄). 반대로 embed에서 배우자는 있으나 혼인정보가 없으면 라벨은 뜨는데 SpouseDetailSection은 null(spouse-detail-section.tsx L30-33)이라 라벨 밑에 기대한 배우자 정보가 없음.
- **영향**: 4클러스터 재편의 핵심인 '라벨=섹션 묶음 경계'가 embed에서 어긋나 섹션이 엉뚱한 클러스터 소속으로 읽힌다. 라벨 게이트에 든 조건과 실제 자식 섹션의 self-hide 조건이 서로 다른 데이터(spouseRelations vs 혼인정보, affiliations vs 그룹)를 보는 구조적 비동기가 원인.
- **제안**: 클러스터 라벨과 그 하위 섹션들의 표시 조건을 한 곳에서 산출(예: 클러스터별 `hasContent` 계산 후 라벨과 섹션 묶음을 같은 조건으로 감싸기)하고, embed에서 빈 섹션은 라벨과 함께 통째로 숨긴다. 라벨 게이트에 소속그룹 보유 여부도 포함(3번 발견의 readOnly prop 도입과 함께 처리하면 자연 해소).
- **검증**: CONFIRMED

#### UX5 · **P3** · M · 무마이그 — 경력·학력·수상 항목 수정 불가(삭제만) — 등록 모달 3종이 create 전용이라 오타 정정에 삭제 후 재입력 강요

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:2925`
- **증거**: AwardRegisterModal·CareerRegisterModal·EducationRegisterModal props가 전부 `{ open, personId, onClose, onSuccess }`뿐(award-register-modal.tsx L21-27, career-register-modal.tsx L245-251, education-register-modal.tsx L47-53) — 편집 대상 id/초기값 prop 없음. 행 UI도 SimpleEntryDeleteBtn(L2040-2055, L2149-2165, L2243-2258)만 있고 수정 버튼 부재. 반면 같은 탭의 재임·재위는 onEditTenure/onEditReign(L1877-1884), 인간관계는 카드별 '수정'(person-human-relationships-section.tsx L916-919)을 제공.
- **영향**: 저작자 여정에서 가장 흔한 작업(기존 기록 정정)이 구조화 이력 3종에서만 파괴적 우회(삭제→재입력)를 강요한다. 노트·기간 등 필드가 많아 재입력 비용이 크고, 같은 화면의 이웃 섹션들은 수정을 지원해 기대 위반이 명확하다.
- **제안**: 세 모달에 editTarget(항목 스냅샷 또는 id) prop을 추가해 프리필+저장 시 update API 호출 분기, 행에 수정(✎) 버튼 추가(재임·재위의 UnifiedEditBtn 패턴 준용). personCareerApi에 update 엔드포인트가 없으면 백엔드 PATCH 추가 필요 여부부터 확인.
- **검증**: CONFIRMED

#### UX6 · **P3** · M · 무마이그 — 활동·이력(저작·창업·조직 역할·군부대 지휘) 섹션이 빈 상태에서 완전 소멸 — 추가 진입점·기능 인지 자체가 불가(이웃 섹션들과 정책 3원화)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:2297`
- **증거**: L2287-2297 `const total = books.length + founded.length + orgRoles.length + milCmds.length; if (total === 0) return null` — embed 여부와 무관하게 섹션 자체가 사라지고, 데이터가 있어도 CollapsibleSection(L2299-2306)에 actions prop이 없어 추가·수정·삭제 진입점이 전무. 같은 클러스터의 경력(L1978-1993)·학력(L2100-2115)·수상(L2205-2220)은 빈 상태에서도 헤더 + 추가 버튼 + 안내 문구를 유지하는 것과 대조. (K2는 학력 한정으로 별개 추적, 커밋 4faa66cbc의 '저작 발견성'은 전기 용어/엔티티 링크 저작 도움말이라 이 섹션과 무관함을 확인.)
- **영향**: 저작자가 인물 상세에서 저작/창업/조직 역할을 기록하고 싶어도 섹션이 안 보이니 기능 존재조차 인지할 수 없다(발견성 0). 어디서 등록하는지(인물 수정 모달? 조직 화면?)에 대한 안내도 없어 이웃 섹션들과 진입점 정책이 3원화된다.
- **제안**: 비 embed에서는 total=0이어도 섹션을 유지하고 빈 상태 문구에 등록 경로 안내(또는 추가 버튼)를 제공. 각 하위 그룹의 정본 등록 화면이 다른 도메인(조직·군부대)이라면 최소한 해당 화면으로의 딥링크 CTA를 빈 상태에 배치. embed에서는 현행처럼 숨김 유지.
- **검증**: ⚠ PARTIAL — 코드 사실은 전부 성립: person-detail-panel.tsx L2292-2297의 total===0 → return null이 embedInModal 무관하게 섹션을 소멸시키고, L2299-2306 CollapsibleSection에 actions prop이 없어 이웃 섹션(경력 L1943/1978-1999·학력 L2088/2100-2121·수상 L2195/2205-2220의 빈 상태 유지+추가 버튼+안내)과 비대칭인 것 맞음. 그러나 핵심 서사에 정정 필요: (a) 4개 하위그룹 중 저작·조직 역할·군부대 지휘 3개는 web-admin 전체에 저작 UI가 부재하고 Book은 API 쓰기 엔드포인트 자체가 없음(person.controller.ts L718 읽기 전용, pages/organizations는 역할 편집 없음, military 페이지 부재) — "기능이 존재하는데 숨겨져 인지 불가(발견성 0)"가 아니라 대부분 저작 수단 자체가 없어, 빈 read-only 섹션 숨김은 죽은 진입점 노출 회피라는 합리적 근거가 있는 설계일 수 있음. (b) suggestion의 '추가 버튼/딥링크 CTA'가 실제 성립하는 것은 창업 기업(company-form.page.tsx L1016 founderId 피커)뿐이며 나머지 3개는 백엔드·UI 신규 작업 없이 이행 불가. P3 심각도와 위치는 적정.

#### UX7 · **P3** · S · 무마이그 — 영향력 미설정(null)이 '0'으로 둔갑 — 미평가와 0점 평가를 구분 못 하고 embed에서는 의미 없는 빈 게이지만 노출

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:457`
- **증거**: L457-460 `useOptimistic(person?.influence ?? 0, ...)` — null(미설정)이 0으로 강제. 개요 섹션(L1750-1811)은 미설정 분기 없이 항상 게이지+값 '0'+앵커 행을 렌더하므로 미평가 인물이 '영향력 없음(0)' 평가처럼 읽힘. 수정 버튼 라벨만 `person.influence != null ? '수정' : '설정'`(L1697)으로 null을 인지하는 비대칭. KPI는 `optimisticInfluence > 0`(L1509)일 때만 표시라 헤더·본문 메시지도 어긋나고, embed에서는 설정 버튼(L1689 게이트)마저 없어 빈 게이지가 정보 없이 자리만 차지.
- **영향**: 역사 평가 지표에서 '평가 안 함'과 '영향력 없음 판정'은 의미가 다른데 읽기 화면이 이를 합쳐 사실을 왜곡한다. 능력치 섹션은 같은 문제를 이미 빈 상태 문구('아직 이 인물에 대한 내 평가가 없습니다', person-stats-section.tsx L171-178)로 해결해 둔 선례가 바로 위에 있다.
- **제안**: person.influence가 null이면 게이지 대신 능력치 섹션과 동일 패턴의 한 줄 빈 상태('아직 영향력 평가가 없습니다' + 비 embed면 '설정' CTA)를 렌더. useOptimistic base를 `person?.influence ?? null`로 두고 표시부에서 null 분기.
- **검증**: CONFIRMED

#### UX8 · **P3** · M · 무마이그 — 개요 탭 전체 점프 내비 부재 — 최대 14개 섹션·4클러스터를 선형 스크롤로만 소비(전기만 자체 TOC 보유)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1656`
- **증거**: OverviewSections(L1656, styles L990-994 gap 32px)에 전기·영향력·능력치·출생/사망·재임재위(+동시대 스트립)·경력·학력·수상·활동이력·배우자상세·인간관계·국가소속·시조가문·소속그룹 최대 14개 섹션이 순차 나열되지만 상단에 목차/점프 UI가 없음. 장문 컨텐츠인 전기는 자체 TOC(person-biography-sections.tsx L677, L692-708 — 섹션 3개 이상이면 칩 목차)를 이미 갖춰, '점프 필요' 판단이 컴포넌트 한 층 아래에서만 적용된 상태. 클러스터 라벨(L1658/1826/2451/2476)은 시각 구분자일 뿐 앵커가 아님.
- **영향**: 데이터가 찬 인물은 개요가 수 화면 분량이라 하단 클러스터(관계·소속)는 도달률이 급감하고, 저작자가 특정 섹션(예: 수상)으로 이동하는 반복 작업의 비용이 크다. 기업 상세는 목차 레일 패턴을 이미 도입한 전례가 있어 제품 내 선례도 존재.
- **제안**: 클러스터 라벨 4개(+주요 섹션)를 앵커로 하는 컴팩트 점프 칩 행(전기 TocChip 스타일 재사용)을 탭 컨텐츠 최상단에 추가하거나, 기업 상세의 목차 레일 패턴을 이식. 존재하는 섹션만 동적으로 노출해 빈 인물에서는 렌더하지 않음. (K5 god 분해와 별개로 렌더 트리 추가만으로 가능.)
- **검증**: CONFIRMED

### AU. 전기 저작

#### AU1 · **P3** · S · 무마이그 — 편집 중 Esc가 읽기 뷰 이미지 라이트박스 닫기와 동시 발화 — 라이트박스 닫으려다 편집 취소 확인 유발

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:630`
- **증거**: 편집 중 window keydown Esc 핸들러(L624~650)는 에디터 내부 오버레이만 capture 단계 stopImmediatePropagation으로 양보받음(rich-text-editor.tsx L2453~2469). 그러나 다른 섹션(편집 중에도 읽기 모드로 상호작용 가능)의 figure 이미지 클릭으로 열리는 라이트박스는 document 레벨 Esc 리스너가 stopPropagation 없이 닫기만 함(rich-text-read-view.tsx L123~130). 재현: 섹션 A 편집·타이핑 중 → 섹션 B의 이미지 클릭해 라이트박스 → Esc → 라이트박스가 닫히면서 동시에 전기 Esc 핸들러가 발화해 '저장하지 않은 변경을 버릴까요?' 확인이 뜸(dirty가 아니면 즉시 편집 종료). 확인을 눌러버리면 A의 타이핑 폐기.
- **영향**: 이미지 뷰어를 닫는 표준 제스처가 편집 세션 파괴로 이어지는 이벤트 경합. 에디터 자체 오버레이에는 이미 같은 문제를 막는 정교한 가드가 있는데 읽기 뷰 라이트박스만 구멍.
- **제안**: RichTextReadView 라이트박스 Esc 핸들러를 capture 단계 + stopImmediatePropagation으로 바꾸거나(에디터 오버레이 가드와 동형), 전기 Esc 핸들러에서 document에 열린 라이트박스(role=dialog) 존재 시 무시.
- **검증**: CONFIRMED

#### AU2 · **P3** · S · 무마이그 — 섹션 제목 빈 값·중복 무검증으로 TOC·삭제 확인 식별 불가 + 빈 신규 섹션은 저장 필터 탈락으로 로컬에만 남는 유령화

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:775`
- **증거**: SectionTitleInput(L775~781)은 빈 값·중복을 그대로 허용하고 저장 필터(L331~338)는 `title.trim() || content.trim()` 인 row를 통과시키므로 제목 없는 섹션이 정식 저장됨 → 읽기 헤더와 TOC 칩이 모두 '(제목 없음)'(L703, L783)으로 렌더되고, 같은 제목 섹션이 여럿이면 TOC(L692~708)에서 구분 불가. 또 '빈 섹션' 추가 후 아무것도 안 쓰고 저장을 누르면 cleaned 필터에서 탈락해 PUT에는 빠지는데 로컬 rows에는 남아(sync에서 serverId 미보유 row는 보존 append, L216~229) '본문이 없습니다' 유령 섹션이 화면에 남고 새로고침하면 사라짐 — 저장 성공 토스트와 모순되는 상태.
- **영향**: 제목이 TOC 점프·삭제 확인 문구('OO 섹션을 삭제할까요?')의 유일한 식별자인데 빈/중복 제목을 막지도 경고하지도 않아 장문 전기에서 내비게이션·삭제 대상 확인이 흐려짐. 유령 섹션은 '저장됨' 피드백과 실제 영속 상태의 불일치.
- **제안**: 저장 시 제목이 비면 sectionType 라벨('생애' 등)이나 '섹션 N'을 자동 채우고 중복 제목엔 인라인 경고. 빈 신규 섹션은 저장 버튼 시점에 '내용이 없어 저장되지 않습니다' 안내 후 행 제거(cancelEdit의 빈 행 제거 로직 재사용).
- **검증**: CONFIRMED

### RD. 전기 읽기

#### RD1 · **P2** · S · 무마이그 — 읽기 뷰 collapseInterBlockWhitespace 정규식이 인라인 요소 사이의 의미 있는 공백까지 제거해 단어가 붙어 렌더됨

- **위치**: `apps/web-admin/src/shared/lib/rich-text-read-view.ts:98`
- **증거**: `return html.replace(/>\s+</g, '><')` — 주석은 "블록 태그 사이"라지만 정규식은 모든 태그 경계에 적용. 재현: 전기에서 두 단어를 각각 볼드·이탤릭 처리(`<b>추기경</b> <i>울지</i>`)하거나 붙여넣기로 `</strong> <a…>` 패턴이 생기면, 에디터에서는 정상인데 읽기 모드에서 공백이 삭제돼 "추기경울지"로 붙어 표시됨. 인접한 두 엔티티 링크/멘션 사이 공백도 동일 소실. spec에 이 케이스 테스트 없음
- **영향**: 편집 화면과 읽기 화면의 본문이 달라지는 콘텐츠 왜곡 — 저장 HTML은 정상이고 표시만 손상이라 저자가 고칠 방법도 없음. 복사 텍스트에도 그대로 반영됨
- **제안**: 제거 대상을 원래 목적(소스 포맷 개행)으로 좁힘: `/>\s*\n\s*</g`처럼 개행 포함 공백만 제거하거나, 닫는 태그가 블록 태그(p|div|ul|ol|li|table|tr|td|figure|blockquote|h[1-6])일 때만 적용. 인라인 경계 보존 테스트를 spec에 추가
- **검증**: CONFIRMED

#### RD2 · **P2** · S · 무마이그 — 읽기 뷰 .entity-link에 user-select:none 공유 — 전기 본문 복사 시 엔티티 링크 단어가 통째로 누락

- **위치**: `apps/web-admin/src/shared/styles/rich-text-readonly-content.ts:238`
- **증거**: `.entity-link { … user-select: none; -webkit-user-select: none; }`가 richTextReadonlyEntityLinksCss 별칭(L263)으로 읽기 전용 RichTextReadView Root에도 그대로 적용. 재현: "헨리 8세는 [앤 불린]과 결혼했다"([]=엔티티 링크) 문단을 드래그 복사하면 Chrome/Firefox에서 "헨리 8세는 과 결혼했다"로 복사됨. docs/person-biography-term-entity-review.md 36건 확인 — 복사/user-select 항목 없음(신규)
- **영향**: user-select:none은 에디터에서 스팬을 원자로 다루기 위한 저작용인데 읽기 뷰까지 공유돼, 백과 본문 인용·발췌라는 기본 사용이 조용히 손상됨. 사용자는 붙여넣은 뒤에야 단어 누락을 발견
- **제안**: D4와 같은 방식으로 읽기 컴포넌트에서만 오버라이드: RichTextReadView Root에 `.entity-link { user-select: text; }` 추가(또는 읽기용 css를 별칭이 아닌 확장으로 분리해 user-select 해제). 에디터 쪽은 유지
- **검증**: CONFIRMED

#### RD3 · **P2** · M · 무마이그 — 임베드 모달 패널의 Esc stopPropagation이 전기 편집취소·라이트박스 Esc를 선점 — 버리려던 편집이 언마운트 flush로 조용히 저장됨

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-modal.tsx:78`
- **증거**: person-detail-modal.tsx L76-81: panelRef keydown에서 `e.stopPropagation()` 후 pop/onClose. 전기의 취소 Esc(person-biography-sections.tsx L624-650, window 버블 리스너: dirty면 confirm 후 복원)와 라이트박스 Esc(rich-text-read-view.tsx L123-130, document 리스너)는 패널 노드보다 뒤에 발화하므로 영원히 도달 불가. 재현①: 모달에서 전기 섹션 편집 중 Esc → confirm 없이 모달이 닫히고, 언마운트 flush(person-biography-sections.tsx L482-495)가 hasDirtyInProgressEdit로 버리려던 변경을 서버에 PUT(페이지에서는 confirm 후 폐기되는 것과 정반대). 재현②: 전기 이미지 라이트박스를 연 채 Esc → 이미지만 닫히는 대신 인물 모달 전체가 닫히거나 스택 pop으로 인물이 바뀜
- **영향**: '취소' 의도의 Esc가 되돌릴 수 없는 저장(delete-and-recreate)으로 뒤집히는 데이터 함정 + 임베드 읽기 중 라이트박스 Esc 동작이 페이지와 모달에서 상반됨
- **제안**: 모달 Esc 핸들러에서 내부 우선 소비자를 확인: 전기 편집 중(또는 라이트박스 열림)이면 pop/close를 건너뛰고 통과시키거나, rich-text-editor의 handleOverlayEscapeCapture 패턴처럼 전기·라이트박스가 capture 단계에서 stopImmediatePropagation으로 먼저 소비하게 이관. 최소한 dirty 편집 중 모달 닫힘은 confirm 경유
- **검증**: ⚠ PARTIAL — 핵심(재현①)은 성립: person-detail-modal.tsx L76-84 패널 keydown 버블 리스너가 stopPropagation 후 무조건 pop/onClose하고(L70-71 주석이 하위 window Esc 선점을 의도라고 명시), 전기 편집 취소 confirm은 window 버블 리스너(person-biography-sections.tsx L624-650)라 도달 불가. 모달 임베드에서도 전기 편집은 readOnly 게이트 없이 가능(person-detail-panel.tsx L1668-1679)하고, latestRowsRef가 매 렌더 rows와 동기화(L289-291)되어 언마운트 flush(L482-495→doPersist L339 updatePerson PUT)가 버리려던 dirty 본문을 실제 저장함 — 페이지에서는 confirm 후 폐기되는 것과 정반대. 단 재현②(라이트박스)는 정정 필요: 라이트박스 Esc 리스너(rich-text-read-view.tsx L123-130, document)는 keydown 타깃이 패널 내부일 때만 선점당하는데, 라이트박스는 비포커서블 img 마우스 클릭으로만 열리고 클릭 시 activeElement가 body로 이동(useFocusTrap은 Tab만 가로채고 포커스 강제 복귀 없음)하므로 통상 경로에선 패널 핸들러가 발화하지 않아 라이트박스가 정상 닫힘. ②는 포커스가 패널 안에 남은 경우(라이트박스 후 Tab 등)에만 성립하는 조건부 결함이며 '영원히 도달 불가'는 부정확. 심각도는 ①만으로 P2 타당(취소 의도가 delete-and-recreate 저장으로 역전, 이전 본문 복구 불가).

#### RD4 · **P3** · S · 무마이그 — .entity-link white-space:nowrap(max-width 없음) — 긴 앵커 문구가 좁은 임베드 모달에서 컨테이너를 가로로 넘침

- **위치**: `apps/web-admin/src/shared/styles/rich-text-readonly-content.ts:240`
- **증거**: `.entity-link { display: inline-block; … white-space: nowrap; }` (max-width 없음). 재현: 문장 단위 선택으로 앵커가 길어진 엔티티 링크(선행 검토 A4가 확인했듯 선택 문구 전체가 저장되는 패턴 존재)가 폭 740px 임베드 모달(BioMentionModalPanel, 본문 유효폭 약 690px)이나 좁은 패널에서 한 줄로 강제돼 SectionItem 밖으로 삐져나가 잘리거나 가로 스크롤 유발. docs/person-biography-term-entity-review.md에 미보고(신규)
- **영향**: 본문 인라인 요소가 레이아웃을 깨는 유일한 케이스 — 임베드 모달처럼 폭이 제한된 읽기 지면에서 특히 취약
- **제안**: 읽기 뷰에서 `max-width: 100%; white-space: normal;`(또는 overflow-wrap: anywhere)로 오버라이드해 여러 줄 배지로 흐르게 함. 에디터 쪽 원자 동작이 nowrap에 의존하면 에디터만 유지
- **검증**: CONFIRMED

#### RD5 · **P3** · M · 무마이그 — 대용량 전기 섹션(최대 16MB) 전량 동기 파싱·일괄 렌더 — MEDIUMTEXT 상향과 짝이 되는 지연·가상화 장치 부재로 개요 탭 초기 페인트 블로킹

- **위치**: `apps/web-admin/src/shared/ui/rich-text-read-view/rich-text-read-view.tsx:141`
- **증거**: `dangerouslySetInnerHTML={{ __html: safe }}`로 섹션 전체를 한 번에 주입. 그 전에 formatRichTextForReadView가 전체 문자열 정규식 5회+ + resolveRichTextImageSrcsForDisplay의 template.innerHTML 왕복(전체 DOM 파싱 1회 추가), 주입 후 rich-text-prose-with-entity-clicks.tsx L64-78의 querySelectorAll 순회까지 메인 스레드에서 동기 수행. 모든 섹션이 개요 탭 진입 즉시 렌더(person-biography-sections.tsx L710 rows.map, 지연 없음). 섹션 content가 TEXT→MEDIUMTEXT(16MB) 상향(2026-07-16)돼 64KB 상한 가정이 무효화된 직후라 수 MB 전기에서 탭 전환이 초 단위로 블로킹될 수 있음
- **영향**: 본문 상한을 256배 올린 마이그레이션과 짝이 되는 표시 측 대비가 없음 — 개요 탭은 전기 외 섹션도 모두 렌더하므로 한 섹션의 대용량이 탭 전체 초기 페인트를 잡아먹음
- **제안**: 1단계(즉효): SectionItem에 `content-visibility: auto; contain-intrinsic-size` 부여로 화면 밖 섹션 레이아웃/페인트 스킵. 2단계: 일정 길이 초과 섹션은 접힌 프리뷰+'더 보기' 지연 주입, format 결과 캐시. 실측(수 MB 시드)으로 임계 확인
- **검증**: CONFIRMED

#### RD6 · **P3** · S · 무마이그 — HTML 전기(15px)와 평문 전기(14px)의 본문 타이포 불일치 — 저장 형식에 따라 같은 지면 활자 크기가 갈라짐

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:1237`
- **증거**: 평문 분기 PlainText(L1237)는 SectionBody의 `font-size: 14px`(L1119-1123)를 상속하는 반면, HTML 분기 RichTextReadView Root는 자체 `font-size: 15px; line-height: 1.7`(rich-text-read-view.tsx L22-23) 지정. 재현: 평문으로 저장된 섹션과 리치텍스트 섹션이 한 전기 안에 섞이면(레거시 시드 vs 신규 작성) 섹션마다 본문 크기가 1px 다르게 보임
- **영향**: 같은 지면의 본문 활자가 저장 형식에 따라 달라져 읽기 품질이 미세하게 흔들림 — 레거시 biography 시드(평문)가 흔한 데이터라 실제로 노출됨
- **제안**: PlainText에 font-size: 15px(및 line-height 1.7)를 명시해 RichTextReadView Root와 통일하거나, SectionBody 기준을 15px로 승격
- **검증**: CONFIRMED

#### RD7 · **P3** · M · 무마이그 — 전기 서술의 연대와 개요 구조화 데이터(생몰·재위) 간 모순을 드러낼 대조 장치 부재(개선 기회)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:233`
- **증거**: Props(L233-248)는 personId·sections·legacyBiography·클릭 핸들러뿐 — 구조화 생몰/재위 데이터가 전기 컴포넌트로 전혀 전달되지 않고, 읽기 렌더(L879-895)도 html을 불투명하게 표시. 재현: 전기 본문에 "1520년 즉위"라 쓰고 개요 재위 카드가 1521년이어도 어느 화면에도 경고·대조 표식이 없어 모순이 그대로 게시됨
- **영향**: 백과 저작 도구에서 서술과 정형 데이터의 정합성은 품질 게이트인데, 현재는 저자가 두 지면을 수동 대조하는 수밖에 없음(개선 기회 — 결함 아님)
- **제안**: 저작 시점 경량 lint부터: 저장 시 본문에서 연도 토큰(정규식, BC 포함 주의 — 네이티브 Date 금지 규약 준수)을 추출해 생몰 범위 밖이면 비차단 경고 배너. 장기적으로는 F1 EntityMention 인덱스와 묶어 구조화 연대 참조로 승격
- **검증**: CONFIRMED

### PF. 성능·렌더 구조

#### PF1 · **P2** · M · 무마이그 — 전기 섹션 RichTextEditor에 debounceMs/flushRef 미전달 — 키 입력마다 전체 innerHTML DOMPurify sanitize + 섹션 리스트 전체 재렌더(사건 InlineRichText는 이미 해결 패턴 보유)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:847`
- **증거**: L847-856 `<RichTextEditor value={row.content} onChange={(v) => updateField(row.key, { content: v })} … autoFocus />` — debounceMs·flushRef 미전달. 에디터 기본값은 debounceMs=0이라 rich-text-editor.tsx L1150-1152에서 input마다 `flushPendingChange()` → L1130 `sanitizeRichTextHtml(editorRef.current.innerHTML)`(DOMPurify 전체 DOM 파싱·워크)가 동기 실행되고, onChange→`updateField`→`setRows`로 섹션 배열 전체가 매 키스트로크마다 재렌더된다. 같은 리포의 사건 인라인 에디터는 이미 이 문제를 해결(shared/ui/inline-edit/inline-rich-text.tsx L187-188 `debounceMs={200} flushRef={editorFlushRef}`, 주석 "긴 본문 입력 지연 완화"). 재현: 수십만 자급 전기 섹션(content TEXT→MEDIUMTEXT 16MB 상향으로 상한 가정 무효)을 편집하며 연속 타이핑 → 키 입력당 O(문서 크기) DOMPurify 파싱이 메인 스레드를 점유해 입력 지연·키 드랍 체감.
- **영향**: 전기는 이 화면에서 가장 큰 텍스트 페이로드인데 편집 핫패스가 문서 크기에 선형인 동기 sanitize를 키 입력마다 수행한다. MEDIUMTEXT 마이그레이션으로 섹션이 수 MB까지 커질 수 있어 큰 문서일수록 편집이 급격히 느려지는 구조적 병목이며, 동형 컴포넌트(InlineRichText)에는 이미 확립된 해법이 있어 명백한 누락이다.
- **제안**: `debounceMs={200}` + `flushRef` 전달로 InlineRichText 패턴을 미러. 단 saveSection(L604-610)·언마운트/인물전환 flush(L441-443, L490-492)가 `latestRowsRef.current`를 동기적으로 읽으므로, 디바운스 도입 시 저장·flush 직전에 `flushRef.current?.()` 반환 HTML을 해당 row에 반영한 뒤 persist하도록 배선해야 마지막 200ms 입력이 유실되지 않는다.
- **검증**: ⚠ PARTIAL — 핵심 전부 성립: (1) person-biography-sections.tsx L847-856 RichTextEditor에 debounceMs/flushRef 미전달 확인, (2) rich-text-editor.tsx L612 debounceMs=0 기본값 + L1144-1152 디바운스 없으면 input마다 동기 flushPendingChange → L1130 sanitizeRichTextHtml(innerHTML) → sanitize-rich-text-html.ts L126 DOMPurify.sanitize 전체 파싱 확인, (3) onChange→updateField(L497-499 setRows map)로 매 키스트로크 섹션 리스트 전체 재렌더(행 메모이제이션 없음), (4) inline-rich-text.tsx L187-188 debounceMs={200} flushRef 선례 존재 확인, (5) MEDIUMTEXT 마이그레이션 완료로 수 MB 섹션 시나리오 유효, (6) saveSection(L604-607)·인물전환/언마운트 flush(L442·L491)의 latestRowsRef 동기 읽기 주의점도 정확. 유일한 정정: 파일 경로가 부정확 — 주장한 widgets/person/person-biography-sections.tsx는 존재하지 않으며 실제는 widgets/person/person-detail-panel/person-biography-sections.tsx(라인 847은 정확히 일치). 심각도 P2 적정(성능 저하, 데이터 손실 아님).

#### PF2 · **P3** · S · 무마이그 — GET :id/detail — findByIdWithRelations와 findHumanRelationships 독립 쿼리를 순차 await로 직렬화

- **위치**: `apps/api/src/libs/person/presentation/person.controller.ts:527`
- **증거**: L527-528 `const person: any = await this.personService.findByIdWithRelations(id, accountId)` 다음 줄에서 `const humanRelationships = await this.personService.findHumanRelationships(id, accountId)` — 두 조회는 서로의 결과를 쓰지 않는 독립 쿼리인데 직렬로 실행된다. findByIdWithRelations는 20여 개 관계를 조인하는 이 API에서 가장 무거운 쿼리(repository L1115~)라, 인간관계 조회 지연이 그 뒤에 그대로 더해진다. 재현: 인물 상세 진입 시 응답 시간 = (거대 include 쿼리) + (human-relationships 쿼리)의 합.
- **영향**: 인물 상세는 개요 탭의 단일 크리티컬 패스 요청이고, 프론트가 이 응답 하나를 기다려 화면 전체를 그린다. 무료로 줄일 수 있는 직렬 왕복이다.
- **제안**: `const [person, humanRelationships] = await Promise.all([this.personService.findByIdWithRelations(id, accountId), this.personService.findHumanRelationships(id, accountId)])`로 병렬화. (404 처리 의미는 동일 — 두 호출 모두 id·accountId 스코프만 사용)
- **검증**: CONFIRMED

#### PF3 · **P3** · S · 무마이그 — person-life-events 쿼리가 연보 탭 게이트 없이 eager 페치 — 개요 진입·모달 스택 패널마다 큰 설명 페이로드를 불필요 요청(가계도 쿼리는 이미 게이트됨)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:472`
- **증거**: L472-479 `useQuery({ queryKey: ['person-life-events', personId], …, enabled: !!personId, staleTime: 60 * 1000 })` — 주석 스스로 "큰 설명 페이로드"라고 명시. 소비처는 L2848(연보 탭 인포그래픽)과 L2890(연보 모달 existingLifeEvents) 둘뿐인데 개요 탭 마운트 시점에 무조건 페치된다. 바로 위 가계도 쿼리는 동일한 이유로 이미 게이트됨(L465-470 `enabled: !!personId && activeTab === 'genealogy'`, 주석 "패널 마운트마다 … 받던 비용 제거"). 재현: 개요 탭만 보고 닫는 흐름(전기 인물 링크로 BioMention 모달 스택을 3단계 push하는 경우 포함) → 인물마다 사용되지 않는 `/person-life-events/by-person/:id` 요청이 매번 나간다.
- **영향**: 다른 탭 전용 데이터를 개요에서 선페치하는 패턴으로, 가계도 BFS에서 이미 제거한 것과 동일한 낭비가 남아 있다. 모달 스택으로 인물을 훑는 UX에서는 패널 마운트 횟수가 많아 요청·페이로드가 배수로 증폭된다.
- **제안**: `enabled: !!personId && (activeTab === 'events' || lifeEventModalOpen)`으로 게이트(연보 모달 열림도 포함). staleTime 60s는 유지하면 탭 재진입 시 캐시 히트.
- **검증**: CONFIRMED

#### PF4 · **P3** · S · 무마이그 — 전기 편집 키보드 단축키 useEffect가 rows에 의존 — 키 입력마다 window keydown 리스너 해제·재등록(latestRowsRef로 무비용 제거 가능)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:650`
- **증거**: L624-650 `useEffect(() => { … window.addEventListener('keydown', onKey); return () => window.removeEventListener(…) }, [editingKey, rows, saving, saveSection, cancelEdit])` — 편집 중에는 타이핑마다 `updateField`가 rows를 교체하므로(L497-499) 이 effect가 키 입력마다 cleanup+재구독된다. rows는 Esc 시점의 dirty 판정(L632-635)에만 쓰이는데, 같은 컴포넌트에 이미 최신 rows 미러 ref(`latestRowsRef`, L289-292)가 있어 의존이 불필요하다. 재현: 긴 섹션 편집 중 연속 타이핑 → 매 키마다 removeEventListener/addEventListener 쌍 실행(위 P2의 전체 재렌더와 겹쳐 핫패스 잡음 가중).
- **영향**: 핫패스(키 입력)에서 전역 리스너를 매번 재구성하는 과잉 실행 패턴. 단독으로는 저비용이지만 P2(무디바운스 sanitize)와 같은 렌더 사이클에 얹혀 있고, ref 활용으로 무비용 제거가 가능하다.
- **제안**: Esc dirty 판정을 `rows.find` 대신 `latestRowsRef.current.find`(이미 존재하는 `hasDirtyInProgressEdit`와 동일 방식)로 바꾸고 deps에서 `rows`를 제거 — 리스너는 editingKey 세션당 1회만 등록.
- **검증**: CONFIRMED

### AY. 접근성

#### AY1 · **P2** · M · 무마이그 — 확인 다이얼로그(DeleteConfirmDialog·공용 ConfirmDialog)에 포커스 이동·트랩·Esc 전무 — 트리거에 남은 포커스로 Enter 재발화 시 다이얼로그 중복 큐잉, useModalBehavior 규약 위반

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:2981`
- **증거**: DeleteConfirmDialog(L2981~2991)는 role="dialog" aria-modal="true"만 있고 useFocusTrap/useBodyScrollLock/Esc 핸들러가 전혀 없음(같은 파일 BioMention 모달은 L727~728에서 둘 다 사용). 공용 ConfirmDialog(shared/ui/confirm-dialog/confirm-dialog.tsx L79~84)도 동일 — role="alertdialog" aria-modal만 있고 초기 포커스 이동·트랩·Esc 없음. confirm.tsx L7 주석은 "접근성은 ConfirmDialog가 담당"이라 하지만 실제 구현 부재. 재현: 키보드로 학력 삭제(FiTrash2, panel L2150) 또는 전기 섹션 삭제(person-biography-sections.tsx L804~811) 활성화 → 다이얼로그가 떠도 포커스는 삭제 버튼에 그대로 남음 → Enter를 다시 누르면 removeSection이 재실행돼 confirm 큐(zustand 직렬화)에 두 번째 다이얼로그가 쌓이고, Tab을 눌러도 다이얼로그가 아닌 뒤 화면 콘텐츠를 순회(aria-modal 선언과 실제 키보드 동작 불일치, WCAG 2.4.3/2.1.2). Esc로 취소도 불가.
- **영향**: 개요 탭의 모든 파괴적 작업(인물 삭제·학력/경력/수상 삭제·전기 섹션 삭제·전기 편집 취소 확인)이 이 두 다이얼로그를 지나는데, 키보드·SR 사용자는 다이얼로그에 도달하려면 문서 끝 포털까지 Tab을 전부 통과해야 하고, 포커스가 남은 트리거에서 Enter가 재발화하면 동일 다이얼로그가 중복 큐잉되는 함정이 생김. web-admin CLAUDE.md의 '모달은 useModalBehavior 필수(직접 구현 금지)' 규약 위반이기도 함.
- **제안**: ConfirmDialog와 DeleteConfirmDialog에 useModalBehavior(또는 최소 useFocusTrap+Esc=onCancel+useBodyScrollLock)를 배선하고, 열릴 때 취소 버튼으로 초기 포커스 이동·닫힐 때 트리거로 복원. 인물 삭제 bespoke 다이얼로그는 공용 <Modal>/ConfirmDialog로 수렴하면 한 번에 해결.
- **검증**: CONFIRMED

#### AY2 · **P2** · S · 무마이그 — 전기 본문 이미지 alt 전무 + 편집용 title '클릭하여 크기 조절'이 저장 HTML에 남아 SR이 이미지 이름으로 낭독

- **위치**: `apps/web-admin/src/shared/ui/rich-text-editor/rich-text-editor.tsx:1249`
- **증거**: insertFigureAtCaret가 `const img = document.createElement('img')` 후 src·style·data-resizable만 설정하고 alt는 끝까지 설정하지 않으며(L1249~1261), L1262 `img.title = '클릭하여 크기 조절'`이 편집용 힌트를 인라인으로 박음. sanitize는 alt/title을 통과시키므로(shared/lib/sanitize-rich-text-html.ts L47~48) 이 title이 그대로 저장·읽기 뷰까지 전파됨. 재현: 전기 섹션에 캡션 있는 이미지 삽입 → 저장 → 읽기 모드에서 스크린리더가 이미지를 '클릭하여 크기 조절, 이미지'로 낭독(캡션은 figcaption에만 있고 img 접근 가능한 이름은 title이 차지). 캡션 없는 이미지는 alt 부재로 파일명/무명 그래픽으로 낭독(WCAG 1.1.1).
- **영향**: 전기는 이 슬라이스의 핵심 서술 콘텐츠이고 이미지 삽입 UI가 캡션까지 받는데도 대체텍스트 계층이 통째로 비어 있음. 특히 편집 전용 힌트 문구가 읽기 모드 SR 사용자에게 이미지 설명으로 들리는 것은 적극적으로 잘못된 정보 전달.
- **제안**: 삽입 시 caption이 있으면 `img.alt = caption`, 없으면 `alt=''`(장식 처리)라도 명시. title은 편집기 DOM에서만 쓰고 저장 전 정규화(formatRichTextForReadView 또는 저장 시 sanitize 단계)에서 img title을 제거. 기존 저장분은 읽기 뷰 formatRichTextForReadView에서 img title strip + figcaption→alt 파생으로 소급 보정 가능.
- **검증**: CONFIRMED

#### AY3 · **P2** · M · 무마이그 — 전기 섹션 저장·취소·삭제와 영향력 수정/저장 후 포커스가 body로 유실 — 종료 경로 포커스 복귀 전무

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:604`
- **증거**: saveSection(L604~610)은 setEditingKey(null)만 호출 — 포커스가 있던 저장 버튼(L866~872)·에디터가 통째로 언마운트되며 포커스가 document.body로 떨어짐. cancelEdit(L524~541)·removeSection(L543~568, 행 자체가 사라짐)도 동일. 영향력도 같은 패턴: '수정' 클릭 시 그 버튼이 언마운트되고 InlineActions로 교체(person-detail-panel.tsx L1689~1748), 슬라이더로 포커스 이동 없음, 저장 성공 시 setEditingInfluence(false)로 저장 버튼이 언마운트돼 또 유실. 재현: 키보드로 전기 편집 → ⌘Enter 저장 → 다음 Tab이 문서 최상단부터 다시 시작. 편집 진입은 autoFocus(L855)로 챙겼지만 종료 경로는 전부 방치.
- **영향**: 전기 편집은 이 화면에서 가장 빈번한 저작 루프인데, 저장/취소할 때마다 키보드·SR 사용자의 위치가 초기화됨. 긴 개요 탭(섹션 10여 개) 특성상 원위치 복귀 비용이 큼 — WCAG 2.4.3 포커스 순서·포커스 가시성 실질 훼손.
- **제안**: saveSection/cancelEdit 후 해당 섹션의 StickyEditBtn(ref)으로, removeSection 후 이전 섹션(없으면 '섹션 추가' 행)으로 focus() 이동. 영향력은 편집 진입 시 슬라이더에 focus, 저장/취소 후 '수정' 버튼으로 복원. 각 대상에 ref 배선이면 충분.
- **검증**: CONFIRMED

#### AY4 · **P3** · S · 무마이그 — 탭바 role=tablist가 aria-controls 없이 선언되고 화살표 키 내비게이션·roving tabindex 부재 — 반쪽 시맨틱

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1582`
- **증거**: TabNav(L1582)와 4개 TabBtn(L1583~1638)은 role=tab·id·aria-selected는 갖췄고 tabpanel도 aria-labelledby로 역참조하지만(L1647~1649), 탭 쪽에는 aria-controls="person-detail-panel-overview" 등이 없어 tab↔panel 연결이 단방향. onKeyDown 부재로 ←/→/Home/End 이동이 없고 roving tabindex도 없어 비활성 탭 3개가 전부 Tab 순서에 끼어듦 — SR이 'tab 1/4'로 안내하며 화살표 조작을 유도하지만 실제로는 동작하지 않는 반쪽 시맨틱(APG tabs 패턴 불일치).
- **영향**: role=tablist를 선언한 순간 SR 사용자는 표준 탭 조작(화살표 이동)을 기대함. 기대와 실동작이 어긋나는 것은 시맨틱을 아예 안 쓴 것보다 혼란이 큼. aria-controls 부재는 SR의 패널 점프 기능도 막음.
- **제안**: 각 TabBtn에 aria-controls를 대응 tabpanel id로 추가하고, TabNav에 keydown 핸들러로 ←/→(순환)·Home/End 이동 + 활성 탭만 tabIndex=0(나머지 -1) roving 패턴 적용. 4개 고정 탭이라 소규모 배선.
- **검증**: CONFIRMED

#### AY5 · **P3** · M · 무마이그 — 패널 전체 framer-motion 애니메이션·smooth 스크롤이 prefers-reduced-motion 미존중(타 영역은 이미 분기)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1650`
- **증거**: TabContent 전환이 x:±20 슬라이드(L1650~1654, AnimatePresence mode=wait)로 항상 재생되고, PanelRoot 진입(L1169~1172), 인물삭제 오버레이 scale(L2983~2986), BioMention 모달(L3054~3057), CollapsibleSection height 애니메이션(collapsible-section.tsx L90~93)까지 framer-motion 사용처 어디에도 useReducedMotion/MotionConfig가 없음(grep 결과 web-admin에서 reduced-motion 대응은 login·events 스타일 등 타 영역뿐). 전기 목차 점프도 scrollIntoView({behavior:'smooth'}) 고정(person-biography-sections.tsx L612~617). 재현: OS '동작 줄이기' 켜도 탭 전환마다 콘텐츠가 좌우로 미끄러짐.
- **영향**: 전정기관 장애 사용자를 위한 WCAG 2.3.3 위반. 같은 코드베이스의 events 페이지·rich-text-read-view 라이트박스는 이미 prefers-reduced-motion을 분기하고 있어 이 슬라이스만 규약에서 이탈한 상태.
- **제안**: 앱 루트에 <MotionConfig reducedMotion="user">를 한 번 감싸는 것이 최소비용 전수 해결(framer-motion 전체 적용). scrollIntoView는 matchMedia('(prefers-reduced-motion: reduce)') 분기로 behavior를 'auto'로 폴백.
- **검증**: CONFIRMED

#### AY6 · **P3** · S · 무마이그 — 섹션 유형 선택 role=radiogroup/radio 선언에 화살표 키·roving tabindex 부재 + 재클릭 해제(null)가 라디오 시맨틱과 모순

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:820`
- **증거**: TypeSelectRow(L820)가 role="radiogroup", 각 TypeChip(L821~840)이 role="radio" aria-checked인데 keydown 핸들러가 없어 화살표 이동이 불가하고 5개 칩이 전부 Tab 순서에 들어감. 또 활성 칩을 다시 클릭하면 sectionType이 null로 해제되는데(L828~835) 라디오는 '항상 하나 선택' 모델이라 SR 사용자는 해제 가능성을 인지할 수 없음. 파일 경로 주의: 실제 위치는 person-detail-panel 폴더의 person-biography-sections.tsx.
- **영향**: 탭바와 동일한 '선언만 된 복합 위젯' 패턴 — SR이 라디오그룹으로 안내해 화살표 조작을 유도하지만 동작하지 않고, 토글 해제라는 실제 동작 모델은 전달되지 않음.
- **제안**: 해제 가능 다중택일이므로 radiogroup 대신 각 칩을 aria-pressed 토글 버튼 그룹(role 제거 + aria-pressed={active})으로 바꾸는 것이 실동작과 일치하고 코드도 줄어듦. 라디오를 유지하려면 화살표 내비게이션+roving tabindex+해제 불가로 정합화.
- **검증**: CONFIRMED

#### AY7 · **P3** · S · 무마이그 — 다크 테마에서 하드코딩 인디고/슬레이트 텍스트 대비 미달(활성 유형 칩 ≈2.5:1, 영향력 tier 라벨 ≈3.4:1) — 다크 인라인 하드코딩 매핑 규약 우회

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:1144`
- **증거**: TypeChip 활성 텍스트가 테마 무관 `color: '#4f46e5'`(L1141~1147, 배경 rgba(79,70,229,0.08)+다크 패널) — #4f46e5 vs #212121 계열 배경 대비 ≈2.5:1로 12px 텍스트 AA 기준(4.5:1) 크게 미달. 동일 패턴: ManageToggle 활성(L957~962), SectionTypeBadge(L1061), TocChip/AddTypeBtn hover. 영향력 쪽도 InfluenceTierLabel이 low tier에서 `#64748b` 고정(person-detail-panel.styles.ts L1341~1353, 10.5px) — 다크 배경 대비 ≈3.4:1 미달이고 InfluenceValue의 top(#b45309)·mid(#4f46e5)도 동일(L1325~1339). 재현: 다크 모드에서 전기 편집 → 선택된 유형 칩 글자가 배경에 묻혀 저시력 사용자가 현재 유형을 식별하기 어려움.
- **영향**: 라이트 기준으로 고른 indigo-600/slate-500이 다크에서 그대로 쓰여 WCAG 1.4.3 미달. 프로젝트에 이미 다크 인라인 하드코딩 매핑 규약(isDark 삼항 표준 스케일)이 있는데 이 신규 코드가 규약을 우회함.
- **제안**: 다크 분기에서 밝은 변형을 사용: #4f46e5→#a5b4fc(indigo-300, 대비 ≈8:1), #64748b→theme.colors.text.secondary, #b45309→#f59e0b 계열. theme.mode 삼항 또는 토큰으로 치환(같은 파일 내 일괄).
- **검증**: CONFIRMED

#### AY8 · **P3** · M · 무마이그 — 전기 이미지 라이트박스가 마우스 클릭 전용 — 키보드로 열 수 없고 열려도 포커스 이동·트랩 부재

- **위치**: `apps/web-admin/src/shared/ui/rich-text-read-view/rich-text-read-view.tsx:110`
- **증거**: onContentClick(L110~120)이 `target.closest('figure img')` 클릭만 처리하고, 본문 img는 포커스 불가(tabindex 없음) — RichTextProseWithEntityClicks의 키보드 보강(L64~78)도 .term/.mention/.entity-link만 대상이라 이미지는 제외. 라이트박스가 열려도 focus 이동·트랩이 없어(L144~168) 포커스는 본문에 남고, 닫기 버튼(L160)은 body 끝 포털이라 Tab으로 문서 전체를 지나야 도달. Esc 닫기(L123~130)만 있음. 재현: 키보드 사용자는 전기 본문 이미지를 확대해 볼 방법이 없음(WCAG 2.1.1).
- **영향**: 확대 보기는 저시력 사용자에게 오히려 더 필요한 기능인데 정확히 그 사용자군(키보드·확대 의존)이 진입 불가. 전기 읽기 모드의 유일한 이미지 상호작용임.
- **제안**: 읽기 뷰 마운트 시 figure img에 role="button" tabindex="0" + Enter/Space 핸들러 부여(엔티티 링크 C1 보강과 동일 패턴을 이미지로 확장), 라이트박스 열릴 때 닫기 버튼으로 focus 이동·닫힐 때 트리거 복원(useFocusTrap 재사용).
- **검증**: CONFIRMED

#### AY9 · **P3** · S · 무마이그 — BioMention 스택 모달이 Esc로 닫히지 않음 — 트랩·스크롤락은 있으나 키보드 닫기 경로가 X 버튼뿐(useModalBehavior 규약 이탈)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:3038`
- **증거**: BioMention 모달은 useBodyScrollLock/useFocusTrap(L727~728)과 role=dialog(L3051~3053)는 갖췄지만 Escape keydown 핸들러가 없음 — 파일 내 Esc 처리는 useRichTextTooltipEscape(L1051, 툴팁 전용)뿐. 닫기는 오버레이 클릭(L3045)과 X 버튼(L3111~3117)만. 재현: 전기 본문 인물 링크를 Enter로 열고 Esc → 아무 일 없음. 12단 스택까지 쌓일 수 있는 모달인데 각 단계를 X 버튼 재탐색으로만 되돌아가야 함.
- **영향**: 공용 useModalBehavior가 담당하는 Esc·스크롤락·트랩 3종 중 Esc만 빠진 자체 구현 — 프로젝트 모달 규약(직접 구현 금지) 이탈이며, 트랩 때문에 갇힌 사용자에게 표준 탈출 키가 없는 것은 체감이 큼.
- **제안**: bioMentionModalOpen일 때 Escape keydown으로 setPersonLinkStack(stack => stack.slice(0, -1))(스택 1단 pop, 마지막이면 닫힘)을 배선하거나 useModalBehavior로 이관. 열려 있는 자식 툴팁이 있으면 툴팁 Esc가 선행하도록 useRichTextTooltipEscape와 순서만 조율.
- **검증**: CONFIRMED

#### AY10 · **P3** · S · 무마이그 — 전기 섹션 제목 입력이 placeholder에만 의존 — 값 입력 후 접근 가능한 이름 부재

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:775`
- **증거**: SectionTitleInput(L775~781)에 label/aria-label 없이 placeholder="섹션 제목 (예: 생애, 업적, 평가)"만 있음. placeholder는 접근 가능한 이름의 최후 폴백이라 값이 채워진 뒤 재방문한 SR 사용자에게는 '편집 가능, 생애'처럼 필드 용도 없이 값만 낭독됨. 재현: 기존 섹션 편집 진입 → SR로 제목 입력 필드 포커스 → 필드가 무엇을 받는지 안내 없음.
- **영향**: 전기 편집 폼의 유일한 텍스트 입력인데 이름이 휘발성 — WCAG 3.3.2/4.1.2. 한 줄 추가로 해결되는 결함.
- **제안**: aria-label="섹션 제목"을 추가(시각 라벨이 불필요한 인라인 디자인이므로 aria-label이 적절).
- **검증**: ⚠ PARTIAL — 결함 자체는 그대로 성립: person-detail-panel/person-biography-sections.tsx L775~781에서 SectionTitleInput(styled.input, L1075)이 placeholder만 있고 aria-label/aria-labelledby/label 래핑 전무(부모 SectionHead는 div, L1018). 값 입력 후 접근 가능한 이름 소실 시나리오도 도달 가능(isEditing 편집 모드). 단, 리뷰가 지목한 파일 경로 apps/web-admin/src/widgets/person/person-biography-sections.tsx는 존재하지 않는 파일 — 실제 경로는 apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx로 정정 필요. 라인 775와 P3 심각도는 정확.

### TC. 시간축·표기 정합

#### TC1 · **P2** · S · 무마이그 — 향년·생존 기간 계산이 birthEra/deathEra 무시 — BC 인물 '향년 -56세'가 헤더·KPI·사망카드 3곳 노출, BC→AD 교차 인물은 그럴듯한 오값

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1102`
- **증거**: L1100~1103 `ageAtDeath = isDeceased && ... ? p.deathYear - p.birthYear : null` — era 필드를 전혀 안 봄. birthYear/deathYear는 크기값(magnitude)이고 era는 별도 필드(백엔드 L602/618 birthEra·deathEra, L606/619 getUTCFullYear 크기값). 재현: BC 100 출생·BC 44 사망(카이사르) → 44-100 = **-56** → 헤더 subtitle L1125 '(향년 -56세)', KPI L1490 '생존 기간 -56년', 사망 카드(birth-death-cards.tsx L143 `향년 {ageAtDeath}세`) 3곳에 음수 노출. BC 5 출생·AD 65 사망(세네카형) → 65-5=60으로 계산되나 실제 향년 ≈ 69세(경계 1년 무시 포함) — 오차가 티 안 나게 틀림.
- **영향**: BC/고대 인물에서 개요 3개 지점(헤더·KPI·사망카드)에 동시에 잘못된 파생값이 노출됨. 음수는 눈에 띄지만 cross-era 케이스는 그럴듯한 오값이라 더 위험.
- **제안**: 부호연도로 환산 후 계산: `signed(year,era) = era==='BC' ? -year : year`, 향년 = signedDeath - signedBirth - (부호가 다르면 1 보정, BC→AD는 0년 없음). helpers.ts에 signedYear 유틸로 두고 헤더·카드가 공유.
- **검증**: CONFIRMED

#### TC2 · **P2** · S · 무마이그 — KPI '재임·재위 총 연수'가 종료일 미입력 구간을 사망자에게도 현재(2026)까지 합산 — 같은 화면 카드의 사망일 폴백과 자기모순(수백 년 부풀림)

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:665`
- **증거**: L660 `const now = isoDateToApproxDays(new Date().toISOString())`, L665 `const e = isoDateToApproxDays(data.endDate) ?? now` — 사망 여부 무관 무조건 오늘로 캡. 반면 같은 데이터를 그리는 카드(tenure-reign-list.tsx L106~112)는 DEATH_IN_OFFICE면 사망일로 폴백하고, 바로 위 contemporaryHeadsTarget 메모(L633~649)는 '종료일 미입력 기록이 대표 연도를 수백 년 뒤로 밀지 않게' 사망연도 캡을 명시 구현. 재현: 재위 1418 시작·endDate NULL·endReason=DEATH_IN_OFFICE·사망 1450 인물 → 카드는 '1418년 – 1450년…'인데 KPI는 '재임·재위 총 약 608년'.
- **영향**: endReason만 있고 endDate 미상인 역사 기록은 카드 폴백 로직('미상'/사망일)이 존재할 만큼 정상 상태인데, KPI만 재직-중(ongoing) 의미론을 적용해 수백 년 단위로 부풀려짐.
- **제안**: isDeceased(발견 1의 보정판)면 open-ended 구간의 끝을 사망일(isoDateToApproxDays of deathDate, 없으면 해당 구간 제외)로 캡하고, 생존자만 now 사용 — contemporaryHeadsTarget과 동일 규칙으로 수렴.
- **검증**: CONFIRMED

#### TC3 · **P3** · S · 무마이그 — 취임/퇴임 나이 배지가 BC 출생 인물의 birthYear를 era 게이트 없이 getAgeAtDate에 전달 — 문서화된 AD 전제를 유일한 호출부가 위반해 오값·누락

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/tenure-reign-list.tsx:98`
- **증거**: L98 `const ageAtStart = getAgeAtDate(birthYear, birthMonth, birthDay, d.startDate)` — helpers.ts L137~138이 '출생 era를 받지 않으므로 birthYear는 AD로 가정'이라 명시한 전제조건을 호출부(person-detail-panel.tsx L1867 `birthYear={person.birthYear}`)가 birthEra 확인 없이 위반. 재현: BC 5 출생 인물(deathEra 경계 인물)의 AD 30 취임 → 30-5=25로 '25세에 취임' 표기(실제 ≈34세). 순수 BC 인물은 age<0 가드로 배지가 조용히 사라짐(오값보다는 낫지만 비일관).
- **영향**: era 경계에 걸친 인물에서 그럴듯한 잘못된 나이가 표기됨 — 조용한 오정보. 함수의 문서화된 전제를 유일한 실호출부가 깨고 있는 구조라 재발 위험도 있음.
- **제안**: 패널에서 `birthEra !== 'BC' ? person.birthYear : null`로 게이트해 전달(현행 getAgeAtDate 계약 준수), 또는 getAgeAtDate에 birthEra 파라미터를 추가해 부호연도 계산으로 확장.
- **검증**: CONFIRMED

#### TC4 · **P3** · S · 무마이그 — 배우자 상세 — 혼인 종료일만 있는 관계가 구분자 없이 단독 날짜로 표기돼 혼인일로 오독

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/spouse-detail-section.tsx:50`
- **증거**: L50 `const period = [start, end].filter(Boolean).join(' ~ ')` — marriageStartDate 없이 marriageEndDate만 있으면 period='1558년 3월 2일' 단독 표기. 재현: 혼인 시작 미상·이혼/사별일만 등록된 관계 → '1558년 3월 2일'이 물결도 '?'도 없이 이름 옆에 붙어 혼인일로 오독됨. 개요의 다른 기간 표기는 전부 formatPeriod(helpers.ts L154, start 없으면 null)라 이 파일만 자체 조립.
- **영향**: 종료일이 시작일로 읽히는 의미 반전 오독 — 역사 인물은 혼인 시작 미상이 흔해 실제 도달하는 상태.
- **제안**: end만 있으면 `? ~ ${end}`로 표기하거나 helpers의 formatPeriod에 end-only 규약을 추가해 위임(개요 기간 표기 단일화).
- **검증**: CONFIRMED

### ER. 에러 상태 표면(보강 렌즈)

#### ER1 · **P2** · M · 무마이그 — 본체 상세 fetch 실패가 상태 불문 '인물을 찾을 수 없습니다 / 목록에서 다시 선택해 주세요' 고정 — 네트워크·404·권한(401/403) 미구분에 재시도 경로 전무

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1069`
- **증거**: L434~442에서 `const { data: person, isLoading, isError } = useQuery(...)` — error 객체를 아예 구조분해하지 않음. L1069~1082 유일한 실패 UI가 `if (isError || !person)` → `<ErrorTitle>인물을 찾을 수 없습니다</ErrorTitle><ErrorDesc>목록에서 다시 선택해 주세요.</ErrorDesc>`. 그런데 shared/queryClient.ts L8~9가 `retry: false, refetchOnWindowFocus: false`라 (a) 일시적 네트워크 단절/서버 재기동 중 진입 → 단 1회 실패로 영구 에러 화면 고착, 재시도 버튼도 자동 재검증도 없어 회복 경로가 페이지 이탈 후 재진입뿐. (b) 401 refresh 실패(세션 완전 만료, api.service.ts L16 refresh-once 후 전파)도 '찾을 수 없습니다'로 표기돼 재로그인해야 하는 사용자를 목록으로 오도. (c) 404(삭제된 인물 딥링크)만이 이 문구가 맞는 유일한 케이스. nestia HttpError는 `readonly status: number`를 보존하고(@samchon/openapi HttpError.d.ts) persons-detail.ts L11~13이 그대로 재throw하므로 status 분기 재료는 이미 도착해 있으며, 같은 파일 L289 extractApiErrorMessage도 이 분기에서만 미사용.
- **영향**: 관리자가 일시 장애를 '데이터가 지워졌다'로 오판하게 하는 오도성 문구이며, 임베드 모달(BioMention 스택·person-detail-modal) 경로에서도 같은 패널이 쓰여 전기 인물 링크 클릭 실패 시 동일하게 뭉뚱그려짐. 회복 수단(재시도)이 전무해 오프라인 복귀 후에도 에러 화면이 남는다.
- **제안**: useQuery에서 error를 받아 `err instanceof HttpError ? err.status : null`로 3분기: 404→현행 문구 유지, 401/403→'세션이 만료되었거나 권한이 없습니다'(재로그인 유도), 그 외/네트워크→'일시적인 오류입니다' + refetch()를 호출하는 [다시 시도] 버튼. 서버 사유 노출은 기존 extractApiErrorMessage 재사용.
- **검증**: CONFIRMED

#### ER2 · **P3** · S · 무마이그 — 풀페이지 새 탭 딥링크에서 에러 화면의 '닫기'(onClose=navigate(-1))가 무동작 — 삭제된 인물 404가 완전한 막다른 화면

- **위치**: `apps/web-admin/src/pages/persons/person-detail.page.tsx:21`
- **증거**: `onClose={() => navigate(-1)}` (L21) — 새 탭으로 /persons/:id/ 딥링크 진입 시 히스토리 스택에 이전 엔트리가 없어 react-router navigate(-1)이 no-op. 패널 에러 UI(person-detail-panel.tsx L1076~1078)의 유일한 행동 수단이 `<CloseBtn onClick={onClose}>닫기</CloseBtn>` 하나뿐이므로, 삭제된 인물 링크를 새 탭에서 열면(공유 URL·북마크) '인물을 찾을 수 없습니다' 화면에서 닫기를 눌러도 아무 일도 일어나지 않는 완전한 dead-end. 41줄 호스트 페이지에 별도 에러 처리·폴백 라우팅 전무.
- **영향**: 에러 상태의 유일한 탈출 버튼이 가장 흔한 도달 경로(딥링크 404)에서 무동작 — 사용자는 주소창을 직접 고치는 수밖에 없다.
- **제안**: onClose를 `window.history.length > 1 ? navigate(-1) : navigate('/persons', { replace: true })` 같은 히스토리 유무 폴백으로 교체하거나, 패널 에러 UI에 목록으로 가는 명시적 링크를 추가.
- **검증**: ⚠ PARTIAL — 버튼 무동작 자체는 성립: person-detail.page.tsx L21의 onClose={() => navigate(-1)}는 새 탭 딥링크(백 엔트리 없음)에서 history.go(-1) no-op이 맞고, 패널 에러 UI(person-detail-panel.tsx L1069~1082)의 내부 유일 액션이 CloseBtn(L1076)인 것도 맞음. 그러나 "완전한 막다른 화면·주소창 수정이 유일한 탈출"은 과장: 이 라우트는 전역 Layout(browser-router.tsx L154·L171) 하위라 인증 시 Header(layout.ui.tsx L85)와 CommandPalette(L94)가 함께 렌더되며, header.ui.tsx L70~149에 로고 홈·국가·사건·대륙·수장·기업 전역 내비게이션이 있어 헤더 클릭으로 즉시 탈출 가능. 정정: dead-end 프레이밍 삭제, 심각도 P2→P3(혼란스러운 무동작 버튼 UX 결함). 수정 제안(히스토리 폴백 또는 목록 링크)은 타당.

#### ER3 · **P2** · S · 무마이그 — person-life-events 쿼리 실패가 `data: lifeEvents = []` 기본값으로 무성 둔갑 — 연보가 '기록 없음'처럼 렌더되고 등록 모달의 기존 연보 대조도 빈 목록으로 무력화

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:472`
- **증거**: L472 `const { data: lifeEvents = [] } = useQuery({ queryKey: ['person-life-events', personId], ... })` — isError/error 소비처가 파일 내 전무(소비는 L2848 `lifeEvents={lifeEvents}`·L2890 `existingLifeEvents={lifeEvents}` 두 곳뿐). person-life-events.ts L122~130 requestJson은 !res.ok에 정상 throw하므로 에러는 도착하는데 패널이 버림. retry:false라 1회 실패 즉시: (1) 연보 탭 PersonLifeTimelineInfographic이 생애 이벤트 0건, 즉 '기록이 없는 인물'과 시각적으로 동일하게 렌더 (2) PersonLifeEventFormModal이 existingLifeEvents=[]를 받아 기존 연보 기반 중복·겹침 대조가 조용히 비활성.
- **영향**: 관리자가 '이 인물은 연보 미작성'으로 오판해 이미 있는 기록을 이중 작성하거나 작성 여부 감사를 잘못 내리게 됨 — 실패와 빈 데이터가 구분 불가. (기지 '연보 탭 게이트 없이 eager 페치'는 성능 건으로 본 건과 별개)
- **제안**: isError를 구조분해해 연보 섹션에 contemporaries-strip.tsx L72~74와 같은 '연보를 불러오지 못했습니다' + 재시도 노트를 렌더하고, 실패 시 등록 모달의 대조 기능이 꺼져 있음을 표시(또는 모달 오픈 시 refetch).
- **검증**: CONFIRMED

#### ER4 · **P3** · S · 무마이그 — 가족 추가 인물 풀(familyAddPool) 실패 시 `loading={!familyAddPool}`이 영구 참 — 인물 선택 모달이 에러 표시 없이 무한 로딩에 고착

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:796`
- **증거**: L796~801 `const { data: familyAddPool } = useQuery({ queryKey: ['persons','pool-for-family-add'], queryFn: getAllPersons, enabled: familyAddMode !== null || childOtherParent !== null, ... })` — error 미소비. 소비처 L2681·L2966이 `loading={!familyAddPool}`: getAllPersons 실패 시 data가 영원히 undefined → PersonSelectModal(가족 추가·반대편 부모 지정)이 스피너만 도는 상태로 고착. retry:false·refetchOnWindowFocus:false라 자동 회복 없고, 모달을 닫았다 열어도 enabled 토글만으로는 에러 캐시가 refetch되지 않아 같은 화면 반복.
- **영향**: '없음'도 '실패'도 아닌 제3의 상태(무한 로딩)로 위장 — 사용자는 데이터가 큰 줄 알고 기다리며, 가족 관계 저작 플로우 전체가 원인 표시 없이 봉쇄된다.
- **제안**: isError를 받아 loading 계산에서 분리(`loading={isPending}`)하고 모달 내 '목록을 불러오지 못했습니다 · 다시 시도' 상태 추가, 모달 오픈 시 에러 상태면 refetch 트리거.
- **검증**: ⚠ PARTIAL — 핵심(에러 미소비로 실패가 무한 로딩으로 위장, loading={!familyAddPool} L2681/L2966, 모달 내 에러 UI·재시도 부재, retry:false는 전역 queryClient.ts:8-9)은 성립. 그러나 "모달을 닫았다 열어도 refetch되지 않아 영구 고착"은 반박됨: @tanstack/query-core 5.90.20의 shouldFetchOptionally(node_modules/@tanstack/query-core/src/queryObserver.ts:784)는 enabled false→true 전환 시 refetch하며, 에러 쿼리는 data===undefined라 isStaleByTime이 항상 true(src/query.ts:309-311). onClose가 familyAddMode/childOtherParent를 null로 리셋해 enabled가 토글되므로 재오픈마다 자동 재요청 발생 — 일시 장애는 닫았다 열면 회복된다. 따라서 "가족 저작 플로우 전체 봉쇄·자동 회복 없음"은 과장이며, 실체는 '한 모달 세션 내 에러가 로딩으로 위장되고 재시도 안내가 없는' UX 결함. 심각도 P2→P3 하향, suggestion(isPending 분리+에러 상태 UI)은 여전히 유효.

#### ER5 · **P3** · S · 무마이그 — 인간관계 근거 사건 피커(SourceSelector)의 연보 2쿼리 무성 실패 — '두 인물의 연보에 등록된 사건이 없습니다'라는 거짓 빈 상태로 렌더

- **위치**: `apps/web-admin/src/widgets/person/person-human-relationships-section/person-human-relationships-section.tsx:2079`
- **증거**: L2079~2090 `const { data: subjectEvents = [], isLoading: subjectLoading } = useQuery(...)` / `const { data: relatedEvents = [] } = useQuery(...)` — 둘 다 isError 미소비. 실패 시 기본값 []로 합류해 L2139~2144 `if (allEvents.length === 0) return <SourceSelectorEmpty>두 인물의 연보(PersonLifeEvent)에 등록된 사건이 없습니다.</SourceSelectorEmpty>` 분기로 떨어짐 — 연보가 실제로 있는 인물인데도 '등록된 사건 없음'으로 단정 표기. 같은 파일 상단 쿼리들은 L166 `isError: personsError`·L2275 '계보를 불러오지 못했습니다.'로 에러를 소비하고 있어 파일 내에서도 처리 규약이 이원화.
- **영향**: 관계 등록 시 근거 사건 연결을 '연보 미작성'으로 오판해 건너뛰게 만들고, 실패 원인이 표면화되지 않아 재현·문의가 어렵다(같은 섹션의 다른 쿼리는 에러를 표시해 사용자 기대와 불일치).
- **제안**: 두 쿼리의 isError를 받아 빈 상태 분기 앞에 '연보를 불러오지 못했습니다' SourceSelectorEmpty를 추가 — 같은 파일 L2275 계보 에러 처리 패턴 그대로 재사용.
- **검증**: CONFIRMED

### CC. 동시 편집·이중 writer(보강 렌즈)

#### CC1 · **P1** · M · 무마이그 — PUT /persons/:id 전체 교체 쓰기(sections·nicknames)에 동시성 토큰·프리컨디션 전무 — stale 스냅샷 last-write-wins로 상대 세션의 저장이 조용히 역전(삭제 섹션 부활 포함)

- **위치**: `apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:2068`
- **증거**: L2067~2071 `if (sections !== undefined) { await tx.personSection.deleteMany({ where: { personId: id } }); ... createMany(...)}` — nicknames도 L2083~2095 동일 deleteMany+createMany. update-person.dto.ts·person.controller.ts PUT(L945~) 전 경로에 version/updatedAt 비교 없음(grep 0건). 재현: 같은 admin이 탭1·탭2에 같은 인물 상세를 열고, 탭1에서 전기 섹션 S3 추가 저장 → 탭2(공유 캐시 없음, stale rows [S1,S2])에서 섹션 순서만 드래그 → 디바운스 PUT이 [S2,S1] 전체 배열 전송 → 서버가 통째 delete-recreate로 S3 삭제. 탭2는 '전기가 저장되었습니다' 성공 토스트만 보고, 탭1의 추가분은 무통보 소실. 역방향으로 탭1이 삭제한 섹션이 탭2의 stale PUT으로 부활도 동일.
- **영향**: 관리자 2탭·상세 위 수정 모달·스택 모달 등 복수 writer가 일상적으로 발생하는 구조인데, 마지막 PUT이 무조건 이기고 실패조차 하지 않아 저장 성공 확신 하에 데이터가 소실된다. Person.updatedAt(@updatedAt, libs/db/prisma/person.prisma L350)이 이미 존재해 스키마 변경 없이 막을 수 있는 결함.
- **제안**: 최소 가드: UpdatePersonDto에 선택 필드 `expectedUpdatedAt`(클라이언트가 마지막으로 본 detail 응답의 updatedAt)을 추가하고, 트랜잭션 첫 줄에서 `updateMany({ where: { id, updatedAt: expected } })` 결과 count=0이면 409 반환(If-Unmodified-Since식). 클라이언트는 409 수신 시 자동 재시도 대신 refetch+충돌 안내. sections만이라도 먼저 적용하면 전기 축 clobber는 차단된다.
- **검증**: CONFIRMED

#### CC2 · **P2** · S · 무마이그 — pushPersonToModalStack 중복 가드가 '연속 top'만 검사 — A→B→A 경로로 같은 인물의 전기 편집기 2개가 한 창에 동시 마운트되어 같은 창 안에서도 이중 writer 충돌 성립

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:734`
- **증거**: L734 `if (prev[prev.length - 1] === id) return prev` — 직전 top만 비교하고 루트 패널의 personId·스택 하부 중복은 미차단. L3120~3127에서 스택 top이 `<PersonDetailPanel personId={modalTopId} embedInModal>`로 렌더되고, PersonBiographySections는 L1668에서 embed 여부와 무관하게 마운트(+기지 발견대로 embed에도 ✎/추가 어포던스 존재). 재현: 루트=인물 A → 전기에서 B 클릭(스택 [B]) → B 패널에서 A 멘션 클릭 → L734 가드 통과(top=B)로 스택 [B,A]. 이제 루트와 스택 모달이 A의 PersonBiographySections를 각각 독립 rows로 보유. 스택 쪽에서 섹션 삭제 후 모달 닫기(언마운트 flush PUT, person-biography-sections.tsx L490) → 루트 쪽에서 편집 중이던 본문 저장(persistNow 전체 배열) → 스택에서 한 삭제가 조용히 부활.
- **영향**: 멀티탭 없이 단일 창의 정상 탐색만으로 finding 1의 last-write-wins 전제(복수 writer)가 성립한다. 두 인스턴스가 같은 쿼리 키(personKeys.detailFull)를 공유해 절반쯤 동기화되는 탓에 증상이 간헐적·비결정적으로 나타나 진단도 어렵다.
- **제안**: 최소 수정: push 가드를 `if (id === personId || prev.includes(id)) return prev`로 확장하되, 스택 내 중복이면 무시 대신 해당 깊이까지 pop(`prev.slice(0, prev.indexOf(id) + 1)`)해 '그 인물로 돌아가기' UX를 보존. 루트 personId와 같으면 스택 전체 close가 자연스러운 동작.
- **검증**: CONFIRMED

#### CC3 · **P2** · M · 무마이그 — 서버 delete-recreate가 매 저장마다 PersonSection id를 재발급해 syncRowsWithServer의 serverId 매칭이 교차 인스턴스에서 무력화 — 상대 저장을 stale 로컬로 덮거나(내용 역전) 편집 중 섹션을 중복 부활시켜 다음 PUT에서 중복 영구화

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-biography-sections.tsx:177`
- **증거**: L177~183 `const prevIsAhead = p.serverId === undefined || (p.serverId !== s.serverId && (p.title !== s.title || ...)); if (prevIsAhead) return { ...p, serverId: s.serverId }` — 서버가 저장마다 id를 갈아끼우므로(repository L2068~2078) `p.serverId !== s.serverId`는 교차 인스턴스 refetch에서 항상 참이 되고, '내용이 다르면 로컬이 앞선 것'으로 오판한다. 재현①(동일 길이): 인스턴스2가 S2 본문 수정·저장 → 공유 캐시 refetch → 인스턴스1의 sync에서 S2가 serverId 상이+내용 상이로 prevIsAhead=true → 옛 본문 유지, 이후 인스턴스1의 아무 구조 변경 PUT이 인스턴스2의 수정을 서버에서 역전. 재현②(길이 상이, L196~228): 인스턴스1이 S1 편집 중(dirty) + 인스턴스2가 S2 삭제·저장 → refetch 시 서버 S1'(신규 id)이 serverId·내용 매칭 모두 실패해 새 행으로 append되고 dirty S1은 editingKey로 보존 → rows=[S1'(서버판), S1(편집판)] 중복 → 편집 완료 persistNow가 중복 섹션을 영구 저장.
- **영향**: sync 로직이 '다른 탭 저장' 케이스를 명시적으로 겨냥해 작성됐지만(L163~164 주석), 그 판정의 유일한 안정 키인 serverId를 서버 쓰기 패턴이 매번 파괴한다. 같은 저장소의 spouses는 정확히 이 이유로 id 보존 upsert로 이미 전환(repository L2016~2019 주석)됐는데 sections만 구식 패턴으로 남아 클라 휴리스틱과 상호 모순.
- **제안**: 서버: sections도 spouses처럼 id 보존 diff-update(기존 id 매칭 update + 신규만 create + 잔여 delete)로 전환하고 응답에 섹션 id 포함. 클라: 저장 성공 시 invalidate에만 의존하지 말고 PUT 응답(또는 직후 refetch 결과)으로 lastPersistedRef뿐 아니라 rows 자체를 리베이스해 로컬 기준선을 서버 정본에 고정. 이 둘이 갖춰지면 prevIsAhead 판정이 설계 의도대로 동작한다.
- **검증**: CONFIRMED

#### CC4 · **P2** · M · 무마이그 — 수정 모달이 편집 여부와 무관하게 nicknames·spouseRelations·countryAffiliations 전체 배열을 열람 시점 스냅샷으로 항상 왕복 — 스칼라 한 칸 고치는 저장이 그 사이 다른 세션이 바꾼 별칭·배우자·소속을 통째로 되돌림

- **위치**: `apps/web-admin/src/shared/ui/person-register-modal/person-register-view.tsx:1603`
- **증거**: L1602~1613 `// 수정: 항상 전송(빈 배열이면 전부 제거)` `nicknames: isEditMode || ... ? nicknameRows...` — countryAffiliations(L1586~1601)·spouseRelations(L1625~1626 '수정: 보존된 전체 관계를 왕복')도 동일하게 edit 모드에서 무조건 전송되고, 서버는 각각 deleteMany+createMany/전체 수렴으로 교체(repository L2083~2097·L2015~2063). 재현: 탭1이 person-detail.page.tsx L28의 PersonRegisterViewModal을 열어 둔 채(hydrate는 열람 시점 1회) 탭2에서 별칭 1건 추가 저장 → 탭1이 사망 메모만 고치고 '수정 완료' → 손대지 않은 nicknames가 열람 시점 스냅샷으로 전송돼 탭2의 별칭이 무통보 삭제.
- **영향**: '항상 전송'은 빈 배열=제거 계약을 위한 의도적 설계지만, 사용자가 건드리지 않은 컬렉션까지 충돌 창에 편입시켜 finding 1의 clobber 반경을 스칼라 편집 전부로 넓힌다. 특히 별칭은 reason 필드 hydrate 등으로 정성 들여 쌓는 데이터라 소실 체감이 크다.
- **제안**: 클라 최소 가드: 컬렉션별 초기 스냅샷과 deep-equal 비교해 변경된 컬렉션만 payload에 포함(미변경 = undefined = 서버 '변경 없음' 계약을 그대로 활용, 서버 수정 불필요). 근본적으로는 finding 1의 updatedAt 프리컨디션이 함께 있어야 '변경한 컬렉션끼리의 충돌'도 409로 드러난다.
- **검증**: CONFIRMED

### MD. 미디어 견고성(보강 렌즈)

#### MD1 · **P3** · S · 무마이그 — 헤더 아바타 img 로드 실패 시 폴백 부재 — 패널 최상단 132px 원형에 깨진 이미지가 정본 UI로 노출

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1230`
- **증거**: `{person.profileImageUrl ? (<img src={getUploadImageUrl(person.profileImageUrl) || person.profileImageUrl} alt={fullName} />) : (<FiUsers size={24} aria-hidden />)}` — FiUsers 실루엣 폴백은 URL null일 때만 분기하고 onError 핸들러가 없음. 서버는 인물 삭제 시 디스크 파일을 실제로 지우므로(person.service.ts L560 deleteFileByUrl 루프) 죽은 업로드 URL은 실재하는 상태다. 재현: 프로필 이미지 업로드 후 스토리지 파일 삭제(또는 API 호스트만 살아있고 파일 유실) → 패널 헤더 132×132 원(AvatarButton, styles.ts L297: overflow:hidden + img width/height 100%)에 브라우저 깨진 아이콘+alt 텍스트가 그대로 노출. 아바타 업로드 직후 refetch→정적 서빙 반영 사이의 순간 깨짐(L988~990)도 같은 경로로 노출.
- **영향**: 아바타는 패널 최상단 정체성 요소인데 실패 상태가 브라우저 기본 깨진 아이콘으로 방치됨. FiUsers 폴백이 이미 존재하므로 onError 한 줄로 흡수 가능한 상태를 놓친 것.
- **제안**: img에 onError로 로컬 state(avatarBroken)를 세워 FiUsers 분기로 강등(src 변경 시 리셋). 업로드 직후 순간 깨짐도 동일 폴백이 흡수. 국가 배지·칩 아바타와 함께 공용 ImgWithFallback(src, fallback ReactNode, onError→fallback 렌더) 컴포넌트로 추출 권장.
- **검증**: ⚠ PARTIAL — 핵심(헤더 아바타 img onError 폴백 부재)은 성립 — person-detail-panel.tsx L1229~1239에 onError 없이 URL null 분기만 존재하고, AvatarButton(styles.ts L297) 132px 원형·overflow:hidden도 사실이며, 같은 리포 tenure-register-panel.tsx L827은 동일 데이터에 onError 폴백을 이미 구현해 누락임이 방증됨. 그러나 제시된 재현 시나리오 2건은 모두 정정 필요: (1) person.service.ts L560 deleteFileByUrl은 인물 삭제 플로우 내부(직후 L564에서 인물 레코드도 삭제)라 그 인물의 패널 자체가 열리지 않아 '살아있는 인물+죽은 업로드 URL'을 만들지 못하고, update 플로우에는 구 파일 삭제가 없어 아바타 교체로도 죽은 URL이 생기지 않음. (2) '업로드 직후 refetch→정적 서빙 반영 사이 순간 깨짐(L988~990)'도 uploadImage가 디스크 기록 후 응답하는 로컬 정적 서빙 구조라 성립하지 않음. 실제 도달 경로는 외부 URL rot(profileImageUrl DTO 무검증, update-person.dto.ts L234)·운영상 uploads 디렉토리 유실/이전 등 엣지·운영 사고뿐이므로 P2는 과장 — P3(방어적 폴백 누락)로 강등.

#### MD2 · **P2** · S · 무마이그 — 동시대 수장 칩 아바타가 getUploadImageUrl 미경유 raw 상대경로를 src에 직결 — 분리 오리진 환경에서 전 칩 404 + onError 폴백도 없어 글리프 폴백 도달 불가

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/contemporaries-strip.tsx:93`
- **증거**: `<ChipAvatar src={chip.profileImageUrl} alt="" aria-hidden />` — 서버 upload.controller.ts L155가 반환·저장하는 URL은 상대경로 `/uploads/images/persons/...`이고, contemporaries 응답(person.service.ts L1394 `profileImageUrl: p.profileImageUrl`)·래퍼(shared/api/person-contemporaries.ts L53)·strip.lib(L127) 어디에서도 정규화하지 않음. 같은 파일의 헤더 아바타(L1232)와 달리 getUploadImageUrl을 안 거쳐, web-admin 오리진과 API 오리진이 다른 환경(getUploadImageUrl이 존재하는 이유인 Electron·호스트 분리 배포)에서는 상대경로가 web 오리진으로 해석돼 스트립의 모든 칩 아바타가 404. ChipGlyph(카테고리 글리프, L95) 폴백은 URL truthy면 도달 불가하고 onError도 없어 18px 깨진 아이콘이 칩마다 나열됨.
- **영향**: 폴백 부재 이전에 URL 해석 자체가 헤더 아바타 경로와 비대칭인 명백한 결함. 깨진 18px 아이콘이 국가 그룹마다 반복 노출돼 스트립 전체가 파손된 인상을 줌.
- **제안**: src를 `getUploadImageUrl(chip.profileImageUrl) || chip.profileImageUrl`로 통일하고, onError 시 해당 칩을 ChipGlyph 분기로 강등(칩 단위 broken state 또는 공용 ImgWithFallback 사용).
- **검증**: CONFIRMED

#### MD3 · **P3** · M · 무마이그 — 전기 본문 저장 HTML 내 img 로드 실패 무처리 — 깨진 아이콘이 본문 중간 방치되고 클릭 시 라이트박스가 깨진 원본을 전면 확대

- **위치**: `apps/web-admin/src/shared/ui/rich-text-read-view/rich-text-read-view.tsx:141`
- **증거**: `dangerouslySetInnerHTML={{ __html: safe }}` — formatRichTextForReadView가 src 재작성(rich-text-read-view.ts L77)은 하지만 로드 실패 처리는 없음. error 이벤트는 버블되지 않는데 Root에 capture 위임 리스너도, 렌더 후 img별 리스너 부착도 전무(read-view·prose-with-entity-clicks·biography-sections 전체 grep onError 0건). 재현: 전기 섹션에 외부 핫링크 이미지(또는 이후 삭제된 업로드) 포함 → 본문 단락 사이에 브라우저 깨진 아이콘 방치. 나아가 onContentClick(L110~120)은 로드 성공 여부를 안 보고 `figure img` closest 매치만으로 라이트박스를 열어(L119 `img.currentSrc || img.src`), 깨진 이미지를 클릭하면 전면 오버레이에 깨진 아이콘이 95vw로 확대됨(LightboxImg L152도 onError 없음).
- **영향**: 전기는 장기 보존 문서라 외부 핫링크 부패·업로드 파일 삭제가 누적되는 지면인데, 실패 상태가 본문·라이트박스 양쪽에서 브라우저 기본 깨진 아이콘으로 노출됨. 공용 컴포넌트라 기업·사건 상세 등 모든 리치텍스트 읽기 지면에 동일 적용되는 레버리지 지점.
- **제안**: Root(또는 hostRef)에 capture 단계 위임 리스너 `el.addEventListener('error', handler, true)`를 useEffect로 부착해 실패 img에 data-broken 클래스를 스탬프 → CSS로 플레이스홀더(아이콘+최소 높이) 표시. onContentClick은 `img.naturalWidth === 0 || img.dataset.broken`이면 라이트박스 오픈을 차단하고, LightboxImg에도 onError 시 닫기 또는 '이미지를 불러올 수 없습니다' 대체 표시.
- **검증**: ⚠ PARTIAL — 핵심 성립: rich-text-read-view.tsx L141 innerHTML 주입 후 img 로드 실패 처리 전무(디렉토리·스타일·lib 전체 grep onError/error 리스너 0건), sanitize-rich-text-html.ts L14-15가 http/https img src를 허용해 외부 핫링크·삭제된 업로드 모두 깨진 이미지로 본문 방치 가능, onContentClick(L110-120)은 로드 상태 무확인으로 깨진 이미지에도 라이트박스를 열고 LightboxImg(L152)도 onError 없음, 래퍼 prose-with-entity-clicks의 캡처 핸들러는 엔티티 요소만 가로채 차단 없음, 전기(person-biography-sections.tsx:882) 포함 공용 적용도 사실. 정정 2건: (1) "깨진 아이콘 95vw 전면 확대"는 부정확 — LightboxImg는 max-width/max-height+object-fit:contain이라 업스케일하지 않으며, 실패 img는 고유 크기가 작아 암막 오버레이 중앙에 작은 깨진 아이콘/빈 상태로 표시됨(오버레이는 ESC/클릭으로 정상 닫힘, 기능 트랩 없음). (2) 심각도 과대 — 데이터 손실·기능 차단 없는 표시 견고성 결함이므로 P2가 아닌 P3이 적정.

#### MD4 · **P3** · S · 무마이그 — 국가 배지 폴백 체인이 렌더 시점 데이터 유무로만 결정 — thumbnailUrl 로드 실패 시 이미 가진 flagEmoji 폴백에 영영 도달 불가, flagcdn 외부 CDN 의존 무방비

- **위치**: `apps/web-admin/src/widgets/person/person-detail-panel/person-detail-panel.tsx:1144`
- **증거**: `const countryFlagSrc = p.country?.thumbnailUrl ? getUploadImageUrl(...) || ... : p.country?.isoCode ? \`https://flagcdn.com/w80/...\` : null` + L1283~1287 `{countryFlagSrc ? <CountryFlagImg src={countryFlagSrc} alt="" aria-hidden /> : p.country?.flagEmoji ? <DetailCountryFlagEmoji>...` — 폴백 우선순위(업로드 썸네일→flagcdn→이모지)가 URL '존재'로만 갈리고 '로드 성공'과 무관. 재현: thumbnailUrl이 죽은 업로드를 가리키거나, flagcdn 경로에서 오프라인·사내망 CDN 차단 시 → CountryFlagImg(22×15, onError 없음)가 빈 자리/깨진 상태로 남고, 데이터에 이미 있는 flagEmoji 폴백은 렌더 분기상 도달 불가. K9(오버라이드 시 thumbnailUrl 데이터 부재)와 별개로 URL은 있으나 로드가 실패하는 축.
- **영향**: 폴백 자원(flagEmoji)이 이미 응답에 실려 오는데 실패 시 활용하지 못하는 설계 공백. flagcdn은 어드민이 통제 못 하는 외부 가용성 의존이라 실패 확률이 상시 존재.
- **제안**: onError 시 단계 강등하는 소형 컴포넌트로 감싸기: 업로드 썸네일 실패→flagcdn(있으면)→flagEmoji→null 순서로 state 강등. 공용 ImgWithFallback에 폴백 체인 배열을 받게 하면 헤더 아바타·칩 아바타와 한 구현으로 수렴.
- **검증**: CONFIRMED


---

## 3. 레버리지順 배치 로드맵 (전 건 무마이그)

### 배치 1 — P1 차단 (보안·데이터 소실, 최우선)

| ID | 심각도 | 규모 | 제목 |
|---|---|---|---|
| BE1 | P1 | M | 경력·학력·수상 서브리소스 22개 엔드포인트 전체에 계정 소유권 검사 부재 — 타 계정 데이터 생성·삭제·열람 가능 |
| BE2 | P1 | S | 능력치 부분수정 `'politics' in dto` 판정이 ES2023 useDefineForClassFields로 항상 true — 일괄 평가 시 미전송 축이 조용히 null 초기화 |
| DS1 | P1 | M | 전기 명시 저장 실패 시 편집모드가 PUT 결과 확인 전에 이미 종료돼 flush 안전망·재시도 동선에서 제외 — 읽기 모드가 미저장 내용을 저장본처럼 표시하고 이후 이탈 시 영구 유실 |
| CC1 | P1 | M | PUT /persons/:id 전체 교체 쓰기(sections·nicknames)에 동시성 토큰·프리컨디션 전무 — stale 스냅샷 last-write-wins로 상대 세션의 저장이 조용히 역전(삭제 섹션 부활 포함) |

BE1은 lifeEvents 패턴(person.service.ts L823~) 이식으로 기계적 반복, BE2는 두 곳 `!== undefined` 교체(명시적 null=초기화 의미 보존). DS1·CC1은 같은 저장 파이프라인이라 함께 설계할 것 — DS1의 dirty 기준선(lastPersistedRef) 확장이 CC1의 409 수신 후 refetch·충돌 안내와 맞물린다.

### 배치 2 — 전기 저장 라이프사이클·동시성 마감

| ID | 심각도 | 규모 | 제목 |
|---|---|---|---|
| DS2 | P2 | S | 편집 중 다른 섹션 ✎/섹션 추가 진입 시 이전 편집을 마감하지 않고 editingKey·editInitialRef를 덮어써 미저장 변경이 dirty 추적에서 고아화 — 조용한 유실 또는 조용한 동반 커밋 |
| DS3 | P2 | M | 편집 중 구조 변경(삭제·이동)의 디바운스 PUT이 편집 중 초안을 함께 서버에 발행 — 이후 Esc 취소가 서버에 반영되지 않아 UI·서버 발산 |
| CC2 | P2 | S | pushPersonToModalStack 중복 가드가 '연속 top'만 검사 — A→B→A 경로로 같은 인물의 전기 편집기 2개가 한 창에 동시 마운트되어 같은 창 안에서도 이중 writer 충돌 성립 |
| CC3 | P2 | M | 서버 delete-recreate가 매 저장마다 PersonSection id를 재발급해 syncRowsWithServer의 serverId 매칭이 교차 인스턴스에서 무력화 — 상대 저장을 stale 로컬로 덮거나(내용 역전) 편집 중 섹션을 중복 부활시켜 다음 PUT에서 중복 영구화 |
| CC4 | P2 | M | 수정 모달이 편집 여부와 무관하게 nicknames·spouseRelations·countryAffiliations 전체 배열을 열람 시점 스냅샷으로 항상 왕복 — 스칼라 한 칸 고치는 저장이 그 사이 다른 세션이 바꾼 별칭·배우자·소속을 통째로 되돌림 |
| RD3 | P2 | M | 임베드 모달 패널의 Esc stopPropagation이 전기 편집취소·라이트박스 Esc를 선점 — 버리려던 편집이 언마운트 flush로 조용히 저장됨 |
| AU1 | P3 | S | 편집 중 Esc가 읽기 뷰 이미지 라이트박스 닫기와 동시 발화 — 라이트박스 닫으려다 편집 취소 확인 유발 |
| AU2 | P3 | S | 섹션 제목 빈 값·중복 무검증으로 TOC·삭제 확인 식별 불가 + 빈 신규 섹션은 저장 필터 탈락으로 로컬에만 남는 유령화 |
| DS4 | P3 | S | 백엔드 update가 트랜잭션 커밋 후 부수효과(알림·완성도 포인트) 예외를 그대로 전파 — 저장 성공을 프론트에 실패로 보고해 dirty 기준선 오염·중복 알림 유발 |
| DS5 | P3 | S | 전기 편집 중 브라우저 새로고침·창 닫기 보호 부재 — beforeunload 가드·keepalive 없이 언마운트 flush는 SPA 내부 전환만 커버 |
| PF1 | P2 | M | 전기 섹션 RichTextEditor에 debounceMs/flushRef 미전달 — 키 입력마다 전체 innerHTML DOMPurify sanitize + 섹션 리스트 전체 재렌더(사건 InlineRichText는 이미 해결 패턴 보유) |
| BE4 | P3 | S | json body limit 10MB < 전기 섹션 검증상수 16MB 상한 모순 — 섹션 합계 10MB 초과 시 그 인물의 모든 전기 저장(무관한 삭제·순서변경 포함)이 진단 불가 raw 413으로 영구 실패 |
| BE7 | P3 | M | 검증 실패 400이 'Validation failed' 고정 문구 — 전기 자동저장 실패 토스트에 raw JSON/영문 노출로 원인 파악 불가 |

DS2·DS3·CC2~CC4는 배치 1의 저장 파이프라인 수술과 같은 파일(person-biography-sections.tsx·repository)이므로 연속 작업이 효율적. RD3·AU1은 같은 Esc 라우팅 문제의 두 얼굴.

### 배치 3 — 계약·시간축 표기 정합

| ID | 심각도 | 규모 | 제목 |
|---|---|---|---|
| BE3 | P2 | S | DateInfoDto year/month/day 범위 미검증 — month=13·day=0·연도 0/음수가 400 없이 silent 롤오버 저장 |
| BE5 | P3 | S | POST /persons가 DTO에 선언·검증되는 sections·profileImages를 서비스 매핑 누락으로 무성 드롭 — update 경로와 비대칭인 죽은 계약 |
| BE6 | P3 | M | 재임·경력 DTO 런타임 검증 구멍 — enum을 @IsString만으로 검증, Int 필드 소수·TEXT 무제한이 Prisma 500으로 전환('400 원칙'과 비대칭) |
| UX1 | P2 | M | 헤더 생몰 subtitle이 정본 formatLifespan 미위임 — isAlive·미상 플래그 무시로 몰년 미상 고인이 '생존 (수백 세)'로 둔갑하고 circa '경'·floruit 폴백·편측 미상 '?' 규약도 전부 누락돼 같은 화면 카드와 자기모순 |
| TC1 | P2 | S | 향년·생존 기간 계산이 birthEra/deathEra 무시 — BC 인물 '향년 -56세'가 헤더·KPI·사망카드 3곳 노출, BC→AD 교차 인물은 그럴듯한 오값 |
| TC2 | P2 | S | KPI '재임·재위 총 연수'가 종료일 미입력 구간을 사망자에게도 현재(2026)까지 합산 — 같은 화면 카드의 사망일 폴백과 자기모순(수백 년 부풀림) |
| TC3 | P3 | S | 취임/퇴임 나이 배지가 BC 출생 인물의 birthYear를 era 게이트 없이 getAgeAtDate에 전달 — 문서화된 AD 전제를 유일한 호출부가 위반해 오값·누락 |
| TC4 | P3 | S | 배우자 상세 — 혼인 종료일만 있는 관계가 구분자 없이 단독 날짜로 표기돼 혼인일로 오독 |
| UX3 | P2 | S | 사망자의 진행형 기간이 '~ 현재'/'~ 재학중'으로 표기 — 재임·재위의 endReason/isDeceased 폴백 규약과 불일치 |

UX1·TC1~TC3는 전부 "정본 레이어(formatLifespan·era 헬퍼) 우회" 한 뿌리 — 헤더/KPI/배지가 같은 헬퍼를 쓰도록 수렴하면 일괄 해소.

### 배치 4 — 개요 UX·전기 읽기·에러/미디어 견고성

| ID | 심각도 | 규모 | 제목 |
|---|---|---|---|
| UX2 | P2 | M | embed(읽기) 모달에 편집 어포던스 누출 — 능력치·인간관계·소속그룹·전기(✎/관리/추가)·아바타 5곳이 embedInModal 규약 미적용, '비교' 버튼은 모달 밑 페이지 이탈 |
| ER1 | P2 | M | 본체 상세 fetch 실패가 상태 불문 '인물을 찾을 수 없습니다 / 목록에서 다시 선택해 주세요' 고정 — 네트워크·404·권한(401/403) 미구분에 재시도 경로 전무 |
| ER2 | P3 | S | 풀페이지 새 탭 딥링크에서 에러 화면의 '닫기'(onClose=navigate(-1))가 무동작 — 삭제된 인물 404가 완전한 막다른 화면 |
| ER3 | P2 | S | person-life-events 쿼리 실패가 `data: lifeEvents = []` 기본값으로 무성 둔갑 — 연보가 '기록 없음'처럼 렌더되고 등록 모달의 기존 연보 대조도 빈 목록으로 무력화 |
| ER4 | P3 | S | 가족 추가 인물 풀(familyAddPool) 실패 시 `loading={!familyAddPool}`이 영구 참 — 인물 선택 모달이 에러 표시 없이 무한 로딩에 고착 |
| ER5 | P3 | S | 인간관계 근거 사건 피커(SourceSelector)의 연보 2쿼리 무성 실패 — '두 인물의 연보에 등록된 사건이 없습니다'라는 거짓 빈 상태로 렌더 |
| MD1 | P3 | S | 헤더 아바타 img 로드 실패 시 폴백 부재 — 패널 최상단 132px 원형에 깨진 이미지가 정본 UI로 노출 |
| MD2 | P2 | S | 동시대 수장 칩 아바타가 getUploadImageUrl 미경유 raw 상대경로를 src에 직결 — 분리 오리진 환경에서 전 칩 404 + onError 폴백도 없어 글리프 폴백 도달 불가 |
| MD3 | P3 | M | 전기 본문 저장 HTML 내 img 로드 실패 무처리 — 깨진 아이콘이 본문 중간 방치되고 클릭 시 라이트박스가 깨진 원본을 전면 확대 |
| MD4 | P3 | S | 국가 배지 폴백 체인이 렌더 시점 데이터 유무로만 결정 — thumbnailUrl 로드 실패 시 이미 가진 flagEmoji 폴백에 영영 도달 불가, flagcdn 외부 CDN 의존 무방비 |
| UX4 | P3 | S | 클러스터 라벨 게이트와 섹션 렌더 게이트 조건 불일치 — embed에서 라벨 없는 고아 섹션이 이웃 클러스터 소속처럼 보임 |
| UX5 | P3 | M | 경력·학력·수상 항목 수정 불가(삭제만) — 등록 모달 3종이 create 전용이라 오타 정정에 삭제 후 재입력 강요 |
| UX6 | P3 | M | 활동·이력(저작·창업·조직 역할·군부대 지휘) 섹션이 빈 상태에서 완전 소멸 — 추가 진입점·기능 인지 자체가 불가(이웃 섹션들과 정책 3원화) |
| UX7 | P3 | S | 영향력 미설정(null)이 '0'으로 둔갑 — 미평가와 0점 평가를 구분 못 하고 embed에서는 의미 없는 빈 게이지만 노출 |
| UX8 | P3 | M | 개요 탭 전체 점프 내비 부재 — 최대 14개 섹션·4클러스터를 선형 스크롤로만 소비(전기만 자체 TOC 보유) |
| RD1 | P2 | S | 읽기 뷰 collapseInterBlockWhitespace 정규식이 인라인 요소 사이의 의미 있는 공백까지 제거해 단어가 붙어 렌더됨 |
| RD2 | P2 | S | 읽기 뷰 .entity-link에 user-select:none 공유 — 전기 본문 복사 시 엔티티 링크 단어가 통째로 누락 |
| RD4 | P3 | S | .entity-link white-space:nowrap(max-width 없음) — 긴 앵커 문구가 좁은 임베드 모달에서 컨테이너를 가로로 넘침 |
| RD6 | P3 | S | HTML 전기(15px)와 평문 전기(14px)의 본문 타이포 불일치 — 저장 형식에 따라 같은 지면 활자 크기가 갈라짐 |
| RD7 | P3 | M | 전기 서술의 연대와 개요 구조화 데이터(생몰·재위) 간 모순을 드러낼 대조 장치 부재(개선 기회) |

### 배치 5 — 성능·접근성

| ID | 심각도 | 규모 | 제목 |
|---|---|---|---|
| AY1 | P2 | M | 확인 다이얼로그(DeleteConfirmDialog·공용 ConfirmDialog)에 포커스 이동·트랩·Esc 전무 — 트리거에 남은 포커스로 Enter 재발화 시 다이얼로그 중복 큐잉, useModalBehavior 규약 위반 |
| AY2 | P2 | S | 전기 본문 이미지 alt 전무 + 편집용 title '클릭하여 크기 조절'이 저장 HTML에 남아 SR이 이미지 이름으로 낭독 |
| AY3 | P2 | M | 전기 섹션 저장·취소·삭제와 영향력 수정/저장 후 포커스가 body로 유실 — 종료 경로 포커스 복귀 전무 |
| AY4 | P3 | S | 탭바 role=tablist가 aria-controls 없이 선언되고 화살표 키 내비게이션·roving tabindex 부재 — 반쪽 시맨틱 |
| AY5 | P3 | M | 패널 전체 framer-motion 애니메이션·smooth 스크롤이 prefers-reduced-motion 미존중(타 영역은 이미 분기) |
| AY6 | P3 | S | 섹션 유형 선택 role=radiogroup/radio 선언에 화살표 키·roving tabindex 부재 + 재클릭 해제(null)가 라디오 시맨틱과 모순 |
| AY7 | P3 | S | 다크 테마에서 하드코딩 인디고/슬레이트 텍스트 대비 미달(활성 유형 칩 ≈2.5:1, 영향력 tier 라벨 ≈3.4:1) — 다크 인라인 하드코딩 매핑 규약 우회 |
| AY8 | P3 | M | 전기 이미지 라이트박스가 마우스 클릭 전용 — 키보드로 열 수 없고 열려도 포커스 이동·트랩 부재 |
| AY9 | P3 | S | BioMention 스택 모달이 Esc로 닫히지 않음 — 트랩·스크롤락은 있으나 키보드 닫기 경로가 X 버튼뿐(useModalBehavior 규약 이탈) |
| AY10 | P3 | S | 전기 섹션 제목 입력이 placeholder에만 의존 — 값 입력 후 접근 가능한 이름 부재 |
| PF2 | P3 | S | GET :id/detail — findByIdWithRelations와 findHumanRelationships 독립 쿼리를 순차 await로 직렬화 |
| PF3 | P3 | S | person-life-events 쿼리가 연보 탭 게이트 없이 eager 페치 — 개요 진입·모달 스택 패널마다 큰 설명 페이로드를 불필요 요청(가계도 쿼리는 이미 게이트됨) |
| PF4 | P3 | S | 전기 편집 키보드 단축키 useEffect가 rows에 의존 — 키 입력마다 window keydown 리스너 해제·재등록(latestRowsRef로 무비용 제거 가능) |
| BE8 | P3 | S | GET :id/detail에서 findHumanRelationships가 소유권 검사용 findById(전체 매핑 포함)를 중복 실행 — 상세 진입마다 인물 본체 쿼리 1세트 낭비 |
| RD5 | P3 | M | 대용량 전기 섹션(최대 16MB) 전량 동기 파싱·일괄 렌더 — MEDIUMTEXT 상향과 짝이 되는 지연·가상화 장치 부재로 개요 탭 초기 페인트 블로킹 |

AY1(P2)은 공용 ConfirmDialog 문제라 수혜 범위가 인물 상세 밖까지 넓음 — 배치 5 안에서 최우선.

---

## 4. 반박 탈락 (정직성 기록)

적대 검증에서 반박된 3건 — 재보고 방지용 기록:

- **업적 수정 폼 toDateInput slice(0,10)이 BC ISO를 '-0221-05-0'으로 절단 — 제목만 수정해도 잘린 날짜가 그대로 전송돼 무성 데이터 오염**
  - 반박: 코드 인용(toDateInput slice L82-83·L140·L155)은 정확하나 전제가 불성립. (1) 업적 startDate/endDate는 Prisma DateTime=MySQL DATETIME(libs/db/prisma/government.prisma:361-362, 519-522)으로 음수(BC) 연도 저장 자체가 불가능 — 업적 모델에 era 필드도 없음. (2) 기입 경로도 없음: 폼은 input[type=date]이고, 원시 API로 '-0221-05-01'을 보내도 리포지토리의 new Date()(apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:3301, 3537)가 부호를 버리고 AD 221로 파싱(node 실측), 6자리 확장표기 '-000221-05-01'은 IsDateString(isISO8601)이 거부(실측 false). (3) 형식도 불일치: BC JS Date의 toISOString은 '-000221-…' 6자리 확장 연도라 주장한 '-0221-05-01'은 어떤 직렬화로도 응답에 등장 불가. (4) 설령 잘린 '-0221-05-0'이 전송돼도 @IsDateString(update-tenure-achievement.dto.ts:27)이 400으로 거부해 무성 오염이 아님. 재현 시나리오의 시작 상태(BC ISO가 a.startDate로 도달)가 도달 불가능.
- **detailFull 쿼리 staleTime 0 — BioMention 모달 스택 push/pop 왕복마다 최대 페이로드 상세를 즉시 재페치(무효화는 이미 전면 배선됨)**
  - 반박: 발견의 전제인 "staleTime 미지정=전역 기본 0"이 사실과 다름. apps/web-admin/src/shared/queryClient.ts:10에서 전역 defaultOptions.queries.staleTime이 1000*60*3(3분)으로 설정돼 있고, 이 queryClient가 app.tsx:269의 QueryClientProvider에 배선된 유일한 클라이언트임. 따라서 detailFull 쿼리(person-detail-panel.tsx:438-442)는 3분 staleTime을 상속하며, BioMention 모달 스택 push→pop 왕복 시 3분 이내면 fresh 캐시를 그대로 사용해 재페치가 발생하지 않음(TanStack Query는 fresh 데이터의 mount refetch를 건너뜀). 재현 시나리오(A→B→C 후 '이전' 두 번 → B·A 통째 재요청) 불성립. 제안된 staleTime 30~60초는 현재 3분보다 짧아 오히려 재페치를 늘리는 역방향임.
- **업적 정렬 tie-break가 startDate 문자열 localeCompare — BC 날짜끼리 역순 정렬(같은 파일의 isoDateSortKey 미사용)**
  - 반박: L103 localeCompare 코드는 실재하나 재현 전제(BC startDate 보유 업적 2건)가 도달 불가. (1) 업적 startDate는 MySQL DATETIME(libs/db/prisma/government.prisma:520 TenureAchievement, :362 SovereignReignAchievement)이라 BC 저장 불가 — Event와 달리 BC 구조화 era/year 필드가 업적 모델에 없음. (2) 쓰기 경로 apps/api/src/libs/person/infrastructure/person.prisma.repository.ts:3301이 new Date(dto.startDate)인데 실측상 new Date('-0221-03-15')는 부호를 떼고 AD 221로 파싱되어 API로도 BC 주입 불가. (3) 프론트 입력은 input[type=date](tenure-achievements.tsx:82) YYYY-MM-DD 전용. (4) 증거의 '-0221-…' 문자열 형태도 실제 직렬화(toISOString은 '-000221' 6자리)와 불일치. 도달 가능한 AD 데이터에서는 zero-pad ISO의 localeCompare가 올바른 연대순을 내므로 실동작 결함 없음 — isoDateSortKey 통일은 위생 개선 제안일 뿐 버그 아님.

---

## 5. 구현 시 유의 (검증 단계 실측 함정)

- **DS1 수정 시**: flush 조건을 `hasDirtyInProgressEdit`(편집 중 row)에서 `lastPersistedRef` 기준 dirty 비교로 확장해야 실패 잔여분이 인물 전환·언마운트에서 재전송된다. 편집모드 유지만으로는 부족(사용자가 이미 닫았다고 인지).
- **CC1 수정 시**: 409 수신 시 자동 재시도 금지(그 자체가 clobber) — refetch+충돌 안내로. `expectedUpdatedAt`은 detail 응답의 updatedAt을 그대로 왕복.
- **BE2 수정 시**: `'k' in dto`를 `dto.k !== undefined`로 바꿔도 명시적 `null` 전송=초기화 시맨틱은 유지됨. 재발 방지로 DTO에 `declare` 필드 선언 또는 pickDefined 헬퍼 수렴 검토.
- **PF1(debounce) 수정 시**: 사건 InlineRichText처럼 debounceMs+flushRef 짝으로 전달해야 함 — debounce만 넣고 flush를 빠뜨리면 저장 시점 마지막 입력이 유실된다(DS 계열과 상호작용).
- **Esc 계열(RD3·AU1·AY9) 수정 시**: useModalBehavior의 Esc 규약과 라이트박스·편집취소의 우선순위를 한 번에 설계할 것 — 개별 stopPropagation 패치는 다른 조합을 다시 깨뜨린다.
- **embed(UX2) 수정 시**: embedInModal 규약을 prop drilling으로 5곳에 개별 배선하기보다 context 승격이 재발을 막는다(1차 리뷰 때 남긴 lone-label 가드와 같은 계열).

---

## 6. 검증 부록

- 파이프라인: 8렌즈 병렬(원시 61) → 중복 병합 51 → 적대 검증(반박 목표·file:line 재확인·재현 성립성·심각도 교정) 생존 48 → 완전성 비평 → 보강 3렌즈(원시 15) → 검증 생존 13 → **최종 61건**.
- 판정 분포: CONFIRMED 51 · PARTIAL 10 · REFUTED 3(§4). PARTIAL은 핵심 성립+정정 필요 — 정정 내용은 각 발견의 검증 항목에 병기.
- 특기: BE2는 dist 산출물+class-transformer로 **런타임 재현**까지 완료. CC1은 queryClient 설정(refetchOnWindowFocus:false·staleTime 3분)까지 추적해 "탭 포커스 refetch로 완화된다"는 반박 경로를 선제 차단.
- 연관 문서: `docs/person-biography-term-entity-review.md`(용어·엔티티 36건 — 본 검토서와 상호 배제), 1차 개요 리뷰는 문서 미작성(메모리 `person-detail-overview-review-batches`) — 그 잔여분은 §1의 K-추적으로 본 문서에 승계.
