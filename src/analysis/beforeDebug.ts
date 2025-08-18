import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { compileAndRunC } from "../services/compile";

// API 키 검증
const apiKey = SGlobal.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("오류: GEMINI_API_KEY가 설정되지 않았습니다.");
  console.log("해결 방법:");
  console.log("1. debug-mate status --set KEY=your_api_key_here");
  console.log("2. export GEMINI_API_KEY='your_api_key_here'");
  console.log("3. .env 파일에 GEMINI_API_KEY=your_api_key_here 추가");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

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
    console.log("코드 컴파일 및 실행 중...");
    
    // 컴파일 및 실행 (서비스 사용)
    const { log, compiled } = compileAndRunC(code, { timeoutMs: 1000 });

    console.log(`컴파일 결과: ${compiled ? '성공' : '실패'}`);
    console.log(`로그 길이: ${log.length} 문자`);

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

    console.log("AI 분석 요청 중...");
    
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // 30초 타임아웃 가드
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("API timeout")), 30000));
        const apiCall = model.generateContent(prompt);
        const result: any = await Promise.race([apiCall, timeout]);
        const text = result?.response?.text?.().trim?.();
        if (text) {
          console.log("AI 분석 완료");
          return text;
        }
        throw new Error("Invalid API response");
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        console.log(`API 호출 시도 ${attempt}/3 실패: ${msg}`);
        
        // 429/503/쿼터/오버로드일 때만 백오프, 그 외는 즉시 중단
        const transient = /429|quota|rate limit|503|overload/i.test(msg);
        if (attempt < 3 && transient) {
          // 백오프 (500ms, 1500ms)
          const delay = attempt * 1000 + 500;
          console.log(`${delay}ms 후 재시도...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        break;
      }
    }

    // 3) 폴백: 쿼터/레이트리밋이면 로컬 요약으로 최소 분석 반환
    const isQuota = /429|quota|rate limit/i.test(String(lastErr));
    if (isQuota) {
      console.log("API 쿼터 초과 - 로컬 분석으로 대체");
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
    console.error("AI 분석 실패:", lastErr);
    throw lastErr || new Error("Unknown error");
  } catch (e: any) {
    console.error("분석 중 오류 발생:", e.message);
    return `[Result] 분석 실패\n[Reason] ${e.message || e.toString()}\n[Suggestion] 로그 확인 필요`;
  } finally {
    // 리소스 정리: compileAndRunC 내부에서 임시 파일 정리 수행
  }
}
  
  
  