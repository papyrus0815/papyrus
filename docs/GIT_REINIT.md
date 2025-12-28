# Git 저장소 재초기화 가이드

## ⚠️ 주의사항

이 작업은 **되돌릴 수 없습니다!**
- 모든 Git 히스토리가 삭제됩니다
- 모든 브랜치가 삭제됩니다
- 모든 커밋 로그가 사라집니다
- 원격 저장소와의 연결이 끊어집니다

## 📋 사전 준비 체크리스트

- [ ] 중요한 브랜치나 커밋이 없는지 확인
- [ ] 원격 저장소에 백업이 있는지 확인
- [ ] 팀원들에게 알림 (협업 프로젝트인 경우)
- [ ] 로컬 백업 생성 (선택사항)

## 🔄 재초기화 절차

### 1. 로컬 백업 생성 (선택사항)

```bash
# 프로젝트 전체 백업
cd /Users/yendoo/dev
tar -czf papyrus-backup-$(date +%Y%m%d).tar.gz papyrus/

# 또는 Git 히스토리만 백업
cd /Users/yendoo/dev/papyrus
cp -r .git .git.backup
```

### 2. 원격 저장소 정보 저장

```bash
# 원격 저장소 URL 확인 및 저장
git remote -v > remote-info.txt
cat remote-info.txt
```

### 3. 기존 Git 저장소 제거

```bash
cd /Users/yendoo/dev/papyrus

# .git 디렉토리 완전 삭제
rm -rf .git
```

### 4. 새 Git 저장소 초기화

```bash
# Git 저장소 초기화
git init

# 기본 브랜치 이름 설정 (main 또는 master)
git branch -M main
```

### 5. .gitignore 확인

```bash
# .gitignore가 제대로 있는지 확인
cat .gitignore

# 무시할 파일들이 추적되지 않는지 확인
git status
```

### 6. 초기 커밋 생성

```bash
# 모든 파일 스테이징
git add .

# 초기 커밋
git commit -m "chore: initial commit

- Setup Nx monorepo with multiple apps
- Configure Prisma with modular schema
- Setup NestJS API with Nestia
- Configure React frontends (admin, user)
- Setup Docker and Docker Compose
- Configure mise for development environment
- Add comprehensive documentation"
```

### 7. 원격 저장소 연결 (필요시)

```bash
# 새 원격 저장소 추가
git remote add origin <원격-저장소-URL>

# 또는 기존 저장소 재사용 (주의: 강제 푸시 필요)
git remote add origin <기존-저장소-URL>

# 원격 저장소 확인
git remote -v
```

### 8. 원격 저장소에 푸시

#### 옵션 A: 새 저장소 (권장)

```bash
# 일반 푸시
git push -u origin main
```

#### 옵션 B: 기존 저장소 덮어쓰기 (주의!)

```bash
# ⚠️ 경고: 원격 저장소의 모든 히스토리가 삭제됩니다!
# 팀원들과 반드시 협의 후 진행하세요!

git push -u origin main --force
```

## 📝 초기 커밋 메시지 예시

### 간단한 버전
```bash
git commit -m "chore: initial commit"
```

### 상세한 버전
```bash
git commit -m "chore: initialize project with clean history

Project: Papyrus - Historical Events Management System

Stack:
- Backend: NestJS + Prisma + MySQL
- Frontend: React 19 + TanStack Query + Zustand
- Monorepo: Nx 21.x
- Build: Vite 6.x
- DevOps: Docker + mise

Apps:
- api: NestJS REST API server
- web-admin: Admin dashboard
- web-user: User portal
- service-manager: Electron service manager

Features:
- Modular Prisma schema (libs/db)
- Type-safe API with Nestia
- Comprehensive documentation
- Docker development environment
- CI/CD ready"
```

## 🔍 검증

### 1. Git 상태 확인

```bash
# 새 저장소 정보 확인
git log --oneline
git status
git branch -a
git remote -v
```

### 2. 파일 추적 확인

```bash
# 무시된 파일 확인
git status --ignored

# 추적 중인 파일 확인
git ls-files | head -20
```

### 3. 원격 저장소 연결 확인

```bash
# 원격 저장소와 동기화 상태
git fetch origin
git branch -vv
```

## 🚨 문제 해결

### "기존 저장소 히스토리를 복구하고 싶어요"

백업이 있다면:

```bash
# 1. 새 .git 제거
rm -rf .git

# 2. 백업 복원
cp -r .git.backup .git

# 3. 확인
git log --oneline -5
```

### "원격 푸시가 거부되었어요"

```bash
# 강제 푸시 (주의!)
git push -u origin main --force

# 또는 새 브랜치로
git push -u origin main:new-main
```

### "무시된 파일이 추적되고 있어요"

```bash
# Git 캐시 제거 후 재추가
git rm -r --cached .
git add .
git commit --amend --no-edit
```

## 📚 추가 설정

### Git 사용자 정보 확인

```bash
# 전역 설정 확인
git config --global user.name
git config --global user.email

# 필요시 설정
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Git 기본 브랜치 설정

```bash
# 전역 기본 브랜치 설정
git config --global init.defaultBranch main
```

### Git Hooks 설정

```bash
# pre-commit hook 예시
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
npm run lint
EOF

chmod +x .git/hooks/pre-commit
```

## ✅ 완료 후 확인사항

- [ ] Git 로그에 초기 커밋만 있는지 확인
- [ ] 원격 저장소 연결 확인
- [ ] .gitignore가 정상 작동하는지 확인
- [ ] 팀원들에게 새 저장소 URL 공유 (협업 시)
- [ ] CI/CD 파이프라인 재설정 (필요시)

## 📖 참고

- [Git Documentation](https://git-scm.com/doc)
- [GitHub - Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

---

**⚠️ 이 작업은 신중하게 진행하세요!**

