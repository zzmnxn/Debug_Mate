import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
import { extractLoopsFromCode, extractLoopsWithNesting, LoopInfo } from '../parsing/loopExtractor';
import { execSync } from "child_process";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 


//jm hw
export function buildAfterDebugPrompt(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[]): string {
  const MAX_ITEMS = 3;

  const formatError = (e: CompilerError, i: number) =>
    `[Error ${i + 1}] (${e.severity.toUpperCase()} - ${e.type}) ${e.message}${e.file ? ` at ${e.file}:${e.line}:${e.column}` : ''}`;

  const formatWarning = (w: CompilerWarning, i: number) =>
    `[Warning ${i + 1}] (${w.type}) ${w.message}${w.file ? ` at ${w.file}:${w.line}:${w.column}` : ''}`;

  const errorText = errors.slice(0, MAX_ITEMS).map(formatError).join('\n');
  const warningText = warnings.slice(0, MAX_ITEMS).map(formatWarning).join('\n');

  return `
You are a senior compiler engineer and static analysis expert.
Your task is to analyze the compiler output and runtime log from a C/C++ program and determine whether the code has any critical problems that need to be addressed before deployment.

=== Summary ===
${logSummary}

=== Compiler Errors ===
${errorText || 'None'}

=== Compiler Warnings ===
${warningText || 'None'}

 IMPORTANT NOTES:
- Do NOT hallucinate issues not supported by the log.
-If no critical issues: Say clearly "No critical issues detected"
- If issues are present: State the most likely cause and suggest a concrete fix (1–2 lines).
- Do NOT guess beyond the given log. If something is unclear, say so briefly (e.g., "Based on the log alone, it's unclear").
- Use Korean to response.

Format your response in the following structure:

[Result] {Short message: "Critical issue detected" or "No critical issues detected"}
[Reason] {Brief explanation of why (e.g., undeclared variable, safe log, etc.)}
[Suggestion] {Fix or say "No fix required" if none needed}
Do not add anything outside this format.

=== Analysis Rules ===
- If error type is "undeclared" or message contains "undeclared", always treat as critical.
- If a warning or message contains "memory leak" or "leaked", treat it as a critical issue.
- For unused variable warnings, if variable name is vague (like 'temp'), suggest renaming or removal.
- If runtime log contains "runtime error", check if it follows a dangerous cast (e.g., int to pointer). If the code contains a dangerous cast pattern (예: (char*)정수, (int*)정수 등), 반드시 Reason에 'dangerous cast 의심'을 명시하고, Suggestion에 포인터 변환 및 역참조 코드를 점검하라고 안내할 것.
- If the summary or runtime log contains "[Hint] loopCheck() 함수를 사용하여 루프 조건을 검토해보세요.", do NOT analyze the cause. Just output the hint exactly as the Suggestion and say "Critical issue detected" in Result.

`.trim();
///다른 함수를 이용해야할 거 같으면 [Hint] ~~ 을 사용해보세요라고 유도 함////////
}

/**
 * 1. afterDebug: 에러/경고 로그 + 요약을 받아 Gemini 분석 수행
 */
export async function afterDebug(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[]): Promise<string> {
  const prompt = buildAfterDebugPrompt(logSummary, errors, warnings);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * 2. afterDebugFromCode: 코드 입력 → 컴파일 → 로그 파싱 → Gemini 분석까지 자동 수행
 */
export async function afterDebugFromCode(code: string): Promise<string> {
  const tmpFile = path.join("/tmp", `code_${Date.now()}.c`);
  fs.writeFileSync(tmpFile, code);

  let compileLog = "";

  try {
    // 컴파일 단계 - spawnSync 사용으로 변경하여 stderr 확실히 캡처
    const compileResult = spawnSync("gcc", [
      "-Wall", "-Wextra", "-Wpedantic", "-O2", "-Wdiv-by-zero", 
      "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address", tmpFile, "-o", "/tmp/a.out"
    ], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    // 컴파일 결과 로그 수집
    if (compileResult.stdout) {
      compileLog += compileResult.stdout;
    }
    if (compileResult.stderr) {
      compileLog += compileResult.stderr;
    }

    // 컴파일 성공 시에만 실행
    if (compileResult.status === 0) {
      compileLog += "\n\n=== Runtime Output ===\n";
      const runResult = spawnSync("/tmp/a.out", [], { encoding: "utf-8", timeout: 1000 }); // 1초 제한

      if (runResult.stdout) {
        compileLog += runResult.stdout;
      }
      if (runResult.stderr) {
        compileLog += runResult.stderr;
      }
      if (runResult.stderr.includes("runtime error:")) {
        compileLog += `\n[Runtime Type] UndefinedBehaviorSanitizer runtime error (UB 가능성)`;
      }
      if (runResult.error) {
        const errorAny = runResult.error as any;
        if (errorAny && errorAny.code === 'ETIMEDOUT') {
          compileLog += `\n[Runtime Error] Execution timed out (possible infinite loop)\n loopCheck() 함수를 사용해보세요`;
        } else {
          compileLog += `\n[Runtime Error] ${runResult.error.message}`;
        }
      }
    } else {
      // 컴파일 실패
      compileLog += "\n\n=== Compile Failed ===\n";
      if (compileResult.error) {
        compileLog += `[Compile Process Error] ${compileResult.error.message}\n`;
      }
    }

  } catch (err: any) {
    // 예상치 못한 에러
    compileLog += "\n\n=== Unexpected Error ===\n";
    compileLog += err.message || err.toString();
  }
  // 디버깅용 로그 (필요시 주석 해제)
  // console.log("=== 🧾 GCC + Runtime 로그 ===");
  // console.log(compileLog);

  const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
  const summary = CompilerResultParser.generateSummary(parsed);
  return afterDebug(summary, parsed.errors, parsed.warnings);
}


// uuyeong's hw
export async function loopCheck({ 
  code, 
  target = "all",
  details = {}
}: { 
  code: string;
  target?: string;
  details?: any;
}) {
  const loopInfos = extractLoopsWithNesting(code);
  
  if (loopInfos.length === 0) {
    return { result: "코드에서 for/while 루프를 찾을 수 없습니다." };
  }
  
  // 선택적 분석 로직
  let targetLoopInfos = loopInfos;
  
  if (target === "first") {
    targetLoopInfos = [loopInfos[0]];
  } else if (target === "second") {
    targetLoopInfos = loopInfos.length > 1 ? [loopInfos[1]] : [];
  } else if (target === "last") {
    targetLoopInfos = [loopInfos[loopInfos.length - 1]];
  } else if (target === "specific" && details.loopType) {
    // 특정 타입의 루프만 필터링
    targetLoopInfos = loopInfos.filter(loopInfo => {
      const loop = loopInfo.code;
      if (details.loopType === "for") {
        return loop.trim().startsWith("for");
      } else if (details.loopType === "while") {
        return loop.trim().startsWith("while");
      } else if (details.loopType === "do-while") {
        return loop.trim().startsWith("do");
      }
      return true;
    });
  }
  
  if (targetLoopInfos.length === 0) {
    return { result: `요청하신 조건에 맞는 루프를 찾을 수 없습니다.` };
  }
  
  const results = [];
  for (let i = 0; i < targetLoopInfos.length; i++) {
    const loopInfo = targetLoopInfos[i];
    const loop = loopInfo.code;
    
    // 계층적 번호 생성
    const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
    
    const prompt = `Review the following loop code and determine if its termination condition is valid. If there is an issue, first explain the problem briefly, then provide suggestions in numbered format like "수정 제안 1 :", "수정 제안 2:" etc. Do not include code examples, just provide brief explanations for each suggestion. If there is no problem, simply respond with "문제가 없습니다." (include the period). Respond in Korean.\n\n${loop}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    
    results.push(`- 반복문 ${loopNumber}\n${analysis}`);
  }
  
  const formattedResult = `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${results.join('\n\n')}`;
  return { result: formattedResult };
}

/**
 * 계층적 번호 생성 (1, 2.1, 2.2, 3 등)
 */
function generateHierarchicalNumber(currentLoop: LoopInfo, allLoops: LoopInfo[]): string {
  if (currentLoop.level === 0) {
    // 최상위 루프
    return currentLoop.index.toString();
  }
  
  // 부모 루프 찾기
  const parentLoop = allLoops[currentLoop.parentIndex!];
  const parentNumber = generateHierarchicalNumber(parentLoop, allLoops);
  
  return `${parentNumber}.${currentLoop.index}`;
}


// sohyeon's hw
export async function traceVar({ 
  code, 
  target = "all",
  details = {}
}: { 
  code: string;
  target?: string;
  details?: any;
}) {
  let prompt = `Analyze the following code snippet and trace the flow of variables.`;

  // 선택적 변수 추적
  if (target === "variable" && details.name) {
    prompt += `\n\n**특별 요청**: 변수 "${details.name}"만 집중적으로 추적해주세요.`;
  }

  prompt += `

  **Response Format:**
  - **If no variables are used in the code,** please respond only with "No variables are used."
  - **If variables are used in the code,** please provide a concise explanation for each variable in the following format:
    \`\`\`
    Variable 1: [Variable Name]
    - [Concise and intuitive explanation of variable value changes]
    Variable 2: [Variable Name]
    - [Concise and intuitive explanation of variable value changes]
    ...
    \`\`\`
    The explanation should be short and intuitive, but clearly explain the changes in variable values.

  Please respond in Korean.

  \`\`\`${code}\`\`\``;
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { variableTrace: result.response.text() };
}

// jimin's hw
export async function testBreak({ codeSnippet }: { codeSnippet: string }) {
  const prompt = buildPrompt(codeSnippet);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);

  const responseText = result.response.text().trim();

  try {
    // JSON 추출 시도
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } else {
      // JSON이 없으면 텍스트 형태로 반환
      return {
        isBuggy: responseText.includes("buggy") || responseText.includes("error"),
        reason: responseText,
        suggestion: "JSON 파싱 실패로 인해 상세 분석을 확인해주세요."
      };
    }
  } catch (err) {
    // 파싱 실패 시 텍스트 형태로 반환
    return {
      isBuggy: responseText.includes("buggy") || responseText.includes("error"),
      reason: responseText,
      suggestion: "JSON 파싱 실패로 인해 상세 분석을 확인해주세요."
    };
  }
}

function buildPrompt(codeSnippet: string): string {
  return `
You are a static analysis expert specializing in detecting undefined behavior and runtime bugs in C/C++ code.

Analyze the following code snippet or function and determine whether it is likely to cause any critical issue during execution.

The issues you must consider include (but are not limited to):

- Null pointer dereference
- Division by zero
- Out-of-bound memory access
- Use of uninitialized variables
- Use-after-free
- Memory leaks (e.g., missing free or delete)
- Infinite or non-terminating loops
- Recursion with no base case
- Dangerous type coercion or overflow
- Dead code or unreachable branches

If the code is buggy, explain the reason and how to fix it.
If the code is safe, explain why it does not cause any problem.

⚠️ Your response must strictly follow this JSON format:

{
  "isBuggy": true or false,
  "reason": "string (describe why the code is buggy or safe)",
  "suggestion": "string (how to fix, or null if safe)"
}

❗ Do not include anything outside this JSON object.
Do not add comments, explanations, markdown formatting, or any additional prose.

Now analyze the following code:

${codeSnippet}
  `.trim();
}