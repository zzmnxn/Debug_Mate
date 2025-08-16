import { AgenticaRpcService as BaseAgenticaRpcService, IAgenticaRpcListener } from "@agentica/rpc";
import { AgenticaManager } from "./AgenticaManager";

export class AgenticaRpcService extends BaseAgenticaRpcService<"chatgpt"> {
  private agenticaManager: AgenticaManager;

  constructor(listener: IAgenticaRpcListener) {
    const agenticaManager = new AgenticaManager();

    super({
      agent: agenticaManager.agentica,
      listener: listener,
    });

    this.agenticaManager = agenticaManager;
  }

  // 사용자 정의 RPC 메서드들
  async getAvailableFunctions(): Promise<string[]> {
    return this.agenticaManager.getAvailableFunctions();
  }

  async processCustomRequest(request: any): Promise<any> {
    // 사용자 정의 요청 처리
    return await this.agenticaManager.processNaturalLanguageRequest(
      request.query,
      request.context
    );
  }

  // 기존 핸들러 함수들을 RPC로 노출
  async beforeDebug(props: { code: string }): Promise<any> {
    return await this.agenticaManager.callBeforeDebug(props.code);
  }

  async afterDebug(props: { code: string }): Promise<any> {
    return await this.agenticaManager.callAfterDebug(props.code);
  }

  async afterDebugFromCode(props: { code: string; originalFileName?: string }): Promise<any> {
    return await this.agenticaManager.callAfterDebugFromCode(props.code, props.originalFileName);
  }

  async loopCheck(props: { code: string; target?: string; details?: any }): Promise<any> {
    return await this.agenticaManager.callLoopCheck(props.code, props.target, props.details);
  }

  async traceVar(props: { code: string; userQuery: string }): Promise<any> {
    return await this.agenticaManager.callTraceVar(props.code, props.userQuery);
  }

  async markErrors(props: { originalFilePath: string; code: string; errors: any[]; warnings: any[] }): Promise<any> {
    return await this.agenticaManager.callMarkErrors(props.code, props.errors, props.warnings);
  }
} 