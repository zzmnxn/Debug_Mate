/**
 * 컴파일러 실행 결과를 종합한 최종 결과 인터페이스
 * 
 * afterDebug 시스템에서 사용하는 핵심 데이터 구조로, 컴파일과 실행의 모든 정보를 담습니다.
 * 이 구조체는 AI 분석의 입력 데이터로 사용됩니다.
 */
export interface CompilerResult {
    /** 전체적인 성공/실패 여부 (컴파일 성공 && 런타임 크래시 없음) */
    success: boolean;
    /** 파싱된 컴파일러 에러 목록 */
    errors: CompilerError[];
    /** 파싱된 컴파일러 경고 목록 */
    warnings: CompilerWarning[];
    /** 프로그램 실행 결과 (실행된 경우에만 존재) */
    executionResult?: ExecutionResult;
    /** 원본 컴파일러/실행 출력 문자열 (디버깅용) */
    rawOutput: string;
  }
  
  /**
   * 컴파일러 에러 정보를 구조화한 인터페이스
   */
  export interface CompilerError {
    /** 에러가 발생한 파일명 (예: "main.c") */
    file?: string;
    /** 에러가 발생한 라인 번호 (1부터 시작) */
    line?: number;
    /** 에러가 발생한 컬럼 번호 (1부터 시작) */
    column?: number;
    /** 에러 유형 분류 (AI 분석에 활용) */
    type: 'syntax' | 'semantic' | 'linker' | 'runtime' | 'unknown';
    /** 에러 심각도 (error: 일반 에러, fatal: 치명적 에러) */
    severity: 'error' | 'fatal';
    /** 컴파일러가 출력한 원본 에러 메시지 */
    message: string;
    /** 에러 코드 (예: "-Wunused-variable", "E1234") */
    code?: string;
  }
  
  /**
   * 컴파일러 경고 정보를 구조화한 인터페이스
   */
  export interface CompilerWarning {
    /** 경고가 발생한 파일명 */
    file?: string;
    /** 경고가 발생한 라인 번호 */
    line?: number;
    /** 경고가 발생한 컬럼 번호 */
    column?: number;
    /** 경고 유형 분류 (코드 품질 분석에 활용) */
    type: 'unused' | 'deprecated' | 'performance' | 'style' | 'unknown';
    /** 컴파일러가 출력한 원본 경고 메시지 */
    message: string;
    /** 경고 코드 (예: "-Wunused-variable") */
    code?: string;
  }
  
  /**
   * 프로그램 실행 결과 정보 인터페이스
   */
  export interface ExecutionResult {
    /** 프로그램 종료 코드 (0: 정상 종료, 그 외: 비정상 종료) */
    exitCode: number;
    /** 표준 출력 내용 */
    stdout?: string;
    /** 표준 에러 출력 내용 (런타임 에러 메시지 포함) */
    stderr?: string;
    /** 프로그램이 시그널로 종료된 경우 시그널 이름 (예: "SIGSEGV") */
    signal?: string;
    /** 프로그램이 비정상 종료(크래시)되었는지 여부 */
    crashed: boolean;
  }
  
  /**
   * 컴파일러 출력을 파싱하여 구조화된 결과로 변환하는 핵심 클래스
   * 주요 기능:
   * - GCC/Clang 스타일 에러/경고 메시지 파싱
   * - 런타임 크래시 감지 (segfault, 무한루프 등)
   * - 메모리 누수 감지 (AddressSanitizer 출력 분석)
   * - 위험한 타입 캐스팅 감지
   * - 결과 요약 생성
   */
  export class CompilerResultParser {
    /**
     * 런타임 에러를 나타내는 키워드 목록
     * 
     * 프로그램 실행 중 발생할 수 있는 다양한 런타임 에러 패턴을 정의합니다.
     * 이 키워드들이 출력에서 발견되면 프로그램이 크래시된 것으로 판단합니다.
     */
    private static readonly runtimeKeywords = [
      'segmentation fault',      // 세그멘테이션 폴트 (잘못된 메모리 접근)
      'core dumped',            // 코어 덤프 생성
      'floating point exception', // 부동소수점 예외 (0으로 나누기 등)
      'bus error',              // 버스 에러 (정렬되지 않은 메모리 접근)
      'stack overflow',         // 스택 오버플로우 (무한 재귀 등)
      'aborted',               // 프로그램 중단 (abort() 호출)
      'assertion failed',       // assert() 실패
      'division by zero',       // 0으로 나누기
      'runtime error',          // 일반적인 런타임 에러
      'undefined behavior',     // 정의되지 않은 동작
      'buffer overflow',        // 버퍼 오버플로우
      'null pointer dereference', // NULL 포인터 역참조
    ];
  
    /**
     * 컴파일러 출력을 파싱하여 CompilerResult 객체를 생성합니다.
     * 
     * @param rawOutput 컴파일러 출력 문자열
     * @returns 파싱된 컴파일 결과 객체
     */
    static parseCompilerOutput(rawOutput: string): CompilerResult {
      const lines = rawOutput.split('\n');
      const errors: CompilerError[] = [];
      const warnings: CompilerWarning[] = [];
      let executionResult: ExecutionResult | undefined;
  
      let success = true;
  
      const gccErrorPattern = /^(.+?):(\d+):(\d+):\s*(error|fatal error):\s*(.+)$/;
      const gccWarningPattern = /^(.+?):(\d+):(\d+):\s*warning:\s*(.+)$/;
  
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
  
        // GCC-style Error
        const errorMatch = gccErrorPattern.exec(trimmedLine);
        if (errorMatch) {
          success = false;
          const message = errorMatch[5];
          errors.push({
            file: errorMatch[1],
            line: parseInt(errorMatch[2]),
            column: parseInt(errorMatch[3]),
            severity: errorMatch[4].includes('fatal') ? 'fatal' : 'error',
            type: this.categorizeErrorType(message),
            message,
            code: this.extractCode(message),
          });
          continue;
        }
  
        // GCC-style Warning
        const warningMatch = gccWarningPattern.exec(trimmedLine);
        if (warningMatch) {
          const message = warningMatch[4];
          warnings.push({
            file: warningMatch[1],
            line: parseInt(warningMatch[2]),
            column: parseInt(warningMatch[3]),
            type: this.categorizeWarningType(message),
            message,
            code: this.extractCode(message),
          });
          continue;
        }
  
        // Memory leak detection
        if (/leak|memory leak|AddressSanitizer.*leak/i.test(trimmedLine)) {
          success = false;
          errors.push({
            type: 'runtime',
            severity: 'fatal',
            message: 'Memory leak detected by AddressSanitizer or log',
          });
        }
        // Dangerous cast detection
        if (/invalid cast|bad address|runtime error:.*cast|pointer.*from.*integer|dangerous cast|segmentation fault|SIGSEGV|bus error|dereference|invalid pointer|cannot access memory/i.test(trimmedLine)) {
          success = false;
          errors.push({
            type: 'runtime',
            severity: 'fatal',
            message: 'Dangerous type cast or invalid pointer usage detected',
          });
        }
        // Infinite loop detection (timeout)
        if (/execution timed out|possible infinite loop|loopcheck\(\)/i.test(trimmedLine)) {
          success = false;
          errors.push({
            type: 'runtime',
            severity: 'fatal',
            message: 'Infinite loop or intractable execution detected (timeout)',
          });
        }
        // Runtime crash detection (improved: extract line/col/message)
        for (const keyword of this.runtimeKeywords) {
          if (trimmedLine.toLowerCase().includes(keyword)) {
            success = false;
            if (!executionResult) executionResult = { exitCode: -1, crashed: true };
            executionResult.crashed = true;
            // Try to extract file, line, column, and message
            const runtimeRegex = /([^:]+):(\d+):(\d+): (runtime error|undefined behavior):? (.+)?/i;
            const match = runtimeRegex.exec(trimmedLine);
            if (match) {
              errors.push({
                file: match[1],
                line: parseInt(match[2]),
                column: parseInt(match[3]),
                type: 'runtime',
                severity: 'fatal',
                message: match[5] ? match[5].trim() : keyword,
              });
            } else {
              errors.push({
                type: 'runtime',
                severity: 'fatal',
                message: `Runtime error: ${keyword}`,
              });
            }
            break;
          }
        }
      }
  
      // Optional: sort errors/warnings by line
      //errors.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
      //warnings.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  
      return {
        success,
        errors,
        warnings,
        executionResult,
        rawOutput,
      };
    }
  
    private static categorizeErrorType(message: string): CompilerError['type'] {
      const lowerMsg = message.toLowerCase();
      
      // 직접적인 패턴 매칭으로 효율성 개선
      if (lowerMsg.includes('syntax') || lowerMsg.includes('expected') || 
          lowerMsg.includes('missing') || lowerMsg.includes('unexpected')) {
        return 'syntax';
      }
      
      if (lowerMsg.includes('undeclared') || lowerMsg.includes('undefined') || 
          lowerMsg.includes('not declared') || lowerMsg.includes('unknown')) {
        return 'semantic';
      }
      
      if (lowerMsg.includes('linker') || lowerMsg.includes('undefined reference') || 
          lowerMsg.includes('cannot find')) {
        return 'linker';
      }
      
      if (this.runtimeKeywords.some((kw: string) => lowerMsg.includes(kw))) {
        return 'runtime';
      }
      
      return 'unknown';
    }
  
    private static categorizeWarningType(message: string): CompilerWarning['type'] {
      const lowerMsg = message.toLowerCase();
      
      // 직접적인 패턴 매칭으로 효율성 개선
      if (lowerMsg.includes('unused') || lowerMsg.includes('not used')) {
        return 'unused';
      }
      
      if (lowerMsg.includes('deprecated') || lowerMsg.includes('obsolete')) {
        return 'deprecated';
      }
      
      if (lowerMsg.includes('performance') || lowerMsg.includes('optimization')) {
        return 'performance';
      }
      
      if (lowerMsg.includes('style') || lowerMsg.includes('format')) {
        return 'style';
      }
      
      return 'unknown';
    }
  
    private static extractCode(message: string): string | undefined {
      const match = message.match(/\[(\-W[^\]]+|\bE\d+)\]/);
      return match ? match[1] : undefined;
    }
  
    static generateSummary(result: CompilerResult): string {
      const parts = [];
  
      if (result.success) {
        parts.push('✅ 컴파일 성공');
      } else {
        parts.push('❌ 컴파일 실패');
      }
  
      if (result.errors.length > 0) {
        parts.push(`에러 ${result.errors.length}개`);
      }
  
      if (result.warnings.length > 0) {
        parts.push(`경고 ${result.warnings.length}개`);
      }
  
      if (result.executionResult?.crashed) {
        parts.push('프로그램 크래시');
      }
  
      return parts.join(', ');
    }
  }
  