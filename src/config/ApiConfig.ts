import "dotenv/config";

export const ApiConfig = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,
  GEMINI_BASE_URL:
    process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,

  /** 환경 변수 필수값 검증 */
  ensureEnv(): void {
    const missing: string[] = [];
    if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
    // 필요하면 아래 항목도 필수로 바꿔 추가하세요.
    // if (!process.env.GEMINI_BASE_URL) missing.push("GEMINI_BASE_URL");

    if (missing.length > 0) {
      const msg =
        `[ApiConfig] Missing required env: ${missing.join(", ")}\n` +
        `- .env 파일에 위 키들을 설정하고 다시 실행하세요.`;
      throw new Error(msg);
    }
  },
};

/*import "dotenv/config";

export const ApiConfig = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY as string,
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
};
*/