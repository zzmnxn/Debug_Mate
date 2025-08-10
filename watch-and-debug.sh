#!/bin/bash

TARGET_FILE=$1

# 인자 없으면 사용법 안내 후 종료 
if [ -z "$TARGET_FILE" ]; then
  echo "❌ 감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

# 감시 시작
echo "👀 ${TARGET_FILE} 저장 감시 시작 (Ctrl+C로 중단)"

# 스크립트가 있는 디렉토리 경로 추출
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# inotifywait로 감시
inotifywait -m -e close_write "$TARGET_FILE" |
while read path action file; do
  echo "🔁 저장됨: $file → 디버깅 실행 중..."
  # ts-node로 TypeScript 테스트 코드 실행
  (
    cd "$SCRIPT_DIR"
    npx ts-node src/testcode/test_InProgressDebug.ts "$path$file"
  )

  echo "✅ 실행 완료"
done
