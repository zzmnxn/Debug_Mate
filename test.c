#include <stdio.h>
#include <stdlib.h>

void uninitialized_usage() {
    int x;
    int y = x + 1; // uninitialized x
    printf("y = %d\n", y);
}

void divide_by_zero() {
    int a = 10;
    int b = 0;
    printf("a / b = %d\n", a / b); // division by zero
}

void memory_leak() {
    int* arr = (int*)malloc(sizeof(int) * 10);
    arr[0] = 42;
    // missing free(arr)
}

void out_of_bounds() {
    int arr[3] = {1, 2, 3};
    printf("%d\n", arr[5]); // out-of-bounds access
}

void infinite_loop() {
    int i = 0;
    while (i >= 0) {
        // i never changes — infinite loop
    }
}

void proper_loop() {
    for (int i = 0; i < 5; i++) {
        printf("i = %d\n", i);
    }
}

void dead_code_example() {
    return;
    printf("This is dead code.\n"); // unreachable
}

void use_after_free() {
    int* ptr = (int*)malloc(sizeof(int));
    *ptr = 10;
    free(ptr);
    *ptr = 20; // use after free
}

void trace_variables() {
    int a = 1;
    int b = 2;
    int c = a + b;
    a = c * 2;
    printf("%d\n", a);
}

void test_break_case(int x) {
    if (x > 0)
        printf("Positive\n");
    else if (x == 0)
        printf("Zero\n");
    else
        printf("Negative\n");
}

int main() {
    uninitialized_usage();
    divide_by_zero();
    memory_leak();
    out_of_bounds();
    infinite_loop();
    proper_loop();
    dead_code_example();
    use_after_free();
    trace_variables();
    test_break_case(-1);
    return 0;
}
