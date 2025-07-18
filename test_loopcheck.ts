import "dotenv/config";
import { loopCheck } from "./src/agentica/handlers";
import * as fs from "fs";

async function main() {
  const code = fs.readFileSync("loopcheck.c", "utf-8"); // .c 파일 내용 읽기

  const { result } = await loopCheck({ code });

  console.log("loopCheck 결과:\n", result);
}

main();
