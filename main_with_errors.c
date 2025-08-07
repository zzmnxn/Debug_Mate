#include <stdio.h>

int main() {
    int i = 0;

    // 1~5: 단일 for 루프
    for (i = 0; i < 3; i++) printf("Loop 1\n");
    for (i = 0; i < 3; i++) printf("Loop 2\n");
    for (i = 0; i < 3; i++) printf("Loop 3\n");
    for (i = 0; i < 3; i++) printf("Loop 4\n");
    for (i = 0; i < 3; i++) printf("Loop 5\n");

    // 6~10: 단일 while 루프
    i = 0; while (i < 2) { printf("Loop 6\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 7\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 8\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 9\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 10\n"); i++; }

    // 11~15: 중첩 루프
    for (i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            printf("Loop 11 & 12\n");
        }
    }
    i = 0;
    while (i < 2) {
        int j = 0;
        while (j < 2) {
            printf("Loop 13 & 14\n");
            j++;
        }
        i++;
    }
    for (i = 0; i < 2;) { // ❌ 종료 조건 있음, 증가 없음
        printf("Loop 15\n");
    }

    // 16~20: 다양한 스타일
    for (;;) { printf("Loop 16\n"); break; }     // 무한 루프 + break
    while (1) { printf("Loop 17\n"); break; }    // 무한 while + break
    for (int k = 10; k > 5; k--) { printf("Loop 18\n"); }
    for (int x = 0; x < 3; ++x) { printf("Loop 19\n"); }
    for (int y = 0; y < 1; y++) { printf("Loop 20\n"); }

    // 21~23: 함수 내부 루프
    void testLoop21() {
        for (int a = 0; a < 1; a++) {
            printf("Loop 21\n");
        }
    }
    void testLoop22() {
        int b = 0;
        while (b < 1) {
            printf("Loop 22\n");
            b++;
        }
    }
    void testLoop23() {
        for (;;) { printf("Loop 23\n"); break; }
    }

    testLoop21();
    testLoop22();
    testLoop23();

    return 0;
}


// ====== 요약 ======