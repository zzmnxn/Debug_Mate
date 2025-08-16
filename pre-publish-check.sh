#!/bin/bash

echo "🔍 DebugMate CLI 배포 전 체크리스트"
echo "=================================="

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0

# 1. 필수 파일 존재 확인
echo -e "${BLUE}📁 필수 파일 존재 확인...${NC}"
FILES=("debug-mate-cli.js" "watch-and-debug.sh" "generate-test.sh" ".tmux.conf" "src/" "tsconfig.json")
for file in "${FILES[@]}"; do
    if [ -e "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}❌ $file - 없음${NC}"
        ((ERRORS++))
    fi
done

# 2. 실행 권한 확인
echo -e "\n${BLUE}🔐 실행 권한 확인...${NC}"
SCRIPTS=("debug-mate-cli.js" "watch-and-debug.sh" "generate-test.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓ $script (실행 가능)${NC}"
    else
        echo -e "${YELLOW}⚠ $script (실행 권한 없음)${NC}"
        chmod +x "$script"
        echo -e "${BLUE}  → 실행 권한 설정됨${NC}"
    fi
done

# 3. TypeScript 빌드 테스트
echo -e "\n${BLUE}🔨 TypeScript 빌드 테스트...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓ TypeScript 빌드 성공${NC}"
    if [ -d "lib" ]; then
        echo -e "${GREEN}✓ lib 디렉토리 생성됨${NC}"
    else
        echo -e "${RED}❌ lib 디렉토리가 없음${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ TypeScript 빌드 실패${NC}"
    ((ERRORS++))
fi

# 4. package.json 검증
echo -e "\n${BLUE}📦 package.json 검증...${NC}"
if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ package.json 문법 정상${NC}"
    
    # 필수 필드 확인
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    PACKAGE_BIN=$(node -p "require('./package.json').bin")
    
    echo -e "${GREEN}✓ 패키지명: $PACKAGE_NAME${NC}"
    echo -e "${GREEN}✓ 버전: $PACKAGE_VERSION${NC}"
    echo -e "${GREEN}✓ bin: $PACKAGE_BIN${NC}"
else
    echo -e "${RED}❌ package.json 문법 오류${NC}"
    ((ERRORS++))
fi

# 5. CLI 실행 테스트
echo -e "\n${BLUE}🚀 CLI 실행 테스트...${NC}"
if node debug-mate-cli.js --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CLI 버전 출력 성공${NC}"
else
    echo -e "${RED}❌ CLI 실행 실패${NC}"
    ((ERRORS++))
fi

if node debug-mate-cli.js --help > /dev/null 2>&1; then
    echo -e "${GREEN}✓ CLI 도움말 출력 성공${NC}"
else
    echo -e "${RED}❌ CLI 도움말 출력 실패${NC}"
    ((ERRORS++))
fi

# 6. npm pack 테스트
echo -e "\n${BLUE}📦 npm pack 테스트...${NC}"
if npm pack --dry-run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ npm pack 성공${NC}"
else
    echo -e "${RED}❌ npm pack 실패${NC}"
    ((ERRORS++))
fi

# 7. 의존성 확인
echo -e "\n${BLUE}📋 의존성 확인...${NC}"
if npm ls > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 의존성 충돌 없음${NC}"
else
    echo -e "${YELLOW}⚠ 의존성 문제 발견${NC}"
    npm ls
fi

# 8. npm 로그인 확인
echo -e "\n${BLUE}🔑 npm 로그인 확인...${NC}"
if npm whoami > /dev/null 2>&1; then
    USERNAME=$(npm whoami)
    echo -e "${GREEN}✓ npm 로그인됨: $USERNAME${NC}"
else
    echo -e "${YELLOW}⚠ npm 로그인 필요${NC}"
    echo -e "${BLUE}  → npm login 실행 필요${NC}"
fi

# 9. 최종 결과
echo -e "\n${BLUE}📊 최종 결과...${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 체크 통과! 배포 준비 완료${NC}"
    echo -e "${BLUE}📋 다음 단계:${NC}"
    echo -e "${YELLOW}1. cp package-cli.json package.json${NC}"
    echo -e "${YELLOW}2. npm publish${NC}"
else
    echo -e "${RED}❌ $ERRORS개의 문제 발견${NC}"
    echo -e "${YELLOW}⚠ 위의 문제들을 해결한 후 다시 실행하세요${NC}"
    exit 1
fi
