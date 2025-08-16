#include <stdio.h>
// 반복문이 매우 많을 경우의 테스트코드
// for 14개, while 9개, do-while 1개, 전체 24개

// 1
void testLoop21(){
    for (int a = 0; a < 1; a++) {
        printf("Loop 1\n");
    }
}

// 2
void testLoop22() {
    int b = 0;
    while (b < 1) {
        printf("Loop 2\n");
        b++;
    }
}

// 3
void testLoop23() {
    for (;;) { printf("Loop 3\n"); break; }
}

int main() {
    int i = 0;

    // 4~8
    for (i = 0; i < 3; i++) printf("Loop 4\n");
    printf("for"); //일반 문자도 계산하는지 체크
    printf("while");
    printf("do while");
    for (i = 0; i < 3; i++) printf("Loop 5\n");
    for (i = 0; i < 3; i++) printf("Loop 6\n");
    for (i = 0; i < 3; i++) printf("Loop 7\n");
    for (i = 0; i < 3; i++) printf("Loop 8\n");

    // 9~13 
    i = 0; while (i < 2) { printf("Loop 9\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 10\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 11\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 12\n"); i++; }
    i = 0; while (i < 2) { printf("Loop 13\n"); i++; }

    // 14, 14.1
    for (i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            printf("Loop 14 & 14.1\n");
        }
    }
    i = 0;
    // 15, 15.1
    while (i < 2) {
        int j = 0;
        while (j < 2) {
            printf("Loop 15 & 15.1\n");
            j++;
        }
        i++;
    }
    //16
    for (i = 0; i < 2;) { // 종료 조건 있음, 증가 없음
        printf("Loop 16\n");
    }

    // 17~21
    for (;;) { printf("Loop 17\n"); break; }     // 무한 루프 + break
    while (1) { printf("Loop 18\n"); break; }    // 무한 while + break
    for (int k = 10; k > 5; k--) { -printf("Loop 19\n"); }
    for (int x = 0; x < 3; ++x) { printf("Loop 20\n"); }
    for (int y = 0; y < 1; y++) { printf("Loop 21\n"); }
    int z;

    // 22
    do{
        z = 1;
        printf("Loop 22\n");
    } while(z);

    testLoop21();
    testLoop22();
    testLoop23();

    return 0;
}
