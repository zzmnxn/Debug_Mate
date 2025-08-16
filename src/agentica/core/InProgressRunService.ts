/**
 * InProgressRunService - 진행 중인 디버깅 실행 서비스
 * beforeDebug 실행 및 사용자 입력 처리, DebugAgent 실행을 담당합니다.
 */

import { readFileSync } from "fs";
import * as path from "path";
import { beforeDebug } from "../handlers/DebugHandler";
import { ProcessUtils, ProcessResult } from "../utils/ProcessUtils";
import { InputUtils, InputOptions } from "../utils/InputUtils";
import { errorHandler, ErrorCategory, ErrorSeverity } from "../utils/ErrorHandler";
import { InProgressRunConfig } from "../types/DebugTypes";

export class InProgressRunService {
  private targetFile: string;
  private code: string;

  constructor(config: InProgressRunConfig) {
    this.targetFile = config.targetFile;
    this.code = config.code;
  }

  /**
   * 메인 실행 로직
   */
  async run(): Promise<void> {
    try {
      // beforeDebug 실행 및 결과 출력
      await this.runBeforeDebug();

      // 입력받을 수 없는 환경이면 즉시 종료
      if (!process.stdin.isTTY) {
        console.log("TTY 환경이 아니므로 추가 디버깅 없이 종료합니다.");
        process.exit(0);
      }

      // 사용자 요청 받기
      const userInput = await this.getUserRequest();
      if (!userInput) {
        console.log("\n(빈 입력 감지) 추가 디버깅 없이 종료합니다.\n");
        process.exit(0);
      }

      // DebugAgent 실행
      await this.runDebugAgent(userInput);

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL,
        { targetFile: this.targetFile }
      );

      console.error("\n[Error] 실행 중 오류가 발생했습니다:", errorInfo.message);
      process.exit(1);
    }
  }

  /**
   * beforeDebug 실행 및 결과 출력
   */
  private async runBeforeDebug(): Promise<void> {
    try {
      console.log("\n================================");
      console.log("  *   beforeDebug 실행 중...   *  ");
      console.log("================================\n");

      const result = await beforeDebug({ code: this.code });

      console.log("\n================================");
      console.log("  *   beforeDebug 결과   *  ");
      console.log("================================\n");
      console.log(result.result);
      console.log("\n================================\n");

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        { context: 'beforeDebug execution' }
      );

      console.error("beforeDebug 실행 실패:", errorInfo.message);
      throw error;
    }
  }

  /**
   * 사용자 요청 입력 받기
   */
  private async getUserRequest(): Promise<string | null> {
    try {
      const inputOptions: InputOptions = {
        prompt: "\n요청 사항을 입력하시오 : ",
        timeout: 60000, // 1분 타임아웃
        allowEmpty: false,
        validator: (input: string) => {
          const trimmed = input.trim();
          if (!trimmed) {
            return "빈 입력은 허용되지 않습니다.";
          }
          return true;
        }
      };

      const inputResult = await InputUtils.getUserInput(inputOptions);

      if (!inputResult.success) {
        console.error("입력 오류:", inputResult.error);
        return null;
      }

      return inputResult.value;

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.MEDIUM,
        { context: 'user input collection' }
      );

      console.error("사용자 입력 처리 중 오류:", errorInfo.message);
      return null;
    }
  }

  /**
   * DebugAgent 실행
   */
  private async runDebugAgent(userRequest: string): Promise<void> {
    try {
      console.log("\nDebugAgent 실행 중...");

      const result = ProcessUtils.executeTypeScript(
        "src/agentica/DebugAgent.ts",
        [this.targetFile, userRequest],
        { stdio: 'inherit' }
      );

      if (!ProcessUtils.isSuccessful(result)) {
        const errorInfo = errorHandler.handleError(
          new Error(`DebugAgent 실행 실패: ${result.error || '알 수 없는 오류'}`),
          ErrorCategory.SYSTEM,
          ErrorSeverity.HIGH,
          { 
            targetFile: this.targetFile,
            userRequest,
            processResult: result
          }
        );

        console.error("\n[Error] DebugAgent 실행 실패:", errorInfo.message);
        process.exit(1);
      }

      // 자식 프로세스의 종료 코드를 그대로 반영
      const exitCode = result.exitCode;
      console.log(`\nDebugAgent 실행 완료. 종료 코드: ${exitCode}`);
      console.log("\n종료합니다.\n");
      process.exit(exitCode);

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL,
        { 
          targetFile: this.targetFile,
          userRequest,
          context: 'DebugAgent execution'
        }
      );

      console.error("\n[Error] DebugAgent 실행 중 오류:", errorInfo.message);
      process.exit(1);
    }
  }

  /**
   * 정리 작업
   */
  cleanup(): void {
    InputUtils.cleanup();
  }
}

/**
 * 파일에서 코드를 읽어와서 InProgressRunService를 생성하는 팩토리 함수
 */
export function createInProgressRunService(targetFile: string): InProgressRunService {
  try {
    const absPath = path.resolve(targetFile);
    const code = readFileSync(absPath, "utf8");

    return new InProgressRunService({
      targetFile,
      code
    });

  } catch (error: any) {
    const errorInfo = errorHandler.handleError(
      error,
      ErrorCategory.SYSTEM,
      ErrorSeverity.CRITICAL,
      { targetFile }
    );

    throw new Error(`파일 읽기 실패: ${errorInfo.message}`);
  }
}

/**
 * 메인 실행 함수 (기존 inprogress-run.ts와의 호환성을 위해)
 */
export async function runInProgressDebug(targetFile: string): Promise<void> {
  const service = createInProgressRunService(targetFile);
  
  try {
    await service.run();
  } finally {
    service.cleanup();
  }
}
