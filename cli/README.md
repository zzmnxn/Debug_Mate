# @debugmate/cli

C/C++ 대화형 디버깅 CLI (Linux 전용)

## 설치

### 필수 요구사항

```bash
# 시스템 패키지
sudo apt update
sudo apt install -y inotify-tools gcc g++ build-essential tmux

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 빌드 도구 (tree-sitter 네이티브 모듈용)
sudo apt install -y python3 make
```

### CLI 설치

```bash
npm install -g @debugmate/cli
```

## 사용법

### 기본 사용법

```bash
# Gemini API 키 설정
export GEMINI_API_KEY="your_api_key_here"

# 기본 디버깅 (tmux 분할 화면 자동 시작)
debug-mate test.c

# 또는 명시적으로 debug 명령어 사용
debug-mate debug test.c
```

### 명령어 목록

```bash
# 도움말
debug-mate --help

# 버전 확인
debug-mate --version

# 기본 디버깅 (tmux 분할 화면)
debug-mate debug <file>     # 또는 debug-mate d <file>

# tmux 분할 화면 (debug와 동일)
debug-mate tmux <file>      # 또는 debug-mate t <file>

# 테스트 코드 생성
debug-mate generate [name]  # 또는 debug-mate g [name]

# 설정 관리
debug-mate config          # 또는 debug-mate c

# 시스템 상태 확인
debug-mate status          # 또는 debug-mate s

# 프로그램 정보
debug-mate info            # 또는 debug-mate i
```

## 상세 명령어

### 1. 기본 디버깅 (tmux 분할 화면)

```bash
# 기본 사용 (tmux 분할 화면 자동 시작)
debug-mate debug test.c

# 옵션과 함께
debug-mate debug test.c --session my-session --left 70 --timeout 60000
debug-mate debug test.c -s my-session -l 70 -t 60000
```

**옵션:**
- `-s, --session <name>`: tmux 세션 이름 지정
- `-l, --left <percent>`: 왼쪽 패널 크기 (기본: 60%)
- `-t, --timeout <ms>`: 타임아웃 설정 (기본: 30000ms)

### 2. tmux 분할 화면 (debug와 동일)

```bash
# debug 명령어와 동일한 기능
debug-mate tmux test.c

# 옵션과 함께
debug-mate tmux test.c --session my-session --left 70
debug-mate tmux test.c -s my-session -l 70
```

**옵션:**
- `-s, --session <name>`: tmux 세션 이름 지정
- `-l, --left <percent>`: 왼쪽 패널 크기 (기본: 60%)

### 3. 테스트 코드 생성

```bash
# 기본 테스트 생성
debug-mate generate

# 특정 이름으로 생성
debug-mate generate my_test

# 테스트 타입 목록 보기
debug-mate generate --list

# 특정 타입으로 생성
debug-mate generate my_test --type 3
```

**생성 가능한 테스트 타입:**
1. 기본 Hello World
2. 루프 테스트 (for)
3. 조건문 테스트 (if-else)
4. 배열 테스트
5. 함수 테스트
6. 포인터 테스트
7. 에러가 있는 코드 (컴파일 에러)
8. 런타임 에러 코드
9. 복합 테스트 (여러 기능 포함)

### 4. 설정 관리

```bash
# 모든 설정 조회
debug-mate config --list

# 설정 값 설정
debug-mate config --set api_key=your_key

# 설정 값 조회
debug-mate config --get api_key
```

### 5. 시스템 상태 확인

```bash
# 시스템 상태 확인
debug-mate status
```

다음 항목들을 확인합니다:
- Node.js 버전
- inotify-tools 설치 여부
- GCC 설치 여부
- tmux 설치 여부
- Gemini API 키 설정 여부

### 6. 프로그램 정보

```bash
# 프로그램 정보 및 링크
debug-mate info
```

다음 정보를 표시합니다:
- 버전 정보
- Node.js 및 플랫폼 정보
- GitHub, Issues, NPM 링크
- 라이선스 정보

## 글로벌 옵션

모든 명령어에서 사용할 수 있는 글로벌 옵션:

```bash
# 디버그 모드
debug-mate --debug debug test.c

# 조용한 모드
debug-mate --quiet debug test.c
```

## 요구사항

- **OS**: Linux (Ubuntu 등)
- **Node.js**: 20.x 이상 (23.x 미만)
- **시스템 패키지**: `inotify-tools`, `gcc/g++`, `build-essential`, `tmux`
- **빌드 도구**: `python3`, `make` (tree-sitter 네이티브 모듈용)

## 기능

- **tmux 분할 화면 기본**: 모든 디버깅이 tmux 분할 화면으로 실행
- 파일 저장 감지 자동 디버깅
- 대화형 자연어 쿼리
- AI 기반 코드 분석
- 실시간 피드백
- 테스트 코드 자동 생성 (generate-test.sh 사용)
- 예쁜 CLI 인터페이스 (chalk)
- 시스템 상태 확인
- 설정 관리
- **통합된 단일 CLI**: 모든 기능이 하나의 파일에 통합

## 사용 예시

### 빠른 시작

```bash
# 1. API 키 설정
export GEMINI_API_KEY="your_key_here"

# 2. 시스템 상태 확인
debug-mate status

# 3. 테스트 코드 생성
debug-mate generate

# 4. 디버깅 시작 (tmux 분할 화면 자동 시작)
debug-mate debug test.c

# 5. 파일 편집 후 저장하면 자동 디버깅!
```

### 워크플로우

```bash
# 1. API 키 설정
export GEMINI_API_KEY="your_key_here"

# 2. 테스트 코드 생성 (선택사항)
debug-mate generate complex_test

# 3. 디버깅 시작 (tmux 분할 화면 자동 시작)
debug-mate debug complex_test.c

# 4. 왼쪽 패널에서 코드 편집
# 5. 저장하면 오른쪽에서 자동 디버깅
# 6. 자연어로 추가 질문 가능
```

## 트러블슈팅

### tree-sitter 설치 실패
```bash
# 빌드 도구 확인
sudo apt install -y python3 make gcc g++

# 캐시 정리 후 재설치
npm cache clean --force
npm install -g @debugmate/cli
```

### inotifywait 없음
```bash
sudo apt install -y inotify-tools
```

### tmux 없음
```bash
sudo apt install -y tmux
```

### tmux 세션 종료
```bash
# 현재 세션 종료
tmux kill-session

# 특정 세션 종료
tmux kill-session -t debug-mate-test
```

## 라이선스

MIT
