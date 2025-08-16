/**
 * Enhanced Loop Parser - AST-like approach for C/C++ loop detection
 * Avoids false positives from comments and strings
 */

/*
export interface LoopInfo {
  code: string;
  level: number;
  parentIndex?: number;
  index: number;
}
*/

/* CodeUtils.ts
function sanitizeCode(code: string): string {
  let result = '';
  let i = 0;
  
  while (i < code.length) {
    // Single line comment
    if (i < code.length - 1 && code[i] === '/' && code[i + 1] === '/') {
      // Skip until end of line
      while (i < code.length && code[i] !== '\n') {
        result += ' '; // Replace with space to maintain positions
        i++;
      }
      if (i < code.length) {
        result += code[i]; // Keep the newline
        i++;
      }
    }
    // Multi-line comment
    else if (i < code.length - 1 && code[i] === '/' && code[i + 1] === '*') {
      result += ' '; // Replace with space
      i += 2;
      while (i < code.length - 1) {
        if (code[i] === '*' && code[i + 1] === '/') {
          result += ' '; // Replace with space
          result += ' '; // Replace with space
          i += 2;
          break;
        }
        result += code[i] === '\n' ? '\n' : ' '; // Keep newlines, replace others with space
        i++;
      }
    }
    // String literals
    else if (code[i] === '"') {
      result += ' '; // Replace opening quote with space
      i++;
      while (i < code.length) {
        if (code[i] === '"' && (i === 0 || code[i - 1] !== '\\')) {
          result += ' '; // Replace closing quote with space
          i++;
          break;
        }
        result += ' '; // Replace string content with space
        i++;
      }
    }
    // Character literals
    else if (code[i] === "'") {
      result += ' '; // Replace opening quote with space
      i++;
      while (i < code.length) {
        if (code[i] === "'" && (i === 0 || code[i - 1] !== '\\')) {
          result += ' '; // Replace closing quote with space
          i++;
          break;
        }
        result += ' '; // Replace char content with space
        i++;
      }
    }
    else {
      result += code[i];
      i++;
    }
  }
  
  return result;
}

function findMatchingBrace(code: string, startPos: number): number {
  let braceCount = 0;
  let pos = startPos;
  
  while (pos < code.length) {
    if (code[pos] === '{') braceCount++;
    else if (code[pos] === '}') braceCount--;
    pos++;
    if (braceCount === 0) return pos - 1;
  }
  
  return -1; // No matching brace found
}

// Extract a single statement (for single-line loops without braces)
function extractSingleStatement(code: string, startPos: number): number {
  let pos = startPos;
  
  // Skip whitespace
  while (pos < code.length && /\s/.test(code[pos])) pos++;
  
  // Find end of statement (semicolon or newline)
  while (pos < code.length) {
    if (code[pos] === ';') {
      return pos + 1;
    }
    if (code[pos] === '\n') {
      // Check if next line starts with non-whitespace (indicates end of statement)
      let nextPos = pos + 1;
      while (nextPos < code.length && /[ \t]/.test(code[nextPos])) nextPos++;
      if (nextPos < code.length && !/\s/.test(code[nextPos])) {
        return pos + 1;
      }
    }
    pos++;
  }
  
  return pos;
}

// Enhanced loop extraction with AST-like approach
export function extractLoopsWithNesting(code: string): LoopInfo[] {
  const sanitizedCode = sanitizeCode(code);
  const loops: LoopInfo[] = [];
  const positions: Array<{start: number, end: number, code: string, type: 'for' | 'while' | 'do-while'}> = [];
  
  // Find for loops
  const forPattern = /\bfor\s*\(/g;
  let match;
  while ((match = forPattern.exec(sanitizedCode)) !== null) {
    const startPos = match.index;
    let pos = startPos;
    
    // Skip to opening parenthesis
    while (pos < sanitizedCode.length && sanitizedCode[pos] !== '(') pos++;
    
    // Match parentheses
    let parenCount = 0;
    while (pos < sanitizedCode.length) {
      if (sanitizedCode[pos] === '(') parenCount++;
      else if (sanitizedCode[pos] === ')') parenCount--;
      pos++;
      if (parenCount === 0) break;
    }
    
    // Skip whitespace
    while (pos < sanitizedCode.length && /\s/.test(sanitizedCode[pos])) pos++;
    
    let endPos: number;
    if (pos < sanitizedCode.length && sanitizedCode[pos] === '{') {
      // Block statement
      endPos = findMatchingBrace(sanitizedCode, pos);
      if (endPos !== -1) endPos++;
    } else {
      // Single statement
      endPos = extractSingleStatement(sanitizedCode, pos);
    }
    
    if (endPos > startPos) {
      positions.push({
        start: startPos,
        end: endPos,
        code: code.substring(startPos, endPos),
        type: 'for'
      });
    }
  }
  
  // Find do-while loops first (to exclude their while parts from standalone while loops)
  const doWhileRanges: Array<{start: number, end: number}> = [];
  const doPattern = /\bdo\s*\{/g;
  while ((match = doPattern.exec(sanitizedCode)) !== null) {
    const startPos = match.index;
    let pos = startPos;
    
    // Skip to opening brace
    while (pos < sanitizedCode.length && sanitizedCode[pos] !== '{') pos++;
    
    // Find matching brace
    const braceEnd = findMatchingBrace(sanitizedCode, pos);
    if (braceEnd === -1) continue;
    
    pos = braceEnd + 1;
    
    // Skip whitespace
    while (pos < sanitizedCode.length && /\s/.test(sanitizedCode[pos])) pos++;
    
    // Check for 'while'
    if (pos + 5 <= sanitizedCode.length && sanitizedCode.substring(pos, pos + 5) === 'while') {
      pos += 5;
      
      // Skip to opening parenthesis
      while (pos < sanitizedCode.length && sanitizedCode[pos] !== '(') pos++;
      
      // Match parentheses
      let parenCount = 0;
      while (pos < sanitizedCode.length) {
        if (sanitizedCode[pos] === '(') parenCount++;
        else if (sanitizedCode[pos] === ')') parenCount--;
        pos++;
        if (parenCount === 0) break;
      }
      
      // Skip to semicolon
      while (pos < sanitizedCode.length && sanitizedCode[pos] !== ';') pos++;
      if (pos < sanitizedCode.length) pos++; // Include semicolon
      
      // Store do-while range for exclusion
      doWhileRanges.push({start: startPos, end: pos});
      
      positions.push({
        start: startPos,
        end: pos,
        code: code.substring(startPos, pos),
        type: 'do-while'
      });
    }
  }
  
  // Find while loops (excluding those that are part of do-while)
  const whilePattern = /\bwhile\s*\(/g;
  while ((match = whilePattern.exec(sanitizedCode)) !== null) {
    const startPos = match.index;
    
    // Check if this while is part of a do-while loop
    const isPartOfDoWhile = doWhileRanges.some(range => 
      startPos >= range.start && startPos < range.end
    );
    
    if (isPartOfDoWhile) continue; // Skip while parts of do-while loops
    
    let pos = startPos;
    
    // Skip to opening parenthesis
    while (pos < sanitizedCode.length && sanitizedCode[pos] !== '(') pos++;
    
    // Match parentheses
    let parenCount = 0;
    while (pos < sanitizedCode.length) {
      if (sanitizedCode[pos] === '(') parenCount++;
      else if (sanitizedCode[pos] === ')') parenCount--;
      pos++;
      if (parenCount === 0) break;
    }
    
    // Skip whitespace
    while (pos < sanitizedCode.length && /\s/.test(sanitizedCode[pos])) pos++;
    
    let endPos: number;
    if (pos < sanitizedCode.length && sanitizedCode[pos] === '{') {
      // Block statement
      endPos = findMatchingBrace(sanitizedCode, pos);
      if (endPos !== -1) endPos++;
    } else {
      // Single statement
      endPos = extractSingleStatement(sanitizedCode, pos);
    }
    
    if (endPos > startPos) {
      positions.push({
        start: startPos,
        end: endPos,
        code: code.substring(startPos, endPos),
        type: 'while'
      });
    }
  }
  
  // Sort by start position
  positions.sort((a, b) => a.start - b.start);
  
  // Calculate nesting levels and parent relationships
  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    let level = 0;
    let directParentIndex: number | undefined;
    
    // Find direct parent loop
    for (let j = i - 1; j >= 0; j--) {
      const potential = positions[j];
      if (potential.start < current.start && current.end <= potential.end) {
        if (directParentIndex === undefined || 
            positions[j].start > positions[directParentIndex].start) {
          directParentIndex = j;
        }
      }
    }
    
    // Calculate level
    if (directParentIndex !== undefined) {
      level = loops[directParentIndex].level + 1;
    }
    
    loops.push({
      code: current.code,
      level: level,
      parentIndex: directParentIndex,
      index: 0 // Will be calculated next
    });
  }
  
  // Calculate indices for same-level loops
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

export function extractLoopsFromCode(code: string): string[] {
  const loopInfos = extractLoopsWithNesting(code);
  return loopInfos.map(info => info.code);
}
*/