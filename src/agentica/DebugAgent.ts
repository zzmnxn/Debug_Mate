import { loopCheck, testBreak, afterDebugFromCode, traceVar, beforeDebug } from "./handlers";
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

// 실행 전/리뷰 뉘앙스 키워드 판별 함수
function wantsPreReview(userQuery: string): boolean {
  const q = userQuery.toLowerCase();
  const keywords = [
    "실행 전", "실행전에", "실행하기 전에",
    "실행 전에 한번", "실행 전에 한 번",
    "실행 전에 점검", "실행 전에 검사", "실행 전에 리뷰",
    "run before", "before run", "before execution", "pre-run", "prerun"
  ];
  return keywords.some(k => q.includes(k));
}

// beforeDebug, afterDebug 미완성 코드 판별하는 함수
function isIncompleteCode(code: string): boolean {
  // 괄호 균형 (중괄호/소괄호/대괄호)
  let braces = 0, parens = 0, brackets = 0;
  for (const ch of code) {
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "(") parens++;
    else if (ch === ")") parens--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  if (braces !== 0 || parens !== 0 || brackets !== 0) return true;

  // 블록 주석 미종결
  const opens = (code.match(/\/\*/g) || []).length;
  const closes = (code.match(/\*\//g) || []).length;
  if (opens !== closes) return true;

  // 문자열/문자 리터럴 미종결
  // 큰따옴표/작은따옴표 개수의 짝이 맞지 않는지 대략 체크
  const dqCount = (code.match(/"/g) || []).filter((_v, i, arr) => true).length;
  const sqCount = (code.match(/'/g) || []).filter((_v, i, arr) => true).length;
  if (dqCount % 2 !== 0 || sqCount % 2 !== 0) return true;

  // 말미 블록/제어문을 막 연 상태로 끝나는지
  const tail = code.trimEnd();
  if (!tail) return false;
  if (/{\s*$/.test(tail)) return true;
  if (/^\s*do\s*$/m.test(tail)) return true;               // do 다음 while 미존재
  if (/\b(if|for|while|switch)\s*\([^)]*$/.test(tail)) return true; // 괄호 닫힘 누락

  return false;
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
