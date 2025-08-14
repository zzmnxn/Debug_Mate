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

### 1. 기본 디버깅

```bash
# Gemini API 키 설정
export GEMINI_API_KEY="your_api_key_here"

# 파일 감시 및 디버깅 시작
debug-mate test.c
```

### 2. tmux 분할 화면 모드

```bash
# tmux를 사용한 자동 분할 화면
# 왼쪽: 파일 편집, 오른쪽: 디버깅 결과
debug-mate-tmux test.c
```

**tmux 모드 특징:**
- 자동으로 2개 패널로 분할
- 왼쪽 60%: 파일 편집 영역
- 오른쪽 40%: 실시간 디버깅 결과
- 파일 저장 시 자동 디버깅 실행
- `Ctrl+C`로 종료

### 3. 테스트 코드 자동 생성

```bash
# 다양한 테스트 케이스 자동 생성
debug-mate-generate

# 또는 특정 이름으로 생성
debug-mate-generate my_test
```

**생성 가능한 테스트 케이스:**
1. 기본 Hello World
2. 루프 테스트 (for)
3. 조건문 테스트 (if-else)
4. 배열 테스트
5. 함수 테스트
6. 포인터 테스트
7. 에러가 있는 코드 (컴파일 에러)
8. 런타임 에러 코드
9. 복합 테스트 (여러 기능 포함)

## 요구사항

- **OS**: Linux (Ubuntu 등)
- **Node.js**: 20.x 이상 (23.x 미만)
- **시스템 패키지**: `inotify-tools`, `gcc/g++`, `build-essential`, `tmux`
- **빌드 도구**: `python3`, `make` (tree-sitter 네이티브 모듈 컴파일용)

## 기능

- 파일 저장 감지 자동 디버깅
- 대화형 자연어 쿼리
- AI 기반 코드 분석
- 실시간 피드백
- tmux 분할 화면 지원
- 테스트 코드 자동 생성

## 사용 예시

### 빠른 시작

```bash
# 1. 테스트 코드 생성
debug-mate-generate

# 2. tmux 모드로 디버깅 시작
debug-mate-tmux test.c

# 3. 파일 편집 후 저장하면 자동 디버깅!
```

### 워크플로우

```bash
# 1. API 키 설정
export GEMINI_API_KEY="your_key_here"

# 2. 테스트 코드 생성 (선택사항)
debug-mate-generate complex_test

# 3. tmux 모드 시작
debug-mate-tmux complex_test.c

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
