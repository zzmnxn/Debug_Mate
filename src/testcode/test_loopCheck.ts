import { ErrorDiagnosisService } from "../agentica/functions";
import { extractLoopsFromCode } from "../parsing/loopExtractor";

export async function runLoopCheck(code: string) {
  const service = new ErrorDiagnosisService();
  const loops = extractLoopsFromCode(code);
  if (loops.length === 0) {
    console.log("[루프 체크 결과] 코드에 for/while문이 없습니다.");
    return;
  }
  for (const loop of loops) {
    const result = await service.loopCheck({ code: loop });
    console.log("[루프 체크 결과]", result.result);
  }
} 