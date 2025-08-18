import { loopCheck, traceVar } from "./handlers";
import { afterDebugFromCode } from "./afterDebug";
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





// afterDebugFromCode를 직접 호출하는 함수
async function runAfterDebug(
  code: string,
  userQuery: string,
  fileName: string
): Promise<string> {
  const { analysis, markedFilePath } = await afterDebugFromCode(
    code,
    fileName
  );
  return (
    analysis +
    (markedFilePath ? `\n[마킹된 코드 파일]: ${markedFilePath}` : "")
  );
}

// AI 파싱 강화를 위한 헬퍼 함수
async function enhancedAIParsing(query: string, context: string = ""): Promise<ParsedIntent | null> {
  const enhancedPrompt = `You are an expert in analyzing natural language requests from users.
Understand various expressions, typos, abbreviations, and colloquial language, and convert them into appropriate JSON format.

Available tools:
- loopCheck: Loop analysis and infinite loop detection
- traceVar: Variable tracking and flow analysis  
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
"메모리 새는거 있나?" → {"tool": "afterDebugFromCode", "target": "all", "details": {}}

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
      if (parsed.tool && ['loopCheck', 'traceVar', 'afterDebugFromCode'].includes(parsed.tool)) {
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
      { pattern: /마지막/i, target: "last" },
      // 위치 기반 표현 추가
      { pattern: /맨\s*앞/i, target: "first" },
      { pattern: /맨\s*처음/i, target: "first" },
      { pattern: /가장\s*앞/i, target: "first" },
      { pattern: /앞쪽/i, target: "first" },
      { pattern: /앞에\s*있는/i, target: "first" },
      { pattern: /맨\s*뒤/i, target: "last" },
      { pattern: /맨\s*끝/i, target: "last" },
      { pattern: /가장\s*뒤/i, target: "last" },
      { pattern: /가장\s*끝/i, target: "last" },
      { pattern: /뒤쪽/i, target: "last" },
      { pattern: /뒤에\s*있는/i, target: "last" }
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
    { keywords: ['첫', '첫번째', '첫 번째', '1번째', '하나번째', '처음', '맨 앞', '맨앞', '맨 처음', '맨처음', '가장 앞', '가장앞', '앞쪽', '앞쪽에', '앞에', '앞에 있는', '앞에있는'], target: "first" },
    { keywords: ['두', '둘', '두번째', '두 번째', '2번째', '둘째', '이번째'], target: "second" },
    { keywords: ['세', '셋', '세번째', '세 번째', '3번째', '셋째', '삼번째'], target: "third" },
    { keywords: ['네', '넷', '네번째', '네 번째', '4번째', '넷째', '사번째'], target: "fourth" },
    { keywords: ['다섯', '다섯번째', '다섯 번째', '5번째', '오번째'], target: "fifth" },
    { keywords: ['마지막', '마지막번째', '끝', '마지막거', '라스트', '맨 뒤', '맨뒤', '맨 끝', '맨끝', '가장 뒤', '가장뒤', '가장 끝', '가장끝', '뒤쪽', '뒤쪽에', '뒤에', '뒤에 있는', '뒤에있는'], target: "last" },
  ];
  
  const loopTypePatterns = [
    { keywords: ['for문', 'for루프', 'for반복문', '포문', 'for', 'for검사', 'for분석', 'for체크', 'for확인', 'for점검', 'for리뷰'], loopType: "for" },
    // do-while을 while보다 먼저 매칭 (더 구체적이므로)
    { keywords: ['do while문', 'dowhile문', 'do-while문', 'do-while', 'do while루프', 'do while반복문', '두와일문', '두와일', 'dowhile', 'do while', 'do-while검사', 'do-while분석', 'do-while체크', 'do-while확인', 'do-while점검', 'do-while리뷰', 'dowhile검사', 'dowhile분석', 'dowhile체크', 'dowhile확인', 'dowhile점검', 'dowhile리뷰'], loopType: "do-while" },
    { keywords: ['while문', 'while루프', 'while반복문', '와일문', 'while', 'while검사', 'while분석', 'while체크', 'while확인', 'while점검', 'while리뷰'], loopType: "while" },
  ];
  
  // 도구 결정 - 더 유연한 키워드 매칭 (우선순위 고려)
  let tool = "afterDebugFromCode"; // 기본값을 afterDebugFromCode로 변경
  
  // 전체 검사/최종 검사/수정 제안/디버깅 관련 키워드가 있으면 afterDebugFromCode (우선순위 높음)
  const overallAnalysisKeywords = [
    '전체', '전체적으로', '전체코드', '전체 코드', '최종', '최종검사', '최종 검사', '수정', '어디를', '어디를 수정', '수정할까',
    '컴파일', '컴파일해', 'compile', 'build', '빌드', '분석', '전체분석', '전체 분석', '문제', '문제점', '오류', '에러',
    '디버깅', '디버그', 'debug', 'debugging', '디버깅해', '디버깅해줘', '디버그해', '디버그해줘',
    // 일반적인 오타들
    '전체코', '전체코드', '최종검', '최종 검', '수정해', '어디', '컴패일', '컴파', '컴팔', 'complie', 'complile', 'compil',
    '수정할', '수정할까', '문제', '문제점', '오류', '에러', '디버깅', '디버그', '디버깅해', '디버그해'
  ];
  const hasOverallAnalysis = flexibleMatch(normalizedQuery, overallAnalysisKeywords);
  
  if (hasOverallAnalysis) {
    tool = "afterDebugFromCode";
  } else {
    // 반복문 관련 키워드가 있으면 loopCheck (오타 포함)
    const loopKeywords = [
      '반복문', '루프', 'loop', 'for문', 'while문', 'do-while', '포문', '와일문', 'dowhile', '두와일',
      // 일반적인 오타들
      '반복', '반복믄', '루프문', '룹', '포', '와일', '두와일문'
    ];
    const hasLoopKeyword = flexibleMatch(normalizedQuery, loopKeywords);
    
    if (hasLoopKeyword) {
      tool = "loopCheck";
    }
  }
  
  // 변수 추적 관련 키워드가 있으면 traceVar (오타 포함)
  if (flexibleMatch(normalizedQuery, [
    '변수', '추적', '변수추적', '트레이스', 'trace',
    // 포인터 관련 키워드
    '포인터', '이중포인터', '이중 포인터', '더블포인터', '더블 포인터', 'pointer', 'double pointer', 'doublepointer',
    '포인터관계', '포인터 관계', 'pointer relation', 'pointerrelation',
    '포인터분석', '포인터 분석', 'pointer analysis', 'pointeranalysis',
    '포인터추적', '포인터 추적', 'pointer trace', 'pointertrace',
    // 배열 관련 키워드
    '배열', 'array', 'arr', '배열요소', '배열 요소', 'array element', 'arrayelement',
    '배열접근', '배열 접근', 'array access', 'arrayaccess', '배열인덱스', '배열 인덱스', 'array index', 'arrayindex',
    // 구조체 관련 키워드
    '구조체', 'struct', 'structure', '구조체멤버', '구조체 멤버', 'struct member', 'structmember',
    '구조체필드', '구조체 필드', 'struct field', 'structfield',
    // 공용체 관련 키워드
    '공용체', 'union', '공용체멤버', '공용체 멤버', 'union member', 'unionmember',
    '공용체필드', '공용체 필드', 'union field', 'unionfield',
    '공용체메모리', '공용체 메모리', 'union memory', 'unionmemory',
    // 상수 관련 키워드
    'const', '상수', 'constant', '상수값', '상수 값', 'constant value', 'constantvalue',
    // 값 관련 키워드
    '값', 'value', 'val', '값변화', '값 변화', 'value change', 'valuechange',
    '초기값', '초기 값', 'initial value', 'initialvalue', '최종값', '최종 값', 'final value', 'finalvalue',
    // 데이터 관련 키워드
    '데이터', 'data', '데이터분석', '데이터 분석', 'data analysis', 'dataanalysis',
    '데이터흐름', '데이터 흐름', 'data flow', 'dataflow', '데이터추적', '데이터 추적', 'data trace', 'datatrace',
    // 주소 관련 키워드
    '주소', 'address', 'addr', '주소값', '주소 값', 'address value', 'addressvalue',
    '메모리주소', '메모리 주소', 'memory address', 'memoryaddress', '포인터주소', '포인터 주소', 'pointer address', 'pointeraddress',
    // 변수 타입 관련 키워드
    'int', 'integer', '정수', 'float', '실수', 'double', '문자', 'char', '문자열', 'string',
    // 일반적인 오타들
    '변', '변주', '츄적', '추적해', 'trase', 'trce',
    '포인', '포인터', '포인트', 'pointer', 'point', 'poin', 'pointe',
    '배', '배열', 'array', 'arr', '구조', '구조체', 'struct', '구조체', '구조체',
    '공용', '공용체', 'union', 'uni', 'unio',
    '상', '상수', 'const', 'constant', '값', 'value', 'val',
    '데', '데이터', 'data', 'dat', '주', '주소', 'address', 'addr', 'adr'
  ])) {
    tool = "traceVar";
  }
  
  // 컴파일 관련 키워드 체크 (afterDebugFromCode는 기본값이지만 명시적으로 확인)
  // 오타가 있어도 컴파일 의도를 명확히 파악
  const compileKeywords = [
    '컴파일', '컴파일해', 'compile', 'build', '빌드',
    // 일반적인 오타들
    '컴패일', '컴파', '컴팔', '컴파일해줘', 'complie', 'complile', 'compil', '빌드해',
    '메모리', '누수', '메모리누수', 'memory', 'leak',
    // 일반적인 오타들
    '메모', '메모이', '누', '누스', 'memori', 'memorry', 'lek'
  ];
  if (flexibleMatch(normalizedQuery, compileKeywords)) {
    // 이미 기본값이 afterDebugFromCode이므로 명시적으로 설정할 필요는 없지만 
    // 로그를 위해 명확히 표시
    tool = "afterDebugFromCode";
  }
  
  // 미리 정의하지 않은 오타에 대한 AI 기반 의도 파악
  // 전체 분석 키워드가 이미 매칭된 경우에는 AI 파싱을 건너뜀
  if (tool === "afterDebugFromCode" && normalizedQuery.length > 3 && !hasOverallAnalysis) {
    try {
      const intentPrompt = `User query: "${query}"

This query might contain typos. Please identify the most likely intent:
1. "loopCheck" - if related to loops, for/while statements, loop analysis
2. "traceVar" - if related to variable tracking, variable tracing  
3. "afterDebugFromCode" - if related to compilation, overall analysis, debugging, general inspection

IMPORTANT RULES:
- If the user says "검사해줘", "검사해", "검사", "분석해줘", "분석해", "분석" without specifying loops or variables, use "afterDebugFromCode"
- If the user mentions specific loops (for, while, do-while), use "loopCheck"
- If the user mentions variable tracking, tracing, pointers, arrays, structs, constants, values, or data analysis, use "traceVar"
- If the user mentions memory leaks or memory issues, use "afterDebugFromCode"
- For general code inspection, compilation, or debugging, use "afterDebugFromCode"

Consider common typos in Korean/English:
- 컴파일 variations: 컴퓨일, 컴팔일, 컴파, etc.
- 반복문 variations: 반보문, 반복믄, 반복, etc.
- 변수 variations: 변, 변주, 변스, etc.

Respond with only one word: loopCheck, traceVar, or afterDebugFromCode`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(intentPrompt);
      const aiTool = result.response.text().trim();
      
      if (['loopCheck', 'traceVar', 'afterDebugFromCode'].includes(aiTool)) {
        tool = aiTool;
      }
    } catch (err) {
      // AI 실패 시 기본값 유지
      console.log("AI 의도 파악 실패, 기본값 사용");
    }
  }
  
  let target = "all";
  let details: any = {};
  
  // 함수명 패턴 검사 (우선순위 높음)
  const functionPatterns = [
    /(\w+)\s*함수/i,
    /함수\s*(\w+)/i,
    /(\w+)\s*function/i,
    /function\s*(\w+)/i
  ];
  
  for (const pattern of functionPatterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const functionName = match[1];
      target = "function";
      details.functionName = functionName;
      break;
    }
  }
  
  // 줄 번호 패턴 검사 (더 구체적으로 - "줄" 키워드가 반드시 포함되어야 함)
  const linePatterns = [
    /(\d+)\s*번째\s*줄/i,  // "16번째 줄"
    /(\d+)\s*줄/i,         // "16줄"  
    /줄\s*(\d+)/i,         // "줄 16"
    /line\s*(\d+)/i,       // "line 16"
    /(\d+)\s*line/i        // "16 line"
  ];
  
  if (target === "all") { // 함수 패턴이 없을 때만
    for (const pattern of linePatterns) {
      const match = normalizedQuery.match(pattern);
      if (match) {
        const lineNumber = parseInt(match[1]);
        target = "line";
        details.lineNumber = lineNumber;
        break;
      }
    }
  }
  
  // 반복문 순서 패턴 검사 (함수/줄 번호 패턴이 없을 때만)
  if (target === "all") {
    const numberPatterns = [
      /(\d+)\s*번째\s*반복문/i,  // "16번째 반복문" (가장 명확)
      /반복문\s*(\d+)/i,         // "반복문 16"
      /(\d+)\s*번째/i,           // "16번째" (반복문 컨텍스트에서)
      /번째\s*(\d+)/i,           // "번째 16"
      /(\d+)\s*번/i,             // "16번"
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
      // "만" 키워드가 있으면 해당 타입만 검사
      if (normalizedQuery.includes('만') || normalizedQuery.includes('only')) {
        target = "specific";
      } else if (target === "all") {
        target = "specific";
      }
      details.loopType = pattern.loopType;
      break;
    }
  }
  
  // 검사/분석 관련 키워드가 있으면 loopCheck로 설정 (우선순위 높음)
  const inspectionKeywords = [
    '검사', '검사해', '검사해줘', '분석', '분석해', '분석해줘', '체크', '체크해', '체크해줘',
    '확인', '확인해', '확인해줘', '점검', '점검해', '점검해줘', '리뷰', '리뷰해', '리뷰해줘'
  ];
  
  if (flexibleMatch(normalizedQuery, inspectionKeywords) && tool === "afterDebugFromCode") {
    // 검사/분석 키워드가 있고 아직 도구가 결정되지 않았다면 loopCheck로 설정
    if (flexibleMatch(normalizedQuery, [
      '반복문', '루프', 'loop', 'for문', 'while문', 'do-while', '포문', '와일문', 'dowhile', '두와일',
      '반복', '반복믄', '루프문', '룹', '포', '와일', '두와일문', 'for', 'while', 'do', 'dowhile', 'do-while'
    ])) {
      tool = "loopCheck";
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
  try {
    const [, , filePath, ...queryParts] = process.argv;
    const userQuery = queryParts.join(" ").trim();

    if (!filePath || !userQuery) {
      console.error('Usage: debug <filePath> "<natural language query>"');
      process.exit(1);
    }

    // API 키 검증
    if (!process.env.GEMINI_API_KEY) {
      console.error("[Error] GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
      process.exit(1);
    }

    // 파일 경로 검증
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      console.error(`[Error] 파일을 찾을 수 없습니다: ${absolutePath}`);
      process.exit(1);
    }
    
    // 파일명 추출 (확장자 포함)
    const fileName = path.basename(filePath);

    // 파일 읽기
    let code: string;
    try {
      code = fs.readFileSync(absolutePath, "utf-8");
      if (!code || code.trim().length === 0) {
        console.error("[Error] 파일이 비어있습니다.");
        process.exit(1);
      }
    } catch (readError: any) {
      console.error(`[Error] 파일 읽기 실패: ${readError.message}`);
      process.exit(1);
    }

    //add or modify your homework function here !! @@@@@@@@@@@@@@@@@@
    try {
      const parsedIntents = await parseUserIntent(userQuery);
      let resultText = "";
      let actualTools: string[] = []; // 실제 실행된 도구들을 추적

      if (parsedIntents.isMultiple) {
        // 복합 요청인 경우 - 비교 요청인지 확인
        const isComparison =
          userQuery.includes("비교") || userQuery.includes("차이");

        if (
          isComparison &&
          parsedIntents.intents.every((intent) => intent.tool === "loopCheck")
        ) {
          // 루프 비교 요청인 경우
          resultText = "루프 비교 기능이 제거되었습니다. 개별 루프 검사를 사용해주세요.";
          actualTools.push("loopCheck");
        } else {
          // 일반적인 복수 요청 처리
          for (let i = 0; i < parsedIntents.intents.length; i++) {
            const intent = parsedIntents.intents[i];
            let sectionResult = "";

            if (intent.tool === "loopCheck") {
              const result = await loopCheck({
                code,
                target: intent.target,
                details: intent.details,
              });
              sectionResult = result.result ?? "";
              actualTools.push("loopCheck");
            } else if (intent.tool === "afterDebugFromCode") {
              // afterDebugFromCode 직접 호출
              resultText = await runAfterDebug(code, userQuery, fileName);
              actualTools.push("afterDebugFromCode");
            } else if (intent.tool === "traceVar") {
              const result = await traceVar({ code, userQuery: userQuery });
              sectionResult = result.variableTrace ?? "";
              actualTools.push("traceVar");
            }

            resultText += `\n=== 요청 ${i + 1}: ${intent.tool} (${intent.target || "all"}) ===\n${sectionResult}\n`;
          }
        }
      } else {
        // 단일 요청 처리
        const intent = parsedIntents.intents[0];
        if (intent.tool === "loopCheck") {
          const result = await loopCheck({
            code,
            target: intent.target,
            details: intent.details,
          });
          resultText = result.result ?? "";
          actualTools.push("loopCheck");
        } else if (intent.tool === "afterDebugFromCode") {
          // afterDebugFromCode 직접 호출
          resultText = await runAfterDebug(code, userQuery, fileName);
          actualTools.push("afterDebugFromCode");
        } else if (intent.tool === "traceVar") {
          const result = await traceVar({ code, userQuery: userQuery });
          resultText = result.variableTrace ?? "";
          actualTools.push("traceVar");
        }
      }

      const toolNames = parsedIntents.intents
        .map((intent) => intent.tool)
        .join(", ");
      const actualToolNames = actualTools.join(", ");
      // console.log("\n선택된 함수(테스트용) : ", toolNames);
      // console.log("실제 실행된 함수(테스트용) : ", actualToolNames);
      console.log(resultText);
    } catch (err: any) {
      console.error("[Error] 처리 중 오류 발생: ", err.message || err);
    }
  } catch (err: any) {
    console.error("[Error] 초기화 중 오류 발생: ", err.message || err);
  }
}

// 프로그램 종료 시 정리 작업
process.on('exit', () => {
  // 정리 작업
});

process.on('SIGINT', () => {
  process.exit(0);
});

main();
