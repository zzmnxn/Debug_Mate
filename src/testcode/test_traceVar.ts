import { ErrorDiagnosisService } from "../agentica/functions";

export async function runTraceVar(code: string, userQuery: string = "변수 추적") {
  const service = new ErrorDiagnosisService();
  const result = await service.traceVar({ code, userQuery });
  console.log("[변수 추적 결과]", result.variableTrace);

}