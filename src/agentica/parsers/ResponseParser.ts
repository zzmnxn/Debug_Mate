// ResponseParser.ts - 응답 파싱 관련 기능
export interface ParsedResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class ResponseParser {
  /**
   * AI 응답을 파싱하여 구조화된 형태로 변환
   */
  static parseAIResponse(response: string): ParsedResponse {
    try {
      // 기본 응답 구조 검증
      if (!response || typeof response !== 'string') {
        return {
          success: false,
          message: 'Invalid response format',
          error: 'Response is not a valid string'
        };
      }

      const trimmedResponse = response.trim();
      if (trimmedResponse.length === 0) {
        return {
          success: false,
          message: 'Empty response',
          error: 'AI response is empty'
        };
      }

      // JSON 응답 파싱 시도
      try {
        const jsonResponse = JSON.parse(trimmedResponse);
        return {
          success: true,
          message: 'Successfully parsed JSON response',
          data: jsonResponse
        };
      } catch {
        // JSON이 아닌 경우 텍스트 응답으로 처리
        return {
          success: true,
          message: 'Successfully parsed text response',
          data: { text: trimmedResponse }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to parse response',
        error: error.message
      };
    }
  }

  /**
   * 에러 응답 파싱
   */
  static parseErrorResponse(error: any): ParsedResponse {
    let errorMessage = 'Unknown error occurred';
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = error.message;
    } else if (error && error.toString) {
      errorMessage = error.toString();
    }

    return {
      success: false,
      message: 'Error occurred during processing',
      error: errorMessage
    };
  }

  /**
   * 성공 응답 생성
   */
  static createSuccessResponse(data: any, message?: string): ParsedResponse {
    return {
      success: true,
      message: message || 'Operation completed successfully',
      data
    };
  }

  /**
   * 실패 응답 생성
   */
  static createFailureResponse(error: string, message?: string): ParsedResponse {
    return {
      success: false,
      message: message || 'Operation failed',
      error
    };
  }
}
