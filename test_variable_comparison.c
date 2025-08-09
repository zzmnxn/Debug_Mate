#include <stdio.h>

int main() {
    // 기본적인 변수들
    int counter = 0;
    int sum = 0;
    int i, j;
    
    // 첫 번째 루프 - counter 변수 사용
    for (i = 0; i < 5; i++) {
        counter++;
        printf("Counter: %d\n", counter);
    }
    
    // 두 번째 루프 - sum 변수 사용  
    for (j = 1; j <= 3; j++) {
        sum += j;
        printf("Sum: %d\n", sum);
    }
    
    // 세 번째 루프 - 여러 변수 동시 사용
    int x = 10, y = 20;
    while (x < 15) {
        x += 2;
        y -= 3;
        printf("X: %d, Y: %d\n", x, y);
    }
    
    // 네 번째 루프 - 배열 인덱스 변수
    int arr[5] = {1, 2, 3, 4, 5};
    int index = 0;
    while (index < 5) {
        printf("arr[%d] = %d\n", index, arr[index]);
        index++;
    }
    
    // 다섯 번째 루프 - 복잡한 변수 변화
    int a = 1, b = 1, temp;
    for (int k = 0; k < 4; k++) {
        temp = a + b;
        printf("Fibonacci: %d\n", temp);
        a = b;
        b = temp;
    }
    
    return 0;
} 