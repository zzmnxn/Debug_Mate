import { config } from "dotenv";
import { join } from "path";

// 사용자 홈 디렉토리의 .debug-mate.env 파일 로드
const envPath = join(process.env.HOME || process.env.USERPROFILE || process.cwd(), '.debug-mate.env');
config({ path: envPath });

export const SGlobal = {
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_BASE_URL: process.env.GEMINI_BASE_URL,
    PORT: process.env.PORT,
  },
}; 