import { afterDebug, afterDebugFromCode } from "./src/agentica/handlers";
import { CompilerError, CompilerWarning } from "./src/parsing/compilerResultParser";
import * as fs from "fs";

// 테스트용 에러와 경고 데이터
const testErrors: CompilerError[] = [
  {
    file: "test.c",
    line: 10,
    column: 5,
    type: "syntax",
    severity: "error",
    message: "expected ';' before '}' token",
    code: "expected-semicolon"
  },
  {
    file: "test.c",
    line: 15,
    column: 12,
    type: "semantic",
    severity: "error",
    message: "use of undeclared identifier 'undefined_var'",
    code: "undeclared-identifier"
  }
];

const testWarnings: CompilerWarning[] = [
  {
    file: "test.c",
    line: 8,
    column: 9,
    type: "unused",
    message: "unused variable 'temp'",
    code: "unused-variable"
  }
];

const testLogSummary = `
Compilation Summary:
- Total errors: 2
- Total warnings: 1
- Compilation status: Failed
- Runtime status: Not executed (compilation failed)
`;

// 테스트 1: 기본 afterDebug 함수 테스트
async function testAfterDebug() {
  console.log("🧪 테스트 1: afterDebug 함수 테스트");
  console.log("=".repeat(50));
  
  try {
    const result = await afterDebug(testLogSummary, testErrors, testWarnings);
    console.log("✅ afterDebug 결과:");
    console.log(result);
  } catch (error) {
    console.error("❌ afterDebug 테스트 실패:", error);
  }
}

// 테스트 2: 에러 처리 테스트
async function testErrorHandling() {
  console.log("\n🧪 테스트 2: 에러 처리 테스트");
  console.log("=".repeat(50));
  
  // 빈 문자열 테스트
  try {
    const result = await afterDebug("", [], []);
    console.log("✅ 빈 로그 테스트 결과:");
    console.log(result);
  } catch (error) {
    console.error("❌ 빈 로그 테스트 실패:", error);
  }
  
  // 잘못된 입력 테스트
  try {
    const result = await afterDebug(null as any, null as any, null as any);
    console.log("✅ 잘못된 입력 테스트 결과:");
    console.log(result);
  } catch (error) {
    console.error("❌ 잘못된 입력 테스트 실패:", error);
  }
}

// 테스트 3: 실제 C 파일로 afterDebugFromCode 테스트
async function testAfterDebugFromCode() {
  console.log("\n🧪 테스트 3: afterDebugFromCode 함수 테스트");
  console.log("=".repeat(50));
  
  // 간단한 C 코드 (에러 포함)
  const testCode = `
#include <stdio.h>
#include <stdlib.h>

int main() {
    int temp;  // unused variable
    int *ptr = NULL;
    
    printf("Hello World\\n");
    
    *ptr = 10;  // null pointer dereference
    
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(testCode, "test_error.c");
    console.log("✅ afterDebugFromCode 결과:");
    console.log("분석 결과:");
    console.log(result.analysis);
    console.log("\n마킹된 파일:", result.markedFilePath);
  } catch (error) {
    console.error("❌ afterDebugFromCode 테스트 실패:", error);
  }
}

// 테스트 4: 메모리 누수 테스트
async function testMemoryLeak() {
  console.log("\n🧪 테스트 4: 메모리 누수 테스트");
  console.log("=".repeat(50));
  
  const memoryLeakCode = `
#include <stdio.h>
#include <stdlib.h>

int main() {
    int *ptr = malloc(100 * sizeof(int));
    
    if (ptr == NULL) {
        printf("Memory allocation failed\\n");
        return 1;
    }
    
    // Use the memory
    for (int i = 0; i < 100; i++) {
        ptr[i] = i;
    }
    
    printf("Memory used successfully\\n");
    
    // Memory leak: forgot to free(ptr)
    
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(memoryLeakCode, "test_memory_leak.c");
    console.log("✅ 메모리 누수 테스트 결과:");
    console.log("분석 결과:");
    console.log(result.analysis);
  } catch (error) {
    console.error("❌ 메모리 누수 테스트 실패:", error);
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log("🚀 개선된 afterDebug 함수 테스트 시작");
  console.log("=".repeat(60));
  
  await testAfterDebug();
  await testErrorHandling();
  await testAfterDebugFromCode();
  await testMemoryLeak();
  
  console.log("\n🎉 모든 테스트 완료!");
}

// 테스트 실행
runAllTests().catch(console.error);
