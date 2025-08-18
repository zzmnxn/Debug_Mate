import { SGlobal } from "../config/SGlobal.js";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { extractLoopsFromCode, extractLoopsWithNesting, LoopInfo } from '../parsing/loopExtractor.js';
import { execSync } from "child_process";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { buildTargetSelectionPrompt, buildBatchAnalysisPrompt, generateHierarchicalNumber } from "../prompts/prompt_loopCheck.js";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 


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
        const targetSelectionPrompt = buildTargetSelectionPrompt(code, loopInfos, target, details);

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

  const batchPrompt = buildBatchAnalysisPrompt(targetLoopInfos, loopInfos);


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



