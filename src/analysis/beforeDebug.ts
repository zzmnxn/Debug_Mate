import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 


// moonjeong's hw1   (code: string): Promise<string> {
  export async function beforeDebug({ code }: { code: string }) {
    const tmpDir = process.platform === "win32" ? path.join(process.cwd(), "tmp") : "/tmp";
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);  // Windows에서는 tmp 폴더 없을 수 있음
    
    const tmpFile = path.join(tmpDir, `code_${Date.now()}.c`);
    const outputFile = path.join(tmpDir, `a.out`);
  
    // 1) 토큰 절약용 트리머 (함수 내부에만 둠: 별도 유틸/함수 추가 없음)
    const trim = (s: string, max = 18000) =>
      s.length > max ? s.slice(0, max) + "\n...[truncated]..." : s;
  
    // 모델 이름은 환경변수로 바꿀 수 있게 (추가 파일/함수 없이)
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  
    try {
      // 임시파일에 코드 저장
      fs.writeFileSync(tmpFile, code);
  
      // GCC 컴파일 수행
      const compileResult = spawnSync("gcc", [
        "-Wall", "-Wextra", "-O2", "-fanalyzer", "-fsanitize=undefined", "-fsanitize=address",
        tmpFile, "-o", outputFile
      ], {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"]
      });
  
      // 로그 수집
      let log = (compileResult.stdout || "") + (compileResult.stderr || "");
      if (compileResult.status === 0) {
        const runResult = spawnSync(outputFile, [], { encoding: "utf-8", timeout: 1000 });
        log += "\n\n=== Runtime Output ===\n";
        log += runResult.stdout || "";
        log += runResult.stderr || "";
      }
  
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
  
      // 2) 간단 재시도 + 지수 백오프(추가 함수 없이 루프만)
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
      });
  
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // 30초 타임아웃 가드
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("API timeout")), 30000));
          const apiCall = model.generateContent(prompt);
          const result: any = await Promise.race([apiCall, timeout]);
          const text = result?.response?.text?.().trim?.();
          if (text) return text;
          throw new Error("Invalid API response");
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          // 429/503/쿼터/오버로드일 때만 백오프, 그 외는 즉시 중단
          const transient = /429|quota|rate limit|503|overload/i.test(msg);
          if (attempt < 3 && transient) {
            // 백오프 (500ms, 1500ms)
            await new Promise(r => setTimeout(r, attempt * 1000 + 500));
            continue;
          }
          break;
        }
      }
  
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
    } catch (e: any) {
      return `[Result] 분석 실패\n[Reason] ${e.message || e.toString()}\n[Suggestion] 로그 확인 필요`;
    } finally {
      // 리소스 정리
      [tmpFile, outputFile].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
    }
  }
  
  
  