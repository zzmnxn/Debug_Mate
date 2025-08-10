//import fs from "fs";
import * as fs from "fs";
import * as path from "path";
import readline from "readline";
import { spawn } from "child_process";
import { inProgressDebug } from "../agentica/handlers";


function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => {
    rl.close();
    resolve((ans ?? "").trim());
  }));
}

// npm run debug <file> "<userMessage>" 를 백그라운드로 실행
function runDebugAgentBG(sourcePath: string, userMessage: string) {
  // spawn의 인자 배열을 사용하므로 따옴표 이스케이프 문제 없이 안전함
  const child = spawn("npm", ["run", "debug", "--", sourcePath, userMessage], {
    cwd: process.cwd(),
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export async function runInProgressDebug() {
  const file = process.argv[2]; // 분석 대상 파일명
  if (!file) {
    console.error("❌ 파일명을 입력하세요. 예: npx ts-node src/testcode/test_InProgressDebug.ts test.c");
    process.exit(1);
  }

  const abs = path.resolve(file);
  const code = fs.readFileSync(abs, "utf-8");

  // 1) inProgressDebug 실행 및 결과 출력
  const result = await inProgressDebug(code);
  console.log("\n=== 🧪 [InProgressDebug 결과] ===");
  console.log(`대상 파일: ${abs}`);
  console.log(result);
  console.log("================================\n");

  // 2) 사용자 요청사항 입력 받기
  const msg = await ask('요청 사항을 입력하시오 : ');
  if (!msg) {
    console.log("(입력 없음 – DebugAgent 실행 생략)");
    process.exit(0);
    return;
  }

  // 3) 입력 그대로 DebugAgent 실행 (백그라운드)
  runDebugAgentBG(abs, msg);
  console.log(`요청 전송 → npm run debug -- ${abs} "${msg}"`);
  process.exit(0);
}

runInProgressDebug().catch((e) => {
  console.error(e);
  process.exit(1);
});


/*
export async function runInProgressDebug() {
  const file = process.argv[2]; // 분석 대상 파일명 가져오기
  if (!file) return console.error("❌ 파일명을 입력하세요.");

  const code = fs.readFileSync(path.resolve(file), "utf-8"); // 파일 코드 읽기
  const result = await inProgressDebug(code); // inProgressDebug 함수 실행

  // 결과 출력
  console.log("\n=== 🧪 [inProgressDebug 결과] ===");
  console.log(result);
}

runInProgressDebug(); // 스크립트를 직접 실행하면 inProgressDebug 자동 실행
-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ 작성 중인 코드 파일 경로를 입력하세요.");
    process.exit(1);
  }

  const filepath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(filepath)) {
    console.error(`❌ 파일이 존재하지 않습니다: ${filepath}`);
    process.exit(1);
  }

  const code = fs.readFileSync(filepath, "utf-8");
  const result = await inProgressDebug(code);
  console.log("📝 [작성 중 디버깅 결과]");
  console.log(result);
}

main();
*/
