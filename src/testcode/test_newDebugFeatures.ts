import * as fs from "fs";
import * as path from "path";
import { wantsPreReview, isIncompleteCode } from "../agentica/DebugAgent";

// 테스트용 코드 샘플들
const completeCode = `
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 10; i++) {
        printf("%d\\n", i);
    }
    return 0;
}
`;

const incompleteCode1 = `
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 10; i++) {
        printf("%d\\n", i);
    }
    // 중괄호가 닫히지 않음
`;

const incompleteCode2 = `
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 10; i++) {
        printf("%d\\n", i);
        // 괄호가 닫히지 않음
`;

const incompleteCode3 = `
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 10; i++) {
        printf("%d\\n", i);
    }
    // do-while이 완성되지 않음
    do {
        i++;
    // while 조건이 없음
`;

const incompleteCode4 = `
#include <stdio.h>

int main() {
    int i;
    for (i = 0; i < 10; i++) {
        printf("%d\\n", i);
    }
    if (i > 5) {
        // if 블록이 완성되지 않음
`;

// wantsPreReview 함수 테스트
function testWantsPreReview() {
    console.log("=== wantsPreReview 함수 테스트 ===\n");
    
    const testCases = [
        "컴파일해줘",
        "실행 전에 점검해줘",
        "실행전에 검사해줘",
        "실행하기 전에 리뷰해줘",
        "run before",
        "before execution",
        "디버깅해줘",
        "반복문 체크해줘"
    ];
    
    testCases.forEach(query => {
        const result = wantsPreReview(query);
        console.log(`"${query}" -> ${result ? "beforeDebug 실행" : "afterDebug 실행"}`);
    });
    
    console.log("\n" + "=".repeat(50) + "\n");
}

// isIncompleteCode 함수 테스트
function testIsIncompleteCode() {
    console.log("=== isIncompleteCode 함수 테스트 ===\n");
    
    const testCases = [
        { name: "완성된 코드", code: completeCode },
        { name: "중괄호 미완성", code: incompleteCode1 },
        { name: "괄호 미완성", code: incompleteCode2 },
        { name: "do-while 미완성", code: incompleteCode3 },
        { name: "if 블록 미완성", code: incompleteCode4 }
    ];
    
    testCases.forEach(testCase => {
        const result = isIncompleteCode(testCase.code);
        console.log(`${testCase.name}: ${result ? "미완성" : "완성"}`);
    });
    
    console.log("\n" + "=".repeat(50) + "\n");
}

// 실제 파일로 테스트
async function testWithRealFile() {
    console.log("=== 실제 파일로 테스트 ===\n");
    
    try {
        const testFilePath = path.join(__dirname, 'test_loopCheck.c');
        if (fs.existsSync(testFilePath)) {
            const code = fs.readFileSync(testFilePath, 'utf-8');
            const isIncomplete = isIncompleteCode(code);
            console.log(`test_loopCheck.c 파일: ${isIncomplete ? "미완성" : "완성"}`);
        } else {
            console.log("test_loopCheck.c 파일을 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error("파일 테스트 중 오류:", error);
    }
    
    console.log("\n" + "=".repeat(50) + "\n");
}

// 메인 테스트 실행
async function runNewDebugFeatureTests() {
    console.log("🚀 새로운 디버깅 기능 테스트 시작\n");
    
    testWantsPreReview();
    testIsIncompleteCode();
    await testWithRealFile();
    
    console.log("✅ 새로운 디버깅 기능 테스트 완료!");
}

if (require.main === module) {
    runNewDebugFeatureTests().catch(console.error);
}

export { 
    testWantsPreReview, 
    testIsIncompleteCode, 
    testWithRealFile,
    runNewDebugFeatureTests 
}; 