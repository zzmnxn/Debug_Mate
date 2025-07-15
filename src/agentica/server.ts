import { WebSocketServer } from "tgrid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SGlobal } from "../SGlobal";

const main = async (): Promise<void> => {
  const port = Number(SGlobal.env.PORT);
  const server = new WebSocketServer();
  const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  console.log(`Gemini function server running on port ${port}`);
  await server.open(port, async (acceptor) => {
    await acceptor.accept({
      async diagnoseError({ errorMessage }: { errorMessage: string }) {
        const prompt = `다음 컴파일러 에러 메시지를 사람이 이해하기 쉽게 설명하고, 원인과 해결책을 요약해줘.\n\n${errorMessage}`;
        const result = await model.generateContent(prompt);
        return { explanation: result.response.text() };
      },
      async debugHint({ output }: { output: string }) {
        const prompt = `다음 프로그램 출력을 보고, 어떤 문제가 있을지 추정하고 디버깅 힌트를 제시해줘.\n\n${output}`;
        const result = await model.generateContent(prompt);
        return { hint: result.response.text() };
      },
    });
    console.log(`Connection accepted: ${acceptor.path}`);
    console.log(`Available controllers: diagnoseError, debugHint`);
  });
  console.log(`WebSocket server running on port ${port}.`);
};
main().catch(console.error);
