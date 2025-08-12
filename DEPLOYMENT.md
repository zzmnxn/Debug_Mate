# DebugMate 배포 가이드 (리눅스 환경)

## 개요

DebugMate는 C/C++ 코드 분석을 위한 AI 기반 도구입니다. 무료 Gemini API 키의 제한사항을 고려하여 하이브리드 배포 방식을 채택했습니다.

## 🚀 빠른 시작

### 1. 로컬 실행 (추천)

```bash
# 1. 의존성 설치
npm install

# 2. API 키 설정
export GEMINI_API_KEY=your_api_key_here

# 3. 실행
npm run debug main.c "루프 검사"
```

### 2. CLI 도구 사용

```bash
# CLI 빌드
cd cli
npm install
npm run build

# 사용
./dist/cli.js analyze main.c "루프 검사"
```

## 📋 상세 배포 방법

### 방법 1: 하이브리드 배포 (추천)

**개념**: 서버 연결 시도 → 실패 시 로컬 실행

#### 1.1 서버 배포 (선택사항)

```bash
# Docker로 로컬 서버 실행
docker-compose up -d

# 또는 직접 실행
npm run build
npm start
```

#### 1.2 CLI 배포

```bash
cd cli
npm install
npm run build
npm publish --access public
```

#### 1.3 사용자 설정

```bash
# CLI 설치
npm install -g @debugmate/cli

# 설정 파일 생성
mkdir -p ~/.debugmate
cat > ~/.debugmate/config.json << EOF
{
  "serverUrl": "ws://localhost:3000",
  "fallbackToLocal": true
}
EOF
```

### 방법 2: 완전 로컬 배포

**개념**: 서버 없이 모든 기능을 로컬에서 실행

#### 2.1 환경 설정

```bash
# 필수 패키지 설치
sudo apt-get update
sudo apt-get install -y gcc g++ build-essential

# Node.js 의존성 설치
npm install

# API 키 설정
export GEMINI_API_KEY=your_api_key_here
```

#### 2.2 실행

```bash
# 직접 실행
npm run debug main.c "루프 검사"

# 또는 CLI 사용
cd cli
npm run dev main.c "루프 검사"
```

## 📦 API 키 관리

### 자동 갱신 스크립트

```bash
# 스크립트 실행 권한 부여
chmod +x scripts/update-api-key.sh

# API 키 갱신
./scripts/update-api-key.sh
```

### 수동 갱신

```bash
# 환경변수 설정
export GEMINI_API_KEY=new_api_key_here

# .env 파일에 저장
echo "GEMINI_API_KEY=new_api_key_here" > .env
```

## 💰 비용 최적화

### 무료 티어 활용

1. **Render.com**: 월 750시간 무료
2. **Railway**: 월 $5 크레딧 무료
3. **Fly.io**: 3개 앱 무료

### 서버 비용 절약 전략

1. **필요시에만 배포**: 데모나 테스트 시에만 서버 실행
2. **로컬 우선**: 기본적으로 로컬 실행, 서버는 백업용
3. **자동 종료**: 사용 후 서버 자동 종료

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

1. **API 키 만료**
   ```bash
   # 새로운 키 발급 후
   ./scripts/update-api-key.sh
   ```

2. **gcc 없음**
   ```bash
   sudo apt-get install gcc
   ```

3. **메모리 부족**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=256"
   ```

### 로그 확인

```bash
# 서버 로그
tail -f server.log

# Docker 로그
docker-compose logs -f

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
debug-mate analyze main.c "루프 검사"
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

# 분석 실행
echo "테스트 파일 분석 중..."
npm run debug demo.c "루프 검사"

echo "데모 완료!"
```

## 📝 제출 준비 체크리스트

- [ ] 코드 통합 완료
- [ ] API 키 설정
- [ ] 로컬 테스트 통과
- [ ] CLI 빌드 완료
- [ ] 데모 스크립트 준비
- [ ] 문서 작성 완료
- [ ] README 업데이트

## 🎯 최종 권장사항

1. **우선순위**: 로컬 실행 완성 → CLI 패키지화 → 서버 배포 (선택사항)
2. **API 키**: 수동 갱신 스크립트 활용
3. **비용**: 무료 티어 활용, 필요시에만 서버 실행
4. **안정성**: 하이브리드 모드로 서버 실패 시 로컬 폴백
