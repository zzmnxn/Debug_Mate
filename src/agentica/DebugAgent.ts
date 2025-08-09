import { loopCheck, afterDebugFromCode, traceVar, compareLoops } from "./handlers";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

// AI 파싱 강화를 위한 헬퍼 함수
async function enhancedAIParsing(query: string, context: string = ""): Promise<ParsedIntent | null> {
  const enhancedPrompt = `You are an expert in analyzing natural language requests from users.
Understand various expressions, typos, abbreviations, and colloquial language, and convert them into appropriate JSON format.

Available tools:
- loopCheck: Loop analysis and infinite loop detection
- traceVar: Variable tracking and flow analysis  
- testBreak: Memory leak and breakpoint testing
- afterDebugFromCode: Comprehensive code analysis

Target specification:
- first, second, third, fourth, fifth: Sequential order
- last: Last one
- all: All items
- specific: Specific type (requires loopType in details)
- numbers: Direct index (e.g., "6", "10")

Example conversions (Korean input):
"첫번째랑 세번쨰 for문 비교해줘" → {"tool": "loopCheck", "target": "first", "details": {}}
"3번째 와일문 체크" → {"tool": "loopCheck", "target": "third", "details": {"loopType": "while"}}
"변수 i 어떻게 변하는지 봐줘" → {"tool": "traceVar", "target": "variable", "details": {"name": "i"}}
"전체적으로 문제없나 확인" → {"tool": "afterDebugFromCode", "target": "all", "details": {}}
"메모리 새는거 있나?" → {"tool": "testBreak", "target": "all", "details": {}}

${context ? `Additional context: ${context}` : ""}

User request (Korean): "${query}"

Output the analysis result in JSON format only:`;

  try {
    const result = await model.generateContent(enhancedPrompt);
    const responseText = result.response.text().trim();
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // 결과 검증 및 정규화
      if (parsed.tool && ['loopCheck', 'traceVar', 'testBreak', 'afterDebugFromCode'].includes(parsed.tool)) {
        return {
          tool: parsed.tool,
          target: parsed.target || 'all',
          details: parsed.details || {}
        };
      }
    }
  } catch (err) {
    // AI parsing failed, using regex result
  }
  
  return null;
}

// 폴백 메커니즘을 포함한 강화된 파싱 함수
async function robustParseSingleIntent(query: string): Promise<ParsedIntent> {
  const normalizedQuery = normalizeText(query);
  
  // 1단계: 기본 패턴 매칭
  const basicResult = await parseSingleIntent(query);
  
  // 2단계: 기본 결과가 너무 일반적이면 AI 파싱 시도
  const needsAIParsing = (
    basicResult.target === 'all' && 
    basicResult.tool === 'loopCheck' && 
    Object.keys(basicResult.details).length === 0 &&
    query.length > 10
  );
  
  if (needsAIParsing) {
    const aiResult = await enhancedAIParsing(query);
    if (aiResult) {
      return aiResult;
    }
  }
  
  // 3단계: 키워드 기반 추론 강화
  if (basicResult.target === 'all') {
    // 숨겨진 숫자나 순서 표현 찾기
    const hiddenNumberPatterns = [
      { pattern: /하나/i, target: "first" },
      { pattern: /둘/i, target: "second" },
      { pattern: /셋/i, target: "third" },
      { pattern: /넷/i, target: "fourth" },
      { pattern: /다섯/i, target: "fifth" },
      { pattern: /처음/i, target: "first" },
      { pattern: /시작/i, target: "first" },
      { pattern: /끝/i, target: "last" },
      { pattern: /마지막/i, target: "last" }
    ];
    
    for (const pattern of hiddenNumberPatterns) {
      if (pattern.pattern.test(query)) {
        basicResult.target = pattern.target;
        break;
      }
    }
  }
  
  return basicResult;
}

async function parseSingleIntent(query: string): Promise<ParsedIntent> {
  const normalizedQuery = normalizeText(query);
  
  // 더 유연한 패턴 매칭
  const orderPatterns = [
    { keywords: ['첫', '첫번째', '첫 번째', '1번째', '하나번째', '처음'], target: "first" },
    { keywords: ['두', '둘', '두번째', '두 번째', '2번째', '둘째', '이번째'], target: "second" },
    { keywords: ['세', '셋', '세번째', '세 번째', '3번째', '셋째', '삼번째'], target: "third" },
    { keywords: ['네', '넷', '네번째', '네 번째', '4번째', '넷째', '사번째'], target: "fourth" },
    { keywords: ['다섯', '다섯번째', '다섯 번째', '5번째', '오번째'], target: "fifth" },
    { keywords: ['마지막', '마지막번째', '끝', '마지막거', '라스트'], target: "last" },
  ];
  
  const loopTypePatterns = [
    { keywords: ['for문', 'for루프', 'for반복문', '포문', 'for'], loopType: "for" },
    { keywords: ['while문', 'while루프', 'while반복문', '와일문', 'while'], loopType: "while" },
    { keywords: ['do while문', 'dowhile문', 'do-while', 'do while루프'], loopType: "do-while" },
  ];
  
  // 도구 결정 - 더 유연한 키워드 매칭
  let tool = "loopCheck";
  if (flexibleMatch(normalizedQuery, ['변수', '추적', '변수추적', '트레이스', 'trace'])) {
    tool = "traceVar";
  }
  if (flexibleMatch(normalizedQuery, ['메모리', '누수', '메모리누수', 'memory', 'leak'])) {
    tool = "testBreak";
  }
  if (flexibleMatch(normalizedQuery, ['전체', '종합', '전반적', '전체분석', '종합분석', 'overall'])) {
    tool = "afterDebugFromCode";
  }
  
  let target = "all";
  let details: any = {};
  
  // 숫자 패턴 검사 - 더 유연하게 (우선순위 높임)
  const numberPatterns = [
    /(\d+)\s*번째/i,
    /번째\s*(\d+)/i,
    /(\d+)\s*번/i,
    /(\d+)th/i,
    /(\d+)st/i,
    /(\d+)nd/i,
    /(\d+)rd/i
  ];
  
  for (const pattern of numberPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const number = match[1];
      const index = parseInt(number);
      if (index >= 1 && index <= 5) {
        const targets = ["first", "second", "third", "fourth", "fifth"];
        target = targets[index - 1];
      } else if (index >= 6) {
        target = index.toString();
      }
      break;
    }
  }
  
  // 순서 패턴 매칭 (숫자 패턴이 없을 때만)
  if (target === "all") {
    for (const pattern of orderPatterns) {
      if (flexibleMatch(normalizedQuery, pattern.keywords)) {
        target = pattern.target;
        break;
      }
    }
  }
  
  // 루프 타입 패턴 매칭
  for (const pattern of loopTypePatterns) {
    if (flexibleMatch(normalizedQuery, pattern.keywords)) {
      if (target === "all") {
        target = "specific";
      }
      details.loopType = pattern.loopType;
      break;
    }
  }
  
  const result = { tool, target, details };
  return result;
}

async function parseUserIntent(query: string): Promise<MultipleIntents> {
  const normalizedQuery = normalizeText(query);
  
  // 더 유연한 복합 요청 패턴 검사
  const comparisonKeywords = ['비교', '차이', '비교해', '차이점', '다른점', '비교분석', '대조', '대비'];
  const connectionWords = ['와', '과', '하고', '랑', '이랑', '그리고', '또', '그리고나서', '다음', '그담', 'vs'];
  
  // 비교 요청 감지
  const hasComparison = flexibleMatch(normalizedQuery, comparisonKeywords);
  const hasConnection = flexibleMatch(normalizedQuery, connectionWords);
  
  if (hasComparison && hasConnection) {
    // AI를 사용하여 복잡한 비교 요청 파싱
    const comparisonPrompt = `Please extract exactly two targets that the user wants to compare from the following request. 
Consider typos and various expressions in your analysis.

User request (Korean): "${query}"

Example output format:
{"targets": ["첫번째 for문", "세번째 while문"], "isComparison": true}
{"targets": ["2번째 루프", "마지막 반복문"], "isComparison": true}

If there is only one target or if the targets are not clear:
{"targets": [], "isComparison": false}

Output JSON only:`;

    try {
      const result = await model.generateContent(comparisonPrompt);
      const responseText = result.response.text().trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.isComparison && parsed.targets && parsed.targets.length >= 2) {
          const firstIntent = await robustParseSingleIntent(parsed.targets[0]);
          const secondIntent = await robustParseSingleIntent(parsed.targets[1]);
          
          return {
            intents: [firstIntent, secondIntent],
            isMultiple: true
          };
        }
      }
    } catch (err) {
      // AI 파싱 실패 시 기존 로직 사용
    }
  }
  
  // 기존 정규식 패턴도 유지 (백업용)
  const comparisonPatterns = [
    /(.+?)\s*(?:와|과|하고|랑|이랑)\s*(.+?)\s*(?:비교|차이|비교해|차이점)/i,
    /비교.*?(.+?)\s*(?:와|과|하고|랑|이랑)\s*(.+)/i,
    /(.+?)\s*(?:vs|대|대비)\s*(.+)/i
  ];

  for (const pattern of comparisonPatterns) {
    const match = query.match(pattern);
    if (match) {
      const [, first, second] = match;
      const firstIntent = await robustParseSingleIntent(first.trim());
      const secondIntent = await robustParseSingleIntent(second.trim());
      
      return {
        intents: [firstIntent, secondIntent],
        isMultiple: true
      };
    }
  }

  // 일반적인 복수 요청 패턴
  const multipleRequestPatterns = [
    /(.+?)\s*(?:그리고|또|그리고나서|다음|그담)\s*(.+)/i,
    /(.+?)\s*,\s*(.+)/i,
    /(.+?)\s*;\s*(.+)/i
  ];

  for (const pattern of multipleRequestPatterns) {
    const match = query.match(pattern);
    if (match) {
      const [, first, second] = match;
      const firstIntent = await robustParseSingleIntent(first.trim());
      const secondIntent = await robustParseSingleIntent(second.trim());
      
      return {
        intents: [firstIntent, secondIntent],
        isMultiple: true
      };
    }
  }

  // 단일 요청인 경우 - 강화된 파싱 사용
  const singleIntent = await robustParseSingleIntent(query);
  return {
    intents: [singleIntent],
    isMultiple: false
  };
}

async function main() {
  const [,, filePath, ...queryParts] = process.argv;
  const userQuery = queryParts.join(" ").trim();

  if (!filePath || !userQuery) {
    console.error("Usage: debug <filePath> \"<natural language query>\"");
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  const code = fs.readFileSync(absolutePath, "utf-8");

  //add or modify your homework function here !! @@@@@@@@@@@@@@@@@@
  try {
    const parsedIntents = await parseUserIntent(userQuery);
    let resultText = "";

    if (parsedIntents.isMultiple) {
      // 복합 요청인 경우 - 비교 요청인지 확인
      const isComparison = userQuery.includes("비교") || userQuery.includes("차이");
      
      if (isComparison && parsedIntents.intents.every(intent => intent.tool === "loopCheck")) {
        // 루프 비교 요청인 경우
        const targets = parsedIntents.intents.map(intent => intent.target || "all");
        const result = await compareLoops({ 
          code, 
          targets,
          details: parsedIntents.intents[0].details || {}
        });
        resultText = result.result ?? "";
      } else {
        // 일반적인 복수 요청 처리
        for (let i = 0; i < parsedIntents.intents.length; i++) {
          const intent = parsedIntents.intents[i];
          let sectionResult = "";
          
          if (intent.tool === "loopCheck") {
            const result = await loopCheck({ 
              code, 
              target: intent.target,
              details: intent.details 
            });
            sectionResult = result.result ?? "";
          } else if (intent.tool === "afterDebugFromCode") {
            const { analysis, markedFilePath } = await afterDebugFromCode(code, "main.c");
            sectionResult = analysis + (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "");
          } else if (intent.tool === "traceVar") {
            const result = await traceVar({ code, userQuery: userQuery });
            sectionResult = result.variableTrace ?? "";
          }
          
          resultText += `\n=== 요청 ${i + 1}: ${intent.tool} (${intent.target || 'all'}) ===\n${sectionResult}\n`;
        }
      }
    } else {
      // 단일 요청 처리
      const intent = parsedIntents.intents[0];
      if (intent.tool === "loopCheck") {
        const result = await loopCheck({ 
          code, 
          target: intent.target,
          details: intent.details 
        });
        resultText = result.result ?? "";
      } else if (intent.tool === "afterDebugFromCode") {
        const { analysis, markedFilePath } = await afterDebugFromCode(code, "main.c");
        resultText = analysis + (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "");
      } else if (intent.tool === "traceVar") {
        const result = await traceVar({ code, userQuery: userQuery });
        resultText = result.variableTrace ?? "";
      }
    }

    const toolNames = parsedIntents.intents.map(intent => intent.tool).join(", ");
    console.log("\n선택된 함수(테스트용) : ", toolNames);
    console.log("[Result] \n" + resultText);
  } catch (err: any) {
    console.error("[Error] ", err.message || err);
  }
}

main();
