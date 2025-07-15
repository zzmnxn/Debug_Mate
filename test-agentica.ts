import { Agentica } from "@agentica/core";
import OpenAI from "openai";
import typia from "typia";
import { ErrorDiagnosisService } from "./src/agentica/functions";
import { SGlobal } from "./src/SGlobal";
import "dotenv/config";

async function main() {
  const agent = new Agentica({
    model: "chatgpt",
    vendor: {
      api: new OpenAI({ apiKey: SGlobal.env.OPENAI_API_KEY }),
      model: "gpt-3.5-turbo",
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

  // 예시: 컴파일러 에러 메시지 테스트
  const result = await agent.conversate(
    "diagnoseError 함수로 이 에러 메시지를 설명해줘: error: expected ';' before 'return'"
  );
  console.log(JSON.stringify(result, null, 2));
}

main(); 