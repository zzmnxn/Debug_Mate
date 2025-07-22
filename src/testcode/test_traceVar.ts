import { ErrorDiagnosisService } from "../agentica/functions";

export async function runTraceVar(code: string) {
  const service = new ErrorDiagnosisService();
  const result = await service.traceVar({ code });
  console.log("[변수 추적 결과]", result.variableTrace);
} 