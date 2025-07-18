import { diagnoseError } from "../src/agentica/handlers";

export async function runDiagnoseError(code: string) {
  const { explanation } = await diagnoseError({ errorMessage: code });
  console.log("🛠️ [diagnoseError 결과]");
  console.log(explanation);
}