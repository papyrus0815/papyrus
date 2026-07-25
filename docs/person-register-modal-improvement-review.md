# 인물 등록/수정 모달 개선 검토

> 대상: `apps/web-admin/src/shared/ui/person-register-modal/` (뷰·8개 섹션·draft 훅) + 차용 셸 `widgets/country/country-form/ui/country-form-shell.tsx` + 콜사이트(모달 래퍼·`pages/persons/person-edit.page.tsx`)

> 방법: 7개 렌즈(왕복무결성·검증·UX·접근성·디자인·코드품질·성능) 병렬 발굴 → **항목별 적대 검증**(실제 코드 대조, 의도된 설계 결정 스크리닝) → 중복 병합·근인·레버리지 배치. 63개 에이전트·약 3.36M 토큰.

> 결과: 발굴 54건 → **검증 통과 53건**(P1 0 · P2 9 · P3 44) + 완전성 비평 6건(별도 검증 필요). P1이 없는 것은 서버 가드(`@@unique`·`@Min/@Max` DateInfo)가 데이터 손상 경로를 막고 있어서이며, 검증 과정에서 초기 P2 후보 2건(중복 배우자·월일 무효값)이 “손상 아님”으로 P3 강등됨(§검증 노트).


## 요약

인물 등록/수정 모달은 기능적으로는 동작하나, '조용한 데이터 유실'을 만드는 두 축에서 P2가 몰려 있는 상태다. 첫째는 낙관적 동시성이 첫 충돌 후 무력화되는 409 경로(토큰만 갱신·폼 미재하이드레이션 → 무변경 재저장이 상대 세션 변경을 통째 덮어씀)이고, 둘째는 country-form용 셸을 그대로 빌려 써 useId·useModalBehavior 규약과 어긋난 데서 나오는 포커스·스크롤·Escape·⌘Enter 오작동(죽은 점프칩·타이핑 중 포커스 강탈·Esc로 폼 전체 닫힘)이다. 억지 P1은 없지만, 수정 하이드레이션이 formFields 레지스트리와 타입 시스템을 우회한 수동 any 미러라 DTO rename·else 누락·배열 통째 교체가 겹치면 유실이 컴파일 통과로 잠복한다. 가장 시급한 셋: (1) 409 재하이드레이션과 하이드레이션 타입 정합(배치1), (2) 차용 셸의 포커스/스크롤/Escape 규약 정합(배치2), (3) 서버 DTO와 비대칭인 클라 검증(월·일 범위·floruit 역전·중복 배우자) 대칭화(배치3). 나머지는 god 컴포넌트 분해·성능(배치4)과 접근성·시각 토큰·死코드 정리(배치5)로, 대부분 effort-S이며 공용 위젯 한 곳 수정이 다수 콜사이트에 파급된다.


## 근인(root cause)

개별 결함을 관통하는 구조적 원인. 배치는 이 근인 해소 순으로 정렬했다.


**RC1. 409 충돌 후 폼 재하이드레이션 부재 — 낙관동시성 무력화**  
수정 저장 409 catch가 loadedUpdatedAtRef(expectedUpdatedAt)만 서버 최신값으로 자동 갱신하고 폼 값은 사용자의 옛 입력 그대로 둔다. 재저장 시 토큰이 일치해 통과하므로 충돌 보호가 1회성 speed bump로 전락하고 상대 세션 변경이 조용히 사라진다. '최신 확인'이 강제되지 않는 게 근인.


**RC2. 수정 하이드레이션이 formFields 레지스트리·타입 시스템을 우회한 수동 any 미러**  
편집 로드가 getPersonDetailById의 any 응답을 30여 (p as any).x로 필드별 수동 setState하며, formFields 레지스트리(snapshot/reset/restore만 파생)와 buildPayload를 경유하지 않는다. 컴파일러가 세 목록의 정합을 검증하지 못해, DTO rename·조건 else 누락·create 전용 deps 공유가 겹치면 빈 값 로드→delete-recreate·배열 통째 교체로 서버 값이 영구 삭제된다.


**RC3. 클라이언트 검증이 서버 DTO와 비대칭 — 연도만·AD만·범위/역전/중복 미검**  
배우자 혼인일에는 있는 월·일 범위·역전·era 가드가 본인 생몰·floruit·소속 날짜에는 없고, 오류 키가 타입 없는 Record<string,string>이라 오타가 침묵한다. 서버 가드가 데이터 손상은 막지만, 클라 선검증 부재로 정체불명 400·데드엔드·비대칭 마찰(BC 소속 사후 폐기)이 반복된다.


**RC4. ~60 useState god 컴포넌트 미분해 — memo·prop 그룹핑·순수함수 추출 부재**  
단일 거대 컴포넌트가 섹션 React.memo 없이 키 입력마다 6개 서브트리를 재렌더하고, LifeSection ~50 prop을 두 호출부에 중복 드릴하며, formFields 배열·usePersonDraft 반환·markDirty가 매 렌더 재구성된다. 핵심 검증 로직(향년·역전·dedup)이 컴포넌트 바디 클로저라 jest 사각이고, 단일 빌더를 create/update 두 계약에 억지 재사용해 null 조정이 3곳에 분산된다.


**RC5. 차용된 CountryFormShell이 인물 폼 규약(useId·useModalBehavior)과 어긋남**  
country-form용 셸을 그대로 재사용해 점프칩 셀렉터가 useId 접두 id와 불일치(죽은 버튼), 첫 포커스가 display:none 파일 input에 걸리고, Escape는 raw window 리스너라 자식 드롭다운 Esc가 폼 전체를 닫으며, 상시 aria-invalid MutationObserver가 타이핑 중 포커스를 강탈하고, 트리거 포커스 복원·reduced-motion·⌘Enter 자식 모달 가드가 없다. 공용 useModalBehavior 미채택이 뿌리.


**RC6. 공용 primitive·디자인 토큰·ARIA 규약 미채택 → 시각 drift·死코드·SR 배선 누락**  
SegmentControl radiogroup 키보드 패턴·오류 aria 연결·비활성 라벨·칩 라이브 리전 등 SR 배선이 빠지고, AddBtn·3벌 커스텀 select·FloruitYearInput·드롭다운 표면이 공용 토큰 없이 bespoke 재구현돼 높이·radius·폰트가 표류하며, 사망유형 상수·surname 메시지·ghost prop 등 死코드가 이중 정의 회귀를 부른다. 공용 canon(primitive/토큰/ARIA) 미경유가 공통 원인.


## 배치(레버리지順)

심각도 × 도달범위 ÷ 비용. 배치1(무성 데이터 유실)이 최우선, 이후 셸 규약 → 검증 → 구조/성능 → 접근성·시각. 각 항목: `심각도·effort·렌즈`.


### 배치1 — 무성 데이터 유실 차단(동시성·하이드레이션 정합)

_이 모달에서 유일한 P2급 '조용한 데이터 유실' 경로들이 여기 모여 있다. 근인 RC1(409 후 재하이드레이션 부재)·RC2(수정 하이드레이션이 레지스트리·타입을 우회한 수동 미러)를 먼저 해소해야, 이후 배치의 검증·성능 개선이 유실 위에 쌓이지 않는다. 팀 P1 최대 원천인 '저장 성공 낙관+통째 교체'의 재발 지점이라 최우선._


**1.1 [P2·M·round-trip] 409 충돌 후 토큰만 갱신·폼 미재하이드레이션 → 재저장이 상대 세션 변경을 무성 덮어씀**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1841`

- 시나리오: A·B 두 세션이 같은 인물 수정. B 먼저 저장. A 저장 시 409 → catch가 getPersonDetailById로 loadedUpdatedAtRef(expectedUpdatedAt)만 서버 최신값으로 갱신하고 폼 값은 A의 옛 입력 그대로. A가 아무것도 안 고치고 재저장하면 이제 토큰이 최신과 일치해 200 통과 → B의 변경이 통째 덮어써짐. 낙관동시성이 첫 충돌 후 1회성 speed bump로 무력화.

- 수정: 409 catch에서 loadedUpdatedAtRef만 갱신하지 말 것. (a) fresh 데이터로 폼을 재하이드레이션(setResetCounter 유사 트리거로 로드 effect 재실행, 토큰도 그 경로에서 동기 갱신)해 실제 최신 확인·병합 가능하게 하거나, (b) 최소한 토큰 자동 갱신을 제거해 재저장이 다시 409를 내도록 유지하고 명시적 '최신 불러오기' 액션 전까지 저장 차단.


**1.2 [P3·S·round-trip] 출생지/사망지 하이드레이션에 else 부재 — 페이지 모드 편집→편집 이동 시 이전 인물 장소 잔류→오염 저장**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:828`

- 시나리오: 페이지 모드에서 인물 A(출생지 있음) 편집 후 링크로 B(출생지 없음) 편집 이동 시 라우트 동일→언마운트 없이 editPersonId만 변경. birthCityId는 무조건 ''로 초기화되나 birthPlace/deathPlace는 조건 블록에 else가 없어 B에 장소가 없으면 set 미호출→화면엔 A의 장소 잔류·birthCityId는 '' 불일치. 저장 시 A 기준 출생지가 B에 기록.

- 수정: birth/death 하이드레이션 조건 체인 끝에 명시적 else를 추가해 응답에 장소 정보가 전무하면 setBirthPlace(null)/setDeathPlace(null)로 birthCityId처럼 무조건 초기화. 근본적으로는 edit 브랜치도 하이드레이션 진입 전 formFieldsRef reset을 1회 수행해 유사 잔류 일괄 방지.


**1.3 [P3·S·round-trip] 같은 배우자를 두 행에 수동 입력하면 두 번째 행이 경고 없이 폐기(중복 검증 부재)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1588`

- 시나리오: 수정 모드에서 배우자 Y와 두 번(재결합·서열 변경) 혼인한 이력을 서로 다른 혼인일/서열/메모로 두 행 입력·저장. buildSpouseRelations가 spouseId 기준 dedup(seen.has)이라 첫 행만 남고 두 번째의 날짜·서열·메모 미전송. 수정 모드는 배열 통째 교체(deleteMany→createMany)라 영구 유실. validate()는 중복 배우자 행을 검사하지 않아 경고·차단조차 없음.

- 수정: dedup 자체는 @@unique([personId, spouseId]) 미러링이라 유지(제거 시 createMany 500). validate()에 중복 spouseId 검사(seen Set)를 추가해 같은 배우자가 여러 행이면 e._form로 제출 차단하고 '한 배우자당 한 행만, 서열/날짜는 한 행에서 갱신'을 안내해 조용한 폐기 제거.


**1.4 [P3·M·code-quality] 수정 하이드레이션이 any 체인이라 DTO rename 시 타입검사 없이 침묵 유실**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:757`

- 시나리오: getPersonDetailById(...).then((p:any)) 이후 deathType·illegitimate·countryAffiliations·nicknames 등을 전부 (p as any).x로 읽음. 서버 DTO 필드명이 하나 바뀌면 undefined→''로 조용히 하이드레이트→무관 필드만 고쳐 저장 시 update가 nicknames/countryAffiliations를 delete-recreate·통째 교체해 로드 안 된 값이 서버에서 영구 삭제. 컴파일도 통과.

- 수정: getPersonDetailById의 as any 리턴을 PersonDetailResponseDto로 타입화하고, 뷰의 30여 (p as any)를 순수 매퍼 hydratePersonForm(dto):PersonFormState로 추출. any 제거로 필드 rename이 컴파일 에러가 되게 하고 매퍼를 단위테스트로 회귀 고정. 래퍼를 함께 고치지 않으면 무효인 점 유의.


**1.5 [P3·M·perf-state] 편집 로드 effect가 create 전용 initialCountryId를 deps에 공유 — 이론상 재fetch로 미저장 편집 소실**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1005`

- 시나리오: 수정 모드에서 부모가 initialCountryId를 다른 값으로 흘리면 deps=[editPersonId, initialCountryId, resetCounter] effect가 재실행→setEditLoadStatus('loading')+getPersonDetailById 재호출로 폼 전 필드를 서버값으로 덮어써 수정 중 미저장 입력 소실. 편집 로드 분기는 initialCountryId를 읽지 않으므로 불필요한 의존(현재 콜사이트 미전달로 미도달이나 잠복).

- 수정: create 분기가 읽는 initialCountryId를 ref로 옮기고 이 로드 effect deps를 [editPersonId, resetCounter]로 축소. create 반영은 별도 effect(610-616)가 담당하므로 기능 손실 없음.


**1.6 [P3·L·code-quality] 폼 필드 레지스트리가 snapshot/reset/restore만 파생 — 하이드레이션·buildPayload는 컴파일러 미검증 별도 수동 목록(drift)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:628`

- 시나리오: formFields 레지스트리는 draft snapshot·reset·restore 3경로 drift는 막지만, 수정 로드 하이드레이션과 buildPayload는 레지스트리를 우회해 필드별 수동 setState/직렬화. 새 필드를 레지스트리에만 추가하면 draft 왕복은 되나 수정 로드엔 안 실려 편집 진입 시 빈 값 로드→저장 시 서버값 덮어씀. 컴파일러가 세 목록 정합을 미검증.

- 수정: FormFieldDesc에 hydrate(dto)·toPayload(input) 콜백을 추가해 get/reset/restore/hydrate/payload 5경로를 단일 디스크립터에서 파생하거나, 최소 formFields를 Record<keyof PersonDraftSnapshot,FormFieldDesc>로 선언해 키 누락을 컴파일 에러화(satisfies exhaustive 체크).


### 배치2 — 차용 CountryFormShell 규약 정합(포커스·스크롤·Escape·점프)

_RC5: 인물 폼이 country-form용 셸을 그대로 빌려 써 useId·useModalBehavior 규약과 어긋난다. 셸 하나에 P2가 넷(점프칩 죽은버튼·타이핑 중 포커스강탈·Escape 폼닫힘·⌘Enter 조기제출) 몰려 있고 셸은 다수 콜사이트 공용이라 수정 파급이 크다. 데이터 유실 다음으로 레버리지 높음._


**2.1 [P2·S·a11y] 푸터 진척칩 '미완성 필수로 이동'이 useId 접두 id와 셀렉터 불일치 → 세 필수 필드 모두 무동작(죽은 어포던스)**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:741`

- 시나리오: 필수(이름·성별·국적) 미충족 시 진척칩이 aria-label='미완성 필수 항목으로 이동' 버튼으로 렌더돼 SR이 실행버튼으로 안내. handleRequiredJump가 root.querySelector('[name=name],[data-jump-target=name],#name…')를 찾지만 실제 입력 id는 useId 접두 `${uid}-name`이고 name 속성 없음→세 필드 매칭 실패→클릭/키보드로도 스크롤·포커스 전무. 약속된 동작이 조용히 실패.

- 수정: 이름/성별/국적 컨트롤 래퍼에 data-jump-target="name"|"gender"|"countryId"를 부여해 셀렉터와 일치(성별은 data-field-error 래퍼 2267, 국적은 SelectBtn 2300, 이름은 FormInput 래퍼). 대안으로 jumpTarget을 섹션 앵커('basic')로 바꿔 섹션 스크롤만이라도 동작. data-jump-target 방식이 useId 결합도 낮춰 권장.


**2.2 [P2·S·ux-flow] 배우자 혼인일 달력 열린 채 ⌘Enter 시 폼 조기 제출(spouseDateModal이 anyModalOpen 가드 미포함)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1355`

- 시나리오: 가족 탭 배우자 혼인일 달력(FamilySection 로컬 spouseDateModal)을 열고 ⌘Enter. 부모 핸들러의 anyModalOpen엔 showCountryModal·affDateModalOpen은 포함하나 배우자 날짜 상태는 자식 로컬이라 미보고→document keydown 그대로 발화해 달력 뜬 채 제출. 국가 소속 날짜는 onDateModalOpenChange로 가드되는데 배우자만 누락돼 일관성도 깨짐.

- 수정: country-affiliations의 onDateModalOpenChange 패턴을 FamilySection에도 적용: spouseDateModal!==null을 부모에 보고하는 콜백(언마운트 cleanup으로 false 복원) 추가 후 부모 anyModalOpen에 OR로 합침. 인물 피커 showSpouseModal은 이미 가드되므로 날짜 달력 상태만 추가.


**2.3 [P2·S·a11y] 모달 닫힘 시 트리거 요소로 포커스 복원 누락(표준 useModalBehavior 미채택)**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:648`

- 시나리오: 키보드 사용자가 '인물 등록' 버튼에서 Enter로 열고 Esc/취소로 닫으면 포커스가 원 버튼으로 안 돌아가고 document.body로 낙하→다음 Tab이 페이지 최상단부터 시작, SR 사용자는 문맥 상실.

- 수정: 셸에 previouslyFocusedRef 추가. 첫 포커스 effect에서 이동 전 activeElement 저장, cleanup/닫힘 전이에서 previouslyFocusedRef.current?.focus({preventScroll:true}) 복원(AnimatePresence exit 지연 고려). 근본적으로 bespoke 트랩/포커스를 공용 useModalBehavior로 대체하면 저장/복원 일괄 처리.


**2.4 [P2·M·perf-state] 상시 aria-invalid MutationObserver가 오류 필드 타이핑 중 다음 오류로 포커스·스크롤 강탈(뷰 rAF 스크롤과 경합)**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:668`

- 시나리오: 제출 실패로 name·countryId가 aria-invalid=true인 상태에서 이름 입력 한 글자→clearFieldError로 name aria-invalid true→false 변이→FormScroll의 MutationObserver 발화→아직 오류인 국적 SelectBtn으로 scrollIntoView+200ms 뒤 focus 강탈, 입력 중단. 또 성별(data-field-error only)이 첫 오류면 뷰 rAF 스크롤과 셸 옵저버가 서로 다른 필드로 두 smooth 애니메이션 경합.

- 수정: 오류-스크롤 소유권을 한 곳으로 통일. 콜백에 activeElement가 root 내부 입력이거나 firstError===activeElement면 스킵하는 가드 추가하고, 상시 관찰을 폐기해 뷰 handleSubmit의 제출 실패 rAF 스크롤(data-field-error 포함, SegmentControl 커버)로 단일화하거나 submitAttempt 카운터로 제출 순간 1회만 반응하도록 한정. 셸 200ms setTimeout focus 중복 제거.


**2.5 [P2·M·a11y] 셸 Escape가 raw window 리스너라 인라인 콤보/자식 모달 Esc가 폼 전체 닫힘·원치 않는 confirm 유발(topmost 가드 부재)**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:619`

- 시나리오: 가문/종교 인라인 콤보 드롭다운을 Esc로 닫으려 하면 드롭다운 닫힘과 동시에 셸 window 리스너가 requestClose 호출→비dirty면 모달 전체 닫혀 입력 소실, dirty면 예상치 못한 '정말 닫으시겠습니까' confirm. 날짜/국가 피커 열림 상태 Esc도 자식 모달과 셸 requestClose 동시 발화로 이중 닫힘.

- 수정: 셸 onKey Escape 분기에 ⌘Enter의 anyModalOpen과 동형의 최상위-레이어 가드를 추가해 자식 모달/드롭다운 열림 시 Escape 무시. 병행으로 InlineSearchSelect Escape 핸들러(95-101)에서 stopPropagation, keydown 없는 country-select-modal에도 stopPropagation Esc 부여. date-picker의 capture+stopPropagation 패턴을 표준화.


**2.6 [P3·S·ux-flow] 모달 첫 포커스가 display:none 파일 input에 걸려 no-op — 오픈 시 첫 필드 미포커스**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:654`

- 시나리오: 오픈 시 root.querySelector('input:not([type=hidden]):not([disabled])')로 첫 입력 포커스하나, DOM 순서상 첫 input이 썸네일 업로드용 type=file(display:none)이라 매칭→focus() no-op→body 포커스로 열림. 키보드 사용자는 Tab 여러 번 눌러야 이름 도달.

- 수정: 셀렉터를 'input:not([type=hidden]):not([type=file]):not([disabled])'로 좁히고 offsetParent!==null 가시성 필터 추가로 display:none 스킵. 대안으로 이름 input에 autoFocus.


**2.7 [P3·S·perf-state] scroll-spy 핸들러가 rAF/passive 없이 매 scroll마다 강제 reflow 반복**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:720`

- 시나리오: 긴 폼 스크롤 시 매 scroll(프레임당 수 회) updateActive가 sectionIndex 4개 각각 querySelector+getBoundingClientRect+root.getBoundingClientRect 수행. rAF/스로틀 부재로 강제 레이아웃 반복→저사양/모바일 버벅임.

- 수정: updateActive를 rAF로 프레임당 1회 코얼레싱, {passive:true} 등록. 섹션 엘리먼트는 effect 진입 시 querySelectorAll로 캐시해 콜백 내 DOM 조회 제거. N=4라 우선순위 낮음.


**2.8 [P3·M·a11y] smooth scrollIntoView·framer-motion에 prefers-reduced-motion 미대응**  

- 위치: `…/widgets/country/country-form/ui/country-form-shell.tsx:673`

- 시나리오: OS '동작 줄이기' 사용자가 섹션 인덱스 클릭·검증 오류 자동 스크롤 시 큰 화면 이동 애니메이션이 그대로 재생돼 전정 장애 어지럼증 유발.

- 수정: matchMedia('(prefers-reduced-motion:reduce)')로 scrollIntoView behavior를 'auto'로 강등하고, framer-motion useReducedMotion으로 Overlay/ModalBox·스피너 애니메이션 비활성. data-anchor-pulse는 대응 CSS가 레포에 없어 실제 애니메이션 아니므로 제외.


### 배치3 — 검증 대칭화·오류 착지·놀람 제거

_RC3: 클라 검증이 서버 DTO와 비대칭(연도만·AD만·범위/역전/중복 미검)이라 정체불명 400·조용한 저장·데드엔드가 발생한다. 대부분 effort-S로 서버 가드를 미러링하는 방어이며, 오류 피드백 시점 통일·깜짝 모달 제거로 폼 흐름 신뢰를 회복한다._


**3.1 [P3·S·validation] 출생/사망 월·일 클라 범위검증 누락 — 무효값이 서버 400 왕복 후 정체불명 오류**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1441`

- 시나리오: 생몰 인라인에 월 '13'·일 '45' 타이핑→제출 검증 통과→서버 전송. 거부되면 '등록 실패' 정체불명 오류(어느 필드인지 모름), 관대하면 깨진 날짜 저장. 배우자 혼인일 partialPartsToDateInfo는 month 1~12·day 1~31을 검증하는데 본인 생몰엔 같은 가드 없음(비대칭).

- 수정: computeBirthDeathErrors에 월(1~12)·일(1~31) 범위 검사 추가해 제출 전 인라인 오류로 안내. 서버 DateInfoDto가 @Min/@Max로 이미 거부해 데이터 손상은 없으나 클라 선검증으로 대칭화(buildPayload에서 undefined 절사 대신 명시 에러 경로).


**3.2 [P3·S·validation] 활동시기(floruit) 시작>종료 역전 가드 부재 — 역순 연대가 조용히 저장·표시**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1717`

- 시나리오: 활동시기에 시작 '1500'·종료 '1400'(역순)을 넣어도 경고 없이 저장돼 상세·타임라인에 뒤집힌 범위 표시. 배우자 혼인일엔 isPartialRangeInverted 역전 가드가 있는데 floruit엔 대칭 가드 없음.

- 수정: validate()에 floruit 검사 추가: 두 값 존재 시 era(floruitEra) 반영 역전 판정(AD는 start<=end, BC는 start>=end 위반 시 오류; 단순 start>end는 BC 오탐이라 금지). 오류를 활동시기 필드에 인라인+aria-invalid로 표시해 첫-오류 스크롤 착지. 상한 @Max 부재는 실제 데이터 상한 근거로 별도 결정.


**3.3 [P3·S·ux-flow] 소속 날짜 BC 사후 차단 — 달력이 BC 선택 허용해놓고 고른 뒤 폐기(생몰일과 비대칭)**  

- 위치: `…/shared/ui/person-register-modal/sections/country-affiliations-section.tsx:167`

- 시나리오: BC 생몰을 InlineDateField로 정상 입력한 로마 인물의 '복무/망명' 소속 기간을 BC로 넣으려 달력에서 기원전 날짜를 고르면 선택 완료 순간에야 '기원전 날짜는 아직 저장 불가'로 차단. 고대·BC 인물을 겨냥한 앱에서 생몰은 BC 되고 소속은 안 되는 비대칭.

- 수정: DatePickerModalProps에 allowBC(기본 true) 추가해 EraSelector를 숨김/비활성, 소속 날짜 호출부(319-331)에서 allowBC={false} 전달로 사전 차단하고 트리거/힌트에 'AD만 지원' 배지 노출. 근본은 서버 @IsDateString 완화+구조화 BC 저장이나 현 스코프는 사후 폐기를 사전 안내로 대체.


**3.4 [P3·S·code-quality] 에러 키가 타입 없는 Record<string,string> — 오타 시 침묵 무동작**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1565`

- 시나리오: errors가 Record<string,string>이고 setOrClearError·clearFieldError가 임의 문자열 키 수용. clearFieldError('conutryId') 오타가 타입 에러 없이 통과→실제 'countryId' 오류가 안 지워져 국적을 채워도 빨간 오류 잔존.

- 수정: type PersonErrorKey='name'|'gender'|'countryId'|'birth'|'death'|'_form' 정의 후 errors를 Partial<Record<PersonErrorKey,string>>로, 관련 인자를 PersonErrorKey로 좁힘. 현 콜사이트는 이미 올바른 리터럴이라 동작 변화 없이 오타를 컴파일 타임 차단.


**3.5 [P3·S·ux-flow] 신규 등록 기본 '사망' pre-selected + 출생일 선택 시 사망일 달력 자동 오픈(사망 의사표시 전 놀람)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1252`

- 시나리오: 신규 기본값 isAlive=false·isDeathDateUnknown=false라 3-way의 '사망'이 처음부터 선택. 생존/사망 명시 전 출생일을 고르면 handleBirthDateSelect가 조건 충족해 200ms 뒤 사망일 달력 자동 오픈→생존/미결정 인물 등록하려던 사용자에게 '사망일 골라라' 모달이 갑자기 떠 흐름 끊김.

- 수정: handleBirthDateSelect의 자동 오픈을 제거하고 자동 오픈을 사용자가 명시적으로 '사망' 선택한 setDeathStatus('deceased') 경로로만 한정. 또는 기본 사망 여부를 pre-selected 아닌 '미결정'으로 두어 첫 진입에서 '사망'이 active로 읽히지 않게 함.


**3.6 [P3·S·code-quality] 사망일 자동오픈 setTimeout 2곳 가드 중복 — '한 곳에만' 주석과 불일치(회귀 위험)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1200`

- 시나리오: setDeathStatus('deceased')(1200-1202)와 handleBirthDateSelect(1252-1254)가 동일 조건으로 같은 사망일 모달을 자동 오픈. 1199행 주석은 '자동 오픈은 한 곳에만'이라 단언하나 실제 두 곳→한쪽 조건만 고치면 다른 경로로 여전히 깜짝 모달.

- 수정: 두 setTimeout을 단일 헬퍼 maybeAutoOpenDeathPicker()로 추출하고 공통 가드(!isEditMode&&!isAlive&&!isDeathDateUnknown&&!deathYear.trim())를 한 곳에 두어 두 경로가 이를 호출. 1199행 주석을 실제 단일 출처와 일치.


**3.7 [P3·M·validation] 인라인 생몰일 타이핑이 birth/death 오류를 재검증·클리어 안 해 잔존 오류 + 모달과 피드백 시점 불일치**  

- 위치: `…/shared/ui/person-register-modal/sections/life-section.tsx:201`

- 시나리오: '사망일은 출생일 이후' 오류가 뜬 상태에서 사망 연도를 인라인으로 올바르게 고쳐도 FieldError·빨간 테두리가 그대로 남아 오인. 반대로 인라인으로 역전 날짜를 만들면 제출 전까지 무경고라 모달 경로와 피드백 시점 불일치.

- 수정: InlineDateField onYear/onMonth/onDay/onEra 콜백이 부모 재검증을 트리거하도록 배선. 뷰에서 set 후 computeBirthDeathErrors 재실행+setOrClearError('birth'/'death')하는 래퍼 핸들러(handleBirthDateSelect 검증 블록과 동일)를 LifeSection에 하달. 최소한 각 onYear에서 clearFieldError만이라도 호출.


**3.8 [P3·M·validation] 배우자 미선택 orphan 혼인 메타: 제출 차단되나 aria-invalid/스크롤 미착지 + showMeta=false로 입력값 은닉(데드엔드)**  

- 위치: `…/shared/ui/person-register-modal/sections/family-section.tsx:388`

- 시나리오: 배우자를 고르고 혼인 시작일 입력 후 배우자 선택을 지우면 혼인일은 state에 남지만 showMeta=false로 화면에서 사라짐. 제출 시 TopAlert 경고는 뜨나 폼 스크롤·문제 행 노출이 없어 무엇을 고칠지 못 찾는 데드엔드.

- 수정: (a) showMeta 조건에 rowHasMeta(row)를 OR로 추가해 배우자가 비어도 입력된 혼인 메타를 계속 노출(은닉 방지). (b) validate()에서 orphan 감지 시 해당 배우자 InlineSearchSelect에 aria-invalid/data-field-error 부여해 handleSubmit·셸 MutationObserver 첫-오류 스크롤이 착지(국가 소속 케이스 1535와 동일 규약).


### 배치4 — god 컴포넌트 분해·성능

_RC4: ~60 useState god 컴포넌트가 memo·prop 그룹핑·순수함수 추출 없이 커져 키 입력마다 6개 섹션 재렌더(P2)·GC 압박·테스트 사각·빌더 과부하를 낳는다. 구조 개선이 이후 유지보수 비용과 회귀를 동시에 줄인다. React.memo(P2)가 즉효라 먼저._


**4.1 [P2·M·perf-state] 섹션 컴포넌트 React.memo 부재 — 키 입력마다 6개 섹션 서브트리 전체 재렌더**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:2333`

- 시나리오: 이름 입력 한 글자마다 god 컴포넌트(~60 useState) 재렌더→LifeSection(essentials·details 2회)·FamilySection(943줄)·CountryAffiliationsSection·NicknameSection·PlaceFields·AffiliationSection이 memo 부재로 전부 재렌더. 대부분 prop(setter·markDirty·errors)은 참조 안정이라 memo만 있으면 되는데 없어 긴 폼 타이핑 지연 누적.

- 수정: 위 섹션들을 React.memo로 감싸기(대부분 prop이 이미 안정이라 즉효). 남은 불안정 콜백만 useCallback 고정(예: onPickCountry 2487, PlaceFields onCopyBirthToDeathPlace 등).


**4.2 [P3·S·code-quality] buildPayload의 profileImageUrl 이중 캐스트 불필요(대상 타입이 이미 string|null)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1633`

- 시나리오: profileImageField===null일 때 null as unknown as … 이중 캐스트하나 RelaxedPersonInputFields가 이미 profileImageUrl?:string|null이라 null 직접 대입이 합법. 이중 캐스트는 과거 엄격 타입 잔재로, 향후 타입이 좁아져도(string only) 캐스트가 오류를 숨겨 잘못된 null 전송.

- 수정: 이중 캐스트 제거 후 profileImageUrl: profileImageField===null ? null : (profileImageField||null)로 단순화. CreatePersonInput['profileImageUrl']이 이미 string|null|undefined라 캐스트 불필요.


**4.3 [P3·S·perf-state] form onChange·onInput 이중 바인딩으로 키 입력마다 markDirty 중복 발화**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:2004`

- 시나리오: React onChange가 이미 input 이벤트에서 발화하므로 <form onChange onInput={markDirty}>는 한 글자마다 markDirty 2회+자식 컨트롤 자체 onChange까지. ref 가드+bailout으로 멱등이라 기능 오류는 없으나 불필요한 콜백 캐스케이드.

- 수정: form에서 onInput 제거하고 onChange={markDirty}만 유지. 동작 동일하고 키 입력당 호출 절반.


**4.4 [P3·S·perf-state] usePersonDraft 반환 객체가 매 렌더 새 리터럴이라 scheduleSave effect가 매 렌더 재실행**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1039`

- 시나리오: usePersonDraft가 매 렌더 새 객체 반환→useEffect(...,[isDirty,draft])의 draft dep이 렌더마다 바뀌어 dirty 타이핑 중 매 렌더 effect 재실행+500ms 디바운스 타이머 계속 리셋(effect churn).

- 수정: 반환값을 useMemo로 identity 안정화하거나, effect deps를 [isDirty]로 줄이고 draft.scheduleSave는 ref로 접근. 기능 변화 없이 churn 제거.


**4.5 [P3·M·code-quality] LifeSection ~50 props를 essentials·details 두 호출부에 전량 중복 드릴 — 필드 추가 시 4곳 동기화·mode 비대칭 잠재**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:2333`

- 시나리오: <LifeSection mode=essentials>와 <LifeSection mode=details>가 birth/death/floruit/monarch ~50 prop을 문자 그대로 두 번 나열. 새 생애 필드 추가 시 인터페이스+두 호출부 3곳 수동 동기화, 한 곳 누락 시 그 mode에서만 값/setter 미전달로 essentials엔 편집되는데 details엔 안 되는 비대칭 결함이 조용히 발생.

- 수정: birth·death·floruit·monarch·meta 도메인 그룹 객체로 묶어 부모 useMemo 단일 참조를 두 호출부가 공유하거나 LifeEssentials/LifeDetails로 분리해 각자 필요한 그룹만 수신. 동기화 지점을 1곳으로 축소.


**4.6 [P3·M·code-quality] 배우자 하이드레이션 매퍼·buildSpouseRelations·computeBirthDeathErrors가 컴포넌트 내부 인라인 — 단위검증 사각**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1416`

- 시나리오: computeBirthDeathErrors(순수 로직)·buildSpouseRelations·배우자 응답→SpouseFormRow 매퍼가 컴포넌트 바디 클로저라 BC 향년/역전·다중 배우자 정렬·dedup을 jest로 직접 검증 불가. 팀 F-시리즈(순수함수 추출 후 회귀 테스트) 관례와 어긋나 리팩터 시 렌더 테스트로만 잡아야 함.

- 수정: computeBirthDeathErrors를 helpers.ts로 이동해 spec 추가, 878-924 배우자 매퍼는 mapSpouseRelationsFromDetail(detail)로, buildSpouseRelations는 (rows,isEditMode)=>SpouseRelationInput[] 순수 함수로 추출. 정렬·정밀도·서열 규칙은 이미 shared/lib에 있으므로 dedup/빈행필터/edit분기 글루만 추가 검증.


**4.7 [P3·M·code-quality] 단일 CreatePersonInput 빌더를 create/update 두 계약에 억지 재사용 — null 조정이 3곳 분산**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1608`

- 시나리오: buildPayload 반환이 CreatePersonInput인데 수정 경로(1779-1799)에서 countryId:null·expectedUpdatedAt 등 Update 전용 키를 덧씌우고, create 경로는 profileImageUrl null→undefined를 되돌리는 createPayload를 별도 조립. 하나의 Create 형상을 두 계약에 맞추느라 null 이중캐스트·재조립·오버라이드가 흩어져 어느 경로가 어떤 키를 보내는지 추적 난망.

- 수정: buildBasePayload(공통 필드)+buildCreatePayload():CreatePersonInput(null→undefined 흡수)+buildUpdatePayload():UpdatePersonInput(FK/date 명시 null 해제+expectedUpdatedAt)로 분기. 각 빌더가 반환 타입을 명시하면 이중캐스트·재조립·스프레드 오버라이드가 내부로 응집되고 키 전송이 타입으로 강제.


**4.8 [P3·M·perf-state] formFields 배열(48 makeFormField, ~192 객체/클로저)을 매 렌더 재구성+formFieldsRef 재할당**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:628`

- 시나리오: 키 입력마다 god 재렌더로 formFields가 48 makeFormField(각 get/reset/restore 3 클로저)로 재구성+formFieldsRef.current 재할당→한 글자마다 ~150 함수 객체 할당 GC 압박.

- 수정: 키·setter·default 디스크립터 배열을 useMemo/외부 상수로 고정하고, get은 setter 맵+buildDraftSnapshot 호출부에서 최신 상태 조회로 분리해 렌더 경로 클로저 재생성·재할당 제거.


**4.9 [P3·L·perf-state] 가족 인물 선택이 getAllPersons 전량 로드+클라 전량 필터 — 인물 수 증가 시 확장성 열화**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:579`

- 시나리오: 모달 진입 idle에 getAllPersons()가 페이지네이션 없이 인물 전체 수신→persons 상태에 상주, 가족 인라인 검색은 knownPersons 전량 클라 필터. 역사 백과 특성상 인물이 수천~수만이면 진입 대용량 응답+메모리 상주+키 입력마다 전체 배열 필터로 지연 확대.

- 수정: 인물 후보를 서버 typeahead(query 검색)로 전환하거나 단기로 loadPersons에 최근순 limit 캡+knownPersons useMemo 인덱스+결과 수 캡. PersonSelectModal의 '+새 인물' 경로만 남기고 인라인 콤보 후보는 서버 검색으로 대체가 근본책.


### 배치5 — 접근성 배선 + 시각 토큰·死코드 정리

_RC6: 공용 primitive·디자인 토큰·ARIA 규약 미채택으로 SR 배선 누락·시각 drift·死코드가 흩어져 있다. 개별 severity는 P3이나 대부분 effort-S이고 공용 위젯(SegmentControl·_form-primitives) 한 곳 수정이 다수 콜사이트에 파급돼 함께 처리하면 canon 회귀를 원천 봉쇄한다._


**5.1 [P3·S·a11y] 생애 탭 출생/사망 오류가 연도 입력과 프로그램적 미연결(FieldError id 없음·ariaDescribedBy 미전달)**  

- 위치: `…/shared/ui/person-register-modal/sections/life-section.tsx:251`

- 시나리오: '사망일은 출생일 이후' 오류 후 SR 사용자가 사망 연도 input으로 포커스를 옮겨도 aria-describedby 미연결로 오류 낭독 안 됨. role=alert는 최초 1회만 읽혀 이후 오류 인지 방법 소실.

- 수정: 출생/사망 FieldError에 id 부여(fid('birth-err')/'death-err')하고 해당 InlineDateField에 ariaDescribedBy={errors.birth?fid('birth-err'):undefined} 전달. family-section dateErrorId 패턴 복제(InlineDateField는 이미 prop 지원).


**5.2 [P3·S·a11y] 성별 SegmentControl에 aria-invalid·aria-describedby 미배선 — SR이 무효/오류 인지 불가(국적 컨트롤과 비대칭)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:2271`

- 시나리오: 성별 미선택 제출 시 스크롤은 래퍼로 가나 라디오에 aria-invalid 없어 SR이 '유효하지 않음' 미알림, 오류 메시지도 aria-describedby 미연결. role=alert 최초 1회라 재방문 시 오류 미노출.

- 수정: SegmentControlProps에 ariaInvalid·ariaDescribedby 추가 후 radiogroup Wrap에 부여. 호출부에서 ariaInvalid={!!errors.gender}, ariaDescribedby={errors.gender?fid('gender-err'):undefined} 전달(인접 국적 SelectBtn과 동일 패턴).


**5.3 [P3·S·a11y] 비활성 날짜 필드 aria-label이 role 없는 div에서 무효화(죽은 코드)**  

- 위치: `…/shared/ui/person-register-modal/sections/inline-date-field.tsx:55`

- 시나리오: '출생일 미상' 토글 시 날짜 입력이 <div>미상</div>으로 바뀌어 포커스 대상 아님. aria-label '출생일'도 role 부재로 미낭독→미상 처리 상태 직접 인지 어려움(토글 aria-pressed로만 간접).

- 수정: DisabledBox에 role="note"/"group"을 부여해 aria-label이 계산되게 하거나, 무효 aria-label 제거하고 disabledLabel 텍스트에 필드명 포함('출생일 미상')해 자체완결 라벨화.


**5.4 [P3·S·a11y] 로드 실패 전환 시 NotFoundPanel/'목록으로' 버튼으로 포커스 이동 없음 — 포커스가 hidden 폼(→body) 방치**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:1985`

- 시나리오: 수정 진입 후 detail API 실패(삭제/권한없음) 시 role=alert는 1회 낭독되나 직전 포커스가 hidden 폼 입력/body라 키보드 포커스 화면에서 소실. Tab이 유일 조작 '목록으로'가 아닌 상단부터 순회.

- 수정: editLoadStatus가 'error' 전환을 감지하는 effect에서 NotFoundPanel '목록으로' 버튼 ref(또는 tabIndex=-1 패널)로 focus() 이동. .catch 직후 rAF로 panelRef.current?.focus()도 가능.


**5.5 [P3·S·ux-flow] 인라인 검색 콤보 포커스 시 input이 순간 빈칸으로 렌더돼 선택값이 '지워진 듯' 보임(실 값 유지)**  

- 위치: `…/shared/ui/person-register-modal/sections/inline-search-select.tsx:113`

- 시나리오: 아버지 지정 상태에서 필드 클릭(포커스)하면 value={open?query:selectedLabel}에서 open=true로 빈 query 표시→채워진 이름이 순간 사라져 값 소실로 오해, 다시 검색·당황. 값 자체는 유지되나 빈 입력이 1차 신호.

- 수정: onFocus에서 query를 selectedLabel로 프리필+event.target.select()로 '기존 값 위 검색' 유지하거나, 최소 placeholder={selectedLabel||placeholder}로 현재 라벨 노출해 빈칸 오해 제거. 시각 신호만 보정.


**5.6 [P3·S·ux-flow] '성·이름·중간이름' 통합 라벨의 단일 별표(*)가 성·중간이름도 필수로 오독시킴(실 필수는 이름뿐)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.tsx:2116`

- 시나리오: 세 입력을 한 라벨 '성·이름·중간이름*'로 묶고 별표 하나만 붙임. 외자·성 미상 역사 인물 등록자가 별표를 세 필드 전체로 읽어 없는 성을 임의로 지어넣거나 등록 주저. 진척칩·validate는 이름만 필수로 판정해 UI 신호와 라벨 모순.

- 수정: 통합 별표를 세 필드 공통 라벨 끝에서 분리하고 실제 필수인 '이름' 입력에만 required 마이크로 표식/aria-required 부여. 라벨을 '이름(필수)·성·중간이름'로 재작성하거나 성·중간이름에 '선택' 힌트 명시(기존 정정 주석 2148을 화면 힌트로 승격).


**5.7 [P3·S·design-visual] 별칭 '별칭 추가'만 bespoke AddBtn(indigo dashed·아이콘13) — 형제 행추가(공용 AddRowBtn·회색·16)와 시각 언어 불일치**  

- 위치: `…/shared/ui/person-register-modal/sections/nickname-section.tsx:225`

- 시나리오: '별칭 추가'·'배우자 추가'·'소속 추가'를 나란히 보면 별칭만 indigo 강조·다른 크기 아이콘이라 위계 어긋남. AddRowBtn 통일이 노린 '중구난방 제거'가 nickname 한 곳에서 무효화.

- 수정: nickname-section의 styled AddBtn(225-247) 삭제 후 ../_form-primitives에서 AddRowBtn import. 사용처(106-109)를 <AddRowBtn><FiPlus size={16}/>별칭 추가</AddRowBtn>로 교체(아이콘 13→16). RemoveBtn 등은 유지.


**5.8 [P3·S·design-visual] life-section SegmentBtn의 $variant='ghost'가 死 prop — ghost 톤 미반영(보조 토글이 3-way 분기와 동일 무게)**  

- 위치: `…/shared/ui/person-register-modal/sections/life-section.tsx:655`

- 시나리오: '출생일 미상'·'추정' 보조 토글이 주 분기 '생존/사망/일자미상'과 동일 무게로 보여 시각 위계 소실. 미사용 prop이 남아 향후 ghost 추가하려는 사람이 배선됐다고 오해.

- 수정: 의도가 살아있다면 segmentToggleMixin에 variant 파라미터를 추가해 ghost 분기(비active 시 배경/보더 투명)를 구현·소비. 폐기됐다면 $variant 타입 선언(658)과 3곳($variant=ghost)을 제거해 死 prop 정리(canon 단일 출처엔 후자가 안전).


**5.9 [P3·S·design-visual] InlineSearchSelect 드롭다운 표면 rgba(28,28,32,0.98) + Option radius 6px — canon 표면·RADIUS 토큰 우회**  

- 위치: `…/shared/ui/person-register-modal/sections/inline-search-select.tsx:250`

- 시나리오: 다크 모드에서 가족/가문 콤보 드롭다운 배경이 date-picker·country-select 등 glassCardMixin 모달과 미묘하게 다른 회색으로 떠 과거 통일 작업 재발.

- 수정: Option border-radius 6px(273)→RADIUS.control(8px, 이미 import). Dropdown 다크 배경(249-250)을 canon 다크 표면 값으로 정렬(글래스 대상이면 glassCardMixin, 솔리드 유지 시 통일 다크 표면 토큰)해 date-picker·country-select와 톤 일치.


**5.10 [P3·S·design-visual] FloruitYearInput bespoke 재구현 — RADIUS.control 미사용(리터럴 8px) + iOS 줌 방지 16px @media 누락**  

- 위치: `…/shared/ui/person-register-modal/sections/life-section.tsx:634`

- 시나리오: 모바일(<768px)에서 활동시기 연도 입력 포커스 시 폰트 14px이라 iOS 페이지 확대(다른 날짜 입력은 16px로 방지). RADIUS를 조정할 때 floruit만 8px 리터럴로 남아 모서리 어긋남.

- 수정: FloruitYearInput을 DateInput 톤으로 정렬: border-radius 8px→${RADIUS.control}, @media(max-width:768px){font-size:16px} 추가(inline-date-field 162 선례). 가능하면 공용 입력 primitive로 대체.


**5.11 [P3·S·ux-flow] 선택 필드 surname에 미사용 필수 오류 메시지 상수 존재 — 死 카피(회귀 소지)**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.helpers.ts:27`

- 시나리오: REQUIRED_MESSAGES.surname='성을 입력해주세요.'가 정의됐으나 surname은 선택이라 어디서도 미사용. 향후 '필수 메시지 세트' 순회나 surname blur 검증 추가 시 이 상수를 근거로 성을 필수처럼 강제하는 회귀 소지.

- 수정: REQUIRED_MESSAGES에서 surname 항목 삭제하거나 '선택—미사용' 주석 부기. handleRequiredTextBlur key 타입이 'name'으로 좁혀져 삭제해도 타입 영향 없음.


**5.12 [P3·S·design-visual] helpers.ts 死코드: 미사용 export 4종(사망유형 3상수+formatDateDisplay) — 라벨 정본 DEATH_TYPE_GROUPS 단일화**  

- 위치: `…/shared/ui/person-register-modal/person-register-view.helpers.ts:33`

- 시나리오: PRIMARY_DEATH_TYPES·EXTRA_DEATH_TYPES·DEATH_TYPE_OPTIONS는 파일 내부에서만 상호 참조(실사용은 life-section DEATH_TYPE_GROUPS), formatDateDisplay도 외부 import 0. 사망 유형 라벨을 두 곳에 이중 정의해 유형 추가 시 한쪽만 고치면 갈라짐. 개발자가 死코드 DEATH_TYPE_OPTIONS를 고쳐 무효 변경 커밋 소지.

- 수정: helpers.ts에서 PRIMARY_DEATH_TYPES(33)·EXTRA_DEATH_TYPES(40)·DEATH_TYPE_OPTIONS(46)·formatDateDisplay(124) 삭제하고 DEATH_TYPE_GROUPS 단일 출처만 유지. 네 export 모두 외부 소비처 0이라 파급 없음.


**5.13 [P3·M·a11y] 라디오그룹(SegmentControl·Segmented3Way)이 화살표 키·roving tabindex 없음 — ARIA radio 패턴 미준수**  

- 위치: `…/shared/ui/segment-control/segment-control.tsx:60`

- 시나리오: SR이 성별을 '남성, 라디오 버튼, 1/3'로 읽고 화살표로 선택 이동을 기대하나 무반응. Tab 시 라디오 3개가 각각 탭 정지점(roving 부재)이라 단일 위젯이 아닌 개별 버튼처럼 순회. 사망 3-way도 동일.

- 수정: SegmentControl에 onKeyDown 추가(Arrow로 이전/다음 onChange+preventDefault), checked만 tabIndex=0·나머지 -1, disabled 스킵. Segmented3Way도 동일. 공용이라 한 곳 수정이 성별·표시순서 등 다수 콜사이트 파급.


**5.14 [P3·M·a11y] 사망 유형 칩 그룹이 aria-pressed 토글 나열 + 점진 노출 시 라이브 알림 없음**  

- 위치: `…/shared/ui/person-register-modal/sections/life-section.tsx:419`

- 시나리오: SR이 사망 유형 칩 13개를 무관한 '토글 버튼, 눌림/안눌림'으로 읽어 '하나만 고르는 그룹' 관계·'1/13' 위치를 못 얻음. 사망일 입력 순간 13칩이 새로 나타나나 아무 낭독 없어 새 옵션 등장 인지 불가.

- 수정: role=group 유지 시 각 칩에 aria-setsize/aria-posinset+그룹 라벨을 aria-labelledby 연결. 점진 노출 구간은 aria-live=polite로 감싸 '사망 유형 선택 항목이 나타났습니다' 안내(재클릭 해제 UX와 정합하도록 radiogroup 전환 대신 group+posinset).


**5.15 [P3·M·design-visual] 별칭·소속·배우자서열 커스텀 select가 공용 primitive 없이 3벌 중복 재구현 — 높이·폰트·배경 제각각**  

- 위치: `…/shared/ui/person-register-modal/sections/nickname-section.tsx:145`

- 시나리오: 같은 모달에서 별칭 유형·소속 유형·배우자 서열 세 드롭다운이 높이(36/~38/~30px)·글자(14/13/12px)·배경이 달라 '한 폼'이 아닌 조각난 인상. 새 select 추가 시 어느 값 복사할지 불명확해 drift 지속.

- 수정: _form-primitives에 공용 InlineSelect(appearance:none+내장 caret, RADIUS.control·FONT.label·통일 패딩) primitive 추가 후 nickname TypeSelect(145)/country TypeSelect(380)/family SpouseRankSelect(911)와 각 caret을 이 하나로 대체. 폭 차이만 prop 노출.


**5.16 [P3·M·design-visual] person-register 모달 컨트롤 높이/패딩 토큰 부재 — 주 입력 36 vs ~39px 미세 드리프트**  

- 위치: `…/shared/ui/person-register-modal/sections/nickname-section.tsx:133`

- 시나리오: 이름/유형 select·별칭 입력·혼인 서열·소속 비고가 세로로 인접할 때 높이가 안 맞아 baseline 어긋난 채 쌓여 '정렬 안 된 폼'으로 읽힘.

- 수정: _form-primitives에 CONTROL={height,padY,padX} 토큰 추가 후 FormInput·baseInput·life-section 주 입력을 수렴. ReasonInput·SpouseRankSelect·NoteInput 등 FONT.meta 보조 컨트롤은 의도된 작은 위계라 CONTROL_COMPACT로 분리(무리한 일괄 통일 금지).

## 추가 발견 — 완전성 비평(7개 렌즈 사각)

위 53건과 달리 이 6건은 **적대 검증 전 가설**로 출발했다. 아래 상태 표기는 이 세션에서 코드로 직접 확인한 결과다.

**G1. [P2·개인정보] 임시저장(draft) localStorage가 계정 미스코프 + 로그아웃 미소거** — ✅ 코드 확인
`draftScopeId = editPersonId ?? 'new'`(`…/person-register-modal/person-register-view.tsx:376`), 키 `papyrus:person-register-draft:<scope>`(`use-person-draft.hook.ts:11`)에 **actor accountId가 없다**. 스냅샷엔 이름·생몰·부모/배우자·별칭 등 인물 PII 전량이 담긴다. 정리는 30일 TTL GC(`use-person-draft.hook.ts:14`)뿐 — `features/auth`·전역에서 이 키를 로그아웃/계정전환 시 비우는 훅을 찾지 못했다. web-admin이 다수 큐레이터 공용 도구이므로, 공유/전환 브라우저에서 다음 사용자가 ‘새 인물’ 폼을 열면 남의 미완성 draft가 “임시 저장된 내용을 복원했습니다” 배너로 되살아난다.
- 수정: scopeId에 `getActorAccountId()` prefix를 합쳐 계정별 격리하고 peek 시 타 계정 키 무시. 로그아웃/계정전환 경로에서 `KEY_PREFIX` 전체 소거 훅 추가. (관련: 세션 메모 `notification-shared-feed-per-account-read`의 actor 스코프 패턴)

**G2. [P3·정합] 추가 국가 소속 행의 중복·주 국적 충돌·기간 중첩 무검증** — ✅ 코드 확인
`rowError`/`hasAffiliationDateError`(`…/sections/country-affiliations-section.tsx:90,101`)는 ‘국가 미선택+데이터’와 ‘종료<시작’만 본다. 같은 국가를 (a)주 국적 `countryId`와 CITIZENSHIP 소속 행에 동시에, (b)소속 행 여러 개에 중복으로, (c)기간 겹치게 넣어도 경고·차단이 없다 → 상세·타임라인 이중 표기. 배우자 행 dedup(1.3)의 국가 소속판.
- 수정: `rowError`에 행간 `(countryId|historicalCountryId)` 중복·주 국적과의 CITIZENSHIP 일치·기간 중첩 검사 추가. 서버 `person-country-affiliation` 저장부의 중복 처리도 대조.

**G3. [P2/P3·데이터 유실] 파괴적 행 삭제 확인의 비대칭** — ✅ 코드 확인
배우자 행 삭제는 내용이 있으면 confirm으로 보호한다(`…/sections/family-section.tsx:423`, “입력한 혼인일·메모도 함께 삭제됩니다”). 그러나 **별칭 행**(`nickname-section.tsx:52 remove`)·**국가 소속 행**(`country-affiliations-section.tsx:147 removeRow`)은 내용 유무와 무관하게 즉시 `filter` 삭제 + undo 없음. 수정 모드는 이 배열을 delete-recreate로 통째 교체하므로, 채워진 별칭/소속 행을 오조작으로 지운 뒤 저장하면 서버에서 **영구 삭제**. (세션 메모 `company-detail-improvement-backlog`의 ‘배열행 삭제 무확인’ 데이터손실 패턴과 동일 계열, 여기선 3형제 섹션 중 배우자만 가드.)
- 수정: `nickname`·`affiliation` remove에 family-section의 “내용 있는 행만 confirm” 패턴을 동일 적용해 세 반복행 섹션 UX 통일.

**G4. [P3·검증] 자유텍스트 서버 DTO 길이 상한 미러링 부재** — ⚠️ 부분 확인
클라 `maxLength`가 걸린 곳은 별칭 `reason`(300, `nickname-section.tsx:102`)뿐. `name·surname·middleName·deathCause·deathNote·birthNote·소속 note·별칭 nickname`은 상한이 없어 서버 `@MaxLength`/컬럼 초과 시 정체불명 400 또는 DB 절단 위험(월/일 비대칭 3.1과 같은 계열). 특히 산문성 `deathNote/birthNote/note`.
- 수정: `create/update-person.dto`의 각 문자열 `@MaxLength`(+Prisma 컬럼)를 확인해 입력 `maxLength`를 대칭화.

**G5. [P3·UX] 네이티브 Enter 암묵 제출이 ⌘Enter 가드(anyModalOpen)를 우회** — ⚠️ 타당(재현 권장)
`⌘Enter` 핸들러는 `isSubmitting·loadFailed·anyModalOpen`을 신중히 가드한다(`person-register-view.tsx:1367`). 그러나 `<form>` 안 단일 `<input>` + 푸터 submit 버튼 구조라, 텍스트 입력 중 그냥 **Enter**를 누르면 브라우저 암묵 제출로 `handleSubmit`이 발화 — 이 경로엔 `anyModalOpen` 가드가 없다(단, `handleSubmit` 자체는 `isSubmitting`·검증은 수행). `InlineSearchSelect`는 Enter를 자체 처리하지만 일반 스칼라 입력은 무방비. ⌘Enter만 의도적 단축키로 문서화된 것과 모순.
- 수정: 스칼라 입력에 Enter preventDefault(멀티라인 제외)를 두거나, 네이티브 제출 경로에도 ⌘Enter와 동일 가드를 태운다. (Enter-to-submit을 유지할지 제품 판단 필요.)

**G6. [인가 — 취약점 아님] 인물 create/update 소유권 강제 여부** — ✅ 서버 강제 확인
클라 리뷰 사각이라 별도 에이전트로 `apps/api`를 확인한 결과 **소유권이 강제되고 있어 취약점이 아니다**(§서버 인가 검증 참조). 타 계정 인물을 `editPersonId`로 지정하면 403. 세션 메모의 ‘서브리소스 소유권 전무 P1’ 전례는 현재 코드에서 이미 `assertPersonOwnership`으로 개선됨. 조치 불필요.

---

## 내가 추가한 검증(렌즈가 부분만 잡은 것)

**A1. [P3·디자인/검증] `InlineDateField`의 `$error` 시각 보더가 死 prop** — ✅ 코드 확인
`DateInput`은 `$error` 기준 빨강 보더를 정의하지만(`…/sections/inline-date-field.tsx:143`), 호출부(`life-section.tsx:216,288`·`family-section.tsx:474`)는 모두 `error=`만 넘겨 `aria-invalid`만 세팅하고 `$error`는 전달하지 않는다 → **생몰일·혼인일 입력은 오류 시 빨강 보더가 절대 뜨지 않는다**(텍스트 `FormInput`은 뜸). §배치5의 A11y 항목(2.x, 오류-입력 프로그램 연결)과 짝을 이루는 시각 결손. 수정: 호출부에서 `$error`(또는 `error`→`$error` 내부 매핑) 전달.

**A2. [P3·접근성] 인라인 검색 콤보에 `aria-activedescendant`/`aria-controls` 부재** — ✅ 코드 확인
`InlineSearchSelect`는 `role="combobox" aria-expanded`만 있고(`…/sections/inline-search-select.tsx:109`), 리스트박스와의 `aria-controls`·활성 옵션 `aria-activedescendant`가 없다. 화살표로 옵션을 옮겨도 SR이 강조 옵션을 낭독하지 못하고, 활성 옵션 `scrollIntoView`도 없어 긴 목록에서 키보드 탐색이 화면 밖으로 나간다(부/모/배우자·가문·종교 5개 콤보 공통). 수정: 옵션에 id 부여 + `aria-activedescendant`·`aria-controls` 배선 + 활성 옵션 스크롤.

---

## 검증 노트(적대 검증에서 축소·반박된 것)

투명성을 위해 기록. 초기 발굴에서 P2로 잡혔으나 검증이 “서버/DB 가드가 손상을 막는다”를 확인해 **P3로 정직하게 강등**한 대표 2건 — 이 때문에 P1이 0이다.

- **중복 배우자 행 폐기(1.3)**: `buildSpouseRelations`의 spouseId dedup은 결함이 아니라 `person.prisma @@unique([personId, spouseId])`의 **클라 미러**다. 같은 배우자와의 서로 다른 두 혼인 이력은 이 모델에서 애초 존재 불가 → “별개 혼인 영구 유실”은 재현 불가. 남는 실재 결함은 “같은 배우자 중복 입력 시 둘째 행이 경고 없이 폐기”라는 **검증/피드백 부재(P3)** 뿐. dedup 제거는 `createMany` unique 위반 500을 부르므로 오답.
- **월·일 무효값(3.1)**: 서버 `DateInfoDto @Min/@Max`(create-person.dto)가 `13월·45일`을 400으로 거부 → **데이터 손상 없음**. 남는 결함은 클라 선검증 부재로 인한 “정체불명 400” UX 마찰(P3). `partialPartsToDateInfo`(배우자 경로)는 무효값을 조용히 절사할 뿐 ‘가드’는 아님.
- 발굴 54건 중 1건은 이미 서버/기존 가드가 방어함이 확인돼 반박(비수록).

---

## 착수 권고

1. **배치1 먼저** — 유일한 무성 데이터 유실군(409 재하이드레이션·하이드레이션 타입 정합). 이후 배치가 유실 위에 쌓이지 않도록 선결.
2. **G6(서버 인가)는 확인 완료 — 안전** — 서버가 `Person.accountId`로 소유권을 강제(타 계정 인물 수정 시 403). 이 문서 전체에서 **P1 없음**이 확정됐다.
3. **배치2는 공용 셸 1곳 수정이 다수 콜사이트에 파급** — `country-form-shell`을 `useModalBehavior` 규약으로 정합(Escape topmost 가드·트리거 포커스 복원·점프칩 셀렉터·MutationObserver 소유권). 세션 메모 `web-admin-modal-foundation` 참조.
4. 배치3~5는 대부분 effort-S — `_form-primitives`/`SegmentControl` 등 공용 primitive 한 곳 수정이 여러 곳에 퍼져 canon 회귀를 원천 봉쇄.

## 서버 인가 검증 (G6) — 결과: 소유권 강제됨(안전)

`apps/api` 직접 확인. **create·update 모두 OWNERSHIP_ENFORCED.** 프론트 리뷰의 “타 계정 인물 덮어쓰기” 가설은 성립하지 않는다.

- **소유 컬럼**: `Person.accountId`(`libs/db/prisma/person.prisma:359`, nullable·인덱스).
- **인증(전역)**: `person.controller.ts:177` 클래스 레벨 `@UseGuards(AuthGuard('jwt'))`. JWT 전략이 `sub` 없으면 throw → 핸들러의 `accountId`는 항상 non-null.
- **update**: `person.service.ts:489-495`가 `existing = findById(id, accountId)` 후 null이면 `ForbiddenException('본인이 등록한 인물만 수정할 수 있습니다.')`. 레포(`person.prisma.repository.ts:1123`)가 `findFirst({ where: { id, accountId } })`로 스코프 → 타 계정/무주 seed 행은 매칭 안 돼 **403**. 실제 `repository.update`는 이 검사 통과 후에만 실행.
- **create**: `person.service.ts:463` `{ ...data, accountId }`로 **항상 actor 소유**. 클라 지정 owner 필드·`editPersonId` 대상 없음.
- **하위 저작(nickname/affiliation/spouse/sections)**: 소유권 검증을 통과한 `repository.update` **동일 트랜잭션 내부**에서 person `id` 기준 delete-recreate(`person.prisma.repository.ts:2159-2253`). 별도 cross-account write 경로 없음. spouse의 `spouseId`는 링크 참조일 뿐 상대 레코드 덮어쓰기가 아님.
- **내부 우회 분기**(`accountId == null`으로 id만으로 fetch)는 seed/내부 호출용이며 **HTTP에서 도달 불가**(가드+전략이 accountId 보장).
- **재현 경로**: 없음. `PUT /persons/:타계정id` → 403.
- **메모 대비**: 과거 P1(‘서브리소스 22엔드포인트 소유권 전무’)은 현재 `assertPersonOwnership`(`person.service.ts:644-745`)으로 career/education/award add·delete까지 가드돼 개선됨. 인물 본체 create/update는 애초 그 취약 집합이 아니었음.
