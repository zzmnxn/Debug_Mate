import fs from "fs";
import path from "path";
import { inProgressDebug } from "../agentica/handlers";

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
