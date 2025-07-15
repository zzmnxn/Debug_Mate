import { Agentica } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import OpenAI from "openai";
import { WebSocketServer } from "tgrid";
import typia from "typia";
import { SGlobal } from "./SGlobal";
import { ErrorDiagnosisService } from "./agentica/functions";

const getPromptHistories = async (
  id: string,
): Promise<any[]> => {
  id;
  return [];
};

const main = async (): Promise<void> => {
  if (SGlobal.env.GEMINI_API_KEY === undefined)
    console.error("env.GEMINI_API_KEY is not defined.");

  const server: WebSocketServer<
    null,
    IAgenticaRpcService<"chatgpt">,
    IAgenticaRpcListener
  > = new WebSocketServer();
  const port = Number(SGlobal.env.PORT);
  console.log(`Agentica function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    const url: URL = new URL(`http://localhost${acceptor.path}`);
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: SGlobal.env.GEMINI_API_KEY }),
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
      histories:
        url.pathname === "/"
          ? []
          : await getPromptHistories(url.pathname.slice(1)),
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