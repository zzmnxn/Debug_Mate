# DebugMate 서버 중심 배포 가이드

## 개요

DebugMate는 C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구입니다. 서버 중심 배포 방식을 채택하여 사용자가 모든 파일을 설치할 필요 없이 CLI만으로 모든 기능을 사용할 수 있습니다.

## 🚀 빠른 시작

### 1. 서버 배포 (GitHub Codespaces)

```bash
# 1. 의존성 설치
npm install

# 2. API 키 설정
export GEMINI_API_KEY=your_api_key_here

# 3. HTTP 서버 실행
npm run start:http
```

### 2. CLI 설치 및 사용

```bash
# CLI 설치
npm install -g @debugmate/cli

# 설정
mkdir -p ~/.debugmate
cat > ~/.debugmate/config.json << EOF
{
  "serverUrl": "http://localhost:3000",
  "timeout": 30000
}
EOF

# 사용
debug-mate run test.c
```

## 📋 상세 배포 방법

### 방법 1: GitHub Codespaces 배포 (추천)

#### 1.1 Codespaces 설정

GitHub Codespaces에서 프로젝트를 열면 자동으로 개발 환경이 구성됩니다.

#### 1.2 서버 실행

```bash
# 의존성 설치
npm install

# API 키 설정
export GEMINI_API_KEY=your_gemini_api_key_here

# HTTP 서버 실행
npm run start:http
```

#### 1.3 포트 포워딩

- Codespaces에서 포트 3000을 자동으로 포워딩
- 외부에서 접근 가능한 URL 제공 (예: `https://username-codespace-3000.preview.app.github.dev`)

#### 1.4 CLI 설정

```bash
# Codespaces URL로 설정
cat > ~/.debugmate/config.json << EOF
{
  "serverUrl": "https://your-codespace-url-3000.preview.app.github.dev",
  "timeout": 30000
}
EOF
```

### 방법 2: 로컬 서버 배포

#### 2.1 로컬 환경 설정

```bash
# Node.js 설치 (v18 이상)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# GCC 설치
sudo apt-get install -y gcc g++ build-essential

# 프로젝트 클론
git clone <repository-url>
cd agentica-test

# 의존성 설치
npm install
```

#### 2.2 서버 실행

```bash
# API 키 설정
export GEMINI_API_KEY=your_api_key_here

# 서버 실행
npm run start:http
```

## 📦 CLI 패키지 배포

### 1. CLI 빌드

```bash
# CLI 디렉토리로 이동
cd cli

# 의존성 설치
npm install

# TypeScript 빌드
npm run build
```

### 2. npm 배포

```bash
# 버전 업데이트
npm version patch

# npm에 배포
npm publish --access public
```

### 3. 사용자 설치

```bash
# 전역 설치
npm install -g @debugmate/cli

# 사용
debug-mate run test.c
```

## 🔧 사용 방법

### 1. 대화형 분석 (inprogress-run.ts 기반)

```bash
# 파일을 업로드하고 InProgressDebug 실행 후 사용자 입력 받기
debug-mate run test.c
```

**실행 과정:**
1. 파일 업로드 → InProgressDebug 실행
2. InProgressDebug 결과 출력
3. 사용자 입력 대기
4. DebugAgent로 자연어 처리
5. 결과 출력

### 2. 직접 분석

```bash
# 파일과 쿼리를 한번에 전송
debug-mate analyze test.c "루프 검사"
```

### 3. 서버 상태 확인

```bash
debug-mate status
```

## 📡 API 엔드포인트

### 주요 엔드포인트

| 엔드포인트 | 설명 | 사용법 |
|-----------|------|--------|
| `POST /api/inprogress-debug` | InProgressDebug 실행 | 파일 업로드 |
| `POST /api/debug-agent` | DebugAgent 실행 | 코드 + 자연어 쿼리 |
| `POST /api/inprogress-run` | 전체 플로우 실행 | 파일 + 선택적 쿼리 |
| `POST /api/analyze` | 코드 분석 (기존) | 파일 + 쿼리 |
| `GET /healthz` | 헬스체크 | 서버 상태 확인 |
| `GET /api/info` | 서버 정보 | 버전, 환경 정보 |

### 사용 예시

```bash
# InProgressDebug 실행
curl -X POST http://localhost:3000/api/inprogress-debug \
  -F "file=@test.c"

# DebugAgent 실행
curl -X POST http://localhost:3000/api/debug-agent \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() { return 0; }",
    "userQuery": "루프 검사",
    "filename": "test.c"
  }'
```

## 🔑 API 키 관리

### 환경변수 설정

```bash
# Linux/macOS
export GEMINI_API_KEY=your_api_key_here

# Windows
set GEMINI_API_KEY=your_api_key_here

# .env 파일
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### API 키 갱신

무료 Gemini API 키는 사용량 제한이 있으므로 주기적으로 갱신이 필요합니다:

```bash
# 새 API 키 발급 후 환경변수 업데이트
export GEMINI_API_KEY=new_api_key_here

# 서버 재시작
npm run start:http
```

## 💰 비용 최적화

### 무료 티어 활용

1. **GitHub Codespaces**: 월 60시간 무료
2. **Gemini API**: 무료 티어 (월 사용량 제한)
3. **npm**: 무료 패키지 배포

### 비용 절약 전략

1. **API 키 로테이션**: 여러 API 키를 순환 사용
2. **사용량 모니터링**: API 호출 횟수 추적
3. **캐싱**: 동일한 분석 결과 재사용

## 🐧 리눅스 환경 최적화

### 시스템 요구사항

```bash
# 필수 패키지
sudo apt-get install -y \
  gcc \
  g++ \
  build-essential \
  curl \
  git

# Node.js (v18 이상)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 성능 최적화

```bash
# 메모리 제한 설정
export NODE_OPTIONS="--max-old-space-size=512"

# CPU 제한 (선택사항)
# taskset -c 0-1 npm start
```

## 🔧 트러블슈팅

### 일반적인 문제

1. **서버 연결 실패**
   ```bash
   # 서버 상태 확인
   debug-mate status
   
   # 서버 재시작
   npm run start:http
   ```

2. **API 키 오류**
   ```bash
   # 환경변수 확인
   echo $GEMINI_API_KEY
   
   # 새 키 설정
   export GEMINI_API_KEY=new_key_here
   ```

3. **GCC 없음**
   ```bash
   sudo apt-get install gcc
   ```

4. **메모리 부족**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=256"
   ```

### 로그 확인

```bash
# 서버 로그
tail -f server.log

# 시스템 리소스
htop
free -h
```

## 📦 패키지 배포

### CLI 패키지 배포

```bash
cd cli

# 버전 업데이트
npm version patch

# 빌드
npm run build

# 배포
npm publish --access public
```

### 사용자 설치

```bash
# 전역 설치
npm install -g @debugmate/cli

# 사용
debug-mate run test.c
```

## 🚀 데모 준비

### 데모용 스크립트

```bash
#!/bin/bash
# demo.sh

echo "DebugMate 데모 시작"
echo "=================="

# API 키 확인
if [ -z "$GEMINI_API_KEY" ]; then
    echo "GEMINI_API_KEY를 설정해주세요"
    exit 1
fi

# 서버 시작
echo "서버 시작 중..."
npm run start:http &
SERVER_PID=$!

# 서버 시작 대기
sleep 5

# 테스트 파일 생성
cat > demo.c << 'EOF'
#include <stdio.h>

int main() {
    int i;
    for(i = 0; i < 10; i++) {
        printf("%d\n", i);
    }
    return 0;
}
EOF

# CLI 테스트
echo "CLI 테스트 중..."
debug-mate analyze demo.c "루프 검사"

# 서버 종료
kill $SERVER_PID

echo "데모 완료!"
```

## 📝 제출 준비 체크리스트

- [ ] 서버 중심 배포 구조 완성
- [ ] inprogress-run.ts 기능 API화 완료
- [ ] CLI 대화형 인터페이스 구현
- [ ] GitHub Codespaces 최적화
- [ ] 에러 처리 및 로깅 완성
- [ ] 문서 작성 완료
- [ ] README 업데이트

## 🎯 최종 권장사항

1. **우선순위**: 서버 실행 → CLI 배포 → API 키 자동화
2. **API 키**: 자동 로테이션 시스템 구축
3. **비용**: GitHub Codespaces 무료 티어 활용
4. **안정성**: 헬스체크 및 에러 처리 강화
5. **사용성**: inprogress-run.ts와 동일한 사용자 경험 제공

## 🔄 업데이트 로그

### v1.0.0 (현재)
- ✅ 서버 중심 배포 구조 구현
- ✅ inprogress-run.ts 기능 API화
- ✅ 대화형 CLI 인터페이스 구현
- ✅ 파일 업로드 및 분석 API
- ✅ GitHub Codespaces 지원

## 📞 지원

- **문서**: [README.md](./README.md)
- **이슈**: GitHub Issues
- **배포**: GitHub Codespaces 지원
