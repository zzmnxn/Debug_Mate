
/**
 * 계층적 번호 생성 (1, 2.1, 2.2, 3 등)
 */
function generateHierarchicalNumber(currentLoop: LoopInfo, allLoops: LoopInfo[]): string {
  if (!currentLoop || !allLoops) {
    return "unknown";
  }
  
  if (currentLoop.level === 0) {
    // 최상위 루프
    return currentLoop.index.toString();
  }
  
  // 부모 루프 찾기
  if (currentLoop.parentIndex === undefined || currentLoop.parentIndex < 0 || currentLoop.parentIndex >= allLoops.length) {
    return currentLoop.index.toString(); // 부모 정보가 유효하지 않으면 기본 번호 반환
  }
  
  const parentLoop = allLoops[currentLoop.parentIndex];
  if (!parentLoop) {
    return currentLoop.index.toString(); // 부모 루프를 찾을 수 없으면 기본 번호 반환
  }
  
  try {
    const parentNumber = generateHierarchicalNumber(parentLoop, allLoops);
  return `${parentNumber}.${currentLoop.index}`;
  } catch (error) {
    console.log(`계층적 번호 생성 중 오류: ${error}`);
    return currentLoop.index.toString(); // 오류 발생 시 기본 번호 반환
  }
}

