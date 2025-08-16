import { getModel } from '../ai/GeminiService';
import { callWithRetry } from '../utils/Retry';
import { buildTraceVarPrompt } from '../ai/PromptBuilder';

export class VariableTraceService {
  /**
   * 변수 추적 서비스
   * - 프롬프트 생성 → 모델 호출(재시도) → 응답 후처리
   * - 빈 응답/비관련 질의/에러를 사용자 친화적 메시지로 반환
   */
  async traceVar({
    code,
    userQuery,
  }: {
    code: string;
    userQuery: string;
  }): Promise<{ variableTrace: string }> {
    const prompt = buildTraceVarPrompt(code, userQuery);
    const model = getModel();

    try {
      // callWithRetry: 네트워크/429/5xx 등 재시도
      const result = await callWithRetry(() => model.generateContent(prompt));
      const text: string | undefined = result?.response?.text?.();

      // 1) 빈 응답 처리
      if (!text || !text.trim()) {
        return {
          variableTrace:
            'AI로부터 유효한 변수 추적 결과를 받지 못했습니다. 코드가 복잡하거나 질문이 모호할 수 있습니다.',
        };
      }

      const trimmed = text.trim();

      // 2) 변수 추적 비관련 질의 처리
      if (trimmed.includes('The question is not related to variable tracing.')) {
        return { variableTrace: trimmed };
      }

      // 3) 정상
      return { variableTrace: trimmed };
    } catch (error: any) {
      // 4) 에러 매핑 (원본 톤 유지, 한국어 메시지)
      const msg = String(error?.message || error);

      let friendly =
        '변수 추적 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

      if (/API[_ ]?KEY|invalid/i.test(msg)) {
        friendly =
          'Gemini API 키가 유효하지 않거나 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 확인해주세요.';
      } else if (/timed out|timeout/i.test(msg)) {
        friendly =
          'AI 요청이 시간 초과되었습니다. 네트워크 상태를 확인하거나, 쿼리 길이를 줄여 다시 시도해주세요.';
      } else if (/network|fetch/i.test(msg)) {
        friendly =
          '네트워크 오류가 발생했습니다. 인터넷 연결을 확인한 뒤 다시 시도해주세요.';
      } else if (/quota|rate limit|429/i.test(msg)) {
        friendly =
          'API 할당량이 초과되었습니다. 잠시 후 다시 시도하거나 호출 빈도를 낮춰주세요.';
      }

      // 서비스 레이어에서는 throw 대신 사용자에게 보여줄 문자열을 반환
      return { variableTrace: `[traceVar Error] ${friendly}` };
    }
  }
}
