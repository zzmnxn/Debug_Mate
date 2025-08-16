import { LoopInfo } from '../parsers/LoopExtractor';

/**
 * 계층적 루프 번호 생성 (예: 1, 2.1, 2.2, 3 ...)
 */
export function generateHierarchicalNumber(current: LoopInfo, all: LoopInfo[]): string {
  if (!current || !all) {
    return "unknown";
  }

  if (current.level === 0) {
    // 최상위 루프는 index 그대로
    return current.index.toString();
  }

  // 부모 루프 유효성 확인
  if (
    current.parentIndex === undefined ||
    current.parentIndex < 0 ||
    current.parentIndex >= all.length
  ) {
    return current.index.toString(); // 부모 정보가 없거나 잘못된 경우
  }

  const parentLoop = all[current.parentIndex];
  if (!parentLoop) {
    return current.index.toString();
  }

  try {
    const parentNumber = generateHierarchicalNumber(parentLoop, all);
    return `${parentNumber}.${current.index}`;
  } catch (error) {
    console.log(`계층적 번호 생성 중 오류: ${error}`);
    return current.index.toString(); // 오류 시 기본 index 반환
  }
}

/**
 * 코드 문자열에서 함수명만 추출 (JS/TS 기준 간단 버전)
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