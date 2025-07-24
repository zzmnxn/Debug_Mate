import { ErrorDiagnosisService } from "../agentica/functions";

export async function runDebugHint(code: string) {
  const service = new ErrorDiagnosisService();
  const result = await service.debugHint({ output: code });
  console.log("[디버그 힌트 결과]", result.hint);
} 