// CodeUtils.ts - 코드 분석 관련 유틸리티
export class CodeUtils {
  /**
   * 코드에서 주석 제거
   */
  static removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';
    
    while (i < code.length) {
      const char = code[i];
      const nextChar = code[i + 1];
      
      // 문자열 처리
      if ((char === '"' || char === "'") && (i === 0 || code[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
          result += char;
        } else if (stringChar === char) {
          inString = false;
          result += char;
        } else {
          result += char;
        }
        i++;
        continue;
      }
      
      if (inString) {
        result += char;
        i++;
        continue;
      }
      
      // 한 줄 주석 처리
      if (char === '/' && nextChar === '/') {
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
        if (i < code.length) {
          result += '\n';
        }
        continue;
      }
      
      // 여러 줄 주석 처리
      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === '*' && code[i + 1] === '/') {
            i += 2;
            break;
          }
          if (code[i] === '\n') {
            result += '\n';
          }
          i++;
        }
        continue;
      }
      
      result += char;
      i++;
    }
    
    return result;
  }

  /**
   * 코드에서 공백 정규화
   */
  static normalizeWhitespace(code: string): string {
    return code
      .replace(/\t/g, '  ') // 탭을 2개 공백으로
      .replace(/[ \t]+/g, ' ') // 여러 공백을 하나로
      .replace(/\n[ \t]*\n/g, '\n\n') // 빈 줄 정리
      .trim();
  }

  /**
   * 코드 라인 수 계산
   */
  static countLines(code: string): number {
    return code.split('\n').length;
  }

  /**
   * 코드에서 함수 정의 찾기
   */
  static findFunctionDefinitions(code: string): Array<{ name: string; startLine: number; endLine: number }> {
    const functions: Array<{ name: string; startLine: number; endLine: number }> = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 함수 정의 패턴 매칭 (간단한 버전)
      const functionMatch = line.match(/^(\w+)\s+(\w+)\s*\([^)]*\)\s*\{?$/);
      if (functionMatch) {
        const returnType = functionMatch[1];
        const functionName = functionMatch[2];
        
        // 기본 타입들만 허용
        const validTypes = ['void', 'int', 'char', 'float', 'double', 'long', 'short', 'unsigned', 'signed'];
        if (validTypes.includes(returnType) || returnType.includes('*')) {
          let endLine = i;
          let braceCount = 0;
          let foundOpeningBrace = false;
          
          // 함수 본문의 끝 찾기
          for (let j = i; j < lines.length; j++) {
            const currentLine = lines[j];
            for (const char of currentLine) {
              if (char === '{') {
                if (!foundOpeningBrace) foundOpeningBrace = true;
                braceCount++;
              } else if (char === '}') {
                braceCount--;
                if (foundOpeningBrace && braceCount === 0) {
                  endLine = j;
                  break;
                }
              }
            }
            if (foundOpeningBrace && braceCount === 0) break;
          }
          
          functions.push({
            name: functionName,
            startLine: i + 1,
            endLine: endLine + 1
          });
        }
      }
    }
    
    return functions;
  }

  /**
   * 코드에서 변수 선언 찾기
   */
  static findVariableDeclarations(code: string): Array<{ name: string; type: string; line: number }> {
    const variables: Array<{ name: string; type: string; line: number }> = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 변수 선언 패턴 매칭
      const varMatch = line.match(/^(\w+(?:\s*\*\s*)*)\s+(\w+)\s*[=;[]/);
      if (varMatch) {
        const type = varMatch[1].trim();
        const name = varMatch[2].trim();
        
        // 함수 정의가 아닌지 확인
        if (!line.includes('(') || line.includes(';')) {
          variables.push({
            name,
            type,
            line: i + 1
          });
        }
      }
    }
    
    return variables;
  }

  /**
   * 코드 복잡도 계산 (간단한 버전)
   */
  static calculateComplexity(code: string): number {
    const cleanCode = this.removeComments(code);
    let complexity = 0;
    
    // 조건문, 반복문, 논리 연산자 등 계산
    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s*if\s*\(/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bdo\s*\{/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\b\|\|/g,
      /\b&&/g,
      /\b\?/g,
      /\b:/g
    ];
    
    complexityPatterns.forEach(pattern => {
      const matches = cleanCode.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }

  /**
   * 코드 품질 점수 계산
   */
  static calculateQualityScore(code: string): number {
    const lines = this.countLines(code);
    const complexity = this.calculateComplexity(code);
    const functions = this.findFunctionDefinitions(code);
    
    let score = 100;
    
    // 라인 수에 따른 점수 조정
    if (lines > 100) score -= 10;
    if (lines > 500) score -= 20;
    
    // 복잡도에 따른 점수 조정
    if (complexity > 20) score -= 15;
    if (complexity > 50) score -= 25;
    
    // 함수 수에 따른 점수 조정
    if (functions.length > 10) score -= 10;
    if (functions.length > 20) score -= 20;
    
    // 최소 점수 보장
    return Math.max(0, score);
  }
}
