import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
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
`.trim();
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
    // 컴파일 단계
    compileLog = execSync(`gcc ${tmpFile} -o /tmp/a.out`, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 실행 단계
    compileLog += "\n\n=== Runtime Output ===\n";
    const run = spawnSync("/tmp/a.out", { encoding: "utf-8" });

    compileLog += run.stdout || "";
    compileLog += run.stderr || "";

    if (run.error) {
      compileLog += `\n[Runtime Error] ${run.error.message}`;
    }

  } catch (err: any) {
    // 컴파일 에러
    compileLog += "\n\n=== Compile Error ===\n";
    compileLog += err.stderr?.toString?.() || err.message;
  }
  //디버깅 문장장
  //console.log("=== 🧾 GCC + Runtime 로그 ===");
  //console.log(compileLog);
  const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
  const summary = CompilerResultParser.generateSummary(parsed);
  return afterDebug(summary, parsed.errors, parsed.warnings);
}



export async function loopCheck({ code }: { code: string }) {
  const prompt = `Review the following loop code and determine if its termination condition is valid. If there is an issue, provide a concise explanation and a corrected example snippet. Respond in Korean, focusing on the core insights.
  \`\`\`${code}\`\`\``;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { result: result.response.text() };
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