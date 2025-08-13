import { readFileSync } from "fs";
import { spawn } from "child_process";
import * as path from "path";
import * as readline from "readline";
import { inProgressDebug } from "./handlers";

async function main() {
  const targetFile = process.argv[2];

  // watch-and-debug.sh에서 항상 인자를 넘겨주므로 유효성 검사는 생략
  const absPath = path.resolve(targetFile);
  const code = readFileSync(absPath, "utf8");

  // 1) InProgressDebug 실행 및 결과 출력
  const result = await inProgressDebug(code);
  console.log("===== InProgressDebug 결과 =====");
  console.log(result);
  console.log("================================");

  if (!process.stdin.isTTY) return; // 입력받을 수 없는 환경이면 종료

  // 2) 사용자 요청 받기
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("요청 사항을 입력하시오 : ", (line) => {
    const req = (line ?? "").trim();
    rl.close();

    if (!req) return; // 빈 입력이면 그냥 종료

    // 3) DebugAgent 실행
    spawn(
      "npx",
      ["ts-node", "src/agentica/DebugAgent.ts", targetFile, req],
      { stdio: "inherit" }
    );
  });
}

main();
