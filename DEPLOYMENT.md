
# DebugMate 배포 가이드 (Linux 전용 • 서버 없음)

## 개요

DebugMate는 **리눅스 환경 전용** C/C++ 대화형 디버깅 CLI입니다.
**서버가 필요 없습니다.** 파일 저장을 감지하여 InProgress 디버깅 → 사용자 입력 → DebugAgent 실행까지 **로컬에서** 수행합니다.

* 지원 OS: Linux (Ubuntu 등)
* 필요 조건: Node.js ≥ 20, `inotify-tools`, `gcc/g++`
* API 키: 환경 변수 `GEMINI_API_KEY`(무료 Gemini 키 수동 교체)

---

## 🚀 빠른 시작 (사용자용)

```bash
# 0) 필수 패키지
sudo apt update
sudo apt install -y inotify-tools gcc g++ build-essential

# 1) Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2) CLI 설치
npm i -g @debugmate/cli

# 3) Gemini API 키
export GEMINI_API_KEY="your_api_key_here"

# 4) 실행 (파일 저장 감지 후 자동 디버깅)
debug-mate test.c
```

> `debug-mate` 명령은 내부적으로 **파일 저장 이벤트를 감시**하고, 저장될 때마다 InProgress 디버깅 → 사용자 질의 입력 → DebugAgent 실행을 순차적으로 진행합니다.
> (표준입력은 TTY로 연결되어 있어 터미널에서 자연어 요청을 바로 입력할 수 있습니다.)

---

## 🔧 명령 안내

* `debug-mate <파일>`: `<파일>`의 저장을 감시합니다. 저장될 때마다 다음을 수행합니다.

  1. InProgress 디버깅 실행 → 결과 터미널 출력
  2. 사용자 질의 Prompt 표시(빈 입력 시 종료)
  3. DebugAgent 실행 결과 출력 후 종료 코드 반영

* 중단: `Ctrl+C`

---

## 🧩 내부 동작 개요 (참고)

* 파일 감시: `inotifywait`(inotify-tools)
* 실행 흐름: `watch-and-debug.sh` → `inprogress-run.ts` → `DebugAgent.ts`
  (현재 구현은 런타임에 `ts-node`로 TypeScript 엔트리를 기동합니다.)
* 표준입력 TTY 연결로 터미널 대화형 상호작용 지원

---

## 🔐 API 키 관리

* 환경 변수 사용:

```bash
  export GEMINI_API_KEY="your_api_key_here"
  ```
* 무료 키를 주기적으로 교체해야 할 경우, 새 키로 위 변수를 갱신한 뒤 **다시 실행**하면 됩니다.
* (차기 버전 계획) 로컬 키 로테이터/보안 저장(keytar) 옵션은 추후 릴리스에 포함 예정.

---

## 🐧 리눅스 환경 최적화

```bash
# 필수 패키지
sudo apt-get install -y \
  gcc g++ build-essential \
  inotify-tools curl git

# Node.js (v20 이상 권장)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

성능 팁:

```bash
# Node 힙 제한 조정(환경에 맞게)
export NODE_OPTIONS="--max-old-space-size=512"
```

---

## ❗ 트러블슈팅

* `debug-mate: command not found`
  → `npm i -g @debugmate/cli` 재설치, 또는 `$PATH`에 npm global bin 경로 추가.

* `inotifywait: not found`
  → `sudo apt install -y inotify-tools` 설치.

* `GEMINI_API_KEY` 오류/미설정
  → `echo $GEMINI_API_KEY`로 확인 후 다시 `export` 설정.

* `ts-node` 관련 에러
  → 전역이 아니라 **패키지 동봉** 의존성을 사용합니다. `@debugmate/cli`를 재설치해 보세요.

---

## 📦 패키징(프로젝트 관점)

### CLI 패키지 구조

`cli/package.json` (수정 필요)

```json
{
  "name": "@debugmate/cli",
  "version": "1.1.0",
  "description": "C/C++ 대화형 디버깅 CLI (Linux only, no server)",
  "bin": {
    "debug-mate": "watch-and-debug.sh"
  },
  "files": [
    "watch-and-debug.sh",
    "src/agentica/",
    "src/config/",
    "src/parsing/",
    "package.json",
    "tsconfig.json",
    "README.md"
  ],
  "scripts": {
    "prepublishOnly": "chmod +x watch-and-debug.sh && npm run build",
    "build": "tsc",
    "postinstall": "chmod +x watch-and-debug.sh"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "tree-sitter": "^0.22.4",
    "tree-sitter-c": "^0.24.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4",
    "zod": "^3.25.76"
  },
  "engines": { "node": ">=20" }
}
```

### 필요한 파일 포함

배포 시 다음 파일들이 CLI 패키지에 포함되어야 합니다:

```
cli/
├── watch-and-debug.sh          # 메인 실행 스크립트
├── src/
│   ├── agentica/
│   │   ├── inprogress-run.ts   # 대화형 실행 엔트리
│   │   ├── DebugAgent.ts       # AI 디버깅 로직
│   │   ├── handlers.ts         # 핸들러 함수들
│   │   └── server.ts           # (참고용)
│   ├── config/
│   │   └── SGlobal.ts          # 환경 설정
│   └── parsing/
│       ├── codeParser.ts       # 코드 파싱
│       ├── compilerResultParser.ts
│       └── loopExtractor.ts
├── package.json
└── tsconfig.json
```

> 배포 시 **소스 실행에 필요한 TS 엔트리**를 함께 포함해야 합니다.
> (기존 문서의 서버 실행/포트 포워딩/REST API 호출 안내는 더 이상 필요하지 않습니다. 해당 부분은 제거 권장입니다.)

---

## 🤖 GitHub Actions: NPM 자동 배포

`.github/workflows/release.yml`

```yaml
name: Release (NPM)

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: read
  id-token: write

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: cli

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Use Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          registry-url: "https://registry.npmjs.org"

      - name: Install deps
        run: npm ci

      - name: Copy source files
        run: |
          mkdir -p src
          cp -r ../src/* src/
          cp ../tsconfig.json .
          cp ../watch-and-debug.sh .

      - name: Make script executable
        run: chmod +x watch-and-debug.sh

      # (선택) Git 태그 버전을 package.json에 동기화하고 싶다면 주석 해제
      # - name: Sync version from tag
      #   run: |
      #     VER="${GITHUB_REF_NAME#v}"
      #     jq ".version=\"${VER}\"" package.json > package.tmp && mv package.tmp package.json

      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**배포 절차**

1. GitHub Secrets에 `NPM_TOKEN` 등록
2. 리포지토리 태그 푸시: `git tag v1.1.0 && git push --tags`
3. Actions가 자동으로 `@debugmate/cli`를 배포

---

## 🧪 데모 스크립트 (옵션)

```bash
#!/usr/bin/env bash
set -e

if ! command -v debug-mate >/dev/null; then
  echo "debug-mate가 없습니다. npm i -g @debugmate/cli 로 설치하세요."
  exit 1
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "GEMINI_API_KEY 를 export 하세요."
    exit 1
fi

cat > demo.c <<'EOF'
#include <stdio.h>
int main() {
    int i;
    for (i = 0; i < 3; i++) printf("%d\n", i);
    return 0;
}
EOF

echo "demo.c 저장을 감시합니다. 파일을 편집 후 저장해 보세요."
debug-mate demo.c
```

---

## 📝 제출 체크리스트 (이 문서 기준)

* [ ] **서버 관련 섹션 전부 삭제**(Codespaces 포트 포워딩/HTTP 엔드포인트/`start:http` 등)   
* [ ] `Linux only` 명시 및 필수 패키지/Node 20 설치 안내
* [ ] `npm i -g @debugmate/cli` 설치 후 `debug-mate <file>` 사용 예시
* [ ] `GEMINI_API_KEY` 설정 방법 안내
* [ ] GitHub Actions `release.yml` 추가 및 `NPM_TOKEN` 준비
* [ ] CLI 패키지 구조 수정 (필요한 소스 파일 포함)
* [ ] `watch-and-debug.sh` 실행 권한 설정

---


