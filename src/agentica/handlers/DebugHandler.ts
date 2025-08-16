import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../../parsing/compilerResultParser';
import { execSync } from "child_process";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");

// API 오류에 대비한 재시도 로직 헬퍼 함수
async function callWithRetry<T>(
    apiCall: () => Promise<T>,
    retries = 3,
    delay = 1000
): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCall();
        } catch (error: any) {
            if (error.response && error.response.status === 400 &&
                error.response.data?.error?.details?.some((d: any) => d.reason === "API_KEY_INVALID")) {
                throw new Error(`[API Key Error]: 유효한 [API] 키를 확인하세요.`);
            }
            if (error.response && (error.response.status === 429 || error.response.status >= 500) ||
                error.message.includes("Network Error")) {
                if (i < retries - 1) {
                    console.warn(`[API] 호출 실패 ([Status]: ${error.response?.status}). ${delay / 1000}초 후 재시도...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                } else {
                    throw new Error(`[API Retry Failed]: ${error.message || "알 수 없는 [API] 오류"}. 최대 재시도 횟수 도달.`);
                }
            } else {
                throw new Error(`[API Error]: ${error.message || "예상치 못한 오류 발생"}`);
            }
        }
    }
    throw new Error("[Unexpected Error] 재시도 로직에서 예상치 못한 오류로 종료되었습니다.");
}

// afterDebug 프롬프트 생성
export function buildAfterDebugPrompt(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[], executionOutput?: string): string {
  const formatError = (e: CompilerError, i: number) => {
    const location = e.file ? ` at ${e.file}:${e.line || '?'}:${e.column || '?'}` : '';
    const code = e.code ? ` (${e.code})` : '';
    return `[Error ${i + 1}] (${e.severity.toUpperCase()} - ${e.type})${code} ${e.message}${location}`;
  };

  const formatWarning = (w: CompilerWarning, i: number) => {
    const location = w.file ? ` at ${w.file}:${w.line || '?'}:${w.column || '?'}` : '';
    const code = w.code ? ` (${code})` : '';
    return `[Warning ${i + 1}] (${w.type})${code} ${w.message}${location}`;
  };

  const sortedErrors = [...errors].sort((a, b) => {
    if (a.severity === 'fatal' && b.severity !== 'fatal') return -1;
    if (a.severity !== 'fatal' && b.severity === 'fatal') return 1;
    return 0;
  });

  const errorText = sortedErrors.map(formatError).join('\n');
  const warningText = warnings.map(formatWarning).join('\n');
  
  return `
You are a senior compiler engineer and static analysis expert with 15+ years of experience in C/C++ development and debugging.
Your task is to analyze the compiler output and runtime log from a C/C++ program and determine whether the code has any critical problems that need to be addressed before deployment.

=== Summary ===
${logSummary}

=== Compiler Errors ===
${errorText || 'None'}

=== Compiler Warnings ===
${warningText || 'None'}

${executionOutput ? `=== Program Execution Output ===
${executionOutput}` : ''}

IMPORTANT NOTES:
- If issues are present: State the most likely cause and suggest a concrete fix (1–2 lines).
- Do NOT guess beyond the given log. If something is unclear, say so briefly.
- Prioritize critical issues that could cause crashes, memory corruption, or undefined behavior.

IMPORTANT: Please respond in Korean, but keep the [Result], [Reason], and [Suggestion] section headers in English.

Format your response in the following structure:

[Result] {Short message: "O" or "X"}
[Reason] {Brief explanation of why - in Korean}
[Suggestion] {Fix or say "Suggestion 없음" if none needed - in Korean}
Do not add anything outside this format.

=== Analysis Rules ===
- If error type is "undeclared" or message contains "undeclared", always treat as critical.
- If a warning or message contains "memory leak", "leaked", "AddressSanitizer", or "LeakSanitizer", treat it as a critical issue.
- For unused variable warnings, if variable name is vague (like 'temp'), suggest renaming or removal.
- If runtime log contains "runtime error", "segmentation fault", "core dumped", or "undefined behavior", treat as critical.
- If runtime log contains "runtime error", check if it follows a dangerous cast (e.g., int to pointer). 
- If the summary or runtime log contains "[Hint] loopCheck() 함수를 사용하여 루프 조건을 검토해보세요.", do NOT analyze the cause. Just output the hint exactly as the Suggestion.
- If execution timed out, suggest using loopCheck() function to analyze loop conditions.
- For memory-related errors, always suggest checking pointer operations and memory allocation/deallocation.
`.trim();
}

// afterDebug: 에러/경고 로그 + 요약을 받아 Gemini 분석 수행
export async function afterDebug(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[], executionOutput?: string): Promise<string> {
  try {
    if (!logSummary || typeof logSummary !== 'string' || logSummary.trim() === '') {
      throw new Error('Invalid logSummary: must be a non-empty string');
    }
    
    if (!Array.isArray(errors) || !Array.isArray(warnings)) {
      throw new Error('Invalid errors/warnings: must be arrays');
    }

    if (!SGlobal.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in your environment variables.');
    }

    const prompt = buildAfterDebugPrompt(logSummary, errors, warnings, executionOutput);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out after 10 seconds')), 10000);
    });

    const apiPromise = model.generateContent(prompt);
    const result = await Promise.race([apiPromise, timeoutPromise]) as any;

    if (!result || !result.response || !result.response.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = result.response.text().trim();
    
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    const hasResult = /\[Result\]\s*[OX]/.test(responseText);
    const hasReason = /\[Reason\]/.test(responseText);
    const hasSuggestion = /\[Suggestion\]/.test(responseText);

    if (!hasResult || !hasReason || !hasSuggestion) {
      console.warn(' AI 응답이 예상 형식과 다릅니다. 원본 응답을 반환합니다.');
      return `[Result] X\n[Reason] AI 응답 형식 오류 - 원본 응답: ${responseText.substring(0, 200)}...\n[Suggestion] 시스템 관리자에게 문의하세요.`;
    }

    return responseText;

  } catch (error: any) {
    let errorMessage = 'Unknown error occurred';
    
    if (error.message.includes('API_KEY')) {
      errorMessage = 'Gemini API 키가 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 확인해주세요.';
    } else if (error.message.includes('timed out')) {
      errorMessage = 'API 요청이 시간 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      errorMessage = 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
    } else {
      errorMessage = `분석 중 오류가 발생했습니다: ${error.message}`;
    }

    console.error(' afterDebug 에러:', error);
    
    return `[Result] X\n[Reason] ${errorMessage}\n[Suggestion] 시스템 오류로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.`;
  }
}

// afterDebugFromCode: 코드 입력 → 컴파일 → 로그 파싱 → Gemini 분석까지 자동 수행
export async function afterDebugFromCode(code: string, originalFileName: string = "input.c"): Promise<{ analysis: string, markedFilePath: string, executionOutput?: string }> {
  const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
  const outputFile = path.join(tmpDir, `a.out_${Date.now()}`);
  
  let compileLog = "";
  let markedFilePath = "";
  let executionOutput = "";
  let compileSuccess = false;

  try {
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code: must be a non-empty string');
    }

    if (!originalFileName || typeof originalFileName !== 'string') {
      originalFileName = "input.c";
    }

    if (process.platform === "win32" && !fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    fs.writeFileSync(tmpFile, code, 'utf-8');

    const compileResult = spawnSync("gcc", [
      "-Wall", "-Wextra", "-Wpedantic", "-O2", "-Wdiv-by-zero", 
      "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address", 
      tmpFile, "-o", outputFile
    ], {
      encoding: "utf-8",
      timeout: 10000
    });

    if (compileResult.stdout) {
      compileLog += compileResult.stdout;
    }
    if (compileResult.stderr) {
      compileLog += compileResult.stderr;
    }

    if (compileResult.status === 0) {
      compileSuccess = true;
      compileLog += "\n\n=== Runtime Output ===\n";
      
      try {
        const runResult = spawnSync(outputFile, [], { 
          encoding: "utf-8", 
          timeout: 3000
        });

        if (runResult.stdout) {
          compileLog += runResult.stdout;
          executionOutput += runResult.stdout;
        }
        if (runResult.stderr) {
          compileLog += runResult.stderr;
          executionOutput += runResult.stderr;
        }
        
        if (runResult.error) {
          const errorAny = runResult.error as any;
          if (errorAny && errorAny.code === 'ETIMEDOUT') {
            compileLog += `\n[Runtime Error] Execution timed out (possible infinite loop)\n[Hint] loopCheck() 함수를 사용하여 루프 조건을 검토해보세요.`;
          } else {
            compileLog += `\n[Runtime Error] ${runResult.error.message}`;
          }
        }
      } catch (runError: any) {
        compileLog += `\n[Runtime Execution Error] ${runError.message}`;
      }
    } else {
      compileLog += "\n\n=== Compile Failed ===\n";
      if (compileResult.error) {
        compileLog += `[Compile Process Error] ${compileResult.error.message}\n`;
      }
      if (compileResult.signal) {
        compileLog += `[Compile Signal] ${compileResult.signal}\n`;
      }
    }

  } catch (err: any) {
    compileLog += "\n\n=== Unexpected Error ===\n";
    compileLog += `[Error] ${err.message || err.toString()}\n`;
    
    if (err.code === 'ENOENT') {
      compileLog += "[Suggestion] GCC가 설치되어 있는지 확인해주세요.\n";
    } else if (err.code === 'EACCES') {
      compileLog += "[Suggestion] 파일 권한을 확인해주세요.\n";
    }
  } finally {
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
      }
    } catch (cleanupError) {
      console.warn(' 임시 파일 정리 중 오류:', cleanupError);
    }
  }

  try {
    const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
    const summary = CompilerResultParser.generateSummary(parsed);
    
    const analysis = await afterDebug(summary, parsed.errors, parsed.warnings, executionOutput);
    
    let aiAnalysisForMark = undefined;
    const resultMatch = analysis.match(/\[Result\]\s*([OX])/);
    if (resultMatch && resultMatch[1] === "X") {
      aiAnalysisForMark = analysis;
    }
    
    markedFilePath = markErrors(originalFileName, code, parsed.errors, parsed.warnings, aiAnalysisForMark);
    
    const hasErrorOutput = executionOutput.includes('error') || 
                          executionOutput.includes('Error') || 
                          executionOutput.includes('ERROR') ||
                          executionOutput.includes('AddressSanitizer') ||
                          executionOutput.includes('SEGV') ||
                          executionOutput.includes('ABORTING') ||
                          executionOutput.includes('runtime error');
    
    const executionResultSection = compileSuccess && executionOutput.trim() && !hasErrorOutput ? 
      `[Compile Result]\n${executionOutput.trim()}\n` : '';
    const fullAnalysis = `${executionResultSection}=== AI Analysis ===\n${analysis}`;
    
    return { 
      analysis: fullAnalysis, 
      markedFilePath, 
      executionOutput: executionOutput.trim() || undefined 
    };
    
  } catch (analysisError: any) {
    console.error(' 분석 중 오류:', analysisError);
    
    const fallbackAnalysis = `[Result] X\n[Reason] 분석 과정에서 오류가 발생했습니다: ${analysisError.message}\n[Suggestion] 코드를 다시 확인하고 시도해주세요.`;
    
    const hasErrorOutput = executionOutput.includes('error') || 
                          executionOutput.includes('Error') || 
                          executionOutput.includes('ERROR') ||
                          executionOutput.includes('AddressSanitizer') ||
                          executionOutput.includes('SEGV') ||
                          executionOutput.includes('ABORTING') ||
                          executionOutput.includes('runtime error');
    
    const executionResultSection = compileSuccess && executionOutput.trim() && !hasErrorOutput ? 
      `[Compile Result]\n${executionOutput.trim()}\n` : '';
    const fullAnalysis = `${executionResultSection}=== AI Analysis ===\n${fallbackAnalysis}`;
    
    return { 
      analysis: fullAnalysis, 
      markedFilePath: markErrors(originalFileName, code, [], [], fallbackAnalysis),
      executionOutput: executionOutput.trim() || undefined
    };
  }
}

// 코드에서 에러와 경고 위치를 주석으로 표시하고 파일로 저장하는 함수
export function markErrors(
  originalFilePath: string,
  code: string,
  errors: CompilerError[],
  warnings: CompilerWarning[],
  aiAnalysis?: string
): string {
  const lines = code.split("\n");
  const markedLines: string[] = [];

  const lineIssues = new Map<
    number,
    { 
      errors: Map<string, CompilerError>;
      warnings: Map<string, CompilerWarning>;
    }
  >();

  errors.forEach((error) => {
    if (error.line) {
      const lineNum = error.line;
      if (!lineIssues.has(lineNum)) {
        lineIssues.set(lineNum, { errors: new Map(), warnings: new Map() });
      }
      const errorKey = `${error.type}-${error.message}`;
      lineIssues.get(lineNum)!.errors.set(errorKey, error);
    }
  });

  warnings.forEach((warning) => {
    if (warning.line) {
      const lineNum = warning.line;
      if (!lineIssues.has(lineNum)) {
        lineIssues.set(lineNum, { errors: new Map(), warnings: new Map() });
      }
      const warningKey = `${warning.type}-${warning.message}`;
      lineIssues.get(lineNum)!.warnings.set(warningKey, warning);
    }
  });

  if (aiAnalysis) {
    const resultMatch = aiAnalysis.match(/\[Result\]\s*([OX])/);
    if (resultMatch && resultMatch[1] === "X") {
      const reasonMatch = aiAnalysis.match(/\[Reason\]([\s\S]*?)(\[Suggestion\]|$)/);
      const suggestionMatch = aiAnalysis.match(/\[Suggestion\]([\s\S]*)/);
      
      markedLines.push(`//AI 분석: 치명적 문제 감지`);
      if (reasonMatch) {
        markedLines.push(`// 원인: ${reasonMatch[1].trim()}`);
      }
      if (suggestionMatch) {
        markedLines.push(`// 해결책: ${suggestionMatch[1].trim()}`);
      }
      markedLines.push("");
    }
  }

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const issues = lineIssues.get(lineNum);
    
    if (issues && (issues.errors.size > 0 || issues.warnings.size > 0)) {
      markedLines.push(line);
      
      if (issues.errors.size > 0) {
        const uniqueErrors = Array.from(issues.errors.values());
        const errorMessages = uniqueErrors.map(error => {
          const prefix = error.type === 'runtime' ? ' 런타임' : ' 컴파일';
          const code = error.code ? ` (${error.code})` : '';
          return `${prefix}${code}: ${error.message}`;
        });
        
        if (errorMessages.length === 1) {
          markedLines.push(`  // ${errorMessages[0]}`);
        } else {
          markedLines.push(`  //  ${errorMessages.length}개 에러: ${errorMessages[0]}${errorMessages.length > 1 ? ' 외' : ''}`);
        }
      }
      
      if (issues.warnings.size > 0) {
        const uniqueWarnings = Array.from(issues.warnings.values());
        const warningMessages = uniqueWarnings.map(warning => {
          const code = warning.code ? ` (${warning.code})` : '';
          return ` 경고${code}: ${warning.message}`;
        });
        
        if (warningMessages.length === 1) {
          markedLines.push(`  // ${warningMessages[0]}`);
        } else {
          markedLines.push(`  //  ${warningMessages.length}개 경고: ${warningMessages[0]}${warningMessages.length > 1 ? ' 외' : ''}`);
        }
      }
    } else {
      markedLines.push(line);
    }
  });

  const runtimeErrorCount = errors.filter(e => e.type === 'runtime').length;
  const compileErrorCount = errors.length - runtimeErrorCount;
  const totalIssues = errors.length + warnings.length;
  
  if (totalIssues > 0) {
    markedLines.push("");
    markedLines.push(`//  분석 요약: 총 ${totalIssues}개 문제`);
    if (runtimeErrorCount > 0) {
      markedLines.push(`//    런타임 오류: ${runtimeErrorCount}개`);
    }
    if (compileErrorCount > 0) {
      markedLines.push(`//    컴파일 에러: ${compileErrorCount}개`);
    }
    if (warnings.length > 0) {
      markedLines.push(`//   경고: ${warnings.length}개`);
    }
  }

  const parsedPath = path.parse(originalFilePath);
  const outputFileName = `${parsedPath.name}_with_errors${parsedPath.ext}`;
  const outputPath = path.join(parsedPath.dir || ".", outputFileName);

  const markedCode = markedLines.join("\n");
  fs.writeFileSync(outputPath, markedCode, "utf8");

  return outputPath;
}
