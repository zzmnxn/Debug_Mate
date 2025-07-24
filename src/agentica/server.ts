import { WebSocketServer } from "tgrid";
import { SGlobal } from "../config/SGlobal";
import { diagnoseError, debugHint, loopCheck, suggestFix, traceVar, testBreak } from "./handlers";

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server = new WebSocketServer();

  console.log(`Gemini function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    await acceptor.accept({
      diagnoseError,
      debugHint,
      loopCheck,
      suggestFix,
      traceVar,
      testBreak
    });
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controllers: diagnoseError, debugHint`);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
