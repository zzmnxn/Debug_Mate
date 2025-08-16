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


/**
 * 1. afterDebug: 에러/경고 로그 + 요약을 받아 Gemini 분석 수행
 */
export async function afterDebug(logSummary: string, errors: CompilerError[], warnings: CompilerWarning[], executionOutput?: string): Promise<string> {
  try {
    // 1. 입력 검증
    if (!logSummary || typeof logSummary !== 'string' || logSummary.trim() === '') {
      throw new Error('Invalid logSummary: must be a non-empty string');
    }
    
    if (!Array.isArray(errors) || !Array.isArray(warnings)) {
      throw new Error('Invalid errors/warnings: must be arrays');
    }

    // 2. API 키 검증
    if (!SGlobal.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Please set it in your environment variables.');
    }

    // 3. 프롬프트 생성 (실행 결과 포함)
    const prompt = buildAfterDebugPrompt(logSummary, errors, warnings, executionOutput);
    
    // 4. 모델 초기화 및 타임아웃 설정
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.3, // 더 일관된 응답을 위해 낮은 온도 설정
        maxOutputTokens: 1000, // 응답 길이 제한
      }
    });

    // 5. API 호출 (타임아웃 포함)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('API request timed out after 1 seconds')), 10000);
    });

    const apiPromise = model.generateContent(prompt);
    const result = await Promise.race([apiPromise, timeoutPromise]) as any;

    // 6. 응답 검증
    if (!result || !result.response || !result.response.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = result.response.text().trim();
    
    // 7. 응답 형식 검증
    if (!responseText) {
      throw new Error('Empty response from Gemini API');
    }

    // 8. 응답 형식이 올바른지 확인
    const hasResult = /\[Result\]\s*[OX]/.test(responseText);
    const hasReason = /\[Reason\]/.test(responseText);
    const hasSuggestion = /\[Suggestion\]/.test(responseText);

    if (!hasResult || !hasReason || !hasSuggestion) {
      console.warn(' AI 응답이 예상 형식과 다릅니다. 원본 응답을 반환합니다.');
      return `[Result] X\n[Reason] AI 응답 형식 오류 - 원본 응답: ${responseText.substring(0, 200)}...\n[Suggestion] 시스템 관리자에게 문의하세요.`;
    }

    return responseText;

  } catch (error: any) {
    // 9. 상세한 에러 처리
    let errorMessage = 'Unknown error occurred';
    
    if (error.message.includes('API_KEY')) {
      errorMessage = 'Gemini API 키가 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 확인해주세요.';
    } else if (error.message.includes('timed out')) {
      errorMessage = 'API 요청이 시간 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      errorMessage = 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.';
    } else {
      errorMessage = `분석 중 오류가 발생했습니다: ${error.message}`;
    }

    console.error(' afterDebug 에러:', error);
    
    return `[Result] X\n[Reason] ${errorMessage}\n[Suggestion] 시스템 오류로 인해 분석을 완료할 수 없습니다. 잠시 후 다시 시도해주세요.`;
  }
}