# CLI Package 배포 가이드

## GitHub Actions 자동 배포 설정

### 1. NPM 토큰 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 추가:

```
NPM_TOKEN = your_npm_access_token
```

NPM 토큰 생성 방법:
1. npmjs.com에 로그인
2. Profile > Access Tokens
3. "Generate New Token" 클릭
4. "Automation" 선택
5. 토큰 복사하여 GitHub 시크릿에 저장

### 2. 워크플로우 파일

- `.github/workflows/deploy-cli.yml` - 자동 배포
- `.github/workflows/version-bump.yml` - 버전 관리

### 3. 배포 트리거

**자동 배포:**
- `main` 브랜치에 `cli/` 디렉토리 변경사항이 푸시될 때
- Pull Request가 `main`으로 머지될 때

**수동 버전 증가:**
- GitHub Actions 탭에서 "Version Bump" 워크플로우 수동 실행
- bump_type 선택: patch, minor, major

### 4. 배포 과정

1. **테스트 및 빌드**
   - Node.js 20 환경에서 의존성 설치
   - 테스트 실행 (`npm test`)
   - TypeScript 컴파일 (`npm run build`)
   - 패키지 내용 검증 (`npm pack --dry-run`)

2. **배포**
   - npm에 패키지 게시
   - GitHub Release 자동 생성
   - 태그 자동 생성 (`cli-v1.1.0`)

### 5. 버전 관리

**Semantic Versioning:**
- `patch`: 버그 수정 (1.1.0 → 1.1.1)
- `minor`: 새로운 기능 추가 (1.1.0 → 1.2.0)
- `major`: 호환성 깨지는 변경 (1.1.0 → 2.0.0)

**수동 버전 증가:**
```bash
cd cli
npm version patch|minor|major
git push && git push --tags
```

### 6. 배포 확인

**npm 패키지 확인:**
```bash
npm view @debugmate/cli
```

**설치 테스트:**
```bash
npm install -g @debugmate/cli
debug-mate --version
```

### 7. 문제 해결

**배포 실패 시:**
1. GitHub Actions 로그 확인
2. NPM 토큰 유효성 검사
3. 패키지 이름 충돌 확인
4. 버전 중복 확인

**로컬 테스트:**
```bash
cd cli
npm pack --dry-run
npm publish --dry-run
```

### 8. 보안 고려사항

- NPM 토큰은 절대 코드에 포함하지 않기
- GitHub 시크릿으로만 관리
- 정기적으로 토큰 갱신
- 최소 권한 원칙 적용

### 9. 모니터링

- GitHub Actions 실행 상태 모니터링
- npm 다운로드 통계 확인
- 사용자 피드백 수집
- 버그 리포트 모니터링
