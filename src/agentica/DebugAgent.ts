import { loopCheck, testBreak, afterDebugFromCode, traceVar } from "./handlers";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

interface CompileInput {
  code: string;
}

//gemini model call
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function analyzeIntent(naturalQuery: string): Promise<"loopCheck" | "afterDebugFromCode" | "testBreak" | "traceVar"> {
  // add or modify your function explanation here!!!! @@@@@@@@@@@@@@@@ 
  const prompt = `
You are an AI assistant that analyzes Korean debugging questions and determines which of the following debugging tools is most appropriate.

Available tools:
- loopCheck: Used when the user suspects an infinite loop or asks about termination conditions of a loop.
- afterDebugFromCode: Used when the user wants comprehensive analysis including compilation errors, warnings, and runtime issues. This tool compiles the code and analyzes all potential problems.
- testBreak: Used when the user wants to detect undefined behavior and runtime bugs in C/C++ code (null pointer, division by zero, memory leaks, etc.).
- traceVar: Used when the user wants to trace variable values and understand how they change throughout the code.

Respond with one of: loopCheck, afterDebugFromCode, testBreak, or traceVar only. Do not explain.

User question:
"${naturalQuery}"
`;
  const result = await model.generateContent(prompt);
  const toolName = result.response.text().trim();
  
  if (toolName === "loopCheck" || toolName === "afterDebugFromCode" || toolName === "testBreak" || toolName === "traceVar") {
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


  //add or modify your homework function here !! @@@@@@@@@@@@@@@@@@
  try {
    const selectedTool = await analyzeIntent(userQuery);
    let resultText = "";

    if (selectedTool === "loopCheck") {
      const result = await loopCheck({ code });
      resultText = result.result ?? "";
    } else if (selectedTool === "afterDebugFromCode") {
      // 파일명은 main.c로 고정하거나, 필요시 인자로 받을 수 있음
      const { analysis, markedFilePath } = await afterDebugFromCode(code, "main.c");
      resultText = analysis + (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "");
    } else if (selectedTool === "testBreak") {
      const result = await testBreak({ codeSnippet: code });
      resultText = JSON.stringify(result, null, 2);
    } else if (selectedTool === "traceVar") {
      const result = await traceVar({ code, userQuery });
      resultText = result.variableTrace ?? "";
    }

    console.log("\n🧠 [분석 도구 선택]:", selectedTool);
    console.log("💬 [결과]:\n" + resultText);
  } catch (err: any) {
    console.error("❌ 오류 발생:", err.message || err);
  }
}

main();
