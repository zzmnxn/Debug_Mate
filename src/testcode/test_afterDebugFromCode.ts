import { afterDebugFromCode } from "../agentica/handlers";
const tests = [
   {
     name: " Syntax Error (missing semicolon)",
     code: `
 #include <stdio.h>
 int main() {
     printf("Hello")
     return 0;
 }
 `,
   },
   {
     name: " Undeclared Variable",
     code: `
 #include <stdio.h>
 int main() {
     printf("%d", x);  // x is undeclared
     return 0;
 }
 `,
   },
   {
     name: " Division by Zero",
     code: `
 #include <stdio.h>
 int main() {
     int a = 10;
     int b = 0;
     int c = a / b;
     printf("%d", c);
     return 0;
 }
`,
  },
   {
     name: " Null Pointer Dereference",
     code: `
 #include <stdio.h>
 int main() {
     int *p = NULL;
     printf("%d", *p);  // segfault
     return 0;
 }
 `,
   },
  {
    name: " Memory Leak",
    code: `
#include <stdlib.h>
int main() {
    int *arr = (int*)malloc(10 * sizeof(int));
    arr[0] = 42; // but never freed
    return 0;
}
`,
  },
  {
    name: " Use After Free",
    code: `
#include <stdlib.h>
#include <stdio.h>
int main() {
    int *ptr = (int*)malloc(sizeof(int));
    free(ptr);
    *ptr = 5; // use after free
    printf("%d", *ptr);
    return 0;
}
`,
  },
  {
    name: " Unused Variable",
    code: `
#include <stdio.h>

int main() {
    int temp = 42;
    return 0;
}
`,
  },
  {
    name: " Dangerous Type Cast",
    code: `
#include <stdio.h>
int main() {
    char *p = (char)123456; // invalid cast
    printf("%c", *p);
    return 0;
}
`,
  },
  {
    name: " Infinite Loop",
    code: `
int main() {
    while(1) {}
    return 0;
}
`,
  },
];

async function main() {
  for (const { name, code } of tests) {
    console.log(`\n====  ${name} ====\n`);
    const { analysis, markedFilePath } = await afterDebugFromCode(code, `${name}.c`);
    console.log("[AI 분석 결과]\n" + analysis);
    console.log("[마킹된 파일 경로]", markedFilePath);
  }
}

main().catch(console.error);

