import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { beforeDebug } from "./beforeDebug";

async function main() {
  const targetFile = process.argv[2];

  if (!targetFile) {
    console.error("오류: 파일 경로가 제공되지 않았습니다.");
    process.exit(1);
  }

  // 절대 경로로 변환
  const absPath = path.resolve(targetFile);
  
  // 파일 존재 여부 확인
  if (!existsSync(absPath)) {
    console.error(`오류: 파일이 존재하지 않습니다: ${absPath}`);
    process.exit(1);
  }

  console.log(`파일 분석 시작: ${absPath}`);

  try {
    // 파일 읽기 시도
    const code = readFileSync(absPath, "utf8");
    console.log(`파일 크기: ${code.length} 문자`);

    // beforeDebug 실행 및 결과 출력
    console.log("AI 분석 실행 중...");
    const result = await beforeDebug({ code });

    console.log("\n================================");
    console.log("  *   beforeDebug 결과   *  ");
    console.log("================================\n");
    console.log(result);
    console.log("\n================================\n");

  } catch (error) {
    console.error("파일 읽기 또는 분석 중 오류 발생:", error);
    process.exit(1);
  }

  // 입력받을 수 없는 환경이면 즉시 종료
  if (!process.stdin.isTTY) {
    console.log("TTY가 아닌 환경에서 실행 중 - 대화형 모드 건너뜀");
    process.exit(0);
  }

  // 사용자 요청 받기
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("\n요청 사항을 입력하시오 : ", (line) => {
    const req = (line ?? "").trim();
    rl.close();

    // 빈 입력이면 안내 후 종료
    if (!req) {
      console.log("\n(빈 입력 감지) 추가 디버깅 없이 종료합니다.\n");
      process.exit(0);
    }

    console.log(`DebugAgent 실행 중: ${targetFile} - "${req}"`);

    // DebugAgent 동기 실행 → 종료 코드 반영하여 즉시 종료
    // TypeScript 파일을 JavaScript로 컴파일 후 실행
    const compileResult = spawnSync(
      "npx",
      ["tsc", "src/analysis/DebugAgent.ts", "--outDir", "lib", "--target", "ES2020", "--module", "ESNext", "--moduleResolution", "node", "--esModuleInterop"],
      { stdio: "pipe" }
    );
    
    if (compileResult.status !== 0) {
      console.error("TypeScript 컴파일 실패:", compileResult.stderr?.toString());
      process.exit(1);
    }
    
    const r = spawnSync(
      "node",
      ["lib/analysis/DebugAgent.js", targetFile, req],
      { stdio: "inherit" }
    );

    if (r.error) {
      console.error("\n[Error] DebugAgent 실행 실패:", r.error.message);
      process.exit(1);
    }

    // 자식 프로세스의 종료 코드를 그대로 반영
    const code = typeof r.status === "number" ? r.status : 0;
    console.log("\n종료합니다.\n");
    process.exit(code);
  });
}

main().catch((error) => {
  console.error("예상치 못한 오류:", error);
  process.exit(1);
});
