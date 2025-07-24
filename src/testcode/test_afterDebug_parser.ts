// src/testcode/run_parser_test.ts

import { CompilerResultParser } from "../parsing/compilerResultParser";

const log_with_errors = `
main.c:5:10: error: ‘x’ undeclared (first use in this function)
main.c:6:5: warning: unused variable ‘y’ [-Wunused-variable]
Segmentation fault (core dumped)
`;

const result = CompilerResultParser.parseCompilerOutput(log_with_errors);

console.log("=== Parsed Compiler Result ===");
console.log(JSON.stringify(result, null, 2));

console.log("\n=== Summary ===");
console.log(CompilerResultParser.generateSummary(result));

// 개별 요소 확인 (테스트처럼)
console.log("\n=== Quick Checks ===");
console.log("Success expected: false ->", result.success === false);
console.log("Errors >= 1 expected ->", result.errors.length >= 1);
console.log("Warnings >= 1 expected ->", result.warnings.length >= 1);
console.log("Crash expected ->", result.executionResult?.crashed === true);
