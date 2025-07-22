// test_loopCheck.ts
import { loopCheck } from "../src/agentica/handlers";

/**
 * Extracts the first loop (for/while) snippet from the given code.
 * If no loop is found, returns the full code.
 */
function extractLoopSnippet(code: string): string {
  const loopStart = code.search(/(for\s*\(|while\s*\()/);
  if (loopStart < 0) return code;
  const braceOpen = code.indexOf('{', loopStart);
  if (braceOpen < 0) return code.slice(loopStart);
  let braceCount = 1;
  let idx = braceOpen + 1;
  while (idx < code.length && braceCount > 0) {
    if (code[idx] === '{') braceCount++;
    else if (code[idx] === '}') braceCount--;
    idx++;
  }
  return code.slice(loopStart, idx);
}

export async function runLoopCheck(code: string) {
  // Send only the loop snippet to the AI for cheaper, focused analysis
  const snippet = extractLoopSnippet(code);
  const { result } = await loopCheck({ code: snippet });
  console.log("🔍 [loopCheck 결과]");
  console.log(result);
}
