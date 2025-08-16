/**
 * ErrorHandler - 에러 처리 및 로깅 유틸리티
 * 애플리케이션 전체에서 발생하는 에러를 일관되게 처리하고 로깅합니다.
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  API = 'api',
  COMPILATION = 'compilation',
  RUNTIME = 'runtime',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  stack?: string;
  context?: Record<string, any>;
  originalError?: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    suggestion?: string;
    timestamp: string;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize: number = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 에러를 처리하고 로깅합니다.
   * @param error 에러 객체 또는 메시지
   * @param category 에러 카테고리
   * @param severity 에러 심각도
   * @param context 추가 컨텍스트 정보
   * @returns ErrorInfo 객체
   */
  handleError(
    error: any,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: this.extractErrorMessage(error),
      code: this.extractErrorCode(error),
      severity,
      category,
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      originalError: error
    };

    this.logError(errorInfo);
    this.consoleError(errorInfo);

    return errorInfo;
  }

  /**
   * API 에러를 처리합니다.
   * @param error API 에러
   * @param context 추가 컨텍스트
   * @returns ErrorInfo 객체
   */
  handleAPIError(error: any, context?: Record<string, any>): ErrorInfo {
    let severity = ErrorSeverity.MEDIUM;
    let message = this.extractErrorMessage(error);

    // API 에러 타입별 처리
    if (error.response) {
      const status = error.response.status;
      
      if (status === 400) {
        if (error.response.data?.error?.details?.some((d: any) => d.reason === "API_KEY_INVALID")) {
          message = "[API Key Error]: 유효하지 않은 API 키입니다";
          severity = ErrorSeverity.CRITICAL;
        } else {
          message = "[API Error]: 잘못된 요청입니다";
          severity = ErrorSeverity.MEDIUM;
        }
      } else if (status === 429) {
        message = "[API Error]: 요청 한도를 초과했습니다";
        severity = ErrorSeverity.MEDIUM;
      } else if (status >= 500) {
        message = `[API Error]: 서버 오류 (${status})`;
        severity = ErrorSeverity.HIGH;
      }
    } else if (error.message?.includes("Network Error")) {
      message = "[API Error]: 네트워크 오류가 발생했습니다";
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message?.includes("timeout")) {
      message = "[API Error]: 요청 시간이 초과되었습니다";
      severity = ErrorSeverity.MEDIUM;
    }

    return this.handleError(error, ErrorCategory.API, severity, context);
  }

  /**
   * 컴파일 에러를 처리합니다.
   * @param error 컴파일 에러
   * @param context 추가 컨텍스트
   * @returns ErrorInfo 객체
   */
  handleCompilationError(error: any, context?: Record<string, any>): ErrorInfo {
    let severity = ErrorSeverity.MEDIUM;
    let message = this.extractErrorMessage(error);

    if (error.message?.includes("syntax error")) {
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message?.includes("undefined reference")) {
      severity = ErrorSeverity.HIGH;
    } else if (error.message?.includes("segmentation fault")) {
      severity = ErrorSeverity.CRITICAL;
    }

    return this.handleError(error, ErrorCategory.COMPILATION, severity, context);
  }

  /**
   * 런타임 에러를 처리합니다.
   * @param error 런타임 에러
   * @param context 추가 컨텍스트
   * @returns ErrorInfo 객체
   */
  handleRuntimeError(error: any, context?: Record<string, any>): ErrorInfo {
    let severity = ErrorSeverity.HIGH;
    let message = this.extractErrorMessage(error);

    if (error.message?.includes("infinite loop")) {
      severity = ErrorSeverity.HIGH;
    } else if (error.message?.includes("memory leak")) {
      severity = ErrorSeverity.CRITICAL;
    } else if (error.message?.includes("timeout")) {
      severity = ErrorSeverity.MEDIUM;
    }

    return this.handleError(error, ErrorCategory.RUNTIME, severity, context);
  }

  /**
   * 검증 에러를 처리합니다.
   * @param error 검증 에러
   * @param context 추가 컨텍스트
   * @returns ErrorInfo 객체
   */
  handleValidationError(error: any, context?: Record<string, any>): ErrorInfo {
    return this.handleError(error, ErrorCategory.VALIDATION, ErrorSeverity.LOW, context);
  }

  /**
   * 에러 응답을 생성합니다.
   * @param errorInfo 에러 정보
   * @param suggestion 제안사항
   * @returns ErrorResponse 객체
   */
  createErrorResponse(errorInfo: ErrorInfo, suggestion?: string): ErrorResponse {
    return {
      success: false,
      error: {
        message: errorInfo.message,
        code: errorInfo.code,
        severity: errorInfo.severity,
        category: errorInfo.category,
        suggestion,
        timestamp: errorInfo.timestamp.toISOString()
      }
    };
  }

  /**
   * 사용자 친화적인 에러 메시지를 생성합니다.
   * @param errorInfo 에러 정보
   * @returns 사용자 친화적인 메시지
   */
  createUserFriendlyMessage(errorInfo: ErrorInfo): string {
    const { category, severity, message } = errorInfo;
    
    let prefix = '';
    let suggestion = '';

    switch (category) {
      case ErrorCategory.API:
        prefix = '[API 오류]';
        if (severity === ErrorSeverity.CRITICAL) {
          suggestion = 'API 키를 확인하고 다시 시도해주세요.';
        } else if (severity === ErrorSeverity.HIGH) {
          suggestion = '잠시 후 다시 시도해주세요.';
        } else {
          suggestion = '요청을 확인하고 다시 시도해주세요.';
        }
        break;
      
      case ErrorCategory.COMPILATION:
        prefix = '[컴파일 오류]';
        suggestion = '코드 문법을 확인하고 수정해주세요.';
        break;
      
      case ErrorCategory.RUNTIME:
        prefix = '[런타임 오류]';
        suggestion = '코드 로직을 확인하고 수정해주세요.';
        break;
      
      case ErrorCategory.NETWORK:
        prefix = '[네트워크 오류]';
        suggestion = '인터넷 연결을 확인하고 다시 시도해주세요.';
        break;
      
      default:
        prefix = '[오류]';
        suggestion = '문제가 지속되면 관리자에게 문의해주세요.';
    }

    return `${prefix} ${message}\n[제안] ${suggestion}`;
  }

  /**
   * 에러 로그를 가져옵니다.
   * @param filter 필터 옵션
   * @returns 필터링된 에러 로그
   */
  getErrorLog(filter?: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    since?: Date;
    limit?: number;
  }): ErrorInfo[] {
    let filtered = [...this.errorLog];

    if (filter?.category) {
      filtered = filtered.filter(e => e.category === filter.category);
    }

    if (filter?.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }

    if (filter?.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * 에러 로그를 정리합니다.
   * @param maxAge 최대 보관 기간 (밀리초)
   * @returns 정리된 로그 수
   */
  cleanupErrorLog(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = new Date(Date.now() - maxAge);
    const initialSize = this.errorLog.length;
    
    this.errorLog = this.errorLog.filter(error => error.timestamp >= cutoff);
    
    return initialSize - this.errorLog.length;
  }

  /**
   * 에러 통계를 반환합니다.
   * @returns 에러 통계 정보
   */
  getErrorStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number; // 최근 1시간
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const byCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>;
    const bySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;
    
    // 초기화
    (Object as any).values(ErrorCategory).forEach((cat: ErrorCategory) => {
      byCategory[cat] = 0;
    });
    (Object as any).values(ErrorSeverity).forEach((sev: ErrorSeverity) => {
      bySeverity[sev] = 0;
    });
    
    let recent = 0;
    
    this.errorLog.forEach(error => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
      
      if (error.timestamp >= oneHourAgo) {
        recent++;
      }
    });

    return {
      total: this.errorLog.length,
      byCategory,
      bySeverity,
      recent
    };
  }

  /**
   * 에러를 로그에 추가합니다.
   * @param errorInfo 에러 정보
   */
  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);
    
    // 로그 크기 제한
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * 에러를 콘솔에 출력합니다.
   * @param errorInfo 에러 정보
   */
  private consoleError(errorInfo: ErrorInfo): void {
    const { severity, category, message, timestamp } = errorInfo;
    
    const logMessage = `[${timestamp.toISOString()}] [${severity.toUpperCase()}] [${category.toUpperCase()}] ${message}`;
    
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage);
        break;
      case ErrorSeverity.LOW:
        console.log(logMessage);
        break;
    }
  }

  /**
   * 에러 객체에서 메시지를 추출합니다.
   * @param error 에러 객체
   * @returns 에러 메시지
   */
  private extractErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    } else if (typeof error === 'string') {
      return error;
    } else if (error?.message) {
      return error.message;
    } else if (error?.error) {
      return error.error;
    } else {
      return String(error) || '알 수 없는 오류가 발생했습니다';
    }
  }

  /**
   * 에러 객체에서 코드를 추출합니다.
   * @param error 에러 객체
   * @returns 에러 코드
   */
  private extractErrorCode(error: any): string | undefined {
    if (error?.code) {
      return error.code;
    } else if (error?.response?.status) {
      return `HTTP_${error.response.status}`;
    } else if (error?.name) {
      return error.name;
    }
    return undefined;
  }
}

// 기본 인스턴스 (싱글톤)
export const errorHandler = ErrorHandler.getInstance();

// 기존 코드와의 호환성을 위한 함수들
export function handleError(error: any, category?: ErrorCategory, severity?: ErrorSeverity, context?: Record<string, any>): ErrorInfo {
  return errorHandler.handleError(error, category, severity, context);
}

export function handleAPIError(error: any, context?: Record<string, any>): ErrorInfo {
  return errorHandler.handleAPIError(error, context);
}

export function createErrorResponse(errorInfo: ErrorInfo, suggestion?: string): ErrorResponse {
  return errorHandler.createErrorResponse(errorInfo, suggestion);
}
