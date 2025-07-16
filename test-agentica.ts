import "dotenv/config";
import { diagnoseError, debugHint } from "./src/agentica/handlers";

async function main() {
  // 예시: 컴파일러 에러 메시지 테스트
  const errorMessage = "error: expected ';' before 'return'";
  const diagnoseResult = await diagnoseError({ errorMessage });
  console.log("diagnoseError 결과:", diagnoseResult.explanation);

  // 예시: 프로그램 출력 테스트 (debugHint)
  const output = "프로그램이 무한루프에 빠진 것 같습니다.";
  const debugResult = await debugHint({ output });
  console.log("debugHint 결과:", debugResult.hint);
}

main(); 