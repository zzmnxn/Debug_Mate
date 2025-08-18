import { SGlobal } from "../config/SGlobal";
import fs from "fs";
import path from "path";
import { compileAndRunC } from "../services/compile";
import { AIService } from "../utils/ai";

// AI 서비스 인스턴스 생성 (기본 토큰 수 사용)
const aiService = new AIService(); 


// moonjeong's hw1   (code: string): Promise<string> {
  export async function beforeDebug({ code }: { code: string }) {
    const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);  // Windows에서는 tmp 폴더 없을 수 있음
  
    // 1) 토큰 절약용 트리머 (함수 내부에만 둠: 별도 유틸/함수 추가 없음)
    const trim = (s: string, max = 18000) =>
      s.length > max ? s.slice(0, max) + "\n...[truncated]..." : s;
  
    // 모델 이름은 환경변수로 바꿀 수 있게 (추가 파일/함수 없이)
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  
    try {
      // 컴파일 및 실행 (서비스 사용)
      const { log } = compileAndRunC(code, { timeoutMs: 1000 });
  
      // 1) 코드/로그를 트림해서 입력 토큰 축소
      const slimCode = trim(code, 9000);
      const slimLog  = trim(log, 8000);
  
      const prompt = `
  You are a C language debugging expert.
  The user has provided complete code and gcc compilation/execution logs.
  
  🔹 Code Content:
  \`\`\`c
  ${slimCode}
  \`\`\`
  
  🔹 GCC Log:
  \`\`\`
  ${slimLog}
  \`\`\`
  
  Based on this information, please analyze in the following format (respond in Korean):
  
  [Result] "문제 있음" or "문제 없음"
  [Reason] Main cause or analysis reason
  [Suggestion] Core fix suggestion (1-2 lines)
  
  `.trim();
  
            // 2) AI 서비스를 사용한 API 호출 (재시도 로직 포함)
      let lastErr: any = null;
      try {
        const text = await aiService.generateContentWithRetry(prompt, 3, 1000, 30000);
        if (text) return text;
        throw new Error("Invalid API response");
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        
        // 3) 폴백: 쿼터/레이트리밋이면 로컬 요약으로 최소 분석 반환
        const isQuota = /429|quota|rate limit/i.test(String(lastErr));
        if (isQuota) {
          // 로그만 기반의 안전한 최소 응답
          const hasErrors = /error:|fatal error:|AddressSanitizer|LeakSanitizer|runtime error|segmentation fault/i.test(log);
          const resultFlag = hasErrors ? "문제 있음" : "문제 없음";
          const reason = hasErrors
            ? "API 쿼터 초과로 AI 분석은 생략했지만, GCC/런타임 로그에 잠재적 오류 신호가 있습니다."
            : "API 쿼터 초과로 AI 분석은 생략했습니다. 현재 로그만으로는 치명적 이슈가 확인되지 않습니다.";
          const hint =
            '프롬프트 축소 또는 모델 전환(GEMINI_MODEL=gemini-1.5-flash-8b 등), 호출 빈도 조절을 고려하세요. 필요 시 loopCheck()로 루프 조건만 빠르게 점검할 수 있습니다.';
          return `[Result] ${resultFlag}\n[Reason] ${reason}\n[Suggestion] ${hint}`;
        }
        
        // 그 외 에러
        throw lastErr || new Error("Unknown error");
      }
    } catch (e: any) {
      return `[Result] 분석 실패\n[Reason] ${e.message || e.toString()}\n[Suggestion] 로그 확인 필요`;
    } finally {
      // 리소스 정리: compileAndRunC 내부에서 임시 파일 정리 수행
    }
  }
  
  
  