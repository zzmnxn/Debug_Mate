import { getModel } from '../ai/GeminiService';
import { flexibleMatch, normalizeText } from '../utils/TextUtils';
import { buildIntentAIParsingPrompt, buildComparisonExtractionPrompt } from '../ai/PromptBuilder';
import { ParsedIntent, MultipleIntents } from '../types/IntentTypes';

export class IntentParser {
  static async parseUserIntent(query: string): Promise<MultipleIntents> {
    const normalized = normalizeText(query);
    // ... 비교키워드/연결어 감지 → buildComparisonExtractionPrompt 사용해 2 타겟 추출 시도
    // ... 실패 시 정규식 fallback
    // ... 단일이면 robustParseSingleIntent
    // (DEBUGAgent.ts의 로직 그대로 이동)
    // return { intents: [...], isMultiple: true/false };
    return { intents: [await this.robustParseSingleIntent(query)], isMultiple: false };
  }

  private static async robustParseSingleIntent(query: string): Promise<ParsedIntent> {
    // parseSingleIntent 호출 → 필요시 enhancedAIParsing 호출 → 추가 키워드보정
    // (기존 로직 그대로)
    return this.parseSingleIntent(query);
  }

  private static async parseSingleIntent(query: string): Promise<ParsedIntent> {
    // orderPatterns / loopTypePatterns / compileKeywords / inspectionKeywords …
    // (기존 로직 그대로)
    return { tool: 'afterDebugFromCode', target: 'all', details: {} };
  }

  private static async enhancedAIParsing(query: string, context = ''): Promise<ParsedIntent | null> {
    const model = getModel();
    const prompt = buildIntentAIParsingPrompt(query, context);
    try {
      const res: any = await model.generateContent(prompt);
      const text = res?.response?.text?.().trim?.();
      const json = text?.match(/\{[\s\S]*?\}/)?.[0];
      if (!json) return null;
      const parsed = JSON.parse(json);
      if (parsed.tool && ['loopCheck','traceVar','afterDebugFromCode'].includes(parsed.tool)) {
        return { tool: parsed.tool, target: parsed.target || 'all', details: parsed.details || {} };
      }
    } catch {}
    return null;
  }
}
