import { getModel } from '../ai/GeminiService';
import { buildAfterDebugPrompt } from '../ai/PromptBuilder';
import { callWithRetry } from '../utils/Retry';
import { CompilerError, CompilerWarning } from '../parsers/CompilerResultParser';

export class AnalysisService {
  async analyzeAfterDebug(
    logSummary: string,
    errors: CompilerError[],
    warnings: CompilerWarning[],
    executionOutput?: string
  ): Promise<string> {
    try {
      // 1) 입력 검증
      if (!logSummary || typeof logSummary !== 'string' || logSummary.trim() === '') {
        throw new Error('Invalid logSummary: must be a non-empty string');
      }
      if (!Array.isArray(errors) || !Array.isArray(warnings)) {
        throw new Error('Invalid errors/warnings: must be arrays');
      }

      // 2) API 키 검증
      if (!ApiConfig.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured. Please set it in your environment variables.');
      }

      // 3) 프롬프트 생성
      const prompt = buildAfterDebugPrompt(logSummary, errors, warnings, executionOutput);

      // 4) 모델 준비
      const model = getModel();

      // 5) 타임아웃 + 재시도 결합 호출 (10초 타임아웃)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API request timed out after 10 seconds')), 10_000)
      );
      const apiPromise = callWithRetry(() => model.generateContent(prompt), 3, 1000);
      const result: any = await Promise.race([apiPromise, timeoutPromise]);

      // 6) 응답 검증
      const text = result?.response?.text?.().trim?.();
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      // 7) 포맷 확인([Result]/[Reason]/[Suggestion])
      if (!isExpectedFormat(text)) {
        const preview = safePreview(text, 200);
        return `[Result] X\n[Reason] AI 응답 형식 오류 - 원본 응답: ${preview}...\n[Suggestion] 시스템 관리자에게 문의하세요.`;
      }

      return text;
    } catch (error: any) {
      // 8) 에러 매핑(원본 handlers.ts 정책과 동일한 톤)
      let errorMessage = 'Unknown error occurred';
      const msg = String(error?.message || error);

      if (/API_KEY/i.test(msg)) {
        errorMessage = 'Gemini API 키가 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 확인해주세요.';
      } else if (/timed out|timeout/i.test(msg)) {
        errorMessage = 'API 요청이 시간 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
      } else if (/network|fetch/i.test(msg)) {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (/quota|rate limit/i.test(msg)) {
        errorMessage = 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else {
        errorMessage = `분석 중 오류가 발생했습니다: ${msg}`;
      }

      return `[Result] X\n[Reason] ${errorMessage}\n[Suggestion] 시스템 오류로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.`;
    }
  }
}

/* ===================== 헬퍼 ===================== */
function isExpectedFormat(text: string): boolean {
  const hasResult = /\[Result\]\s*[OX]/.test(text);
  const hasReason = /\[Reason\]/.test(text);
  const hasSuggestion = /\[Suggestion\]/.test(text);
  return hasResult && hasReason && hasSuggestion;
}

function safePreview(text: string, max = 200): string {
  if (!text) return '';
  return text.length <= max ? text : text.slice(0, max);
}
