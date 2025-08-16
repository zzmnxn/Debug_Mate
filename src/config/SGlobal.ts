import "dotenv/config";

export const SGlobal = {
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_BASE_URL: process.env.GEMINI_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MODEL: process.env.MODEL || "gpt-4o-mini",
    PORT: process.env.PORT,
  },
}; 