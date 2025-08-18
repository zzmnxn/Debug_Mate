import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { buildTraceVarPrompt } from "../prompts/prompt_traceVar";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 


// sohyeon hw
// [API] 오류에 대비한 재시도 로직 헬퍼 함수
async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  delay = 1000 // 1초
): Promise<T> {
  for (let i = 0; i < retries; i++) {
      try {
          return await apiCall();
      } catch (error: any) {
          // [API] 키 오류는 재시도하지 않고 바로 던집니다.
          if (error.response && error.response.status === 400 &&
              error.response.data?.error?.details?.some((d: any) => d.reason === "API_KEY_INVALID")) {
              throw new Error(`[API Key Error]: 유효한 [API] 키를 확인하세요.`);
          }
          // [Rate Limit](429), [Server Error](5xx), [Network Error] 등에 대해 재시도합니다.
          if (error.response && (error.response.status === 429 || error.response.status >= 500) ||
              error.message.includes("Network Error")) {
              if (i < retries - 1) {
                  console.warn(`[API] 호출 실패 ([Status]: ${error.response?.status}). ${delay / 1000}초 후 재시도...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  delay *= 2; // [Exponential Backoff] (점점 더 길게 대기)
              } else {
                  throw new Error(`[API Retry Failed]: ${error.message || "알 수 없는 [API] 오류"}. 최대 재시도 횟수 도달.`);
              }
          } else {
              // 다른 예상치 못한 오류는 즉시 던집니다.
              throw new Error(`[API Error]: ${error.message || "예상치 못한 오류 발생"}`);
          }
      }
  }
  // 이 부분은 도달하지 않아야 하지만, 안전을 위해 추가합니다.
  throw new Error("[Unexpected Error] 재시도 로직에서 예상치 못한 오류로 종료되었습니다.");
}

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

  // '[gemini-1.5-flash]' 모델을 사용하여 [Gemini AI Model] 인스턴스를 생성합니다.
  const model: GenerativeModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.3, // 더 일관된 응답을 위해 낮은 [Temperature] 설정
      maxOutputTokens: 2048, // 응답 길이 제한
    },
  });

  try {
    // [API] 호출을 재시도 로직으로 감싸서 호출합니다.
    const result = await callWithRetry(() => model.generateContent(prompt));

    const responseText = result.response.text();

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
    // callWithRetry 함수에서 던져진 오류를 받아서 처리합니다.
    throw new Error(`[traceVar Error]: ${error.message || "변수 추적 중 알 수 없는 오류 발생"}`);
  }
}
