/**
 * AI 파싱 강화를 위한 프롬프트 생성
 */
export function buildEnhancedAIParsingPrompt(query: string, context: string = ""): string {
  return `You are an expert in analyzing natural language requests from users.
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
}

/**
 * 비교 요청 파싱을 위한 프롬프트 생성
 */
export function buildComparisonPrompt(query: string): string {
  return `Please extract exactly two targets that the user wants to compare from the following request. 
Consider typos and various expressions in your analysis.

User request (Korean): "${query}"

Example output format:
{"targets": ["첫번째 for문", "세번째 while문"], "isComparison": true}
{"targets": ["2번째 루프", "마지막 반복문"], "isComparison": true}

If there is only one target or if the targets are not clear:
{"targets": [], "isComparison": false}

Output JSON only:`;
}

/**
 * 의도 파악을 위한 프롬프트 생성
 */
export function buildIntentPrompt(query: string): string {
  return `User query: "${query}"

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
}
