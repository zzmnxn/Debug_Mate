import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


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
