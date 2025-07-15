import { Agentica } from "@agentica/core";
import { AgenticaRpcService, IAgenticaRpcListener, IAgenticaRpcService } from "@agentica/rpc";
import OpenAI from "openai";
import { WebSocketServer } from "tgrid";
import typia from "typia";
import { ErrorDiagnosisService } from "./functions";
import { SGlobal } from "../SGlobal";

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server: WebSocketServer<
    null,
    IAgenticaRpcService<"chatgpt">,
    IAgenticaRpcListener
  > = new WebSocketServer();
  console.log(`Agentica function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: SGlobal.env.OPENAI_API_KEY }),
        model: "gpt-4o-mini",
      },
      controllers: [
        {
          protocol: "class",
          name: "errorDiagnosis",
          application: typia.llm.application<ErrorDiagnosisService, "chatgpt">(),
          execute: new ErrorDiagnosisService(),
        },
      ],
      histories: [],
    });
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });
    console.log(`Agentica function registered and ready...`);
    await acceptor.accept(service);
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controller: errorDiagnosis`);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
