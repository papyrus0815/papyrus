# 🚀 현재 상황에 맞는 Git 작업 가이드

> **날짜**: 2024년 12월 29일  
> **상황**: main 브랜치에 개발 코드가 있지만 아직 서비스용이 아님

---

## 📌 현재 상황 정리

### 문제
- ✅ **main** 브랜치에 이미 코드가 커밋되어 있음
- ❌ 하지만 아직 **서비스(프로덕션) 배포용이 아님**
- ❓ 이대로 main에 두고 진행해야 할지 고민

### 권장 해결 방안

**main 브랜치는 그대로 두고, develop 브랜치를 새로 만들어서 기본 개발 브랜치로 사용**

#### 이유:
1. main의 이력을 유지 (삭제하거나 되돌릴 필요 없음)
2. main은 나중에 첫 정식 릴리즈 때 사용
3. 앞으로 모든 개발은 develop 기준으로 진행
4. 안전하고 깔끔한 전환

---

## 🎯 지금 바로 실행할 명령어

### Step 1: Develop 브랜치 생성 및 설정

```bash
# 1. 현재 main 브랜치에서 develop 브랜치 생성
git checkout main
git checkout -b develop

# 2. develop 브랜치를 원격 저장소에 푸시
git push -u origin develop

# 3. GitHub에서 기본 브랜치를 develop으로 변경
# Settings → Branches → Default branch → develop 선택
```

### Step 2: 현재 작업 내용을 Feature 브랜치로 분리

```bash
# 1. feature 브랜치 생성
git checkout -b feature/service-manager-v2

# 2. 현재 변경사항 스테이징
git add .

# 3. 의미있는 커밋 메시지로 커밋
git commit -m "feat(service-manager): Service Manager 대폭 개선

주요 변경사항:
- 프로젝트명 Evolution → Papyrus 변경
- 패키지 관리 기능 추가
  - 검색, 필터, 정렬 기능
  - 패키지 상세 정보 모달
  - 스크롤 가능한 테이블 UI
- Docker 관리 개선
  - 포트 충돌 자동 감지
  - Docker 이미지 자동 설치
  - 컨테이너 중지 기능 수정
- Jenkins 제거 및 포트 최적화
- GUI 디자인 전면 개선
  - 탭 구조 (서비스/패키지 분리)
  - 깔끔한 CSS 재작성
  - 반응형 레이아웃

Breaking Changes:
- evolution-server-manager → papyrus-server-manager 리네임
- 환경 변수 EVOLUTION_PROJECT_ROOT → PAPYRUS_PROJECT_ROOT"

# 4. feature 브랜치 푸시
git push -u origin feature/service-manager-v2
```

### Step 3: GitHub에서 Pull Request 생성

```bash
# GitHub 웹사이트에서:
# 1. Pull requests → New pull request
# 2. base: develop ← compare: feature/service-manager-v2
# 3. PR 제목: "feat(service-manager): Service Manager 대폭 개선"
# 4. PR 템플릿에 따라 내용 작성
# 5. Create pull request
```

### Step 4: PR 검토 후 병합

```bash
# PR이 승인되면 GitHub에서 "Squash and merge" 클릭
# 병합 후 로컬에서:

# 1. develop으로 이동
git checkout develop

# 2. 최신 코드 받기
git pull origin develop

# 3. 작업 완료된 feature 브랜치 삭제
git branch -d feature/service-manager-v2
```

---

## 🌳 앞으로의 브랜치 구조

```
main (프로덕션 - 아직 사용 안 함)
  │
  └─ develop (기본 개발 브랜치 - 여기서 작업!)
       │
       ├─ feature/new-feature-1
       ├─ feature/new-feature-2
       ├─ fix/bug-fix-1
       └─ ...
```

### 작업 플로우

```bash
# 1. 새로운 기능 시작
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. 작업 및 커밋
git add .
git commit -m "feat: 기능 설명"

# 3. 푸시
git push origin feature/my-feature

# 4. PR 생성: feature/my-feature → develop

# 5. 병합 후 정리
git checkout develop
git pull origin develop
git branch -d feature/my-feature
```

---

## 🏷️ 첫 정식 릴리즈 준비 (나중에)

서비스 런칭 준비가 되었을 때:

```bash
# 1. develop에서 release 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# 2. 버전 업데이트 및 최종 점검
# package.json 버전 수정
git add package.json
git commit -m "chore: bump version to 1.0.0"

# 3. main으로 PR 생성
# release/v1.0.0 → main

# 4. 병합 후 태그 생성
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0 - 첫 정식 릴리즈"
git push origin v1.0.0

# 5. develop도 업데이트
git checkout develop
git merge main
git push origin develop
```

---

## 📋 체크리스트

### 현재 해야 할 일 ✅

- [ ] develop 브랜치 생성 및 푸시
- [ ] GitHub에서 기본 브랜치를 develop으로 변경
- [ ] 현재 작업을 feature/service-manager-v2로 커밋
- [ ] PR 생성: feature/service-manager-v2 → develop
- [ ] PR 검토 및 병합
- [ ] 로컬 브랜치 정리

### 향후 작업 시 ✅

- [ ] 항상 develop에서 브랜치 분기
- [ ] 의미있는 커밋 메시지 작성
- [ ] PR을 통해서만 develop에 병합
- [ ] 정기적으로 브랜치 정리

---

## 🚨 주의사항

### ❌ 하지 말아야 할 것

1. **main 브랜치에 직접 커밋하지 마세요**
   ```bash
   # ❌ 나쁜 예
   git checkout main
   git add .
   git commit -m "..."
   git push origin main
   ```

2. **force push를 main이나 develop에 하지 마세요**
   ```bash
   # ❌ 절대 금지
   git push --force origin main
   git push --force origin develop
   ```

3. **브랜치를 삭제하기 전에 병합했는지 확인하세요**
   ```bash
   # ✅ 좋은 예: 병합 여부 확인
   git branch --merged
   
   # ❌ 나쁜 예: 무턱대고 삭제
   git branch -D feature/my-feature
   ```

### ✅ 권장사항

1. **커밋 전에 항상 상태 확인**
   ```bash
   git status
   git diff
   ```

2. **작은 단위로 자주 커밋**
   - 큰 기능을 한 번에 커밋 ❌
   - 의미있는 단위로 나눠서 커밋 ✅

3. **PR은 가능한 작게 유지**
   - 변경 라인 500줄 이하 권장
   - 리뷰하기 쉽고 버그 찾기 쉬움

4. **정기적으로 develop 최신 코드 병합**
   ```bash
   git checkout feature/my-feature
   git merge develop  # 충돌 미리 방지
   ```

---

## 🆘 문제 발생 시

### 실수로 main에 커밋했을 때

```bash
# 1. 현재 변경사항 확인
git log --oneline -5

# 2. 커밋 되돌리기 (아직 푸시 안 했을 때)
git reset HEAD~1

# 3. develop으로 이동해서 다시 작업
git checkout develop
git checkout -b feature/my-feature
git add .
git commit -m "..."
```

### 충돌 발생 시

```bash
# 1. 충돌 파일 확인
git status

# 2. 충돌 해결
# 파일을 열어서 <<<<<<, ======, >>>>>> 부분 수정

# 3. 해결 완료 표시
git add .
git commit -m "fix: 충돌 해결"
```

### 실수로 잘못된 브랜치에서 작업했을 때

```bash
# 1. 현재 변경사항 임시 저장
git stash

# 2. 올바른 브랜치로 이동
git checkout correct-branch

# 3. 변경사항 복구
git stash pop
```

---

## 📞 도움이 필요할 때

1. **Git 상태 확인**
   ```bash
   git status
   git log --oneline --graph --all --decorate -10
   ```

2. **커밋 이력 보기**
   ```bash
   git log --oneline -20
   ```

3. **브랜치 목록 보기**
   ```bash
   git branch -a  # 모든 브랜치
   git branch -r  # 원격 브랜치만
   ```

---

**마지막 업데이트**: 2024년 12월 29일

