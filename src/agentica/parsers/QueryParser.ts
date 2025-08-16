// QueryParser.ts - 쿼리 파싱 관련 기능
export interface QueryParseResult {
  originalQuery: string;
  parsedQuery: string;
  parameters: Record<string, any>;
  isValid: boolean;
}

export class QueryParser {
  /**
   * 사용자 쿼리를 파싱하여 구조화된 형태로 변환
   */
  static parseQuery(query: string): QueryParseResult {
    const result: QueryParseResult = {
      originalQuery: query,
      parsedQuery: query.trim(),
      parameters: {},
      isValid: true
    };

    try {
      // 기본 파싱 로직
      result.parsedQuery = this.normalizeQuery(query);
      result.parameters = this.extractParameters(query);
    } catch (error) {
      result.isValid = false;
      result.parameters = { error: error.message };
    }

    return result;
  }

  /**
   * 쿼리 정규화
   */
  private static normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 쿼리에서 매개변수 추출
   */
  private static extractParameters(query: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    // 파일 경로 추출
    const filePathMatch = query.match(/['"`]([^'"`]+\.(c|cpp|h|hpp))['"`]/);
    if (filePathMatch) {
      params.filePath = filePathMatch[1];
    }

    // 숫자 매개변수 추출
    const numberMatches = query.match(/(\d+)/g);
    if (numberMatches) {
      params.numbers = numberMatches.map(n => parseInt(n));
    }

    // 키워드 매개변수 추출
    const keywords = ['for', 'while', 'do-while', 'loop', 'variable', 'function'];
    keywords.forEach(keyword => {
      if (query.toLowerCase().includes(keyword)) {
        params[keyword] = true;
      }
    });

    return params;
  }

  /**
   * 쿼리 유효성 검사
   */
  static validateQuery(query: string): boolean {
    if (!query || typeof query !== 'string') {
      return false;
    }

    if (query.trim().length === 0) {
      return false;
    }

    // 최소 길이 검사
    if (query.trim().length < 2) {
      return false;
    }

    return true;
  }
}
