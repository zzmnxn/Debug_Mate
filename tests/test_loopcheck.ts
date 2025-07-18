import { loopCheck } from "../src/agentica/handlers";

export async function runLoopCheck(code: string) {
  const { result } = await loopCheck({ code });
  console.log("🔍 [loopCheck 결과]");
  console.log(result);
}