export async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      // API Key 오류 → 재시도하지 않고 바로 throw
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data?.error?.details?.some(
          (d: any) => d.reason === 'API_KEY_INVALID'
        )
      ) {
        throw new Error(`[API Key Error]: 유효한 API 키를 확인하세요.`);
      }

      // Rate limit(429), Server Error(5xx), Network Error → 재시도
      if (
        (error.response &&
          (error.response.status === 429 || error.response.status >= 500)) ||
        error.message?.includes('Network Error')
      ) {
        if (i < retries - 1) {
          console.warn(
            `[API] 호출 실패 (Status: ${error.response?.status || 'unknown'}). ${
              delayMs / 1000
            }초 후 재시도...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
          continue;
        } else {
          throw new Error(
            `[API Retry Failed]: ${error.message || '알 수 없는 오류'}. 최대 재시도 횟수 도달.`
          );
        }
      }

      // 그 외 오류는 즉시 throw
      throw new Error(`[API Error]: ${error.message || '예상치 못한 오류 발생'}`);
    }
  }

  // 정상적이라면 도달 불가
  throw new Error('[Unexpected Error] 재시도 로직에서 예기치 못한 종료');
}