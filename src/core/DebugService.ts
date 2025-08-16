import { CompilerError, CompilerWarning } from '../parsers/CompilerResultParser';
import { LoopAnalysisService } from './LoopAnalysisService';
import { VariableTraceService } from './VariableTraceService';
import { CompilationService } from './CompilationService';
import { markErrors } from '../utils/CodeMarker';

export class ErrorDiagnosisService {
  private loops = new LoopAnalysisService();
  private vars = new VariableTraceService();
  private compile = new CompilationService();

  /**
   * 기존: loopCheck({ code })
   * 리팩토링: LoopAnalysisService.check({ code, target: 'all' })
   */
  async loopCheck({ code }: { code: string }) {
    return this.loops.check({ code, target: 'all' });
  }

  /**
   * 기존: traceVar({ code, userQuery })
   * 리팩토링: VariableTraceService.traceVar({ code, userQuery })
   */
  async traceVar({ code, userQuery }: { code: string; userQuery: string }) {
    return this.vars.traceVar({ code, userQuery });
  }

  /**
   * 기존: afterDebugFromCode({ code, originalFileName? })
   * 리팩토링: CompilationService.compileAndAnalyzeFromCode(code, originalFileName?)
   * 반환: { analysis, markedFilePath, executionOutput? }
   */
  async afterDebugFromCode({
    code,
    originalFileName,
  }: {
    code: string;
    originalFileName?: string;
  }) {
    return this.compile.compileAndAnalyzeFromCode(code, originalFileName);
  }

  /**
   * 기존: markErrors({ originalFilePath, code, errors, warnings })
   * 리팩토링: utils/CodeMarker.markErrors(...)
   * 주의: aiAnalysis 인자는 선택이며, 대개 compileAndAnalyzeFromCode 내부에서 처리
   */
  async markErrors({
    originalFilePath,
    code,
    errors,
    warnings,
    aiAnalysis,
  }: {
    originalFilePath: string;
    code: string;
    errors: CompilerError[];
    warnings: CompilerWarning[];
    aiAnalysis?: string;
  }) {
    return markErrors(originalFilePath, code, errors, warnings, aiAnalysis);
  }

  /**
   * 기존: beforeDebug({ code })
   * 리팩토링: CompilationService.beforeDebug(code)
   */
  async beforeDebug({ code }: { code: string }) {
    return this.compile.beforeDebug(code);
  }
}
