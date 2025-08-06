import { loopCheck, testBreak, afterDebugFromCode, traceVar } from "./handlers";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

interface CompileInput {
  code: string;
}

interface ParsedIntent {
  tool: string;
  target?: string;
  details?: any;
}

//gemini model call
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function parseUserIntent(query: string): Promise<ParsedIntent> {
  // AI가 모든 자연어를 직접 파싱 (사용자 요청에 따라 수정)
  const prompt = `
Analyze the user's natural language request and convert it to structured data.

Available tools:
- loopCheck: Loop analysis (for, while, do-while)
- traceVar: Variable tracing  
- testBreak: Runtime bug detection (memory leaks, pointer issues, etc.)
- afterDebugFromCode: Comprehensive analysis

For loopCheck requests, determine:
1. Which specific loop they want (examples):
   - "첫번째" → "first"
   - "두번째" → "second" 
   - "세번째" → "third"
   - "일곱번째" → "7"
   - "44번째" → "44"
   - "마지막" → "last"
   - "for문만" → {"target": "specific", "details": {"loopType": "for"}}
   - "processArray함수 안의" → {"target": "function", "details": {"functionName": "processArray"}}
   - "main함수 내 반복문" → {"target": "function", "details": {"functionName": "main"}}
   - "전체" → "all"
   

Examples:
"첫번째 반복문 검사해줘" → {"tool": "loopCheck", "target": "first"}
"일곱번째 반복문이 정상작동하는지 확인해줘" → {"tool": "loopCheck", "target": "7"}
"44번째 반복문 검사" → {"tool": "loopCheck", "target": "44"}
"processArray함수 안의 반복문이 정상작동하는지 확인해줘" → {"tool": "loopCheck", "target": "function", "details": {"functionName": "processArray"}}
"main함수 내 반복문 검사" → {"tool": "loopCheck", "target": "function", "details": {"functionName": "main"}}
"for문만 검사해줘" → {"tool": "loopCheck", "target": "specific", "details": {"loopType": "for"}}
"변수 a만 추적해줘" → {"tool": "traceVar", "target": "variable", "details": {"name": "a"}}
"메모리 누수 확인해줘" → {"tool": "testBreak"}
"코드 전체를 분석해줘" → {"tool": "afterDebugFromCode"}

JSON response only:
`;

  try {
    const result = await model.generateContent(prompt + `\n\nUser request: "${query}"`);
    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } else {
      throw new Error("Not JSON format");
    }
  } catch (err) {
    // AI 파싱 실패시 기본값 반환
    return { tool: "loopCheck", target: "all" };
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
    const parsedIntent = await parseUserIntent(userQuery);
    let resultText = "";

    if (parsedIntent.tool === "loopCheck") {
      const result = await loopCheck({ 
        code, 
        target: parsedIntent.target,
        details: parsedIntent.details 
      });
      resultText = result.result ?? "";
    } else if (parsedIntent.tool === "afterDebugFromCode") {
      // 파일명은 main.c로 고정하거나, 필요시 인자로 받을 수 있음
      const { analysis, markedFilePath } = await afterDebugFromCode(code, "main.c");
      resultText = analysis + (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "");
    } else if (parsedIntent.tool === "testBreak") {
      const result = await testBreak({ codeSnippet: code });
      resultText = JSON.stringify(result, null, 2);
    } else if (parsedIntent.tool === "traceVar") {
      const result = await traceVar({ code, userQuery });
      resultText = result.variableTrace ?? "";
    }

    console.log("\n선택된 함수(테스트용) : ", parsedIntent.tool);
    console.log("[Result] \n" + resultText);
  } catch (err: any) {
    console.error("[Error] ", err.message || err);
  }
}

main();
