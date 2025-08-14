#!/bin/bash

TARGET_FILE="$1"

# --- 요구 도구 체크 ---
command -v inotifywait >/dev/null 2>&1 || { echo "inotify-tools가 필요합니다. 'sudo apt install -y inotify-tools'"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js가 필요합니다. Node 20.x (23 미만) 권장"; exit 1; }

# --- 인자 확인 ---
if [ -z "$TARGET_FILE" ]; then
  echo "감시할 .c 파일명을 인자로 주세요."
  echo "예: debug-mate test.c"
  exit 1
fi

if [ ! -f "$TARGET_FILE" ]; then
  echo "파일이 존재하지 않습니다: $TARGET_FILE"
  exit 1
fi

echo " ${TARGET_FILE} 저장 감시 시작 (Ctrl+C로 중단)"

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
DIST_ENTRY="dist/agentica/inprogress-run.js"

if [ ! -f "$SCRIPT_DIR/$DIST_ENTRY" ]; then
  echo "실행 파일이 없습니다: $SCRIPT_DIR/$DIST_ENTRY"
  echo "패키지 빌드가 누락된 것 같습니다. (개발 환경이면 'npm run build' 필요)"
  exit 1
fi

# 저장 이벤트 감시 (rename/move 대응까지 원하면 -e close_write,move,create)
inotifywait -m -e close_write --format '%w%f' "$TARGET_FILE" | while IFS= read -r FULLPATH; do
  echo " 저장됨: $FULLPATH → BeforeDebug 실행 중..."

  (
    cd "$SCRIPT_DIR"

    # 현재 대상 파일 인자를 포함한 프로세스만 종료 (과도 종료 방지)
    pkill -f "node .*${DIST_ENTRY} ${FULLPATH}" >/dev/null 2>&1

    # 실행 (표준입력은 터미널에서 받기)
    node "$DIST_ENTRY" "$FULLPATH" < /dev/tty
  )

  STATUS=$?
  if [ $STATUS -ne 0 ]; then
    echo " 실행 실패 (exit $STATUS)"
  else
    echo " 실행 완료"
  fi
done
