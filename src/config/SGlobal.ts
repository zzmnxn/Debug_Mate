import "dotenv/config";

export const SGlobal = {
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_BASE_URL: process.env.GEMINI_BASE_URL,
    PORT: process.env.PORT,
  },
}; 