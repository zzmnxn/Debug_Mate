import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import { SGlobal } from "./src/SGlobal";

async function main() {
  const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // 예시: 컴파일러 에러 메시지 테스트
  const errorMessage = "error: expected ';' before 'return'";
  const prompt = `다음 컴파일러 에러 메시지를 사람이 이해하기 쉽게 설명하고, 원인과 해결책을 요약해줘.\n\n${errorMessage}`;
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
}

main(); 