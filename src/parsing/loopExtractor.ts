
export interface LoopInfo {
  code: string;
  level: number;
  parentIndex?: number;
  index: number;
}

/**
 * 코드 문자열에서 for/while/do-while 루프 블록만 추출 (괄호 균형 고려)
 * 중첩된 반복문과 복잡한 구조도 처리 가능
 */
export function extractLoopsFromCode(code: string): string[] {
  const loopInfos = extractLoopsWithNesting(code);
  return loopInfos.map(info => info.code);
}

/**
 * 중첩 정보를 포함하여 루프 추출
 */
export function extractLoopsWithNesting(code: string): LoopInfo[] {
  const loops: LoopInfo[] = [];
  const positions: Array<{start: number, end: number, code: string}> = [];
  
  // 모든 루프 위치 찾기
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
      let endPos = startPos;
      
      if (keyword === 'do') {
        const result = extractDoWhileLoopWithEnd(code, startPos);
        loopCode = result.code;
        endPos = result.end;
      } else {
        const result = extractForWhileLoopWithEnd(code, startPos);
        loopCode = result.code;
        endPos = result.end;
      }
      
      if (loopCode) {
        positions.push({ start: startPos, end: endPos, code: loopCode });
      }
    }
  }
  
  // 시작 위치로 정렬
  positions.sort((a, b) => a.start - b.start);
  
  // 중첩 레벨 계산
  const levelCounters: number[] = [0]; // 각 레벨별 카운터
  
  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    let level = 0;
    let parentIndex: number | undefined;
    
    // 현재 루프를 포함하는 부모 루프 찾기
    for (let j = i - 1; j >= 0; j--) {
      const potential = positions[j];
      if (potential.start < current.start && current.end <= potential.end) {
        level++;
        parentIndex = j;
      }
    }
    
    // 레벨별 카운터 조정
    while (levelCounters.length <= level) {
      levelCounters.push(0);
    }
    
    // 더 깊은 레벨의 카운터 리셋
    for (let k = level + 1; k < levelCounters.length; k++) {
      levelCounters[k] = 0;
    }
    
    levelCounters[level]++;
    
    loops.push({
      code: current.code,
      level: level,
      parentIndex: parentIndex,
      index: levelCounters[level]
    });
  }
  
  return loops;
}

/**
 * for/while 루프 추출 (괄호와 중괄호 균형 고려)
 */
function extractForWhileLoop(code: string, startPos: number): string {
  const result = extractForWhileLoopWithEnd(code, startPos);
  return result.code;
}

/**
 * for/while 루프 추출 (끝 위치 포함)
 */
function extractForWhileLoopWithEnd(code: string, startPos: number): {code: string, end: number} {
  let pos = startPos;
  
  // 키워드 건너뛰기
  while (pos < code.length && code[pos] !== '(') pos++;
  if (pos >= code.length) return {code: '', end: startPos};
  
  // 조건부 괄호 매칭
  let parenCount = 0;
  while (pos < code.length) {
    if (code[pos] === '(') parenCount++;
    else if (code[pos] === ')') parenCount--;
    pos++;
    if (parenCount === 0) break;
  }
  
  // 중괄호 찾기
  while (pos < code.length && /\s/.test(code[pos])) pos++;
  if (pos >= code.length || code[pos] !== '{') return {code: '', end: startPos};
  
  // 중괄호 블록 매칭
  let braceCount = 0;
  while (pos < code.length) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
    if (braceCount === 0) break;
  }
  
  return {code: code.substring(startPos, pos), end: pos};
}

/**
 * do-while 루프 추출
 */
function extractDoWhileLoop(code: string, startPos: number): string {
  const result = extractDoWhileLoopWithEnd(code, startPos);
  return result.code;
}

/**
 * do-while 루프 추출 (끝 위치 포함)
 */
function extractDoWhileLoopWithEnd(code: string, startPos: number): {code: string, end: number} {
  let pos = startPos;
  
  // 'do' 건너뛰고 '{' 찾기
  while (pos < code.length && code[pos] !== '{') pos++;
  if (pos >= code.length) return {code: '', end: startPos};
  
  // 중괄호 블록 매칭
  let braceCount = 0;
  while (pos < code.length) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
    if (braceCount === 0) break;
  }
  
  // while 조건 찾기
  while (pos < code.length && /\s/.test(code[pos])) pos++;
  if (pos + 5 >= code.length || code.substring(pos, pos + 5) !== 'while') return {code: '', end: startPos};
  
  pos += 5;
  while (pos < code.length && code[pos] !== '(') pos++;
  if (pos >= code.length) return {code: '', end: startPos};
  
  // while 조건 괄호 매칭
  let parenCount = 0;
  while (pos < code.length) {
    if (code[pos] === '(') parenCount++;
    else if (code[pos] === ')') parenCount--;
    pos++;
    if (parenCount === 0) break;
  }
  
  return {code: code.substring(startPos, pos), end: pos};
} 