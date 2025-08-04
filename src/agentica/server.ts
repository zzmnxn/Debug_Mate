import { WebSocketServer } from "tgrid";
import { SGlobal } from "../config/SGlobal";
import { afterDebug, afterDebugFromCode, loopCheck, traceVar, testBreak, markErrors } from "./handlers";

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server = new WebSocketServer();

  console.log(`Gemini function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    await acceptor.accept({
      afterDebug,
      afterDebugFromCode,
      loopCheck,
      traceVar,
      testBreak,
      markErrors
    });
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controllers: afterDebug, loopCheck, traceVar, testBreak, markErrors `);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
