//import fs from "fs";
import * as fs from "fs";
import * as path from "path";
import readline from "readline";
import { spawn } from "child_process";
import { inProgressDebug } from "../agentica/handlers";

// 프로젝트 루트(package.json 있는 곳)로 CWD 보정
function resolveProjectRoot(): string {
  let cur = path.resolve(__dirname, "../../");
  while (cur !== path.dirname(cur)) {
    if (fs.existsSync(path.join(cur, "package.json"))) return cur;
    cur = path.dirname(cur);
  }
  return process.cwd();
}

function ask(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(q, (ans) => {
      rl.close();
      res((ans ?? "").trim());
    })
  );
}

// 실행기: FG/BG 토글 가능 (AGENT_BG=0이면 FG 강제)
function runDebugAgent(args: { sourcePath: string; userMessage: string; mode?: "fg" | "bg" }) {
  const { sourcePath, userMessage, mode = "fg" } = args;
  const root = resolveProjectRoot();

  const runBG = mode === "bg" && process.env.AGENT_BG !== "0";

  const opts = runBG
    ? { cwd: root, env: process.env, detached: true, stdio: "ignore" as const }
    : { cwd: root, env: process.env, stdio: "inherit" as const };

  const child = spawn("npm", ["run", "debug", "--", sourcePath, userMessage], opts);

  child.on("error", (err) => {
    console.error("[DebugAgent] spawn error:", err);
  });

  if (runBG) {
    child.unref();
    console.log(`(백그라운드 실행 시작) PID=${child.pid}  cwd=${root}`);
  } else {
    child.on("close", (code) => {
      console.log(`DebugAgent exited with code ${code}`);
    });
  }
}

export async function runInProgressDebug() {
  const file = process.argv[2];
  if (!file) {
    console.error("❌ 파일명을 입력하세요. 예: npx ts-node src/testcode/test_InProgressDebug.ts test.c");
    process.exit(1);
    return;
  }

  const abs = path.resolve(file);
  const code = fs.readFileSync(abs, "utf-8");

  // 1) InProgressDebug 실행 및 결과 출력
  let report = "";
  try {
    report = await inProgressDebug(code);
  } catch (e: any) {
    console.error("inProgressDebug 실행 중 오류:", e?.message || e);
  }

  console.log("\n=== 🧪 [InProgressDebug 결과] ===");
  console.log(`대상 파일: ${abs}`);
  console.log(report || "(결과 없음)");
  console.log("================================\n");

  // 2) 사용자 요청 입력
  const msg = await ask("요청 사항을 입력하시오 : ");
  if (!msg) {
    console.log("(입력 없음 – DebugAgent 실행 생략)");
    process.exit(0);
    return;
  }

  // 3) DebugAgent 실행 (기본: 포그라운드)
  console.log(`[실행] npm run debug -- "${abs}" "${msg}"`);
  runDebugAgent({ sourcePath: abs, userMessage: msg, mode: "fg" });
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
