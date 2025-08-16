#!/bin/bash

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo " 감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

echo " <${TARGET_FILE}> 저장 감시 시작 (Ctrl+C로 중단)"

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")

# .env 파일 로드
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  echo " .env 파일 로드 중: $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo " 경고: .env 파일을 찾을 수 없습니다: $ENV_FILE"
  echo " 환경변수 GEMINI_API_KEY와 GEMINI_BASE_URL을 수동으로 설정하세요."
fi

# 환경변수 확인
if [ -z "$GEMINI_API_KEY" ]; then
  echo " 오류: GEMINI_API_KEY가 설정되지 않았습니다."
  echo " debug-mate status --set KEY=your_key_here 명령으로 설정하세요."
  exit 1
fi

echo " 환경변수 확인 완료: GEMINI_API_KEY=${GEMINI_API_KEY:0:10}..."
echo " 현재 작업 디렉토리: $(pwd)"
echo " 스크립트 디렉토리: $SCRIPT_DIR"
echo " 프로젝트 루트: $PROJECT_ROOT"

echo " 파일 감시 시작: $TARGET_FILE"
echo " inotifywait 명령어: inotifywait -m -e close_write --format '%w%f' \"$TARGET_FILE\""
echo " 감시 대기 중... (파일을 저장하면 자동으로 감지됩니다)"

inotifywait -m -e close_write --format '%w%f' "$TARGET_FILE" | \
while IFS= read -r FULLPATH; do
  echo ""
  echo "=========================================="
  echo " 📁 파일 저장 감지됨!"
  echo " 파일 경로: $FULLPATH"
  echo " 감지 시간: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=========================================="
  echo " BeforeDebug 실행 중..."
  (
    cd "$SCRIPT_DIR"
    
    # 이전 프롬프트 대기 중인 프로세스 정리
    pkill -f "node dist/agentica/inprogress-run.js" >/dev/null 2>&1
    
    echo " 실행 디렉토리: $(pwd)"
    echo " 실행 파일: dist/agentica/inprogress-run.js"
    echo " 대상 파일: $FULLPATH"
    
    # 환경변수 확인
    echo " GEMINI_API_KEY: ${GEMINI_API_KEY:0:10}..."
    echo " GEMINI_BASE_URL: $GEMINI_BASE_URL"
    
    # 표준입력을 /dev/tty에 붙여야 readline이 동작함
    echo " Node.js 실행 시작..."
    echo " 명령어: node dist/agentica/inprogress-run.js \"$FULLPATH\""
    
    if [ -t 0 ]; then
      # 터미널에서 실행 중인 경우
      node dist/agentica/inprogress-run.js "$FULLPATH"
    else
      # 파이프라인에서 실행 중인 경우
      node dist/agentica/inprogress-run.js "$FULLPATH" < /dev/tty
    fi
    
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
      echo " ✅ BeforeDebug 실행 성공"
    else
      echo " ❌ BeforeDebug 실행 실패 (종료 코드: $EXIT_CODE)"
    fi
  )
  echo "=========================================="
  echo " 🔄 다음 저장을 기다리는 중... (Ctrl+C로 중단)"
  echo "=========================================="
done