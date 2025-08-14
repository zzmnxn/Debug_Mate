import { WebSocketServer } from "tgrid";
import { SGlobal } from "../config/SGlobal";
import { beforeDebug, afterDebug, afterDebugFromCode, loopCheck, traceVar, testBreak, inProgressDebug, markErrors } from "./handlers";
import { spawnSync } from "child_process";
import * as path from "path";

// DebugAgent를 직접 실행하는 함수
async function debugAgent(filePath: string, userQuery: string): Promise<string> {
  try {
    // DebugAgent.ts를 직접 실행
    const result = spawnSync(
      "npx",
      ["ts-node", "src/agentica/DebugAgent.ts", filePath, userQuery],
      { 
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    if (result.error) {
      return `[Error] DebugAgent 실행 실패: ${result.error.message}`;
    }

    // stdout과 stderr를 합쳐서 반환
    const output = (result.stdout || "") + (result.stderr || "");
    return output || "DebugAgent 실행 완료 (출력 없음)";
    
  } catch (error) {
    return `[Error] DebugAgent 실행 실패: ${(error as Error).message}`;
  }
}

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server = new WebSocketServer();

  console.log(`Gemini function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    await acceptor.accept({
      beforeDebug,
      afterDebug,
      afterDebugFromCode,
      loopCheck,
      traceVar,
      testBreak,
      inProgressDebug,
      markErrors,
      debugAgent, // DebugAgent 직접 실행 함수

    });
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controllers: beforeDebug, afterDebug, loopCheck, traceVar, testBreak, inProgressDebug, markErrors, debugAgent`);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
