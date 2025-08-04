import { beforeDebug } from "../agentica/handlers";

export async function runBeforeDebug(code: string) {
  const { result } = await beforeDebug({ code });
  console.log("🧪 [beforeDebug 결과]");
  console.log(result);
}
