import { WebSocketServer } from "tgrid";
import { SGlobal } from "../config/SGlobal";
import { AgenticaRpcService } from "./AgenticaRpcService";
import { IAgenticaRpcListener, IAgenticaRpcService } from "@agentica/rpc";

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server = new WebSocketServer<IAgenticaRpcListener, IAgenticaRpcService<"chatgpt">, IAgenticaRpcListener>();

  console.log(`Agentica RPC 서버가 포트 ${port}에서 실행 중입니다.`);
  await server.open(port, async (acceptor) => {
    try {
      await acceptor.accept(new AgenticaRpcService(acceptor.getDriver()));
      console.log(`연결 수락됨: ${acceptor.path}`);
      console.log(`사용 가능한 컨트롤러: beforeDebug, afterDebug, loopCheck, traceVar, markErrors`);
    } catch (error) {
      console.error("연결 처리 중 오류 발생:", error);
    }
  });

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("서버 종료 중...");
    server.close();
    process.exit(0);
  });
};

main().catch(console.error);
