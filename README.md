# DebugMate CLI

C/C++ 코드를 AI로 분석하고 디버깅하는 Linux 전용 CLI 도구

## 🚀 빠른 시작

### 1. 설치

```bash
# 시스템 요구사항 설치
sudo apt update
sudo apt install -y tmux inotify-tools gcc g++ build-essential python3 make

# Node.js 20+ 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# CLI 설치
npm install -g @debugmate/cli
```

### 2. API 키 설정

```bash
export GEMINI_API_KEY="your_api_key_here"
```

### 3. 사용하기

```bash
# 테스트 코드 생성
debug-mate generate

# tmux 분할 화면으로 디버깅 시작
debug-mate debug test.c
```

## 🎯 사용법

### 기본 워크플로우

1. **시작**: `debug-mate debug test.c` 실행
2. **왼쪽 패널**: vi 편집기가 자동으로 열림
3. **코드 편집**: vi에서 코드 수정
4. **저장**: `:w` 명령어로 저장
5. **질문**: 오른쪽 패널에서 자연어로 질문 입력
6. **AI 분석**: 오른쪽에서 AI 분석 결과 확인
7. **반복**: 다시 편집 → 저장 → 질문 가능

### 자연어 질문 예시

- "이 코드의 문제점은?"
- "어떻게 개선할 수 있어?"
- "메모리 누수는 없어?"
- "이 함수의 복잡도는?"
- "더 효율적인 방법이 있어?"

## 📋 주요 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `debug <file>` | tmux 분할 화면으로 vi 편집기 + AI 분석 | `debug-mate debug test.c` |
| `generate [name]` | 테스트 코드 자동 생성 | `debug-mate generate my_test` |
| `status` | 시스템 상태 확인 | `debug-mate status` |
| `--help` | 도움말 표시 | `debug-mate --help` |

## 🎯 주요 기능

- **tmux 분할 화면**: 왼쪽에서 vi 편집기, 오른쪽에서 AI 분석 결과
- **자동 파일 감시**: 파일 저장 시 자연어 질문 입력 받기
- **AI 기반 분석**: 자연어로 코드 분석 및 디버깅
- **대화형 워크플로우**: 편집 → 저장 → 질문 → 분석 반복
- **테스트 코드 생성**: 9가지 타입의 테스트 코드 자동 생성

## ⚠️ 요구사항

- **OS**: Linux (Ubuntu, Debian 등)
- **Node.js**: 20.x 이상
- **시스템 패키지**: tmux, inotify-tools, gcc/g++, python3, make

## 🔧 트러블슈팅

### tmux가 감지되지 않는 경우
```bash
sudo apt install -y tmux
```

### inotify-tools 오류
```bash
sudo apt install -y inotify-tools
```

### vi 편집기 사용법
```bash
# vi 기본 명령어
i          # 입력 모드
Esc        # 명령 모드
:w          # 파일 저장
:q          # 종료
:wq         # 저장 후 종료
:q!         # 저장하지 않고 종료
```

### Windows/macOS 사용자
- WSL2 (Windows Subsystem for Linux) 사용
- Linux 가상머신 사용
- GitHub Codespaces 사용

## 📖 자세한 사용법

```bash
# 도움말
debug-mate --help

# 특정 명령어 도움말
debug-mate debug --help
debug-mate generate --help
```

## 🔗 링크

- [GitHub](https://github.com/zzmnxn/Debug_Mate)
- [Issues](https://github.com/zzmnxn/Debug_Mate/issues)
- [NPM](https://www.npmjs.com/package/@debugmate/cli)

## 📄 라이선스

MIT
