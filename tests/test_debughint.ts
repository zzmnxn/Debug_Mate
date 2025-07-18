import { debugHint } from "../src/agentica/handlers";

export async function runDebugHint(code: string) {
  const { hint } = await debugHint({ output: code });
  console.log("💡 [debugHint 결과]");
  console.log(hint);
}
