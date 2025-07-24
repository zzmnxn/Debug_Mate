// 코드 파싱 및 분석 유틸리티 예시

/**
 * 코드 문자열에서 함수명만 추출하는 간단한 예시 함수 (JS/TS 기준)
 */
export function extractFunctionNames(code: string): string[] {
  const regex = /function\s+([a-zA-Z0-9_]+)/g;
  const result: string[] = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    result.push(match[1]);
  }
  return result;
} 