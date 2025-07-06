import { Agentica, IAgenticaHistoryJson } from "@agentica/core";
import {
  AgenticaRpcService,
  IAgenticaRpcListener,
  IAgenticaRpcService,
} from "@agentica/rpc";
import OpenAI from "openai";
import { WebSocketServer } from "tgrid";
import typia, { Primitive } from "typia";

import { SGlobal } from "./SGlobal";
import { BbsArticleService } from "./services/BbsArticleService";
import { ErrorDiagnosisService } from "./services/ErrorDiagnosisService";



const getPromptHistories = async (
  id: string,
): Promise<Primitive<IAgenticaHistoryJson>[]> => {
  // GET PROMPT HISTORIES FROM DATABASE
  id;
  return [];
};

const main = async (): Promise<void> => {
  if (SGlobal.env.OPENAI_API_KEY === undefined)
    console.error("env.OPENAI_API_KEY is not defined.");

  const server: WebSocketServer<
    null,
    IAgenticaRpcService<"chatgpt">,
    IAgenticaRpcListener
  > = new WebSocketServer();
  const port = Number(SGlobal.env.PORT) || 3000;
  console.log(`🚀 서버가 포트 ${port}에서 시작됩니다...`);
  await server.open(port, async (acceptor) => {
    const url: URL = new URL(`http://localhost${acceptor.path}`);
    const agent: Agentica<"chatgpt"> = new Agentica({
      model: "chatgpt",
      vendor: {
        api: new OpenAI({ apiKey: SGlobal.env.OPENAI_API_KEY }),
        model: "gpt-4o-mini",
      },
      controllers: [
        {
          protocol: "class",
          name: "bbs",
          application: typia.llm.application<BbsArticleService, "chatgpt">(),
          execute: new BbsArticleService(),
        },
        {
          protocol: "class",
          name: "errorDiagnosis",
          application: typia.llm.application<ErrorDiagnosisService, "chatgpt">(),
          execute: new ErrorDiagnosisService(),
        },
      ],
      histories:
        // check {id} parameter
        url.pathname === "/"
          ? []
          : await getPromptHistories(url.pathname.slice(1)),
    });
    const service: AgenticaRpcService<"chatgpt"> = new AgenticaRpcService({
      agent,
      listener: acceptor.getDriver(),
    });
    console.log(`🔧 Agentica 서비스 설정 중...`);
    await acceptor.accept(service);
    console.log(`✅ 클라이언트 연결됨: ${acceptor.path}`);
    console.log(`📋 등록된 컨트롤러: bbs, errorDiagnosis`);
  });
  console.log(`🎯 WebSocket 서버가 포트 ${port}에서 실행 중입니다.`);
};
main().catch(console.error);
