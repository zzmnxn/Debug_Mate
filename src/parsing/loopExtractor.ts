
/**
 * 코드 문자열에서 for/while/do-while 루프 블록만 추출 (괄호 균형 고려)
 * 중첩된 반복문과 복잡한 구조도 처리 가능
 */
export function extractLoopsFromCode(code: string): string[] {
  const loops: string[] = [];
  
  // for, while, do 키워드 찾기
  const loopKeywords = [
    { keyword: 'for', pattern: /\bfor\s*\(/g },
    { keyword: 'while', pattern: /\bwhile\s*\(/g },
    { keyword: 'do', pattern: /\bdo\s*\{/g }
  ];
  
  for (const { keyword, pattern } of loopKeywords) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const startPos = match.index;
      let loopCode = '';
      
      if (keyword === 'do') {
        // do-while 처리
        loopCode = extractDoWhileLoop(code, startPos);
      } else {
        // for, while 처리
        loopCode = extractForWhileLoop(code, startPos);
      }
      
      if (loopCode) {
        loops.push(loopCode);
      }
    }
  }
  
  return loops;
}

/**
 * for/while 루프 추출 (괄호와 중괄호 균형 고려)
 */
function extractForWhileLoop(code: string, startPos: number): string {
  let pos = startPos;
  
  // 키워드 건너뛰기
  while (pos < code.length && code[pos] !== '(') pos++;
  if (pos >= code.length) return '';
  
  // 조건부 괄호 매칭
  const conditionStart = pos;
  let parenCount = 0;
  while (pos < code.length) {
    if (code[pos] === '(') parenCount++;
    else if (code[pos] === ')') parenCount--;
    pos++;
    if (parenCount === 0) break;
  }
  
  // 중괄호 찾기
  while (pos < code.length && /\s/.test(code[pos])) pos++;
  if (pos >= code.length || code[pos] !== '{') return '';
  
  // 중괄호 블록 매칭
  const blockStart = pos;
  let braceCount = 0;
  while (pos < code.length) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
    if (braceCount === 0) break;
  }
  
  return code.substring(startPos, pos);
}

/**
 * do-while 루프 추출
 */
function extractDoWhileLoop(code: string, startPos: number): string {
  let pos = startPos;
  
  // 'do' 건너뛰고 '{' 찾기
  while (pos < code.length && code[pos] !== '{') pos++;
  if (pos >= code.length) return '';
  
  // 중괄호 블록 매칭
  let braceCount = 0;
  const blockStart = pos;
  while (pos < code.length) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
    if (braceCount === 0) break;
  }
  
  // while 조건 찾기
  while (pos < code.length && /\s/.test(code[pos])) pos++;
  if (pos + 5 >= code.length || code.substring(pos, pos + 5) !== 'while') return '';
  
  pos += 5;
  while (pos < code.length && code[pos] !== '(') pos++;
  if (pos >= code.length) return '';
  
  // while 조건 괄호 매칭
  let parenCount = 0;
  while (pos < code.length) {
    if (code[pos] === '(') parenCount++;
    else if (code[pos] === ')') parenCount--;
    pos++;
    if (parenCount === 0) break;
  }
  
  return code.substring(startPos, pos);
} 