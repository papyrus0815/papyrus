# mise-en-place 설정 가이드

이 프로젝트는 **mise-en-place**를 사용하여 개발 환경의 런타임 버전을 관리합니다.

## mise-en-place란?

mise-en-place(이전 이름: mise)는 여러 런타임 버전(Node.js, Python, Ruby 등)을 자동으로 관리하는 도구입니다. 프로젝트별로 필요한 버전을 자동으로 설치하고 활성화합니다.

## 설치 방법

### macOS

```bash
# Homebrew로 설치
brew install mise

# 또는 공식 설치 스크립트
curl https://mise.run | sh
```

### Linux

```bash
curl https://mise.run | sh
```

### Windows

```powershell
# PowerShell에서 실행
irm https://mise.run | iex
```

## 셸 설정

설치 후 셸 설정 파일에 mise 초기화 코드를 추가해야 합니다.

### zsh (macOS 기본)

`~/.zshrc` 파일에 다음 추가:

```bash
eval "$(mise activate zsh)"
```

### bash

`~/.bashrc` 파일에 다음 추가:

```bash
eval "$(mise activate bash)"
```

### fish

`~/.config/fish/config.fish` 파일에 다음 추가:

```fish
mise activate fish | source
```

설정 후 터미널을 재시작하거나 다음 명령어로 설정을 다시 로드:

```bash
# zsh
source ~/.zshrc

# bash
source ~/.bashrc
```

## 프로젝트 설정 (Papyrus)

프로젝트 루트에 `.mise.toml` 파일이 있으며, 다음 내용을 포함합니다:

```toml
[tools]
node = "24.1.0"
```

## 사용 방법

### 1. 프로젝트 디렉토리로 이동

```bash
cd /path/to/papyrus
```

### 2. 설정 파일 신뢰 (최초 1회)

mise는 보안을 위해 설정 파일을 신뢰해야 합니다. 프로젝트 디렉토리에서 다음 명령어를 실행하세요:

```bash
mise trust
```

이 명령어는 `.mise.toml` 파일을 신뢰 목록에 추가하여 mise가 자동으로 로드할 수 있게 합니다.

### 3. mise가 자동으로 버전 설치 및 활성화

프로젝트 디렉토리로 이동하면 mise가 자동으로:
- `.mise.toml`에 지정된 Node.js 버전을 확인
- 해당 버전이 없으면 자동으로 설치
- 해당 버전을 활성화

### 3. 버전 확인

```bash
# Node.js 버전 확인
node --version

# npm 버전 확인
npm --version

# mise가 관리하는 도구 목록 확인
mise ls

# 설치된 모든 버전 확인
mise ls --installed
```

## 설치 확인 체크리스트

mise-en-place가 올바르게 설치되고 설정되었는지 확인하는 방법:

### 1. mise 명령어 확인

```bash
# mise 명령어가 인식되는지 확인
which mise

# mise 버전 확인 (선택사항)
mise --version
```

### 2. 셸 설정 확인

```bash
# zsh 사용 시
grep "mise activate" ~/.zshrc

# bash 사용 시
grep "mise activate" ~/.bashrc
```

출력이 나오면 셸 설정이 올바르게 되어 있습니다.

### 3. 프로젝트 설정 확인

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/papyrus

# mise가 인식하는 도구 목록 확인
mise ls
```

예상 출력:
```
node  24.1.0  ~/dev/papyrus/.mise.toml  24.1.0
```

### 4. Node.js 설치 및 활성화 확인

```bash
# Node.js 버전 확인 (mise가 관리하는 버전이 활성화되어야 함)
node --version
# 예상 출력: v24.1.0

# npm 버전 확인
npm --version

# Node.js 경로 확인 (mise가 관리하는 경로여야 함)
which node
# 예상 출력: ~/.local/share/mise/installs/node/24.1.0/bin/node
```

### 5. 자동 활성화 확인

```bash
# 다른 디렉토리에서
cd /tmp
node --version  # 시스템 Node.js 버전 (또는 오류)

# 프로젝트 디렉토리로 이동
cd /path/to/papyrus
node --version  # mise가 관리하는 Node.js 24.1.0 버전
```

프로젝트 디렉토리에서 자동으로 올바른 버전이 활성화되면 성공입니다.

### 4. 수동 설치 (필요시)

```bash
# .mise.toml에 지정된 모든 도구 설치
mise install

# 특정 도구만 설치
mise install node@24.1.0
```

## 주요 명령어

```bash
# 현재 프로젝트에 필요한 도구 설치
mise install

# 설치된 도구 목록 확인
mise ls

# 특정 도구 버전 설치
mise install node@24.1.0

# 특정 도구 버전 제거
mise uninstall node@24.1.0

# mise 자체 업데이트
mise self-update

# 도움말
mise help
```

## 프로젝트에서 사용하기

프로젝트 디렉토리에서 작업할 때:

1. **자동 활성화**: 프로젝트 디렉토리로 이동하면 자동으로 올바른 Node.js 버전이 활성화됩니다.

2. **의존성 설치**: mise로 Node.js 버전이 활성화된 상태에서 npm install 실행:

```bash
npm install
```

3. **개발 서버 실행**: 정상적으로 작동합니다:

```bash
npm run dev
```

## 문제 해결

### mise 명령어를 찾을 수 없는 경우

```bash
# 셸 설정 파일 확인
cat ~/.zshrc  # 또는 ~/.bashrc

# mise 초기화 코드가 있는지 확인
# 없으면 추가: eval "$(mise activate zsh)"
```

### 설정 파일 신뢰 오류

다음 오류가 발생하는 경우:

```
mise ERROR Config files in ~/dev/papyrus/.mise.toml are not trusted.
Trust them with `mise trust`.
```

프로젝트 디렉토리에서 다음 명령어를 실행하세요:

```bash
cd /path/to/papyrus
mise trust
```

이 명령어는 `.mise.toml` 파일을 신뢰 목록에 추가합니다.

### Node.js 버전이 활성화되지 않는 경우

```bash
# 수동으로 설치
mise install

# 현재 디렉토리에서 mise 상태 확인
mise ls

# 프로젝트 디렉토리로 다시 이동
cd /path/to/papyrus
```

### 다른 프로젝트와 버전 충돌

mise는 프로젝트별로 자동으로 버전을 전환합니다. 각 프로젝트의 `.mise.toml` 파일에 따라 올바른 버전이 활성화됩니다.

## 추가 리소스

- [mise 공식 문서](https://mise.jdx.dev/)
- [mise GitHub](https://github.com/jdx/mise)

