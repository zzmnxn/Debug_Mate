#!/bin/bash

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo " 감시할 .c 파일명을 인자로 주세요."
  echo "예: ./watch-and-debug.sh test.c"
  exit 1
fi

# 절대 경로로 변환
TARGET_FILE=$(readlink -f "$TARGET_FILE")

# 파일 존재 여부 확인
if [ ! -f "$TARGET_FILE" ]; then
  echo " 경고: 파일이 존재하지 않습니다: $TARGET_FILE"
  echo " 파일이 생성될 때까지 대기 중..."
fi

echo " <${TARGET_FILE}> 저장 감시 시작 (Ctrl+C로 중단)"

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# 파일 디렉토리 감시 (파일이 없어도 디렉토리는 존재할 것)
WATCH_DIR=$(dirname "$TARGET_FILE")
FILE_NAME=$(basename "$TARGET_FILE")

echo " 감시 디렉토리: $WATCH_DIR"
echo " 감시 파일: $FILE_NAME"

inotifywait -m -e close_write --format '%w%f' "$WATCH_DIR" | \
while IFS= read -r FULLPATH; do
  # 감시 중인 파일과 일치하는지 확인
  if [ "$FULLPATH" = "$TARGET_FILE" ]; then
    echo " 저장됨: $FULLPATH → BeforeDebug 실행 중..."
    
    # 파일이 실제로 존재하는지 다시 확인
    if [ ! -f "$FULLPATH" ]; then
      echo " 경고: 파일이 여전히 존재하지 않습니다: $FULLPATH"
      continue
    fi
    
    # 파일 읽기 권한 확인
    if [ ! -r "$FULLPATH" ]; then
      echo " 오류: 파일을 읽을 수 없습니다: $FULLPATH"
      continue
    fi
    
    (
      cd "$SCRIPT_DIR"
      # (선택) 이전 프롬프트 대기 중인 프로세스 정리
      pkill -f "ts-node src/analysis/InProgressInteractive.ts" >/dev/null 2>&1

      # 표준입력을 /dev/tty에 붙여야 readline이 동작함
      # ts-node를 명시적으로 사용하여 TypeScript 파일 실행
      npx ts-node --esm src/analysis/inprogress-run.ts "$FULLPATH" < /dev/tty
    )
    
    if [ $? -eq 0 ]; then
      echo " 실행 완료"
    else
      echo " 실행 실패 (종료 코드: $?)"
    fi
  fi
done
