import { afterDebugFromCode } from "../agentica/handlers";

const undeclaredVar = `
#include <stdio.h>

int main() {
    printf("%d", x);  // x is undeclared
    return 0;
}
`;

const divideByZero = `
#include <stdio.h>

int main() {
    int a = 10;
    int b = 0;
    int c = a / b;  // Division by zero
    printf("%d", c);
    return 0;
}
`;

const syntaxError = `
#include <stdio.h>

int main() {
    printf("Hello"
    return 0;
}
`;

const unusedVar = `
#include <stdio.h>

int main() {
    int temp = 42;
    return 0;
}
`;

async function test(name: string, code: string) {
  console.log(`\n==== 🧪 ${name} ====\n`);
  const result = await afterDebugFromCode(code);
  console.log(result);
}

async function main() {
  await test("❌ Undeclared variable", undeclaredVar);
  await test("❌ Division by zero", divideByZero);
  await test("❌ Syntax error (missing semicolon)", syntaxError);
  await test("⚠️ Unused variable warning", unusedVar);
}

main().catch(console.error);
