
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
  
  // 중첩 레벨 계산 및 부모-자식 관계 설정
  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    let level = 0;
    let directParentIndex: number | undefined;
    
    // 직접적인 부모 루프 찾기 (가장 가까운 포함 루프)
    for (let j = i - 1; j >= 0; j--) {
      const potential = positions[j];
      if (potential.start < current.start && current.end <= potential.end) {
        // 이미 찾은 부모가 없거나, 더 가까운 부모를 찾은 경우
        if (directParentIndex === undefined || 
            positions[j].start > positions[directParentIndex].start) {
          directParentIndex = j;
        }
      }
    }
    
    // 레벨 계산 (부모가 있으면 부모의 레벨 + 1)
    if (directParentIndex !== undefined) {
      level = loops[directParentIndex].level + 1;
    }
    
    loops.push({
      code: current.code,
      level: level,
      parentIndex: directParentIndex,
      index: 0 // 임시값, 나중에 계산
    });
  }
  
  // 같은 부모를 가진 루프들의 인덱스 계산
  const parentChildMap = new Map<number | undefined, number>();
  
  for (let i = 0; i < loops.length; i++) {
    const loop = loops[i];
    const parentKey = loop.parentIndex;
    
    if (!parentChildMap.has(parentKey)) {
      parentChildMap.set(parentKey, 0);
    }
    
    parentChildMap.set(parentKey, parentChildMap.get(parentKey)! + 1);
    loop.index = parentChildMap.get(parentKey)!;
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

  // (1) 키워드 건너뛰고 조건 괄호 매칭 (기존)
  while (pos < code.length && code[pos] !== '(') pos++;
  if (pos >= code.length) return {code: '', end: startPos};
  let parenCount = 0;
  do {
    if (code[pos] === '(') parenCount++;
    else if (code[pos] === ')') parenCount--;
    pos++;
  } while (pos < code.length && parenCount > 0);

  // (2) 공백/개행 건너뛰기
  while (pos < code.length && /\s/.test(code[pos])) pos++;

  // (3) 본체가 중괄호 블록인지 단일문인지 분기
  if (pos < code.length && code[pos] === '{') {
    // 기존 중괄호 매칭 로직 (변경 없음)
    let braceCount = 0;
    do {
      if (code[pos] === '{') braceCount++;
      else if (code[pos] === '}') braceCount--;
      pos++;
    } while (pos < code.length && braceCount > 0);
    return { code: code.substring(startPos, pos), end: pos };
  } else {
    // 단일문: 세미콜론(;)까지 잘라서 리턴
    const stmtEnd = code.indexOf(';', pos);
    if (stmtEnd === -1) return {code: '', end: startPos};
    return { code: code.substring(startPos, stmtEnd + 1), end: stmtEnd + 1 };
  }
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