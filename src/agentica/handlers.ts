import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
import { extractLoopsFromCode } from '../parsing/loopExtractor';
import { execSync } from "child_process";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");


/**
 * afterDebug 기능을 위한 프롬프트 생성 함수
 * @param logSummary - 컴파일 및 실행 로그의 요약 정보
 * @param errors - 파싱된 컴파일러 에러 목록
 * @param warnings - 파싱된 컴파일러 경고 목록
 * @returns Gemini AI 분석을 위한 구조화된 프롬프트 문자열
 */
export function buildAfterDebugPrompt(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[]): string {
  // 프롬프트에 포함할 최대 에러/경고 개수 (너무 많으면 AI 분석 품질이 떨어질 수 있음)
  const MAX_ITEMS = 3;

  // 에러 정보를 사람이 읽기 쉬운 형태로 포맷팅
  const formatError = (e: CompilerError, i: number) =>
    `[Error ${i + 1}] (${e.severity.toUpperCase()} - ${e.type}) ${e.message}${e.file ? ` at ${e.file}:${e.line}:${e.column}` : ''}`;

  // 경고 정보를 사람이 읽기 쉬운 형태로 포맷팅
  const formatWarning = (w: CompilerWarning, i: number) =>
    `[Warning ${i + 1}] (${w.type}) ${w.message}${w.file ? ` at ${w.file}:${w.line}:${w.column}` : ''}`;

  // 상위 N개의 에러와 경고만 선택하여 텍스트로 변환
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
- Do NOT guess beyond the given log. If something is unclear, say so briefly (e.g., "Based on the log alone, it's unclear").


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
 * afterDebug 핵심 함수 - 파싱된 컴파일러 결과를 AI로 분석
 * @param logSummary - CompilerResultParser.generateSummary()로 생성된 로그 요약
 * @param errors - 파싱된 컴파일러 에러 배열
 * @param warnings - 파싱된 컴파일러 경고 배열
 * @returns AI 분석 결과 (한국어, 구조화된 형태: [Result]/[Reason]/[Suggestion])
 */
export async function afterDebug(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[]): Promise<string> {
  // 조기 반환: 에러와 경고가 모두 없으면 AI 호출 없이 바로 성공 응답
  if (errors.length === 0 && warnings.length === 0) {
    return `[Result] No critical issues detected
[Reason] 컴파일 성공, 에러 및 경고 없음
[Suggestion] No fix required`;
  }

  // 에러나 경고가 있는 경우에만 AI 분석 수행
  try {
    const prompt = buildAfterDebugPrompt(logSummary, errors, warnings);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    throw new Error(`AI 분석 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * afterDebugFromCode - C/C++ 코드를 받아서 전체 분석 파이프라인 실행
 * @param code - 분석할 C/C++ 소스 코드 문자열
 * @returns AI 분석 결과 (한국어, 구조화된 형태)
 * 
 * @throws Error - 파일 시스템 오류, 컴파일러 오류, AI API 오류 등
 * 
 */
export async function afterDebugFromCode(code: string): Promise<string> {
  const tmpFile = path.join("/tmp", `code_${Date.now()}.c`);
  const outputFile = "/tmp/a.out";
  
  try {
    // 임시 파일에 코드 저장
    fs.writeFileSync(tmpFile, code);
    
    // 컴파일 실행
    const compileLog = await compileAndRun(tmpFile, outputFile);
    
    // 결과 파싱 및 분석
    const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
    const summary = CompilerResultParser.generateSummary(parsed);
    return afterDebug(summary, parsed.errors, parsed.warnings);
    
  } finally {
    // 임시 파일 정리
    cleanupTempFiles(tmpFile, outputFile);
  }
}

/**
 * 컴파일 및 실행을 수행하고 로그를 반환하는 헬퍼 함수
 */
async function compileAndRun(sourceFile: string, outputFile: string): Promise<string> {
  let log = "";
  
  // GCC 컴파일 실행
  const compileResult = spawnSync("gcc", [
    "-Wall", "-Wextra", "-Wpedantic", "-O2", "-Wdiv-by-zero", 
    "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address", 
    sourceFile, "-o", outputFile
  ], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  
  // 컴파일 출력 수집
  log += (compileResult.stdout || "") + (compileResult.stderr || "");
  
  // 컴파일 성공 시 실행
  if (compileResult.status === 0) {
    log += "\n\n=== Runtime Output ===\n";
    const runResult = spawnSync(outputFile, [], { 
      encoding: "utf-8", 
      timeout: 1000 
    });
    
    log += (runResult.stdout || "") + (runResult.stderr || "");
    
    // 런타임 에러 감지
    if (runResult.stderr?.includes("runtime error:")) {
      log += "\n[Runtime Type] UndefinedBehaviorSanitizer runtime error (UB 가능성)";
    }
    
    // 타임아웃 감지
    if (runResult.error && (runResult.error as any).code === 'ETIMEDOUT') {
      log += "\n[Runtime Error] Execution timed out (possible infinite loop)\nloopCheck() 함수를 사용해보세요";
    }
  }
  
  return log;
}

/**
 * 임시 파일들을 안전하게 정리하는 헬퍼 함수
 */
function cleanupTempFiles(...files: string[]): void {
  for (const file of files) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (error) {
      // 파일 삭제 실패는 무시 (임시 파일이므로)
      console.warn(`임시 파일 삭제 실패: ${file}`);
    }
  }
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

// moonjeong's hw1   (code: string): Promise<string> {
export async function beforeDebug({ code }: { code: string }) {
  const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);  // Windows에서는 tmp 폴더 없을 수 있음
  
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
  const outputFile = path.join(tmpDir, `a.out`);

  try {
    // 코드 저장
    fs.writeFileSync(tmpFile, code);

    // GCC 컴파일 수행
    const compileResult = spawnSync("gcc", [
      "-Wall", "-Wextra", "-O2", "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address",
      tmpFile, "-o", outputFile
    ], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"]
    });

    // 로그 수집
    let log = (compileResult.stdout || "") + (compileResult.stderr || "");
    if (compileResult.status === 0) {
      const runResult = spawnSync(outputFile, [], { encoding: "utf-8", timeout: 1000 });
      log += "\n\n=== Runtime Output ===\n";
      log += runResult.stdout || "";
      log += runResult.stderr || "";
    }

    // 프롬프트 구성
    const prompt = `
당신은 C 언어 디버깅 전문가입니다.
사용자가 작성한 전체 코드와 gcc 컴파일/실행 로그를 함께 제공합니다.

🔹 코드 내용:
\`\`\`c
${code}
\`\`\`

🔹 GCC 로그:
\`\`\`
${log}
\`\`\`

이 정보를 바탕으로 다음의 포맷으로 분석해주세요:

[Result] "문제 있음" 또는 "문제 없음"
[Reason] 주요 원인 또는 분석 이유
[Suggestion] 핵심 수정 제안 (1~2줄)

`.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();

  } catch (e: any) {
    return `[Result] 분석 실패\n[Reason] ${e.message || e.toString()}\n[Suggestion] 로그 확인 필요`;
  } finally {
    // 정리
    [tmpFile, outputFile].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
  }
}

// moonjeong's hw2
export async function inProgressDebug(code: string) {
  let compileLog = "";

  try {
    const compileResult = spawnSync("gcc", [
      "-Wall",
      "-Wextra",
      "-Wpedantic",
      "-fsyntax-only",
      "-xc",  // 입력 형식 명시
      "-"     // stdin 입력
    ], {
      input: code,           // 여기서 코드 전달
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]  // stdin, stdout, stderr 모두 파이프
    });

    compileLog += compileResult.stderr || "";

  } catch (err) {
    compileLog += `GCC Error: ${(err as Error).message}`;
  }

  const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
  const summary = CompilerResultParser.generateSummary(parsed);

  const prompt = `
당신은 숙련된 C 디버깅 도우미입니다.
사용자가 아직 완성하지 않은 C 코드 일부를 작성하고 있습니다.

아래는 작성 중인 코드와 현재까지의 컴파일 로그 요약입니다. 오류가 많더라도 "명백한 실수" (예: ; 누락, 오타, 선언 안 된 변수 등)만 짚어주세요.

[Summary]
${summary}

[Code]
\`\`\`c
${code}
\`\`\`

[Instructions]
- 전체 코드가 아니므로 함수 누락 등은 무시해주세요.
- 명백한 문법 오류만 확인해주세요.
- 너무 공격적인 피드백은 지양해주세요.
- 다음 형식으로 응답하세요:

[Result] 문제 있음/없음
[Issues] 발견된 문제 요약 (없으면 없음)
[Suggestions] 간단한 수정 제안
`.trim();

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
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