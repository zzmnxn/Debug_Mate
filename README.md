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

## 📋 주요 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `debug <file>` | tmux 분할 화면으로 파일 감시 및 자동 디버깅 | `debug-mate debug test.c` |
| `generate [name]` | 테스트 코드 자동 생성 | `debug-mate generate my_test` |
| `status` | 시스템 상태 확인 | `debug-mate status` |
| `--help` | 도움말 표시 | `debug-mate --help` |

## 🎯 주요 기능

- **tmux 분할 화면**: 왼쪽에서 코드 편집, 오른쪽에서 실시간 디버깅 결과
- **자동 파일 감시**: 파일 저장 시 자동으로 디버깅 실행
- **AI 기반 분석**: 자연어로 코드 분석 및 디버깅
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
