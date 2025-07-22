import { ErrorDiagnosisService } from "../agentica/functions";

export async function runDiagnoseError(code: string) {
  const service = new ErrorDiagnosisService();
  // 컴파일 에러 메시지 예시로 code를 그대로 전달
  const result = await service.diagnoseError({ errorMessage: code });
  console.log("[에러 진단 결과]", result.explanation);
} 