# Debug Mate - C 코드 디버깅 도구

## 🚀 개선된 afterDebug 함수

### 주요 개선 사항:
- **강화된 에러 처리**: API 키 검증, 네트워크 오류, 타임아웃 처리
- **입력 검증**: 빈 문자열, 잘못된 타입 입력에 대한 방어 코드
- **Windows 호환성**: `/tmp` 경로 대신 크로스 플랫폼 임시 디렉토리 사용
- **메모리 정리**: 임시 파일 자동 삭제로 메모리 누수 방지
- **응답 검증**: AI 응답 형식 검증 및 fallback 처리
- **상세한 에러 메시지**: 사용자 친화적인 한국어 에러 메시지
- **타임아웃 설정**: API 호출 30초, 실행 5초 타임아웃
- **에러 우선순위**: fatal → runtime → memory → syntax → semantic → warning 순서

### 에러 처리 개선:
- API 키 누락 시 명확한 안내
- 네트워크 오류 시 재시도 안내
- 할당량 초과 시 대기 안내
- GCC 미설치 시 설치 안내
- 파일 권한 오류 시 권한 확인 안내

### 실행 결과 표시 기능:
- **성공 실행**: 프로그램 출력 결과를 터미널에 표시
- **런타임 에러**: 에러 메시지와 함께 실행 결과 표시
- **컴파일 에러**: 컴파일 에러 분석 결과 표시
- **AI 분석**: 실행 결과를 고려한 종합적인 분석 제공

## 실행 방법

### 1. 환경 설정
먼저 `.env` 파일을 생성하고 Gemini API 키를 설정하세요:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 2. 메인 워크플로우 실행
```bash
npm run debug:main
```

이 명령어는 다음 워크플로우를 실행합니다:
1. 현재 디렉토리의 .c 파일을 자동으로 찾아서 분석
2. `beforeDebug()` - 빠른 사전 분석 실행
3. 터미널에 분석 결과 출력
4. "요청 사항을 입력하시오 : " 메시지 표시
5. 사용자 입력에 따라 다음 중 하나 실행:
   - "컴파일 실행 결과 알려줘" → `afterDebug()`
   - "루프 검사해줘" → `loopCheck()`
   - "변수 추적해줘" → `traceVar()`

### 3. afterDebug 함수 테스트
```bash
npm run test:afterdebug
```

### 4. markErrors 함수 테스트
```bash
npm run test:markerrors
```

### 5. 실행 결과 표시 기능 테스트
```bash
npm run test:execution
```

### 6. 기존 테스트 실행
```bash
npx ts-node test_driver.ts test.c
npx ts-node src/testcode/test_afterDebugFromCode.ts
```

--- Git 협업 가이드 ---
원격 저장소 삭제 확인
 git remote -v 

원격 저장소 추가
 git remote add origin https://github.com/zzmnxn/Debug_Mate

 최신 main으로 이동 후 동기화
git checkout main
git pull origin main

브랜치 생성 및 이동
 git checkout -b jimin

=======
#  작업 후 커밋 & 푸시
git add .
git commit -m "소희: 일기 작성 기능"
git push origin sohee/feature-diary


