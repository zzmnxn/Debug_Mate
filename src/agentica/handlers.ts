import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CompilerError,
  CompilerWarning,
  CompilerResultParser,
} from "../parsing/compilerResultParser";
import { extractLoopsFromCode } from "../parsing/loopExtractor";
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");

/**
 * afterDebug 기능을 위한 프롬프트 생성 함수
 * @param logSummary - 컴파일 및 실행 로그의 요약 정보
 * @param errors - 파싱된 컴파일러 에러 목록
 * @param warnings - 파싱된 컴파일러 경고 목록
 * @returns Gemini AI 분석을 위한 구조화된 프롬프트 문자열
 */
export function buildAfterDebugPrompt(
  logSummary: string,
  errors: CompilerError[],
  warnings: CompilerWarning[]
): string {
  // 프롬프트에 포함할 최대 에러/경고 개수 (너무 많으면 AI 분석 품질이 떨어질 수 있음)
  const MAX_ITEMS = 3;

  // 에러 정보를 사람이 읽기 쉬운 형태로 포맷팅
  const formatError = (e: CompilerError, i: number) =>
    `[Error ${i + 1}] (${e.severity.toUpperCase()} - ${e.type}) ${e.message}${e.file ? ` at ${e.file}:${e.line}:${e.column}` : ""}`;

  // 경고 정보를 사람이 읽기 쉬운 형태로 포맷팅
  const formatWarning = (w: CompilerWarning, i: number) =>
    `[Warning ${i + 1}] (${w.type}) ${w.message}${w.file ? ` at ${w.file}:${w.line}:${w.column}` : ""}`;

  // 상위 N개의 에러와 경고만 선택하여 텍스트로 변환
  const errorText = errors.slice(0, MAX_ITEMS).map(formatError).join("\n");
  const warningText = warnings
    .slice(0, MAX_ITEMS)
    .map(formatWarning)
    .join("\n");

  return `
You are a senior compiler engineer and static analysis expert.
Your task is to analyze the compiler output and runtime log from a C/C++ program and determine whether the code has any critical problems that need to be addressed before deployment.

=== Summary ===
${logSummary}

=== Compiler Errors ===
${errorText || "None"}

=== Compiler Warnings ===
${warningText || "None"}

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

export async function afterDebug(
  logSummary: string,
  errors: CompilerError[],
  warnings: CompilerWarning[]
): Promise<string> {
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
    throw new Error(
      `AI 분석 실패: ${error instanceof Error ? error.message : String(error)}`
    );
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

/**
 * 컴파일 및 실행을 수행하고 로그를 반환하는 헬퍼 함수
 */
async function compileAndRun(
  sourceFile: string,
  outputFile: string
): Promise<string> {
  let log = "";

  // GCC 컴파일 실행
  const compileResult = spawnSync(
    "gcc",
    [
      "-Wall",
      "-Wextra",
      "-Wpedantic",
      "-O2",
      "-Wdiv-by-zero",
      "-fanalyzer",
      "-fsanitize=undefined",
      "-fsanitize=address",
      sourceFile,
      "-o",
      outputFile,
    ],
    {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  // 컴파일 출력 수집
  log += (compileResult.stdout || "") + (compileResult.stderr || "");

  // 컴파일 성공 시 실행
  if (compileResult.status === 0) {
    log += "\n\n=== Runtime Output ===\n";
    const runResult = spawnSync(outputFile, [], {
      encoding: "utf-8",
      timeout: 1000,
    });

    log += (runResult.stdout || "") + (runResult.stderr || "");

    // 런타임 에러 감지
    if (runResult.stderr?.includes("runtime error:")) {
      log +=
        "\n[Runtime Type] UndefinedBehaviorSanitizer runtime error (UB 가능성)";
    }

    // 타임아웃 감지
    if (runResult.error && (runResult.error as any).code === "ETIMEDOUT") {
      log +=
        "\n[Runtime Error] Execution timed out (possible infinite loop)\nloopCheck() 함수를 사용해보세요";
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

// 문자열 패딩 헬퍼 함수 (padStart 대체)
function padLeft(str: string, length: number, padChar: string = " "): string {
  const padLength = length - str.length;
  return padLength > 0 ? padChar.repeat(padLength) + str : str;
}

/**
 * 코드에서 에러와 경고 위치를 주석으로 표시하고 파일로 저장하는 함수
 *
 * @param originalFilePath - 원본 파일 경로 (예: "main.c")
 * @param code - 원본 코드 문자열
 * @param errors - 파싱된 컴파일러 에러 목록
 * @param warnings - 파싱된 컴파일러 경고 목록
 * @returns 생성된 파일의 경로
 */
export function markErrors(
  originalFilePath: string,
  code: string,
  errors: CompilerError[],
  warnings: CompilerWarning[]
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

  // 헤더 추가
  markedLines.push(`// === 에러/경고 위치 표시 파일 ===`);
  markedLines.push(`// 원본 파일: ${originalFilePath}`);
  markedLines.push(`// ● ERROR | ● WARNING`);
  markedLines.push("");

  // 각 라인 처리
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const issues = lineIssues.get(lineNum);
    let outputLine = line;
    let comments: string[] = [];
    if (issues) {
      // 에러 메시지들 표시
      issues.errors.forEach((error) => {
        let indicator = "";
        if (error.column) {
          indicator = " ".repeat(error.column - 1) + "^";
          if (error.code) {
            comments.push(`// ${error.code}`);
          }
          outputLine += `\n${indicator}`;
        } else {
          if (error.code) {
            comments.push(`// ${error.code}`);
          }
        }
      });
      // 경고 메시지들 표시
      issues.warnings.forEach((warning) => {
        let indicator = "";
        if (warning.column) {
          indicator = " ".repeat(warning.column - 1) + "^";
          if (warning.code) {
            comments.push(`// ${warning.code}`);
          }
          outputLine += `\n${indicator}`;
        } else {
          if (warning.code) {
            comments.push(`// ${warning.code}`);
          }
        }
      });
      markedLines.push(
        outputLine + (comments.length > 0 ? "  " + comments.join(" ") : "")
      );
    } else {
      // 일반 라인 (문제 없음)
      markedLines.push(line);
    }
  });

  // 요약 정보 추가
  markedLines.push("");
  markedLines.push(`// === 요약 ===`);
  markedLines.push(`// 에러: ${errors.length}개`);
  markedLines.push(`// 경고: ${warnings.length}개`);

  // 파일명 생성 (원본 파일명 기반)
  const parsedPath = path.parse(originalFilePath);
  const outputFileName = `${parsedPath.name}_with_errors${parsedPath.ext}`;
  const outputPath = path.join(parsedPath.dir || ".", outputFileName);

  // 파일로 저장
  const markedCode = markedLines.join("\n");
  fs.writeFileSync(outputPath, markedCode, "utf8");

  return outputPath;
}

/**
 * 코드를 임시 파일로 저장, 컴파일, 에러/경고를 파싱해 마킹된 파일을 생성하는 함수
 * @param code - 컴파일할 C/C++ 코드 문자열
 * @param originalFilePath - 원본 파일명(확장자 포함)
 * @param compilerPath - 사용할 컴파일러 경로 (기본값: gcc)
 * @returns 마킹된 파일 경로
 */
export async function compileAndMarkCode(
  code: string,
  originalFilePath: string,
  compilerPath: string = "gcc"
): Promise<string> {
  const tmp = require("os").tmpdir();
  const fs = require("fs");
  const path = require("path");
  const { CompilerResultParser } = require("../parsing/compilerResultParser");
  const sourcePath = path.join(tmp, `debugmate_tmp_${Date.now()}.c`);
  fs.writeFileSync(sourcePath, code, "utf8");

  // 컴파일 (출력 파일은 무시)
  const execSync = require("child_process").execSync;
  let compilerOutput = "";
  try {
    compilerOutput = execSync(`${compilerPath} -Wall -o NUL "${sourcePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e: any) {
    // 컴파일 에러/경고는 stderr에 있음
    compilerOutput = e.stdout + "\n" + e.stderr;
  }

  // 파싱
  const result = CompilerResultParser.parseCompilerOutput(compilerOutput);

  // 마킹 파일 생성
  const markedPath = markErrors(
    originalFilePath,
    code,
    result.errors,
    result.warnings
  );

  // 임시 파일 정리(선택)
  try {
    fs.unlinkSync(sourcePath);
  } catch {}

  return markedPath;
}

// afterDebugFromCode 수정: 마킹 파일 경로도 반환
export async function afterDebugFromCode(
  code: string,
  originalFilePath: string = "main.c"
): Promise<{ analysis: string; markedFilePath: string }> {
  // 기존 코드 참고 (임시 파일 저장, 컴파일, 파싱 등)
  const tmp = require("os").tmpdir();
  const fs = require("fs");
  const path = require("path");
  const { CompilerResultParser } = require("../parsing/compilerResultParser");
  const sourcePath = path.join(tmp, `debugmate_tmp_${Date.now()}.c`);
  fs.writeFileSync(sourcePath, code, "utf8");

  // 컴파일 (출력 파일은 무시)
  const execSync = require("child_process").execSync;
  let compilerOutput = "";
  try {
    compilerOutput = execSync(`gcc -Wall -o NUL "${sourcePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (e: any) {
    compilerOutput = e.stdout + "\n" + e.stderr;
  }

  // 파싱
  const result = CompilerResultParser.parseCompilerOutput(compilerOutput);

  // AI 분석
  const analysis = await afterDebug(
    CompilerResultParser.generateSummary(result),
    result.errors,
    result.warnings
  );

  // 마킹 파일 생성
  const markedFilePath = markErrors(
    originalFilePath,
    code,
    result.errors,
    result.warnings
  );

  try {
    fs.unlinkSync(sourcePath);
  } catch {}

  return { analysis, markedFilePath };
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

    results.push(
      `**루프 ${i + 1}**:\n\`\`\`\n${loop.trim()}\n\`\`\`\n\n**분석 결과**:\n${analysis}`
    );
  }

  return {
    result: `루프 분석 완료 (총 ${loops.length}개)\n\n${results.join("\n\n---\n\n")}`,
  };
}

// sohyeon's hw
// traceVar 함수를 비동기(async) 함수로 정의합니다.
// 이 함수는 'code'와 'userQuery'라는 두 개의 인자를 받습니다.
export async function traceVar({
  code,         // 사용자가 제공한 코드 문자열
  userQuery,    // 변수 추적에 대한 사용자의 질문
}: {
  code: string;
  userQuery: string;
}) {
  // Gemini 모델에 전달할 프롬프트(prompt)를 정의합니다.
  const prompt = `
  // 사용자 코드와 질문을 분석하여 변수의 흐름을 추적하라는 지시
  Analyze the following code and the user's question to trace the flow of variables the user wants to understand.
  // 만약 사용자가 특정 변수나 함수를 지정하지 않았다면, 주요 변수들의 흐름을 설명하라는 지시
  If the user's question does not specify a function or variable name, identify and explain the flow of key variables in the code.
  // 만약 사용자의 질문이 변수 추적과 관련이 없다면, 특정 응답("The question is not related to variable tracing.")을 반환하라는 지시
  If the user's question is not related to variable tracing, respond with "The question is not related to variable tracing."

  **User Question:**
  "${userQuery}"

  **Code:**
  \`\`\`
  ${code}
  \`\`\`

  **Response Format:**
  // 응답 형식
  - Present each variable using the format Variable Name: variable_name.
  - Include the following sections for each variable:
    - [Initial Value]: Describe the initial value of the variable(Output only the numeric or literal value (no explanation)).
    - [Update Process]: Summarize the changes step-by-step using short bullet points (use "-" at the beginning of each line, avoid long sentences).
    - [Final Value]: Indicate the final value stored in the variable(Output only the final value (no explanation)).
  - Write all section titles in English (Variable Name, Initial Value, Update Process, Final Value), and provide the explanations in Korean.

  // 응답 형식의 예시 제공
  - For example:
  \`\`\`
  Variable Name: counter
  [Initial Value] 0
  [Update Process]
    - 루프 진입 시마다 1씩 증가
    - 총 10회 반복
  [Final Value] 10
  \`\`\`
  // 위의 형식을 따르도록 지시
  Please follow this format for your explanation.
  `.trim(); // 문자열의 양쪽 공백을 제거합니다.

  // 'gemini-1.5-flash' 모델을 사용하여 Gemini AI 모델 인스턴스를 생성합니다.
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  // 생성된 모델에 프롬프트를 전달하여 콘텐츠를 생성하도록 요청합니다.
  const result = await model.generateContent(prompt);
  
  // AI 응답 텍스트를 'variableTrace' 키를 가진 객체 형태로 반환합니다.
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
