import { IntentParser } from '../parsers/IntentParser';
import { LoopAnalysisService } from '../core/LoopAnalysisService';
import { CompilationService } from '../core/CompilationService';
import { VariableTraceService } from '../core/VariableTraceService';
import type { BeforeDebugArgs, BeforeDebugResult, HandleArgs } from '../types/DebugTypes';

export class DebugHandler {
  private loops = new LoopAnalysisService();
  private compile = new CompilationService();
  private vars = new VariableTraceService();

  /**
   * (선택 기능) 실행 전 사전 점검/정적 분석 결과를 반환.
   * - 기존 로직을 건드리지 않기 위해 "추가"만 함.
   * - index.ts 에서 --pre 플래그로 호출될 수 있음.
   */
  async beforeDebug({ code, fileName }: BeforeDebugArgs): Promise<BeforeDebugResult> {
    try {
      // 현재 컴파일/분석 파이프라인을 재사용 (기존 handle()에서도 쓰는 공개 API)
      const r = await this.compile.compileAndAnalyzeFromCode(code, fileName);
      const lines: string[] = [];
      if (r?.analysis) lines.push(r.analysis);
      if (r?.markedFilePath) lines.push(`[마킹된 코드 파일]: ${r.markedFilePath}`);
      return lines.join('\n').trim();
    } catch (e: any) {
      return `beforeDebug 실행 중 오류: ${e?.message ?? String(e)}`;
    }
  }

  async handle({ code, fileName, userQuery }: HandleArgs) {
    const parsed = await IntentParser.parseUserIntent(userQuery);
    let out = '';
    const isComparison = /비교|차이/.test(userQuery);

    if (parsed.isMultiple) {
      if (isComparison && parsed.intents.every(i => i.tool === 'loopCheck')) {
        return '루프 비교 기능이 제거되었습니다. 개별 루프 검사를 사용해주세요.';
      }
      for (let i = 0; i < parsed.intents.length; i++) {
        const intent = parsed.intents[i];
        let section = '';
        if (intent.tool === 'loopCheck') {
          const r = await this.loops.check({ code, target: intent.target, details: intent.details });
          section = r.result ?? '';
        } else if (intent.tool === 'afterDebugFromCode') {
          const r = await this.compile.compileAndAnalyzeFromCode(code, fileName);
          section = r.analysis + (r.markedFilePath ? `\n[마킹된 코드 파일]: ${r.markedFilePath}` : '');
        } else if (intent.tool === 'traceVar') {
          const r = await this.vars.traceVar({ code, userQuery });
          section = r.variableTrace ?? '';
        }
        out += `\n=== 요청 ${i + 1}: ${intent.tool} (${intent.target || 'all'}) ===\n${section}\n`;
      }
    } else {
      const intent = parsed.intents[0];
      if (intent.tool === 'loopCheck') {
        const r = await this.loops.check({ code, target: intent.target, details: intent.details });
        out = r.result ?? '';
      } else if (intent.tool === 'afterDebugFromCode') {
        const r = await this.compile.compileAndAnalyzeFromCode(code, fileName);
        out = r.analysis + (r.markedFilePath ? `\n[마킹된]()
