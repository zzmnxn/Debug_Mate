# DebugMate

C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구입니다. `inprogress-run.ts`를 기반으로 한 서버 중심 배포 구조를 제공합니다.

## 🚀 주요 기능

- **대화형 분석**: `inprogress-run.ts`와 동일한 사용자 경험
- **자연어 처리**: 한국어로 코드 분석 요청 가능
- **실시간 피드백**: InProgressDebug → 사용자 입력 → DebugAgent 순차 실행
- **서버 중심**: 모든 로직이 서버에서 처리되어 사용자 환경 의존성 최소화

## 📋 사용 방법

### 1. 서버 실행

```bash
# 의존성 설치
npm install

# API 키 설정
export GEMINI_API_KEY=your_api_key_here

# HTTP 서버 실행
npm run start:http
```

### 2. CLI 설치 및 사용

```bash
# CLI 빌드
cd cli
npm install
npm run build

# 전역 설치
npm install -g .

# 대화형 분석 실행 (inprogress-run.ts와 동일)
debug-mate run main.c
```

### 3. 실행 과정

1. **파일 업로드**: C/C++ 파일을 서버로 전송
2. **InProgressDebug**: 코드의 기본 분석 수행
3. **결과 출력**: 분석 결과를 사용자에게 표시
4. **사용자 입력**: 자연어로 추가 분석 요청
5. **DebugAgent**: 사용자 입력을 처리하여 결과 제공

## 🔧 API 엔드포인트

| 엔드포인트 | 설명 | 사용법 |
|-----------|------|--------|
| `POST /api/inprogress-debug` | InProgressDebug 실행 | 파일 업로드 |
| `POST /api/debug-agent` | DebugAgent 실행 | 코드 + 자연어 쿼리 |
| `POST /api/inprogress-run` | 전체 플로우 실행 | 파일 + 선택적 쿼리 |
| `GET /healthz` | 서버 상태 확인 | 헬스체크 |
| `GET /api/info` | 서버 정보 | 버전, 환경 정보 |

## 🛠️ 개발 환경

### 요구사항

- Node.js 18+
- GCC (C/C++ 컴파일러)
- Gemini API 키

### 설치

```bash
# 저장소 클론
git clone <repository-url>
cd agentica-test

# 의존성 설치
npm install

# 개발 서버 실행
npm run start:http
```

### GitHub Codespaces

`.devcontainer/devcontainer.json` 파일을 통해 GitHub Codespaces에서 즉시 개발 환경을 구성할 수 있습니다.

## 📦 배포

### Docker 배포

```bash
# Docker 이미지 빌드
docker build -t debugmate .

# 컨테이너 실행
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key debugmate
```

### Docker Compose

```bash
# 환경변수 설정
export GEMINI_API_KEY=your_api_key_here

# 서비스 실행
docker-compose up -d
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

### 자동 갱신 (향후 구현)

```bash
curl -X POST http://localhost:3000/api/admin/update-key \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"newApiKey": "your_new_api_key"}'
```

## 🧪 테스트

### CLI 테스트

```bash
# 서버 상태 확인
debug-mate status

# 대화형 분석 테스트
debug-mate run test.c

# 직접 분석 테스트
debug-mate analyze test.c "루프 검사"
```

### API 테스트

```bash
# 헬스체크
curl http://localhost:3000/healthz

# InProgressDebug 테스트
curl -X POST http://localhost:3000/api/inprogress-debug \
  -F "file=@test.c"

# DebugAgent 테스트
curl -X POST http://localhost:3000/api/debug-agent \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <stdio.h>\nint main() { return 0; }",
    "userQuery": "루프 검사",
    "filename": "test.c"
  }'
```

## 📁 프로젝트 구조

```
agentica-test/
├── src/
│   ├── agentica/
│   │   ├── DebugAgent.ts      # 메인 디버깅 로직
│   │   ├── handlers.ts        # 핸들러 함수들
│   │   ├── inprogress-run.ts  # 원본 대화형 진입점
│   │   └── server.ts          # WebSocket 서버
│   ├── http-server.ts         # HTTP API 서버
│   └── parsing/               # 코드 파싱 모듈
├── cli/
│   ├── src/
│   │   └── cli.ts            # CLI 인터페이스
│   └── package.json
├── docker-compose.yml         # Docker 설정
└── DEPLOYMENT.md             # 상세 배포 가이드
```

## 🐛 트러블슈팅

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
   # Ubuntu/Debian
   sudo apt-get install gcc
   
   # macOS
   xcode-select --install
   ```

## 📄 라이선스

ISC License

## 🤝 기여

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 지원

- **문서**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **이슈**: GitHub Issues
- **배포**: GitHub Codespaces 지원

---

**DebugMate** - C/C++ 코드 분석을 위한 AI 기반 대화형 디버깅 도구


