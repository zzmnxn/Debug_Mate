import fs from 'fs';
import path from 'path';
import { CompilerError, CompilerWarning } from '../parsers/CompilerResultParser';

export function markErrors(
  originalFilePath: string,
  code: string,
  errors: CompilerError[],
  warnings: CompilerWarning[],
  aiAnalysis?: string
): string {
  const lines = code.split("\n");
  const markedLines: string[] = [];

  // 각 라인별 에러/경고 모음
  const lineIssues = new Map<number, {
    errors: Map<string, CompilerError>,
    warnings: Map<string, CompilerWarning>
  }>();

  // 에러 수집 (중복 제거)
  errors.forEach((error) => {
    if (error.line) {
      if (!lineIssues.has(error.line)) {
        lineIssues.set(error.line, { errors: new Map(), warnings: new Map() });
      }
      const key = `${error.type}-${error.message}`;
      lineIssues.get(error.line)!.errors.set(key, error);
    }
  });

  // 경고 수집 (중복 제거)
  warnings.forEach((warning) => {
    if (warning.line) {
      if (!lineIssues.has(warning.line)) {
        lineIssues.set(warning.line, { errors: new Map(), warnings: new Map() });
      }
      const key = `${warning.type}-${warning.message}`;
      lineIssues.get(warning.line)!.warnings.set(key, warning);
    }
  });

  // AI 분석이 "치명적 문제"라면 코드 상단에 주석 추가
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
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const issues = lineIssues.get(lineNum);

    if (issues && (issues.errors.size > 0 || issues.warnings.size > 0)) {
      markedLines.push(line);

      if (issues.errors.size > 0) {
        const uniqueErrors = Array.from(issues.errors.values());
        const msg = uniqueErrors.length === 1
          ? `  // 컴파일: ${uniqueErrors[0].message}`
          : `  // ${uniqueErrors.length}개 에러: ${uniqueErrors[0].message} 외`;
        markedLines.push(msg);
      }

      if (issues.warnings.size > 0) {
        const uniqueWarnings = Array.from(issues.warnings.values());
        const msg = uniqueWarnings.length === 1
          ? `  // 경고: ${uniqueWarnings[0].message}`
          : `  // ${uniqueWarnings.length}개 경고: ${uniqueWarnings[0].message} 외`;
        markedLines.push(msg);
      }
    } else {
      markedLines.push(line);
    }
  });

  // 마지막에 요약 추가
  const runtimeErrorCount = errors.filter(e => e.type === 'runtime').length;
  const compileErrorCount = errors.length - runtimeErrorCount;
  const total = errors.length + warnings.length;
  if (total > 0) {
    markedLines.push("");
    markedLines.push(`// 분석 요약: 총 ${total}개 문제`);
    if (runtimeErrorCount > 0) markedLines.push(`//   런타임 오류: ${runtimeErrorCount}개`);
    if (compileErrorCount > 0) markedLines.push(`//   컴파일 에러: ${compileErrorCount}개`);
    if (warnings.length > 0) markedLines.push(`//   경고: ${warnings.length}개`);
  }

  // 결과 파일 저장
  const parsedPath = path.parse(originalFilePath);
  const outputFileName = `${parsedPath.name}_with_errors${parsedPath.ext}`;
  const outputPath = path.join(parsedPath.dir || ".", outputFileName);
  fs.writeFileSync(outputPath, markedLines.join("\n"), "utf8");

  return outputPath;
}
