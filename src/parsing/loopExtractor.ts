<<<<<<< HEAD

 //extract for/while loop block
 //복잡한 중첩/주석/문자열 내 루프는 완벽히 처리하지 못할 수 있음 -> 어떻게 해결하지?

export function extractLoopsFromCode(code: string): string[] {
  const loopRegex = /(for\s*\([^)]*\)\s*\{[\s\S]*?\}|while\s*\([^)]*\)\s*\{[\s\S]*?\})/g;
  const matches = code.match(loopRegex);
  return matches ? matches : [];
=======
<
/**
 * 코드 문자열에서 for/while 루프 블록만 추출 (간단한 정규식 기반)
 * 복잡한 중첩/주석/문자열 내 루프는 완벽히 처리하지 못할 수 있음
 */
export function extractLoopsFromCode(code: string): string[] {
  const loopRegex = /(for\s*\([^)]*\)\s*\{[\s\S]*?\}|while\s*\([^)]*\)\s*\{[\s\S]*?\})/g;
  const matches = code.match(loopRegex);
  return matches ? matches : [];

>>>>>>> 02a80b488a58efc8b0975f8d35d5cab058562115
} 