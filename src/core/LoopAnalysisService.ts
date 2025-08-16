import { getModel } from '../ai/GeminiService';
import { extractLoopsWithNesting } from '../parsers/LoopExtractor';
import { generateHierarchicalNumber } from '../utils/CodeUtils';
import { buildLoopTargetSelectionPrompt, buildLoopBatchAnalysisPrompt } from '../ai/PromptBuilder';
import { cacheGet, cacheSet } from '../utils/CacheManager';

// 루프 타입 식별 유틸(간단)
function detectLoopType(loopCode: string): 'for' | 'while' | 'do-while' | 'unknown' {
  const s = loopCode.trim();
  if (/^\s*for\s*\(/.test(s)) return 'for';
  if (/^\s*do\s*\{/.test(s)) return 'do-while';
  if (/^\s*while\s*\(/.test(s)) return 'while';
  return 'unknown';
}

// 심플 패턴 검사 (AI 호출 없이 빠른 판단)
function simpleLoopCheck(loopCode: string, loopNumber: string): string | null {
  const loop = loopCode.trim();

  // 패턴 1) i++ 와 i--가 동시에 등장 + i < 조건 → 종료 불가 가능성
  if (loop.includes('i++') && loop.includes('i < ') && loop.includes('i--')) {
    return `- 반복문 ${loopNumber}
\t무한 루프입니다. i++와 i--가 동시에 있어 조건이 만족되지 않습니다.
\t수정 제안 1: i++ 또는 i-- 중 하나만 사용하세요.`;
  }

  // 패턴 2) for (int i = 0; i < N; i--) 형태
  if (loop.match(/for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\d+\s*;\s*\w+--\s*\)/)) {
    return `- 반복문 ${loopNumber}
\t무한 루프입니다. 초기값 0에서 감소하면 종료 조건을 만족할 수 없습니다.
\t수정 제안 1: i--를 i++로 변경하세요.
\t수정 제안 2: 조건을 i >= 0으로 변경하세요.`;
  }

  // 필요 시 심플 패턴 추가 가능
  return null;
}

export class LoopAnalysisService {
  async check({
    code,
    target = 'all',
    details = {},
  }: {
    code: string;
    target?: string;
    details?: any;
  }) {
    const loopInfos = extractLoopsWithNesting(code);
    if (loopInfos.length === 0) {
      return { result: '코드에서 for/while/do-while 루프를 찾을 수 없습니다.' };
    }

    // ---------- (1) 타겟 선택 ----------
    let targetLoopInfos = loopInfos;

    if (target !== 'all') {
      // 루프 목록 문자열 구성 (프롬프트용)
      const loopListText = loopInfos
        .map((loopInfo, index) => {
          const loopNumber = generateHierarchicalNumber(loopInfo, loopInfos);
          const loopCode = loopInfo.code.trim();
          const loopType = detectLoopType(loopCode);
          return `Loop ${index + 1} (반복문 ${loopNumber}) [${loopType}]: ${loopCode}`;
        })
        .join('\n');

      const model = getModel();
      const prompt = buildLoopTargetSelectionPrompt({
        code,
        loopListText,
        target,
        details,
        totalLoops: loopInfos.length,
      });

      let selectionTimeoutId: NodeJS.Timeout | undefined;
      try {
        // 30초 타임아웃
        const timeoutPromise = new Promise((_, reject) => {
          selectionTimeoutId = setTimeout(() => reject(new Error('AI 응답 타임아웃')), 30_000);
        });

        const selectionResult: any = await Promise.race([model.generateContent(prompt), timeoutPromise]);
        if (selectionTimeoutId) clearTimeout(selectionTimeoutId);

        const responseText = selectionResult?.response?.text?.().trim?.();
        if (responseText) {
          const jsonMatch = responseText.match(/\[[\d\s,]*\]/);
          if (jsonMatch) {
            const selectedIndices: number[] = JSON.parse(jsonMatch[0]);
            if (Array.isArray(selectedIndices) && selectedIndices.length > 0) {
              const validIndices = selectedIndices.filter(
                (idx) => Number.isInteger(idx) && idx >= 1 && idx <= loopInfos.length
              );
              if (validIndices.length > 0) {
                targetLoopInfos = validIndices
                  .map((idx) => loopInfos[idx - 1])
                  .filter((v) => v !== undefined);
              }
            }
          }
        }
      } catch (err) {
        if (selectionTimeoutId) clearTimeout(selectionTimeoutId);
        // 폴백: 위치 키워드 대응
        if (target === 'first' && loopInfos.length > 0) {
          targetLoopInfos = [loopInfos[0]];
        } else if (target === 'second' && loopInfos.length > 1) {
          targetLoopInfos = [loopInfos[1]];
        } else if (target === 'third' && loopInfos.length > 2) {
          targetLoopInfos = [loopInfos[2]];
        } else if (target === 'fourth' && loopInfos.length > 3) {
          targetLoopInfos = [loopInfos[3]];
        } else if (target === 'fifth' && loopInfos.length > 4) {
          targetLoopInfos = [loopInfos[4]];
        } else if (target === 'last' && loopInfos.length > 0) {
          targetLoopInfos = [loopInfos[loopInfos.length - 1]];
        } else {
          // 기본값: 전체
          targetLoopInfos = loopInfos;
        }
      }
    }

    if (targetLoopInfos.length === 0) {
      return { result: '요청하신 조건에 맞는 루프를 찾을 수 없습니다.' };
    }

    // ---------- (2) 캐시 확인 ----------
    const cacheKey = JSON.stringify({
      loops: targetLoopInfos.map((info) => info.code),
      target,
      details,
    });

    const cached = cacheGet(cacheKey);
    if (cached) {
      return { result: `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${cached}` };
    }

    // ---------- (3) 심플 패턴 검사 ----------
    const simpleChecks = targetLoopInfos.map((info) => {
      const num = generateHierarchicalNumber(info, loopInfos);
      return simpleLoopCheck(info.code, num);
    });

    const allSimple = simpleChecks.every((x) => x !== null);
    if (allSimple) {
      const resultText = simpleChecks.join('\n\n');
      cacheSet(cacheKey, resultText);
      return { result: `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${resultText}` };
    }

    // ---------- (4) 배치 프롬프트로 AI 분석 ----------
    const loopAnalysisData = targetLoopInfos.map((info) => {
      const number = generateHierarchicalNumber(info, loopInfos);
      return { number, code: info.code };
    });

    const batchPrompt = buildLoopBatchAnalysisPrompt(loopAnalysisData);
    const model = getModel();

    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('AI 응답 타임아웃')), 30_000);
      });

      const result: any = await Promise.race([model.generateContent(batchPrompt), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const batchAnalysis = result?.response?.text?.();
      if (!batchAnalysis || !batchAnalysis.trim()) {
        throw new Error('AI 모델이 분석 결과를 생성하지 못했습니다.');
      }

      cacheSet(cacheKey, batchAnalysis);
      const formatted = `[Result]\n검사한 반복문 수 : ${targetLoopInfos.length}\n\n${batchAnalysis.trim()}`;
      return { result: formatted };
    } catch (aiError: any) {
      if (timeoutId) clearTimeout(timeoutId);

      // ---------- (5) 에러시 폴백 메시지 ----------
      const fallback = targetLoopInfos
        .map((info) => {
          const num = generateHierarchicalNumber(info, loopInfos);
          return `- 반복문 ${num}
\tAI 분석에 실패했습니다. 기본 패턴 검사만 수행됩니다.
\t코드: ${info.code.trim()}`;
        })
        .join('\n\n');

      const formatted = `검사한 반복문 수 : ${targetLoopInfos.length}\n\n${fallback}`;
      return { result: formatted };
    }
  }
}
