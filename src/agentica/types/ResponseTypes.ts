// ResponseTypes.ts - 응답 관련 타입 정의

/**
 * 기본 응답 인터페이스
 */
export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: Date;
  requestId?: string;
}

/**
 * 성공 응답
 */
export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  executionTime?: number;
}

/**
 * 실패 응답
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  suggestions?: string[];
}

/**
 * AI 분석 응답
 */
export interface AIAnalysisResponse extends BaseResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  suggestions: string[];
  model: string;
  processingTime: number;
  tokensUsed?: number;
  error?: string;
}

/**
 * 컴파일 응답
 */
export interface CompileResponse extends BaseResponse {
  success: boolean;
  output?: string;
  errors: CompileError[];
  warnings: CompileWarning[];
  executionResult?: ExecutionResult;
  compileTime: number;
}

/**
 * 컴파일 에러
 */
export interface CompileError {
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'fatal';
  file?: string;
}

/**
 * 컴파일 경고
 */
export interface CompileWarning {
  line: number;
  column: number;
  message: string;
  code: string;
  file?: string;
}

/**
 * 실행 결과
 */
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsage?: number;
  signals?: string[];
}

/**
 * 루프 분석 응답
 */
export interface LoopAnalysisResponse extends BaseResponse {
  success: boolean;
  loopCount: number;
  loops: LoopInfo[];
  issues: LoopIssue[];
  suggestions: string[];
  analysisMethod: 'pattern' | 'ai' | 'hybrid';
}

/**
 * 루프 정보
 */
export interface LoopInfo {
  id: string;
  type: 'for' | 'while' | 'do-while';
  startLine: number;
  endLine: number;
  code: string;
  condition: string;
  body: string;
  nestingLevel: number;
  hierarchicalNumber: string;
}

/**
 * 루프 문제점
 */
export interface LoopIssue {
  loopId: string;
  type: 'infinite' | 'inefficient' | 'potential_bug' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  line: number;
  confidence: number;
}

/**
 * 변수 추적 응답
 */
export interface VariableTraceResponse extends BaseResponse {
  success: boolean;
  variableName: string;
  traces: VariableTrace[];
  summary: string;
  analysisMethod: 'static' | 'ai' | 'hybrid';
}

/**
 * 변수 추적 정보
 */
export interface VariableTrace {
  line: number;
  operation: 'declaration' | 'assignment' | 'usage' | 'modification' | 'scope_start' | 'scope_end';
  value?: any;
  context: string;
  type?: string;
  scope?: string;
}

/**
 * 파일 분석 응답
 */
export interface FileAnalysisResponse extends BaseResponse {
  success: boolean;
  fileInfo: FileInfo;
  analysis: AnalysisResult;
  suggestions: string[];
}

/**
 * 파일 정보
 */
export interface FileInfo {
  path: string;
  size: number;
  lineCount: number;
  functionCount: number;
  variableCount: number;
  lastModified: Date;
}

/**
 * 분석 결과
 */
export interface AnalysisResult {
  complexityScore: number;
  qualityScore: number;
  issues: AnalysisIssue[];
  metrics: AnalysisMetrics;
}

/**
 * 분석 문제점
 */
export interface AnalysisIssue {
  type: 'syntax' | 'logic' | 'style' | 'performance' | 'security' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  confidence: number;
}

/**
 * 분석 메트릭
 */
export interface AnalysisMetrics {
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeDuplication: number;
  testCoverage?: number;
}

/**
 * 배치 처리 응답
 */
export interface BatchResponse<T = any> extends BaseResponse {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    data?: T;
    error?: string;
    processingTime: number;
  }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
  totalProcessingTime: number;
}

/**
 * 진행 상황 응답
 */
export interface ProgressResponse extends BaseResponse {
  success: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
    stage: string;
    estimatedTimeRemaining?: number;
  };
  partialResults?: any[];
}

/**
 * 캐시 응답
 */
export interface CacheResponse<T = any> extends BaseResponse {
  success: boolean;
  data: T;
  cached: boolean;
  cacheAge: number;
  cacheKey: string;
}

/**
 * 검증 응답
 */
export interface ValidationResponse extends BaseResponse {
  success: boolean;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 검증 에러
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * 검증 경고
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
}
