import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { SGlobal } from "../config/SGlobal";

export interface AIConfig {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  model: "gemini-1.5-flash",
  temperature: 0.3,
  maxOutputTokens: 1000,
  timeoutMs: 30000
};

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: AIConfig;

  constructor(apiKey?: string, config?: Partial<AIConfig>) {
    const finalApiKey = apiKey || SGlobal.env.GEMINI_API_KEY || "";
    if (!finalApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    this.genAI = new GoogleGenerativeAI(finalApiKey);
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });
  }

  /**
   * 표준화된 AI API 호출 (타임아웃 포함)
   */
  async generateContent(prompt: string, customTimeoutMs?: number): Promise<string> {
    const timeoutMs = customTimeoutMs || this.config.timeoutMs;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("AI 응답 타임아웃")), timeoutMs);
    });

    try {
      const result = await Promise.race([
        this.model.generateContent(prompt),
        timeoutPromise
      ]) as any;

      // 응답 검증 (패턴 C)
      if (!result || !result.response || !result.response.text) {
        throw new Error('Invalid response from Gemini API');
      }

      const responseText = result.response.text().trim();
      
      if (!responseText) {
        throw new Error('Empty response from Gemini API');
      }

      return responseText;

    } catch (error: any) {
      // 에러 처리 (패턴 B)
      let errorMessage = 'Unknown error occurred';
      
      if (error.message.includes('API_KEY') || error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'Gemini API 키가 설정되지 않았거나 유효하지 않습니다. 환경 변수 GEMINI_API_KEY를 확인해주세요.';
      } else if (error.message.includes('timed out') || error.message.includes('타임아웃')) {
        errorMessage = 'API 요청이 시간 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
        errorMessage = 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('503') || error.message.includes('overload')) {
        errorMessage = '서버 과부하가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else {
        errorMessage = `분석 중 오류가 발생했습니다: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 재시도 로직이 포함된 AI API 호출
   */
  async generateContentWithRetry(
    prompt: string, 
    retries: number = 3, 
    delay: number = 1000,
    customTimeoutMs?: number
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.generateContent(prompt, customTimeoutMs);
      } catch (error: any) {
        lastError = error;
        
        // 재시도 가능한 에러인지 확인
        const isRetryable = /429|quota|rate limit|503|overload|network|timeout/i.test(error.message);
        
        if (attempt < retries && isRetryable) {
          console.warn(`AI 호출 실패 (시도 ${attempt}/${retries}). ${delay / 1000}초 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // 지수 백오프
          continue;
        }
        
        // 재시도 불가능한 에러이거나 최대 재시도 횟수 도달
        break;
      }
    }

    throw lastError || new Error("AI 호출 실패");
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// 기본 인스턴스 (기존 코드와의 호환성을 위해)
export const defaultAIService = new AIService();
