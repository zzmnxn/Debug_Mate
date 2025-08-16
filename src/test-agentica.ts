import { WebSocketConnector } from "tgrid";
import { IAgenticaRpcListener, IAgenticaRpcService } from "@agentica/rpc";

async function main() {
  const connector = new WebSocketConnector<IAgenticaRpcListener, IAgenticaRpcService<"chatgpt">, IAgenticaRpcListener>();

  try {
    const service = await connector.connect("ws://localhost:3000");
    console.log("Agentica 서버에 연결되었습니다!");

    // 사용 가능한 함수 조회
    const functions = await service.getAvailableFunctions();
    console.log("사용 가능한 함수들:", functions);

    // 테스트 코드
    const testCode = `
#include <stdio.h>

int main() {
    int i, sum = 0;
    
    for(i = 0; i < 5; i++) {
        sum += i;
        printf("i=%d, sum=%d\\n", i, sum);
    }
    
    return 0;
}`;

    // beforeDebug 테스트
    console.log("\n=== beforeDebug 테스트 ===");
    try {
      const beforeResult = await service.beforeDebug({ code: testCode });
      console.log("beforeDebug 결과:", beforeResult);
    } catch (error) {
      console.error("beforeDebug 오류:", error);
    }

    // loopCheck 테스트
    console.log("\n=== loopCheck 테스트 ===");
    try {
      const loopResult = await service.loopCheck({ 
        code: testCode, 
        target: "first",
        details: { loopType: "for" }
      });
      console.log("loopCheck 결과:", loopResult);
    } catch (error) {
      console.error("loopCheck 오류:", error);
    }

    // 사용자 정의 요청 처리 테스트
    console.log("\n=== 사용자 정의 요청 테스트 ===");
    try {
      const customResult = await service.processCustomRequest({
        query: "이 코드의 루프를 분석해주세요",
        context: { code: testCode }
      });
      console.log("사용자 정의 요청 결과:", customResult);
    } catch (error) {
      console.error("사용자 정의 요청 오류:", error);
    }

  } catch (error) {
    console.error("연결 실패:", error);
  } finally {
    await connector.close();
    console.log("연결이 종료되었습니다.");
  }
}

main(); 