
import { afterDebug } from "../agentica/handlers";

const sampleOutput_success = `
main.c: In function ‘main’:
main.c:3:5: warning: unused variable ‘x’ [-Wunused-variable]
    int x = 10;
    ^
Compilation finished with warnings.
`;

const sampleOutput_withError = `
main.c: In function ‘main’:
main.c:5:10: error: ‘x’ undeclared (first use in this function)
    printf("%d", x);
             ^
main.c:6:5: warning: unused variable ‘y’ [-Wunused-variable]
    int y = 3;
    ^
Segmentation fault (core dumped)
`;

const sampleOutput_clean = `
main.c: In function ‘main’:
Compilation successful. No warnings or errors.
`;

async function main() {
  console.log("==== 경고만 있는 경우 ====");
  console.log(await afterDebug(sampleOutput_success, [], []));

  console.log("\n==== 에러/크래시가 있는 경우 ====");
  console.log(await afterDebug(sampleOutput_withError, [], []));

  console.log("\n==== 완전히 깨끗한 경우 ====");
  console.log(await afterDebug(sampleOutput_clean, [], []));
}

main();
