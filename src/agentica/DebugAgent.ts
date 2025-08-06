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
  const simplePatterns = [
    // 순서 패턴 (오타 포함)
    { pattern: /(첫|첫번째|첫 번째|첫버째|첫벉째)/i, target: "first" },
    { pattern: /(두|두번째|두 번째|두버째|두벉째)/i, target: "second" },
    { pattern: /(세|세번째|세 번째|세버째|세벉째)/i, target: "third" },
    { pattern: /(네|네번째|네 번째|네버째|네벉째)/i, target: "fourth" },
    { pattern: /(다섯|다섯번째|다섯 번째|다섯버째|다섯벉째)/i, target: "fifth" },
    { pattern: /(마지막|마지막번째|마지막버째|마지막벉째)/i, target: "last" },
    
    // 루프 타입 패턴
    { pattern: /for문/i, loopType: "for" },
    { pattern: /while문/i, loopType: "while" },
    { pattern: /do-?while문/i, loopType: "do-while" },
  ];
  
  // 기본 도구 결정
  let tool = "loopCheck";
  if (query.includes("변수") || query.includes("추적")) tool = "traceVar";
  if (query.includes("메모리") || query.includes("누수")) tool = "testBreak";
  if (query.includes("전체") || query.includes("종합") || query.includes("전반적")) tool = "afterDebugFromCode";
  
  let target = "all";
  let details: any = {};
  
  // 간단한 패턴 매칭
  for (const pattern of simplePatterns) {
    if (pattern.pattern.test(query)) {
      if (pattern.target) target = pattern.target;
      if (pattern.loopType) {
        target = "specific";
        details.loopType = pattern.loopType;
      }
      break;
    }
  }
  
  // 복잡한 경우에만 AI 사용 (변수명 추출 등)
  const hasVariableName = query.includes("변수") && query.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
  const isComplexQuery = hasVariableName || (query.length > 50 && !simplePatterns.some(p => p.pattern.test(query)));
  
  if (isComplexQuery) {
    // 짧은 프롬프트로 AI 파싱
    const prompt = `Parse request to JSON:\nTools: loopCheck, traceVar, testBreak, afterDebugFromCode\nExamples:\n"변수 a 추적" → {"tool": "traceVar", "target": "variable", "details": {"name": "a"}}\nJSON only:`;

    try {
      const result = await model.generateContent(prompt + `\n\n"${query}"`);
      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (err) {
      // AI parsing failed, using regex result
    }
  }
  
  const result = { tool, target, details };
  return result;
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
