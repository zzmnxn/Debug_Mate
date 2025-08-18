import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

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
  const prompt = `
  // Analyze the following C code and the user's question to trace the flow of variables.
  Analyze the following C code and the user's question to trace the flow of variables.

  **User Question:**
  "${userQuery}"

  **Code:**
  \`\`\`
  ${code}
  \`\`\`

  **Instructions:**
  1. Analyze the user's natural language query to understand their intent. If there are typos, infer the most likely correct variable or function name.
  2. **Only trace the flow of the variable(s) explicitly mentioned in the user's question.** If no specific variable is mentioned in the query, then analyze all key variables in the code.
  3. If the query mentions a **struct, union, or enum** variable, analyze it as follows:
    - **struct/union (by variable name)**: If the user asks to trace the entire struct or union variable (e.g., "trace myStruct"), analyze and present the flow of **all of its member variables together**.
    - **struct/union (by specific member)**: If the user asks to trace a specific member (e.g., "trace myStruct.age"), trace the flow of **only that member**.
    - **enum**: Trace the flow of the enum variable and specify which constant value it holds at each point.
  4. For all pointer-to-pointer variables (e.g., int **ptr), analyze its value (the address it holds) and the value of the variable it points to.
  5. If the user's question is not related to variable tracing, respond with "The question is not related to variable tracing."
  6. Respond in Korean.

  Format your response in the following structure:

  Variable Name: variable_name (in function_name function)
  For each variable, include the following section headers, **and you must output them with the brackets exactly as they are**:
   [Initial Value] Describe the initial value of the variable(Output only the numeric or literal value (no explanation))
   [Update Process] Summarize the changes step-by-step using short bullet points (use "-" at the beginning of each line, avoid long sentences)
   [Final Value] Indicate the final value stored in the variable(Output only the final value (no explanation))
  
  Do not add anything outside this format.
  Write all section titles in English (Variable Name, Initial Value, Update Process, Final Value), and provide the explanations in Korean.
`.trim(); // 문자열의 양쪽 공백을 제거합니다.

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
