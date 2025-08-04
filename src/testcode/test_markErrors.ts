// src/testcode/test_markErrorsInCodeToFile.ts

import { markErrors } from "../agentica/handlers";
import { CompilerError, CompilerWarning } from "../parsing/compilerResultParser";

// 테스트용 샘플 코드
const sampleCode = `#include <stdio.h>

int main() {
    int x = 10;
    printf("%d", y);  // 에러: y가 선언되지 않음
    int z;            // 경고: z가 사용되지 않음
    return 0;
}`;

// 테스트용 에러 데이터
const sampleErrors: CompilerError[] = [
    {
        file: "main.c",
        line: 5,
        column: 17,
        type: "semantic",
        message: "'y' undeclared (first use in this function)",
        code: "undeclared-variable",
        severity: "error"
    }
];

// 테스트용 경고 데이터
const sampleWarnings: CompilerWarning[] = [
    {
        file: "main.c",
        line: 6,    
        column: 9,
        type: "unused",
        message: "unused variable 'z'",
        code: "-Wunused-variable",
        severity: "warning"
    }
];

async function testMarkErrors() {
    console.log("=== markErrors 함수 테스트 ===\n");
    
    try {
        // 함수 실행
        const outputPath = markErrors(
            "main.c",
            sampleCode,
            sampleErrors,
            sampleWarnings
        );
        
        console.log(`✅ 성공: 에러 마킹된 파일이 생성되었습니다.`);
        console.log(`📁 파일 경로: ${outputPath}`);
        console.log(`\n파일 내용을 확인해보세요. 다음과 같은 특징이 있어야 합니다:`);
        console.log(`- 에러가 있는 라인 5는 빨간색으로 표시`);
        console.log(`- 경고가 있는 라인 6은 노란색으로 표시`);
        console.log(`- 각 에러/경고 위치에 ^ 표시`);
        console.log(`- 에러/경고 메시지 포함`);
        console.log(`- 요약 정보 포함`);
        
    } catch (error) {
        console.error(`❌ 오류 발생:`, error);
    }
}

// 빈 에러/경고로 테스트
async function testWithNoIssues() {
    console.log("\n=== 에러/경고 없는 코드 테스트 ===\n");
    
    const cleanCode = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`;
    
    try {
        const outputPath = markErrors(
            "hello.c",
            cleanCode,
            [], // 에러 없음
            []  // 경고 없음
        );
        
        console.log(`✅ 성공: 깨끗한 코드 파일이 생성되었습니다.`);
        console.log(`📁 파일 경로: ${outputPath}`);
        
    } catch (error) {
        console.error(`❌ 오류 발생:`, error);
    }
}

async function main() {
    await testMarkErrors();
    await testWithNoIssues();
}

main().catch(console.error);
