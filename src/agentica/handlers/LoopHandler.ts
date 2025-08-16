import { SGlobal } from "../config/SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractLoopsFromCode, extractLoopsWithNesting, LoopInfo } from '../../parsing/loopExtractor';

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || "");

// 캐시 시스템
const analysisCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;
const MAX_CACHE_VALUE_SIZE = 10000;

function addToCache(key: string, value: string) {
  if (analysisCache.size >= MAX_CACHE_SIZE) {
    const firstKey = analysisCache.keys().next().value;
    if (firstKey) {
      analysisCache.delete(firstKey);
    }
  }
  
  if (value.length > MAX_CACHE_VALUE_SIZE) {
    console.log("캐시 값이 너무 큽니다. 캐시하지 않습니다.");
    return;
  }
  
  analysisCache.set(key, value);
}

// 계층적 번호 생성 (1, 2.1, 2.2, 3 등)
function generateHierarchicalNumber(currentLoop: LoopInfo, allLoops: LoopInfo[]): string {
  if (!currentLoop || !allLoops) {
    return "unknown";
  }
  
  if (currentLoop.level === 0) {
    return currentLoop.index.toString();
  }
  
  if (currentLoop.parentIndex === undefined || currentLoop.parentIndex < 0 || currentLoop.parentIndex >= allLoops.length) {
    return currentLoop.index.toString();
  }
  
  const parentLoop = allLoops[currentLoop.parentIndex];
  if (!parentLoop) {
    return currentLoop.index.toString();
  }
  
  try {
    const parentNumber = generateHierarchicalNumber(parentLoop, allLoops);
    return `${parentNumber}.${currentLoop.index}`;
  } catch (error) {
    console.log(`계층적 번호 생성 중 오류: ${error}`);
    return currentLoop.index.toString();
  }
}

// loopCheck: 루프 분석 및 무한 루프 감지
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
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        selectionTimeoutId = setTimeout(() => reject(new Error("AI 응답 타임아웃")), 30000);
      });
      
      const selectionResult = await Promise.race([
        model.generateContent(targetSelectionPrompt),
        timeoutPromise
      ]) as any;
      
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
      if (selectionTimeoutId) clearTimeout(selectionTimeoutId);
      
      console.log("AI 타겟 선택 실패, 기본 로직 사용:", err);
      // 폴백: 기본 로직 사용
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
        targetLoopInfos = loopInfos;
      }
    }
  }
  
  if (targetLoopInfos.length === 0) {
    return { result: `요청하신 조건에 맞는 루프를 찾을 수 없습니다.` };
  }

  // 캐시 확인
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

  // 간단한 패턴 검사
  const simpleChecks = targetLoopInfos.map((loopInfo, i) => {
    const loop = loopInfo.code.trim();
    const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
    
    if (loop.includes("i++") && loop.includes("i < ") && loop.includes("i--")) {
      return `- 반복문 ${loopNumber}\n\t무한 루프입니다. i++와 i--가 동시에 있어 조건이 만족되지 않습니다.\n\t수정 제안 1: i++ 또는 i-- 중 하나만 사용하세요.`;
    }
    if (loop.match(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\d+\s*;\s*\w+--\s*\)/)) {
      return `- 반복문 ${loopNumber}\n\t무한 루프입니다. 초기값 0에서 감소하면 종료 조건을 만족할 수 없습니다.\n\t수정 제안 1: i--를 i++로 변경하세요.\n\t수정 제안 2: 조건을 i >= 0으로 변경하세요.`;
    }
    
    return null;
  });

  const allSimple = simpleChecks.every(check => check !== null);
  
  if (allSimple) {
    console.log("⚡ Simple pattern analysis (no API call)");
    const result = simpleChecks.join('\n\n');
    addToCache(cacheKey, result);
    return { result: `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${result}` };
  }

  // AI 분석을 위한 데이터 준비
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

  let timeoutId: NodeJS.Timeout | undefined;
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("AI 응답 타임아웃")), 30000);
    });
    
    const result = await Promise.race([
      model.generateContent(batchPrompt),
      timeoutPromise
    ]) as any;
    
    if (timeoutId) clearTimeout(timeoutId);
    const batchAnalysis = result.response.text();
    
    if (!batchAnalysis || batchAnalysis.trim().length === 0) {
      throw new Error("AI 모델이 분석 결과를 생성하지 못했습니다.");
    }
    
    addToCache(cacheKey, batchAnalysis);
  
    const formattedResult = `[Result]\n검사한 반복문 수 : ${targetLoopInfos.length}\n\n${batchAnalysis}`;
    return { result: formattedResult };
  } catch (aiError: any) {
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
