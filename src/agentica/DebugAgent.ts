import { loopCheck, diagnoseError, debugHint } from "./handlers";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// CompileInput 타입 직접 정의
interface CompileInput {
  code: string;
}

// Gemini 기반 모델 호출
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function analyzeIntent(naturalQuery: string): Promise<"loopCheck" | "diagnoseError" | "debugHint"> {
  const prompt = `
You are an AI assistant that analyzes Korean debugging questions and determines which of the following debugging tools is most appropriate.

Available tools:
- loopCheck: Used when the user suspects an infinite loop or asks about termination conditions of a loop.
- diagnoseError: Used when the user provides an error message and wants to understand and fix it.
- debugHint: Used when the user gives suspicious output and wants to understand what might be going wrong.

Respond with one of: loopCheck, diagnoseError, or debugHint only. Do not explain.

User question:
"${naturalQuery}"
`;
  const result = await model.generateContent(prompt);
  const toolName = result.response.text().trim();
  
  if (toolName === "loopCheck" || toolName === "diagnoseError" || toolName === "debugHint") {
    return toolName;
  } else {
    throw new Error(`Unrecognized tool selection: ${toolName}`);
  }
}

async function main() {
  const [,, filePath, ...queryParts] = process.argv;
  const userQuery = queryParts.join(" ").trim();

  if (!filePath || !userQuery) {
    console.error("Usage: debug <filePath> \"<natural language query>\"");
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, "utf-8");

  try {
    const selectedTool = await analyzeIntent(userQuery);
    const input: CompileInput = { code };
    let resultText = "";

    if (selectedTool === "loopCheck") {
      const result = await loopCheck(input);
      resultText = result.result ?? "";
    } else if (selectedTool === "diagnoseError") {
      const result = await diagnoseError({ errorMessage: code });
      resultText = result.explanation ?? "";
    } else if (selectedTool === "debugHint") {
      const result = await debugHint({ output: code });
      resultText = result.hint ?? "";
    }

    console.log("\n🧠 [분석 도구 선택]:", selectedTool);
    console.log("💬 [결과]:\n" + resultText);
  } catch (err: any) {
    console.error("❌ 오류 발생:", err.message || err);
  }
}

main();
