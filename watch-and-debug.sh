#!/bin/bash
set -e

TARGET_FILE=$1
DEFAULT_QUERY='디버깅해줘'   # 필요시 바꾸세요
USE_PRE=1                   # 1이면 --pre 사용, 0이면 미사용

if [ -z "$TARGET_FILE" ]; then
  echo "감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

# 스크립트 디렉토리 기준으로 이동 (src/index.ts를 찾기 위함)
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "$SCRIPT_DIR"

echo "<${TARGET_FILE}> 저장 감시 시작 (Ctrl+C로 중단)"

inotifywait -m -e close_write --format '%w%f' "$TARGET_FILE" | while read -r FULLPATH; do
  echo "저장됨: $FULLPATH → 실행 중..."
  if [ "$USE_PRE" -eq 1 ]; then
    npx ts-node src/index.ts "$FULLPATH" "$DEFAULT_QUERY" --pre
  else
    npx ts-node src/index.ts "$FULLPATH" "$DEFAULT_QUERY"
  fi
  echo "실행 완료"
done
