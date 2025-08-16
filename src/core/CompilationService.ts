import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { CompilerConfig } from '../config/CompilerConfig';
import { CompilerResultParser } from '../parsers/CompilerResultParser';
import { AnalysisService } from './AnalysisService';
import { markErrors } from '../utils/CodeMarker';
import { buildBeforeDebugPrompt } from '../ai/PromptBuilder';
import { getModel } from '../ai/GeminiService';

export class CompilationService {
  /**
   * handlers.ts 의 afterDebugFromCode 를 서비스화
   * 1) tmp 파일 생성 → 2) gcc 컴파일 → 3) 성공 시 실행 → 4) 로그 수집
   * 5) 파싱/요약 → 6) AnalysisService.analyzeAfterDebug 호출
   * 7) markErrors → 8) 결과 조립
   */
  async compileAndAnalyzeFromCode(code: string, originalFileName = 'input.c') {
    const tmpDir = process.platform === 'win32' ? path.join(process.cwd(), 'tmp') : '/tmp';
    const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
    const outputFile = path.join(tmpDir, `a.out_${Date.now()}`);

    let compileLog = '';
    let markedFilePath = '';
    let executionOutput = '';
    let compileSuccess = false;

    try {
      // 입력 검증
      if (!code || typeof code !== 'string') {
        throw new Error('Invalid code: must be a non-empty string');
      }
      if (!originalFileName || typeof originalFileName !== 'string') {
        originalFileName = 'input.c';
      }

      // 임시 디렉토리 준비
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // 코드 저장
      fs.writeFileSync(tmpFile, code, 'utf-8');

      // 컴파일
      const compileResult = spawnSync(
        CompilerConfig.gcc,
        [...CompilerConfig.flags, tmpFile, '-o', outputFile],
        { encoding: 'utf-8', timeout: CompilerConfig.compileTimeoutMs }
      );

      if (compileResult.stdout) compileLog += compileResult.stdout;
      if (compileResult.stderr) compileLog += compileResult.stderr;

      // 실행
      if (compileResult.status === 0) {
        compileSuccess = true;
        compileLog += '\n\n=== Runtime Output ===\n';
        try {
          const runResult = spawnSync(outputFile, [], {
            encoding: 'utf-8',
            timeout: CompilerConfig.runTimeoutMs,
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
            const anyErr: any = runResult.error;
            if (anyErr?.code === 'ETIMEDOUT') {
              compileLog += `\n[Runtime Error] Execution timed out (possible infinite loop)\n[Hint] loopCheck() 함수를 사용하여 루프 조건을 검토해보세요.`;
            } else {
              compileLog += `\n[Runtime Error] ${runResult.error.message}`;
            }
          }
        } catch (runErr: any) {
          compileLog += `\n[Runtime Execution Error] ${runErr.message}`;
        }
      } else {
        compileLog += '\n\n=== Compile Failed ===\n';
        if (compileResult.error) {
          compileLog += `[Compile Process Error] ${compileResult.error.message}\n`;
        }
        if (compileResult.signal) {
          compileLog += `[Compile Signal] ${compileResult.signal}\n`;
        }
      }
    } catch (err: any) {
      compileLog += '\n\n=== Unexpected Error ===\n';
      compileLog += `[Error] ${err.message || String(err)}\n`;
      if (err.code === 'ENOENT') {
        compileLog += '[Suggestion] GCC가 설치되어 있는지 확인해주세요.\n';
      } else if (err.code === 'EACCES') {
        compileLog += '[Suggestion] 파일 권한을 확인해주세요.\n';
      }
    } finally {
      // 임시 파일 정리
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
      } catch (cleanupError) {
        // cleanup 오류는 치명적이지 않음
      }
    }

    // 로그 파싱/요약 → AI 분석 → 마킹/결과 조립
    try {
      const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
      const summary = CompilerResultParser.generateSummary(parsed);

      const analysisSvc = new AnalysisService();
      const analysisText = await analysisSvc.analyzeAfterDebug(
        summary,
        parsed.errors,
        parsed.warnings,
        executionOutput
      );

      // X 일 때만 파일 상단에 Reason/Suggestion 주석 추가
      let aiAnalysisForMark: string | undefined = undefined;
      const resultMatch = analysisText.match(/\[Result\]\s*([OX])/);
      if (resultMatch && resultMatch[1] === 'X') {
        aiAnalysisForMark = analysisText;
      }

      // 실행결과 섹션 표시 기준(에러 문자열 포함 시 숨김)
      const hasErrorOutput =
        /error|AddressSanitizer|SEGV|ABORTING|runtime error/i.test(executionOutput);

      const executionResultSection =
        compileSuccess && executionOutput.trim() && !hasErrorOutput
          ? `[Compile Result]\n${executionOutput.trim()}\n`
          : '';

      // 에러/경고 마킹 파일 생성
      markedFilePath = markErrors(originalFileName, code, parsed.errors, parsed.warnings, aiAnalysisForMark);

      const fullAnalysis = `${executionResultSection}=== AI Analysis ===\n${analysisText}`;
      return {
        analysis: fullAnalysis,
        markedFilePath,
        executionOutput: executionOutput.trim() || undefined,
      };
    } catch (analysisError: any) {
      // AI 분석 실패 시 폴백
      const fallbackAnalysis = `[Result] X\n[Reason] 분석 과정에서 오류가 발생했습니다: ${analysisError.message}\n[Suggestion] 코드를 다시 확인하고 시도해주세요.`;

      const hasErrorOutput =
        /error|AddressSanitizer|SEGV|ABORTING|runtime error/i.test(executionOutput);

      const executionResultSection =
        compileSuccess && executionOutput.trim() && !hasErrorOutput
          ? `[Compile Result]\n${executionOutput.trim()}\n`
          : '';

      const fullAnalysis = `${executionResultSection}=== AI Analysis ===\n${fallbackAnalysis}`;
      return {
        analysis: fullAnalysis,
        markedFilePath: markErrors(originalFileName, code, [], [], fallbackAnalysis),
        executionOutput: executionOutput.trim() || undefined,
      };
    }
  }

  /**
   * handlers.ts 의 beforeDebug 를 서비스화
   * - 코드/로그 생성 → 프롬프트 생성 → 모델 호출(간단 재시도/백오프 + 30초 타임아웃)
   * - 쿼터 초과 시 로그 기반 최소 응답으로 폴백
   */
  async beforeDebug(code: string) {
    const tmpDir = process.platform === 'win32' ? path.join(process.cwd(), 'tmp') : '/tmp';
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
    const outputFile = path.join(tmpDir, `a.out`);

    // 토큰 절약용 트리머 (로컬 헬퍼)
    const trim = (s: string, max = 18_000) =>
      s.length > max ? s.slice(0, max) + '\n...[truncated]...' : s;

    try {
      // 코드 저장
      fs.writeFileSync(tmpFile, code);

      // 컴파일 (간단 옵션)
      const compileResult = spawnSync(
        CompilerConfig.gcc,
        ['-Wall', '-Wextra', '-O2', '-fanalyzer', '-fsanitize=undefined', '-fsanitize=address', tmpFile, '-o', outputFile],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
      );

      // 로그 수집
      let log = (compileResult.stdout || '') + (compileResult.stderr || '');
      if (compileResult.status === 0) {
        const runResult = spawnSync(outputFile, [], { encoding: 'utf-8', timeout: 1000 });
        log += '\n\n=== Runtime Output ===\n';
        log += runResult.stdout || '';
        log += runResult.stderr || '';
      }

      // 프롬프트
      const slimCode = trim(code, 9000);
      const slimLog = trim(log, 8000);
      const prompt = buildBeforeDebugPrompt(slimCode, slimLog);

      // 모델 호출 (간단 재시도 + 30초 타임아웃)
      const model = getModel();
      let lastErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const timeout = new Promise((_, rej) =>
            setTimeout(() => rej(new Error('API timeout')), 30_000)
          );
          const apiCall = model.generateContent(prompt);
          const result: any = await Promise.race([apiCall, timeout]);
          const text = result?.response?.text?.().trim?.();
          if (text) return text;
          throw new Error('Invalid API response');
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          const transient = /429|quota|rate limit|503|overload/i.test(msg);
          if (attempt < 3 && transient) {
            await new Promise((r) => setTimeout(r, attempt * 1000 + 500)); // 0.5s, 1.5s
            continue;
          }
          break;
        }
      }

      // 쿼터/레이트리밋 폴백: 로그 기반 최소 응답
      const isQuota = /429|quota|rate limit/i.test(String(lastErr));
      if (isQuota) {
        const hasErrors = /error:|fatal error:|AddressSanitizer|LeakSanitizer|runtime error|segmentation fault/i.test(
          log
        );
        const resultFlag = hasErrors ? '문제 있음' : '문제 없음';
        const reason = hasErrors
          ? 'API 쿼터 초과로 AI 분석은 생략했지만, GCC/런타임 로그에 잠재적 오류 신호가 있습니다.'
          : 'API 쿼터 초과로 AI 분석은 생략했습니다. 현재 로그만으로는 치명적 이슈가 확인되지 않습니다.';
        const hint =
          '프롬프트 축소 또는 모델 전환, 호출 빈도 조절을 고려하세요. 필요 시 loopCheck()로 루프 조건만 빠르게 점검할 수 있습니다.';
        return `[Result] ${resultFlag}\n[Reason] ${reason}\n[Suggestion] ${hint}`;
      }

      // 그 외 에러
      throw lastErr || new Error('Unknown error');
    } catch (e: any) {
      return `[Result] 분석 실패\n[Reason] ${e.message || String(e)}\n[Suggestion] 로그 확인 필요`;
    } finally {
      // 정리
      [tmpFile, outputFile].forEach((f) => {
        try {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        } catch {}
      });
    }
  }

  /**
   * 선택적: 미완성 코드에 대한 가벼운 피드백 (원본 주석 함수를 서비스화)
   * - gcc -fsyntax-only 로 빠르게 문법만 확인 후 간단 안내
   */
  async inProgressDebug(code: string) {
    let compileLog = '';
    try {
      const compileResult = spawnSync(
        CompilerConfig.gcc,
        ['-Wall', '-Wextra', '-Wpedantic', '-fsyntax-only', '-xc', '-'], // stdin 입력
        { input: code, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      compileLog += compileResult.stderr || '';
    } catch (err: any) {
      compileLog += `GCC Error: ${err.message}`;
    }

    const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
    const summary = CompilerResultParser.generateSummary(parsed);

    const prompt = `
You are an experienced C debugging assistant.
The user is writing C code that is not yet complete.

Below is the code being written and a summary of compilation logs so far. Even if there are many errors, please only point out "obvious mistakes" (e.g., missing semicolons, typos, undeclared variables, etc.).

[Summary]
${summary}

[Code]
\`\`\`c
${code}
\`\`\`

[Instructions]
- Please ignore missing functions since this is not complete code.
- Only check for obvious syntax errors.
- Avoid overly aggressive feedback.
- Please respond in the following format in Korean:

[Result] 문제 있음/없음
[Issues] Summary of found issues (없음 if none)
[Suggestions] Simple fix suggestions
`.trim();

    const model = getModel();
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}
