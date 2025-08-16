/**
 * ProcessUtils - 프로세스 관리 유틸리티
 * 자식 프로세스 실행, 프로세스 관리, 실행 결과 처리 등을 담당합니다.
 */

import { spawnSync, SpawnSyncOptions, SpawnSyncReturns } from 'child_process';
import { errorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';

export interface ProcessExecutionOptions {
  timeout?: number;
  encoding?: BufferEncoding;
  stdio?: 'inherit' | 'pipe' | 'ignore';
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ProcessResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
  executionTime: number;
}

export class ProcessUtils {
  /**
   * 동기적으로 명령을 실행합니다.
   * @param command 실행할 명령
   * @param args 명령 인수
   * @param options 실행 옵션
   * @returns 실행 결과
   */
  static executeSync(
    command: string,
    args: string[],
    options: ProcessExecutionOptions = {}
  ): ProcessResult {
    const startTime = Date.now();
    
    try {
      const spawnOptions: SpawnSyncOptions = {
        encoding: options.encoding || 'utf-8',
        timeout: options.timeout || 30000, // 기본 30초
        stdio: options.stdio === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        cwd: options.cwd,
        env: options.env
      };

      const result = spawnSync(command, args, spawnOptions);
      const executionTime = Date.now() - startTime;

      if (result.error) {
        const errorInfo = errorHandler.handleError(
          result.error,
          ErrorCategory.SYSTEM,
          ErrorSeverity.HIGH,
          { command, args, executionTime }
        );

        return {
          success: false,
          exitCode: -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          error: errorInfo.message,
          executionTime
        };
      }

      return {
        success: result.status === 0,
        exitCode: result.status || 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        executionTime
      };

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.CRITICAL,
        { command, args }
      );

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        error: errorInfo.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * TypeScript 파일을 ts-node로 실행합니다.
   * @param scriptPath 실행할 TypeScript 파일 경로
   * @param args 스크립트에 전달할 인수
   * @param options 실행 옵션
   * @returns 실행 결과
   */
  static executeTypeScript(
    scriptPath: string,
    args: string[] = [],
    options: ProcessExecutionOptions = {}
  ): ProcessResult {
    return this.executeSync('npx', ['ts-node', scriptPath, ...args], {
      ...options,
      stdio: options.stdio || 'inherit'
    });
  }

  /**
   * Node.js 스크립트를 실행합니다.
   * @param scriptPath 실행할 JavaScript 파일 경로
   * @param args 스크립트에 전달할 인수
   * @param options 실행 옵션
   * @returns 실행 결과
   */
  static executeNodeScript(
    scriptPath: string,
    args: string[] = [],
    options: ProcessExecutionOptions = {}
  ): ProcessResult {
    return this.executeSync('node', [scriptPath, ...args], {
      ...options,
      stdio: options.stdio || 'inherit'
    });
  }

  /**
   * 프로세스가 성공적으로 종료되었는지 확인합니다.
   * @param result 프로세스 실행 결과
   * @returns 성공 여부
   */
  static isSuccessful(result: ProcessResult): boolean {
    return result.success && result.exitCode === 0;
  }

  /**
   * 프로세스 실행 결과를 사용자 친화적인 메시지로 변환합니다.
   * @param result 프로세스 실행 결과
   * @returns 사용자 친화적인 메시지
   */
  static formatResultMessage(result: ProcessResult): string {
    if (result.success) {
      return `✅ 프로세스가 성공적으로 완료되었습니다. (종료 코드: ${result.exitCode}, 실행 시간: ${result.executionTime}ms)`;
    } else {
      let message = `❌ 프로세스 실행이 실패했습니다. (종료 코드: ${result.exitCode}, 실행 시간: ${result.executionTime}ms)`;
      
      if (result.error) {
        message += `\n오류: ${result.error}`;
      }
      
      if (result.stderr) {
        message += `\nstderr: ${result.stderr}`;
      }
      
      return message;
    }
  }

  /**
   * 프로세스 실행 결과를 간단한 요약으로 반환합니다.
   * @param result 프로세스 실행 결과
   * @returns 요약 메시지
   */
  static getResultSummary(result: ProcessResult): string {
    return result.success ? '성공' : '실패';
  }
}

// 기존 코드와의 호환성을 위한 함수들
export function executeSync(
  command: string,
  args: string[],
  options?: ProcessExecutionOptions
): ProcessResult {
  return ProcessUtils.executeSync(command, args, options);
}

export function executeTypeScript(
  scriptPath: string,
  args?: string[],
  options?: ProcessExecutionOptions
): ProcessResult {
  return ProcessUtils.executeTypeScript(scriptPath, args, options);
}
