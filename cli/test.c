#include <stdio.h>

int main() {
    int value = 42;
    int *ptr = &value;
    
    printf("=== 포인터 테스트 ===\n");
    printf("value = %d\n", value);
    printf("&value = %p\n", (void*)&value);
    printf("ptr = %p\n", (void*)ptr);
    printf("*ptr = %d\n", *ptr);
    
    *ptr = 100;
    printf("포인터로 값 변경 후: value = %d\n", value);
    
    return 0;
}
