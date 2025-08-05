#!/bin/bash

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo "❌ 감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

echo "👀 ${TARGET_FILE} 저장 감시 시작 (Ctrl+C로 중단)"

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

inotifywait -m -e close_write "$TARGET_FILE" |
while read path action file; do
  echo "🔁 저장됨: $file → 디버깅 실행 중..."
  
  (
    cd "$SCRIPT_DIR"
    npx ts-node src/testcode/test_InProgressDebug.ts "$path$file"
  )

  echo "✅ 실행 완료"
done
