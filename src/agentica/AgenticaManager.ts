import { Agentica } from "@agentica/core";
import OpenAI from "openai";
import typia from "typia";
import { SGlobal } from "../config/SGlobal";
import { beforeDebug, afterDebug, afterDebugFromCode, loopCheck, traceVar, markErrors } from "./handlers";

// 기존 핸들러들을 Agentica 서비스로 래핑
export class DebugMateService {
  /**
   * 빠른 사전 분석
   */
  async beforeDebug(props: { code: string }) {
    return await beforeDebug(props);
  }

  /**
   * 컴파일 후 상세 분석
   */
  async afterDebug(props: { code: string; logSummary?: string; errors?: any[]; warnings?: any[]; executionOutput?: string }) {
    // 기본값 설정
    const logSummary = props.logSummary || "코드 분석 요청";
    const errors = props.errors || [];
    const warnings = props.warnings || [];
    const executionOutput = props.executionOutput;
    
    return await afterDebug(logSummary, errors, warnings, executionOutput);
  }

  /**
   * 코드에서 직접 디버깅
   */
  async afterDebugFromCode(props: { code: string; originalFileName?: string }) {
    return await afterDebugFromCode(props.code, props.originalFileName);
  }

  /**
   * 루프 구조 분석
   */
  async loopCheck(props: { code: string; target?: string; details?: any }) {
    return await loopCheck(props);
  }

  /**
   * 변수 추적
   */
  async traceVar(props: { code: string; userQuery: string }) {
    return await traceVar(props);
  }

  /**
   * 에러 마킹
   */
  async markErrors(props: { originalFilePath: string; code: string; errors: any[]; warnings: any[] }) {
    return await markErrors(props.originalFilePath, props.code, props.errors, props.warnings);
  }

  /**
   * 사용 가능한 함수 목록 반환
   */
  getAvailableFunctions() {
    return [
      "beforeDebug - 빠른 사전 분석",
      "afterDebug - 컴파일 후 상세 분석", 
      "afterDebugFromCode - 코드에서 직접 디버깅",
      "loopCheck - 루프 구조 분석",
      "traceVar - 변수 추적",
      "markErrors - 에러 마킹"
    ];
  }
}

export class AgenticaManager {
  public agentica: Agentica<"chatgpt">;
  private debugMateService: DebugMateService;

  constructor() {
    this.debugMateService = new DebugMateService();

    // OpenAI 클라이언트 설정
    const openai = new OpenAI({
      apiKey: SGlobal.env.OPENAI_API_KEY || "",
    });

    // Agentica 인스턴스 생성
    this.agentica = new Agentica({
      model: "chatgpt",
      vendor: {
        api: openai,
        model: SGlobal.env.MODEL || "gpt-4o-mini",
      },
      controllers: [
        {
          protocol: "class",
          name: "debugMateService",
          application: typia.llm.application<DebugMateService, "chatgpt">(),
          execute: this.debugMateService,
        },
      ],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.agentica.on("initialize", (event: any) => {
      console.log("Agentica 초기화 완료");
    });

    this.agentica.on("select", (event: any) => {
      console.log("함수 선택됨:", event.selectedFunctions);
    });

    this.agentica.on("execute", (event: any) => {
      console.log("함수 실행됨:", event.result);
    });
  }

  async processNaturalLanguageRequest(userQuery: string, context?: any) {
    try {
      // Agentica의 conversate 메서드 사용
      const result = await this.agentica.conversate(userQuery);
      return result;
    } catch (error) {
      console.error("Agentica 처리 실패:", error);
      throw error;
    }
  }

  getAvailableFunctions() {
    return this.debugMateService.getAvailableFunctions();
  }

  // 직접 함수 호출을 위한 메서드들
  async callBeforeDebug(code: string) {
    return await this.debugMateService.beforeDebug({ code });
  }

  async callAfterDebug(code: string) {
    return await this.debugMateService.afterDebug({ code });
  }

  async callAfterDebugFromCode(code: string, originalFileName?: string) {
    return await this.debugMateService.afterDebugFromCode({ code, originalFileName });
  }

  async callLoopCheck(code: string, target?: string, details?: any) {
    return await this.debugMateService.loopCheck({ code, target, details });
  }

  async callTraceVar(code: string, userQuery: string) {
    return await this.debugMateService.traceVar({ code, userQuery });
  }

  async callMarkErrors(code: string, errors: any[] = [], warnings: any[] = []) {
    return await this.debugMateService.markErrors({ 
      originalFilePath: "input.c", 
      code, 
      errors, 
      warnings 
    });
  }
} 