
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

import { runBeforeDebug } from "./src/testcode/test_beforeDebug";
import { runLoopCheck } from "./src/testcode/test_loopCheck";
import { runTraceVar } from "./src/testcode/test_traceVar";
import { runInProgressDebug } from "./src/testcode/test_InProgressDebug";


async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ 분석할 파일명을 입력하세요 .");
    console.error("예시: npx ts-node test_driver.ts test.c");
    process.exit(1);
  }

  const filename = args[0];
  const filepath = path.resolve(process.cwd(), filename);

  if (!fs.existsSync(filepath)) {
    console.error(`❌ 파일이 존재하지 않습니다: ${filepath}`);
    process.exit(1);
  }

  const code = fs.readFileSync(filepath, "utf-8");

  console.log(`✅ '${filename}'에 대한 분석을 시작합니다.\n`);

  await runBeforeDebug();
  await runLoopCheck(code);
  await runTraceVar(code);
  await runInProgressDebug();

  console.log("\n✅ 모든 분석이 완료되었습니다.");
}

main();

