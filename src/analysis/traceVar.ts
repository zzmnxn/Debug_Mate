import { SGlobal } from "../config/SGlobal";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { buildTraceVarPrompt } from "../prompts/prompt_traceVar";
import { AIService } from "../utils/ai";

// AI 서비스 인스턴스 생성 (2048 토큰으로 설정)
const aiService = new AIService(undefined, { maxOutputTokens: 2048 }); 


// sohyeon hw


// sohyeon's hw
// traceVar 함수를 비동기(async) 함수로 정의합니다.
// 이 함수는 'code'와 'userQuery'라는 두 개의 인자를 받습니다.
export async function traceVar({
  code, // 사용자가 제공한 코드 문자열
  userQuery, // 변수 추적에 대한 사용자의 질문
}: {
  code: string;
  userQuery: string;
}) {
    // [Gemini Model]에 전달할 프롬프트([Prompt])를 정의합니다.
  const prompt = buildTraceVarPrompt(code, userQuery);

  try {
    // AI 서비스를 사용한 API 호출 (재시도 로직 포함)
    const responseText = await aiService.generateContentWithRetry(prompt);

    // 1. 응답이 비어있는 경우를 처리합니다.
    if (!responseText || responseText.trim().length === 0) {
      return { variableTrace: "AI로부터 유효한 변수 추적 결과를 받지 못했습니다. 코드가 복잡하거나 질문이 모호할 수 있습니다." };
    }

    // 2. [AI]가 "[Not Related]" 응답을 보낸 경우를 처리합니다.
    if (responseText.includes("The question is not related to variable tracing.")) {
      return { variableTrace: responseText };
    }

    // 모든 처리가 정상일 경우 최종 결과를 반환합니다.
    return { variableTrace: responseText };

  } catch (error: any) {
    // AI 서비스에서 처리된 오류를 받아서 처리합니다.
    throw new Error(`[traceVar Error]: ${error.message || "변수 추적 중 알 수 없는 오류 발생"}`);
  }
}
