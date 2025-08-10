import * as fs from "fs";
import * as path from "path";
import { beforeDebug } from "../agentica/handlers";
import { ErrorDiagnosisService } from "../agentica/functions";



export async function runBeforeDebug() {
  const file = process.argv[2]; // 분석 대상 파일 가져오기
  if (!file) {
    console.error("❌ 분석할 파일명을 입력하세요.");
    process.exit(1);
  }

  const filePath = path.resolve(file); // 파일 경로 생성
  const code = fs.readFileSync(filePath, "utf-8");

  const result = await beforeDebug({ code }); // beforeDebug 함수 실행

  // 결과 출력
  console.log("\n=== 🧪 [beforeDebug 결과] ===\n");
  console.log(result);
  console.log("=== [beforeDebug 검사 완료] ===\n");
  console.log("\n");
}

// CLI에서 직접 실행 시
if (require.main === module) {
  runBeforeDebug().catch(console.error);
}

/*
export async function runBeforeDebug() {
  const file = process.argv[2];
  if (!file) return console.error("❌ 파일명을 입력하세요.");

  const code = fs.readFileSync(path.resolve(file), "utf-8");
  const result = await beforeDebug({ code });

  console.log("\n=== 🧪 [beforeDebug 결과] ===");
  console.log(result);
}

runBeforeDebug();

----------------------------------------------------
export async function runBeforeDebug(code: string) {
  const { result } = await beforeDebug({ code });
  console.log("🧪 [beforeDebug 결과]");
  console.log(result);
}
*/
