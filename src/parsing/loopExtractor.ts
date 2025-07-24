<
/**
 * 코드 문자열에서 for/while 루프 블록만 추출 (간단한 정규식 기반)
 * 복잡한 중첩/주석/문자열 내 루프는 완벽히 처리하지 못할 수 있음
 */
export function extractLoopsFromCode(code: string): string[] {
  const loopRegex = /(for\s*\([^)]*\)\s*\{[\s\S]*?\}|while\s*\([^)]*\)\s*\{[\s\S]*?\})/g;
  const matches = code.match(loopRegex);
  return matches ? matches : [];

} 