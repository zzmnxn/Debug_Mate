import { afterDebugFromCode } from "./src/agentica/handlers";

// 테스트 1: 성공적으로 실행되는 코드
async function testSuccessfulExecution() {
  console.log("🧪 테스트 1: 성공적으로 실행되는 코드");
  console.log("=".repeat(50));
  
  const successCode = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    printf("프로그램이 성공적으로 실행되었습니다.\\n");
    
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum += i;
    }
    printf("1부터 10까지의 합: %d\\n", sum);
    
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(successCode, "test_success.c");
    console.log("✅ 분석 결과:");
    console.log(result.analysis);
    
    if (result.executionOutput) {
      console.log("\n📄 프로그램 실행 결과:");
      console.log(result.executionOutput);
    }
    
    console.log("\n📝 마킹된 파일:", result.markedFilePath);
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
  }
}

// 테스트 2: 런타임 에러가 있는 코드
async function testRuntimeError() {
  console.log("\n🧪 테스트 2: 런타임 에러가 있는 코드");
  console.log("=".repeat(50));
  
  const runtimeErrorCode = `
#include <stdio.h>
#include <stdlib.h>

int main() {
    printf("프로그램 시작\\n");
    
    int *ptr = NULL;
    printf("포인터 초기화 완료\\n");
    
    *ptr = 10;  // null pointer dereference
    
    printf("이 메시지는 출력되지 않습니다.\\n");
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(runtimeErrorCode, "test_runtime_error.c");
    console.log("✅ 분석 결과:");
    console.log(result.analysis);
    
    if (result.executionOutput) {
      console.log("\n📄 프로그램 실행 결과:");
      console.log(result.executionOutput);
    }
    
    console.log("\n📝 마킹된 파일:", result.markedFilePath);
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
  }
}

// 테스트 3: 컴파일 에러가 있는 코드
async function testCompileError() {
  console.log("\n🧪 테스트 3: 컴파일 에러가 있는 코드");
  console.log("=".repeat(50));
  
  const compileErrorCode = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    
    int x = 10;
    int y = 20;
    
    printf("x + y = %d\\n", x + y);
    
    // 문법 에러: 세미콜론 누락
    printf("이 줄은 컴파일 에러")
    
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(compileErrorCode, "test_compile_error.c");
    console.log("✅ 분석 결과:");
    console.log(result.analysis);
    
    if (result.executionOutput) {
      console.log("\n📄 프로그램 실행 결과:");
      console.log(result.executionOutput);
    }
    
    console.log("\n📝 마킹된 파일:", result.markedFilePath);
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
  }
}

// 테스트 4: 경고가 있는 코드
async function testWarningCode() {
  console.log("\n🧪 테스트 4: 경고가 있는 코드");
  console.log("=".repeat(50));
  
  const warningCode = `
#include <stdio.h>

int main() {
    int unused_var = 42;  // 사용되지 않는 변수
    printf("Hello, World!\\n");
    
    int x = 10;
    x = 20;  // 값이 덮어써짐
    
    printf("x = %d\\n", x);
    return 0;
}
`;

  try {
    const result = await afterDebugFromCode(warningCode, "test_warning.c");
    console.log("✅ 분석 결과:");
    console.log(result.analysis);
    
    if (result.executionOutput) {
      console.log("\n📄 프로그램 실행 결과:");
      console.log(result.executionOutput);
    }
    
    console.log("\n📝 마킹된 파일:", result.markedFilePath);
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
  }
}

// 메인 테스트 실행
async function runAllTests() {
  console.log("🚀 실행 결과 표시 기능 테스트 시작");
  console.log("=".repeat(60));
  
  await testSuccessfulExecution();
  await testRuntimeError();
  await testCompileError();
  await testWarningCode();
  
  console.log("\n🎉 모든 테스트 완료!");
}

// 테스트 실행
runAllTests().catch(console.error);
