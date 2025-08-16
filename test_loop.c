#include <stdio.h>

int main() {
    int i, j;
    
    // for 루프 테스트
    printf("For 루프 테스트:\n");
    for (i = 0; i < 3; i++) {
        printf("i = %d\n", i);
    }
    
    // while 루프 테스트
    printf("\nWhile 루프 테스트:\n");
    j = 0;
    while (j < 3) {
        printf("j = %d\n", j);
        j++;
    }
    
    // 중첩 루프 테스트
    printf("\n중첩 루프 테스트:\n");
    for (i = 0; i < 2; i++) {
        for (j = 0; j < 2; j++) {
            printf("(%d, %d) ", i, j);
        }
        printf("\n");
    }
    
    return 0;
}
