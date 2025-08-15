import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { beforeDebug } from "./handlers";

async function main() {
  const targetFile = process.argv[2];

  // watch-and-debug.sh에서 항상 인자를 넘겨주므로 유효성 검사는 생략
  const absPath = path.resolve(targetFile);
  const code = readFileSync(absPath, "utf8");

  // beforeDebug 실행 및 결과 출력
  const result = await beforeDebug({ code });

  console.log("\n================================");
  console.log("  *   beforeDebug 결과   *  ");
  console.log("================================\n");
  console.log(result);
  console.log("\n================================\n");

  // 입력받을 수 없는 환경이면 즉시 종료
  if (!process.stdin.isTTY) {
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

    // DebugAgent 동기 실행 → 종료 코드 반영하여 즉시 종료
    const r = spawnSync(
      "npx",
      ["ts-node", "--esm", "cli/src/agentica/DebugAgent.ts", targetFile, req],
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

main();
