// src/testcode/run_afterDebug_test.ts

import { afterDebug } from "../agentica/handlers";
import { CompilerResultParser } from "../parsing/compilerResultParser";

const sampleOutput_success = `
main.c: In function ‘main’:
main.c:3:5: warning: unused variable ‘x’ [-Wunused-variable]
    int x = 10;
    ^
Compilation finished with warnings.
`;

const sampleOutput_withError = `
main.c: In function ‘main’:
main.c:5:10: error: ‘x’ undeclared (first use in this function)
    printf("%d", x);
             ^
main.c:6:5: warning: unused variable ‘y’ [-Wunused-variable]
    int y = 3;
    ^
Segmentation fault (core dumped)
`;

const sampleOutput_clean = `
main.c: In function ‘main’:
Compilation successful. No warnings or errors.
`;

async function runAfterDebugTest(rawOutput: string, label: string) {
  const parsed = CompilerResultParser.parseCompilerOutput(rawOutput);
  const summary = CompilerResultParser.generateSummary(parsed);

  console.log(`\n==== ${label} ====`);
  const response = await afterDebug(summary, parsed.errors, parsed.warnings);
  console.log(response);
}

async function main() {
  await runAfterDebugTest(sampleOutput_success, "✅ 경고만 있는 경우");
  await runAfterDebugTest(sampleOutput_withError, "❌ 에러/크래시가 있는 경우");
  await runAfterDebugTest(sampleOutput_clean, "✅ 완전히 깨끗한 경우");
}

main();
