import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { CompilerError, CompilerWarning, CompilerResultParser } from '../parsing/compilerResultParser';
import { extractLoopsFromCode, extractLoopsWithNesting, LoopInfo } from '../parsing/loopExtractor';
import { execSync } from "child_process";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { afterDebug, afterDebugFromCode, buildAfterDebugPrompt, markErrors } from "./afterDebug";
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

//jm hw - 개선된 버전


// 캐시 시스템 추가 (API 절약) - 전역으로 이동
const analysisCache = new Map<string, string>();

// 캐시 크기 제한 및 메모리 오버플로우 방지
const MAX_CACHE_SIZE = 100;
const MAX_CACHE_VALUE_SIZE = 10000; // 10KB

function addToCache(key: string, value: string) {
  // 캐시 크기 제한 확인
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    // 가장 오래된 항목 제거 (Map은 삽입 순서를 유지)
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) {
      analysisCache.delete(firstKey);
    }
  }
  
  // 값 크기 제한 확인
  if (value.length > MAX_CACHE_VALUE_SIZE) {
    console.log("캐시 값이 너무 큽니다. 캐시하지 않습니다.");
    return;
  }
  
  analysisCache.set(key, value);
}



// uuyeong's hw
export async function loopCheck({ 
  code, 
  target = "all",
  details = {}
}: { 
  code: string;
  target?: string;
  details?: any;
}) {
  // 사전 검증: 반복문이 없으면 API 호출 안 함
  const loopInfos = extractLoopsWithNesting(code);
  
  if (loopInfos.length === 0) {
    return { result: "코드에서 for/while/do-while 루프를 찾을 수 없습니다." };
  }
  
  let targetLoopInfos = loopInfos;
  
      // "all"이 아닌 경우 AI를 사용하여 자연어 타겟 처리
    if (target !== "all") {
      let selectionTimeoutId: NodeJS.Timeout | undefined;
      
      try {
        const targetSelectionPrompt = `You are analyzing C code loops. The user wants to analyze specific loops using natural language.

Full code context:
\`\`\`c
${code.split('\n').map((line, idx) => `${idx + 1}: ${line}`).join('\n')}
\`\`\`

Available loops in the code:
${loopInfos.map((loopInfo, index) => {
  const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
  const loopCode = loopInfo.code.trim();
  // 더 정확한 for문 식별
  let loopType = 'unknown';
  if (loopCode.startsWith('for') || loopCode.match(/^\s*for\s*\(/)) {
    loopType = 'for';
  } else if (loopCode.startsWith('while') || loopCode.match(/^\s*while\s*\(/)) {
    loopType = 'while';
  } else if (loopCode.startsWith('do') || loopCode.match(/^\s*do\s*\{/)) {
    loopType = 'do-while';
  }
  return `Loop ${index + 1} (반복문 ${loopNumber}) [${loopType}]: ${loopCode}`;
}).join('\n')}

User requested target: "${target}"
User details: ${JSON.stringify(details)}

**SPECIAL HANDLING FOR POSITION TARGETS:**
- If target is "first": Return [1] (first loop)
- If target is "second": Return [2] (second loop)  
- If target is "third": Return [3] (third loop)
- If target is "fourth": Return [4] (fourth loop)
- If target is "fifth": Return [5] (fifth loop)
- If target is "last": Return [${loopInfos.length}] (last loop)

Please identify which specific loops the user wants to analyze. Consider various Korean expressions like:
- 첫번째, 첫번쨰, 하나번째, 처음, 1번째, 1st, 맨 앞, 맨앞, 맨 처음, 맨처음, 가장 앞, 가장앞, 앞쪽, 앞쪽에, 앞에, 앞에 있는, 앞에있는 (first loop)
- 두번째, 둘째, 2번째, 2nd (second loop)
- 세번째, 셋째, 3번째, 3rd (third loop)
- 마지막, 끝, last, 맨 뒤, 맨뒤, 맨 끝, 맨끝, 가장 뒤, 가장뒤, 가장 끝, 가장끝, 뒤쪽, 뒤쪽에, 뒤에, 뒤에 있는, 뒤에있는 (last loop)
- for문만, for문, for루프 (ALL for loops)
- while문만, while문, while루프 (ALL while loops)  
- do-while문만, do-while문, dowhile문, 두와일문, 두와일, do while문 (ALL do-while loops)
- testloop21함수, main함수 (loops INSIDE specific function only)
- 23번째 줄, 줄 45, line 30 (loops at specific line number)

IMPORTANT: 
- If the user wants "for문만" or similar, return ALL for loop indices
- If the user wants "while문만" or similar, return ALL while loop indices
- If the user wants "do-while문만", "dowhile문", "두와일문" or similar, return ALL do-while loop indices
- If the user wants a specific position (첫번째, 2번째, 맨 앞, 맨 뒤), return that specific loop
- If the user wants loops in a specific function (함수명함수), return loops in that function by analyzing the full code context
- If the user wants loops at a specific line (N번째 줄), return loops at or near that line by checking line numbers

**CRITICAL**: 
- When identifying for loops, look for ANY line that starts with "for" or contains "for (" pattern. Do not skip any for loops.
- When user requests "함수명함수" (e.g., "testloop21함수"), ONLY return loops that are INSIDE that specific function, not loops with similar names or patterns.
- Analyze the code structure to identify function boundaries and only include loops within the requested function.

Return only a JSON array of loop indices (1-based) that match the user's request:
Example: [1,3,4,5,6,7,8,14,15,18,19,21,22,23] for all for loops (including loop 18 which is "for (i = 0; i < 2;)")
Example: [1] for first loop only
Example: [2,4] for all while loops if loops 2 and 4 are while loops
Example: [3,5,7] for loops inside "testloop21함수" only (if loops 3, 5, 7 are inside that function)
If you cannot determine specific loops, return []`;

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.3, // 더 일관된 응답을 위해 낮은 온도 설정
          maxOutputTokens: 1000, // 응답 길이 제한
        }
      });
      
      // 타임아웃 설정 (30초) - 정리 가능하도록 수정
      const timeoutPromise = new Promise((_, reject) => {
        selectionTimeoutId = setTimeout(() => reject(new Error("AI 응답 타임아웃")), 30000);
      });
      
      const selectionResult = await Promise.race([
        model.generateContent(targetSelectionPrompt),
        timeoutPromise
      ]) as any;
      
      // 성공 시 타임아웃 정리
      if (selectionTimeoutId) clearTimeout(selectionTimeoutId);
      const responseText = selectionResult.response.text().trim();
      
      if (!responseText) {
        throw new Error("AI 모델이 응답을 생성하지 못했습니다.");
      }
      
      const jsonMatch = responseText.match(/\[[\d\s,]*\]/);
      
      if (jsonMatch) {
        try {
          const selectedIndices: number[] = JSON.parse(jsonMatch[0]);
          if (Array.isArray(selectedIndices) && selectedIndices.length > 0) {
            // 유효한 인덱스 범위 검증
            const validIndices = selectedIndices.filter(index => 
              Number.isInteger(index) && index >= 1 && index <= loopInfos.length
            );
            
            if (validIndices.length > 0) {
              targetLoopInfos = validIndices
                .map(index => loopInfos[index - 1])
                .filter(loop => loop !== undefined);
            } else {
              console.log("유효한 루프 인덱스를 찾을 수 없습니다.");
            }
          }
        } catch (parseError: any) {
          console.log(`JSON 파싱 오류: ${parseError.message}`);
          throw new Error("AI 응답 파싱에 실패했습니다.");
        }
      } else {
        console.log("AI 응답에서 유효한 배열을 찾을 수 없습니다.");
      }
          } catch (err) {
        // 에러 시에도 타임아웃 정리
        if (selectionTimeoutId) clearTimeout(selectionTimeoutId);
        
        console.log("AI 타겟 선택 실패, 기본 로직 사용:", err);
        // 폴백: 기본 로직 사용 - target에 따른 직접 선택
        if (target === "first" && loopInfos.length > 0) {
          targetLoopInfos = [loopInfos[0]];
        } else if (target === "second" && loopInfos.length > 1) {
          targetLoopInfos = [loopInfos[1]];
        } else if (target === "third" && loopInfos.length > 2) {
          targetLoopInfos = [loopInfos[2]];
        } else if (target === "fourth" && loopInfos.length > 3) {
          targetLoopInfos = [loopInfos[3]];
        } else if (target === "fifth" && loopInfos.length > 4) {
          targetLoopInfos = [loopInfos[4]];
        } else if (target === "last" && loopInfos.length > 0) {
          targetLoopInfos = [loopInfos[loopInfos.length - 1]];
        } else {
          // 기본값: 모든 루프 선택
          targetLoopInfos = loopInfos;
        }
      }
  }
  
  if (targetLoopInfos.length === 0) {
    return { result: `요청하신 조건에 맞는 루프를 찾을 수 없습니다.` };
  }

  // 나머지 기존 로직 유지
  const cacheKey = JSON.stringify({
    loops: targetLoopInfos.map(info => info.code),
    target,
    details
  });

  if (analysisCache.has(cacheKey)) {
    console.log("🔄 Using cached result (no API call)");
    const cachedResult = analysisCache.get(cacheKey)!;
    return { result: `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${cachedResult}` };
  }

  const simpleChecks = targetLoopInfos.map((loopInfo, i) => {
    const loop = loopInfo.code.trim();
    const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
    
    if (loop.includes("i++") && loop.includes("i < ") && loop.includes("i--")) {
      return `- 반복문 ${loopNumber}\n\t무한 루프입니다. i++와 i--가 동시에 있어 조건이 만족되지 않습니다.\n\t수정 제안 1: i++ 또는 i-- 중 하나만 사용하세요.`;
    }
    if (loop.match(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\d+\s*;\s*\w+--\s*\)/)) {
      return `- 반복문 ${loopNumber}\n\t무한 루프입니다. 초기값 0에서 감소하면 종료 조건을 만족할 수 없습니다.\n\t수정 제안 1: i--를 i++로 변경하세요.\n\t수정 제안 2: 조건을 i >= 0으로 변경하세요.`;
    }
    // do-while문 패턴은 AI 분석으로 처리하도록 제거
    // if (loop.startsWith('do') && loop.includes('while') && loop.includes('z = 1') && loop.includes('while(z)')) {
    //   return `- 반복문 ${loopNumber}\n\t무한 루프입니다. z가 항상 1이므로 while(z) 조건은 항상 참입니다.\n\t수정 제안 1: z의 값을 조건에 따라 변경하거나, 루프 종료 조건을 추가합니다.`;
    // }
    
    return null;
  });

  const allSimple = simpleChecks.every(check => check !== null);
  
  if (allSimple) {
    console.log("⚡ Simple pattern analysis (no API call)");
    const result = simpleChecks.join('\n\n');
    addToCache(cacheKey, result);
    return { result: `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${result}` };
  }

  const loopAnalysisData = targetLoopInfos.map((loopInfo, i) => {
    const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
    return {
      number: loopNumber,
      code: loopInfo.code
    };
  });
  
  const batchPrompt = `Analyze ONLY the provided loops for termination issues. 

IMPORTANT: You are analyzing ${targetLoopInfos.length} loop(s) only. Do NOT analyze any other loops.

For problems, format your response with proper line breaks and tabs for readability.
For no issues, use "문제가 없습니다." in Korean. 
Respond in Korean only.

Expected output format:
- 반복문 X
\t무한 루프입니다. 조건이 항상 참이므로 종료되지 않습니다.
\t수정 제안 1: 구체적인 수정 방법
\t수정 제안 2: 대안적인 수정 방법 (필요한 경우)

Do NOT include any instruction text in your response. Only provide the analysis results.

CRITICAL REQUIREMENTS:
1. Analyze loops in EXACTLY the order they are provided below
2. Each loop should appear ONLY ONCE in your response
3. Use the exact loop numbers as shown below
4. Do NOT skip any loops or analyze loops not in the list

Loops to analyze (in order):
${loopAnalysisData.map((item, index) => `${index + 1}. Loop ${item.number}:\n${item.code}`).join('\n\n')}

Analyze each loop in the exact order shown above. Do NOT mention any other loops.`;


//모델 파라미터 추가 완료  
  let timeoutId: NodeJS.Timeout | undefined;
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3, // 더 일관된 응답을 위해 낮은 온도 설정
        maxOutputTokens: 1000, // 응답 길이 제한
      }
    });
    
    // 타임아웃 설정 (30초) - 정리 가능하도록 수정
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("AI 응답 타임아웃")), 30000);
    });
    
    const result = await Promise.race([
      model.generateContent(batchPrompt),
      timeoutPromise
    ]) as any;
    
    // 성공 시 타임아웃 정리
    if (timeoutId) clearTimeout(timeoutId);
  const batchAnalysis = result.response.text();
  
    if (!batchAnalysis || batchAnalysis.trim().length === 0) {
      throw new Error("AI 모델이 분석 결과를 생성하지 못했습니다.");
    }
    
    addToCache(cacheKey, batchAnalysis);
  
  const formattedResult = `[Result]\n검사한 반복문 수 : ${targetLoopInfos.length}\n\n${batchAnalysis}`;
  return { result: formattedResult };
  } catch (aiError: any) {
    // 에러 시에도 타임아웃 정리
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`AI 분석 실패: ${aiError.message}`);
    
    // 폴백: 간단한 패턴 분석 결과 반환
    const fallbackResult = targetLoopInfos.map((loopInfo, i) => {
      const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
      return `- 반복문 ${loopNumber}\n\tAI 분석에 실패했습니다. 기본 패턴 검사만 수행됩니다.\n\t코드: ${loopInfo.code.trim()}`;
    }).join('\n\n');
    
    const fallbackFormatted = `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${fallbackResult}`;
    return { result: fallbackFormatted };
  }
}

/**
 * 계층적 번호 생성 (1, 2.1, 2.2, 3 등)
 */
function generateHierarchicalNumber(currentLoop: LoopInfo, allLoops: LoopInfo[]): string {
  if (!currentLoop || !allLoops) {
    return "unknown";
  }
  
  if (currentLoop.level === 0) {
    // 최상위 루프
    return currentLoop.index.toString();
  }
  
  // 부모 루프 찾기
  if (currentLoop.parentIndex === undefined || currentLoop.parentIndex < 0 || currentLoop.parentIndex >= allLoops.length) {
    return currentLoop.index.toString(); // 부모 정보가 유효하지 않으면 기본 번호 반환
  }
  
  const parentLoop = allLoops[currentLoop.parentIndex];
  if (!parentLoop) {
    return currentLoop.index.toString(); // 부모 루프를 찾을 수 없으면 기본 번호 반환
  }
  
  try {
    const parentNumber = generateHierarchicalNumber(parentLoop, allLoops);
  return `${parentNumber}.${currentLoop.index}`;
  } catch (error) {
    console.log(`계층적 번호 생성 중 오류: ${error}`);
    return currentLoop.index.toString(); // 오류 발생 시 기본 번호 반환
  }
}

// 복수 루프 비교를 위한 새로운 함수
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

// moonjeong's hw2
/*
export async function inProgressDebug(code: string) {
  let compileLog = "";

  try {
    const compileResult = spawnSync("gcc", [
      "-Wall",
      "-Wextra",
      "-Wpedantic",
      "-fsyntax-only",
      "-xc",  // 입력 형식 명시
      "-"     // stdin 입력
    ], {
      input: code,           // 여기서 코드 전달
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]  // stdin, stdout, stderr 모두 파이프
    });

    compileLog += compileResult.stderr || "";

  } catch (err) {
    compileLog += `GCC Error: ${(err as Error).message}`; // 예외 처리
  }
  //컴파일 로그 파싱 및 오약 생성
  const parsed = CompilerResultParser.parseCompilerOutput(compileLog);
  const summary = CompilerResultParser.generateSummary(parsed);

  // 모델 프롬프츠 구성
  const prompt = `
You are an experienced C debugging assistant.
The user is writing C code that is not yet complete.

Below is the code being written and a summary of compilation logs so far. Even if there are many errors, please only point out "obvious mistakes" (e.g., missing semicolons, typos, undeclared variables, etc.).

[Summary]
${summary}

[Code]
\`\`\`c
${code}
\`\`\`

[Instructions]
- Please ignore missing functions since this is not complete code.
- Only check for obvious syntax errors.
- Avoid overly aggressive feedback.
- Please respond in the following format in Korean:

[Result] 문제 있음/없음
[Issues] Summary of found issues (없음 if none)
[Suggestions] Simple fix suggestions
`;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
*/

function buildPrompt(codeSnippet: string): string {
  return `
You are a static analysis expert specializing in detecting undefined behavior and runtime bugs in C/C++ code.

Analyze the following code snippet or function and determine whether it is likely to cause any critical issue during execution.

The issues you must consider include (but are not limited to):

- Null pointer dereference
- Division by zero
- Out-of-bound memory access
- Use of uninitialized variables
- Use-after-free
- Memory leaks (e.g., missing free or delete)
- Infinite or non-terminating loops
- Recursion with no base case
- Dangerous type coercion or overflow
- Dead code or unreachable branches

If the code is buggy, explain the reason and how to fix it.
If the code is safe, explain why it does not cause any problem.

⚠️ Your response must strictly follow this JSON format:

{
  "isBuggy": true or false,
  "reason": "string (describe why the code is buggy or safe)",
  "suggestion": "string (how to fix, or null if safe)"
}

❗ Do not include anything outside this JSON object.
Do not add comments, explanations, markdown formatting, or any additional prose.

Now analyze the following code:

${codeSnippet}
  `.trim();
}