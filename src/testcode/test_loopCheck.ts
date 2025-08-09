import { ErrorDiagnosisService } from "../agentica/functions";

export async function runLoopCheck(code: string) {
  const service = new ErrorDiagnosisService();
  const result = await service.loopCheck({ code });
  console.log("[루프 체크 결과]", result.result);
  return result;
}

export async function runCompareLoops(code: string, targets: string[], details?: any) {
  const service = new ErrorDiagnosisService();
  const result = await service.compareLoops({ code, targets, details });
  console.log("[루프 비교 결과]", result.result);
  return result;
}

// 테스트 실행 함수
export async function testLoopCheck() {
  const testCode = `
#include <stdio.h>

int main() {
    int i = 0;
    
    // 첫 번째 - 기본 for문
    for (i = 0; i < 3; i++) {
        printf("Basic for loop: %d\\n", i);
    }
    
    // 두 번째 - while문
    i = 0;
    while (i < 3) {
        printf("While loop: %d\\n", i);
        i++;
    }
    
    // 세 번째 - 무한루프 위험이 있는 for문
    for (i = 0; i < 2;) {  // 증가 조건 없음
        printf("Dangerous for loop: %d\\n", i);
        if (i > 10) break;
        i++;
    }
    
    return 0;
}`;

  console.log("=== 단일 루프 체크 테스트 ===");
  await runLoopCheck(testCode);
  
  console.log("\n=== 루프 비교 테스트 ===");
  await runCompareLoops(testCode, ["first", "third"]);
} 