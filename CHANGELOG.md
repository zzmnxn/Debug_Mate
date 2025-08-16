# Changelog

All notable changes to the CLI package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions 자동 배포 설정
- 버전 자동 증가 워크플로우
- CHANGELOG 파일

### Changed
- CLI 명령어 구조 단순화
- 환경변수 설정 방식 개선 (KEY=your_key_here)
- tmux 패널 크기 기본값을 50:50으로 변경

### Fixed
- TypeScript 컴파일 오류 수정
- 의존성 패키지 업데이트

## [1.1.0] - 2024-12-XX

### Added
- C/C++ 대화형 디버깅 CLI 도구
- tmux 기반 분할 터미널 환경
- inotifywait를 통한 자동 파일 감시
- Gemini AI 기반 코드 분석
- 환경변수 자동 설정 기능

### Features
- `debug <file>` - 디버깅 세션 시작
- `generate` - 테스트 코드 생성
- `status` - 시스템 상태 및 설정 확인
- `--version` - 버전 정보 출력

### System Requirements
- Linux 환경 (Ubuntu/Debian 권장)
- tmux, inotify-tools, gcc/g++, python3, make
- Node.js 20+
- GEMINI_API_KEY 환경변수

## [1.0.0] - 2024-12-XX

### Initial Release
- 기본 CLI 구조 구현
- 핵심 디버깅 기능 구현
