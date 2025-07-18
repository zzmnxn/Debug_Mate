import "dotenv/config";
import { loopCheck } from "./src/agentica/handlers";

async function main() {
  const code = `let i = 0;
  while (i != 10) {
  i += 2;
  }`;

  const result = await loopCheck({ code });
  console.log("loopCheck result:", result.result);
}

main();
