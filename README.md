# DebugMate CLI

**C/C++ 코드를 AI로 분석·디버깅하는 Linux 전용 CLI 도구**

> 리눅스 터미널에서도 VSCode 수준의 디버깅 경험을 제공합니다. 저장과 동시에 AI가 코드를 분석하고, 문제 원인과 해결책을 직관적으로 제공합니다.

---

## 🔍 프로젝트 소개

DebugMate는 **Linux 환경 전용 C/C++ AI 디버깅 CLI**입니다. 복잡한 컴파일·실행·로그 분석 과정을 자동화하고 Google Gemini 모델을 활용해 잠재적 문제를 진단하며 수정 방안을 제시합니다. 개발자는 코드 작성에 집중하고 DebugMate가 디버깅을 지원합니다.

---
## 🖼 캡처 화면

<p align="center">
  <img width="1458" height="704" alt="image" src="https://github.com/user-attachments/assets/f27f4110-6b9f-4593-9bef-e9e3499ca15c" alt="DebugMate tmux demo" width="49%"/>
  <img width="2176" height="1354" alt="image" src="https://github.com/user-attachments/assets/ef31ddaa-657c-4d75-b0b9-70f9a1830dd8" alt="DebugMate tmux demo" width="49%"/>

</p>

*왼쪽: 코드 편집 / 오른쪽: AI 분석 결과*


---

## ⚙️ 동작 원리

1. **tmux 분할 화면 실행**: `debug-mate debug <file>`을 실행하면 좌측에 `vi` 편집기가, 우측에 AI 분석 화면이 열린다.
2. **파일 저장 이벤트 감지**: 사용자가 `:w`로 저장하면, `watch-and-debug.sh`가 이를 감지한다.
3. **inprogress-run.ts 호출**: 파일 저장 이벤트가 감지되면 `inprogress-run.ts`가 실행된다.
4. **초기 해석 (beforeDebug)**: 가장 먼저 `beforeDebug` 모듈이 호출되어 코드에 대한 AI의 초기 해석 및 전반적 진단을 사용자에게 제공한다.
5. **자연어 요청 처리**: 사용자가 “이 변수의 흐름을 보고 싶어”와 같이 자연어로 요청하면 `DebugAgent`가 의도를 분석한다.
6. **심층 분석 실행**: `DebugAgent`는 의도에 따라 적합한 모듈을 호출한다.

   * `afterDebug`: 컴파일/런타임 로그 기반 종합 분석
   * `traceVar`: 특정 변수의 선언 → 변경 → 최종 값 추적
   * `loopCheck`: 반복문 종료 조건 및 무한 루프 여부 확인
7. **결과 출력**: 분석 결과는 우측 패널에 구조화된 형식(Result / Reason / Suggestion)으로 제공된다.

즉, **저장 → 초기 해석 제공 → 자연어 요청 → 심층 분석 → 결과 출력**의 순환 구조로 사용자가 직관적으로 AI와 협업하며 디버깅할 수 있다.

---

## 📂 파일 구조

```
DebugMate/
├─ debug-mate-cli.js        # CLI 엔트리포인트 (명령어 파싱, tmux 관리)
├─ watch-and-debug.sh       # 파일 저장 이벤트 감지 및 분석 실행
├─ generate-test.sh         # 테스트 코드 자동 생성 스크립트
├─ src/
│  ├─ analysis/             # 코드 분석 모듈
│  │   ├─ afterDebug.ts     # 종합 코드 분석
│  │   ├─ beforeDebug.ts    # 초기 해석 제공
│  │   ├─ DebugAgent.ts     # 자연어 요청 라우팅
│  │   ├─ inprogress-run.ts # 저장 이벤트 파이프라인
│  │   ├─ loopCheck.ts      # 반복문 분석
│  │   └─ traceVar.ts       # 변수 추적
│  ├─ config/
│  │   └─ SGlobal.ts        # 전역 설정
│  ├─ parsing/              # 파서 모듈
│  │   ├─ codeParser.ts
│  │   ├─ compilerResultParser.ts
│  │   └─ loopExtractor.ts
│  ├─ prompts/              # 프롬프트 템플릿
│  │   ├─ prompt_afterDebug.ts
│  │   ├─ prompt_debugAgent.ts
│  │   ├─ prompt_loopCheck.ts
│  │   └─ prompt_traceVar.ts
│  └─ services/
│      └─ compile.ts        # GCC 빌드 및 실행 관리
├─ .tmux.conf               # tmux 설정
├─ tsconfig.json
├─ package.json
├─ README.md
└─ 기타 환경 파일(.env, .gitignore 등)

```
---

## ✨ 주요 기능 요약

* **tmux 분할 화면**: 좌측 vi 편집기, 우측 AI 분석 결과 실시간 표시
* **자동 분석**: 파일 저장 시 `beforeDebug`가 즉각 초기 해석 제공
* **자연어 기반 심층 분석**: `DebugAgent`가 afterDebug / traceVar / loopCheck 중 적절한 모듈 실행
* **테스트 코드 자동 생성**: 9가지 유형의 C 테스트 코드 생성
* **의존성 자동 체크**: gcc, tmux, inotify-tools 등 필수 패키지 검증 및 설치 안내


---

## 📖 더 알아보기

* [시스템 구성 & 아키텍처](./Documents/ARCHITECTURE.md)
* [설치 및 실행 가이드](./Documents/INSTALLATION.md)
* [리팩토링 보고서](./Documents/Refactoring_Report.md)
* [보고서](https://docs.google.com/document/d/1fzS09vOn8UqoKWhNHEVu7mMr8bBPgiyI8Ytb3mqaILM/edit?pli=1&tab=t.0)
---


## 🙋🏻‍♀️ Members

<table>
  <tbody>
    <tr>
      <td align="center">
        <a href="https://github.com/uuyeong">
          <img src="https://avatars.githubusercontent.com/uuyeong" width="100px;" alt="강유영"/>
          <br /><sub><b>강유영</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/zzmnxn">
          <img src="https://avatars.githubusercontent.com/zzmnxn" width="100px;" alt="박지민"/>
          <br /><sub><b>박지민</b></sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/Dlans00">
          <img src="https://avatars.githubusercontent.com/Dlans00" width="100px;" alt="이문정"/>
          <br /><sub><b>이문정</b></sub>
        </a>
      </td>
      </td>
      <td align="center">
        <a href="https://github.com/soba1im">
          <img src="https://avatars.githubusercontent.com/soba1im" width="100px;" alt="임소현"/>
          <br /><sub><b>임소현</b></sub>
        </a>
      </td>
    </tr>
  </tbody>
</table>
