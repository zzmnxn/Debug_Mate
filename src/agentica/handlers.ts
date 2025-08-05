import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
import { extractLoopsFromCode } from '../parsing/loopExtractor';
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
- If issues are present: State the most likely cause and suggest a concrete fix (1–2 lines).
- Do NOT guess beyond the given log. If something is unclear, say so briefly.

IMPORTANT: Please respond in Korean, but keep the [Result], [Reason], and [Suggestion] section headers in English.

Format your response in the following structure:

[Result] {Short message: "O" or "X"}
[Reason] {Brief explanation of why - in Korean}
[Suggestion] {Fix or say "Suggestion 없음" if none needed - in Korean}
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
export async function afterDebugFromCode(code: string, originalFileName: string = "input.c"): Promise<{ analysis: string, markedFilePath: string }> {
  const tmpFile = path.join("/tmp", `code_${Date.now()}.c`);
  fs.writeFileSync(tmpFile, code);

  let compileLog = "";

  try {
    // 컴파일 단계 - spawnSync 사용으로 변경하여 stderr 확실히 캡처
    const compileResult = spawnSync("gcc", [
      "-Wall", "-Wextra", "-Wpedantic", "-O2", "-Wdiv-by-zero", 
      "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address", tmpFile, "-o", "/tmp/a.out"
    ], {
      encoding: "utf-8"
    });
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
  const analysis = await afterDebug(summary, parsed.errors, parsed.warnings);
  // AI 분석 결과에서 [Result] X면 Reason/Suggestion을 markErrors에 넘김
  let aiAnalysisForMark = undefined;
  const resultMatch = analysis.match(/\[Result\]\s*([OX])/);
  if (resultMatch && resultMatch[1] === "X") {
    aiAnalysisForMark = analysis;
  }
  const markedFilePath = markErrors(originalFileName, code, parsed.errors, parsed.warnings, aiAnalysisForMark);
  return { analysis, markedFilePath };
}



/**
 * 코드에서 에러와 경고 위치를 주석으로 표시하고 파일로 저장하는 함수
 *
 * @param originalFilePath - 원본 파일 경로 (예: "main.c")
 * @param code - 원본 코드 문자열
 * @param errors - 파싱된 컴파일러 에러 목록
 * @param warnings - 파싱된 컴파일러 경고 목록
 * @param aiAnalysis - AI 분석 결과 (에러가 있는 경우 Reason/Suggestion을 포함)
 * @returns 생성된 파일의 경로
 */
export function markErrors(
  originalFilePath: string,
  code: string,
  errors: CompilerError[],
  warnings: CompilerWarning[],
  aiAnalysis?: string
): string {
  const lines = code.split("\n");
  const markedLines: string[] = [];

  // 각 라인별로 에러/경고 정보 수집
  const lineIssues = new Map<
    number,
    { errors: CompilerError[]; warnings: CompilerWarning[] }
  >();

  // 에러 정보 수집
  errors.forEach((error) => {
    if (error.line) {
      const lineNum = error.line;
      if (!lineIssues.has(lineNum)) {
        lineIssues.set(lineNum, { errors: [], warnings: [] });
      }
      lineIssues.get(lineNum)!.errors.push(error);
    }
  });

  // 경고 정보 수집
  warnings.forEach((warning) => {
    if (warning.line) {
      const lineNum = warning.line;
      if (!lineIssues.has(lineNum)) {
        lineIssues.set(lineNum, { errors: [], warnings: [] });
      }
      lineIssues.get(lineNum)!.warnings.push(warning);
    }
  });

  // AI 분석 결과가 치명적(X)이면 파일 상단에 Reason/Suggestion 주석 추가
  if (aiAnalysis) {
    const resultMatch = aiAnalysis.match(/\[Result\]\s*([OX])/);
    if (resultMatch && resultMatch[1] === "X") {
      // Reason, Suggestion 추출
      const reasonMatch = aiAnalysis.match(/\[Reason\](.*?)(\[Suggestion\]|$)/s);
      const suggestionMatch = aiAnalysis.match(/\[Suggestion\](.*)/s);
      if (reasonMatch) {
        markedLines.push(`// [AI 분석: 치명적 문제 감지]`);
        markedLines.push(`// Reason: ${reasonMatch[1].trim()}`);
      }
      if (suggestionMatch) {
        markedLines.push(`// Suggestion: ${suggestionMatch[1].trim()}`);
      }
      markedLines.push("");
    }
  }

  // 각 라인 처리
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const issues = lineIssues.get(lineNum);
    let outputLine = line;
    let comments: string[] = [];
    if (issues) {
      // 에러 메시지들 표시 (컴파일 타임 + 런타임)
      issues.errors.forEach((error) => {
        let indicator = "";
        const isRuntimeError = error.type === 'runtime';
        const errorPrefix = isRuntimeError ? '[RUNTIME ERROR]' : '[ERROR]';
        
        if (error.column) {
          indicator = " ".repeat(Math.max(0, error.column - 1)) + "^";
          if (error.code) {
            comments.push(`${errorPrefix} ${error.code}: ${error.message}`);
          } else {
            comments.push(`${errorPrefix} ${error.message}`);
          }
          // 런타임 에러의 경우 화살표 표시 추가
          if (isRuntimeError) {
            outputLine += `\n${indicator} // ${error.message}`;
          } else {
            outputLine += `\n${indicator}`;
          }
        } else {
          // 컬럼 정보가 없는 경우
          if (error.code) {
            comments.push(`${errorPrefix} ${error.code}: ${error.message}`);
          } else {
            comments.push(`${errorPrefix} ${error.message}`);
          }
          // 런타임 에러인데 컬럼이 없는 경우
          if (isRuntimeError) {
            outputLine += `  // ${error.message}`;
          }
        }
      });
      
      // 경고 메시지들 표시
      issues.warnings.forEach((warning) => {
        let indicator = "";
        if (warning.column) {
          indicator = " ".repeat(Math.max(0, warning.column - 1)) + "^";
          if (warning.code) {
            comments.push(`[WARNING] ${warning.code}: ${warning.message}`);
          } else {
            comments.push(`[WARNING] ${warning.message}`);
          }
          outputLine += `\n${indicator}`;
        } else {
          if (warning.code) {
            comments.push(`[WARNING] ${warning.code}: ${warning.message}`);
          } else {
            comments.push(`[WARNING] ${warning.message}`);
          }
        }
      });
      markedLines.push(outputLine);
      if (comments.length > 0) {
        comments.forEach((comment) => {
          markedLines.push(`// ${"=".repeat(50)}`);
          markedLines.push(comment);
        });
      }
    } else {
      // 일반 라인 (문제 없음)
      markedLines.push(line);
    }
  });

  // 요약 정보 추가
  markedLines.push("");
  markedLines.push(`// ====== 요약 ======`);
  const runtimeErrorCount = errors.filter(e => e.type === 'runtime').length;
  const compileErrorCount = errors.length - runtimeErrorCount;
  
  if (runtimeErrorCount > 0) {
    markedLines.push(`// 런타임 오류: ${runtimeErrorCount}개`);
  }
  if (compileErrorCount > 0) {
    markedLines.push(`// 컴파일 에러: ${compileErrorCount}개`);
  }
  if (warnings.length > 0) {
    markedLines.push(`// 경고: ${warnings.length}개`);
  }
  


  // 파일명 생성 (원본 파일명 기반)
  const parsedPath = path.parse(originalFilePath);
  const outputFileName = `${parsedPath.name}_with_errors${parsedPath.ext}`;
  const outputPath = path.join(parsedPath.dir || ".", outputFileName);

  // 파일로 저장
  const markedCode = markedLines.join("\n");
  fs.writeFileSync(outputPath, markedCode, "utf8");

  return outputPath;
}

// uuyeong's hw
export async function loopCheck({ code }: { code: string }) {
  const loops = extractLoopsFromCode(code);
  
  if (loops.length === 0) {
    return { result: "코드에서 for/while 루프를 찾을 수 없습니다." };
  }
  
  const results = [];
  for (let i = 0; i < loops.length; i++) {
    const loop = loops[i];
    const prompt = `Review the following loop code and determine if its termination condition is valid. If there is an issue, provide a concise explanation and a corrected example snippet. Respond in Korean, focusing on the core insights.\n\n${loop}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const analysis = result.response.text();
    
    results.push(`**루프 ${i + 1}**:\n\`\`\`\n${loop.trim()}\n\`\`\`\n\n**분석 결과**:\n${analysis}`);
  }
  
  return { result: `루프 분석 완료 (총 ${loops.length}개)\n\n${results.join('\n\n---\n\n')}` };
}


// sohyeon's hw
export async function traceVar({ code }: { code: string }) {
  const prompt = `Analyze the following code snippet and trace the flow of variables.

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
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse model output as JSON:\n${responseText}`);
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