#!/bin/bash

TARGET_FILE=$1

if [ -z "$TARGET_FILE" ]; then
  echo "감시할 .c 파일명을 인자로 주세요."
  echo "예: ./debug-mate-tmux.sh test.c"
  exit 1
fi

# tmux 세션 이름
SESSION_NAME="debug-mate-$(basename "$TARGET_FILE" .c)"

# 기존 세션이 있으면 종료
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

# 새 tmux 세션 생성
tmux new-session -d -s "$SESSION_NAME" -n "editor"

# 왼쪽 패널: 파일 편집 (vim 또는 nano)
tmux send-keys -t "$SESSION_NAME:editor" "echo '=== 파일 편집 ==='" Enter
tmux send-keys -t "$SESSION_NAME:editor" "echo '파일을 편집하고 저장하면 자동으로 디버깅이 실행됩니다.'" Enter
tmux send-keys -t "$SESSION_NAME:editor" "echo 'Ctrl+C로 종료'" Enter
tmux send-keys -t "$SESSION_NAME:editor" "echo ''" Enter

# 파일이 없으면 기본 템플릿 생성
if [ ! -f "$TARGET_FILE" ]; then
  cat > "$TARGET_FILE" << 'EOF'
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 5; i++) {
        printf("Hello, World! %d\n", i);
    }
    return 0;
}
EOF
  tmux send-keys -t "$SESSION_NAME:editor" "echo '기본 템플릿 파일이 생성되었습니다: $TARGET_FILE'" Enter
fi

# 오른쪽 패널 생성 (디버깅 결과)
tmux split-window -h -t "$SESSION_NAME:editor"

# 오른쪽 패널: 디버깅 결과
tmux send-keys -t "$SESSION_NAME:editor.1" "echo '=== 디버깅 결과 ==='" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "echo '파일 저장을 기다리는 중...'" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "echo ''" Enter

# 파일 감시 시작 (오른쪽 패널에서)
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

tmux send-keys -t "$SESSION_NAME:editor.1" "cd '$SCRIPT_DIR'" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "echo '파일 감시 시작...'" Enter

# 개발 환경에서는 ts-node 사용, 프로덕션에서는 컴파일된 JS 사용
if [ -f "$SCRIPT_DIR/lib/agentica/inprogress-run.js" ]; then
  # 프로덕션 빌드된 파일 사용
  DIST_ENTRY="lib/agentica/inprogress-run.js"
elif [ -f "$SCRIPT_DIR/dist/agentica/inprogress-run.js" ]; then
  # CLI 패키지 빌드된 파일 사용
  DIST_ENTRY="dist/agentica/inprogress-run.js"
else
  # 개발 환경에서는 ts-node 사용
  DIST_ENTRY="ts-node src/agentica/inprogress-run.ts"
fi

# inotifywait로 파일 감시
tmux send-keys -t "$SESSION_NAME:editor.1" "inotifywait -m -e close_write --format '%w%f' '$TARGET_FILE' | while IFS= read -r FULLPATH; do" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "  echo '=== 저장됨: \$FULLPATH ==='" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "  echo 'BeforeDebug 실행 중...'" Enter
if [[ "$DIST_ENTRY" == *"ts-node"* ]]; then
  tmux send-keys -t "$SESSION_NAME:editor.1" "  (cd '$SCRIPT_DIR' && npx $DIST_ENTRY \"\$FULLPATH\" < /dev/tty)" Enter
else
  tmux send-keys -t "$SESSION_NAME:editor.1" "  (cd '$SCRIPT_DIR' && node $DIST_ENTRY \"\$FULLPATH\" < /dev/tty)" Enter
fi
tmux send-keys -t "$SESSION_NAME:editor.1" "  echo '=== 실행 완료 ==='" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "  echo ''" Enter
tmux send-keys -t "$SESSION_NAME:editor.1" "done" Enter

# 패널 크기 조정 (왼쪽 60%, 오른쪽 40%)
tmux resize-pane -t "$SESSION_NAME:editor.0" -x 60%

# 세션에 연결
echo "tmux 세션 '$SESSION_NAME'이 시작되었습니다."
echo "왼쪽: 파일 편집, 오른쪽: 디버깅 결과"
echo "종료하려면: tmux kill-session -t $SESSION_NAME"
echo ""
echo "세션에 연결 중..."

tmux attach-session -t "$SESSION_NAME"
