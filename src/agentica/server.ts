import { WebSocketServer } from "tgrid";
import { SGlobal } from "../config/SGlobal";
import { beforeDebug, afterDebug, afterDebugFromCode, loopCheck, traceVar, markErrors } from "./handlers";

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
      markErrors,
      debugAgent, // DebugAgent 직접 실행 함수

    });
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controllers: beforeDebug, afterDebug, loopCheck, traceVar, inProgressDebug, markErrors`);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
