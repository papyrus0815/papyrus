# 인물 등록/수정 모달 — UI/UX 개선 검토 (2차)

> 2026-07-23 · 8렌즈 병렬 발굴 + 발굴별 적대검증(실제 코드·디자인 canon 대조) + 종합 · 에이전트 110 / 5.5M 토큰
> 발굴 101 → 생존 94 (CONFIRMED 35 · PLAUSIBLE 59) · 기각 7

검토 대상: `shared/ui/person-register-modal/`(뷰 2668줄 + 8섹션 + draft훅 + styles/primitives), 차용 셸 `widgets/country/country-form/country-form-shell.tsx`, 진입점 `pages/persons/person-edit.page.tsx`·`widgets/country/country-list/ui/person-register-view-modal.tsx`.
직전 리뷰(`docs/person-register-modal-improvement-review.md`, 2026-07-21) 이후 별칭·배우자·birthNote·circa 기능이 대거 추가돼 새 표면 위주로 재검토. 설계 canon은 회귀 방지선으로 존중(적대검증이 canon 되돌리기 제안 7건 중 다수를 기각).

## 상위 UX 테마
- 死어포던스 = 셸↔뷰 계약 표류: 차용한 country-form-shell의 jumpTarget·first-focus·pulse 셀렉터가 person-register-view의 실제 앵커(fid useId·data-*)와 어긋나, 진척칩 점프·첫 포커스·클릭 pulse가 조용히 무동작. 안정 앵커 계약(data-jump-target·가시성 필터)으로 봉인해야 함.
- 제출·포커스 흐름의 조기·오발·경쟁: plain Enter 암묵제출, 모달 열림 미보고 상태의 ⌘Enter, 상시 MutationObserver의 포커스 강탈과 view rAF 이중 스크롤이 겹쳐 '내가 안 눌렀는데 저장/이동'이 반복. 첫-오류 이동을 제출 시점 한 곳으로 일원화하고 암묵 제출을 가드해야 함.
- 진입점 비대칭(모달 vs 페이지): 동일 폼이 모달과 person-edit.page에서 섹션 내비·좌우 거터·제출버튼·진척 인디케이터·저장중 문구·헤딩·autosave·이탈경고까지 제각각. 뷰가 이미 emit하는 sections/앵커를 페이지도 소비해 동형화 필요.
- 반복행/프리미티브 파편화: family·country-affiliations·nickname 세 반복 섹션의 add·삭제·카드·focus 링·16px·오류메시지가 섹션마다 bespoke로 재발명. _form-primitives 단일 정의로 승격해 시각·상호작용·접근성을 코드 차원에서 통일.
- 발견성 부족(정보 scent 은닉): 역사국가 국적·군주 호칭·floruit·별칭 범위(출생명·자·호)·배우자 서열처럼 이 역사 DB의 핵심 입력이 tertiary 회색 힌트나 접힌 disclosure에만 있어 영영 안 눌림 → 등록 단계 데이터 누락. 라벨/FieldHint scent 강화 필요.
- 카피·용어·문체 표류: 임시/자동 저장, 비고/메모/설명, 프로필사진/썸네일, 합쇼체↔해요체, 없음/미분류/선택안함, 필수 별표 오귀속 등 같은 개념의 어휘가 화면·진입점마다 달라 완성도와 신뢰를 깎음. 공용 상수·규약으로 수렴.

### 종합
94건은 대체로 '차용한 country-form-shell과 person-register-view 사이의 계약 표류'와 '단일 개념의 파편화'라는 두 축으로 수렴한다. 8건은 렌즈 간 중복(점프칩 死어포던스가 4~5개 렌즈에서 반복 지적된 것이 대표)이고, 나머지는 셸 앵커·포커스 계약 정합, InlineSearchSelect 단일 파일 정비, Enter/⌘Enter 조기제출 가드, 제출·검증 피드백 신뢰성(유일 P1인 FB-1 포함), 인라인 날짜 오류·접근성, 반복행 프리미티브 단일화, 진입점 패리티, 카피 통일, 발견성 scent, 인덱스·반응형 정리, A11Y 구조, 死코드 정리의 13개 배치로 묶인다. 최우선은 impact 대비 저비용이면서 확정된 것들 — FB-1(먹통 제출)·셸 앵커/첫포커스 수리·plain Enter 가드·⌘Enter 모달 가드·이름 필수 별표 정정·iOS 16px·focus 링·409 편집손실 — 로, 대부분 canon(성장 억제·필드 disclosure 보존·섹션 소유)을 지키며 뷰의 god 파일엔 배선만 얹는 저위험 수정이다. 공용 셸을 만지는 배치(Observer opt-out, 카피 상수)는 country/historical-country 폼까지 파급되므로 opt-out 프롭·공용 상수로 blast radius를 좁혀 진행할 것을 권한다."

## 최우선 (impact/effort)
- **[FB-1] _form-only 검증 실패가 앵커·토스트 전무 — 제출 버튼이 '먹통'** · effort M — 이 리뷰 유일 P1·high impact. 배우자 orphan/중복 등으로 제출이 막혀도 스크롤·토스트가 없어 사용자가 원인 모른 채 진행 불가. notify.error + aria-invalid 앵커 + TopAlert 폴백으로 effort M에 실 진행성 회복.
- **[IA-11] 푸터 필수 진척칩 점프 + 첫 포커스 死어포던스 (셸 계약 정합)** · effort S — 5개 렌즈가 수렴한 CONFIRMED. 셸은 이미 data-jump-target 계약을 갖췄고 뷰 3필드에 속성만 부여+first-focus 셀렉터 가드면 죽은 점프칩·유실 첫포커스가 동시 해소. 저위험·저비용에 흐름 시작 마찰 제거.
- **[FLOW-3] 반복행 편집 중 plain Enter가 폼 전체를 조기 제출** · effort S — 긴 다중섹션 폼에서 반복 발생하는 마찰이고 ⌘Enter라는 명시 제출이 이미 존재. onKeyDown 한 가드(textarea·이름필드 제외)로 effort S에 광범위 오발 차단.
- **[FLOW-4] 배우자 혼인일 달력 열린 채 ⌘Enter가 폼을 뒤에서 제출** · effort M — 날짜 고르는 중 인물이 저장돼 혼란·중복 위험(데이터 무결성). affiliation과 동일한 onDateModalOpenChange lift 패턴 재사용이라 확실·정합.
- **[COPY-5] '성·이름·중간이름*' 필수 별표가 세 필드 전체를 필수로 오독** · effort S — 외자·단일명·성 미상 인물에서 억지 입력/막힘을 유발(설계 의도와 정반대). htmlFor·aria-required를 이름에 귀속하는 S 규모로 정확성·접근성 동시 개선.
- **[RESP-3] bespoke 입력이 iOS 16px 줌방지 가드 누락 → 모바일 포커스 시 확대** · effort S — 모바일에서 필드 탭마다 화면이 줌인·원복 안 됨. _form-primitives의 mobileInputFontMixin 하나로 일괄 적용, effort S·CONFIRMED·체감 큰 모바일 개선.
- **[VIS-4] bespoke input/select가 focus-visible 링 미표시 (키보드 가시성 불일치)** · effort M — 같은 폼에서 절반만 포커스 링이 떠 키보드 사용자가 현 위치를 놓침. FormInput과 일치하는 inputFocusMixin 추출로 CONFIRMED·medium impact·재사용 자산화.
- **[FB-3] '최신 내용 불러오기'가 미저장 편집을 확인 없이 통째 폐기** · effort M — 409 충돌 UX가 되돌릴 수 없는 편집 손실을 무성 유발+성공 신호 없음. dirty 시 confirm 게이트 + 재하이드레이션 성공 토스트로 데이터 손실 방지.

## 렌즈 간 중복(병합)
- 푸터 필수 진척칩 '미완 항목으로 이동' 死어포던스 — jumpTarget이 실제 앵커와 불일치 — `IA-11, FB-9, A11Y-13, DISC-9, FLOW-13`
- 모달 첫 포커스가 display:none 썸네일 파일 input을 잡아 어떤 필드도 포커스 안 됨 — `FB-8, A11Y-7`
- 인라인 콤보 Escape가 stopPropagation 없이 window로 버블 → 모달 닫기 프롬프트 유발 — `FLOW-12, A11Y-5`
- 셸 aria-invalid MutationObserver가 타이핑 중 포커스 강탈 + 제출시 view rAF와 이중 스크롤 — `FB-10, A11Y-8, FB-12`
- InlineDateField $error 死prop — 날짜 오류 시 빨강 보더가 안 뜸 — `VIS-8, FB-11`
- 좌측 인덱스 라벨('기본 정보'·'생애')이 본문 헤더('이름'·'생몰')와 불일치해 착지 혼란 — `IA-4, COPY-11`
- '성·이름·중간이름*' 필수 별표가 세 필드 전체에 걸려 성·중간이름도 필수로 오독 — `COPY-5, DISC-7`
- '국가'가 필수 국적(신원)과 추가 소속에 분산 — 라벨 토큰이 국적 위치를 오도 — `IA-12, DISC-4`

## 구현 배치

### 배치 1. 셸 앵커·첫포커스·점프 계약 정합 (死어포던스 수리)  
*effort M*
> 모두 country-form-shell의 셀렉터 계약과 person-register-view의 필수 3필드(이름·성별·국적) 앵커 불일치라는 단일 근인. 셸 handleRequiredJump는 이미 `[data-jump-target]`·first-focus 셀렉터를 갖고 있으므로, 뷰의 이름 FormInput·성별 래퍼(tabIndex 상시)·국적 SelectBtn에 data-jump-target=name|gender|countryId를 부여하고 first-focus 셀렉터에 :not([type=file])+offsetParent 가드만 더하면 5개 렌즈가 가리킨 죽은 점프칩·유실 첫포커스가 한 번에 해소. 확정(CONFIRMED)·저위험·공용 셸 무변경.

#### [IA-11] 푸터 진척칩 '미완 필수로 이동' 점프가 死 어포던스 — jumpTarget이 fid 접두 id·name속성과 불일치
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`widgets/country/country-form/ui/country-form-shell.tsx:741-755`
- **문제:** 필수 미완 시 진척칩이 클릭 가능한 버튼으로 렌더되지만(872-876) 클릭해도 querySelector가 null이라 아무 일도 안 일어난다. '필수 먼저 채우게 안내'라는 이 UI의 핵심 어포던스가 3개 필수 전부에서 죽어, 인지부하를 줄이려던 진척칩이 오히려 신뢰를 깎는다.
- **권고:** 필수 3개 컨트롤에 data-jump-target 속성을 부여한다: 이름 FormInput(2180)에 data-jump-target="name", 성별 래퍼 div(2320)에 data-jump-target="gender", 국적 SelectBtn(2353)에 data-jump-target="countryId". 이러면 `[data-jump-target="..."]` 브랜치가 매칭되고 `#name` 등 plain 브랜치는 유효-비매칭이라 안전하다. 발굴이 제시한 대안(jumpTarget에 fid('gender') 전달)은 피할 것: (1) fid/uidPrefix는 PersonRegisterView 내부라 requiredFields를 만드는 wrapper(person-register-view-modal.tsx)에서 접근 불가, (2) useId()가 콜론(`:r0:`)을 내므로 `#${jump}`가 `#:r0:-gender`가 되어 CSS 셀렉터 SyntaxError→querySelector 전체가 throw된다. 또한 성별 대상은 포커스 불가한 div이므로 target.focus()(shell:752)가 무동작 no-op이 되니, 래퍼에 tabIndex={-1}을 상시 부여하거나 data-jump-target을 첫 세그먼트 버튼에 두어 스크롤 후 포커스가 안착하게 한다(이름 input·국적 button은 이미 포커스 가능).

#### [FB-9] 푸터 필수 진척칩의 '미완 항목으로 이동'이 죽은 어포던스 — jumpTarget이 실제 id/name과 불일치
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:741-755; widgets/country/country-list/ui/person-register-view-modal.tsx:106-114; person-register-view.tsx:2172-2365`
- **문제:** 필수 미완 상태에서 진척칩이 클릭 가능한 버튼으로 렌더되지만(canJumpRequired) 눌러도 매칭 요소가 없어 아무 데도 안 간다. '누르면 미완 필드로 데려다줄 것' 같은 시각/aria-label('미완성 필수 항목으로 이동')이 배신당함.
- **권고:** 권고2(jumpTarget을 fid로 넘기기)는 지양. fid는 PersonRegisterView 내부 useId 산물이라 requiredFields를 조립하는 person-register-view-modal.tsx(onValuesChange의 boolean만 받음)에서 볼 수 없어 별도 배선이 필요하다. 대신 셸의 기존 셀렉터 계약(`[data-jump-target="${jump}"]`)에 맞춰 안정 앵커를 세 코어 필드에 부여: (1) 이름 FormInput(2179-2193)에 data-jump-target="name"; (2) 성별은 이미 data-field-error를 단 래퍼 div(2320-2323)에 data-jump-target="gender" 추가 + tabIndex={-1} 상시 부여(현재 tabIndex는 error일 때만 → 셸의 후속 `.focus()`가 bare div엔 안 먹음); (3) 국적 SelectBtn(2352)에 data-jump-target="countryId"(SelectBtn은 button이라 focus 정상). data-jump-target은 렌더 간 안정적이고 셸 수정 없이 계약 충족. 참고: 같은 셸 버그가 country-form-modal의 jumpTarget='name'에도 존재(country-form.tsx는 id="continentId"만 있고 name 앵커 없음) — 셸 소비자 전수감사로 함께 고칠 수 있으나 본 인물모달 발굴 범위 밖.

#### [A11Y-13] 푸터 필수 진척 점프 버튼이 person 모달에서 무동작(死 어포던스)
*🟡 P3 · CONFIRMED/low · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:741-755; person-register-view-modal.tsx:106-114; person-register-view.tsx:376-377`
- **문제:** 필수 미완 시 클릭 가능한 버튼(aria-label '미완성 필수 항목으로 이동')으로 렌더되지만 querySelector가 아무것도 못 잡아 조용히 무동작한다. 키보드 사용자가 이 어포던스를 활성화해도 초점·스크롤이 이동하지 않아 배신적 UX.
- **권고:** requiredFields.jumpTarget을 실제 id(fid 결과) 또는 data-jump-target 속성값과 일치시키거나, 각 필수 컨트롤에 data-jump-target="name|gender|countryId"를 부여. 매칭 실패 시 버튼화하지 않도록 canJumpRequired 판정을 실제 타깃 존재로 강화.

#### [DISC-9] 푸터 '미완성 필수 항목으로 이동' 진척칩이 jumpTarget 불일치로 死affordance
*🟠 P2 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`widgets/country/country-list/ui/person-register-view-modal.tsx:106-113; country-form-shell.tsx:741-755`
- **문제:** 필수 항목이 미완일 때 푸터 진척칩이 클릭 가능한 버튼('미완성 필수 항목으로 이동')으로 바뀌지만, 눌러도 어디로도 스크롤·포커스되지 않는다. '무엇이 부족한지'를 안내하는 발견 보조가 죽어 있어, 사용자는 긴 폼에서 빠진 필수 필드를 스스로 찾아 헤맨다.
- **권고:** 고치는 건 값싸고 옳으니 수리 권장. 단 발굴이 제시한 두 옵션 중 두 번째('requiredFields의 jumpTarget을 fid('name') 등 실제 id로 전달')는 채택 금지 — 두 가지로 위험하다: (1) fid/uidPrefix는 PersonRegisterView 내부(useId) 값이라 래퍼(person-register-view-modal.tsx)는 접근할 수 없어 새 배선이 필요하고, (2) 설령 넘겨도 셸이 `#${jump}` 경로를 한 셀렉터 문자열에 이어 붙여 querySelector에 통째로 넘기는데(748), React 19 useId 출력은 CSS 식별자에 그대로 못 쓰는 특수문자를 포함하므로 `#<useId>-name`이 되면 셀렉터 전체가 SyntaxError로 throw돼 지금(조용한 no-op)보다 더 나빠진다. 따라서 옵션 1만 채택: 각 필수 컨트롤에 `data-jump-target`을 달아 셸의 기존 `[data-jump-target="${jump}"]` 경로에 걸리게 한다 — 이름 FormInput(2179-2193)에 `data-jump-target="name"`, 성별은 이미 있는 래퍼 div(2320-2323, data-field-error 옆)에 `data-jump-target="gender"`(scrollIntoView는 되지만 focus 대상이 아니니 tabIndex=-1 부여 고려), 국적 SelectBtn(2352)에 `data-jump-target="countryId"`. focus까지 자연스러우려면 실제 focusable 컨트롤(name input, countryId 버튼) 위에 두는 게 낫다. 아니면 애초에 이 칩의 실효 가치가 제출-시 auto-scroll과 겹치므로, 수리 대신 canJumpRequired를 항상 false로 두고 칩을 비클릭 상태 표시로만 유지하는 방안도 동등하게 정당하다(死affordance 제거가 목적이라면).

#### [FLOW-13] 푸터 '필수 N/M' 점프칩이 죽어 있고, 모달 열림 시 첫 포커스가 display:none 파일입력을 잡음
*🟠 P2 · CONFIRMED/medium · effort M · (직전리뷰 중복)*  
`widgets/country/country-form/ui/country-form-shell.tsx:741-755, 648-660; widgets/country/country-list/ui/person-register-view-modal.tsx:106-114`
- **문제:** 미완 필수 항목으로 '이동'하려고 진척칩을 눌러도 아무 일이 없고(죽은 어포던스), 모달을 열어도 커서가 이름 칸에 없어 바로 타이핑을 시작할 수 없다. 두 축 모두 흐름 시작을 지연시킨다.
- **권고:** jumpTarget을 실제 앵커와 맞춘다: 입력에 data-jump-target='name'|'gender'|'countryId' 부여(또는 셸 셀렉터가 fid 접두 id를 알 수 있게). first-focus 셀렉터에서 type=file 및 display:none 요소 제외하고 실제 첫 텍스트 입력(이름)에 포커스.

#### [FB-8] 모달 첫 포커스가 display:none 썸네일 파일 input을 잡아 아무 필드도 포커스되지 않음
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:648-660; person-register-view.tsx:2157-2164,2172-2193`
- **문제:** type=file은 'hidden'이 아니고 disabled도 아니라 셀렉터에 매칭되는데 display:none이라 .focus()가 무효 → 모달을 열어도 어떤 필드도 포커스되지 않는다. 키보드 사용자는 Tab을 여러 번 눌러야 첫 필드에 도달. (직전 리뷰 RC5가 예고한 위험이 실제로 남아 있음)
- **권고:** 셸은 국가 폼과도 공유되므로 person 전용이 아닌 일반 수정 권장. querySelector→querySelectorAll 후 첫 가시 요소만 포커스: Array.from(root.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')).find((el)=>el.offsetParent!==null)?.focus(). offsetParent===null이 display:none을 걸러내며 스크롤 콘텐츠는 position:fixed가 아니라 오탐 없음. 더 견고하게는 폼이 명시적 initialFocusRef(이름 input)를 셸에 전달해 DOM 순서 의존 제거.

#### [A11Y-7] 모달 최초 포커스가 display:none 파일 input에 착지 → 포커스 유실
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:648-660; person-register-view.tsx:2157-2164`
- **문제:** display:none 요소는 focus()가 무시되어 모달을 열어도 포커스가 어디에도 놓이지 않는다(문서 body에 잔류). 키보드 사용자는 첫 Tab을 눌러야 폼에 진입하고, SR은 모달 제목/첫 필드 컨텍스트를 잃는다.
- **권고:** 첫 포커스 셀렉터에 `:not([type=file])` 추가하거나 offsetParent!=null(가시성) 필터를 적용해 실제 보이는 첫 입력(성/이름)으로 착지시킨다.


### 배치 2. 셸 오류-포커스 레이스 일원화 (Observer opt-out)  
*effort M*
> 상시 aria-invalid MutationObserver(강탈·200ms 지연 focus)와 view handleSubmit rAF가 같은 대상을 두고 경쟁하고, observer는 data-field-error(성별)를 놓쳐 경로별 비일관. 공용 셸(country·historical-country 3소비자)이라 전면 제거는 회귀 위험 → 셸에 manageErrorFocus opt-out 프롭을 추가해 person 모달만 끄고 첫-오류 이동을 view로 일원화. 배치1과 같은 파일 쌍을 만지지만 blast radius가 커 분리.

#### [FB-10] 셸 MutationObserver(aria-invalid)가 타이핑/정정 중 포커스를 다른 오류 필드로 강탈
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:664-686; person-register-view.tsx:2189,2357`
- **문제:** 제출 실패로 이름·국적 두 오류가 있을 때 이름 칸을 채워 aria-invalid가 꺼지면 observer가 발화→아직 오류인 국적 버튼으로 스크롤·포커스해, 사용자가 이름을 타이핑하던 도중 포커스를 빼앗긴다. 소속/생몰 인라인 정정 때도 같은 강탈이 발생.
- **권고:** MutationObserver 자동 포커스를 제거하고 첫-오류 이동은 제출 시점(handleSubmit rAF)에만 수행한다(셸은 스크롤만 하거나 아예 폼에 위임). 최소한 focus() 호출은 빼고 scrollIntoView만 유지.

#### [A11Y-8] Shell의 상시 aria-invalid MutationObserver가 타이핑 중 포커스 강탈·view rAF와 이중 발동
*🟠 P2 · CONFIRMED/medium · effort M · (직전리뷰 중복)*  
`country-form-shell.tsx:664-686; person-register-view.tsx:1781-1789`
- **문제:** 여러 필수가 invalid인 상태에서 한 필드를 고쳐 그 aria-invalid가 사라지면, 옵저버가 콜백을 돌며 '남아있는 다른 invalid 필드'로 스크롤+포커스를 끌어가 타이핑 맥락을 빼앗는다. 또 제출 실패 시 Shell 옵저버(지연 focus)와 view rAF(focus)가 같은/다른 대상으로 경쟁해 스크롤 튐·포커스 레이스가 난다. 게다가 옵저버는 aria-invalid만 관측해 data-field-error(성별)는 놓쳐 동작도 비일관.
- **권고:** 전면 제거는 위험: CountryFormShell은 country-form·historical-country-form 등 3개 소비자 공용이라, 이들은 옵저버가 유일한 오류-포커스 경로일 수 있어 회귀 가능. 가장 안전한 정공법은 소비자별 opt-out — Shell에 예: manageErrorFocus 프롭을 추가하고, 자체 rAF(이미 data-field-error까지 커버)로 포커스를 관리하는 person-register-view-modal만 옵저버를 끄면 레이스·강탈이 이 소비자에서 깨끗이 사라지고 국가 폼은 무변경. 전역 개선을 택한다면: (a) 옵저버를 상시가 아니라 submit 이벤트 직후 한 틱만 활성화 후 disconnect, (b) focus 이동 전 document.activeElement가 root 안 편집중 필드이고 대상과 다르면 bail(타이핑 중 강탈 금지), (c) 셀렉터에 [data-field-error="true"] 포함해 Shell·뷰의 '첫 오류' 정의를 일치시켜 스크롤 튐 제거.

#### [FB-12] 제출 실패 시 handleSubmit(rAF)과 셸 observer(200ms)가 둘 다 스크롤·포커스 — 이중 모션, 커버리지 불일치
*🟡 P3 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`person-register-view.tsx:1781-1789; country-form-shell.tsx:664-686`
- **문제:** aria-invalid 오류에선 두 스크롤/포커스가 겹쳐 이중 애니메이션·포커스 튐이 생기고, gender 오류는 한쪽만 처리돼 경로별 동작이 제각각. FB-10과 결합하면 인지 부담이 커진다.
- **권고:** 첫-오류 이동 로직을 한 곳(폼의 handleSubmit)으로 일원화하고 셸의 자동 스크롤/포커스는 제거하거나 폼이 앵커를 못 잡는 예외 케이스로 한정.


### 배치 3. InlineSearchSelect 키보드·ARIA·Esc 전면 정비  
*effort M*
> 부모·모·배우자·가문·종교 콤보가 쓰는 단일 파일(inline-search-select.tsx)에 결함이 밀집: 포커스 시 active=0라 Enter가 첫 옵션으로 뒤바꿈, 검색 0건 Enter가 폼 제출, Esc 버블로 모달 닫기, active 미스크롤, activedescendant/controls/id 부재, Tab 이탈 시 잔류, 드롭다운 표면 하드코딩. 한 컴포넌트 안에서 onKeyDown·aria·표면 토큰을 함께 손대는 게 최소 회귀면. god 파일 무배선(canon9).

#### [FLOW-1] 인라인 콤보에 포커스만 해도 첫 옵션이 선택 대기 상태 → Enter 한 번에 선택이 뒤바뀜
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/sections/inline-search-select.tsx:114-117, 90-94, 144-157`
- **문제:** Enter는 이 큰 폼에서 '제출' 습관이 강한 키다. 사용자가 값 확인/제출 의도로 콤보에 포커스한 상태에서 Enter를 누르면 의도치 않게 부모·배우자·가문 선택이 첫 옵션으로 바뀐다. 게다가 포커스 시 selectedLabel이 사라지고 query('')로 바뀌어 현재 선택값이 화면에서 사라져 무엇이 바뀌는지도 안 보인다.
- **권고:** 포커스 시 active를 -1(무선택)으로 두고 ArrowDown을 눌러야 첫 항목이 활성화되게 한다. 또는 현재 value에 해당하는 index로 active를 초기화해 'Enter=현 선택 유지'가 되도록. 포커스 시 열더라도 selectedLabel을 계속 표시(placeholder 대신)해 현재 값을 유지 노출.

#### [FLOW-2] 콤보에서 검색어가 안 맞을 때 Enter가 콤보 대신 폼 전체를 제출
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/sections/inline-search-select.tsx:90-102, 158-171`
- **문제:** '없는 이름을 쳐서 새로 만들려는' 흐름에서 Enter를 누르면 원하는 '새로 만들기'가 아니라 미완성 폼이 제출돼 검증 오류로 튄다. 결과 0건일 때 Enter의 자연스러운 기대(생성/무동작)와 정반대다.
- **권고:** open 상태에서는 Enter를 항상 preventDefault하고, filtered[active]가 있으면 선택, 없고 onCreateNew가 있으면 생성 분기로 라우팅한다. CreateRow도 방향키 순환(active === filtered.length)으로 키보드 도달 가능하게.

#### [FLOW-6] 콤보 방향키 이동 시 활성 옵션이 뷰포트로 스크롤되지 않음(최대 30항목)
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/inline-search-select.tsx:82-102, 241-255`
- **문제:** 부모/배우자 선택처럼 목록이 길면 방향키로 내려갈 때 하이라이트된 항목이 스크롤 밖으로 사라져, 지금 어디가 선택 대기인지 보이지 않는다. 키보드 사용자는 사실상 스크롤 영역을 넘어서 탐색 불가.
- **권고:** active 변경 시 해당 Option ref를 scrollIntoView({block:'nearest'}) 호출. Option에 ref 배열 또는 data-index로 접근.

#### [FLOW-12] 인라인 콤보에서 Esc로 드롭다운을 닫으면 폼 전체 닫기 가드가 발동
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`shared/ui/person-register-modal/sections/inline-search-select.tsx:95-101; widgets/country/country-form/ui/country-form-shell.tsx:619-623, 642-643`
- **문제:** 부모/배우자/가문 콤보 드롭다운을 Esc로 닫으면 같은 Escape가 window로 버블→requestClose 실행. isDirty면 '정말 닫으시겠습니까?' 확인 다이얼로그가 뜬다. 드롭다운만 닫으려던 사용자가 폼 닫기 가드에 부딪힌다.
- **권고:** 1차·충분 수정: InlineSearchSelect의 Escape(open) 분기에 기존 preventDefault/setOpen(false)/setQuery('') 옆으로 event.stopPropagation()만 추가하면 된다. React 19의 루트-컨테이너 이벤트 위임상 이 synthetic 핸들러가 네이티브 window 버블보다 먼저 돌기 때문에 stopPropagation이 셸 window 리스너 도달을 막는다(단일 파일 수정, canon 9의 '섹션 파일이 자기 동작을 소유' 원칙과 정합). 권고 2안(셸이 자식 오버레이 열림 여부를 추적해 close 무시)은 컴포넌트 간 결합·중복 방어라 불필요—채택하지 말 것. 참고로 inline-date-field의 DatePickerModal·CountrySelectModal 등 별도 모달 컴포넌트는 포털/모달 자체 Esc를 가지므로 별건이며, 이번 결함은 InlineSearchSelect 한 곳에만 있다.

#### [A11Y-5] 인라인 콤보 Escape가 stopPropagation 없이 window로 버블 → 모달 닫기 프롬프트 유발
*🟠 P2 · CONFIRMED/medium · effort S · (직전리뷰 중복)*  
`inline-search-select.tsx:95-101; country-form-shell.tsx:619-623`
- **문제:** 드롭다운만 닫으려 Escape를 눌러도 같은 이벤트가 window까지 올라가 모달 닫기(dirty 시 '정말 닫으시겠습니까' confirm)를 동시에 발동한다. 자식 드롭다운 Esc와 폼 Esc가 충돌해 사용자가 의도치 않게 폼을 닫을 위기에 놓인다(모달 진입점 한정).
- **권고:** 콤보 onKeyDown의 Escape 분기에서 open일 때 event.stopPropagation() 추가. 근본적으론 Shell이 window raw 리스너 대신 useModalBehavior(캡처/타깃 스코프)로 Esc를 관리하도록 정렬.

#### [A11Y-4] 인라인 콤보박스 aria-controls·aria-activedescendant·option id 부재 — 활성 항목 미낭독
*🟠 P2 · CONFIRMED/medium · effort M · (직전리뷰 중복)*  
`inline-search-select.tsx:107-124,140-157`
- **문제:** 화살표로 active 인덱스를 옮겨도 포커스는 input에 머무는 aria 1.1 패턴인데 activedescendant가 없어 스크린리더가 '지금 어떤 옵션이 하이라이트됐는지'를 읽지 못한다. 시각적 하이라이트($active)만 있고 낭독은 없어 저시력·SR 사용자가 선택을 못 따라간다.
- **권고:** React의 useId()로 안정적 listId 생성. Dropdown에 id={listId}, 각 Option에 id={`${listId}-opt-${index}`} 부여. Input에 aria-controls={listId}·aria-autocomplete="list" 추가하고 aria-activedescendant는 원안의 filtered[active]?.id 대신(SearchOption에 id 필드 없음) 동일 인덱스 공식으로 재구성하되 닫힘/빈목록 stale 방지를 위해 가드: aria-activedescendant={open && filtered[active] ? `${listId}-opt-${active}` : undefined}. 부수로 filtered 길이가 줄 때 active 클램프(Math.min(active, filtered.length-1))를 넣으면 dangling activedescendant를 완전 차단. 성장억제 canon상 이 변경은 sections/ 기존 파일 내 attribute 추가라 god 파일 무배선.

#### [A11Y-6] 열린 인라인 콤보가 Tab 이탈 시 닫히지 않아 고아 드롭다운 잔류
*🟡 P3 · PLAUSIBLE/low · effort S*  
`inline-search-select.tsx:64-74,107-124`
- **문제:** 키보드 사용자가 Tab으로 이동하면 방금 쓰던 드롭다운이 열린 채 다음 컨트롤을 가리거나 화면에 겹쳐 남는다. 특히 가문/종교 2열·배우자 반복행에서 여러 리스트가 동시에 열려 시각·초점 맥락이 흐트러진다.
- **권고:** 권고 1안(onBlur + relatedTarget)은 이 파일에선 취약하다: 발굴 문구가 "옵션 클릭은 onMouseDown preventDefault로 blur 방지 유지"라고 했지만 실제로 preventDefault를 가진 건 CreateRow(161)뿐이고 Option(145-156)에는 없다. 따라서 onBlur 닫기를 붙이면 옵션 mousedown이 먼저 blur를 일으켜(브라우저별 relatedTarget이 버튼이 아니라 null로 오는 경우가 있어) onClick의 choose보다 앞서 닫혀 선택을 삼킬 수 있다 — onBlur route를 택하면 Option에도 onMouseDown preventDefault를 반드시 함께 추가해야 한다. 더 견고한 건 발굴이 대안으로 제시한 onKeyDown Tab 감지다: onKeyDown(82-102)에 `event.key === 'Tab'`(및 Shift+Tab) 분기를 추가해 setOpen(false)+setQuery('') 하면 된다. 옵션은 Tab이 아니라 클릭/Enter로 선택되므로 선택 로직과 전혀 충돌하지 않고, Option 마크업 수정도 불필요하며, ~2줄로 끝나 god 파일 무변경(canon 9 준수)이다. 이 route를 채택 권고.

#### [VIS-13] InlineSearchSelect 드롭다운 다크 표면이 canon 밖 bespoke 값(rgba(28,28,32,0.98))
*🟡 P3 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`sections/inline-search-select.tsx:241-255`
- **문제:** 모달 표면 통일(canon 8: 표면 하드코딩 금지) 과제에서 정리 대상인 '10종 다크 배경' 계열에 새 고유 값이 하나 더 얹혀, 같은 화면에서 뜨는 드롭다운 표면 톤이 날짜피커·국가선택 등 다른 플로팅 표면과 미묘하게 달라진다.
- **권고:** 드롭다운 표면을 공용 플로팅 표면 토큰/mixin(또는 최소한 다른 인라인 드롭다운과 동일 값)으로 통일. 값을 정할 때 select/date-picker 드롭다운과 한 값으로 맞춤.


### 배치 4. 폼 조기제출 방지 (Enter 암묵제출·⌘Enter 모달 가드)  
*effort M*
> 둘 다 '의도치 않은 제출' 나비. 반복행/선택입력에서 plain Enter가 폼 전체를 제출(view onKeyDown + shell + nickname)하고, 배우자 혼인일 달력이 부모 anyModalOpen에 미보고되어 열린 채 ⌘Enter가 저장. FamilySection에 onDateModalOpenChange를 lift하는 것이 affiliation 기존 패턴 재사용이라 함께 처리.

#### [FLOW-3] 모든 단일행 입력에서 Enter가 폼을 즉시 제출 — 반복행 편집 중 조기 제출
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2053-2056; widgets/country/country-form/ui/country-form-shell.tsx:925-933; shared/ui/person-register-modal/sections/nickname-section.tsx:82-103`
- **문제:** 별칭·소속·배우자 메모처럼 여러 행을 연달아 채우는 중 Enter(다음 필드/줄바꿈 기대)를 누르면 폼 전체가 제출·검증돼 첫 오류로 스크롤 점프한다. 긴 다중섹션 폼에서 반복적으로 발생하는 마찰이고, 이미 ⌘Enter라는 명시적 빠른제출이 있어 plain Enter 암묵제출은 대개 오발이다.
- **권고:** 폼 onKeyDown에서 Enter를 가로채, target이 textarea가 아니고 '필수 이름 필드'가 아니면 preventDefault(반복행/선택입력에서 조기 제출 차단). 명시적 제출은 footer 버튼·⌘Enter로 유지.

#### [FLOW-4] 배우자 혼인일 달력 모달이 부모에 보고되지 않아 열린 채로 ⌘Enter가 폼을 제출
*🟠 P2 · CONFIRMED/medium · effort M*  
`shared/ui/person-register-modal/sections/family-section.tsx:151-155, 571-596; shared/ui/person-register-modal/person-register-view.tsx:1387-1399`
- **문제:** 배우자 혼인일 달력이 열린 상태에서 ⌘Enter를 누르면 anyModalOpen=false라 폼이 뒤에서 제출된다. 사용자는 날짜 고르는 중인데 인물이 등록/저장되어 버려 혼란·중복 위험.
- **권고:** FamilySection에 onDateModalOpenChange(또는 상위로 spouseDateModal 상태 lift) 콜백을 추가해 부모 anyModalOpen에 포함. affiliation 섹션과 동일 패턴 재사용.


### 배치 5. 제출·검증 피드백 신뢰성 (P1 포함)  
*effort M*
> 이 리뷰 유일 P1(FB-1: _form-only 검증 실패가 앵커·토스트 전무라 제출 버튼이 '먹통'). 함께 stale _form 잔류(FB-2), 409 reload가 편집을 무성 폐기+성공신호 없음(FB-3), 로드실패 상태 제출버튼 활성(FB-4), TopAlert가 draft배너보다 약한 위계역전(VIS-5), 국가변경 undo 토스트→트랩내 인라인 배너(A11Y-14) 모두 person-register-view의 submit/validate/TopAlert 표면. 오류 가시성·수명·낙관동시성을 한 배치로.

#### [FB-1] 배우자 orphan·중복 등 `_form`-only 검증 실패는 앵커·토스트가 전무 — 제출 버튼이 '아무 반응 없음'으로 보임
*🔴 P1 · CONFIRMED/high · effort M*  
`person-register-view.tsx:1576-1608, 1778-1791; sections/family-section.tsx:474`
- **문제:** 가족 섹션까지 스크롤한 사용자가 '배우자 선택 없이 서열/메모만' 또는 '같은 배우자 두 행'을 만든 뒤 제출하면, querySelector가 매칭 요소를 못 찾아 스크롤이 안 일어나고 토스트도 안 뜬다. 유일한 신호인 상단 TopAlert는 스크롤 영역 맨 위라 화면 밖. 결과적으로 제출 버튼이 '먹통'처럼 보여 사용자가 원인을 모른 채 막힌다(P1: 실제로 진행 불가 + 오해).
- **권고:** ①클라이언트 `_form` 검증 실패 시에도 notify.error(요약)를 띄운다. ②orphan/중복 배우자 행에 aria-invalid(또는 data-field-error)를 부여해 첫-오류 스크롤이 착지하게 한다. ③또는 `_form`이 세워졌는데 매칭 앵커가 없으면 폼 최상단(TopAlert)으로 스크롤하는 폴백을 handleSubmit rAF에 추가.

#### [FB-2] `_form` TopAlert가 인라인 수정 후에도 사라지지 않고 다음 제출까지 잔류(stale)
*🟠 P2 · CONFIRMED/medium · effort S*  
`person-register-view.tsx:1572,1604-1606,1611-1618,2023-2037`
- **문제:** 이미 해결한 문제를 계속 경고로 표시해 '아직 뭔가 잘못됐다'는 잘못된 신호를 준다. 재제출 전까지 오류가 진실을 반영하지 못한다(신뢰 저하·혼란).
- **권고:** 관련 행/필드가 유효해질 때 `_form`을 재평가해 지운다(예: 배우자/소속 rows가 바뀔 때 orphan·중복·역전 여부를 다시 계산해 '_form' 갱신, 또는 markDirty 시 '_form' 클리어). 최소한 dirty 발생 시 '_form'을 즉시 클리어하고 다음 제출에서 재산출.

#### [FB-3] '최신 내용 불러오기'가 미저장 편집을 확인 없이 통째로 폐기 + 재하이드레이션 성공 피드백 없음
*🟠 P2 · CONFIRMED/medium · effort M*  
`person-register-view.tsx:1146-1153, 714-730, 2027-2035`
- **문제:** RC1이 '재하이드레이션 안 함→상대 세션 무성 덮어씀'이었다면 지금은 반대로 '내 편집을 무성 폐기'다. 버튼 문구('최신 내용 불러오기')는 '보기'처럼 읽혀, 클릭 한 번에 방금 입력한 내용이 되돌릴 수 없이 날아가는 걸 사용자가 예상 못 한다. 또 재하이드레이션이 끝나도 성공 신호가 없어 '반영됐나?' 불확실.
- **권고:** ①폼이 dirty면 reload 전 confirm('불러오면 지금 입력한 변경은 사라집니다') 게이트. ②재하이드레이션 완료 시 notify.success('최신 내용을 불러왔습니다') 또는 TopAlert를 성공 톤으로 잠시 전환. ③가능하면 diff 표시는 과하므로 confirm+토스트만으로 충분.

#### [FB-4] 편집 로드 중·로드 실패(NotFound) 상태에서 외곽 제출 버튼이 계속 활성 — 죽은/조기 제출 유발
*🟠 P2 · PLAUSIBLE/low · effort M*  
`person-register-view.tsx:2038-2060; country-form-shell.tsx:925-933; pages/persons/person-edit.page.tsx:182-189`
- **문제:** 로드 실패 화면에도 '수정 완료/저장' 버튼이 활성으로 남아, 누르면 hidden 폼이 제출→validate가 빈 필드로 실패→hidden 서브트리의 aria-invalid로 스크롤·포커스 시도(무효)라 아무 반응 없이 오류만 세운다. 로드 지연 중 조기 제출 시에도 빈 값으로 검증 실패 경고가 튄다. 사용자에겐 '되긴 되는 버튼'인데 죽어 있음.
- **권고:** 두 갈래로 축소 권고. (1) 최소·자기완결 방어(최우선): handleSubmit 재진입 가드에 `if (isLoadingEdit || loadFailed) return`를 추가 — prop 배선 없이 '빈/hidden 폼 제출→무효 포커스' 경로를 뷰 안에서 직접 차단하며, canon #9(god 파일엔 배선만)와도 무충돌인 한 줄 안전망. (2) 어포던스: 4상태(idle/loading/loaded/error) 방출은 표면 과다 — 대신 단일 boolean(예: onBusyChange = isLoadingEdit || loadFailed)만 방출하고, shell SubmitBtn/페이지 푸터에서 `disabled={submitting || busy}`로 OR. loadFailed는 폼이 이미 hidden이고 NotFoundPanel의 '목록으로'가 유일 정답 액션이므로, 버튼 비활성보다 loadFailed 시 푸터 자체를 숨기는 편이 더 명료(원안의 '또는 loadFailed 시 푸터 숨김'과 일치). 요지: 새 4상태 콜백보다 handleSubmit 가드(핵심)+단일 boolean 방출(부수)이 더 작고 확실하다.</parameter>
</invoke>

#### [VIS-5] 폼-전역 오류/409 충돌(TopAlert)이 draft 안내 배너보다 시각적으로 약함 — 위계 역전
*🟠 P2 · CONFIRMED/medium · effort M*  
`person-register-view.styles.ts:508-533(TopAlert) vs 347-369(DraftBanner)`
- **문제:** 시각 위계가 뒤집혀, 사용자가 '남의 세션을 덮어쓸 수 있다'는 충돌 경고나 제출 차단 사유(가장 무거운 상태)를 놓치고, 대신 사소한 draft 힌트에 시선이 간다. 오류의 심각도를 과소평가하게 만든다(오해·데이터 손실 위험).
- **권고:** 방향은 '무게 재정렬'이되, DraftBanner를 낮추지 말 것 — 그 카드화는 자체 주석(343-345)에 남은 의도적 결정이라 낮추면 회귀다. 대신 오류를 끌어올려 error ≥ draft를 만든다: (1) TopAlert의 error 톤만 danger 틴트 카드로 격상 — 연한 danger 배경(alert.danger.bg가 transparent이므로 danger.fg의 rgba, 예 rgba(220,38,38,0.05)/dark rgba(248,113,113,0.08))+1px danger 보더+RADIUS.card+FiAlertCircle을 DraftBannerIcon급 뱃지로, 즉 DraftBanner와 동급 무게. (2) warn 톤은 현재 미사용이므로 error 톤만 손대면 부작용 없음(추후 country-stale warn 배선 시 톤 분리 유지). (3) ConflictReloadBtn도 현재 transparent라 약함 — 카드 격상 시 실질 CTA로 보이도록 대비 확보. (4) 진짜 역전 케이스는 create 모드의 일반 제출오류 vs draft 공존이며, 고립 409에도 도움. 발굴문의 데이터손실 문구는 '충돌 후 재저장이 계속 막혀 혼란/진행불가'로 정정.

#### [A11Y-14] 국가 변경 Undo 토스트가 포커스 트랩 밖 + 낭독 보장 없음
*🟡 P3 · PLAUSIBLE/low · effort M*  
`person-register-view.tsx:1186-1205; country-form-shell.tsx:625-640`
- **문제:** 모달이 열린 상태에선 포커스 트랩이 Tab을 modalRef 안으로 되돌려 6초짜리 '되돌리기' 버튼에 키보드로 도달할 수 없다. 또 커스텀 토스트 컨테이너의 role/aria-live가 보장되지 않으면 자동 삭제된 출생/사망지와 되돌리기 기회가 SR에 안내되지 않아 파괴적 자동정리를 놓친다.
- **권고:** 전제 정정: '낭독 보장 없음'은 오류 — react-hot-toast가 role=status/aria-live=polite를 기본 제공하므로 SR 통지는 이미 발생. 따라서 role=alert 부여는 불필요하고, 실제 결함은 '트랩 때문에 되돌리기 버튼이 키보드로 조작 불가(+6초 자동소멸)'뿐이다. 최선책은 발굴 권고대로 토스트 대신 폼 내부(트랩 안) 인라인 배너로 전환하되, 이미 같은 파일 2024-2036행에 선례가 있다: TopAlert role=alert + 트랩 내부 액션버튼(ConflictReloadBtn). 동일 패턴으로 '국가 변경으로 출생지·사망지를 비웠습니다 [되돌리기]' 배너를 form 안에 렌더하면 (1)트랩 안이라 키보드 도달 가능 (2)6초 강제소멸 대신 사용자가 닫거나 다음 액션까지 지속 (3)role=alert로 즉시 낭독. 스냅샷은 현재 토스트 클로저 대신 컴포넌트 state(예: clearedPlaceSnapshot)로 승격해 배너 dismiss 전까지 되돌리기 유효. 대안(더 근본적): 자동 삭제 자체를 없애고 비파괴 경고 배너('출생지·사망지가 이전 국가 기준')만 띄워 사용자가 직접 정리 → undo 레이스 자체 제거. 어느 쪽이든 god 파일엔 state 배선만, 배너 UI는 기존 TopAlert 재사용(canon 9 준수).


### 배치 6. 인라인 날짜 필드 오류·검증·접근성  
*effort M*
> inline-date-field.tsx와 life/family 배선에 집중: $error 死prop 빨강보더, AD/BC aria-pressed(floruit 미러링), 타이핑 날짜 인라인 검증(computeBirthDeathErrors 재사용), describedby, SpouseDateError→공용 FieldError, 고정폭 16px 승격, affiliation 날짜 InlineDateField 통일(adOnly). 같은 컴포넌트를 오류·aria·반응형·affiliation 통일로 한 번에.

#### [VIS-8] InlineDateField $error가 死 prop — 오류 시 날짜 입력에 빨강 보더가 안 뜸
*🟠 P2 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`inline-date-field.tsx:133-144 (스타일) · 69-96 (컴포넌트)`
- **문제:** 출생>사망 역전·혼인 종료<시작 등 오류에서 날짜 입력 필드가 시각적으로 빨갛게 표시되지 않아, 어느 날짜가 잘못됐는지 시선을 못 준다(오류 메시지만 텍스트로 있음). 시각 오류 어포던스 부재.
- **권고:** 권고의 '최소한 연도만'은 지양. 연도만 빨개지고 월·일은 중립으로 남으면 부자연스럽다. 세 DateInput(연·월·일) 모두에 $error={error}를 전달하거나 Fields 컨테이너 자체를 오류 스타일로 처리해 날짜 행 전체가 일관되게 붉어지게 한다. 겸사겸사 aria-invalid도 세 input에 동일 적용하거나 group 레벨로 올리면 접근성 일관성이 좋아진다. 단, 이미 열 단위 텍스트 오류가 있으므로 우선순위는 낮은 폴리시로 처리.

#### [FB-11] InlineDateField 오류 시 빨강 보더가 안 뜸($error 死prop) + 생몰 오류가 입력에 aria-describedby로 안 묶임
*🟠 P2 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`sections/inline-date-field.tsx:69-96,133-144; sections/life-section.tsx:191-217,251-256`
- **문제:** 출생/사망일 검증 실패 시 입력칸이 빨갛게 변하지 않아(텍스트 오류만) 어느 칸이 문제인지 시각적으로 약하다. SR 사용자는 연도 input에 포커스해도 오류 메시지가 연결돼 있지 않아 원인을 못 듣는다(배우자 행과 비대칭).
- **권고:** InlineDateField 내부에서 error를 $error로도 각 DateInput에 전달해 빨강 보더 활성화. life-section 생몰 InlineDateField에 ariaDescribedBy(fid('birth-err'))를 넘기고 FieldError에 대응 id 부여.

#### [A11Y-3] InlineDateField AD/BC 토글이 색상만으로 선택 표시 — aria 상태·role 없음
*🟠 P2 · CONFIRMED/medium · effort S*  
`inline-date-field.tsx:60-67`
- **문제:** 모든 생몰/혼인 날짜의 기원 선택이 시각(색)으로만 전달되어 스크린리더 사용자는 AD인지 BC인지 알 수 없고, 색 대비만으로 상태를 구분한다(색-단독 오류/상태 전달). 고대·BC 인물 입력 시 치명적 오독 가능.
- **권고:** 가장 가까운 자매(floruit era, 완전히 동일한 AD/BC 선택)가 이미 role="group"+aria-pressed를 쓰고, InlineDateField의 Wrap도 이미 role="group" aria-label을 갖고 있으므로, 구조 변경 없이 두 EraBtn에 aria-pressed={era === 'AD'} / aria-pressed={era === 'BC'}만 추가해 floruit와 정확히 미러링하는 것이 최소·최저위험 수정이다. (상호배타 단일선택이므로 SegmentControl처럼 role=radiogroup/role=radio+aria-checked로 바꾸는 편이 의미상 더 깔끔하지만, 그러려면 group role을 외곽 Wrap이 아니라 내부 EraToggle로 옮겨야 해 blast가 커진다 → floruit 미러링 권장.) 색-단독 근거는 보조 논거로만 취급.

#### [FB-5] 달력으로 고른 날짜만 즉시 검증되고, 인라인으로 '타이핑한' 생몰일은 제출 전까지 무검증
*🟠 P2 · CONFIRMED/medium · effort M*  
`person-register-view.tsx:1261-1315,1550-1568; sections/life-section.tsx:201-212,273-284`
- **문제:** 같은 폼에서 '달력 선택'은 미래일·역전·범위 오류를 즉시 인라인으로 알려주지만, 사용자가 연/월/일 칸에 '3000' 같은 값을 직접 타이핑하면 제출을 눌러야 비로소 오류가 뜬다. 입력 방식에 따라 피드백 타이밍이 달라 일관성이 없고, 긴 폼 하단에서 뒤늦게 되돌아와야 한다.
- **권고:** InlineDateField의 onYear/onMonth/onDay(생몰) onChange에서도 computeBirthDeathErrors를 돌려 setOrClearError('birth'/'death')로 인라인 반영(디바운스 선택). handleBirthDateSelect와 동일 경로 재사용.

#### [A11Y-10] 성별·생몰일 오류 텍스트가 컨트롤과 aria-describedby로 연결 안 됨
*🟡 P3 · PLAUSIBLE/low · effort M*  
`person-register-view.tsx:2324-2344; segment-control.tsx:53-77; life-section.tsx:216,251-256,288,344-349`
- **문제:** role=alert라 오류가 나타나는 순간 1회 낭독은 되지만, 이후 해당 컨트롤로 이동/재방문 시 describedby가 없어 '이 필드에 무슨 오류가 있는지'를 다시 못 얻는다. countryId(SelectBtn)만 제대로 연결돼 필드 간 접근성 품질이 들쭉날쭉.
- **권고:** SegmentControl에 ariaDescribedBy·error(aria-invalid) prop 추가해 radiogroup Wrap에 배선, gender 오류 id 연결. life-section birth/death InlineDateField에 ariaDescribedBy로 각 FieldError id 전달(id 부여 필요).

#### [VIS-10] 검증 오류 메시지 표현 불일치 — 혼인일 오류만 아이콘 없는 plain <p>
*🟠 P2 · CONFIRMED/low · effort S*  
`family-section.tsx:938-942 (SpouseDateError) vs _form-primitives.ts:122-135 (FieldError)`
- **문제:** 같은 검증 오류인데 한 곳만 경고 아이콘이 빠지고 들여쓰기·태그가 달라, 오류 메시지 시각 언어가 일관되지 않다(사용자가 동일한 '오류' 신호로 못 읽음).
- **권고:** SpouseDateError를 공용 FieldError로 교체(FiAlertCircle size 13 포함). 들여쓰기가 필요하면 wrapper로 margin을 주고 내부는 FieldError 그대로 사용.

#### [RESP-7] InlineDateField 연/월/일 입력이 고정 px폭(54/38/38)이라 모바일 16px 승격 시 두 자리·네 자리가 잘릴 수 있음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`inline-date-field.tsx:69-96,133-165`
- **문제:** 14px 기준으로 잡힌 고정폭이 16px에서는 콘텐츠 여유가 줄어(년 42px 남음에 '2024'≈40px, 월/일 26px 남음에 두 자리) 가운데 정렬 숫자가 살짝 잘리거나 캐럿이 가려질 수 있다. 좁은 폰에서 3칸+구분점+달력버튼이 빡빡하게 붙는다.
- **권고:** ch 단위 전면 전환은 placeholder('년') 상태에서 폭이 흔들리고 회귀위험이 있어 과하다. 가장 낮은 위험의 정합 수정은 (1) 고정폭을 소폭만 키우기: 년 54→60px, 월·일 38→44px (16px에서 4자리·2자리 슬랙 확보), 또는 (2) 좌우 패딩을 7px 6px→7px 4px로 줄여 콘텐츠 영역만 넓히기. 폰트 스케일 견고성까지 원하면 width 고정 대신 min-width를 ch 기반(년 5ch, 월·일 3ch)+box-sizing 여유 padding으로 두되 tabular-nums의 '0' 폭 기준이라 안정적이다. 아울러 모바일에서 Fields gap 4px→6px로 소폭 키워 3칸+구분점+달력버튼 밀집을 완화. 다만 impact가 low이므로 별도 착수보다 이 파일을 다른 사유로 손댈 때 묶어 처리하는 것을 권장.

#### [FLOW-8] 추가 국가 소속의 날짜는 달력 모달 전용 — 인라인 타이핑 불가, 행당 2회 모달 왕복
*🟠 P2 · PLAUSIBLE/medium · effort M*  
`shared/ui/person-register-modal/sections/country-affiliations-section.tsx:245-266, 319-331`
- **문제:** de-modalize 방향(날짜는 인라인, 달력은 보조)과 어긋난다. AD 날짜조차 시작/종료 각각 모달을 열고 캘린더를 조작해야 해 행당 2회 왕복. 고대 인물은 BC라 소속 기간을 아예 입력할 수 없다. 같은 폼 안에서 날짜 입력 조작감이 두 갈래로 갈려 예측 실패.
- **권고:** 두 갈래로 분리해 처리하라. (1) 지금 할 것(effort-M, canon-aligned): affiliation 시작/종료일을 InlineDateField로 통일해 생몰·혼인과 조작감을 맞춘다(AD 직접타이핑 + 달력=보조버튼). 단 affiliation 서버에는 era 채널이 없으므로 BC 토글을 쓸 수 있게 노출하면 저장 시 에러가 나 현재의 명시적 차단보다 UX가 나빠진다 — InlineDateField에 adOnly/disableBc 프롭을 추가하거나 affiliation 전용으로 BC 토글을 비활성/숨김 처리하고, 기존 BC 가드('서버 지원 예정' 메시지)는 방어선으로 유지. 이렇게 하면 행당 2회 모달 왕복이 사라지고 폼 전체 날짜 입력 패러다임이 일치한다. (2) 별도 트래킹(서버 선행): CountryAffiliationDto에 marriage/birth와 동일한 DateInfoDto(era/year/month/day) 구조화 채널을 추가하는 마이그레이션 — 이게 완료돼야 BC 소속기간이 실제 저장 가능. 발굴의 'BC 인물이 소속기간을 아예 못 넣는다'는 지적은 이 서버 갭을 정확히 짚었으나 UI 인라인화로 해결되는 것이 아님을 명확히 구분할 것. 결론: 단기엔 AD 일관성 스왑만, BC는 marriage 패턴을 그대로 미러링하는 별도 백엔드 작업으로.


### 배치 7. 반복행 시각 프리미티브 단일화 (_form-primitives 승격)  
*effort L*
> family·country-affiliations·nickname 세 반복 섹션이 add버튼·삭제버튼(26/32/34·× /FiTrash2/FiX)·카드 tint·focus-visible 링·모바일 16px를 제각각 bespoke로 구현. _form-primitives에 AddRowBtn/RowRemoveBtn/RepeatRowCard/inputFocusMixin/mobileInputFontMixin을 단일 정의로 승격해 세 섹션이 공유 — 파편화를 코드로 봉인(canon9). 표면 넓고 회귀 테스트 필요.

#### [VIS-1] 별칭 '추가' 버튼이 공용 AddRowBtn 규약을 이탈(bespoke AddBtn)
*🟠 P2 · CONFIRMED/low · effort S*  
`sections/nickname-section.tsx:225-247 vs _form-primitives.ts:274-300`
- **문제:** AddRowBtn 주석이 명시적으로 '국가 소속·배우자 슬롯이 제각각(솔리드 indigo vs dashed primary)이라 하나로 통일'한다고 적었는데, 별칭 AddBtn이 정확히 그 폐기 대상인 'dashed primary→solid indigo' 변형을 되살렸다. 같은 화면 안에서 '행 추가' 버튼이 두 가지 색·크기·hover로 나타나 통일 규약이 깨진다.
- **권고:** nickname-section의 AddBtn 정의를 삭제하고 다른 반복행처럼 `import { AddRowBtn }`으로 교체(children=`<FiPlus size={16}/> 별칭 추가`). 아이콘 크기도 16으로 통일.

#### [VIS-2] 반복행 삭제 버튼이 섹션마다 3종(크기·아이콘·모양·hover 제각각)
*🟠 P2 · PLAUSIBLE/low · effort M*  
`family-section.tsx:836-857, country-affiliations-section.tsx:407-426, nickname-section.tsx:205-223`
- **문제:** 동일 의미(행 삭제)인데 크기 3종(26/32/34)·아이콘 3종(× 글리프/FiTrash2/FiX)·모양 2종(원형/사각)·hover 3종이라 반복행 UI가 '중구난방'으로 보이고, 사용자가 삭제 버튼을 매번 다시 학습해야 한다.
- **권고:** _form-primitives에 공용 RowRemoveBtn 하나(예: 28×28 r8 투명, FiTrash2 15, hover 연한 danger 틴트+danger.fg) 승격 후 세 섹션이 재사용. 아이콘·크기·모양·hover를 한 값으로 고정.

#### [VIS-3] 반복행 카드 표현이 섹션마다 상이(카드 없음/서로 다른 tint·padding)
*🟠 P2 · PLAUSIBLE/low · effort M*  
`family-section.tsx:799-808, country-affiliations-section.tsx:356-367, nickname-section.tsx:118-125`
- **문제:** '편집 가능한 행들의 목록'이라는 동일 패턴이 (a)테두리 카드, (b)미묘하게 다른 tint·padding의 카드, (c)카드 없음 3가지로 제각각이라 세 반복 섹션의 시각 리듬이 어긋난다. 특히 별칭만 카드가 없어 '행 경계'가 약하다.
- **권고:** 반복행 카드 스펙(padding·radius·bg tint)을 _form-primitives의 단일 RepeatRowCard로 통일하고 세 섹션이 동일 컨테이너를 사용. 별칭도 카드로 감싸 경계 부여.

#### [VIS-4] bespoke input/select들이 focus-visible 링을 안 그림(키보드 포커스 가시성 불일치)
*🟠 P2 · CONFIRMED/medium · effort M*  
`life-section.tsx:644-647, family-section.tsx:922-925, country-affiliations-section.tsx:391-394 & 493-496, nickname-section.tsx:155-158 & 179-182 & 195-199`
- **문제:** 같은 폼 안에서 어떤 컨트롤은 포커스 시 뚜렷한 indigo 링이 뜨고, 어떤 컨트롤은 얇은 보더 색 변화만 있어(게다가 native outline까지 제거) 키보드 사용자가 현재 포커스 위치를 놓치기 쉽다. focus-visible 링 canon(focusRing.primary)이 절반만 적용됐다.
- **권고:** 원안(모두 `:focus-visible`로 통일 + box-shadow focusRing.primary)은 방향은 맞으나 한 가지 정밀화가 필요. 이 폼의 지배 표준인 공용 FormInput(form-input.tsx)은 텍스트 인풋에 대해 `:focus`(비-visible)로 링을 그린다 — 텍스트 인풋은 클릭 포커스에서도 링이 보이는 편이 자연스럽기 때문. 따라서 텍스트 인풋(FloruitYearInput·country NoteInput·nickname NameInput·ReasonInput)은 `:focus` 유지한 채 `box-shadow: focusRing.primary`만 추가해 FormInput과 정확히 일치시키고, select(SpouseRankSelect·country TypeSelect·nickname TypeSelect)는 `:focus`/`:focus-visible` 어느 쪽이든 링 추가. 강제화는 발굴 제안대로 _form-primitives.ts에 `inputFocusMixin`(theme, error?) 하나를 추출해 border-color + box-shadow(에러 시 focusRing.danger, FormInput의 $error 분기와 동일) + `&:hover:not(:focus)` 톤까지 담아 이들 bespoke input/select가 재사용하도록 하는 것이 canon(단일 정의) 원칙에 부합. ReasonInput은 dashed→solid 전환 기존 동작 보존. 링 색은 하드코딩 말고 theme.colors.focusRing 토큰 경유(표면 하드코딩 금지 규약과 동일 정신).

#### [RESP-3] 여러 bespoke 입력·셀렉트가 iOS 16px 줌방지 가드를 누락해 모바일 포커스 시 화면 확대
*🟠 P2 · CONFIRMED/medium · effort S*  
`life-section.tsx:634-648, country-affiliations-section.tsx:380-395,483-497, nickname-section.tsx:133-159,186-203, family-section.tsx:911-926`
- **문제:** iOS Safari는 16px 미만 입력에 포커스하면 페이지를 자동 확대한다. 활동시기 연도·소속 비고·별칭 이름/이유·혼인 서열 같은 필드를 탭할 때마다 화면이 줌인되고, 블러 시 원복도 안 돼 폼 전체가 뒤틀린다. 같은 폼 안에서 어떤 입력은 줌되고 어떤 입력은 안 되어 체감이 더 나쁘다.
- **권고:** 이 bespoke 입력/셀렉트들에도 `@media (max-width:768px){ font-size:16px }`를 추가한다. 반복을 막으려면 _form-primitives에 mobileInputFontMixin(또는 공용 select 프리미티브)을 만들어 일괄 적용.

#### [IA-10] '두 개의 폼' 인상 — OptionalSeam 위(라벨→컨트롤 행)와 아래(카드형 반복행)의 시각·상호작용 모델 급변
*🟡 P3 · PLAUSIBLE/low · effort L*  
`shared/ui/person-register-modal/sections/country-affiliations-section.tsx:203-306`
- **문제:** seam을 경계로 폼의 시각 언어와 상호작용 모델이 정갈한 필드에서 카드형 리스트 편집기로 확 바뀌어, 사용자에게 '아래는 다른 폼/다른 도구'라는 단절감을 준다(인지 연속성 저하). 밀도가 갑자기 올라가 아래 구역이 더 어렵게 느껴진다.
- **권고:** 원안('상단 필드와 연속성 높여 두 폼 인상 완화')은 방향이 부정확·과공수(L). 단일 컨트롤(상단)과 다속성 반복 엔티티(카드)는 의미상 다른 것이라 억지 동일화는 그룹핑 어포던스를 해쳐 회귀 위험. 대신 실제로 groundable한 불일치에 재조준(공수 S~M): (1) 두 카드 변형 토큰 통일 — RowCard(bg #fafafa / dark rgba(255,255,255,0.02))와 SpouseRowCard(bg rgba(0,0,0,0.015) / dark rgba(255,255,255,0.03))가 지금 서로 다르니 공용 'repeating-row card' 토큰/믹스인 하나로 수렴; (2) 반복 리스트 일관성 — 진짜 불일치는 seam 위/아래가 아니라 카드(국가·배우자) vs 비카드(nickname)이므로 nickname 반복행도 같은 규약으로 맞추거나 셋 다 동일 시각언어로 통일; (3) 카드 좌측 인셋을 FieldControl 컬럼 리듬에 정렬해 열 정렬만 맞춤; (4) 카드 그룹핑 어포던스는 유지(평탄화 금지).


### 배치 8. 진입점 패리티 (페이지 vs 모달)  
*effort L*
> person-edit.page가 모달 대비 결손: 섹션 내비 부재, 좌우 거터 0, 제출버튼 반경/크기·진척 인디케이터·저장중 문구·제출 라벨 상이, autosave 힌트 없음, 이탈경고 draft 미인지, h2 제목 없이 h3 시작. 대부분 page 진입점 전용 styled/문자열 정렬 + 뷰가 이미 emit하는 sections 재사용이라 한 배치로 두 진입 모드를 동형화.

#### [IA-5] 페이지(수정) 모드엔 좌측 섹션 인덱스가 아예 없음 — 가장 긴 폼에 내비게이션 부재
*🟠 P2 · PLAUSIBLE/medium · effort M*  
`pages/persons/person-edit.page.tsx:151-193`
- **문제:** 값이 가득 찬 수정 폼은 6개 섹션 마커에 걸쳐 매우 길어지는데, 정작 그 긴 폼을 다루는 페이지 모드에 섹션 내비게이션이 없다. 사용자는 특정 항목(예: 배우자, 국가 소속)을 찾으려 전체를 스크롤해야 해 수정 시나리오의 인지부하가 모달보다 크다(진입점 간 어포던스 비대칭).
- **권고:** 부품은 이미 존재 — PersonRegisterView가 onSectionsChange로 4챕터를 emit(1937-1977)하고 DOM에 data-form-section 앵커(basic/life/affiliation/family)가 모드 무관하게 렌더된다. 따라서 페이지에서 onSectionsChange를 받는 것 자체는 자명하나, 셸의 scroll-spy는 내부 고정높이 스크롤 컨테이너에 묶여 있어 재사용 불가다. 구체안: (a) 페이지에 경량 섹션 내비를 신설 — FormHeader 아래 sticky 가로 '점프 칩' 행(4챕터)이 전폭 페이지 레이아웃에 side-rail보다 값싸고 자연스러움. (b) 클릭 시 data-form-section 앵커로 scrollIntoView, 활성 섹션은 IntersectionObserver(윈도 스크롤 기준)로 산출. (c) 모달과 동일하게 <768px에선 숨겨 데스크톱/태블릿 한정 동등화. (d) canon#9(성장 억제) 준수: spy 로직은 sections/ 또는 shared 훅으로 추출해 셸과 공유(윈도/컨테이너 양쪽 스크롤을 파라미터화)하고 god 파일엔 상태 배선만. 범위가 부담이면 MVP는 (a)+(b) 칩 행만으로도 모달과의 내비 격차를 대부분 해소.

#### [RESP-12] 페이지 모드(person-edit)는 좌우 거터가 0 — FormSectionInner 수평 패딩 0 + FormScroll 래퍼 부재로 입력이 카드 가장자리에 붙음(모바일에서 특히 심각)
*🟠 P2 · CONFIRMED/medium · effort M*  
`register-form-layout.styles.ts:115-120, person-edit.page.tsx:142-193, country-form-shell.tsx:374-393`
- **문제:** 페이지 모드(/persons/create·:id/edit)에서는 폼 필드가 카드 좌우 가장자리에 밀착한다. 모바일에서는 카드가 화면 폭을 거의 채우므로 입력·라벨·hero가 화면 양끝에 딱 붙어 읽기·탭이 불편하고, 모달 모드와 시각적으로도 어긋난다.
- **권고:** 원안의 "FormCardWrapper에 패딩 추가" 및 "FormScroll 유무로 분기"는 부정확하니 조정. (1) FormCardWrapper는 heads-of-state/position-definitions/global-heads 위젯도 공유하므로(register-form-layout 소비처 4곳) 여기에 수평 패딩을 주면 그 폼들이 이중 패딩/오정렬로 blast된다 — 공유 셸은 건드리지 말 것. (2) 모달 경로(CountryFormShell+FormScroll)와 페이지 경로(person-edit.page+FormCardWrapper)는 완전히 분리된 렌더 트리라, 거터를 페이지 진입점에만 넣으면 이중 패딩이 원천적으로 불가능하다 — 'FormScroll 유무 분기'는 불필요한 과설계. (3) 최소·안전 수정: person-edit.page.tsx에서 <PersonRegisterView>를 감싸는 페이지 전용 styled 컨테이너를 신설해 `padding: 0 32px; @media (max-width:768px){ padding: 0 16px }`를 부여(모달 FormScroll의 32/16과 동일 수치로 두 진입 모드 정렬 통일). FormSectionInner의 수평 0은 그대로 유지(두 경로 모두 부모가 거터를 담당하는 규약 보존). 이렇게 하면 FormHeader(28)·StickyFooter(20) 인셋과도 시각적으로 조화된다.

#### [VIS-6] 진입점(페이지 vs 모달)별 제출 버튼·필수 진척 인디케이터 시각 상이
*🟠 P2 · PLAUSIBLE/low · effort M*  
`person-edit.page.tsx:182-189 & 227-238 vs country-form-shell.tsx:409-437 & 481-498`
- **문제:** 동일한 '인물 등록/수정' 액션이 진입점에 따라 반경(12 vs 8=RADIUS.control)·글자크기(13 vs 14)가 다른 primary 버튼으로 보이고, 진척 인디케이터도 dots vs bars로 다르다. person-edit.page 주석은 'ProgressLabel과 동형'이라 주장하지만 실제 모양(점 vs 막대)이 달라 주장과 시각이 어긋난다.
- **권고:** 제출 버튼을 canon RADIUS.control(8)·14px·theme 토큰으로 통일(페이지도 shell SubmitBtn 톤 재사용). 진척 인디케이터도 한쪽(막대 세그먼트) 형태로 통일해 두 진입점의 푸터를 실제로 동형화.

#### [FB-7] 페이지 신규 등록 모드는 draft 자동 저장이 도는데 '자동 저장됨' 표시가 전무(AutoSaveStatus는 죽은 export)
*🟡 P3 · PLAUSIBLE/low · effort S*  
`pages/persons/person-edit.page.tsx:161-189; person-register-view.styles.ts:608-617; person-register-view.tsx:1055-1066`
- **문제:** 페이지에서 입력하면 draft가 조용히 쌓이는데 사용자는 '저장 중'이라는 신호를 못 받는다(모달과 비대칭). 나중에 draft 복원 배너만 갑자기 뜨면 '언제 저장됐지' 혼란. 죽은 AutoSaveStatus는 원래 이 자리를 채우려던 흔적으로 보인다.
- **권고:** 모달의 AutoSaveHint는 실제로 savedAt을 쓰지 않고 draftEnabled&&isDirty에서 정적 '자동 저장됨'만 보여준다(country-form-shell:910-915). 따라서 draft.savedAt을 새 콜백으로 페이지까지 배선하는 대신, 모달 방식을 그대로 미러링해 죽은 AutoSaveStatus(styles.ts:609)를 살려 페이지 StickyFooter(person-edit.page:161)에서 (!personId && isDirty)일 때 정적으로 렌더하면 된다 — 페이지엔 이미 isDirty state와 personId가 스코프에 있어 추가 배선 0. RequiredProgress가 margin-right:auto로 좌측을 점유하므로 AutoSaveStatus는 그 옆(또는 RequiredProgress와 SubmitButton 사이)에 배치. 모달과 시각 일치를 위해 FiCloud size=12 아이콘도 함께. savedAt 기반 상대시각까지 원하면 별도 onDraftSavedChange 콜백을 PersonRegisterView→page로 신설해야 하나, P3 parity 목적엔 정적 미러가 최소·정합.

#### [COPY-7] 신규 등록 페이지 이탈 경고가 draft 저장 사실과 모순 — 모달은 고쳐졌으나 page는 미반영
*🟠 P2 · CONFIRMED/low · effort M*  
`pages/persons/person-edit.page.tsx:61-76, 119-124; widgets/country/country-form/ui/country-form-shell.tsx:604-609`
- **문제:** 신규 등록은 페이지에서도 draft가 켜져(!isEditMode) 내용이 임시 저장되는데, 페이지 경고만 ‘저장하지 않은 변경사항’이라고 단언한다. 모달에서 이미 바로잡은 모순이 페이지에는 그대로 남아, 사용자가 불필요하게 이탈을 망설이거나 안내를 신뢰하지 못한다.
- **권고:** 권고의 방향(신규=draft-aware 분기, 수정=현 문구 유지)은 맞으나 '모달과 정확히 통일'은 부정확하니 교정: (1) 대상은 두 confirm() 사이트뿐 — useBlocker effect(63)와 handleCancel(75). beforeunload(119-124)는 커스텀 텍스트를 넣어도 최신 브라우저가 무시(returnValue='')하므로 손대지 말 것. (2) 분기 기준은 페이지가 이미 가진 personId 유무로 파생(const draftActive = !personId). (3) 신규 문구는 모달의 draft 안심 문구를 쓰되 지면 맥락에 맞게 동사만 조정 — 페이지는 '닫기'가 아니라 라우트 이탈이므로 '입력 내용은 임시 저장되어 다음에 이어서 작성할 수 있습니다. 나가시겠습니까?'. 모달의 '닫으시겠습니까?'를 글자 그대로 복사하지 말 것. (4) 수정 모드는 현 '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?' 유지. (5) 문구가 이제 셸+페이지 2곳에 복제되니, draft-aware/일반 메시지 쌍을 공용 상수로 추출해 재드리프트를 예방하면 더 좋음(effort 소폭 증가하나 M 범위 내).

#### [COPY-8] 동일 동작인데 제출 버튼 문구가 진입점마다 다름(수정: ‘수정 완료’ vs ‘저장’ / 등록: ‘인물 등록’ vs ‘등록’)
*🟠 P2 · PLAUSIBLE/low · effort S*  
`widgets/country/country-list/ui/person-register-view-modal.tsx:102; pages/persons/person-edit.page.tsx:33; shared/ui/person-register-modal/person-register-view.tsx:1918-1920`
- **문제:** 같은 인물을 같은 방식으로 저장하는 버튼이 진입 경로에 따라 다른 동사로 표기된다. 특히 수정에서 ‘수정 완료’와 ‘저장’은 뉘앙스가 달라 일관된 제품 어휘가 아니다.
- **권고:** 등록/수정 제출 문구를 한 세트로 통일(예: 등록=‘인물 등록’, 수정=‘수정 완료’ 또는 등록=‘등록’, 수정=‘저장’). 뷰가 계산하는 라벨을 단일 출처로 삼아 모달·페이지가 같은 값을 쓰게 한다.

#### [COPY-13] ‘저장 중’ 진행 문구·생략부호가 화면마다 제각각(저장 중입니다… / 저장 중… / 저장 중…)
*🟡 P3 · PLAUSIBLE/low · effort S*  
`widgets/country/country-form/ui/country-form-shell.tsx:862, 932; shared/ui/person-register-modal/person-register-view.tsx:1917-1919, 2064`
- **문제:** 한 번의 제출 동안 오버레이는 ‘저장 중입니다...’, 버튼은 ‘저장 중...’으로 ‘입니다’ 유무가 다르고, ASCII ‘...’와 유니코드 ‘…’가 섞여 있다. 미세하지만 동시에 보이는 요소라 완성도가 떨어져 보인다.
- **권고:** 문구를 하나의 규약으로 통일하는 방향 자체는 타당(S). 다만 근거는 "동시 노출 ASCII/유니코드 혼용"이 아니라 두 가지로 정정해야 함: (a) 모달 경로에서 오버레이 `저장 중입니다...`와 버튼 `저장 중...`이 실제로 함께 보이며 `입니다` 유무가 어긋난다(둘 다 ASCII), (b) 코드베이스 전반에 ASCII `...`(shell)와 유니코드 `…`(view)가 혼재하나 한 화면엔 공존하지 않는다. 조치: 생략부호는 유니코드 `…`로 통일하고, shell의 SubmittingBox(862)·SubmitBtn(932)을 `저장 중…`으로 맞춰 `입니다`를 제거해 오버레이/버튼 문형을 일치시킬 것. 단 country-form-shell은 현대/역사국가 등록 모달도 공유하는 셸이므로 이 두 리터럴 변경은 인물 모달을 넘어 국가 모달들의 제출 문구까지 함께 바꾼다 — 공용 상수(예: SUBMITTING_LABEL='저장 중…')로 중앙화해 회귀면을 좁히는 편이 안전.

#### [A11Y-12] 페이지 모드에서 h1/h2 없이 h3(CoreSectionLabel)부터 시작 — 헤딩 레벨 건너뜀
*🟡 P3 · CONFIRMED/low · effort S*  
`person-register-view.styles.ts:227-236; person-edit.page.tsx:144-160`
- **문제:** 스크린리더의 heading 탐색(H 키)에서 페이지 최상위 맥락(예: '인물 수정') heading이 없고 곧장 h3로 진입해 레벨을 건너뛴다. 랜드마크/제목 순서가 깨져 긴 폼의 구조 파악이 어렵다.
- **권고:** 권고 두 옵션 중 (b) '페이지 모드에서 CoreSectionLabel을 h2로 낮추기'는 채택하지 말 것 — CoreSectionLabel은 모달 모드(ModalTitle h2 존재 → 섹션 h3가 정답)와 공유되는 canon 컴포넌트라, 모드 의존 as/prop을 뚫어야 하고 그래도 '인물 등록/수정' 페이지 최상위 랜드마크는 여전히 없다. 대신 (a)를 채택하되 모달을 그대로 미러링: person-edit.page의 FormHeader에 이미 export된 FormHeaderTitle(styled.h2, register-form-layout.styles.ts:42)을 삽입하고 텍스트는 편집/신규 분기(페이지가 이미 계산하는 submitLabel의 personId ? '저장' : '등록' 로직 재사용해 '인물 수정'/'인물 등록')로 준다. 그러면 페이지 모드가 모달과 동일한 h2(제목)→h3(CoreSectionLabel) 위계를 얻어 폼 본체 내 레벨 스킵이 사라지고, 공유 컴포넌트를 건드리지 않아 회귀 위험이 0에 가깝다. (h1로 올리면 h1→h3로 오히려 h2를 스킵하므로, canon이 고정한 섹션 h3와 정합하려면 제목은 h2가 맞다.)


### 배치 9. 카피 톤·용어 통일 (문자열 위주)  
*effort S*
> 순수 리터럴 정합으로 로직 무변경·회귀0: 임시/자동 저장 통일, 비고/메모/설명 통일, 프로필사진/썸네일 통일, 존댓말 문체 혼용(hint·seam), 없음/미분류/선택안함, 사망 '일자 미상'→'사망(일자 미상)', 국적 피커 제목. 일부는 공용 셸 문자열이라 공용 상수 중앙화로 재드리프트 예방. 제품/카피 톤 결정이 걸린 항목만 확정 대기.

#### [COPY-1] ‘국적’ 필드가 여는 모달 제목이 ‘소속 국가 선택’ — 필드명과 불일치 + 추가소속 피커와 동일 제목
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2349-2351, 2604-2612, 2636`
- **문제:** ‘국적’(nationality)과 ‘소속 국가’(affiliation)는 이 폼 안에서 명확히 구분되는 별개 개념인데(주 국적 vs 다중 소속), 정작 국적을 고르는 창이 ‘소속 국가 선택’이라고 떠 용어가 뒤섞인다. 더구나 주 국적 피커와 추가-소속 피커가 완전히 같은 제목이라, 여러 창을 오가다 보면 지금 무엇을 고르는 중인지 구분되지 않는다.
- **권고:** 주 국적 피커 title을 `"국적 선택"`(또는 최소 `"국가 선택"`)으로, 추가 소속 피커는 `"소속 국가 선택"` 유지해 두 창을 제목으로 구분. 필드 라벨(국적)과 창 제목을 같은 축의 용어로 맞춘다.

#### [COPY-2] 한 힌트의 두 분기에서 존댓말 문체 혼용(‘…되었습니다.’ 합쇼체 ↔ ‘…있어요.’ 해요체)
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2372-2376`
- **문제:** 동일한 위치·동일한 컴포넌트에서 상태만 바뀌었는데 말투가 ‘습니다체 ↔ 요체’로 튄다. 한 필드를 조작하는 동안 문체가 오락가락해 완성도가 낮게 느껴진다.
- **권고:** 이 슬롯은 필드 바로 옆 인라인 안내(토스트/notify가 아님)이므로 온보딩 목소리인 해요체로 슬롯 전체를 통일하는 게 자연스럽다: 선택됨 분기 '역사 국가(과거)를 선택했어요.' / 미선택 분기 '과거 국가(예: 잉글랜드 왕국)는 선택 창의 ‘역사 국가’ 탭에서 고를 수 있어요.' 동시에 세 표기('역사(과거) 국가'·'과거 국가'·'역사 국가')를 실제 선택 창 탭 라벨과 같은 '역사 국가'로 수렴하고 (과거) 병기는 한 번만. 단, 팀이 '시스템 피드백은 합쇼체' 전역 규칙을 우선한다면 반대 방향(둘 다 합쇼체: '…선택되었습니다.'/'…고를 수 있습니다.')도 동등하게 유효 — 어느 쪽이든 '한 슬롯 한 문체'만 지키면 됨. 어느 방향이 전역 카피 규약에 맞는지는 제품/카피 결정 사항이라 단독 채택보다는 카피 톤 정리 배치에 묶어 처리 권장.

#### [COPY-3] OptionalSeam 한 문장 안에서 종결어미 혼용(‘…정보예요’ + ‘…등록해도 됩니다’)
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2517-2519`
- **문제:** 이 seam은 접기를 대체해 ‘여기까지면 끝’을 알리는 핵심 안내 카피인데, 한 문장에서 말투가 바뀌어 눈에 걸린다.
- **권고:** 문장 내 종결어미를 통일하되 두 방향의 트레이드오프를 명시할 것. (A) seam의 의도된 '따뜻한 안심 유도' 톤을 살리려면 둘째 절만 해요체로: '여기까지가 인물 기본 정보예요 · 아래 소속·가족은 선택이라 지금 등록해도 돼요' — 첫 절 '예요'가 의도적 warmth였다고 보면 이게 최소수정이자 seam 성격(지시성 에러 카피와 구별되는 부드러운 곁말)에 부합. (B) 모달 전반의 합쇼체(…없습니다/…됩니다/…해 주세요)와 정렬하려면 '…기본 정보입니다 · …등록해도 됩니다'. 앱 전역 톤 일관성만 보면 (B), seam 고유의 부드러운 어조 보존을 우선하면 (A). 둘 중 하나로 확정(현 혼용 상태만 아니면 됨).

#### [COPY-6] 같은 draft 기능을 ‘임시 저장’과 ‘자동 저장’ 두 용어로 혼용
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2010; widgets/country/country-form/ui/country-form-shell.tsx:911-913, 606-609`
- **문제:** 동일한 localStorage draft를 두고 어떤 화면은 ‘자동 저장’, 어떤 화면은 ‘임시 저장’이라 부른다. 사용자가 푸터에서 ‘자동 저장됨’을 본 뒤 재방문 시 ‘임시 저장된 내용’ 배너를 만나면 서로 다른 기능인지 헷갈린다.
- **권고:** 어휘를 '임시 저장'으로 통일(배너·복원·닫기확인이 이미 그 표현). 단 푸터를 단순히 '임시 저장됨'으로 바꾸면 라이브/연속 저장 뉘앙스가 사라지므로 '임시 저장 중'이 더 적합(진행형 상태 유지). 함께 tooltip도 '입력 중인 내용을 자동 저장 중'→'입력 중인 내용을 임시 저장 중'으로 수정. 주의: AutoSaveHint는 공유 CountryFormShell(shell:516,911-913)에 있어 이 변경은 인물뿐 아니라 현대/역사국가 등록 폼 푸터에도 적용된다(교차 폼 정합성상 바람직하나 의도된 파급인지 확인). styles.ts:608 주석·변수명(AutoSaveHint, '자동 저장 인디케이터')·shell:67,516 주석은 내부 표기라 필수는 아니나 함께 정리하면 일관.

#### [COPY-9] ‘없음/미분류’ 빈 옵션 라벨이 세 가지로 갈림(유형 없음 / 미분류 / 선택 안 함)
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/nickname-section.tsx:71; shared/ui/person-register-modal/sections/family-section.tsx:490; shared/ui/person-register-modal/person-register-view.tsx:552, 559`
- **문제:** ‘선택하지 않음/분류 없음’이라는 같은 의미를 세 가지 다른 말로 표기해 폼 내 어휘 일관성이 떨어진다.
- **권고:** 한 표현으로 통일. 드롭다운 빈 선택은 ‘선택 안 함’, 분류 미지정은 ‘미분류’로 규약을 정하고 그 규약대로 별칭 유형도 ‘미분류’(또는 ‘선택 안 함’)로 맞춘다.

#### [COPY-10] 프로필 이미지를 ‘프로필 사진 / 썸네일 / 프로필’ 세 용어로 혼용
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2091, 2100, 2133, 2149-2153`
- **문제:** 같은 이미지를 ‘프로필 사진’으로 올렸는데 지우는 버튼은 ‘썸네일 제거’다. 사용자·스크린리더 입장에서 두 용어가 같은 대상인지 즉시 연결되지 않는다.
- **권고:** 사용자 대면 명칭을 '프로필 사진'으로 통일하되 pending 상태 라벨은 그대로 둔다. 구체적으로 (1) 2153 버튼 텍스트 '썸네일 제거'→'프로필 사진 제거', (2) 2149 aria-label도 동일하게 '프로필 사진 제거'로, (3) pendingThumbnailFile 분기의 '선택 취소'/'선택한 이미지 취소'는 유지(업로드 확정 전 취소라 의미가 다름). '썸네일'/'thumbnail'은 변수·주석 등 내부 식별자에만 남긴다. 부수적으로 2100 img alt='프로필'은 아바타 이미지 특성상 namePreview(인물 이름)가 있으면 그것을, 없으면 '프로필 사진'을 쓰는 편이 스크린리더에 더 유용하다(선택사항). effort S, 순수 문자열 치환이라 회귀 위험 없음.

#### [COPY-12] 사망 3-way의 ‘일자 미상’ 라벨이 ‘사망했음’ 전제를 숨겨 생존 여부 미상으로 오독 가능
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/life-section.tsx:295-322`
- **문제:** ‘생존 중/사망’과 나란히 놓인 ‘일자 미상’은 무엇의 일자인지, 생사 자체가 미상이라는 뜻인지 모호하다. 특히 바로 위 출생 열에 ‘출생일 미상’ 토글이 따로 있어 혼선이 커진다.
- **권고:** 세그먼트 라벨을 '일자 미상' → '사망 (일자 미상)'으로. '사망'과 어근을 공유해 둘 다 사망 상태이며 차이는 '일자 인지 여부'임을 드러내는 게 핵심(그룹 aria-label '사망 여부'와도 정합). 제안된 '몰년 미상'은 (1) 역사 용어라 일반 사용자에게 다소 낯설고 (2) '년'만 지시해 실제로 월/일까지 입력 가능한 필드 의미를 좁히므로 지양. 부수로, 이 옵션이 '생사 자체 미상(fate unknown)'을 뜻하지 않는다는 점도 이 라벨링으로 함께 해소됨(현 UI는 생사미상 표현 수단이 없음). disabled 입력 placeholder(life-section.tsx:287 disabledLabel '일자 미상')는 이미 사망 열 문맥이라 그대로 두거나 동일 문구로 정렬해도 무방.

#### [COPY-14] 자유 텍스트 노트를 ‘비고’와 ‘메모’ 두 용어로 혼용
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/country-affiliations-section.tsx:285; shared/ui/person-register-modal/sections/life-section.tsx:457, 484`
- **문제:** 같은 폼의 같은 성격(선택 자유 서술) 필드를 ‘비고’와 ‘메모’로 다르게 불러 어휘 일관성이 없다.
- **권고:** 범위를 최소로: country-affiliations-section.tsx의 `placeholder="비고 (선택)"` → `"메모 (선택)"`, 같은 줄 aria-label(283) `비고` → `메모`로 통일(생애·가족 note가 이미 '메모' 계열이라 이쪽을 정본으로). 단 확장 주의 두 가지 — (a) family-section의 배우자 노트는 aria-label이 `설명`(509)이고 placeholder는 예시문(515)이라 제3의 용어 '설명'도 혼재하니 함께 '메모'로 맞추려면 이것도 손대야 완결됨. (b) nickname-section의 `"이 별칭이 붙은 이유·유래 (선택)"`(100)은 자유 노트가 아니라 의미상 '이유' 필드이므로 통일 대상에서 제외. 덤으로 life:484 `"사망 메모 (논란·맥락·비고)"`의 예시 속 '비고'는 통일 후 중복이니 제거 고려. 코드 로직 변화 0, styled 무관, tsc/lint 영향 없음.


### 배치 10. 이름 필드 정정 + 발견성 scent (라벨·힌트)  
*effort M*
> 필수 별표 오귀속(htmlFor/aria-required를 name에 귀속, placeholder 홍→길동)과 '기능이 힌트/disclosure에 숨음' 부류를 묶음: 역사국가 국적 scent, 군주 호칭 nudge, floruit 무입력 상태 안내, 출생'지'→출생'국가' 라벨, 배우자 서열 라벨 노출, 별칭 범위(출생명·자·호) FieldHint, 국가↔소속 토큰 정리. 대부분 sections 내 라벨/FieldHint 추가라 S~M·발견성 직접 개선.

#### [COPY-5] ‘성 · 이름 · 중간이름*’ 필수표식이 세 필드 전체에 걸려 성·중간이름도 필수로 오인
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2167-2170`
- **문제:** * 위치상 ‘성·이름·중간이름’ 전체가 필수로 읽힌다. 사용자가 성·중간이름까지 반드시 채워야 하는 줄 알고 외자·단일명·성 미상 인물에서 막히거나 억지 입력하게 된다(설계 의도와 정반대).
- **권고:** 필수 표식을 ‘이름’에만 귀속. 예: 라벨을 ‘이름*·성·중간이름’ 순으로 바꾸거나, ‘성 · 이름* · 중간이름’처럼 별표를 이름 뒤에 붙이고 보조문구 ‘(이름만 필수)’ 추가.

#### [DISC-7] '성 · 이름 · 중간이름 *' 라벨의 필수 별표가 어느 필드가 필수인지 오도
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2168-2200`
- **문제:** 세 필드를 한 라벨로 묶고 별표를 하나 달아 두면, 사용자는 성·중간이름도 필수라고 오인한다. 성이 없는(또는 미상) 인물에서 불필요한 마찰이 생기고, '왜 성을 비웠는데 넘어가지'라는 혼란도 준다.
- **권고:** 라벨 재배치보다 '귀속 정정'이 정공법. (a) FieldLabel htmlFor를 fid('surname')→fid('name')으로 바꿔 라벨/필수마커를 실제 필수 필드에 연결하고, name 입력에 aria-required="true" 추가. (b) 시각적으로는 Required 점을 공유 라벨 끝이 아니라 '이름' 입력에 국소 귀속(예: 각 입력 위 마이크로 라벨 또는 name 입력 인접에 점 배치). 셋을 한 줄에 두는 InlineFields 클러스터 레이아웃은 유지(canon 정합). (c) 최소 변경만 원하면 라벨 옆에 짧은 가시 힌트 '이름만 필수 · 성/중간이름 선택'(FieldHint)만 추가해도 오해가 크게 준다. 접근성상 (a)의 aria-required + htmlFor 정정이 핵심.

#### [COPY-4] 이름(given name) placeholder ‘홍길동’은 풀네임 → 성 placeholder ‘김’과 합치면 ‘김 홍길동’(성 2개)
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2172-2199`
- **문제:** 필드가 성/이름/중간이름으로 쪼개져 있는데 ‘이름’ 칸 예시에 풀네임 ‘홍길동’을 넣어, 성 칸 ‘김’과 함께 읽으면 ‘김 홍길동’이라는 성 두 개짜리 조합이 된다. 사용자가 이름 칸에 성까지 다시 적을 소지가 크다(발견성·정확성 저하). 중간이름 placeholder는 라벨을 그대로 반복해 예시 역할을 못 한다.
- **권고:** 새 이름쌍을 발명하기보다 잘 알려진 앵커 '홍길동'을 필드에 맞게 올바로 분해하는 편이 예시로서 더 강함: 성 placeholder=\"홍\", 이름 placeholder=\"길동\" → 미리보기가 '홍길동'으로 정확히 조립되면서 친숙한 샘플명을 유지. (대안: 성 \"김\" 유지 시 이름은 \"영희\"/\"길동\"으로 정합.) 중간이름 placeholder는 라벨 반복 대신 빈 문자열('')로 둘 것—기본 표시순서가 동양식(한국)이라 중간이름이 없는 게 정상이고, 'D.' 같은 서양식 예시를 넣으면 한국식 성/이름 예시 세트와 충돌하므로 비워두는 게 깔끔. namePreview·getPersonDisplayName 로직은 무변경, placeholder 문자열만 교체하는 S 규모.

#### [DISC-2] 신규 군주 등록 시 '군주 호칭' disclosure의 정보 scent가 없음
*🟠 P2 · PLAUSIBLE/medium · effort M*  
`shared/ui/person-register-modal/sections/life-section.tsx:493-510; person-register-view.tsx:1006-1011`
- **문제:** 군주가 많은 역사 DB인데도, 새 왕/황제를 입력하는 사용자는 묘호·시호·군주명을 넣을 곳을 '생애 상세'를 끝까지 펼쳐 disclosure 제목을 읽기 전엔 발견하지 못한다. 영영 안 눌릴 위험이 크고, 등록 단계에서 누락돼 나중에 수정으로만 채워진다.
- **권고:** canon(필드단위 disclosure 보존)을 지키되 발견 신호를 추가: 가문(dynasty)이 선택되거나 군주정 성격의 역사 국가가 국적으로 선택되면 disclosure 헤더에 '군주라면 호칭도 입력하세요' 배지/nudge를 띄우거나 1회 auto-open한다. 또는 disclosure 설명문에 예시(예: '루이 14세, 世宗')를 넣어 scent를 강화.

#### [DISC-3] 활동시기(floruit)는 출생·사망을 '둘 다 미상'으로 토글해야만 나타남
*🟠 P2 · PLAUSIBLE/medium · effort S*  
`shared/ui/person-register-modal/sections/life-section.tsx:357-405`
- **문제:** 생몰을 모르지만 활동 연대는 아는 고대·중세 인물이 floruit의 정확한 대상인데, 사용자는 '출생일 미상' 토글 + 사망 3-way의 '일자 미상'을 각각 켜야 이 입력이 나타난다는 조합을 알 길이 없다. 한쪽만 미상으로 둔 사용자는 활동시기 기능의 존재 자체를 영영 모른다.
- **권고:** scent 위치를 '한쪽만 미상'이 아니라 '두 날짜 필드가 모두 공백 + 두 미상 토글 모두 off'인 초기/무입력 상태로 한정한다. LifePairGrid 아래에 subtle 인라인 한 줄(예: "생몰년을 모르시나요? 각각 '미상'으로 두면 활동시기(예: 15세기)로 대신 기록할 수 있어요")을 노출해 게이트 도달 경로 자체를 설명·안내한다. 반대로 한쪽만 미상인 상태에서는 힌트를 띄우지 말 것 — 사용자가 실제로 아는 날짜를 버리도록 유도하는 부작용이 있다. 추가로(별도 이슈지만 같은 사각지대): edit 모드에서 저장된 floruit 값이 있는데 생몰 한쪽이 채워져 있으면 게이트가 닫혀 저장값이 화면에서 보이지도 편집되지도 않으므로(1762 코멘트대로 표시 무시·저장 보존), 그 경우엔 floruit 블록을 강제 노출하거나 최소한 "저장된 활동시기 있음" 힌트를 띄워 은닉 데이터를 드러내는 편이 안전하다.

#### [DISC-4] '출생지' 입력 경로가 두 곳으로 갈려 어느 쪽인지 scent 없음
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/sections/place-fields.tsx:57-72; sections/country-affiliations-section.tsx:48-54`
- **문제:** '출생지를 어디에 넣지?'라는 사용자에게 두 경로가 경쟁한다. 도시 vs 국가 단위 구분이 라벨만으로 드러나지 않아, 한 곳에만 넣거나 중복 입력하고, 데이터 일관성이 깨진다(정보 scent 충돌).
- **권고:** 최우선(가장 저비용·정확도 향상): 소속 섹션의 옵션 라벨 '출생지'를 '출생 국가'로 변경(country-affiliations-section.tsx:49). 그 드롭다운은 '추가 국가 소속' 안에서 CountrySelectModal로 '국가'를 고르는 자리이므로 '출생지'는 오히려 부정확한 라벨 — '출생 국가'가 도메인상 더 맞고, 이것만으로 평이한 '출생지'는 생애 상세의 도시 필드 하나로 귀속돼 충돌이 해소된다. 동시에 line 188 힌트도 "주 국적 외 출생 국가·복무·망명·이중국적…"으로 맞추고, 필요 시 "도시 단위 출생지는 '생애 상세'에서 입력"이라는 교차 안내 한 줄을 추가. place-fields의 '출생지'에 '(도시)'를 붙이는 건 canon 7이 지정한 1차·최다사용 필드에 군더더기를 더하므로 선택적/후순위 — 소속측 리네이밍만으로도 목적 달성. (도시 필드는 이미 국적 스코프로 국가가 암시되므로 굳이 명시 불필요.)

#### [DISC-5] 배우자 '서열'(정실·계비·후궁)이 토글 라벨에 광고되지 않음
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/sections/family-section.tsx:479-501,527-529`
- **문제:** 일부다처 역사 인물(왕·귀족)의 배우자 서열은 핵심 정보인데, 토글 라벨이 '혼인일·메모'만 말하고 '서열'을 언급하지 않는다. 서열을 기록하려는 사용자는 이 토글이 그 입력을 품고 있다는 scent를 못 받아 펼치지 않는다.
- **권고:** family-section.tsx:528 라벨을 '혼인 정보(혼인일·서열·메모) 추가'로 변경(펼침 블록의 3개 필드군 혼인시작/종료·서열·note를 모두 커버). 원안의 '접힌 상태에서 서열 배지 요약 표시'는 폐기: rowHasMeta(line 160)가 row.rank를 포함하고 showMeta(line 389)가 rowHasMeta면 자동 펼침이라, rank가 설정된 행은 언제나 펼쳐진 상태 → 접힌 채 rank를 가진 행은 발생 불가(unreachable). 접기 버튼도 !rowHasMeta 조건(519)이라 rank 있는 행은 애초에 접을 수 없음. S-effort 라벨 수정 범위에서 rank를 자동펼침 트리거에서 분리하는 것은 과함이므로 배지 아이디어는 제외.

#### [DISC-8] 역사(과거) 국가를 국적으로 고르는 경로가 tertiary 힌트 한 줄에만 의존
*🟠 P2 · PLAUSIBLE/medium · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2348-2377`
- **문제:** 역사 인물 중심 DB에서 '과거 국가를 국적으로'는 매우 흔한 경로인데, 유일한 발견 신호가 눈에 잘 안 띄는 회색 힌트다. 힌트를 놓친 사용자는 현대 국가 탭에서 원하는 나라를 못 찾고 막히거나(잉글랜드 왕국 부재) 부정확한 현대 국가로 대체한다.
- **권고:** 버튼 자체에 scent를 넣는다. 예: placeholder를 '국가 선택 (현대·역사)'로 바꾸거나, 버튼 옆에 작은 '역사 국가' 보조 배지/링크를 두어 모달의 역사 국가 탭 존재를 열기 전에 알린다. 현재 힌트는 유지하되 톤/아이콘을 올려 가시성 강화.

#### [DISC-10] 별칭 섹션이 담는 범위(출생명·자·호·필명)가 접힌 드롭다운에만 있어 scent 부족
*🟠 P2 · CONFIRMED/medium · effort S*  
`shared/ui/person-register-modal/sections/nickname-section.tsx:56-113`
- **문제:** 개명 인물의 '출생명', 동아시아 군주의 '자/호'를 넣을 전용 필드를 찾는 사용자는, 그 정보가 '별칭'에 속한다는 scent를 받지 못한다(전용 birthName 컬럼 대신 nickname.type로 정식화한 설계라 더욱 비직관적). 결국 해당 데이터가 등록에서 누락된다.
- **권고:** nickname-section.tsx 안(canon9: 섹션 소유) '별칭' FieldLabel 아래에 register-form-layout의 기존 FieldHint를 상시 노출: 예 "출생명·아명·자(字)·호·필명도 여기에서 유형을 골라 등록해요." 전용 필드가 없어 가장 비직관적인 '출생명'을 문구 앞머리에 두는 게 scent 효과 최대. 보조로 NameInput placeholder를 "별칭"→"별칭·출생명·자·호…"로 넓혀 인라인 힌트를 추가. FieldHint는 이미 이 모달(person-register-view.tsx:2372)에서 쓰는 canon-정합 프리미티브라 bespoke 마커 없음. 원안의 '드롭다운 기본 반개방/프리셀렉트'는 채택 금지(native select 반개방 불가·특정 type 프리셀렉트는 오입력 주입 위험).

#### [IA-12] '국가'가 두 곳에 분산 — 필수 국적(신원)과 추가 국가 소속(소속 챕터)이 갈려 인덱스 라벨이 오도
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2349-2377`
- **문제:** 인덱스 라벨에 '…· 국가'가 있으니 사용자는 국적(필수)을 그 챕터에서 찾으려 하지만, 필수 국적은 위쪽 '신원'에 있다. '주 국적'과 '추가 국가 소속'의 관계·위치가 라벨만으로는 구분되지 않아 어디서 국가를 다루는지 혼동을 준다.
- **권고:** 단일 최소변경으로 충분: 좌측 인덱스 라벨과 매칭 본문 CoreSectionLabel(1964·2524)의 '가문 · 종교 · 국가'에서 필수 국적과 충돌하는 토큰 '국가'만 '소속'으로 바꿔 '가문·종교·기타 소속'(또는 '가문·종교·소속')으로 조정한다. 원한다면 대칭을 위해 필수 필드 라벨 '국적'(2350)을 '주 국적'으로 리네임. '주 국적 외' 힌트는 country-affiliations-section.tsx:188에 이미 상시 노출되므로 새 힌트 추가는 불필요 — 최상위 인덱스 토큰 하나만 모호성 제거하면 된다. 코어/소속 분리 구조나 CoreSectionLabel 스타일은 건드리지 말 것.


### 배치 11. scroll-spy·인덱스 정합 + IA/반응형 저위험 정리  
*effort M*
> 인덱스 라벨≠본문 헤더, 死 pulse, stale 브레이크포인트로 인한 태블릿 숫자배지 퇴화(RESP-1 확정), 터치 인덱스 라벨, 모바일 인덱스 부재, OptionalSeam 리워딩·스택, 푸터 오버플로, 필수-먼저 연속성 등 인덱스/시임/반응형 CSS 다발. 대부분 셸·styles의 미디어쿼리/문구 조정이라 함께 실사하며 처리. IA-1/IA-3 등 낮은 impact는 실사 후 종결 판단.

#### [IA-4] 좌측 scroll-spy 인덱스 라벨('기본 정보'·'생애')이 화면 헤딩('이름'·'신원'·'생몰'·'생애 상세')과 불일치
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:1938-1972`
- **문제:** scroll-spy의 목적은 '지금 어디, 무엇이 남았나'를 한눈에 주는 인지지도인데, 인덱스를 클릭해 이동하면 도착지 헤딩 문구가 라벨과 달라('기본 정보' 클릭 → '이름' 도착) 사용자가 매핑을 다시 해야 한다. 헤딩 6개 vs 인덱스 4개의 개수·명칭 불일치가 오히려 부하를 늘린다.
- **권고:** 두 리터럴 옵션(라벨 개칭 / 상위 헤딩 추가) 모두 우산-명명 의도 또는 canon-4(h3 재도입 금지)와 마찰하므로 그대로 채택 금지. 대안 두 갈래: (1) '아무것도 바꾸지 않음' — ToC는 섹션 헤딩보다 굵은 입도를 갖는 정상 패턴이고 4챕터 축소가 의도이므로, 라벨≠도착헤딩을 수용. 이 프레이밍이면 사실상 non-issue. (2) 정합을 원한다면 affiliation/family가 '이미 따르고 있는 1챕터=1CoreSectionLabel 패턴'에 basic/life도 맞추는 것이 일관된 유일한 방향: basic 챕터 최상단에 '기본 정보', life 최상단에 '생애' 단일 CoreSectionLabel을 두고, 현행 이름/신원·생몰/생애 상세는 full CoreSectionLabel이 아닌 더 가벼운 인라인 서브구분으로 강등 — 새 헤딩 tier 없이 모든 인덱스 라벨이 동일 텍스트 헤딩에 도착. 단 이는 이름/신원·생몰/생애상세의 스캐닝 구분을 희석하고 effort는 S가 아니라 M이며 canon(섹션마커 CoreSectionLabel 표준)과의 경계가 미묘하므로, 시각 실사 없이 착수 금지. 결론 권고: severity를 P2→P3로 낮추고, 실행 전 데스크톱 실제 클릭 UX를 관찰해 (1)로 종결할지 판단.

#### [COPY-11] 인덱스 라벨(‘기본 정보’·‘생애’)이 본문 헤더(‘이름’·‘신원’·‘생몰’)와 불일치해 착지 지점이 혼란
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:1940-1948, 2074, 2311, 2385`
- **문제:** 인덱스에서 ‘생애’를 눌러 이동하면 화면 상단 라벨은 ‘생몰’로 떠, 방금 클릭한 항목과 도착지 제목이 달라 순간적으로 방향을 잃는다. ‘가문·종교·국가’·‘가족’은 헤더와 일치하는데 ‘기본 정보’·‘생애’만 어긋난다.
- **권고:** 인덱스 라벨과 본문 CoreSectionLabel을 같은 문구로 정합. 예: basic 챕터 첫 헤더를 ‘기본 정보’로, life 챕터 첫 헤더를 ‘생애’로(현재 ‘생몰’은 하위 소제목으로) 맞추거나, 인덱스 라벨을 실제 헤더(‘이름’·‘생몰’)에 맞춘다.

#### [VIS-12] 섹션 인덱스 클릭 pulse가 死 어포던스 — data-anchor-pulse를 소비하는 CSS 없음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`country-form-shell.tsx:731-737`
- **문제:** 인덱스 항목을 클릭하면 스크롤만 되고 어디로 이동했는지 시각적 pulse 확인이 전혀 없다. 의도된 시각 피드백이 무동작이라, 특히 짧은 섹션으로 점프 시 '이동됐다'는 확신을 못 준다.
- **권고:** 두 갈래 중 택1이되, scroll-spy가 이미 착지 피드백을 주므로 '제거'를 우선 권고: (A) 미사용 데드코드로 판단되면 733·735행 set/removeAttribute 두 줄만 제거(setTimeout 포함) — 가장 저위험. (B) 디자이너가 flash를 원하면, 셸의 스크롤 컨테이너 styled에 `& [data-form-section][data-anchor-pulse]{ animation: anchorPulse .7s ease }` + `@keyframes anchorPulse`로 배경/box-shadow를 잠깐 강조하되 색은 하드코딩 금지·theme 토큰 사용(canon8), 그리고 smooth 스크롤과 병행되므로 `@media (prefers-reduced-motion: reduce)` 가드로 애니메이션 무력화. 원안의 'pulse 0.7s'는 키프레임 미정의·색 하드코딩 위험이 있어 위와 같이 구체화 필요.

#### [RESP-1] 태블릿 좌측 인덱스가 961~1100px에서 불필요하게 숫자배지 모드로 축소됨 (뷰포트 미디어쿼리 ↔ 960px 고정폭 모달 불일치)
*🟠 P2 · CONFIRMED/medium · effort S*  
`country-form-shell.tsx:108, 203-206, 264-269`
- **문제:** 모달 실제 폭(960px)은 160px 라벨 인덱스를 넣고도 800px 본문이 남아 여유가 충분한데, 판정을 뷰포트로 하는 바람에 라벨이 사라져 '기본정보/생애/가문/가족'을 숫자 1·2·3·4로만 표시한다. 넓은 화면에서 오히려 내비게이션 가독성이 퇴화한다.
- **권고:** 근인은 컨테이너 쿼리 부재가 아니라 '모달 폭 1100px→960px 축소 시 미갱신된 stale 브레이크포인트'다(헤더 주석 line 5-6 "너비 1100px" 잔존이 증거). 최소 침습 정공법: 세 곳의 `@media (max-width:1100px) and (min-width:769px)` 블록(Body 203-206, SideIndex 264-269, SideIndexItem 334-339)을 제거한다. 모달이 `min(960px,96vw)`로 상한 고정된 이상 라벨 인덱스는 뷰포트 769px(모달 738px, 본문 578px)까지 항상 들어가고, 100vw로 바뀌는 ≤768px에서는 기존 `@media (max-width:768px){display:none}`이 이미 인덱스를 통째로 숨기므로 태블릿 숫자배지 단계 자체가 불필요하다. 함께 헤더 주석의 "너비 1100px"를 960px로 정정. 향후 이 셸이 가변폭이 될 가능성을 대비하려면 축소 판정을 뷰포트가 아닌 컨테이너 쿼리(모달 폭 기준, 브레이크포인트 ~768px)로 옮기는 것이 이상적이나, 현재 폭이 상수 상한이라 미디어쿼리 삭제만으로 충분하며 country/historical-country 등 모든 소비 모달에 균일하게 안전하다.

#### [RESP-2] 터치 태블릿에서 숫자배지 인덱스에 라벨이 없어 섹션 이동이 발견 불가 (title 툴팁은 터치에서 안 뜸)
*🟠 P2 · PLAUSIBLE/low · effort M*  
`country-form-shell.tsx:264-268, 831-843`
- **문제:** iPad 등 터치 태블릿은 hover가 없어 title 툴팁이 표시되지 않는다. 사용자는 벌거벗은 숫자 '2'가 어느 섹션인지 알 수 없어, 인덱스를 눌러 점프하는 기능이 사실상 발견 불가능해진다(터치가 주 입력인 기기에서 정확히 무력화).
- **권고:** 폭 기반 숨김을 포인터 인지 규칙으로 바꾸고 접근명을 보강하는 저비용 조합을 권장한다: (1) 버튼(831)에 `aria-label={item.label}`를 부여해 라벨 span 표시 여부와 무관하게 접근명을 항상 보존(스크린리더·터치 모두 즉효, effort S). (2) 라벨 span을 `display:none` 대신 visually-hidden(clip) 기법으로 바꿔 AT 트리에는 남기되 시각만 감춤. (3) 터치 시각 발견성은 폭이 아니라 `@media (hover: none), (pointer: coarse)`로 판정해, 이 경우 배지 아래에 2~3자 축약 캡션을 세로 스택으로 노출(예: '기본'·'생애'·'가문'·'가족'). 이렇게 하면 마우스 태블릿(hover 가능, 1024px)은 기존 배지-only 유지, 실제 터치 기기에서만 캡션이 붙어 배지 anchor 의도를 해치지 않으면서 발견성을 회복한다. 대안으로 원안의 '상단 스텝퍼 대체'는 신규 레이아웃 도입 비용이 커서 이 밴드 한정 문제엔 과설계이므로 지양.

#### [DISC-11] 모바일(<768px)에서 좌측 섹션 인덱스가 완전히 사라져 챕터 발견 map 부재
*🟡 P3 · PLAUSIBLE/low · effort M*  
`widgets/country/country-form/ui/country-form-shell.tsx:258-274`
- **문제:** 데스크톱에선 좌측 인덱스가 '어떤 챕터가 있고 어디쯤인지' 발견 map을 준다. 모바일에선 그 map이 통째로 없어져, 사용자는 긴 폼을 끝까지 스크롤하지 않으면 하위 챕터(가문·종교·국가, 가족)와 그 안의 입력구 존재를 발견하지 못한다.
- **권고:** 모바일에서도 최소한의 챕터 내비게이션을 제공한다. 예: 헤더 하단에 가로 스크롤 chip 형태의 챕터 점프 바, 또는 각 CoreSectionLabel을 sticky mini-header로 만들어 현재 위치·다음 챕터를 암시.

#### [IA-1] 필수 3개 중 성별·국적이 선택적 '이름 상세'(원어·뜻·별칭) 뒤로 밀려 비연속
*🔴 P1 · PLAUSIBLE/medium · effort M*  
`shared/ui/person-register-modal/person-register-view.tsx:2167-2378`
- **문제:** 이 리디자인의 핵심 목표(canon #1: '필수를 앞에 모으고')가 실제로는 절반만 달성됐다. 최소 등록만 하려는 사용자는 이름을 넣은 뒤 원어·뜻·별칭이라는 벽을 지나야 성별·국적에 도달하고, 필수 3개가 한 덩어리로 읽히지 않아 '어디까지 넣어야 등록되나'가 흐려진다. 좁은 뷰포트에서는 성별·국적이 첫 화면 밖으로 밀려 필수인지 인지 못 할 수 있다.
- **권고:** 원안의 '원어·뜻·별칭을 OptionalSeam 근처로 이동'은 채택 금지(name-cluster 발견성 훼손). 대신 최소침습: '신원'(CoreFieldPair 성별·국적) 블록만 이름 FieldRow(2236) '바로 아래'로 끌어올려 필수 3개를 연속 배치하고, 이름 원어·이름의 뜻·별칭은 신원 바로 뒤에 그대로 두어 여전히 '기본 정보' 챕터 안·이름 인접권에 유지(OptionalSeam까지 밀지 않음). 이러면 required-first 연속성과 name-cohesion을 동시에 만족. 다만 성별·국적이 이미 '신원' 아이브로우로 라벨링돼 두 클러스터(이름/신원)가 각각 스캔 가능하다는 점에서 순이득은 제한적이므로, effort 대비 우선순위는 P2로 낮추고, 대안으로는 코드 변경 없이 필수 스캔성 강화(예: 성별·국적 라벨 * 강조 유지 확인 + 제출 시 첫오류 스크롤 동작 유지)만으로도 상당부분 해소됨을 병기.

#### [IA-3] '표시 순서' 3탭 세그먼트가 이름 바로 아래 상시 노출 — 니치 컨트롤이 필수 도달을 지연
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2209-2234`
- **문제:** 대다수 사용자는 표시 순서를 건드리지 않는데, 이름을 막 입력한 시점(성별도 아직 안 고른 시점)에 '왜 지금 표시 순서를 정해야 하지?'라는 전문가용 결정이 필수 흐름 한복판에 끼어 인지 마찰을 만든다. canon의 보호 disclosure 목록(이름의 뜻·군주 호칭)에 포함되지 않는 컨트롤이라 강등 여지가 있다.
- **권고:** 완전 접기(default 접힘 disclosure)는 권장하지 않는다 — 이 컨트롤이 hero namePreview를 구동하는 프리뷰이자, 이력상 데이터 손상을 낳았던 name-order 발견성 어포던스이기 때문이다. 만약 노출 무게를 낮춘다면: (a) 해소된 표시순서를 '읽기 프리뷰'로는 항상 보이게 유지하고(예: 이름 아래 경량 한 줄 "표시: 성·이름 · 변경"), 3-way 오버라이드 세그먼트만 '변경' 텍스트 토글 뒤로 접어 커스터마이즈 필요자만 펼치게 한다(기능·프리뷰 보존 + 마찰 완화). (b) 또는 primaryCountryId가 아직 비어 국가 기본이 premature하게 '성·이름'으로 보이는 초기 순간에만 세그먼트를 접고 국가/성별 컨텍스트가 생기면 노출하는 조건부 렌더. 다만 impact가 low이고 프리뷰 가치가 실재하므로, 실사용 혼란 근거가 없다면 현행 유지가 무난하다.

#### [IA-7] OptionalSeam이 거대한 '생애' 챕터 뒤에 있어 생몰·생애상세 전체를 '필수처럼' 오독시킴
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:2517-2519`
- **문제:** '여기까지=기본 정보, 아래=선택'을 사용자는 자연히 '위=필요, 아래=선택'으로 읽는다. 생몰·생애상세는 전부 선택인데 seam이 이들을 필수 구역으로 오인시켜, 최소 등록만 원하는 사용자가 불필요한 입력 압박을 느낀다.
- **권고:** 실제 필수 경계인 '신원' 직후에 경량 안심 신호(예: '필수는 여기까지 — 나머지는 언제든 추가')를 두고, 현재 seam 문구는 '인물 개인 정보 / 소속·가족 관계'처럼 내재정보 vs 관계정보의 그룹 경계로 리워딩해 '필수' 오독을 없앤다.

#### [IA-8] 사망 정보 분산 — 사망 유형(essentials)과 사망 상세 원인·메모(details)가 출생상세·장소 divider로 갈라짐
*🟠 P2 · PLAUSIBLE/low · effort M*  
`shared/ui/person-register-modal/sections/life-section.tsx:413-490`
- **문제:** '사망 유형=암살'을 고른 사용자가 원인 상세를 적으려면 출생지/사망지와 출생 메모를 지나 한참 아래로 스크롤해야 한다. 개념적으로 한 몸(사망: 유형·원인·메모)인 입력이 섹션 경계로 쪼개져 근접성(proximity) 원칙이 깨지고 발견성이 낮다.
- **권고:** essentials/details 구조를 유지하되 사망 관련 필드(유형·원인·메모)를 연속 배치한다 — 예: 사망 상세(원인·메모)를 사망 유형 바로 아래(essentials 말미)로 올리거나, 최소한 출생상세/장소가 그 사이에 끼지 않도록 순서를 조정. canon #2(점진 노출)와 무관.

#### [RESP-8] 모달 오픈 시 첫 필드 자동 포커스가 모바일에서 키보드로 상단(hero·이름)을 가림
*🟡 P3 · PLAUSIBLE/low · effort S · (직전리뷰 중복)*  
`country-form-shell.tsx:648-660`
- **문제:** 프로그램적 포커스를 존중하는 모바일 브라우저(안드로이드 Chrome 등)에서는 오픈 즉시 소프트 키보드가 올라와 상단 hero(썸네일·이름 미리보기)와 이름 입력 일부를 가린다. 첫인상에서 폼 맥락을 못 보고 바로 타이핑 상태로 던져진다.
- **권고:** effect 전체를 coarse-pointer 가드로 감싸 터치 기기에서는 자동포커스를 아예 생략하는 것이 가장 단순·안전하다: useEffect 진입부에서 `if (window.matchMedia?.('(pointer: coarse)').matches) return` 후 기존 setTimeout 유지. (matchMedia 미지원 환경 폴백 위해 optional chaining.) '지연 후 focus만 하고 키보드 억제'식 조건화는 브라우저별 신뢰불가하니 채택하지 말 것 — coarse에서는 focus 자체를 건너뛰는 편이 명확하다. 데스크톱(fine pointer)은 현행 동작 그대로 첫 필드 포커스 유지. 부수 효과로 검증실패 자동스크롤/포커스 effect(664-686)는 손대지 말 것(그건 사용자 제출 액션 이후라 gesture 맥락이 다르고 필요기능임). 우선순위는 낮게: 다른 P1/P2 정리 후 곁다리로.

#### [RESP-9] OptionalSeam 긴 한국어 캡션이 좁은 폰에서 2~3줄로 줄바꿈되며 양옆 hairline이 0에 수렴
*🟡 P3 · PLAUSIBLE/low · effort S*  
`person-register-view.styles.ts:296-313, person-register-view.tsx:2517-2519`
- **문제:** 320~375px 폰에서 캡션이 2~3줄로 접히면서 양옆 hairline이 거의 0폭으로 눌려, '필수/선택 경계선'이라는 시각 신호(중앙 hairline)가 사라지고 그냥 긴 문장 블록처럼 보인다. canon이 지키려던 seam 표식이 모바일에서 무력화.
- **권고:** 캡션을 짧게 축약(예: '아래는 선택 항목')하려면 두 개의 문구 span을 브레이크포인트로 토글해야 해 DOM/카피가 이원화되니 지양. 대신 파일에 이미 있는 `@media (max-width:640px)` 패턴을 재사용해 OptionalSeam에만 CSS-only 세로 스택 규칙을 추가하는 것이 최소침습이며 canon 부합: `@media (max-width:640px){ flex-direction:column; gap:8px; &::before,&::after{ flex:none; width:100%; } }`. column 전환 시 cross축 align-items:stretch(기본)로 pseudo가 전폭으로 늘어나고, flex:none으로 세로 성장(flex:1의 height 폭주)을 막아 캡션 위/아래 풀폭 1px rule 두 줄이 유지된다 → 좁은 폭에서도 '경계선' 신호 보존, 단일 DOM·단일 카피. (대안으로 pseudo에 `min-width:16px`만 줘도 hairline 완전소멸은 막지만, 텍스트가 여전히 전폭에 가까워 좌우 rule이 짧은 토막으로만 남아 세로 스택보다 신호가 약함.)

#### [RESP-10] 모달 푸터 FooterStatus(진척칩+자동저장됨)가 축소·줄바꿈 없이 좁은 폰에서 취소/제출 버튼과 겹칠 수 있음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`country-form-shell.tsx:395-407,439-445,910-915`
- **문제:** 신규 등록(draftEnabled) 중 dirty 상태면 진척칩과 '자동 저장됨'이 동시에 뜨는데, ~320px에서 취소+'인물 등록' 버튼 폭을 제하면 상태 영역이 부족해 텍스트가 잘리거나 버튼과 시각적으로 붙는다.
- **권고:** 좁은 폭(≤400px)에서 '자동 저장됨' 힌트를 숨기거나 진척 라벨을 아이콘/축약으로 바꾸고, FooterStatus 자식에 overflow/ellipsis를 부여한다.

#### [RESP-11] 배우자 혼인정보 영역의 고정 30px 좌측 들여쓰기가 좁은 폰에서 폭을 크게 잠식
*🟡 P3 · PLAUSIBLE/low · effort S*  
`family-section.tsx:860-865,884-889,938-942`
- **문제:** 320px 폰에서 카드 패딩(12×2)+들여쓰기 30px를 빼면 가용폭이 ~266px로 줄어, wrap된 두 InlineDateField와 서열 셀렉트가 더 빡빡하게 접히고 혼인 메모 textarea도 좁아진다. 데스크톱 정렬용 고정 들여쓰기가 모바일에서 손해로 작용.
- **권고:** 권고의 전제 중 2가지를 먼저 정정: (a) textarea는 들여쓰기 밖이라 손댈 필요 없음, (b) 날짜필드는 고정폭이라 들여쓰기를 줄여도 wrap 배치가 바뀌지 않음 — 따라서 "필드가 덜 빡빡해진다"는 효과는 기대하지 말 것. 남는 순수 여백 회수만 노린다면, bespoke 변수 신설(모바일/데스크톱 분기 재도입) 대신 코드베이스에 이미 있는 반응형 관례를 재사용해 최소 개입: SpouseRowMeta/SpouseMetaToggle/SpouseDateError의 30px 들여쓰기를 `@media (max-width: 480px){ padding-left:0; margin-left:0 }`로만 해제(메타 블록을 배지정렬 대신 카드 풀폭으로 낙하). 단, 이 변경은 오버플로 해소가 아니라 미세 여백 확보에 불과하므로 우선순위는 낮게 두고, 실제 320px 실측에서 가로스크롤이 관측될 때만 착수 권장.


### 배치 12. A11Y 구조 + 터치 타깃  
*effort M*
> 라디오 패턴 완성(SegmentControl roving tabindex·화살표키, 공용 컴포넌트라 성별·표시순서·사망여부 3곳 동시 개선), 썸네일 키보드 업로드 경로(sr-only 포커스가능 input), 모달 닫힘 시 트리거 포커스 복원, 배우자 disclosure aria-expanded, 22px 父/母/配 trio 히트박스 확대. 구조적 접근성이라 스크린리더/키보드 실측과 함께.

#### [A11Y-1] SegmentControl radiogroup에 화살표키·roving tabindex 없음 — 라디오 패턴 미완성
*🟠 P2 · PLAUSIBLE/medium · effort M · (직전리뷰 중복)*  
`segment-control.tsx:60-77; person-register-view.tsx:2324-2337; life-section.tsx:295-323`
- **문제:** WAI-ARIA radiogroup은 '그룹이 하나의 탭 스톱 + 화살표로 라디오 이동(roving tabindex)'이 규약인데, 여기선 화살표키가 무반응이고 Tab을 옵션 수만큼 눌러야 그룹을 통과한다. 스크린리더는 role=radio로 '2/3개 중 1번째' 식으로 안내하지만 실제 화살표 조작이 먹지 않아 낭독과 동작이 어긋나 키보드 사용자가 혼란·과잉 Tab에 노출된다.
- **권고:** SegmentControl에 중앙집중 키보드 핸들러 추가: role=radiogroup Wrap에 onKeyDown으로 ArrowRight/Down→다음, ArrowLeft/Up→이전(순환), Home/End→처음/끝, 이동 시 disabled 옵션은 건너뛰고 onChange+새 항목 focus. 선택된 항목만 tabIndex=0·나머지 -1(roving tabindex)로 그룹을 단일 탭 스톱화. native button이 이미 Enter/Space를 처리하므로 활성화 핸들러는 그대로 두고 focus만 선택을 따라가면 됨. life-section의 Segmented3Way는 setDeathStatus가 이미 'alive'|'deceased'|'unknown' 단일값을 받으므로 value 매핑만 하면 SegmentControl로 흡수 가능 — 흡수해 중복 제거 권장. 주의: '추정' 등 aria-pressed 단일 토글 버튼(life-section:325-339)과 disclosure 토글은 radiogroup 멤버가 아니므로 그대로 button 유지(라디오 처리 대상 아님). 또한 view:2320의 data-field-error 래퍼(제출 오류 스크롤 타깃)와 roving focus가 충돌하지 않는지 확인.

#### [A11Y-2] 프로필 사진 드롭존에 키보드 업로드 경로 자체가 없음
*🟠 P2 · CONFIRMED/medium · effort M*  
`person-register-view.tsx:2076-2115,2157-2164; person-register-view.styles.ts:110-112`
- **문제:** 드래그앤드롭·클릭·붙여넣기만 지원되고, label도 file input도 포커스를 못 받아 키보드/스크린리더 사용자는 프로필 사진을 올릴 방법이 전혀 없다(대체 경로 부재 = 기능 완전 차단). aria-label='프로필 사진 업로드'가 있어도 도달 불가라 死라벨.
- **권고:** 옵션(b) 권장: ThumbnailUploadInput을 display:none 대신 '시각적 숨김이되 포커스 가능'(sr-only: position:absolute; width:1px; height:1px; opacity:0; overflow:hidden; clip-path/clip; display 유지)으로 바꾼다. 이러면 input이 탭 순서에 들어가고 Space/Enter로 네이티브 파일 대화상자가 열려 onKeyDown JS가 아예 불필요(브라우저 기본동작). 포커스 링은 ThumbnailCircle에 `&:focus-within { outline: 2px solid theme.colors.primary; outline-offset: 2px; }`(또는 box-shadow 링)을 추가해 시각 표식 확보. 접근가능 이름은 현재 label의 aria-label이 input으로 항상 전파되지 않으니 input에도 aria-label='프로필 사진 업로드'를 직접 부여(input의 aria-describedby='person-thumbnail-hint'는 이미 있어 좋음). 이 방식이 label에 role='button' tabIndex=0 + onKeyDown(input.click())을 붙이는 안보다 코드가 적고, label↔input 네이티브 클릭 전달과의 이중 발화 위험도 없다. onDrop/paste 기존 포인터 경로는 그대로 유지.

#### [A11Y-9] 모달 닫힘 시 트리거 요소로 포커스 복원 없음
*🟡 P3 · CONFIRMED/medium · effort M · (직전리뷰 중복)*  
`country-form-shell.tsx:601-614,765,942`
- **문제:** 모달을 닫으면 포커스가 body로 떨어져 키보드 사용자는 목록의 '인물 등록' 버튼 등 원래 위치를 잃고 처음부터 Tab 해야 한다. 모달 접근성 기본(트리거 복원) 미충족.
- **권고:** isOpen 진입 시 openerRef=document.activeElement 저장, 언마운트/close 시 openerRef?.focus()로 복원(cleanup에서).

#### [A11Y-11] 배우자 '혼인 정보' disclosure 토글에 aria-expanded/controls 없음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`family-section.tsx:519-531,860-882`
- **문제:** 스크린리더 사용자는 이 버튼이 접기/펼치기 컨트롤인지, 현재 펼쳐졌는지 알 수 없어 혼인일·서열·메모 영역의 존재/상태를 놓친다. 폼 내부 disclosure 규약이 일관되지 않아 학습성도 저하.
- **권고:** 두 SpouseMetaToggle 렌더 사이트(family-section.tsx:520 접기, :527 추가) 모두에 aria-expanded={showMeta}만 추가하라 — showMeta(:388)가 두 분기 스코프에 모두 있어 접힘/펼침을 정확히 반영(접기 분기는 true, 추가 분기는 false). 이것만으로 AdvancedToggle·InlineSearchSelect와 aria-expanded 규약이 일치한다. 원안의 aria-controls는 빼거나 별도로 취급하라: 현재 코드베이스에 aria-controls 사용처가 전무하고 AdvancedToggle 패턴도 aria-expanded 전용이며 SpouseRowMeta(:884)에 id가 없다. aria-controls를 굳이 넣으려면 SpouseRowMeta에 fid(`spouse-${index}-meta`) 같은 안정 id를 먼저 부여해 연결해야 하고, 이는 '패턴 재사용'이 아니라 신규 규약 도입임을 명시할 것. 핵심 파리티 픽스는 aria-expanded 한 줄×2.

#### [RESP-6] 44px 미만 터치 타깃 다수 — 최근등록 父/母/配(22px)·배우자 삭제(26px)·닫기(28px)·날짜지우기
*🟠 P2 · PLAUSIBLE/low · effort M*  
`family-section.tsx:757-780,836-857, country-affiliations-section.tsx:470-481, country-form-shell.tsx:174-192`
- **문제:** WCAG/모바일 권장 최소 타깃(44×44)에 크게 못 미친다. 특히 최근등록 칩의 22px 父/母/配 3연속 버튼은 손가락으로 정확히 골라 누르기 어려워 엉뚱한 슬롯에 인물이 배정될 수 있다(가족 관계 오입력). 삭제·닫기도 오탭 위험.
- **권고:** 범위를 22px 父/母/配 trio로 좁혀라. 시각 글리프 크기(22px)는 그대로 두고 각 RecentSlotBtn에 ::before 투명 히트박스 또는 음성 margin 상쇄 padding으로 실제 탭 영역을 최소 24px(WCAG 2.5.8 AA 최소 타깃 크기)로 확대하고, RecentChipActions의 gap을 2px→6~8px로 늘려 중심간 거리를 확보한다. 드롭다운 통합안은 채택하지 말 것 — "빠른 슬롯 지정"이라는 이 affordance의 본래 의도(1클릭)에 클릭을 하나 더 얹어 UX를 후퇴시킨다. 26px SpouseRemoveBtn·28px CloseBtn·DateClearBtn은 단독 격리 타깃이고 관례에 근접하므로 별도 발굴로 분리하거나 제외 — 현재처럼 한 P2로 묶으면 우선순위가 왜곡된다.


### 배치 13. 死코드 제거 + 소소한 흐름 폴리시  
*effort S*
> 낮은 우선순위 정리: SegmentBtn $variant='ghost' 死prop 제거(4곳), 날짜 sub-label 층위 프리미티브화, 반픽셀 폰트 스냅, 연속등록 후 이름칸 포커스, ⌘V 붙여넣기 조건부 힌트, 최근등록 父/母 덮어쓰기 토스트, 출생→사망지 복사 undo, 사망일 자동모달 제거, '추정' 라이브 프리뷰. 서로 독립적·저위험이라 다른 배치 착수 시 곁다리로 소화.

#### [VIS-7] SegmentBtn $variant='ghost'가 死 prop — 의도한 보조 토글 위계가 유실
*🟠 P2 · PLAUSIBLE/low · effort S*  
`life-section.tsx:655-661 (정의) · 221,236,327 (사용)`
- **문제:** ghost로 낮추려던 보조 토글(미상·추정)이 실제로는 성별·사망여부 같은 주 세그먼트와 완전히 동일한 시각으로 렌더돼, 코어 분기와 보조 옵션 사이의 위계가 사라진다. 죽은 prop이라 유지보수자도 '적용된 줄' 오해한다.
- **권고:** $variant를 '소비'하지 말 것 — ghost를 시각적으로 약화하면 segmentToggleMixin이 '출생일 미상'을 명시적으로 포함해 통일한 결정과 canon 4를 되돌리는 회귀다. 올바른 해소는 순수 死 코드 제거뿐: 선언(658) + 3개 호출부($variant=\"ghost\", 221·236·327)에서 $variant prop을 삭제해 '적용된 줄' 오해만 없앤다. 위계 표현이 정말 필요하다는 별도 UX 결정이 서기 전까지 새 variant 분기는 만들지 않는다. effort는 S가 아니라 XS 수준(4곳 삭제).

#### [VIS-9] 날짜 sub-label 시각 언어가 두 종류(sentence 12px vs eyebrow 11px 대문자)
*🟠 P2 · PLAUSIBLE/low · effort S*  
`life-section.tsx:593-597 (LifeSubLabel) vs family-section.tsx:898-904 (SpouseDateLabel)`
- **문제:** '날짜 입력 위 소형 라벨'이라는 동일 개념이 두 가지 타이포로 갈려, 같은 폼 안에서 생몰 영역과 배우자 영역의 라벨 톤이 눈에 띄게 다르다. eyebrow 대문자(섹션마커 언어)를 필드 sub-label에 쓴 곳(SpouseDateLabel)은 섹션 헤더로 오독될 여지도 있다.
- **권고:** 방향은 '단일필드 캡션 vs 그룹/섹션 라벨'의 층위로 규칙화할 때만 가치가 있다. eyebrow 톤(11px/600/tertiary/uppercase)은 그룹·섹션 마커(CoreSectionLabel·DeathTypeGroupLabel·RecentChipLabel)에 국한하고, 단일 컨트롤 위 캡션인 SpouseDateLabel(혼인 시작/종료/서열)은 LifeSubLabel과 같은 역할이므로 12px/500/secondary(uppercase·letter-spacing 제거)로 재톤. 단, 발굴이 가정한 'LifeSubLabel=표준'은 자명하지 않다(eyebrow 그룹라벨이 오히려 3회로 더 잦음) — 그러니 임의로 한쪽 span을 고치지 말고 _form-primitives에 FieldSubLabel(필드캡션)과 GroupLabel(eyebrow) 두 프리미티브를 신설해 양쪽이 공유하도록 단일출처화하면 층위 구분이 코드로 강제된다(canon 9: 성장 억제와 정합). '섹션 헤더 오독' 정당화는 삭제할 것(한글에서 uppercase는 no-op).

#### [VIS-11] FONT 스케일 규약 위반 — 반픽셀(12.5·11.5px)이 아직 남아 있음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`person-register-view.styles.ts:522 (TopAlert 12.5px) · country-form-shell.tsx:348 (SideIndexBadge 11.5px)`
- **문제:** 타이포 스케일 canon(FONT.eyebrow/meta/label/body/hero)에서 이탈한 반픽셀 값이 남아 있어, 문서화된 5단계 규약과 실제가 어긋난다(미세하지만 스케일 통일 목적을 훼손).
- **권고:** 두 파일을 하나의 규약으로 묶지 말 것. (1) TopAlert 12.5px → FONT.meta(12px)로 스냅(색이 text.secondary인 보조 배너라 label 13보다 meta 12가 파일 내 다른 meta 용례와 일관). 토큰 참조로 교체. 이건 이 모달 도메인이므로 정당. (2) SideIndexBadge 11.5px는 person-register-modal의 FONT 토큰을 import하지 말 것 — country-form-shell은 FONT canon 범위 밖('이 모달 전용')이고, 차용 위젯이 person-modal 토큰에 결합되는 건 더 나쁨. 원하면 셸 로컬에서 raw 11px로만 스냅하거나 그대로 두라(도메인 별개). 실질 사용자 영향은 서브픽셀이라 우선순위 P3 하단이 타당하며, 함께 처리한다면 같은 파일의 line 595 '16px'(FONT 주석의 '16·17 제거' 대상)도 하나의 청소 단위로 묶는 편이 낫다.

#### [FLOW-5] '다른 인물 이어서 등록' 후 이름 필드로 포커스가 돌아오지 않음
*🟠 P2 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:1122-1130; widgets/country/country-form/ui/country-form-shell.tsx:648-660`
- **문제:** '국가 유지하며 다른 인물도 이어서 등록'은 대량 입력 가속이 목적인데, 리셋 후 커서가 이름 필드에 없어 매번 마우스로 이름 칸을 다시 클릭해야 한다. 흐름의 핵심 이점(연속 타이핑)이 반감된다.
- **권고:** 뷰-로컬로 명시 포커스를 걸 것(권고 옵션 a만 채택, 옵션 b 폐기). handleRegisterAnother에서 setResetCounter 직후 requestAnimationFrame(리셋 리렌더 후) 또는 셸의 80ms 지연에 맞춘 짧은 setTimeout으로 성/이름 input을 직접 포커스: document.getElementById(fid('surname'))?.focus() 권장. 이름칸(fid('name'))보다 왼쪽·행 첫 필드인 '성'을 먼저 잡는 게 좌→우 타이핑 흐름에 자연스럽고, 단일 토큰 이름이면 Tab 한 번으로 이름칸 이동. 셸 first-focus를 resetCounter에 반응시키자는 안은 채택 금지 — 셸 셀렉터가 display:none인 #person-thumbnail-upload 파일 input을 첫 매치로 잡아 .focus()가 무동작이기 때문. 별도(선택)로 최초-열림 자동포커스까지 고치려면 셸 셀렉터를 비가시/zero-size input을 건너뛰도록 보정(예: offsetParent !== null 필터)해야 하나, country-form-shell은 현대/역사국가 폼도 공유하는 셸이라 blast radius가 커서 이번 발굴 범위 밖의 별건으로 분리 권장.

#### [FLOW-7] '⌘V로 사진 붙여넣기' 안내가 필드에 포커스가 있으면 조용히 무동작
*🟡 P3 · PLAUSIBLE/low · effort M*  
`shared/ui/person-register-modal/person-register-view.tsx:1350-1382, 2130-2137`
- **문제:** 광고된 붙여넣기 경로가 실제로는 '아무 필드에도 포커스가 없을 때'만 동작(첫 진입 body 포커스 상태에서만). 필드를 한 번이라도 만지면 ⌘V가 조용히 실패해, 힌트를 따랐는데 아무 일도 안 일어나는 오해를 유발.
- **권고:** 썸네일 영역(ThumbnailCircle 또는 hero) 자체를 tabIndex로 포커스 가능하게 하고 그 위 paste를 별도 처리하거나, 필드 포커스 중 이미지 클립보드 감지 시 '썸네일 영역에 붙여넣으세요' 토스트로 안내. 최소한 힌트를 조건부(포커스 없을 때만) 노출.

#### [FLOW-9] '최근 등록' 칩의 父/母/配 빠른지정이 기존 부/모를 조용히 덮어쓰고 피드백이 없음
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/family-section.tsx:225-243, 290-315`
- **문제:** 부/모는 단일 슬롯이라 빠른지정이 덮어쓰기다. 실수로 다른 칩의 父를 누르면 이전 아버지가 조용히 교체되며, 국적 변경 시 제공하는 되돌리기 토스트 같은 회복 수단도, 지정됐다는 피드백도 없어 눈치채기 어렵다.
- **권고:** 父/母 지정 시 '아버지로 지정: 홍길동' 토스트(가능하면 되돌리기 포함). 이미 값이 있으면 교체 전 시각 신호(칩 하이라이트)나 확인. 배우자(配)는 additive라 현행 유지 가능.

#### [FLOW-10] '출생지와 동일' 복사가 기존 사망지를 되돌리기 없이 덮어씀
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:1253-1259; shared/ui/person-register-modal/sections/place-fields.tsx:76-88`
- **문제:** 같은 파일의 국적 변경(1186-1206)은 출생/사망지 삭제 시 6초 되돌리기 토스트를 주는데, 이 복사는 기존 사망지 유실에 회복 수단이 없다. 일관성 결여 + 실수 복구 불가.
- **권고:** 원안 방향(되돌리기 토스트) 자체는 적절하되, 조건과 범위를 명시할 것. (1) deathPlace가 이미 비어 있으면 그냥 success 토스트 유지 — 손실 없으므로 undo 불필요. (2) 복사 시점에 deathPlace가 non-null인 경우에만 파일 내 이미 존재하는 UndoToastBody/UndoToastButton을 재사용해, 직전 { deathPlace, deathCityId } 스냅샷을 잡아 6000ms 되돌리기 토스트로 대체(1186-1206 패턴 그대로). confirm 다이얼로그는 쓰지 말 것 — 버튼이 자기설명적 명시 액션이라 사전 확인은 마찰만 늘린다. 부모(person-register-view)가 토스트를 소유하는 현 구조(onCopyBirthToDeathPlace 위임)를 유지하면 place-fields.tsx는 무변경, god 파일엔 분기 배선만 추가되어 canon 9(성장억제)도 준수.

#### [FLOW-11] 사망일 달력 자동열림이 달력 경로에서만 발동 — 인라인 타이핑 시엔 안내 없음, 뜰 땐 깜짝 모달
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/person-register-view.tsx:1286-1289, 1233-1237`
- **문제:** 유도 로직이 비주류(달력) 경로에만 살아 있어 일관성이 없다. 인라인으로 출생연도를 친 대다수 사용자는 안내를 못 받고, 반대로 달력으로 고른 사용자는 예고 없이 사망일 달력이 튀어나와(200ms 후) 흐름이 끊긴다.
- **권고:** 사망일 인라인 필드는 이미 출생일 열 바로 옆에 상시 노출되므로(life-section LifePairGrid) 별도 강제 nudge가 사실상 불필요하다. 가장 단순·일관된 수정은 두 곳(handleBirthDateSelect 1287-1289, setDeathStatus 1235-1236)의 setTimeout 자동 모달을 제거해 달력 경로의 '깜짝 200ms 모달'을 없애고, 인라인/달력 양 경로를 동일하게(자동 오픈 없음) 맞추는 것이다. 굳이 유도가 필요하면 자동 모달 대신 사망일 인라인 필드 하단에 신규+출생일입력+사망일공란일 때만 뜨는 비강제 텍스트 힌트/포커스 이동(예: '사망일도 입력' 인라인 링크)을 두어 양 경로에서 동일하게 작동시킨다 — 이는 모달 자동노출을 지양하는 de-modalize canon #6과 정합. P3·effort S로 처리하되 우선순위는 낮게.

#### [DISC-6] '추정' 토글의 의미가 title 툴팁에만 의존(터치·모바일에서 안 보임)
*🟡 P3 · PLAUSIBLE/low · effort S*  
`shared/ui/person-register-modal/sections/life-section.tsx:234-250,324-338`
- **문제:** title 툴팁은 마우스 hover에서만 뜨고 터치/모바일에선 나오지 않는다. '추정'이 저장 결과(circa 접미·정밀도)를 어떻게 바꾸는지 scent가 부족해, 필요한 사용자도 눌러도 될지 확신 못 하고, 반대로 오해해 잘못 켤 수 있다.
- **권고:** 원안의 두 갈래 중 '상시 마이크로 힌트'는 480px 2열 컴팩트 레이아웃에 세로 공간을 더해 밀도를 해치므로 비권장. 대신 이미 존재하는 lifespan 표시 요소(life-section.tsx:340-342 LifespanText, aria-live=polite)를 재사용해 '추정' 활성 시 효과를 즉시 반영하는 라이브 프리뷰가 최소 비용·최고 가치다 — 예: 부모가 lifespanText를 계산할 때 isBirthDateApproximate/isDeathDateApproximate가 켜져 있으면 연도 앞에 '약'을 붙여(예: '약 1500년생 · 향년 …') 저장 결과를 그 자리에서 보여준다. 함께, hover에 의존하지 않도록 두 SegmentBtn(247·335)에 aria-label='추정 연도(표시 시 「약」 접미)'를 추가해 SR·비-hover 사용자에게도 의미를 전달한다(title은 보조로 유지 가능). 이렇게 하면 신규 힌트 블록 없이 발견성과 접근성을 동시에 올릴 수 있다.


## 기각(적대검증 탈락)
- **[IA-2] 빈 폼 첫인상이 '이름' 클러스터에 과밀 — 아바타 드롭존+전문가 컨트롤이 필수 흐름을 앞지름** — 인용 라인(2074-2307)의 위젯은 실재하나, 발굴의 핵심 전제와 권고 상당수가 코드와 어긋난다. (1) 히어로(2076-2165)는 '데이터입력과 무관한 업로드 드롭존'이 아니라 오른쪽 절반이 이름 프리뷰 CTA(2117-2119 '이름을 입력해 시작하세요')로 채워진 88px 가로 행 — 필수(이름)을 향해 유도하는 요소다. (2) 필수 이름 입력(성·이름·중간이름*, 2167-2236)이 히어로 바로 다음 2번째 요소로 즉시 도달되며, '표시 순서'(2209)·'이름 원어'(2239)·'이름의 뜻'(2254)는 모두 필수 필드 뒤에 온다 — "니치 컨트롤이 필수 흐름을 앞지른다/필수 도달 전부터 눌린다"는 인과 전제가 틀렸다. (3) '이름의 뜻'은 이미 AdvancedSection 접힘 토글(2254-2270)이라 '쌓인 상시노출'이 아니다. (4) 권고의 구체 액션들이 이미 구현됨 — 'hero preview 유지'는 이미 존재(2116-2137), '힌트 1줄 축약'은 이미 12px 단일행(styles 152-156). (5) '이름 원어'를 disclosure로 내리는 것은 주석 2238의 의도적 '인접 이관+상시노출'을 되돌리고, 주석 2068-2072가 이미 'required-first + 세부는 필드 disclosure' IA 결정을 명문화하고 있다. canon 1(최상위 collapse 재도입)·canon 3(기존 disclosure 평탄화) 어느 것도 직접 위반하진 않으나, 문제 자체가 현행 설계로 대부분 이미 처리되어 순가치가 미미하다. 실제 영향은 막힘·데이터손실·오해 없음, 주관적 첫인상 밀도 취향 수준.</parameter>
<parameter name="refinedRecommendation">발굴 전체는 기각. 굳이 살릴 미세 개선 하나: 상시 노출된 '표시 순서' 3탭 세그먼트(2209-2234)는 기본값이 '국가 기본(auto)'라 대다수 사용자가 손대지 않으므로, 이를 필드단위 disclosure(AdvancedSection 패턴, canon 3과 정합) 뒤로 접어 첫 클러스터 밀도를 낮추는 것만 선택적으로 검토 가능. 그 외 히어로 프리뷰·힌트 축약·이름의 뜻 지연은 이미 구현됐고, 이름 원어 지연은 문서화된 의도적 이관을 되돌리므로 하지 말 것.</parameter>
</invoke>
- **[IA-6] 챕터 밀도 불균형 — '생애'가 폼의 절반인데 인덱스는 4개 균등 항목이라 길이·진척감 왜곡** — 인용 라인은 정확하다. person-register-view.tsx:2384-2514는 실제로 '생애' 챕터에 LifeSection(essentials: 생몰 2열 날짜+사망 3-way+추정/미상 토글+floruit+사망유형 13칩 그리드)+PlaceFields(출생지/사망지)+LifeSection(details: 출생/사망 상세+군주호칭 disclosure)를 단일 data-form-section="life" 앵커 하나에 몰아넣고, 인덱스(1938-1972)는 basic/life/affiliation/family 4개 균등 항목을 country-form-shell.tsx:826-845에서 badge+label 동일 위계로 렌더한다(밀도 힌트 없음). 그러나 발굴의 핵심 전제("생애가 폼의 절반, 다른 세 챕터를 압도")가 구조적 사실이 아니라 데이터 의존적이다. (1) 실측 최대 섹션은 오히려 family-section(943줄)·country-affiliations(498줄)이며 둘 다 배우자행·국가소속행이 반복 증식 — 배우자 다수 인물은 '가족'이 '생애'를 압도한다. 어느 챕터도 고정 지배 길이를 갖지 않는다. (2) 점진공개(canon #2)로 floruit는 생몰 둘 다 미상 시만(life-section.tsx:357), 13칩 사망유형 그리드는 !isAlive && (deathType||deathYear||unknown) 시만(413-415), 군주호칭은 기본 접힘 → 빈 폼/일반 인물 첫인상의 '생애'는 크지 않다. (3) 문제로 지목한 '방향감각 저하'는 이미 완화돼 있다: scroll-spy가 스크롤 중 활성 챕터를 지속 하이라이트하고, 챕터 내부 CoreSectionLabel('생몰'/'생애 상세')이 하위 웨이파인딩을 주며, 푸터 ProgressGroup은 스크롤 위치가 아니라 필수필드 완료를 추적하므로 인덱스가 잔여감을 잘못 신호하지 않는다. 권고는 최상위 접기(canon #1)를 명시적으로 피하지만, '생애' 하위앵커 분리는 의도된 4챕터 통합(view L1930-1931 "흡수됨")을 부분 파편화하는 방향이라 순가치가 낮고, M 노력 대비 이득이 사변적이다. default-reject 기준의 '실질 가치' 미달.
- **[IA-9] 출생일(생몰)과 출생지(생애 상세)가 divider+헤딩으로 분리 — '출생=날짜+장소 한 흐름' 발견성 약화** — 인용한 코드는 사실이다(view.tsx:2444-2445 CoreDivider+CoreSectionLabel'생애 상세', 2447 PlaceFields, life-section.tsx:191-217 출생일=essentials, place-fields.tsx:3-8 주석). 그러나 발굴의 핵심 전제인 '강한 시각 경계'가 과장이다: CoreDivider(styles.ts:217-221)는 border.light 1px hairline로 주석이 '옅은 hairline…과하지 않게'라 명시하고, CoreSectionLabel(227-236)은 11px 대문자 tertiary eyebrow로 canon #4가 재도입 금지한 강한 h3 SectionHeader와 정반대의 의도적 절제 표현이다. 더 결정적으로, '한 흐름/발견성' 통합은 이미 챕터 레벨에서 달성돼 있다 — 좌측 scroll-spy 인덱스(view.tsx:1937-1961)가 data-form-section='life' 전체를 단일 '생애' 챕터로 흡수하고, 출생일(생몰)과 출생지(생애 상세)는 같은 div·같은 챕터·중간 OptionalSeam 없음. 사용자가 보는 내비게이션 모델은 '생애' 한 항목이라, 별개 섹션으로 오인한다는 주장이 내비 모델과 상충한다. 게다가 필드가 '출생지'로 자기라벨링돼 있어 어느 eyebrow 밑이든 출생 개념 연결이 유지된다. 권고 두 안 모두 문서화된 결정을 건드린다: 안1(이 divider만 미세간격)은 이름/신원/생몰과 동일한 균일 CoreDivider 리듬(canon #4)에 bespoke 예외를 만들고, 안2(날짜 옆 인접)는 async PlaceAutocomplete를 essentials 밖에 두기로 한 place-fields.tsx:7-8 점진노출 결정을 되돌린다. 사실은 맞으나 유의성이 과장됐고, 통합은 이미 유효 레벨에서 실현됐으며, 제안 리미디는 canon 회귀라 기각.
- **[FB-6] 이미지 업로드 단계인데 셸 오버레이는 '저장 중입니다...'로 표기 — 진행 단계 불일치** — 인용한 개별 라인은 존재하지만(1916-1920 4단계 라벨, shell:862 오버레이 '저장 중입니다...', shell:805 SR '저장 중입니다'), 이들을 묶은 핵심 주장 — '버튼 라벨(이미지 업로드 중…)과 셸 오버레이 문구가 같은 화면에서 어긋난다' — 은 배선상 성립하지 않는다. 두 인용 위치는 상호 배타적 경로에 있다. (1) 모달 경로(person-register-view-modal.tsx→CountryFormShell, 오버레이/SR 보유): onSubmitLabelChange를 PersonRegisterView에 전달하지 않으므로(117-127) 셸은 자체 하드코딩 '저장 중...'(shell:932)을 쓴다 → 업로드 단계에도 버튼/오버레이/SR 모두 '저장 중'으로 일치, '이미지 업로드 중…'은 계산만 되고 버려짐. (2) 페이지 경로(person-edit.page.tsx): onSubmitLabelChange가 배선되어(157) 버튼은 '이미지 업로드 중…'을 표시하지만, CountryFormShell을 쓰지 않아(FormCardWrapper+StickyFooter) SubmittingOverlay·SR 라이브리전 자체가 없다 → 어긋날 대상이 없음. 즉 오버레이가 있는 곳엔 단계 라벨이 배선 안 됨, 단계 라벨이 뜨는 곳엔 오버레이가 없음. 권고 전제('이미 onSubmitLabelChange 배선이 있으니 셸도 그 라벨을 쓰면 됨')도 모달 경로에선 배선이 없어 거짓 — 재사용이 아니라 신규 배선이 필요. 남는 유일한 실체는 모달에서 대용량 업로드 지연 시 오버레이가 일반적 '저장 중입니다'로 표시되는 경미한 모호함뿐이며, 이는 발굴이 주장한 '문구 어긋남(모순)'이 아니라 약한 부정확성이다.</parameter>
<parameter name="refinedRecommendation">발굴은 기각. 실체가 있는 최소 잔여는 '모달 경로에서 대용량 업로드 시 SubmittingOverlay·SR이 일반적 저장 중으로만 표기'되는 경미한 모호함이다. 살리려면 (a) person-register-view-modal.tsx에서 onSubmitLabelChange를 새로 배선해 uploadingThumbnail 단계 라벨을 상태로 끌어올리고, (b) CountryFormShell이 submitting 시 오버레이/SR 문구로 그 동적 라벨을 쓰도록 prop을 추가해야 한다 — 발굴이 말한 '이미 있는 배선 재사용'이 아니라 신규 배선·prop 추가가 필요. 페이지 경로는 오버레이가 없어 이미 버튼 라벨만으로 단계가 반영되므로 손댈 필요 없음. 비용 대비 가치가 낮아 우선순위 하위 권장.
- **[RESP-4] 모달 폭 min(960px,96vw)와 오버레이 24px 패딩이 769~1000px 태블릿 구간에서 뷰포트를 넘쳐 여백이 사라지고 모서리가 잘림** — 인용한 CSS 자체는 정확하다: Overlay `padding:24px`(≤768px에서 0), ModalBox `width:min(960px,96vw)`(country-form-shell.tsx:93,99-101,106,117-125 확인). 그러나 발굴의 핵심 주장 — "769px에서 96vw(738)+패딩48=786>769로 뷰포트를 초과해 모서리가 잘리고 가로 스크롤·닫기영역이 사라진다" — 은 잘못된 계산이다. Overlay는 `justify-content:center` + 기본 `overflow:visible`이므로, 콘텐츠박스(769-48=721)보다 넓은 자식(738.24)은 패딩에 의해 양쪽으로 '밀리는' 게 아니라 뷰포트 중앙(384.5)에 정렬되며 패딩 영역으로 대칭 오버플로우한다. 결과 span=[15.38, 753.62]로 [0,769] 안에 완전히 들어간다. 즉 좌우 각 15.38px 여백이 남는다. 96vw는 항상 100vw보다 작으므로 모달은 어떤 뷰포트에서도 화면 끝에 닿을 수 없고 → 잘림 없음, 가로 스크롤 없음, 오버레이 클릭영역(양쪽 ≈15px + 상하 전체) 유지된다. 실제로 존재하는 유일한 현상은 769~1000px 구간에서 의도한 24px 여백이 ~15.4px(769)~20px(1000)로 '약간 줄어드는' 것뿐 — 사라지는 게 아니라 압축이며, 저영향 미세 심미 뉘앙스지 P2 결함이 아니다. 인용 코드는 발굴이 주장한 '그 동작'(초과·잘림·스크롤)을 하지 않으므로 grounded=false.</parameter>
<parameter name="refinedRecommendation">선택적 폴리시로만 유효: 태블릿 구간에서 정확히 24px 여백을 보장하고 싶다면 ModalBox 폭을 `min(960px, calc(100vw - 48px))`로 두면 오버레이 패딩과 정합된다(캔버스/글래스 표면·16px radius 불변이라 canon 무영향). 다만 이는 버그 수정이 아니라 15.4→24px 여백 미세 복원이며, 잘림/스크롤 같은 기능 결함은 애초에 존재하지 않으므로 우선순위는 backlog 수준.</parameter>
</invoke>
- **[RESP-5] 같은 '생애' 챕터 안에서 날짜쌍(768px)과 장소쌍/신원쌍(640px)의 2열→1열 전환 브레이크포인트가 불일치** — 인용한 file:line은 정확하다. LifePairGrid(life-section.tsx:566-575)는 max-width:480px에 @media(max-width:768px)에서 1열, PlaceGrid(place-fields.tsx:115-130)와 CoreFieldPair(styles.ts:191-203)는 max-width:600px에 @media(max-width:640px)에서 1열 — 768/640/640 불일치는 실재한다(grounded=true). 나열된 9개 DESIGN_CANON은 반응형 브레이크포인트를 다루지 않으므로 canon 회귀는 아니다. 그러나 핵심 논거 두 개가 무너진다. (1) '정렬이 어긋난다' 전제가 사실상 무효 — date-pair는 폭 480px, place/core-pair는 600px라 그리드 폭 자체가 달라 어떤 뷰포트에서도 두 그리드의 좌/우 열 x좌표가 다르게 놓인다. 원래 세로 정렬되지 않으므로 '함께 스택'의 미적 근거가 사라진다. (2) 768 vs 640은 부주의한 산발이 아니라 두 재사용 규약의 산물 — LifePairGrid 주석은 '앱 공통 date-pair(480px)와 동일 폭', PlaceGrid는 'CoreFieldPair와 동형'이라 명시. date-pair는 era 토글 + 년/월/일 3입력 + 달력버튼 + 자체 @media(max-width:768px) iOS-zoom 규칙까지 가진 콘텐츠-헤비 별도 프리미티브다. '640으로 통일'은 이 인스턴스를 앱 공통 date-pair 규약에서 이탈시켜 앱 전역 일관성을 챕터 내부 미세정돈과 맞바꾸는 트레이드다. 영향은 641~768px 좁은 밴드의 순수 미적 사안(막힘·데이터손실·오해 없음)이고 문제 프레이밍이 부정확하며 실질 가치가 낮아 기각.</reason>
<refinedRecommendation>통일 대신 현행 유지 권고. 768(date-pair) vs 640(field/core-pair) 차이는 콘텐츠 밀도가 다른 두 재사용 규약(date-pair 480px vs core-pair 600px)의 결과이고, 두 그리드는 max-width(480 vs 600)가 달라 애초에 열이 정렬되지 않으므로 '함께 스택' 통일의 이득이 없다. 유지보수성만 겨냥한다면 값을 640으로 뭉개 date-pair를 앱 공통 규약에서 이탈시키기보다, 하드코딩 640/768 리터럴을 _form-primitives의 공유 토큰(예: BREAKPOINT.datePair=768, BREAKPOINT.fieldPair=640)으로 추출해 '두 규약의 의도적 차이'를 명시하는 편이 안전하다. 어느 쪽도 P3 미만.</refinedRecommendation>
</invoke>
- **[DISC-1] 사망 유형(암살·처형·전사)이 사망'일' 입력 전엔 발견 불가** — 인용 코드는 정확(grounded). life-section.tsx:413-415의 사망 유형 그리드 게이트는 `showEssentials && !isAlive && (!!deathType || !!deathYear.trim() || isDeathDateUnknown)`가 맞고, '사망' 선택 + 연도 미입력 + 일자미상 미토글이면 그리드가 안 뜨는 것도 사실. 그러나 권고 `!isAlive`로 완화는 canon #2를 정면 회귀시킨다. 결정적 근거: person-register-view.tsx:256 `useState(false)` — 빈 신규 폼의 기본값이 isAlive=false다(즉 3-way에서 '사망' 세그먼트가 기본 활성). 따라서 `!isAlive`는 빈 폼 첫인상에서 참이 되어 13칩 그리드가 그대로 노출된다. 발굴이 스스로 붙인 정당화("빈 폼 첫인상엔 여전히 숨김")는 기본값 오인에 근거한 사실오류이며, 현재의 (deathType||deathYear||isDeathDateUnknown) 게이트는 '사망이 기본값인데도 그리드를 숨긴다'는 canon #2를 실현하는 바로 그 장치다. 게다가 발굴이 말하는 핵심 시나리오(처형/전사는 아는데 날짜는 모름)는 이미 '일자 미상' 세그먼트로 정확히 서비스된다 — 클릭 시 isDeathDateUnknown=true로 그리드가 나타나고 사망일 필드도 올바르게 비활성화된다. 신규 등록에선 setDeathStatus('deceased')가 사망일 피커를 자동 오픈(view.tsx:1235)까지 한다. 남는 미서비스 구간은 '사망 확정 + 날짜를 나중에 입력할 의도 + 유형을 먼저 넣고 싶음'이라는 사소한 입력순서 선호뿐으로, 연도 한 글자 입력 또는 일자미상 클릭 한 번이면 즉시 해소된다. 데이터 유실 위험은 과장(impact=low). 근거는 맞으나 권고가 canon 회귀 + 사실오류 기반이라 REJECTED.
