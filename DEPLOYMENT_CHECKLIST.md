# DebugMate PR & 배포 체크리스트

---

## PR 체크리스트 (개발자용)

### (Manual) 변경 요약
- [ ] PR 본문에 목적/영향 범위 5줄 이내 요약

### (Auto) 품질/보안/테스트
- [ ] 타입체크: `npm run -w . tsc --noEmit` 통과
- [ ] 빌드: `npm run -w . build` (루트/cli 모두) 통과
- [ ] 린트·포맷: `npm run lint && npm run format:check` (없다면 추가)
- [ ] 의존성 보안: `npm audit --production` 경고 0 또는 Known acceptable만
- [ ] 시크릿 누출 검사: `gitleaks detect` 또는 `trufflehog filesystem` 0건
- [ ] 유닛/스몰테스트: `npm test` 통과(핵심 함수 최소 1개 이상)
- [ ] CLI 기본 동작: `node cli/dist/cli.js --version` 0 exit

### (Manual) 문서/보안/기능
- [ ] 기능 플래그/환경변수 문서화(README/DEPLOYMENT.md)
- [ ] 로그에 API Key 등 민감정보 노출 없음(마스킹 확인)
- [ ] 로컬/서버 모드 기능 차이 PR 본문에 명시(출력/제한/속도)

---

## 배포 전 체크리스트 (운영/CI 공통)

### 공통
- [ ] Node 버전 고정: Node 20.x로 `node -v` 확인 (CI matrix로 보장)
- [ ] 빌드 아티팩트 생성: dist/ 생성됨, 실행 가능
- [ ] 버전/태그: package.json version 업데이트(semver), CHANGELOG.md 갱신

### 서버(Docker/Compose)
- [ ] 도커 빌드: `docker build -t debugmate:commit-$GITHUB_SHA .` 성공
- [ ] 헬스체크: `docker run ...` 후 `curl http://localhost:3000/healthz` 200
- [ ] 로그 롤링/리소스 제한(docker-compose.yml: max-size, cpu/mem)
- [ ] 비루트/읽기전용 FS 등 보안옵션(user, read_only, 필요한 볼륨만 RW)
- [ ] .env 샘플 제공 및 민감값 미포함 확인

### CLI 패키지
- [ ] 빌드: `npm run -w cli build` 성공
- [ ] 실행: `node cli/dist/cli.js analyze --help` 0 exit
- [ ] 배포 드라이런: `npm publish --dry-run` 성공(권한/2FA 체크)
- [ ] bin/엔트리포인트 정상 연결(전역 설치 시 debug-mate 동작)

### 로컬 실행(하이브리드/폴백)
- [ ] 환경 점검: `which gcc` 0 exit, ts-node 존재
- [ ] API Key 없을 때: 친절한 오류 메시지 출력 테스트
- [ ] 서버 미가용 시 5초 내 로컬 폴백 메시지/동작 확인

---

## 문서 체크리스트 (README/DEPLOYMENT.md)
- [ ] 빠른 시작 3줄(설치→키 설정→실행) 갱신
- [ ] 결정 트리: 인터넷 없음→로컬 / 있음→하이브리드 명시
- [ ] 환경변수 표: GEMINI_API_KEY 등 설명 + 예시
- [ ] 트러블슈팅 표: 연결 실패/키 만료/gcc 없음/헬스체크 실패 해결책
- [ ] 버전 고정: 검증된 Node/gcc 버전 기재
- [ ] 보안 주의: 로그 마스킹/권한(600) 권고 문구
- [ ] CLI 단독 사용 섹션: 서버 없이 전역 설치→분석 명령 예시
- [ ] 데모 스크립트 사용법: ./demo.sh 옵션, 예상 출력/종료코드

---

## demo.sh 체크리스트
- [ ] `./demo.sh --fast` (있으면) 0 exit, 외부 네트워크 의존 없음
- [ ] `./demo.sh --full` 완료 시간 5분 이내(CI 제한 고려)
- [ ] 실패 시 비 0 코드로 종료
- [ ] 생성 파일 정리(깨끗한 작업공간 보장)

---

## 보안 & 키 관리 체크리스트
- [ ] 시크릿 스캔 도구 통과(gitleaks/trufflehog)
- [ ] scripts/update-api-key.sh: set -Eeuo pipefail/권한 600/로그 마스킹/사전 유효성 검사 문서화
- [ ] 키/토큰은 .env/CI 시크릿으로만 주입, Git 기록에 없음

---

## 운영 관측(옵저버빌리티) 체크리스트
- [ ] 구조화 로그 레벨 출력(정보/경고/오류)
- [ ] 서버/CLI --verbose/--json 옵션 README 기재
- [ ] 사용자 피드백 경로(이슈 템플릿 링크) 표기

---

> 이 체크리스트는 PR/배포/문서/보안/운영/데모 품질을 보장하기 위한 실전 기준입니다. 각 항목은 실제 코드/문서/CI에 반영되어야 하며, PR/배포 전 반드시 점검하세요.
