#include <stdio.h>

int main() {
    int i = 0;
    
    // 1번째 - 기본 for문
    for (i = 0; i < 3; i++) {
        printf("Basic for loop: %d\n", i);
    }
    
    // 2번째 - while문
    i = 0;
    while (i < 3) {
        printf("While loop: %d\n", i);
        i++;
    }
    
    // 3번째 - 무한루프 위험이 있는 for문
    for (i = 0; i < 2;) {  // 증가 조건 없음
        printf("Dangerous for loop: %d\n", i);
        if (i > 10) break;  // 임시 탈출 조건
        i++;
    }
    
    // 4번째 - do-while문
    i = 0;
    do {
        printf("Do-while loop: %d\n", i);
        i++;
    } while (i < 2);
    
    // 5번째 - 중첩 for문
    for (int x = 0; x < 2; x++) {
        for (int y = 0; y < 2; y++) {
            printf("Nested loop: x=%d, y=%d\n", x, y);
        }
    }
    
    // 6번째 - 역순 for문
    for (i = 5; i > 0; i--) {
        printf("Reverse for loop: %d\n", i);
    }
    
    // 7번째 - 무한루프 + break
    for (;;) {
        printf("Infinite loop with break\n");
        break;
    }
    
    // 8번째 - 조건이 복잡한 while문
    i = 0;
    int j = 10;
    while (i < 3 && j > 7) {
        printf("Complex while: i=%d, j=%d\n", i, j);
        i++;
        j--;
    }
    
    return 0;
} 