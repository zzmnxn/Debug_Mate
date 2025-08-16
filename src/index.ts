import { DebugHandler } from './handlers/DebugHandler';
import { FileUtils } from './utils/FileUtils';
import { ApiConfig } from './config/ApiConfig';
import { printBanner, printSection } from './utils/ConsoleUI'; // ✅ 추가

async function main() {
  // 기존 사용법 유지: debug <filePath> "<natural language query>"
  // 추가: --pre 플래그를 주면 beforeDebug 결과를 먼저 출력
  const [, , filePath, ...rawQueryParts] = process.argv;

  // 플래그 분리
  const enablePre = process.argv.includes('--pre');
  const queryParts = (rawQueryParts || []).filter(p => p !== '--pre');

  const userQuery = queryParts.join(' ').trim();

  if (!filePath || !userQuery) {
    console.error('Usage: debug <filePath> "<natural language query>" [--pre]');
    process.exit(1);
  }

  ApiConfig.ensureEnv(); // GEMINI_API_KEY 등 검증

  try {
    const { absolutePath, fileName } = FileUtils.ensurePath(filePath);
    const code = FileUtils.readCodeOrExit(absolutePath);
    const handler = new DebugHandler();

    // --pre 가 있을 때만 사전 점검 실행(있으면 호출, 없어도 무시)
    if (enablePre && typeof (handler as any).beforeDebug === 'function') {
      const pre = await (handler as any).beforeDebug({ code, fileName });
      printBanner('beforeDebug 결과');             // ✅ ConsoleUI 사용
      console.log(typeof pre === 'string' ? pre : JSON.stringify(pre, null, 2));
      printSection();                               // ✅ ConsoleUI 사용
    }

    // 본 요청 처리(기존 동작 그대로)
    const output = await handler.handle({ code, fileName, userQuery });
    console.log(output);
  } catch (err: any) {
    console.error('[Error]', err?.message || String(err));
    process.exit(1);
  }
}

process.on('SIGINT', () => process.exit(0));
process.on('exit', () => { /* cleanup if needed */ });

main();
