# DebugMate

C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구입니다. Linux 환경에서 파일 저장을 감지하여 자동으로 디버깅을 수행합니다.

## 🚀 주요 기능

- **파일 감시**: `inotifywait`를 사용한 자동 파일 감지
- **대화형 분석**: `inprogress-run.ts` 기반의 자연어 디버깅
- **tmux 분할 화면**: 편집과 디버깅을 동시에 볼 수 있는 분할 화면
- **테스트 코드 생성**: 다양한 테스트 케이스 자동 생성
- **실시간 피드백**: 파일 저장 시 즉시 디버깅 실행

## 📋 사용 방법

### 1. 기본 디버깅

```bash
# API 키 설정
export GEMINI_API_KEY=your_api_key_here

# 파일 감시 및 디버깅 시작
./watch-and-debug.sh test.c
```

### 2. tmux 분할 화면 모드

```bash
# tmux를 사용한 자동 분할 화면
# 왼쪽: 파일 편집, 오른쪽: 디버깅 결과
./debug-mate-tmux.sh test.c
```

### 3. 테스트 코드 자동 생성

```bash
# 다양한 테스트 케이스 자동 생성
./generate-test.sh

# 또는 특정 이름으로 생성
./generate-test.sh my_test
```

## 🛠️ 개발 환경

### 요구사항

- **OS**: Linux (Ubuntu 등)
- **Node.js**: 20.x 이상 (23.x 미만)
- **시스템 패키지**: `inotify-tools`, `gcc/g++`, `build-essential`, `tmux`
- **빌드 도구**: `python3`, `make` (tree-sitter 네이티브 모듈용)

### 설치

```bash
# 시스템 패키지 설치
sudo apt update
sudo apt install -y inotify-tools gcc g++ build-essential tmux python3 make

# Node.js 20+ 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 저장소 클론
git clone https://github.com/zzmnxn/Debug_Mate.git
cd Debug_Mate

# 의존성 설치
npm install

# 개발용 빌드
npm run build
```

## 📦 CLI 패키지 배포

### CLI 빌드 및 배포

```bash
# CLI 패키지 빌드
npm run cli:build

# CLI 패키지 설치
npm run cli:install

# 전역 설치
cd cli
npm install -g .
```

### 사용자 설치

```bash
# 전역 설치
npm install -g @debugmate/cli

# 사용
debug-mate test.c
debug-mate-tmux test.c
debug-mate-generate
```

## 🔧 사용 예시

### 빠른 시작

```bash
# 1. 테스트 코드 생성
./generate-test.sh

# 2. tmux 모드로 디버깅 시작
./debug-mate-tmux.sh test.c

# 3. 파일 편집 후 저장하면 자동 디버깅!
```

### 워크플로우

```bash
# 1. API 키 설정
export GEMINI_API_KEY="your_key_here"

# 2. 테스트 코드 생성 (선택사항)
./generate-test.sh complex_test

# 3. tmux 모드 시작
./debug-mate-tmux.sh complex_test.c

# 4. 왼쪽 패널에서 코드 편집
# 5. 저장하면 오른쪽에서 자동 디버깅
# 6. 자연어로 추가 질문 가능
```

## 🧪 생성 가능한 테스트 케이스

1. **기본 Hello World** - 간단한 시작
2. **루프 테스트** - for 루프 연습
3. **조건문 테스트** - if-else 문법
4. **배열 테스트** - 배열과 반복문
5. **함수 테스트** - 함수 정의와 호출
6. **포인터 테스트** - 포인터 기본 개념
7. **컴파일 에러** - 의도적인 문법 오류
8. **런타임 에러** - 실행 시 발생하는 오류
9. **복합 테스트** - 구조체, 함수, 루프 조합

## 🔧 npm 스크립트

```bash
# 기본 디버깅
npm run debug-mate test.c

# tmux 분할 화면
npm run debug-mate-tmux test.c

# 테스트 코드 생성
npm run debug-mate-generate

# CLI 패키지 빌드
npm run cli:build

# CLI 개발 모드
npm run cli:dev
```

## ❗ 트러블슈팅

### tree-sitter 설치 실패
```bash
# 빌드 도구 확인
sudo apt install -y python3 make gcc g++

# 캐시 정리 후 재설치
npm cache clean --force
npm install
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

## 📦 배포

### GitHub Actions 자동 배포

태그를 푸시하면 자동으로 CLI 패키지가 배포됩니다:

```bash
git tag v1.1.0
git push --tags
```

### 수동 배포

```bash
cd cli
npm version patch
npm publish --access public
```

## 📄 라이선스

MIT License

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


