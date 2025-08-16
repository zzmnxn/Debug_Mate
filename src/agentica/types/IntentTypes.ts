// IntentTypes.ts - 의도 파싱 관련 타입 정의

/**
 * 사용자 의도 파싱 결과
 */
export interface ParsedIntent {
  tool: string;
  target?: string;
  details?: Record<string, any>;
  confidence: number;
  rawQuery: string;
}

/**
 * 복수 명령어 처리 결과
 */
export interface MultipleIntents {
  intents: ParsedIntent[];
  isMultiple: boolean;
  relationship?: 'comparison' | 'sequence' | 'parallel';
}

/**
 * 사용 가능한 도구들
 */
export type AvailableTool = 
  | 'loopCheck' 
  | 'traceVar' 
  | 'afterDebugFromCode' 
  | 'beforeDebug' 
  | 'inProgressDebug';

/**
 * 타겟 타입들
 */
export type TargetType = 
  | 'all' 
  | 'first' 
  | 'second' 
  | 'third' 
  | 'fourth' 
  | 'fifth' 
  | 'last' 
  | 'specific' 
  | 'function' 
  | 'line' 
  | 'variable' 
  | 'loop';

/**
 * 루프 타입들
 */
export type LoopType = 'for' | 'while' | 'do-while' | 'nested' | 'any';

/**
 * 변수 타입들
 */
export type VariableType = 
  | 'int' 
  | 'float' 
  | 'double' 
  | 'char' 
  | 'pointer' 
  | 'array' 
  | 'struct' 
  | 'union' 
  | 'enum' 
  | 'any';

/**
 * 의도 파싱 컨텍스트
 */
export interface IntentContext {
  codeLanguage: 'c' | 'cpp' | 'cuda' | 'other';
  fileExtension: string;
  codeSize: number;
  hasLoops: boolean;
  hasFunctions: boolean;
  hasVariables: boolean;
  previousQueries: string[];
}

/**
 * 의도 파싱 옵션
 */
export interface IntentParsingOptions {
  enableAI: boolean;
  enableFuzzyMatching: boolean;
  enableContextAnalysis: boolean;
  maxRetries: number;
  timeout: number;
  confidenceThreshold: number;
}

/**
 * 의도 파싱 결과 메타데이터
 */
export interface IntentMetadata {
  parsingMethod: 'rule-based' | 'ai-based' | 'hybrid';
  processingTime: number;
  confidence: number;
  fallbackUsed: boolean;
  suggestions: string[];
}

/**
 * 의도 파싱 에러
 */
export interface IntentParsingError {
  type: 'invalid_query' | 'ambiguous_intent' | 'unsupported_tool' | 'ai_failure' | 'timeout';
  message: string;
  suggestion: string;
  originalQuery: string;
}

/**
 * 의도 파싱 통계
 */
export interface IntentParsingStats {
  totalQueries: number;
  successfulParsings: number;
  failedParsings: number;
  averageConfidence: number;
  mostCommonTools: Array<{
    tool: string;
    count: number;
    percentage: number;
  }>;
  averageProcessingTime: number;
}

/**
 * 의도 파싱 히스토리
 */
export interface IntentHistory {
  timestamp: Date;
  query: string;
  parsedIntent: ParsedIntent;
  success: boolean;
  processingTime: number;
  metadata: IntentMetadata;
}

/**
 * 의도 파싱 설정
 */
export interface IntentParsingConfig {
  defaultTool: AvailableTool;
  defaultTarget: TargetType;
  enableLearning: boolean;
  enableSuggestions: boolean;
  maxHistorySize: number;
  confidenceThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}
