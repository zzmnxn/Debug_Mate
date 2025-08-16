/**
 * InputUtils - 사용자 입력 처리 유틸리티
 * 사용자 입력 수집, 검증, 처리 등을 담당합니다.
 */

import * as readline from 'readline';
import { errorHandler, ErrorCategory, ErrorSeverity } from './ErrorHandler';

export interface InputOptions {
  prompt: string;
  timeout?: number;
  defaultValue?: string;
  validator?: (input: string) => boolean | string;
  allowEmpty?: boolean;
}

export interface InputResult {
  success: boolean;
  value: string;
  error?: string;
}

export class InputUtils {
  private static rl: readline.Interface | null = null;

  /**
   * 사용자로부터 입력을 받습니다.
   * @param options 입력 옵션
   * @returns 입력 결과
   */
  static async getUserInput(options: InputOptions): Promise<InputResult> {
    try {
      // TTY 환경이 아닌 경우 기본값 반환
      if (!process.stdin.isTTY) {
        if (options.defaultValue) {
          return { success: true, value: options.defaultValue };
        } else if (options.allowEmpty) {
          return { success: true, value: '' };
        } else {
          return { 
            success: false, 
            value: '', 
            error: 'TTY 환경이 아니므로 사용자 입력을 받을 수 없습니다.' 
          };
        }
      }

      const input = await this.promptUser(options);
      
      // 입력 검증
      if (options.validator) {
        const validationResult = options.validator(input);
        if (typeof validationResult === 'string') {
          return { success: false, value: input, error: validationResult };
        } else if (!validationResult) {
          return { success: false, value: input, error: '입력이 유효하지 않습니다.' };
        }
      }

      // 빈 입력 처리
      if (!input.trim() && !options.allowEmpty) {
        return { success: false, value: input, error: '빈 입력은 허용되지 않습니다.' };
      }

      return { success: true, value: input };

    } catch (error: any) {
      const errorInfo = errorHandler.handleError(
        error,
        ErrorCategory.SYSTEM,
        ErrorSeverity.MEDIUM,
        { options }
      );

      return { 
        success: false, 
        value: '', 
        error: `입력 처리 중 오류가 발생했습니다: ${errorInfo.message}` 
      };
    }
  }

  /**
   * 사용자에게 프롬프트를 표시하고 입력을 받습니다.
   * @param options 입력 옵션
   * @returns 사용자 입력
   */
  private static promptUser(options: InputOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // 기존 인터페이스가 있다면 정리
        if (this.rl) {
          this.rl.close();
        }

        // 새로운 readline 인터페이스 생성
        this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        // 타임아웃 설정
        let timeoutId: NodeJS.Timeout | null = null;
        if (options.timeout) {
          timeoutId = setTimeout(() => {
            if (this.rl) {
              this.rl.close();
              this.rl = null;
            }
            reject(new Error(`입력 시간이 초과되었습니다. (${options.timeout}ms)`));
          }, options.timeout);
        }

        // 프롬프트 표시
        this.rl.question(options.prompt, (input) => {
          // 타임아웃 정리
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          // 인터페이스 정리
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }

          resolve(input);
        });

        // 에러 처리
        this.rl.on('error', (error) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          if (this.rl) {
            this.rl.close();
            this.rl = null;
          }
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 사용자 입력을 정규화합니다.
   * @param input 원본 입력
   * @returns 정규화된 입력
   */
  static normalizeInput(input: string): string {
    return input.trim();
  }

  /**
   * 입력이 유효한지 확인합니다.
   * @param input 검증할 입력
   * @param rules 검증 규칙
   * @returns 검증 결과
   */
  static validateInput(
    input: string, 
    rules: {
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
      required?: boolean;
      custom?: (input: string) => boolean | string;
    } = {}
  ): { isValid: boolean; error?: string } {
    const normalizedInput = this.normalizeInput(input);

    // 필수 입력 체크
    if (rules.required && !normalizedInput) {
      return { isValid: false, error: '입력이 필요합니다.' };
    }

    // 최소 길이 체크
    if (rules.minLength && normalizedInput.length < rules.minLength) {
      return { 
        isValid: false, 
        error: `최소 ${rules.minLength}자 이상 입력해야 합니다. (현재: ${normalizedInput.length}자)` 
      };
    }

    // 최대 길이 체크
    if (rules.maxLength && normalizedInput.length > rules.maxLength) {
      return { 
        isValid: false, 
        error: `최대 ${rules.maxLength}자까지 입력할 수 있습니다. (현재: ${normalizedInput.length}자)` 
      };
    }

    // 패턴 체크
    if (rules.pattern && !rules.pattern.test(normalizedInput)) {
      return { isValid: false, error: '입력 형식이 올바르지 않습니다.' };
    }

    // 사용자 정의 검증
    if (rules.custom) {
      const customResult = rules.custom(normalizedInput);
      if (typeof customResult === 'string') {
        return { isValid: false, error: customResult };
      } else if (!customResult) {
        return { isValid: false, error: '사용자 정의 검증을 통과하지 못했습니다.' };
      }
    }

    return { isValid: true };
  }

  /**
   * 사용자 입력을 안전하게 처리합니다.
   * @param input 사용자 입력
   * @returns 안전하게 처리된 입력
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // HTML 태그 제거
      .replace(/javascript:/gi, '') // JavaScript 프로토콜 제거
      .replace(/on\w+=/gi, ''); // 이벤트 핸들러 제거
  }

  /**
   * 입력을 확인 메시지와 함께 표시합니다.
   * @param input 사용자 입력
   * @param context 입력 컨텍스트
   * @returns 확인 메시지
   */
  static formatInputConfirmation(input: string, context?: string): string {
    let message = `입력 확인: "${input}"`;
    if (context) {
      message += ` (${context})`;
    }
    return message;
  }

  /**
   * readline 인터페이스를 정리합니다.
   */
  static cleanup(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

// 기존 코드와의 호환성을 위한 함수들
export function getUserInput(options: InputOptions): Promise<InputResult> {
  return InputUtils.getUserInput(options);
}

export function validateInput(
  input: string, 
  rules?: Parameters<typeof InputUtils.validateInput>[1]
): ReturnType<typeof InputUtils.validateInput> {
  return InputUtils.validateInput(input, rules);
}

export function sanitizeInput(input: string): string {
  return InputUtils.sanitizeInput(input);
}
