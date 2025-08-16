import { CompilerError, CompilerWarning } from "../parsing/compilerResultParser";
import { loopCheck, traceVar, afterDebugFromCode, markErrors, beforeDebug } from "./handlers";
import typia from "typia";

export class ErrorDiagnosisService {
  
  async loopCheck({ code }: { code: string }) {
    return loopCheck({ code });
  }
  async traceVar({ code, userQuery }: { code: string; userQuery: string }) {
    return traceVar({ code, userQuery });
  }
   async afterDebugFromCode({ code, originalFileName }: { code: string, originalFileName?: string }) {
    return afterDebugFromCode(code, originalFileName);
  }
  async markErrors({ originalFilePath, code, errors, warnings }: { originalFilePath: string, code: string, errors: CompilerError[], warnings: CompilerWarning[] }) {
    return markErrors(originalFilePath, code, errors, warnings);
  }
  async beforeDebug({ code }: { code: string }) {
    return beforeDebug({ code });
  }

}

// afterDebugFromCode를 직접 호출하는 함수
async function runAfterDebug(
  code: string,
  userQuery: string,
  fileName: string
): Promise<string> {
  const { analysis, markedFilePath } = await afterDebugFromCode(
    code,
    fileName
  );
  return (
    analysis +
    (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "")
  );
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

  // 각 라인별로 에러/경고 정보 수집 (중복 제거)
  const lineIssues = new Map<
    number,
    { 
      errors: Map<string, CompilerError>; // 메시지별로 중복 제거
      warnings: Map<string, CompilerWarning>; // 메시지별로 중복 제거
    }
  >();

  // 에러 정보 수집 (중복 제거)
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

  // 경고 정보 수집 (중복 제거)
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

  // AI 분석 결과가 치명적(X)이면 파일 상단에 간결한 주석 추가
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

  // 각 라인 처리
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const issues = lineIssues.get(lineNum);
    
    if (issues && (issues.errors.size > 0 || issues.warnings.size > 0)) {
      // 문제가 있는 라인: 코드 + 간결한 주석
      markedLines.push(line);
      
      // 에러 주석 (간결하게)
      if (issues.errors.size > 0) {
        const uniqueErrors = Array.from(issues.errors.values());
        const errorMessages = uniqueErrors.map(error => {
          const prefix = error.type === 'runtime' ? ' 런타임' : ' 컴파일';
          const code = error.code ? ` (${error.code})` : '';
          return `${prefix}${code}: ${error.message}`;
        });
        
        // 여러 에러가 있으면 한 줄로 요약
        if (errorMessages.length === 1) {
          markedLines.push(`  // ${errorMessages[0]}`);
        } else {
          markedLines.push(`  //  ${errorMessages.length}개 에러: ${errorMessages[0]}${errorMessages.length > 1 ? ' 외' : ''}`);
        }
      }
      
      // 경고 주석 (간결하게)
      if (issues.warnings.size > 0) {
        const uniqueWarnings = Array.from(issues.warnings.values());
        const warningMessages = uniqueWarnings.map(warning => {
          const code = warning.code ? ` (${warning.code})` : '';
          return ` 경고${code}: ${warning.message}`;
        });
        
        // 여러 경고가 있으면 한 줄로 요약
        if (warningMessages.length === 1) {
          markedLines.push(`  // ${warningMessages[0]}`);
        } else {
          markedLines.push(`  //  ${warningMessages.length}개 경고: ${warningMessages[0]}${warningMessages.length > 1 ? ' 외' : ''}`);
        }
      }
    } else {
      // 일반 라인 (문제 없음)
      markedLines.push(line);
    }
  });

  // 간결한 요약 정보 추가
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
 * 2. afterDebugFromCode: 코드 입력 → 컴파일 → 로그 파싱 → Gemini 분석까지 자동 수행
 * 개선: 실행 결과도 함께 표시
 */
export async function afterDebugFromCode(code: string, originalFileName: string = "input.c"): Promise<{ analysis: string, markedFilePath: string, executionOutput?: string }> {
  // 임시 파일 경로 설정 (Windows 호환성)
  const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
  const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
  const outputFile = path.join(tmpDir, `a.out_${Date.now()}`);
  
  let compileLog = "";
  let markedFilePath = "";
  let executionOutput = ""; // 실행 결과 저장용
  let compileSuccess = false; // 컴파일 성공 여부 추적

  try {
    // 1. 입력 검증
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code: must be a non-empty string');
    }

    if (!originalFileName || typeof originalFileName !== 'string') {
      originalFileName = "input.c";
    }

    // 2. 임시 디렉토리 생성 (Windows용)
    if (process.platform === "win32" && !fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // 3. 임시 파일 생성
    fs.writeFileSync(tmpFile, code, 'utf-8');

    // 4. GCC 컴파일 (에러 처리 개선)
    const compileResult = spawnSync("gcc", [
      "-Wall", "-Wextra", "-Wpedantic", "-O2", "-Wdiv-by-zero", 
      "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address", 
      tmpFile, "-o", outputFile
    ], {
      encoding: "utf-8",
      timeout: 10000 // 10초 타임아웃
    });

    // 5. 컴파일 로그 수집
    if (compileResult.stdout) {
      compileLog += compileResult.stdout;
    }
    if (compileResult.stderr) {
      compileLog += compileResult.stderr;
    }

         // 6. 컴파일 성공 시 실행
     if (compileResult.status === 0) {
       compileSuccess = true; // 컴파일 성공 표시
       compileLog += "\n\n=== Runtime Output ===\n";
      
      try {
        const runResult = spawnSync(outputFile, [], { 
          encoding: "utf-8", 
          timeout: 3000 // 3초
        });

        if (runResult.stdout) {
          compileLog += runResult.stdout;
          executionOutput += runResult.stdout; // 실행 결과 저장
        }
        if (runResult.stderr) {
          compileLog += runResult.stderr;
          executionOutput += runResult.stderr; // 에러도 실행 결과에 포함
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
      // 7. 컴파일 실패 처리
      compileLog += "\n\n=== Compile Failed ===\n";
      if (compileResult.error) {
        compileLog += `[Compile Process Error] ${compileResult.error.message}\n`;
      }
      if (compileResult.signal) {
        compileLog += `[Compile Signal] ${compileResult.signal}\n`;
      }
    }

  } catch (err: any) {
    // 8. 예상치 못한 에러 처리
    compileLog += "\n\n=== Unexpected Error ===\n";
    compileLog += `[Error] ${err.message || err.toString()}\n`;
    
    if (err.code === 'ENOENT') {
      compileLog += "[Suggestion] GCC가 설치되어 있는지 확인해주세요.\n";
    } else if (err.code === 'EACCES') {
      compileLog += "[Suggestion] 파일 권한을 확인해주세요.\n";
    }
  } finally {
    // 9. 임시 파일 정리
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

  // 10. 로그 파싱 및 분석
  try {
    const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
    const summary = CompilerResultParser.generateSummary(parsed);
    
    // 11. AI 분석 수행 (실행 결과 포함)
    const analysis = await afterDebug(summary, parsed.errors, parsed.warnings, executionOutput);
    
    // 12. AI 분석 결과 처리
    let aiAnalysisForMark = undefined;
    const resultMatch = analysis.match(/\[Result\]\s*([OX])/);
    if (resultMatch && resultMatch[1] === "X") {
      aiAnalysisForMark = analysis;
    }
    
    // 13. 에러 마킹 파일 생성
    markedFilePath = markErrors(originalFileName, code, parsed.errors, parsed.warnings, aiAnalysisForMark);
    
         // 14. 프로그램 실행 결과와 AI 분석 결과를 함께 반환
     // 에러 메시지가 포함된 경우 실행 결과 섹션을 숨김
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
     
     // 에러 메시지가 포함된 경우 실행 결과 섹션을 숨김
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

