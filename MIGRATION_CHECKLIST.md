# 리팩토링 개요

* 목적: 거대한 `handlers.ts`를 기능별·관심사별로 분리해 **유지보수성/충돌 최소화** 확보
* 변화: **퍼블릭 시그니처 유지**, 로직은 그대로—파일 위치/구조만 변경
* 결과: 핸들러·프롬프트·컴파일/AI 서비스·유틸·설정으로 모듈화

# 최종 폴더 구조

```
src/
  config/            # 공통 설정
  utils/             # 파일/프로세스 유틸
  prompts/           # LLM 프롬프트
  services/
    ai/              # Gemini 클라이언트 & 분석기
    compiler.ts      # 컴파일/실행 공통
  handlers/          # 각 기능별 핸들러
handlers.ts          # (옵션) 배럴 re-export
```

# 팀 공통 체크리스트

* [ ] 새 브랜치 생성: `refactor/handlers-split-<issue#>`
* [ ] `.env`에 `GEMINI_API_KEY` 확인
* [ ] Node/패키지 설치 최신화(`@google/generative-ai`, `uuid`)
* [ ] **퍼블릭 시그니처 유지** 원칙 확인(함수명/인자/리턴 동일)

# 파일 이관 체크리스트

* [ ] `handlers.ts`의 각 기능을 다음으로 분리

  * [ ] `afterDebug` → `src/handlers/afterDebug.ts`
  * [ ] `afterDebugFromCode` → `src/handlers/afterDebugFromCode.ts`
  * [ ] `beforeDebug` → `src/handlers/beforeDebug.ts`
  * [ ] `inProgressDebug` → `src/handlers/inProgressDebug.ts`
  * [ ] `loopCheck` → `src/handlers/loopCheck.ts`
  * [ ] `traceVar` → `src/handlers/traceVar.ts`
  * [ ] `markErrors` → `src/handlers/markErrors.ts`
* [ ] 프롬프트 텍스트 분리

  * [ ] afterDebug → `src/prompts/afterDebugPrompt.ts`
  * [ ] beforeDebug → `src/prompts/beforeDebugPrompt.ts`
  * [ ] loopCheck → `src/prompts/loopCheckPrompt.ts`
  * [ ] traceVar → `src/prompts/traceVarPrompt.ts`
  * [ ] inProgressDebug → `src/prompts/inProgressDebugPrompt.ts`
* [ ] 공통 서비스 분리

  * [ ] `compileC / runExecutable / cleanup` → `src/services/compiler.ts`
  * [ ] `getModel()` → `src/services/ai/client.ts`
  * [ ] 분석기 스텁 → `src/services/ai/analyzers/{afterDebug,loopCheck,traceVar,testBreak,inProgressDebug}.ts`
* [ ] 설정/상수 외부화 → `src/config/debugConfig.ts`

  * [ ] 모델명/토큰/타임아웃/MAX\_ITEMS/TMP\_DIR

# 코드 수정 체크리스트

* [ ] **임포트 경로 전면 교체**

  * [ ] `from "handlers"` 사용 시, 배럴 유지하면 그대로 / 아니면 `from "./src/handlers"`로
  * [ ] 내부 참조는 `../services/...`, `../prompts/...`로 통일
* [ ] 임시 실행파일명 고정(`a.out`) 제거 → 유니크 경로 사용
* [ ] `uniqueTmpPath`, `ensureTmpDir`, `safeUnlink` 적용
* [ ] API 키 검증을 **클라이언트 생성 시점**에 수행

# 에러 처리 합류(팀원 작업 후 적용)

* [ ] 각 핸들러의 에러 처리 로직을 **분리된 파일**의 TODO 위치에 삽입
* [ ] AI 응답 포맷 검증(필요 시 공통 유틸로 통일)
* [ ] 런타임 타임아웃/무한루프 힌트 규칙 공통화

# 테스트 체크리스트(스모크)

* [ ] `afterDebugFromCode`: 컴파일 실패/성공 각각 동작
* [ ] `beforeDebug`: 로그 요약만으로 분석 호출
* [ ] `loopCheck`: for/while/do-while + 중첩 케이스
* [ ] `traceVar`: 선언→변경→사용 라인 추적
* [ ] `inProgressDebug`: 프롬프트 연결만 확인
* [ ] `tsc --noEmit` 무오류, ESLint/Prettier 통과

# PR 규칙

* [ ] PR 제목: `refactor: split handlers into modules (no behavior change)`
* [ ] 설명에 **“동작 동일, 구조 변경만”** 명시
* [ ] 커밋은 단계별(스캐폴드 → 서비스 추출 → 프롬프트 이동 → 핸들러 분리 → 테스트 → 문서)
* [ ] 리뷰 기준: 시그니처 동일, 임포트/경로/설정만 확인

# 사후 작업(후속 PR)

* [ ] `markErrors` 상세 구현 이관
* [ ] 분석기(analyzers)에 최종 에러 처리 로직 결합
* [ ] 필요 시 `spawnSync → async` 전환(시그니처 유지)
* [ ] README/아키텍처 다이어그램 업데이트

