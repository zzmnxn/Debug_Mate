# CtrZ CLI

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
npm install -g ctrz
```

### 2. API 키 설정

#### 방법 1: 환경 변수로 설정 (임시)
```bash
export GEMINI_API_KEY="your_api_key_here"
export GEMINI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent"
```

#### 방법 2: CLI로 설정 (권장)
```bash
# API 키만 설정하면 됩니다 (BASE_URL은 자동으로 설정됨)
ctrz status --set KEY=your_api_key_here
```



> **API 키 발급 방법**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 무료로 발급받을 수 있습니다.

### 3. 사용하기

```bash
# 테스트 코드 생성 (test.c 파일 생성)
ctrz generate

# tmux 분할 화면으로 디버깅 시작
ctrz debug test.c

# 또는 파일명만 입력 (기본 명령어)
ctrz test.c
```

## 🎯 사용법

### 기본 워크플로우

1. **시작**: `ctrz debug test.c` 또는 `ctrz test.c` 실행
2. **왼쪽 패널**: vi 편집기가 자동으로 열림 (50% 크기)
3. **코드 편집**: vi에서 코드 수정
4. **저장**: `:w` 명령어로 저장
5. **자동 분석**: 오른쪽에서 자동으로 AI 분석 실행
6. **결과 확인**: 오른쪽에서 AI 분석 결과 확인
7. **반복**: 다시 편집 → 저장 → 자동 분석 반복

### 패널 크기 조절

```bash
# 기본 50:50 분할
ctrz debug test.c

# 왼쪽 패널 크기 조절 (예: 30%)
ctrz debug test.c --left 30

# 왼쪽 패널 크기 조절 (예: 70%)
ctrz debug test.c --left 70
```

### AI 분석 기능

- **자동 코드 분석**: 파일 저장 시 자동으로 코드 분석 실행
- **문제점 진단**: 코드의 버그, 메모리 누수, 성능 문제 등 자동 진단
- **개선 제안**: 더 효율적인 코드로 개선하는 방법 제안
- **보안 검사**: 보안 취약점 및 안전하지 않은 코드 패턴 검사

## 📋 주요 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `debug <file>` | tmux 분할 화면으로 vi 편집기 + AI 분석 | `ctrz debug test.c` |
| `generate` | 테스트 코드 자동 생성 (test.c) | `ctrz generate` |
| `status` | 시스템 상태 및 설정 확인 | `ctrz status` |
| `status --set` | 환경변수 설정 | `ctrz status --set KEY=your_key_here` |
| `info` | 프로그램 정보 | `ctrz info` |
| `--version` | 버전 정보 표시 | `ctrz --version` |
| `--help` | 도움말 표시 | `ctrz --help` |

## 🎯 주요 기능

- **tmux 분할 화면**: 왼쪽에서 vi 편집기, 오른쪽에서 AI 분석 결과 (기본 50:50 분할)
- **자동 파일 감시**: 파일 저장 시 자동으로 AI 분석 실행
- **AI 기반 분석**: 코드의 문제점, 개선점, 보안 취약점 자동 진단
- **자동화된 워크플로우**: 편집 → 저장 → 자동 분석 반복
- **테스트 코드 생성**: 9가지 타입의 테스트 코드 자동 생성
- **간단한 CLI**: 중복 없는 깔끔한 명령어 구조

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

### 환경변수 설정 문제
```bash
# CLI로 환경변수 설정 (권장)
ctrz status --set KEY=your_api_key_here

# 환경변수가 제대로 설정되었는지 확인
echo $GEMINI_API_KEY
echo $GEMINI_BASE_URL

# 또는 CLI로 확인
ctrz status
```

### Windows/macOS 사용자
- WSL2 (Windows Subsystem for Linux) 사용
- Linux 가상머신 사용
- GitHub Codespaces 사용

## 📖 자세한 사용법

```bash
# 도움말
ctrz --help

# 특정 명령어 도움말
ctrz debug --help
ctrz generate --help
ctrz status --help
```

## 🔗 링크

- [GitHub](https://github.com/zzmnxn/Debug_Mate)
- [Issues](https://github.com/zzmnxn/Debug_Mate/issues)
- [NPM](https://www.npmjs.com/package/ctrz)

## 📄 라이선스

MIT
