import { AgenticaManager } from "./AgenticaManager";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

interface CompileInput {
  code: string;
}

//유저의 자연어를 분석해 아래의 tool / target / details 형태로 반환
interface ParsedIntent {
  tool: string;
  target?: string;
  details?: any;
}

// 복수 명령어를 처리하기 위한 새로운 인터페이스
interface MultipleIntents {
  intents: ParsedIntent[];
  isMultiple: boolean;
}

// Agentica 매니저 인스턴스
const agenticaManager = new AgenticaManager();

// 텍스트 정규화 함수 - 오타와 다양한 표현 처리
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .replace(/[.,!?;]/g, '') // 구두점 제거
    .trim();
}

// 유연한 키워드 매칭 함수
function flexibleMatch(text: string, keywords: string[]): boolean {
  const normalizedText = normalizeText(text);
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeText(keyword);
    // 완전 일치 또는 부분 일치
    return normalizedText.includes(normalizedKeyword) || 
           normalizedKeyword.includes(normalizedText) ||
           // 간단한 유사도 체크 (길이가 비슷하고 많은 글자가 일치)
           (Math.abs(normalizedText.length - normalizedKeyword.length) <= 2 && 
            similarity(normalizedText, normalizedKeyword) > 0.7);
  });
}

// 간단한 문자열 유사도 계산 (Jaccard similarity)
function similarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Agentica를 통한 자연어 처리 함수
async function processWithAgentica(userQuery: string, code: string): Promise<string> {
  try {
    console.log("Agentica를 통해 자연어 요청을 처리합니다...");
    
    // Agentica에 컨텍스트와 함께 요청 전송
    const context = `다음 C/C++ 코드를 분석해주세요:\n\n\`\`\`c\n${code}\n\`\`\`\n\n사용자 요청: ${userQuery}`;
    
    const result = await agenticaManager.processNaturalLanguageRequest(context);
    
    if (result && typeof result === 'string') {
      return result;
    } else if (result && typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    } else {
      return "Agentica 처리 결과를 받았지만 응답 형식이 예상과 다릅니다.";
    }
    
  } catch (error) {
    console.error("Agentica 처리 실패:", error);
    return `Agentica 처리 중 오류가 발생했습니다: ${error}`;
  }
}

// 기존 로직을 fallback으로 사용하는 함수
async function fallbackProcessing(userQuery: string, code: string): Promise<string> {
  console.log("기존 로직으로 fallback 처리합니다...");
  
  // 기존의 키워드 기반 처리 로직
  if (flexibleMatch(userQuery, ["루프", "반복문", "loop", "for", "while", "do"])) {
    const result = await agenticaManager.callLoopCheck(code, "all");
    return typeof result === 'string' ? result : JSON.stringify(result);
  } else if (flexibleMatch(userQuery, ["변수", "variable", "trace", "추적"])) {
    const result = await agenticaManager.callTraceVar(code, userQuery);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } else if (flexibleMatch(userQuery, ["디버그", "debug", "분석", "analysis"])) {
    const result = await agenticaManager.callAfterDebug(code);
    return typeof result === 'string' ? result : JSON.stringify(result);
  } else {
    const result = await agenticaManager.callBeforeDebug(code);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }
}

// 메인 처리 함수
async function processUserRequest(userQuery: string, code: string): Promise<string> {
  try {
    // 먼저 Agentica로 시도
    const agenticaResult = await processWithAgentica(userQuery, code);
    
    // Agentica 결과가 유효하면 반환
    if (agenticaResult && agenticaResult.length > 0 && 
        !agenticaResult.includes("오류") && 
        !agenticaResult.includes("error")) {
      return agenticaResult;
    }
    
    // Agentica 실패 시 fallback 처리
    return await fallbackProcessing(userQuery, code);
    
  } catch (error) {
    console.error("요청 처리 실패:", error);
    return await fallbackProcessing(userQuery, code);
  }
}

// 메인 함수
async function main() {
  try {
    console.log("DebugMate Agentica 에이전트 시작...");
    
    // 명령줄 인수 처리
    const args = process.argv.slice(2);
    let targetFile: string | null = null;
    let userQuery: string | null = null;
    
    if (args.length >= 1) {
      targetFile = args[0];
    }
    
    if (args.length >= 2) {
      userQuery = args.slice(1).join(" ");
    }
    
    // 파일 경로가 제공된 경우 해당 파일 사용, 아니면 현재 디렉토리에서 찾기
    let code: string;
    let fileName: string;
    
    if (targetFile && fs.existsSync(targetFile)) {
      fileName = path.basename(targetFile);
      code = fs.readFileSync(targetFile, "utf-8");
      console.log(`지정된 파일 "${fileName}" 분석 중...`);
    } else {
      // 현재 디렉토리의 .c 파일 찾기
      const cFiles = fs.readdirSync(".")
        .filter(file => file.endsWith(".c"))
        .sort((a, b) => a.localeCompare(b));
      
      if (cFiles.length === 0) {
        console.log("현재 디렉토리에 .c 파일이 없습니다.");
        return;
      }
      
      console.log(`발견된 .c 파일들: ${cFiles.join(", ")}`);
      
      // 첫 번째 .c 파일 읽기
      fileName = cFiles[0];
      code = fs.readFileSync(fileName, "utf-8");
      console.log(`\n파일 "${fileName}" 분석 중...`);
    }
    
    // beforeDebug 실행
    console.log("\n=== 빠른 사전 분석 ===");
    const beforeResult = await agenticaManager.callBeforeDebug(code);
    console.log(beforeResult);
    
    // 사용자 입력 받기 (명령줄에서 제공되지 않은 경우)
    if (!userQuery) {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      userQuery = await new Promise<string>((resolve) => {
        rl.question("\n요청 사항을 입력하시오 : ", resolve);
      });
      
      rl.close();
    }
    
    if (!userQuery.trim()) {
      console.log("요청이 입력되지 않았습니다.");
      return;
    }
    
    console.log(`\n사용자 요청: "${userQuery}"`);
    console.log("\n=== 요청 처리 중 ===");
    
    // Agentica를 통한 요청 처리
    const result = await processUserRequest(userQuery, code);
    console.log("\n=== 처리 결과 ===");
    console.log(result);
    
  } catch (error) {
    console.error("메인 함수 실행 중 오류:", error);
  }
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main().catch(console.error);
}

export { main, processUserRequest, processWithAgentica };
