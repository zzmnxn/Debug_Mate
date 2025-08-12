#!/bin/bash

# DebugMate 데모 스크립트
# 제출용 데모를 위한 자동화 스크립트

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}DebugMate 데모 시작${NC}"
echo "========================"

# 1. 환경 확인
echo -e "${YELLOW}1. 환경 확인 중...${NC}"

# API 키 확인
if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.${NC}"
    echo -e "${BLUE}다음 명령어로 설정해주세요:${NC}"
    echo "export GEMINI_API_KEY=your_api_key_here"
    exit 1
fi
echo -e "${GREEN}✅ API 키 설정 확인${NC}"

# Node.js 확인
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js가 설치되지 않았습니다.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 확인${NC}"

# gcc 확인
if ! command -v gcc &> /dev/null; then
    echo -e "${RED}❌ gcc가 설치되지 않았습니다.${NC}"
    echo -e "${BLUE}다음 명령어로 설치해주세요:${NC}"
    echo "sudo apt-get install gcc"
    exit 1
fi
echo -e "${GREEN}✅ gcc 확인${NC}"

# 2. 의존성 설치
echo -e "${YELLOW}2. 의존성 설치 중...${NC}"
npm install
echo -e "${GREEN}✅ 의존성 설치 완료${NC}"

# 3. 테스트 파일 생성
echo -e "${YELLOW}3. 테스트 파일 생성 중...${NC}"

cat > demo_loop.c << 'EOF'
#include <stdio.h>

int main() {
    int i, sum = 0;
    
    // 첫 번째 루프: 기본 for 루프
    for(i = 0; i < 5; i++) {
        sum += i;
        printf("i=%d, sum=%d\n", i, sum);
    }
    
    // 두 번째 루프: while 루프
    int j = 0;
    while(j < 3) {
        printf("j=%d\n", j);
        j++;
    }
    
    return 0;
}
EOF

cat > demo_error.c << 'EOF'
#include <stdio.h>
#include <stdlib.h>

int main() {
    int *ptr = malloc(sizeof(int));
    
    if(ptr == NULL) {
        printf("메모리 할당 실패\n");
        return 1;
    }
    
    *ptr = 42;
    printf("값: %d\n", *ptr);
    
    // 메모리 해제 누락 (의도적 오류)
    // free(ptr);
    
    return 0;
}
EOF

echo -e "${GREEN}✅ 테스트 파일 생성 완료${NC}"

# 4. 기능 테스트
echo -e "${YELLOW}4. 기능 테스트 중...${NC}"

# 테스트 1: 루프 분석
echo -e "${BLUE}테스트 1: 루프 분석${NC}"
npm run debug demo_loop.c "첫 번째 for문만 검사해줘"

echo -e "\n${BLUE}테스트 2: 전체 루프 분석${NC}"
npm run debug demo_loop.c "루프 전체 분석"

echo -e "\n${BLUE}테스트 3: 변수 추적${NC}"
npm run debug demo_loop.c "변수 sum 추적"

echo -e "\n${BLUE}테스트 4: 메모리 누수 검사${NC}"
npm run debug demo_error.c "메모리 누수 확인"

# 5. CLI 테스트 (선택사항)
if [ -d "cli" ]; then
    echo -e "${YELLOW}5. CLI 테스트 중...${NC}"
    cd cli
    npm install
    npm run build
    
    echo -e "${BLUE}CLI 테스트: 루프 분석${NC}"
    ./dist/cli.js analyze ../demo_loop.c "루프 검사"
    
    cd ..
fi

# 6. 정리
echo -e "${YELLOW}6. 정리 중...${NC}"
rm -f demo_loop.c demo_error.c

echo -e "${GREEN}🎉 데모 완료!${NC}"
echo -e "${BLUE}모든 기능이 정상적으로 작동합니다.${NC}"
echo -e "${YELLOW}제출 준비가 완료되었습니다!${NC}"
