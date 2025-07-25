export interface CompilerResult {
    success: boolean;
    errors: CompilerError[];
    warnings: CompilerWarning[];
    executionResult?: ExecutionResult;
    rawOutput: string;
  }
  
  export interface CompilerError {
    file?: string;
    line?: number;
    column?: number;
    type: 'syntax' | 'semantic' | 'linker' | 'runtime' | 'unknown';
    severity: 'error' | 'fatal';
    message: string;
    code?: string;
  }
  
  export interface CompilerWarning {
    file?: string;
    line?: number;
    column?: number;
    type: 'unused' | 'deprecated' | 'performance' | 'style' | 'unknown';
    message: string;
    code?: string;
  }
  
  export interface ExecutionResult {
    exitCode: number;
    stdout?: string;
    stderr?: string;
    signal?: string;
    crashed: boolean;
  }
  
  export class CompilerResultParser {
    private static readonly runtimeKeywords = [
      'segmentation fault',
      'core dumped',
      'floating point exception',
      'bus error',
      'stack overflow',
      'aborted',
      'assertion failed',
      'division by zero',
      'runtime error',
      'undefined behavior',
      'buffer overflow',
      'null pointer dereference',
    ];
  
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
  
      if (lowerMsg.includes('syntax') || lowerMsg.includes('expected') || lowerMsg.includes('missing') || lowerMsg.includes('unexpected')) {
        return 'syntax';
      }
  
      if (lowerMsg.includes('undeclared') || lowerMsg.includes('undefined') || lowerMsg.includes('not declared') || lowerMsg.includes('unknown')) {
        return 'semantic';
      }
  
      if (lowerMsg.includes('linker') || lowerMsg.includes('undefined reference') || lowerMsg.includes('cannot find')) {
        return 'linker';
      }
  
      if (this.runtimeKeywords.some((kw) => lowerMsg.includes(kw))) {
        return 'runtime';
      }
  
      return 'unknown';
    }
  
    private static categorizeWarningType(message: string): CompilerWarning['type'] {
      const lowerMsg = message.toLowerCase();
  
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
  