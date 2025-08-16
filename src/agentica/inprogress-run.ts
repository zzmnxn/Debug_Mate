import { runInProgressDebug } from "./core/InProgressRunService";

async function main() {
  const targetFile = process.argv[2];

  if (!targetFile) {
    console.error("사용법: npx ts-node src/agentica/inprogress-run.ts <target_file>");
    process.exit(1);
  }

  try {
    await runInProgressDebug(targetFile);
  } catch (error: any) {
    console.error("실행 중 오류가 발생했습니다:", error.message);
    process.exit(1);
  }
}

main();
