// DebugTypes.ts - 디버깅 관련 타입 정의

/**
 * 컴파일러 에러 정보
 */
export interface CompilerError {
  type: 'compile' | 'runtime';
  severity: 'error' | 'warning' | 'fatal';
  message: string;
  line?: number;
  column?: number;
  file?: string;
  code?: string;
}

/**
 * 컴파일러 경고 정보
 */
export interface CompilerWarning {
  type: 'compile' | 'runtime';
  message: string;
  line?: number;
  column?: number;
  file?: string;
  code?: string;
}

/**
 * 디버깅 결과
 */
export interface DebugResult {
  success: boolean;
  message: string;
  errors: CompilerError[];
  warnings: CompilerWarning[];
  suggestions: string[];
  executionTime?: number;
  memoryUsage?: number;
}

/**
 * 루프 분석 결과
 */
export interface LoopAnalysisResult {
  loopCount: number;
  loops: LoopInfo[];
  issues: LoopIssue[];
  suggestions: string[];
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
}

/**
 * 루프 문제점
 */
export interface LoopIssue {
  loopId: string;
  type: 'infinite' | 'inefficient' | 'potential_bug';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  line: number;
}

/**
 * 변수 추적 결과
 */
export interface VariableTraceResult {
  variableName: string;
  traces: VariableTrace[];
  summary: string;
}

/**
 * 변수 추적 정보
 */
export interface VariableTrace {
  line: number;
  operation: 'declaration' | 'assignment' | 'usage' | 'modification';
  value?: any;
  context: string;
}

/**
 * 컴파일 설정
 */
export interface CompileConfig {
  compiler: 'gcc' | 'clang' | 'msvc';
  flags: string[];
  optimization: 'none' | 'basic' | 'aggressive';
  warnings: 'none' | 'basic' | 'all';
  sanitizers: string[];
}

/**
 * 디버깅 세션 정보
 */
export interface DebugSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  filePath: string;
  query: string;
  results: DebugResult[];
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

export interface BeforeDebugResult {
  result: string;
}

export interface InProgressRunConfig {
  targetFile: string;
  code: string;
  userInput?: string;
}

/**
 * AI 분석 요청
 */
export interface AIAnalysisRequest {
  code: string;
  context: string;
  query: string;
  options: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

/**
 * AI 분석 응답
 */
export interface AIAnalysisResponse {
  success: boolean;
  analysis: string;
  confidence: number;
  suggestions: string[];
  error?: string;
}

/**
 * 파일 분석 결과
 */
export interface FileAnalysisResult {
  filePath: string;
  fileSize: number;
  lineCount: number;
  functionCount: number;
  variableCount: number;
  complexityScore: number;
  qualityScore: number;
  issues: AnalysisIssue[];
}

/**
 * 분석 문제점
 */
export interface AnalysisIssue {
  type: 'syntax' | 'logic' | 'style' | 'performance' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

/**
 * 디버깅 통계
 */
export interface DebugStatistics {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  averageExecutionTime: number;
  mostCommonIssues: Array<{
    issue: string;
    count: number;
  }>;
  performanceMetrics: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}
