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
  const prompt = `
Analyze the user's natural language request, correct typos, and convert it to structured data.

Available tools:
- loopCheck: Loop analysis (for, while)
- traceVar: Variable tracing
- testBreak: Runtime bug detection (memory leaks, pointer issues, etc.)
- afterDebugFromCode: Comprehensive analysis

Examples:
"첫버째 for문만 검사해줘" → {"tool": "loopCheck", "target": "first", "details": {"loopType": "for"}}
"변수 a만 추적해줘" → {"tool": "traceVar", "target": "variable", "details": {"name": "a"}}
"메모리 누수 확인해줘" → {"tool": "testBreak"}
"코드 전체를 분석해줘" → {"tool": "afterDebugFromCode"}

Notes:
- Correct typos while understanding the intent
- "첫버째" → "첫 번째", "두번째" → "두 번째", etc.
- Respond in JSON format only

JSON response only:
`;

  const result = await model.generateContent(prompt + `\n\nUser request: "${query}"`);
  const responseText = result.response.text().trim();
  
  try {
    // JSON extraction attempt
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`🔍 LLM parsing result:`, parsed);
      return parsed;
    } else {
      throw new Error("Not JSON format");
    }
  } catch (err) {
    // Return default value on parsing failure
    console.warn("LLM parsing failed, performing default analysis.");
    return { tool: "afterDebugFromCode" };
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
      resultText = await afterDebugFromCode(code);
    } else if (parsedIntent.tool === "testBreak") {
      const result = await testBreak({ codeSnippet: code });
      resultText = JSON.stringify(result, null, 2);
    } else if (parsedIntent.tool === "traceVar") {
      const result = await traceVar({ 
        code, 
        target: parsedIntent.target,
        details: parsedIntent.details 
      });
      resultText = result.variableTrace ?? "";
    }

    console.log("\n선택된 함수(테스트용) : ", parsedIntent.tool);
    console.log("[Result] \n" + resultText);
  } catch (err: any) {
    console.error("[Error] ", err.message || err);
  }
}

main();
