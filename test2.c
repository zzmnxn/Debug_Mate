#include <stdio.h>

int main(void) {
    // 1. 무한 루프 (문제 있음)
    for(int i=0; i<10; i--) {
        printf("infinite loop\n");
    }
    
    // 2. 정상적인 for문
    for(int j=0; j<5; j++) {
        printf("normal for loop: %d\n", j);
    }
    
    // 3. 이중 반복문 (중첩)
    for(int x=0; x<3; x++) {
        for(int y=0; y<2; y++) {
            printf("nested: %d,%d\n", x, y);
        }
    }
    
    // 4. while문 (정상)
    int count = 0;
    while(count < 3) {
        printf("while: %d\n", count);
        count++;
    }
    
    // 5. do-while문 (정상)
    int num = 1;
    do {
        printf("do-while: %d\n", num);
        num++;
    } while(num <= 2);
    
    // 6. 복잡한 조건의 for문
    for(int k=10; k>=0; k--) {
        printf("countdown: %d\n", k);
    }
    
    // 7. 잠재적 문제가 있는 while문
    int flag = 1;
    while(flag > 0) {
        printf("potential issue\n");
        // flag를 변경하지 않음 - 무한루프 가능성
    }
    
    return 0;
}