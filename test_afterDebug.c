#include <stdio.h>
#include <stdlib.h>

int main() {
    // 미선언 변수 사용 (컴파일 에러)
    int x = 10;
    int y = 20;
    int z = x + y + undeclared_var;  // 에러: undeclared_var가 선언되지 않음
    
    // 초기화되지 않은 변수 사용 (경고)
    int uninitialized;
    printf("Value: %d\n", uninitialized);  // 경고: 초기화되지 않은 변수 사용
    
    // 메모리 누수 가능성 (경고)
    int* ptr = malloc(100);
    // free(ptr);  // 주석 처리로 메모리 누수 시뮬레이션
    
    // 0으로 나누기 (런타임 에러 가능성)
    int divisor = 0;
    int result = x / divisor;  // 런타임 에러: 0으로 나누기
    
    // 배열 범위 초과 (런타임 에러 가능성)
    int arr[5];
    arr[10] = 100;  // 런타임 에러: 배열 범위 초과
    
    // 무한 루프 (런타임 에러 가능성)
    while(1) {
        // 무한 루프
    }
    
    return 0;
}
