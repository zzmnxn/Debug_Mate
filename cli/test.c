#include <stdio.h>

int main() {
    int numbers[5] = {1, 2, 3, 4, 5};
    int i, sum = 0;
    
    printf("=== 배열 테스트 ===\n");
    
    for (i = 0; i < 5; i++) {
        printf("numbers[%d] = %d\n", i, numbers[i]);
        sum += numbers[i];
    }
    
    printf("합계: %d\n", sum);
    return 0;
}
