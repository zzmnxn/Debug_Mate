import { ErrorDiagnosisService } from "../agentica/functions";

export async function runSuggestFix(code: string) {
  const service = new ErrorDiagnosisService();
  const result = await service.suggestFix({ code });
  console.log("[수정 제안 결과]", result.suggestion);
} 