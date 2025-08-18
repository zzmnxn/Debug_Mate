import { SGlobal } from "../config/SGlobal";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
import fs from "fs";
import path from "path";
import { buildAfterDebugPrompt } from "../prompts/prompt_afterDebug";
import { compileAndRunC } from "../services/compile";
import { AIService } from "../utils/ai";

// AI 서비스 인스턴스 생성 (기본 토큰 수 사용)
const aiService = new AIService();

/**
 * 1. afterDebug: 에러/경고 로그 + 요약을 받아 Gemini 분석 수행
 */
export async function afterDebug(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[], executionOutput?: string): Promise<string> {
  try {
    // 1. 입력 검증
    if (!logSummary || typeof logSummary !== 'string' || logSummary.trim() === '') {
      throw new Error('Invalid logSummary: must be a non-empty string');
    }
    
    if (!Array.isArray(errors) || !Array.isArray(warnings)) {
      throw new Error('Invalid errors/warnings: must be arrays');
    }

    // 2. API 키 검증
    if (!SGlobal.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in your environment variables.');
    }

    // 3. 프롬프트 생성 (실행 결과 포함)
    const prompt = buildAfterDebugPrompt(logSummary, errors, warnings, executionOutput);
    
    // 4. AI 서비스를 사용한 API 호출
    const responseText = await aiService.generateContent(prompt, 10000);

    // 8. 응답 형식이 올바른지 확인
    const hasResult = /\[Result\]\s*[OX]/.test(responseText);
    const hasReason = /\[Reason\]/.test(responseText);
    const hasSuggestion = /\[Suggestion\]/.test(responseText);

    if (!hasResult || !hasReason || !hasSuggestion) {
      console.warn(' AI 응답이 예상 형식과 다릅니다. 원본 응답을 반환합니다.');
      return `[Result] X\n[Reason] AI 응답 형식 오류 - 원본 응답: ${responseText.substring(0, 200)}...\n[Suggestion] 시스템 관리자에게 문의하세요.`;
    }

    return responseText;

  } catch (error: any) {
    // 9. AI 서비스에서 처리된 에러 메시지 사용
    console.error(' afterDebug 에러:', error);
    
    return `[Result] X\n[Reason] ${error.message}\n[Suggestion] 시스템 오류로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.`;
  }
}

/**
 * 2. afterDebugFromCode: 코드 입력 → 컴파일 → 로그 파싱 → Gemini 분석까지 자동 수행
 * 개선: 실행 결과도 함께 표시
 */
export async function afterDebugFromCode(code: string, originalFileName: string = "input.c"): Promise<{ analysis: string, markedFilePath: string, executionOutput?: string }> {
  let markedFilePath = "";
  let executionOutput = ""; // 실행 결과 저장용
  let compileSuccess = false; // 컴파일 성공 여부 추적
  let compileLog = ""; // 컴파일 로그

  try {
    // 1. 입력 검증
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code: must be a non-empty string');
    }

    if (!originalFileName || typeof originalFileName !== 'string') {
      originalFileName = "input.c";
    }

    // 2. 컴파일 및 실행 (서비스 사용)
    const result = compileAndRunC(code, { 
      timeoutMs: 3000,
      extraGccFlags: ["-Wpedantic", "-Wdiv-by-zero"]
    });
    
    compileLog = result.log;
    compileSuccess = result.compiled;
    
    // 3. 실행 결과 추출 (Runtime Output 섹션에서)
    const runtimeMatch = compileLog.match(/=== Runtime Output ===\n([\s\S]*?)(?=\n\n|$)/);
    if (runtimeMatch) {
      executionOutput = runtimeMatch[1].trim();
    }

  } catch (err: any) {
    // 예상치 못한 에러 처리
    console.error(' 컴파일/실행 중 오류:', err);
    compileLog = `\n\n=== Unexpected Error ===\n[Error] ${err.message || err.toString()}\n`;
    
    if (err.code === 'ENOENT') {
      compileLog += "[Suggestion] GCC가 설치되어 있는지 확인해주세요.\n";
    } else if (err.code === 'EACCES') {
      compileLog += "[Suggestion] 파일 권한을 확인해주세요.\n";
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