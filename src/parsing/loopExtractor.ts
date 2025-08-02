
 //extract for/while loop block
 //복잡한 중첩/주석/문자열 내 루프는 완벽히 처리하지 못할 수 있음 -> 어떻게 해결하지?

export function extractLoopsFromCode(code: string): string[] {
  const loopRegex = /(for\s*\([^)]*\)\s*\{[\s\S]*?\}|while\s*\([^)]*\)\s*\{[\s\S]*?\})/g;
  const matches = code.match(loopRegex);
  return matches ? matches : [];
} 