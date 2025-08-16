#!/bin/bash

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo " 감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

echo " <${TARGET_FILE}> 저장 감시 시작 (Ctrl+C로 중단)"

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

inotifywait -m -e close_write --format '%w%f' "$TARGET_FILE" | \
while IFS= read -r FULLPATH; do
  echo " 저장됨: $FULLPATH → BeforeDebug 실행 중..."
  (
    cd "$SCRIPT_DIR"
    # (선택) 이전 프롬프트 대기 중인 프로세스 정리
    pkill -f "ts-node src/agentica/InProgressInteractive.ts" >/dev/null 2>&1

    # 표준입력을 /dev/tty에 붙여야 readline이 동작함
    # ES 모듈 호환성을 위해 --esm 플래그 추가
    npx ts-node --esm src/agentica/inprogress-run.ts "$FULLPATH" < /dev/tty
  )
  echo " 실행 완료"
done
